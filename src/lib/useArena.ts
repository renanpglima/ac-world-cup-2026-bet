// src/lib/useArena.ts
import {onAuthStateChanged} from 'firebase/auth';
import {
	get,
	increment,
	onDisconnect,
	onValue,
	ref,
	runTransaction,
	serverTimestamp,
	set,
	update,
} from 'firebase/database';
import {useEffect, useRef, useState} from 'react';

import {acTrack} from './analyticsCloud';
import {
	type Ball,
	BALL_VALUES,
	ballPositionAt,
	isBallHit,
	MIN_PLAYERS,
	nextBall,
	ROUND_MS,
	START_COUNTDOWN_MS,
	topScorer,
} from './arena';
import {dataPath} from './dataRoot';
import {auth, db, signedIn} from './firebase';

const HIT_RADIUS = 0.06;
const MOVE_THROTTLE_MS = 50;
const TICK_MS = 300;

export type ArenaPhase = 'playing' | 'starting' | 'waiting';

export interface ArenaCursor {
	name: string;
	uid: string;
	x: number;
	y: number;
}

export interface ArenaRound {
	endsAt: number;
	lastWinner: string | null;
	phase: ArenaPhase;
	startsAt: number;
}

const DEFAULT_ROUND: ArenaRound = {
	endsAt: 0,
	lastWinner: null,
	phase: 'waiting',
	startsAt: 0,
};

export function useArena(name: string | null): {
	ball: Ball | null;
	cursors: ArenaCursor[];
	endsAt: number;
	isReady: boolean;
	lastWinner: string | null;
	moveCursor: (x: number, y: number) => void;
	offset: number;
	phase: ArenaPhase;
	playerCount: number;
	present: ArenaCursor[];
	ready: Record<string, boolean>;
	readyCount: number;
	scores: Record<string, number>;
	startsAt: number;
	toggleReady: () => void;
	tryClaim: (x: number, y: number) => void;
} {
	const [uid, setUid] = useState<string | null>(null);
	const [cursors, setCursors] = useState<ArenaCursor[]>([]);
	const [ball, setBall] = useState<Ball | null>(null);
	const [scores, setScores] = useState<Record<string, number>>({});
	const [offset, setOffset] = useState(0);
	const [round, setRound] = useState<ArenaRound>(DEFAULT_ROUND);
	const [ready, setReady] = useState<Record<string, boolean>>({});
	const lastMove = useRef(0);

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, '.info/serverTimeOffset'), (snapshot) => {
				setOffset((snapshot.val() as number | null) ?? 0);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/cursors')), (snapshot) => {
				const value =
					(snapshot.val() as Record<
						string,
						{name?: string; x?: number; y?: number}
					>) ?? {};

				setCursors(
					Object.entries(value).map(([id, cursor]) => ({
						name: cursor.name ?? '',
						uid: id,
						x: cursor.x ?? 0,
						y: cursor.y ?? 0,
					}))
				);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/ball')), (snapshot) => {
				setBall((snapshot.val() as Ball | null) ?? null);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/scores')), (snapshot) => {
				setScores((snapshot.val() as Record<string, number>) ?? {});
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/round')), (snapshot) => {
				setRound((snapshot.val() as ArenaRound | null) ?? DEFAULT_ROUND);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/ready')), (snapshot) => {
				setReady((snapshot.val() as Record<string, boolean>) ?? {});
			}),
		[]
	);

	const serverNow = () => Date.now() + offset;
	const others = cursors.filter((cursor) => cursor.uid !== uid);
	const playerCount = cursors.length;
	const readyCount = Object.keys(ready).length;
	const isReady = Boolean(uid && ready[uid]);

	// Latest values for the ticker, read without restarting the interval.
	const refs = useRef({ball, offset, ready, readyCount, round, scores});
	refs.current = {ball, offset, ready, readyCount, round, scores};

	// Announce my presence at center as soon as I'm identified.
	useEffect(() => {
		if (!uid || !name) {
			return;
		}

		set(ref(db, `${dataPath('arena/cursors')}/${uid}`), {
			at: serverTimestamp(),
			name,
			x: 0.5,
			y: 0.5,
		}).catch(() => undefined);
	}, [uid, name]);

	// Remove my cursor + ready on disconnect or leave.
	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		const cursorNode = ref(db, `${dataPath('arena/cursors')}/${uid}`);
		const readyNode = ref(db, `${dataPath('arena/ready')}/${uid}`);

		onDisconnect(cursorNode).remove();
		onDisconnect(readyNode).remove();

		return () => {
			set(cursorNode, null).catch(() => undefined);
			set(readyNode, null).catch(() => undefined);
		};
	}, [uid]);

	// The round driver: every client ticks; guarded transactions ensure only
	// one commits each transition.
	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		const roundNode = ref(db, dataPath('arena/round'));
		const ballNode = ref(db, dataPath('arena/ball'));

		const id = setInterval(() => {
			const now = Date.now() + refs.current.offset;
			const {phase, startsAt, endsAt} = refs.current.round;
			const rc = refs.current.readyCount;

			if (phase === 'waiting' && rc >= MIN_PLAYERS) {
				runTransaction(roundNode, (current: ArenaRound | null) => {
					const value = current ?? DEFAULT_ROUND;

					return value.phase === 'waiting'
						? {...value, phase: 'starting', startsAt: now + START_COUNTDOWN_MS}
						: undefined;
				})
					.then((result) => {
						const ok =
							result.committed &&
							(result.snapshot.val() as ArenaRound | null)?.phase ===
								'starting';

						if (ok) {
							set(ref(db, dataPath('arena/scores')), null).catch(
								() => undefined
							);
						}
					})
					.catch(() => undefined);
			}
			else if (phase === 'starting' && rc < MIN_PLAYERS) {
				runTransaction(roundNode, (current: ArenaRound | null) => {
					const value = current ?? DEFAULT_ROUND;

					return value.phase === 'starting'
						? {...value, phase: 'waiting', startsAt: 0}
						: undefined;
				}).catch(() => undefined);
			}
			else if (phase === 'starting' && now >= startsAt) {
				runTransaction(roundNode, (current: ArenaRound | null) => {
					const value = current ?? DEFAULT_ROUND;

					if (value.phase !== 'starting' || now < value.startsAt) {
						return undefined;
					}

					if (refs.current.readyCount < MIN_PLAYERS) {
						return {...value, phase: 'waiting', startsAt: 0};
					}

					return {...value, endsAt: now + ROUND_MS, phase: 'playing'};
				})
					.then((result) => {
						const ok =
							result.committed &&
							(result.snapshot.val() as ArenaRound | null)?.phase ===
								'playing';

						if (ok) {
							runTransaction(ballNode, (current: Ball | null) =>
								current ?? nextBall(0, now)
							).catch(() => undefined);
						}
					})
					.catch(() => undefined);
			}
			else if (phase === 'playing' && now >= endsAt) {
				get(ref(db, dataPath('arena/scores')))
					.then((snapshot) => {
						const winner = topScorer(
							(snapshot.val() as Record<string, number>) ?? {}
						);

						runTransaction(roundNode, (current: ArenaRound | null) => {
							const value = current ?? DEFAULT_ROUND;

							if (value.phase !== 'playing' || now < value.endsAt) {
								return undefined;
							}

							return {
								...value,
								endsAt: 0,
								lastWinner: winner,
								phase: 'waiting',
							};
						})
							.then((result) => {
								const ok =
									result.committed &&
									(result.snapshot.val() as ArenaRound | null)?.phase ===
										'waiting';

								if (ok) {
									set(ballNode, null).catch(() => undefined);
									set(ref(db, dataPath('arena/ready')), null).catch(
										() => undefined
									);
								}
							})
							.catch(() => undefined);
					})
					.catch(() => undefined);
			}
			else if (phase === 'playing' && !refs.current.ball) {
				runTransaction(ballNode, (current: Ball | null) =>
					current ?? nextBall(0, now)
				).catch(() => undefined);
			}
		}, TICK_MS);

		return () => clearInterval(id);
	}, [uid]);

	const moveCursor = (x: number, y: number) => {
		if (!uid || !name) {
			return;
		}

		const now = Date.now();

		if (now - lastMove.current < MOVE_THROTTLE_MS) {
			return;
		}

		lastMove.current = now;

		set(ref(db, `${dataPath('arena/cursors')}/${uid}`), {
			at: serverTimestamp(),
			name,
			x,
			y,
		}).catch(() => undefined);
	};

	const toggleReady = () => {
		if (!uid || !name || round.phase === 'playing') {
			return;
		}

		set(
			ref(db, `${dataPath('arena/ready')}/${uid}`),
			ready[uid] ? null : true
		).catch(() => undefined);
	};

	const tryClaim = (x: number, y: number) => {
		if (
			round.phase !== 'playing' ||
			!name ||
			!uid ||
			!ready[uid] ||
			!ball ||
			ball.claimedBy ||
			!isBallHit(x, y, ballPositionAt(ball, serverNow()), HIT_RADIUS)
		) {
			return;
		}

		const ballNode = ref(db, dataPath('arena/ball'));
		const claimedId = ball.id;
		const value = BALL_VALUES[ball.kind] ?? 1;

		runTransaction(ballNode, (current: Ball | null) => {
			if (!current || current.id !== claimedId || current.claimedBy) {
				return undefined;
			}

			return {...current, claimedBy: name};
		})
			.then((result) => {
				const committed =
					result.committed &&
					(result.snapshot.val() as Ball | null)?.claimedBy === name;

				if (committed) {
					update(ref(db, dataPath('arena/scores')), {
						[name]: increment(value),
					});
					set(ballNode, nextBall(claimedId, Date.now() + offset));
					acTrack('arena_ball_caught', {kind: ball.kind, points: value});
				}
			})
			.catch(() => undefined);
	};

	return {
		ball,
		cursors: others,
		endsAt: round.endsAt,
		isReady,
		lastWinner: round.lastWinner,
		moveCursor,
		offset,
		phase: round.phase,
		playerCount,
		present: cursors,
		ready,
		readyCount,
		scores,
		startsAt: round.startsAt,
		toggleReady,
		tryClaim,
	};
}
