import {describe, expect, it} from 'vitest';

import {buildGroupStageAwards} from './groupStageAwards';
import type {LeaderboardRow} from './ranking';
import type {TimelineFrame} from './timeline';

function frame(
	standings: {gained: number; name: string; rank: number}[]
): TimelineFrame {
	return {
		date: 'Jun/1',
		matchNo: 1,
		r1: 0,
		r2: 0,
		standings: standings.map((s) => ({
			gained: s.gained,
			movement: 0,
			name: s.name,
			rank: s.rank,
			total: 0,
		})),
		team1: 'X',
		team2: 'Y',
		time: '12:00',
	};
}

const BOARD: LeaderboardRow[] = [
	{exactCount: 3, livePoints: 0, name: 'A', rank: 1, total: 50},
	{exactCount: 1, livePoints: 0, name: 'B', rank: 2, total: 30},
	{exactCount: 0, livePoints: 0, name: 'C', rank: 3, total: 10},
];

const FRAMES: TimelineFrame[] = [
	frame([
		{gained: 5, name: 'A', rank: 2},
		{gained: 10, name: 'B', rank: 1},
		{gained: 0, name: 'C', rank: 3},
	]),
	frame([
		{gained: 20, name: 'A', rank: 1},
		{gained: 0, name: 'B', rank: 2},
		{gained: 2, name: 'C', rank: 3},
	]),
	frame([
		{gained: 0, name: 'A', rank: 1},
		{gained: 0, name: 'B', rank: 2},
		{gained: 0, name: 'C', rank: 3},
	]),
];

describe('buildGroupStageAwards', () => {
	it('returns no awards without standings', () => {
		expect(buildGroupStageAwards(FRAMES, [])).toEqual([]);
	});

	it('computes the six awards from the timeline and standings', () => {
		const byLabel = Object.fromEntries(
			buildGroupStageAwards(FRAMES, BOARD).map((a) => [
				a.label,
				{name: a.name, value: a.value},
			])
		);

		expect(byLabel['Most time on top']).toEqual({
			name: 'A',
			value: '2 matches',
		});
		expect(byLabel['Most time at the bottom']).toEqual({
			name: 'C',
			value: '3 matches',
		});
		expect(byLabel['Sharpest eye']).toEqual({name: 'A', value: '3 exact'});
		expect(byLabel['Biggest climber']).toEqual({name: 'A', value: '+1'});
		expect(byLabel['Biggest haul']).toEqual({name: 'A', value: '20 pts'});
		expect(byLabel['Wooden spoon']).toEqual({name: 'C', value: '10 pts'});
	});
});
