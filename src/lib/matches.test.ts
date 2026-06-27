import {describe, expect, it} from 'vitest';

import {buildMatchCards, type MatchEntry, visiblePicks} from './matches';
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
			time: '16:00',
		})),
	};
}

const ANA = makeParticipant('Ana', [[1, 'Mexico', 2, 0, 'South Africa']]);
const BIA = makeParticipant('Bia', [[1, 'Mexico', 1, 1, 'South Africa']]);

describe('buildMatchCards', () => {
	it('builds one card per unique match across participants', () => {
		const caio = makeParticipant('Caio', [
			[1, 'Mexico', 2, 1, 'South Africa'],
			[2, 'Korea Republic', 1, 1, 'Czechia'],
		]);

		const cards = buildMatchCards([ANA, caio], []);

		expect(cards.map((card) => card.matchNo)).toEqual([1, 2]);
		expect(cards[1].entries.map((entry) => entry.name)).toEqual(['Caio']);
	});

	it('lists entries alphabetically with null points before kickoff', () => {
		const cards = buildMatchCards([BIA, ANA], [makeGame()]);

		expect(cards[0].status).toBe('notstarted');
		expect(cards[0].r1).toBeUndefined();
		expect(cards[0].entries).toEqual([
			{name: 'Ana', p1: 2, p2: 0, points: null},
			{name: 'Bia', p1: 1, p2: 1, points: null},
		]);
	});

	it('scores and ranks entries by points once the match starts', () => {
		const game = makeGame({
			finished: true,
			homeScore: 2,
			timeElapsed: 'finished',
		});

		const cards = buildMatchCards([BIA, ANA], [game]);

		expect(cards[0].status).toBe('finished');
		expect(cards[0].r1).toBe(2);
		expect(cards[0].r2).toBe(0);
		expect(cards[0].entries).toEqual([
			{name: 'Ana', p1: 2, p2: 0, points: 25},
			{name: 'Bia', p1: 1, p2: 1, points: 0},
		]);
	});

	it('marks in-progress matches as live with provisional points', () => {
		const game = makeGame({homeScore: 1, timeElapsed: '37'});

		const cards = buildMatchCards([ANA], [game]);

		expect(cards[0].status).toBe('live');
		expect(cards[0].entries[0].points).toBe(10);
	});

	it('breaks point ties alphabetically', () => {
		const game = makeGame({
			finished: true,
			homeScore: 3,
			timeElapsed: 'finished',
		});
		const zeca = makeParticipant('Zeca', [[1, 'Mexico', 2, 0, 'South Africa']]);

		const cards = buildMatchCards([zeca, ANA], [game]);

		expect(cards[0].entries.map((entry) => entry.name)).toEqual([
			'Ana',
			'Zeca',
		]);
	});
});

describe('visiblePicks', () => {
	const ENTRIES: MatchEntry[] = [
		{name: 'Ana', p1: 2, p2: 0, points: null},
		{name: 'Bia', p1: 1, p2: 1, points: null},
	];

	it('hides everyone but the signed-in player before kickoff', () => {
		expect(visiblePicks(ENTRIES, 'notstarted', 'Ana')).toEqual([
			{name: 'Ana', p1: 2, p2: 0, points: null},
		]);
	});

	it('hides every pick when no one is identified before kickoff', () => {
		expect(visiblePicks(ENTRIES, 'notstarted', null)).toEqual([]);
	});

	it('reveals all picks once the match is live', () => {
		expect(visiblePicks(ENTRIES, 'live', 'Ana')).toBe(ENTRIES);
	});

	it('reveals all picks once the match is finished', () => {
		expect(visiblePicks(ENTRIES, 'finished', null)).toBe(ENTRIES);
	});
});

describe('buildMatchCards orientation', () => {
	it('re-orients entries whose CSV lists the teams flipped', () => {
		const game = makeGame({
			awayScore: 1,
			finished: true,
			homeScore: 3,
			timeElapsed: 'finished',
		});
		const flipped = makeParticipant('Flip', [
			[1, 'South Africa', 1, 3, 'Mexico'],
		]);

		const cards = buildMatchCards([ANA, flipped], [game]);

		expect(cards[0].entries).toContainEqual({
			name: 'Flip',
			p1: 3,
			p2: 1,
			points: 25,
		});
	});
});
