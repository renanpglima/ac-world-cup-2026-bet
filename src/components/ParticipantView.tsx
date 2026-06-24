import {useMemo} from 'react';

import {buildParticipantStats} from '../lib/participantStats';
import {scoreParticipant} from '../lib/ranking';
import type {Game, Participant} from '../lib/types';
import {Avatar} from './Avatar';
import {MatchRow} from './MatchRow';
import {ParticipantStatsPanel} from './ParticipantStatsPanel';
import {Reactions} from './Reactions';

interface ParticipantViewProps {
	games: Game[];
	myReactions: string[];
	onReact: (emoji: string) => void;
	participant: Participant;
	participants: Participant[];
	reactions: Record<string, number>;
}

export function ParticipantView({
	games,
	myReactions,
	onReact,
	participant,
	participants,
	reactions,
}: ParticipantViewProps) {
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

			<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
				<table className="w-full min-w-[640px] text-left">
					<thead>
						<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
							<th className="px-3 py-3">#</th>

							<th className="px-3 py-3">Group</th>

							<th className="hidden px-3 py-3 sm:table-cell">Date</th>

							<th className="px-3 py-3">Prediction</th>

							<th className="px-3 py-3 text-center">Result</th>

							<th className="px-3 py-3 text-center">Status</th>

							<th className="px-3 py-3 text-right">Points</th>
						</tr>
					</thead>

					<tbody>
						{scored.map((item) => (
							<MatchRow key={item.prediction.matchNo} scored={item} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
