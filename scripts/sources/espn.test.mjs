import {describe, expect, it} from 'vitest';

import {normalizeEspnEvents} from './espn.mjs';

const RAW_EVENT = {
	competitions: [
		{
			competitors: [
				{
					homeAway: 'home',
					score: '0',
					team: {displayName: 'Mexico'},
				},
				{
					homeAway: 'away',
					score: '0',
					team: {displayName: 'South Africa'},
				},
			],
		},
	],
	date: '2026-06-11T19:00Z',
	id: '740001',
	status: {displayClock: "0'", type: {state: 'pre'}},
};

describe('normalizeEspnEvents', () => {
	it('maps a scheduled event', () => {
		expect(normalizeEspnEvents([RAW_EVENT])).toEqual([
			{
				awayScore: 0,
				awayTeam: 'South Africa',
				finished: false,
				group: '',
				homeScore: 0,
				homeTeam: 'Mexico',
				id: 740001,
				localDate: '2026-06-11T19:00Z',
				matchday: 1,
				timeElapsed: 'notstarted',
			},
		]);
	});

	it('maps a live event with clock', () => {
		const [game] = normalizeEspnEvents([
			{
				...RAW_EVENT,
				competitions: [
					{
						competitors: [
							{homeAway: 'home', score: '1', team: {displayName: 'Mexico'}},
							{
								homeAway: 'away',
								score: '0',
								team: {displayName: 'South Africa'},
							},
						],
					},
				],
				status: {displayClock: "37'", type: {state: 'in'}},
			},
		]);

		expect(game.finished).toBe(false);
		expect(game.homeScore).toBe(1);
		expect(game.timeElapsed).toBe('37');
	});

	it('maps a finished event', () => {
		const [game] = normalizeEspnEvents([
			{...RAW_EVENT, status: {displayClock: "90'", type: {state: 'post'}}},
		]);

		expect(game.finished).toBe(true);
		expect(game.timeElapsed).toBe('finished');
	});
});
