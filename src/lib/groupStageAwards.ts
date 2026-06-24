import type {LeaderboardRow} from './ranking';
import type {TimelineFrame} from './timeline';

export interface Award {
	hint: string;
	icon: string;
	label: string;
	name: string;
	value: string;
}

// The name with the highest count, ties broken by name for determinism.
function pickMax(counts: Map<string, number>): {name: string; value: number} | null {
	const sorted = [...counts].sort(
		(a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
	);

	return sorted.length ? {name: sorted[0][0], value: sorted[0][1]} : null;
}

// Fun group-stage awards derived from the rank-by-match timeline and the final
// standings. Pure: App passes the already-computed timeline + leaderboard rows.
export function buildGroupStageAwards(
	frames: TimelineFrame[],
	board: LeaderboardRow[]
): Award[] {
	if (board.length === 0) {
		return [];
	}

	const leaderFrames = new Map<string, number>();
	const lastFrames = new Map<string, number>();
	const worstRank = new Map<string, number>();
	const bestHaul = new Map<string, number>();

	for (const frame of frames) {
		const maxRank = Math.max(...frame.standings.map((row) => row.rank));

		for (const row of frame.standings) {
			if (row.rank === 1) {
				leaderFrames.set(row.name, (leaderFrames.get(row.name) ?? 0) + 1);
			}

			if (row.rank === maxRank) {
				lastFrames.set(row.name, (lastFrames.get(row.name) ?? 0) + 1);
			}

			worstRank.set(
				row.name,
				Math.max(worstRank.get(row.name) ?? 0, row.rank)
			);
			bestHaul.set(
				row.name,
				Math.max(bestHaul.get(row.name) ?? 0, row.gained)
			);
		}
	}

	const climb = new Map<string, number>();

	for (const row of board) {
		climb.set(row.name, (worstRank.get(row.name) ?? row.rank) - row.rank);
	}

	const mostExact = [...board].sort(
		(a, b) => b.exactCount - a.exactCount || a.name.localeCompare(b.name)
	)[0];

	const lastPlace = [...board].sort(
		(a, b) => b.rank - a.rank || a.name.localeCompare(b.name)
	)[0];

	const topLeader = pickMax(leaderFrames);
	const topLast = pickMax(lastFrames);
	const topClimb = pickMax(climb);
	const topHaul = pickMax(bestHaul);

	const matches = (count: number) =>
		`${count} ${count === 1 ? 'match' : 'matches'}`;

	return [
		{
			hint: 'Spent the most matches at #1',
			icon: '👑',
			label: 'Most time on top',
			name: topLeader?.name ?? '—',
			value: topLeader ? matches(topLeader.value) : '—',
		},
		{
			hint: 'Spent the most matches in last place',
			icon: '🪑',
			label: 'Most time at the bottom',
			name: topLast?.name ?? '—',
			value: topLast ? matches(topLast.value) : '—',
		},
		{
			hint: 'Most exact scorelines',
			icon: '🎯',
			label: 'Sharpest eye',
			name: mostExact.name,
			value: `${mostExact.exactCount} exact`,
		},
		{
			hint: 'Most places climbed from their low point',
			icon: '🚀',
			label: 'Biggest climber',
			name: topClimb && topClimb.value > 0 ? topClimb.name : '—',
			value: topClimb && topClimb.value > 0 ? `+${topClimb.value}` : '—',
		},
		{
			hint: 'Most points from a single match',
			icon: '🎰',
			label: 'Biggest haul',
			name: topHaul?.name ?? '—',
			value: topHaul ? `${topHaul.value} pts` : '—',
		},
		{
			hint: 'Finished last',
			icon: '🥄',
			label: 'Wooden spoon',
			name: lastPlace.name,
			value: `${lastPlace.total} pts`,
		},
	];
}
