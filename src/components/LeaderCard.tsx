import type {MouseEvent} from 'react';

import {type ParticipantStats, SCORE_TIERS} from '../lib/participantStats';
import {Avatar} from './Avatar';

function Stat({label, value}: {label: string; value: string}) {
	return (
		<div className="rounded-xl bg-white/5 px-2 py-1.5 text-center sm:px-4 sm:py-2">
			<p className="font-display text-base font-bold text-white sm:text-xl">
				{value}
			</p>

			<p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
				{label}
			</p>
		</div>
	);
}

function LeaderPhoto({className, name}: {className: string; name: string}) {
	return (
		<div className={`relative shrink-0 ${className}`}>
			<Avatar
				className="h-full w-full rounded-2xl object-cover ring-2 ring-amber-400/50"
				name={name}
			/>

			<span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs shadow-lg sm:-right-2 sm:-top-2 sm:h-9 sm:w-9 sm:text-lg">
				🏆
			</span>
		</div>
	);
}

// The spotlight card above the ranking. Desktop: big photo on the left, a rich
// stat panel + scoring breakdown on the right. Mobile: compact — a small photo
// sits beside the metric tiles, with the breakdown hidden.
export function LeaderCard({
	name,
	onHype,
	stats,
}: {
	name: string;
	onHype: (rx: number, ry: number) => void;
	stats: ParticipantStats;
}) {
	const hitRate =
		stats.hitRate !== null ? Math.round(stats.hitRate * 100) : null;
	const scored = stats.tierCounts.reduce((sum, count) => sum + count, 0);

	// Tap anywhere on the card to throw trophies from that spot — broadcast to
	// everyone online. Positions are stored as fractions so they map across
	// screen sizes.
	const handleHype = (event: MouseEvent<HTMLDivElement>) => {
		const rect = event.currentTarget.getBoundingClientRect();

		onHype(
			(event.clientX - rect.left) / rect.width,
			(event.clientY - rect.top) / rect.height
		);
	};

	return (
		<div
			className="cursor-pointer select-none overflow-hidden rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 via-white/5 to-transparent p-4 sm:p-5"
			data-leader-card
			onClick={handleHype}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
				<LeaderPhoto
					className="hidden h-[202px] w-[202px] sm:block"
					name={name}
				/>

				<div className="min-w-0 flex-1 text-center sm:text-left">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">
						Follow the leader!
					</p>

					<h3 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">
						{name}
					</h3>

					<div className="mt-3 flex items-center gap-3 sm:mt-4">
						<LeaderPhoto
							className="h-24 w-24 sm:hidden"
							name={name}
						/>

						<div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-start sm:gap-2.5">
							<Stat
								label="Hit rate"
								value={hitRate !== null ? `${hitRate}%` : '—'}
							/>

							<Stat
								label="Streak"
								value={
									stats.streak > 0 ? `🔥 ${stats.streak}` : '—'
								}
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
					</div>

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
