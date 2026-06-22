import {describe, expect, it} from 'vitest';

import {normalizeFifaGames} from './fifa.mjs';

const RAW_MATCH = {
	Away: {
		Score: null,
		TeamName: [{Description: 'South Africa', Locale: 'en-GB'}],
	},
	Date: '2026-06-11T19:00:00Z',
	GroupName: [{Description: 'Group A', Locale: 'en-GB'}],
	Home: {
		Score: null,
		TeamName: [{Description: 'Mexico', Locale: 'en-GB'}],
	},
	IdMatch: '400021443',
	LocalDate: '2026-06-11T13:00:00Z',
	MatchStatus: 1,
	MatchTime: null,
	StageName: [{Description: 'First stage', Locale: 'en-GB'}],
};

describe('normalizeFifaGames', () => {
	it('maps a scheduled group-stage match', () => {
		expect(normalizeFifaGames([RAW_MATCH])).toEqual([
			{
				awayScore: 0,
				awayTeam: 'South Africa',
				finished: false,
				group: 'Group A',
				homeScore: 0,
				homeTeam: 'Mexico',
				id: 400021443,
				localDate: '2026-06-11T19:00:00Z',
				matchday: 1,
				timeElapsed: 'notstarted',
			},
		]);
	});

	it('maps a live match with elapsed minutes', () => {
		const [game] = normalizeFifaGames([
			{
				...RAW_MATCH,
				Away: {...RAW_MATCH.Away, Score: 0},
				Home: {...RAW_MATCH.Home, Score: 2},
				MatchStatus: 3,
				MatchTime: "67'",
			},
		]);

		expect(game.finished).toBe(false);
		expect(game.homeScore).toBe(2);
		expect(game.timeElapsed).toBe('67');
	});

	it('treats half-time (MatchStatus 11) as live', () => {
		const [game] = normalizeFifaGames([
			{
				...RAW_MATCH,
				Away: {...RAW_MATCH.Away, Score: 0},
				Home: {...RAW_MATCH.Home, Score: 1},
				MatchStatus: 11,
				MatchTime: '',
			},
		]);

		expect(game.finished).toBe(false);
		expect(game.timeElapsed).toBe('HT');
	});

	it('keeps scheduled and postponed/abandoned (1/4/5) as notstarted', () => {
		for (const status of [1, 4, 5]) {
			const [game] = normalizeFifaGames([
				{...RAW_MATCH, MatchStatus: status},
			]);

			expect(game.timeElapsed).toBe('notstarted');
		}
	});

	it('maps a finished match', () => {
		const [game] = normalizeFifaGames([
			{
				...RAW_MATCH,
				Away: {...RAW_MATCH.Away, Score: 1},
				Home: {...RAW_MATCH.Home, Score: 2},
				MatchStatus: 0,
			},
		]);

		expect(game.finished).toBe(true);
		expect(game.timeElapsed).toBe('finished');
	});

	it('drops knockout and team-less matches', () => {
		const knockout = {
			...RAW_MATCH,
			StageName: [{Description: 'Round of 32', Locale: 'en-GB'}],
		};
		const teamless = {...RAW_MATCH, Away: null, Home: null};

		expect(normalizeFifaGames([RAW_MATCH, knockout, teamless])).toHaveLength(
			1
		);
	});
});
