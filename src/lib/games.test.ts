import {describe, expect, it} from 'vitest';

import {
	findGameForPrediction,
	getMatchStatus,
	normalizeTeamName,
	realScoreFor,
} from './games';
import type {Game, Prediction} from './types';

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

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
	return {
		date: 'Jun/11',
		group: 'Group A',
		matchNo: 1,
		p1: 2,
		p2: 0,
		team1: 'Mexico',
		team2: 'South Africa',
		time: '16:00',
		...overrides,
	};
}

describe('getMatchStatus', () => {
	it('reports notstarted', () => {
		expect(getMatchStatus(makeGame())).toBe('notstarted');
	});

	it('reports finished when the finished flag is set', () => {
		expect(getMatchStatus(makeGame({finished: true}))).toBe('finished');
	});

	it('reports finished when time elapsed says so', () => {
		expect(getMatchStatus(makeGame({timeElapsed: 'finished'}))).toBe(
			'finished'
		);
	});

	it('reports live for anything in between', () => {
		expect(getMatchStatus(makeGame({timeElapsed: '37'}))).toBe('live');
	});
});

describe('normalizeTeamName', () => {
	it('strips diacritics, case, and punctuation', () => {
		expect(normalizeTeamName("Côte d'Ivoire")).toBe('cotedivoire');
		expect(normalizeTeamName('Türkiye')).toBe('turkiye');
		expect(normalizeTeamName('Korea Republic')).toBe('korearepublic');
	});
});

describe('findGameForPrediction', () => {
	it('joins by match number when the teams line up', () => {
		expect(findGameForPrediction(makePrediction(), [makeGame()])).toEqual(
			makeGame()
		);
	});

	it('falls back to team matching when the id points at the wrong game', () => {
		const games = [
			makeGame({awayTeam: 'Czechia', homeTeam: 'Korea Republic', id: 1}),
			makeGame({id: 50}),
		];

		expect(findGameForPrediction(makePrediction(), games)?.id).toBe(50);
	});

	it('matches teams in flipped order', () => {
		const prediction = makePrediction({
			team1: 'South Africa',
			team2: 'Mexico',
		});

		expect(findGameForPrediction(prediction, [makeGame()])?.id).toBe(1);
	});

	it('returns undefined when no game matches', () => {
		expect(findGameForPrediction(makePrediction(), [])).toBeUndefined();
	});
});

describe('realScoreFor', () => {
	it('returns home/away when the prediction follows game orientation', () => {
		const game = makeGame({awayScore: 1, homeScore: 3});

		expect(realScoreFor(makePrediction(), game)).toEqual({r1: 3, r2: 1});
	});

	it('flips the score when the prediction lists the away team first', () => {
		const game = makeGame({awayScore: 1, homeScore: 3});
		const prediction = makePrediction({
			team1: 'South Africa',
			team2: 'Mexico',
		});

		expect(realScoreFor(prediction, game)).toEqual({r1: 1, r2: 3});
	});
});
