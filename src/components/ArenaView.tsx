// src/components/ArenaView.tsx
import {type MouseEvent, useEffect, useRef, useState} from 'react';

import {
	BALL_EMOJI,
	BALL_VALUES,
	ballPositionAt,
	cursorColor,
	formatCountdown,
	MIN_PLAYERS,
	sortScores,
} from '../lib/arena';
import {useArena} from '../lib/useArena';
import {Avatar} from './Avatar';

export function ArenaView({
	identity,
	onRequestIdentify,
}: {
	identity: string | null;
	onRequestIdentify: () => void;
}) {
	const {
		ball,
		cursors,
		endsAt,
		isReady,
		lastWinner,
		moveCursor,
		offset,
		phase,
		present,
		ready,
		readyCount,
		scores,
		startsAt,
		toggleReady,
		tryClaim,
	} = useArena(identity);
	const fieldRef = useRef<HTMLDivElement>(null);
	const ballRef = useRef<HTMLSpanElement>(null);
	const [, setTick] = useState(0);

	const toFraction = (event: MouseEvent) => {
		const rect = fieldRef.current?.getBoundingClientRect();

		if (!rect) {
			return null;
		}

		return {
			x: (event.clientX - rect.left) / rect.width,
			y: (event.clientY - rect.top) / rect.height,
		};
	};

	// Re-render once a tick so the countdown text updates.
	useEffect(() => {
		if (phase !== 'starting' && phase !== 'playing') {
			return undefined;
		}

		const id = setInterval(() => setTick((value) => value + 1), 250);

		return () => clearInterval(id);
	}, [phase]);

	// Animate the ball from the shared seed.
	useEffect(() => {
		if (!ball || phase !== 'playing') {
			return undefined;
		}

		let frame = 0;

		const tick = () => {
			const node = ballRef.current;

			if (node) {
				const position = ballPositionAt(ball, Date.now() + offset);

				node.style.left = `${position.x * 100}%`;
				node.style.top = `${position.y * 100}%`;
			}

			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(frame);
	}, [ball, offset, phase]);

	const now = Date.now() + offset;
	const ranked = sortScores(scores);
	const playing = phase === 'playing';
	const ballStart =
		playing && ball ? ballPositionAt(ball, now) : null;
	const ballValue = ball ? BALL_VALUES[ball.kind] : 1;
	const startIn = Math.max(0, Math.ceil((startsAt - now) / 1000));

	return (
		<div>
			<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400 sm:hidden">
				⚽ Arena is available on desktop.
			</div>

			<div className="hidden sm:block">
				{!identity && (
					<div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
						<span className="text-sm text-slate-300">
							Pick a name to join the arena and score.
						</span>

						<button
							className="shrink-0 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
							onClick={onRequestIdentify}
						>
							👋 Who are you?
						</button>
					</div>
				)}

				<div className="flex gap-4">
					<div
						className="relative aspect-square h-[70vh] max-w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 to-slate-950"
						onClick={(event) => {
							const point = toFraction(event);

							if (point) {
								tryClaim(point.x, point.y);
							}
						}}
						onMouseMove={(event) => {
							const point = toFraction(event);

							if (point) {
								moveCursor(point.x, point.y);
							}
						}}
						ref={fieldRef}
					>
						{!playing && (
							<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
								<div>
									{phase === 'starting' ? (
										<p className="font-display text-4xl font-bold text-white">
											Starting in {startIn}…
										</p>
									) : (
										<>
											<p className="text-lg font-semibold text-white">
												Click READY to play
											</p>

											<p className="text-sm text-slate-400">
												{readyCount}/{MIN_PLAYERS} ready —
												need {MIN_PLAYERS} to start
											</p>
										</>
									)}

									{lastWinner && (
										<p className="mt-1 text-sm text-amber-300">
											🏆 Last round: {lastWinner}
										</p>
									)}
								</div>

								{present.length > 0 && (
									<div className="flex flex-wrap items-center justify-center gap-2">
										{present.map((player) => (
											<span
												className="flex items-center gap-1.5 rounded-full bg-white/10 py-0.5 pl-0.5 pr-2.5"
												key={player.uid}
												style={{
													boxShadow: ready[player.uid]
														? `0 0 0 2px ${cursorColor(player.name)}`
														: undefined,
												}}
											>
												<Avatar
													className="h-6 w-6 rounded-full"
													name={player.name}
												/>

												<span className="text-xs font-medium text-slate-200">
													{player.name}
												</span>

												<span className="text-xs">
													{ready[player.uid] ? '✓' : '·'}
												</span>
											</span>
										))}
									</div>
								)}

								{identity && (
									<button
										className={`pointer-events-auto rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
											isReady
												? 'bg-white/10 text-slate-300 hover:bg-white/20'
												: 'bg-emerald-500 text-white hover:bg-emerald-400'
										}`}
										onClick={toggleReady}
									>
										{isReady ? 'Cancel ready' : 'READY'}
									</button>
								)}
							</div>
						)}

						{playing && ball && ballStart && (
							<span
								className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl ${
									ball.kind === 'gold'
										? 'drop-shadow-[0_0_8px_gold]'
										: 'drop-shadow-lg'
								}`}
								ref={ballRef}
								style={{
									left: `${ballStart.x * 100}%`,
									top: `${ballStart.y * 100}%`,
								}}
							>
								{BALL_EMOJI[ball.kind]}

								{ball.kind !== 'normal' && (
									<span className="absolute -right-2 -top-1 rounded-full bg-black/70 px-1 text-[10px] font-bold text-amber-300">
										+{ballValue}
									</span>
								)}
							</span>
						)}

						{cursors.map((cursor) => (
							<div
								className="pointer-events-none absolute flex -translate-y-1 items-center gap-1"
								key={cursor.uid}
								style={{
									left: `${cursor.x * 100}%`,
									top: `${cursor.y * 100}%`,
								}}
							>
								<span
									aria-hidden
									className="text-lg"
									style={{color: cursorColor(cursor.name)}}
								>
									➤
								</span>

								<span
									className="rounded-full px-1.5 py-0.5 text-[10px] font-medium text-white"
									style={{
										backgroundColor: cursorColor(cursor.name),
									}}
								>
									{cursor.name}
								</span>
							</div>
						))}
					</div>

					<div className="w-48 shrink-0 self-start rounded-2xl border border-white/10 bg-white/5 p-3">
						<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
							{playing ? formatCountdown(endsAt - now) : 'Scores'}
						</p>

						{ranked.length === 0 ? (
							<p className="text-xs text-slate-500">
								{playing
									? 'No goals yet — click the balls!'
									: 'Ready up to start a round.'}
							</p>
						) : (
							<ul className="space-y-1.5">
								{ranked.map(([player, score]) => (
									<li
										className="flex items-center gap-2"
										key={player}
									>
										<Avatar
											className="h-6 w-6 shrink-0 rounded-full"
											name={player}
										/>

										<span className="min-w-0 flex-1 truncate text-sm text-slate-200">
											{player}
										</span>

										<span className="font-display text-sm font-bold text-white">
											{score}
										</span>
									</li>
								))}
							</ul>
						)}

						{playing && identity && !isReady && (
							<p className="mt-2 text-[10px] text-slate-500">
								You're spectating — ready up for the next round.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
