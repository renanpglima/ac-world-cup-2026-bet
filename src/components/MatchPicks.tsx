import type {MatchEntry} from '../lib/matches';
import {Avatar} from './Avatar';
import {TIER_STYLES} from './StatusChip';

interface PredictionGroup {
	names: string[];
	p1: number;
	p2: number;
	points: number | null;
}

// Collapse the players' bets into one row per distinct prediction, so identical
// bets sit together. Same prediction ⇒ same points, so each row scores once.
// Sorted by points, then by how many backed it, then by the scoreline.
function predictionGroups(entries: MatchEntry[]): PredictionGroup[] {
	const groups = new Map<string, PredictionGroup>();

	for (const entry of entries) {
		const key = `${entry.p1}-${entry.p2}`;
		const group = groups.get(key);

		if (group) {
			group.names.push(entry.name);
		}
		else {
			groups.set(key, {
				names: [entry.name],
				p1: entry.p1,
				p2: entry.p2,
				points: entry.points,
			});
		}
	}

	return [...groups.values()].sort(
		(a, b) =>
			(b.points ?? -1) - (a.points ?? -1) ||
			b.names.length - a.names.length ||
			a.p1 - b.p1 ||
			a.p2 - b.p2
	);
}

// The players' predictions for a match: avatar chips grouped by scoreline, with
// the score and points. Shared by the Matches tab and the bracket popover.
export function MatchPicks({
	entries,
	live = false,
}: {
	entries: MatchEntry[];
	live?: boolean;
}) {
	return (
		<table className="w-full text-left text-sm">
			<thead>
				<tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
					<th className="pb-1.5 font-semibold">Players</th>

					<th className="pb-1.5 pl-2 text-right font-semibold">Score</th>

					<th className="pb-1.5 pl-2 text-right font-semibold">Pts</th>
				</tr>
			</thead>

			<tbody>
				{predictionGroups(entries).map((group) => (
					<tr
						className="border-t border-white/5"
						key={`${group.p1}-${group.p2}`}
					>
						<td className="py-1.5 pr-2">
							<div className="flex flex-wrap gap-1">
								{group.names.map((name) => (
									<span
										className="inline-flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-0.5 pr-2 text-xs text-slate-200"
										key={name}
									>
										<Avatar
											className="h-4 w-4 rounded-full text-[8px]"
											name={name}
										/>

										{name}
									</span>
								))}
							</div>
						</td>

						<td className="py-1.5 pl-2 text-right align-top">
							<span className="inline-block whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">
								{group.p1}–{group.p2}
							</span>
						</td>

						<td className="py-1.5 pl-2 text-right align-top">
							{group.points !== null ? (
								<span
									className={`inline-block min-w-8 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${
										TIER_STYLES[group.points]
									} ${live ? 'animate-pulse' : ''}`}
								>
									{group.points}
								</span>
							) : (
								<span className="text-xs text-slate-600">—</span>
							)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
