import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

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
		expect(normalizeTeamName('São Tomé')).toBe('saotome');
		expect(normalizeTeamName('Bosnia and Herzegovina')).toBe(
			'bosniaandherzegovina'
		);
	});

	it('canonicalizes FIFA names to the API vocabulary', () => {
		expect(normalizeTeamName("Côte d'Ivoire")).toBe(
			normalizeTeamName('Ivory Coast')
		);
		expect(normalizeTeamName('Türkiye')).toBe(normalizeTeamName('Turkey'));
		expect(normalizeTeamName('Korea Republic')).toBe(
			normalizeTeamName('South Korea')
		);
		expect(normalizeTeamName('Czechia')).toBe(
			normalizeTeamName('Czech Republic')
		);
		expect(normalizeTeamName('USA')).toBe(
			normalizeTeamName('United States')
		);
		expect(normalizeTeamName('Cabo Verde')).toBe(
			normalizeTeamName('Cape Verde')
		);
		expect(normalizeTeamName('IR Iran')).toBe(normalizeTeamName('Iran'));
		expect(normalizeTeamName('Congo DR')).toBe(
			normalizeTeamName('Democratic Republic of the Congo')
		);
	});

	it('returns an empty string for a missing name', () => {
		expect(normalizeTeamName(undefined as unknown as string)).toBe('');
	});
});

describe('findGameForPrediction', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('joins by match number when the teams line up', () => {
		expect(findGameForPrediction(makePrediction(), [makeGame()])).toEqual(
			makeGame()
		);
	});

	it('falls back to team matching when the id points at the wrong game', () => {
		const games = [
			makeGame({awayTeam: 'Ecuador', homeTeam: 'Germany', id: 1}),
			makeGame({id: 50}),
		];

		expect(findGameForPrediction(makePrediction(), games)?.id).toBe(50);
	});

	it('warns when the team-name fallback is used', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

		findGameForPrediction(makePrediction(), [makeGame({id: 50})]);

		expect(warn).toHaveBeenCalledOnce();

		warn.mockRestore();
	});

	it('joins through team aliases when the sources name teams differently', () => {
		const prediction = makePrediction({
			team1: 'Korea Republic',
			team2: 'Czechia',
		});
		const games = [
			makeGame({awayTeam: 'Czech Republic', homeTeam: 'South Korea', id: 2}),
		];

		expect(findGameForPrediction(prediction, games)?.id).toBe(2);
	});

	it('prefers the game on the predicted date when teams rematch', () => {
		const games = [
			makeGame({id: 80, localDate: '07/04/2026 13:00'}),
			makeGame({id: 50}),
		];

		expect(findGameForPrediction(makePrediction(), games)?.id).toBe(50);
	});

	it('tolerates a one-day timezone skew in the fallback date match', () => {
		const prediction = makePrediction({date: 'Jun/14'});
		const games = [makeGame({id: 50, localDate: '06/13/2026 21:00'})];

		expect(findGameForPrediction(prediction, games)?.id).toBe(50);
	});

	it('survives games without team names', () => {
		const knockoutGame = makeGame({
			awayTeam: undefined as unknown as string,
			homeTeam: undefined as unknown as string,
			id: 73,
		});

		expect(
			findGameForPrediction(makePrediction({matchNo: 73}), [knockoutGame])
		).toBeUndefined();
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
