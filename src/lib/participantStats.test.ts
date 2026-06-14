import {describe, expect, it} from 'vitest';

import {buildParticipantStats} from './participantStats';
import type {Game, Participant} from './types';

function makeGame(overrides: Partial<Game> = {}): Game {
	return {
		awayScore: 0,
		awayTeam: 'South Africa',
		finished: false,
		group: 'A',
		homeScore: 0,
		homeTeam: 'Mexico',
		id: 1,
		localDate: '06/11/2026 13:00',
		matchday: 1,
		timeElapsed: 'notstarted',
		...overrides,
	};
}

function makeParticipant(
	name: string,
	predictions: Array<[number, string, number, number, string]>
): Participant {
	return {
		name,
		predictions: predictions.map(([matchNo, team1, p1, p2, team2]) => ({
			date: 'Jun/11',
			group: 'Group A',
			matchNo,
			p1,
			p2,
			team1,
			team2,
			time: '13:00',
		})),
	};
}

// Ana nails the 2–0 exactly (25); Bia picks 1–1 and scores nothing.
const ANA = makeParticipant('Ana', [[1, 'Mexico', 2, 0, 'South Africa']]);
const BIA = makeParticipant('Bia', [[1, 'Mexico', 1, 1, 'South Africa']]);

const FINISHED = makeGame({
	finished: true,
	homeScore: 2,
	timeElapsed: 'finished',
});

describe('buildParticipantStats', () => {
	it('reports exact-score tier, hit rate and best round for a winner', () => {
		const stats = buildParticipantStats(ANA, [ANA, BIA], [FINISHED]);

		expect(stats.rank).toBe(1);
		expect(stats.total).toBe(25);
		expect(stats.hits).toBe(1);
		expect(stats.hitRate).toBe(1);
		expect(stats.avgPerMatch).toBe(25);
		expect(stats.streak).toBe(1);
		expect(stats.tierCounts[0]).toBe(1); // one exact (25)
		expect(stats.bestRound).toEqual({
			label: 'Mexico 2–0 South Africa',
			points: 25,
		});
		expect(stats.rankHistory).toEqual([1]);
	});

	it('captures the gap to the leader and a missed call', () => {
		const stats = buildParticipantStats(BIA, [ANA, BIA], [FINISHED]);

		expect(stats.rank).toBe(2);
		expect(stats.gapToLeader).toBe(25);
		expect(stats.hits).toBe(0);
		expect(stats.tierCounts[5]).toBe(1); // one miss (0)
		expect(stats.bestRound).toBeNull();
	});

	it('flags a unique pick as contrarian', () => {
		const stats = buildParticipantStats(ANA, [ANA, BIA], [FINISHED]);

		// Ana's 2–0 is hers alone among the two players.
		expect(stats.uniquePicks).toBe(1);
		expect(stats.contrarianRate).toBe(1);
		expect(stats.favoriteScoreline).toBe('2–0');
		expect(stats.avgGoals).toBe(2);
	});
});
