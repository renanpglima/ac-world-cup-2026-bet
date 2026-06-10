import {describe, expect, it} from 'vitest';

import {normalizeGames} from './normalize.mjs';

const RAW_GAME = {
	away_score: '0',
	away_team_name_en: 'South Africa',
	finished: 'FALSE',
	group: 'A',
	home_score: '0',
	home_team_name_en: 'Mexico',
	id: '1',
	local_date: '06/11/2026 13:00',
	matchday: '1',
	time_elapsed: 'notstarted',
	type: 'group',
};

describe('normalizeGames', () => {
	it('coerces API string fields into typed values', () => {
		expect(normalizeGames([RAW_GAME])).toEqual([
			{
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
			},
		]);
	});

	it('treats finished TRUE as finished regardless of case', () => {
		const [game] = normalizeGames([{...RAW_GAME, finished: 'True'}]);

		expect(game.finished).toBe(true);
	});

	it('drops knockout games, which have no team names until decided', () => {
		const knockoutGame = {
			...RAW_GAME,
			away_team_name_en: undefined,
			group: 'R32',
			home_team_name_en: undefined,
			id: '73',
			type: 'r32',
		};

		expect(normalizeGames([RAW_GAME, knockoutGame])).toHaveLength(1);
	});
});
