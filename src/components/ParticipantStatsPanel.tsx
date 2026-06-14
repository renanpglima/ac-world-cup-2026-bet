import type {ReactNode} from 'react';

import {SCORE_TIERS} from '../lib/participantStats';
import type {ParticipantStats} from '../lib/participantStats';

function Tile({
	hint,
	label,
	value,
}: {
	hint?: string;
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
			<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
				{label}
			</p>

			<p className="mt-0.5 font-display text-xl font-bold text-white">
				{value}
			</p>

			{hint && (
				<p className="mt-0.5 truncate text-[11px] text-slate-400">{hint}</p>
			)}
		</div>
	);
}

function pct(value: number | null): string {
	return value === null ? '—' : `${Math.round(value * 100)}%`;
}

function TierBreakdown({counts}: {counts: number[]}) {
	const total = counts.reduce((sum, count) => sum + count, 0);

	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
			<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
				Scoring breakdown
			</p>

			<div className="flex h-3 overflow-hidden rounded-full bg-white/5">
				{SCORE_TIERS.map((tier, index) =>
					counts[index] > 0 ? (
						<div
							key={tier.points}
							style={{
								backgroundColor: tier.color,
								flexGrow: counts[index],
							}}
							title={`${tier.label}: ${counts[index]}`}
						/>
					) : null
				)}
			</div>

			<div className="mt-3 grid grid-cols-6 gap-1.5">
				{SCORE_TIERS.map((tier, index) => (
					<div
						className="rounded-lg bg-white/5 py-1.5 text-center"
						key={tier.points}
						title={tier.label}
					>
						<p
							className="font-display text-base font-bold"
							style={{color: tier.color}}
						>
							{counts[index]}
						</p>

						<p className="text-[10px] text-slate-400">
							{tier.points === 0 ? 'miss' : tier.points}
						</p>
					</div>
				))}
			</div>

			{total === 0 && (
				<p className="mt-3 text-xs text-slate-500">
					No finished matches yet.
				</p>
			)}
		</div>
	);
}

function RankSparkline({
	history,
	size,
}: {
	history: number[];
	size: number;
}) {
	const W = 300;
	const H = 76;
	const PAD = 12;

	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
			<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
				Rank over time
			</p>

			{history.length === 0 ? (
				<p className="text-xs text-slate-500">
					Appears after the first final whistle.
				</p>
			) : (
				<svg
					className="w-full"
					role="img"
					viewBox={`0 0 ${W} ${H}`}
				>
					{(() => {
						const span = Math.max(1, size - 1);
						const x = (index: number) =>
							history.length === 1
								? W / 2
								: PAD +
									(index / (history.length - 1)) * (W - 2 * PAD);
						const y = (rank: number) =>
							PAD + ((rank - 1) / span) * (H - 2 * PAD);

						const points = history
							.map((rank, index) => `${x(index)},${y(rank)}`)
							.join(' ');

						const lastRank = history[history.length - 1];

						return (
							<>
								<polyline
									fill="none"
									points={points}
									stroke="#fbbf24"
									strokeLinejoin="round"
									strokeWidth="2.5"
								/>

								{history.map((rank, index) => (
									<circle
										cx={x(index)}
										cy={y(rank)}
										fill="#fbbf24"
										key={index}
										r={index === history.length - 1 ? 4 : 2.5}
									/>
								))}

								<text
									fill="#fbbf24"
									fontSize="13"
									fontWeight="700"
									x={x(history.length - 1) - 6}
									y={y(lastRank) - 8}
									textAnchor="end"
								>
									#{lastRank}
								</text>
							</>
						);
					})()}
				</svg>
			)}
		</div>
	);
}

export function ParticipantStatsPanel({
	playerCount,
	stats,
}: {
	playerCount: number;
	stats: ParticipantStats;
}) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
				<Tile
					hint={`${stats.hits}/${stats.finishedCount} matches`}
					label="Hit rate"
					value={pct(stats.hitRate)}
				/>

				<Tile
					hint="per finished match"
					label="Avg points"
					value={
						stats.avgPerMatch === null
							? '—'
							: stats.avgPerMatch.toFixed(1)
					}
				/>

				<Tile
					hint={stats.bestRound?.label}
					label="Best round"
					value={stats.bestRound ? `+${stats.bestRound.points}` : '—'}
				/>

				<Tile
					hint="matches in a row scoring"
					label="Streak"
					value={stats.streak > 0 ? `🔥 ${stats.streak}` : '0'}
				/>

				<Tile
					hint={stats.rank === 1 ? 'top of the table' : 'points to 1st'}
					label="Gap to leader"
					value={stats.rank === 1 ? 'Leader' : `−${stats.gapToLeader}`}
				/>

				<Tile
					hint={`${stats.uniquePicks} solo picks`}
					label="Contrarian"
					value={pct(stats.contrarianRate)}
				/>

				<Tile
					hint="goals per match"
					label="Predicts"
					value={
						stats.avgGoals === null ? '—' : stats.avgGoals.toFixed(1)
					}
				/>

				<Tile
					hint="most-picked scoreline"
					label="Favorite score"
					value={stats.favoriteScoreline ?? '—'}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<TierBreakdown counts={stats.tierCounts} />

				<RankSparkline history={stats.rankHistory} size={playerCount} />
			</div>
		</div>
	);
}
