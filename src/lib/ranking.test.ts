import {describe, expect, it} from 'vitest';

import {buildLeaderboard, scoreParticipant} from './ranking';
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

function makeParticipant(name: string, p1: number, p2: number): Participant {
	return {
		name,
		predictions: [
			{
				date: 'Jun/11',
				group: 'Group A',
				matchNo: 1,
				p1,
				p2,
				team1: 'Mexico',
				team2: 'South Africa',
				time: '16:00',
			},
		],
	};
}

const FINISHED_2_1 = makeGame({
	awayScore: 1,
	finished: true,
	homeScore: 2,
	timeElapsed: 'finished',
});

describe('scoreParticipant', () => {
	it('does not score matches that have not started', () => {
		const result = scoreParticipant(makeParticipant('Ana', 0, 0), [
			makeGame(),
		]);

		expect(result.scored[0].points).toBeNull();
		expect(result.total).toBe(0);
		expect(result.exactCount).toBe(0);
	});

	it('scores finished matches', () => {
		const result = scoreParticipant(makeParticipant('Ana', 2, 1), [
			FINISHED_2_1,
		]);

		expect(result.scored[0].points).toBe(25);
		expect(result.total).toBe(25);
		expect(result.exactCount).toBe(1);
	});

	it('scores live matches provisionally', () => {
		const game = makeGame({homeScore: 1, timeElapsed: '37'});
		const result = scoreParticipant(makeParticipant('Ana', 1, 0), [game]);

		expect(result.scored[0].status).toBe('live');
		expect(result.scored[0].points).toBe(25);
	});

	it('orients the real score when the prediction lists teams flipped', () => {
		const participant: Participant = {
			name: 'Ana',
			predictions: [
				{
					date: 'Jun/11',
					group: 'Group A',
					matchNo: 1,
					p1: 1,
					p2: 2,
					team1: 'South Africa',
					team2: 'Mexico',
					time: '16:00',
				},
			],
		};
		const result = scoreParticipant(participant, [FINISHED_2_1]);

		expect(result.scored[0].points).toBe(25);
	});

	it('leaves predictions without a matching game unscored', () => {
		const result = scoreParticipant(makeParticipant('Ana', 1, 0), []);

		expect(result.scored[0].points).toBeNull();
		expect(result.scored[0].status).toBe('notstarted');
	});
});

describe('buildLeaderboard', () => {
	it('ranks by total points descending', () => {
		const rows = buildLeaderboard(
			[makeParticipant('Ana', 0, 1), makeParticipant('Bia', 2, 1)],
			[FINISHED_2_1]
		);

		expect(rows.map((row) => [row.rank, row.name, row.total])).toEqual([
			[1, 'Bia', 25],
			[2, 'Ana', 0],
		]);
	});

	it('applies competition ranking to ties, alphabetical within a tie', () => {
		const rows = buildLeaderboard(
			[
				makeParticipant('Caio', 0, 1),
				makeParticipant('Zeca', 2, 1),
				makeParticipant('Ana', 2, 1),
			],
			[FINISHED_2_1]
		);

		expect(rows.map((row) => [row.rank, row.name])).toEqual([
			[1, 'Ana'],
			[1, 'Zeca'],
			[3, 'Caio'],
		]);
	});

	it('counts exact scores per participant', () => {
		const rows = buildLeaderboard([makeParticipant('Ana', 2, 1)], [
			FINISHED_2_1,
		]);

		expect(rows[0].exactCount).toBe(1);
	});
});
