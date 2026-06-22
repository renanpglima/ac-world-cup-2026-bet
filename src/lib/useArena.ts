// src/lib/useArena.ts
import {onAuthStateChanged} from 'firebase/auth';
import {
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

import {type Ball, isBallHit, nextBall} from './arena';
import {dataPath} from './dataRoot';
import {auth, db, signedIn} from './firebase';

const HIT_RADIUS = 0.06;
const MOVE_THROTTLE_MS = 50;

export interface ArenaCursor {
	name: string;
	uid: string;
	x: number;
	y: number;
}

export function useArena(name: string | null): {
	ball: Ball | null;
	cursors: ArenaCursor[];
	moveCursor: (x: number, y: number) => void;
	scores: Record<string, number>;
	tryClaim: (x: number, y: number) => void;
} {
	const [uid, setUid] = useState<string | null>(null);
	const [cursors, setCursors] = useState<ArenaCursor[]>([]);
	const [ball, setBall] = useState<Ball | null>(null);
	const [scores, setScores] = useState<Record<string, number>>({});
	const lastMove = useRef(0);

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/cursors')), (snapshot) => {
				const value =
					(snapshot.val() as Record<
						string,
						{name?: string; x?: number; y?: number}
					>) ?? {};

				setCursors(
					Object.entries(value)
						.filter(([id]) => id !== uid)
						.map(([id, cursor]) => ({
							name: cursor.name ?? '',
							uid: id,
							x: cursor.x ?? 0,
							y: cursor.y ?? 0,
						}))
				);
			}),
		[uid]
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

	// Spawn the very first ball if none exists (transaction → only one wins).
	useEffect(() => {
		if (!uid) {
			return;
		}

		runTransaction(ref(db, dataPath('arena/ball')), (current: Ball | null) =>
			current ?? nextBall(0)
		).catch(() => undefined);
	}, [uid]);

	// Remove my cursor when I disconnect or leave the page.
	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		const node = ref(db, `${dataPath('arena/cursors')}/${uid}`);

		onDisconnect(node).remove();

		return () => {
			set(node, null).catch(() => undefined);
		};
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

	const tryClaim = (x: number, y: number) => {
		if (!name || !ball || ball.claimedBy || !isBallHit(x, y, ball, HIT_RADIUS)) {
			return;
		}

		const ballRef = ref(db, dataPath('arena/ball'));
		const claimedId = ball.id;

		runTransaction(ballRef, (current: Ball | null) => {
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
						[name]: increment(1),
					});
					set(ballRef, nextBall(claimedId));
				}
			})
			.catch(() => undefined);
	};

	return {ball, cursors, moveCursor, scores, tryClaim};
}
