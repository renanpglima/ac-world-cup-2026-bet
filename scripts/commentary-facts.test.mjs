import {describe, expect, it} from 'vitest';

import {
	buildLeaderboardFacts,
	buildMatchFacts,
	computeBoard,
	finishedFixtures,
	liveFixtureCount,
	parsePredictions,
	scorePrediction,
} from './commentary-facts.mjs';

const PRED_DIR = new URL('../src/data/predictions/', import.meta.url);
const players = parsePredictions(PRED_DIR);

// Build a games array (FIFA orientation) from the shared fixtures, applying
// simulated results to the given match numbers.
function gamesWith(results) {
	const fixtures = players[0].preds;

	return Object.entries(fixtures).map(([matchNo, fx]) => {
		const sim = results[matchNo];

		return {
			awayScore: sim ? sim[1] : 0,
			awayTeam: fx.team2,
			finished: Boolean(sim),
			homeScore: sim ? sim[0] : 0,
			homeTeam: fx.team1,
			id: Number(matchNo),
			timeElapsed: sim ? 'finished' : 'notstarted',
		};
	});
}

describe('scorePrediction', () => {
	it('covers the tiers', () => {
		expect(scorePrediction(2, 1, 2, 1)).toBe(25);
		expect(scorePrediction(2, 1, 2, 0)).toBe(18);
		expect(scorePrediction(2, 1, 3, 2)).toBe(15);
		expect(scorePrediction(1, 1, 2, 2)).toBe(12);
		expect(scorePrediction(2, 1, 4, 1)).toBe(10);
		expect(scorePrediction(2, 1, 0, 1)).toBe(0);
	});
});

describe('parsePredictions', () => {
	it('reads every participant with 72 fixtures', () => {
		expect(players.length).toBeGreaterThanOrEqual(13);

		for (const player of players) {
			expect(Object.keys(player.preds)).toHaveLength(72);
		}
	});
});

describe('match facts for the opener (Mexico 2-0 South Africa)', () => {
	const games = gamesWith({1: [2, 0]});
	const fixture = finishedFixtures(games, players)[0];
	const facts = buildMatchFacts(fixture, games, players);

	it('detects the one finished match', () => {
		expect(finishedFixtures(games, players)).toHaveLength(1);
		expect(facts.result).toBe('Mexico 2-0 South Africa');
	});

	it('lists the exact-score hitters and no zeros', () => {
		expect(facts.exactHitters).toContain('Adriano');
		expect(facts.exactHitters).toContain('Deborah');
		expect(facts.zeros).toEqual([]);
	});
});

describe('leaderboard facts', () => {
	it('summarizes standings after finished matches', () => {
		const facts = buildLeaderboardFacts(gamesWith({1: [2, 0]}), players);

		expect(facts.matchesPlayed).toBe(1);
		expect(facts.standings).toHaveLength(players.length);
		expect(facts.standings[0].rank).toBe(1);
		expect(
			facts.standings.every((row) => row.lastMatchPoints !== null)
		).toBe(true);
	});

	it('returns an empty board when nothing has finished', () => {
		const board = computeBoard(gamesWith({}), players);

		expect(board.every((row) => row.total === 0)).toBe(true);
	});
});

describe('liveFixtureCount', () => {
	it('counts only the fixtures that are live', () => {
		const fixtures = players[0].preds;
		const games = Object.entries(fixtures).map(([matchNo, fx], index) => ({
			awayScore: 0,
			awayTeam: fx.team2,
			finished: index === 1,
			homeScore: index === 0 ? 1 : 0,
			homeTeam: fx.team1,
			id: Number(matchNo),
			timeElapsed:
				index === 0 ? '55' : index === 1 ? 'finished' : 'notstarted',
		}));

		expect(liveFixtureCount(games, players)).toBe(1);
	});
});
