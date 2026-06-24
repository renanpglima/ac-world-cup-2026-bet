import {useMemo} from 'react';

import {flagCode} from '../lib/flags';
import {buildParticipantStats} from '../lib/participantStats';
import {scoreParticipant} from '../lib/ranking';
import {scorePrediction} from '../lib/scoring';
import type {Game, Participant} from '../lib/types';
import type {KnockoutMatch} from '../lib/useKnockout';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {MatchRow} from './MatchRow';
import {ParticipantStatsPanel} from './ParticipantStatsPanel';
import {Reactions} from './Reactions';
import {TIER_STYLES} from './StatusChip';

interface ParticipantViewProps {
	games: Game[];
	knockoutMatches: KnockoutMatch[];
	knockoutPicks: Record<number, {p1: number; p2: number}>;
	myReactions: string[];
	onReact: (emoji: string) => void;
	participant: Participant;
	participants: Participant[];
	reactions: Record<string, number>;
}

export function ParticipantView({
	games,
	knockoutMatches,
	knockoutPicks,
	myReactions,
	onReact,
	participant,
	participants,
	reactions,
}: ParticipantViewProps) {
	const knockoutBets = knockoutMatches
		.filter((match) => knockoutPicks[match.matchNumber])
		.sort((a, b) => a.matchNumber - b.matchNumber);
	const {exactCount, scored, total} = scoreParticipant(participant, games);

	const stats = useMemo(
		() => buildParticipantStats(participant, participants, games),
		[participant, participants, games]
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-5">
				<div className="flex items-center gap-3 sm:gap-5">
					<Avatar
						className="h-16 w-16 rounded-2xl text-2xl sm:h-64 sm:w-64 sm:text-4xl"
						name={participant.name}
						photoURL={participant.photoURL}
					/>

					<div>
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="font-display text-2xl font-bold text-white sm:text-3xl">
								{participant.name}
							</h2>

							<span className="rounded-full bg-white/10 px-2 py-0.5 font-display text-sm font-bold text-slate-200">
								#{stats.rank}
							</span>

							{stats.movement > 0 && (
								<span className="text-xs font-semibold text-emerald-400">
									▲{stats.movement}
								</span>
							)}

							{stats.movement < 0 && (
								<span className="text-xs font-semibold text-rose-400">
									▼{-stats.movement}
								</span>
							)}
						</div>

						<p className="mt-1 text-sm text-slate-400">
							{exactCount} exact score{exactCount === 1 ? '' : 's'}
						</p>

						<div className="group mt-2">
							<Reactions
								counts={reactions}
								mine={myReactions}
								onReact={onReact}
							/>
						</div>
					</div>
				</div>

				<div className="text-right">
					<p className="font-display text-4xl font-bold text-amber-400 sm:text-5xl">
						{total}
					</p>

					<p className="text-xs uppercase tracking-wider text-slate-400">
						points
					</p>
				</div>
			</div>

			<ParticipantStatsPanel
				playerCount={participants.length}
				stats={stats}
			/>

			{scored.length > 0 && (
				<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
					<table className="w-full min-w-[640px] text-left">
						<thead>
							<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
								<th className="px-3 py-3">#</th>

								<th className="px-3 py-3">Group</th>

								<th className="hidden px-3 py-3 sm:table-cell">
									Date
								</th>

								<th className="px-3 py-3">Prediction</th>

								<th className="px-3 py-3 text-center">Result</th>

								<th className="px-3 py-3 text-center">Status</th>

								<th className="px-3 py-3 text-right">Points</th>
							</tr>
						</thead>

						<tbody>
							{scored.map((item) => (
								<MatchRow
									key={item.prediction.matchNo}
									scored={item}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}

			{knockoutBets.length > 0 && (
				<div>
					<h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
						Knockout
					</h3>

					<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
						<table className="w-full text-left">
							<thead>
								<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
									<th className="px-3 py-3">Round</th>

									<th className="px-3 py-3">Match</th>

									<th className="px-3 py-3 text-center">Pick</th>

									<th className="px-3 py-3 text-center">
										Result
									</th>

									<th className="px-3 py-3 text-right">Points</th>
								</tr>
							</thead>

							<tbody>
								{knockoutBets.map((match) => {
									const pick = knockoutPicks[match.matchNumber];
									const resolved =
										match.scoreA != null &&
										match.scoreB != null;
									const points = resolved
										? scorePrediction(
												pick.p1,
												pick.p2,
												match.scoreA as number,
												match.scoreB as number
											)
										: null;

									return (
										<tr
											className="border-b border-white/5 last:border-0"
											key={match.matchNumber}
										>
											<td className="px-3 py-2.5 text-xs text-slate-400">
												{match.stage}
											</td>

											<td className="px-3 py-2.5">
												<span className="flex items-center gap-1.5 text-sm text-white">
													{flagCode(
														match.teamA ?? ''
													) && (
														<Flag
															className="h-3 w-4"
															team={
																match.teamA as string
															}
														/>
													)}

													<span className="truncate">
														{match.teamA ?? match.a}
													</span>

													<span className="text-slate-500">
														×
													</span>

													<span className="truncate">
														{match.teamB ?? match.b}
													</span>

													{flagCode(
														match.teamB ?? ''
													) && (
														<Flag
															className="h-3 w-4"
															team={
																match.teamB as string
															}
														/>
													)}
												</span>
											</td>

											<td className="px-3 py-2.5 text-center font-display font-bold text-white">
												{pick.p1}–{pick.p2}
											</td>

											<td className="px-3 py-2.5 text-center text-slate-300">
												{resolved
													? `${match.scoreA}–${match.scoreB}`
													: '—'}
											</td>

											<td className="px-3 py-2.5 text-right">
												{points !== null ? (
													<span
														className={`inline-block min-w-8 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${TIER_STYLES[points]}`}
													>
														{points}
													</span>
												) : (
													<span className="text-slate-600">
														—
													</span>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
