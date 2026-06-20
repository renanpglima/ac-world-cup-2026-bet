import type {MatchEntry} from '../lib/matches';
import {poolBarColors} from '../lib/teamColors';

const DRAW_COLOR = '#64748b';

// How the pool split its picks for a match: a thin stacked bar of the share who
// backed team 1, a draw, or team 2 (derived from each prediction's scoreline).
// Each team's slice is tinted with its flag color; the draw is gray.
export function BetSplitBar({
	entries,
	team1,
	team2,
}: {
	entries: MatchEntry[];
	team1: string;
	team2: string;
}) {
	const total = entries.length;

	if (total === 0) {
		return null;
	}

	let backedTeam1 = 0;
	let backedDraw = 0;
	let backedTeam2 = 0;

	for (const entry of entries) {
		if (entry.p1 > entry.p2) {
			backedTeam1 += 1;
		}
		else if (entry.p1 < entry.p2) {
			backedTeam2 += 1;
		}
		else {
			backedDraw += 1;
		}
	}

	const {color1, color2} = poolBarColors(team1, team2);

	const segments = [
		{color: color1, count: backedTeam1},
		{color: DRAW_COLOR, count: backedDraw},
		{color: color2, count: backedTeam2},
	];

	return (
		<div>
			<p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
				Pool picks
			</p>

			<div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
				{segments.map((segment, index) =>
					segment.count > 0 ? (
						<div
							key={index}
							style={{
								backgroundColor: segment.color,
								width: `${(segment.count / total) * 100}%`,
							}}
						/>
					) : null
				)}
			</div>

			<div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-slate-400">
				<span className="flex min-w-0 items-center gap-1">
					<span
						className="h-2 w-2 shrink-0 rounded-full"
						style={{backgroundColor: color1}}
					/>

					<span className="truncate">{team1}</span>
				</span>

				<span className="flex shrink-0 items-center gap-1">
					<span
						className="h-2 w-2 rounded-full"
						style={{backgroundColor: DRAW_COLOR}}
					/>
					Draw
				</span>

				<span className="flex min-w-0 items-center justify-end gap-1">
					<span className="truncate">{team2}</span>

					<span
						className="h-2 w-2 shrink-0 rounded-full"
						style={{backgroundColor: color2}}
					/>
				</span>
			</div>
		</div>
	);
}
