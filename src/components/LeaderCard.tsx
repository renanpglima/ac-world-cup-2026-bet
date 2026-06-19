import {type ParticipantStats, SCORE_TIERS} from '../lib/participantStats';
import {Avatar} from './Avatar';

function Stat({label, value}: {label: string; value: string}) {
	return (
		<div className="rounded-xl bg-white/5 px-4 py-2 text-center">
			<p className="font-display text-xl font-bold text-white">{value}</p>

			<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
				{label}
			</p>
		</div>
	);
}

// The spotlight card above the ranking: the current leader's photo, name, and
// how their points break down across the scoring tiers. On the web a richer
// stat panel rides along; mobile keeps just the breakdown.
export function LeaderCard({
	name,
	stats,
}: {
	name: string;
	stats: ParticipantStats;
}) {
	const hitRate =
		stats.hitRate !== null ? Math.round(stats.hitRate * 100) : null;
	const scored = stats.tierCounts.reduce((sum, count) => sum + count, 0);

	return (
		<div className="overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent p-5">
			<div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
				<div className="relative shrink-0">
					<Avatar
						className="h-44 w-44 rounded-2xl object-cover ring-2 ring-amber-400/50 sm:h-[202px] sm:w-auto"
						name={name}
					/>

					<span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 text-lg shadow-lg">
						👑
					</span>
				</div>

				<div className="min-w-0 flex-1 text-center sm:text-left">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
						Follow the leader!
					</p>

					<h3 className="mt-1 font-display text-3xl font-bold text-white">
						{name}
					</h3>

					{/* Stat panel — shown on every viewport. */}
					<div className="mt-4 flex flex-wrap justify-center gap-2.5 sm:justify-start">
						<Stat
							label="Hit rate"
							value={hitRate !== null ? `${hitRate}%` : '—'}
						/>

						<Stat
							label="Streak"
							value={stats.streak > 0 ? `🔥 ${stats.streak}` : '—'}
						/>

						<Stat
							label="Lead"
							value={
								stats.leadOverNext !== null
									? `+${stats.leadOverNext}`
									: '—'
							}
						/>

						<Stat
							label="Avg / match"
							value={
								stats.avgPerMatch !== null
									? stats.avgPerMatch.toFixed(1)
									: '—'
							}
						/>
					</div>

					{/* Scoring breakdown — web only; mobile shows the metrics. */}
					<div className="mt-4 hidden sm:block">
						<p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
							Scoring breakdown
						</p>

						{scored > 0 ? (
							<>
								<div className="flex h-2.5 overflow-hidden rounded-full bg-white/10">
									{SCORE_TIERS.map((tier, index) =>
										stats.tierCounts[index] > 0 ? (
											<div
												key={tier.points}
												style={{
													backgroundColor: tier.color,
													width: `${
														(stats.tierCounts[index] /
															scored) *
														100
													}%`,
												}}
											/>
										) : null
									)}
								</div>

								<div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 sm:justify-start">
									{SCORE_TIERS.map((tier, index) =>
										stats.tierCounts[index] > 0 ? (
											<span
												className="inline-flex items-center gap-1 text-xs text-slate-300"
												key={tier.points}
											>
												<span
													className="h-2 w-2 rounded-full"
													style={{
														backgroundColor:
															tier.color,
													}}
												/>

												{tier.label}{' '}
												<span className="font-bold text-white">
													{stats.tierCounts[index]}
												</span>
											</span>
										) : null
									)}
								</div>
							</>
						) : (
							<p className="text-xs text-slate-500">
								No finished matches yet.
							</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
