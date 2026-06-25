import {describe, expect, it} from 'vitest';

import {detectMatchEvents, formatEvent, signalPayload} from './match-bot.mjs';

const base = {
	awayScore: 0,
	awayTeam: 'Iraq',
	finished: false,
	homeScore: 0,
	homeTeam: 'France',
	id: 1,
	timeElapsed: 'notstarted',
};

describe('detectMatchEvents', () => {
	it('returns nothing when there is no previous snapshot', () => {
		expect(detectMatchEvents(null, [base])).toEqual([]);
	});

	it('detects a kickoff (notstarted -> live)', () => {
		const events = detectMatchEvents([base], [{...base, timeElapsed: '1'}]);

		expect(events).toEqual([
			{game: {...base, timeElapsed: '1'}, type: 'kickoff'},
		]);
	});

	it('detects a home and an away goal while live', () => {
		const prev = [{...base, timeElapsed: '20'}];
		const next = [{...base, awayScore: 1, homeScore: 1, timeElapsed: '40'}];
		const events = detectMatchEvents(prev, next);

		expect(events.map((event) => [event.type, event.side])).toEqual([
			['goal', 'home'],
			['goal', 'away'],
		]);
	});

	it('detects full time (live -> finished) without a goal event', () => {
		const prev = [{...base, homeScore: 2, timeElapsed: '90'}];
		const next = [
			{...base, finished: true, homeScore: 2, timeElapsed: 'finished'},
		];
		const events = detectMatchEvents(prev, next);

		expect(events.map((event) => event.type)).toEqual(['final']);
	});
});

describe('formatEvent', () => {
	const game = {
		awayScore: 0,
		awayTeam: 'Iraq',
		homeScore: 1,
		homeTeam: 'France',
		id: 1,
	};

	it('formats kickoff with flags', () => {
		expect(formatEvent({game, type: 'kickoff'})).toBe(
			'🟢 LIVE — 🇫🇷 France 🆚 Iraq 🇮🇶'
		);
	});

	it('formats a goal with the scoring team', () => {
		expect(formatEvent({game, side: 'home', type: 'goal'})).toBe(
			'⚽ GOOOOAL! 🇫🇷 France — France 1-0 Iraq'
		);
	});

	it('formats full time with the score', () => {
		expect(
			formatEvent({
				game: {...game, awayScore: 1, homeScore: 2},
				type: 'final',
			})
		).toBe('🏁 FT — 🇫🇷 France 2 x 1 Iraq 🇮🇶');
	});
});

describe('signalPayload', () => {
	const game = {
		awayScore: 1,
		awayTeam: 'Iraq',
		homeScore: 2,
		homeTeam: 'France',
		id: 1,
	};

	it('builds a kickoff payload', () => {
		expect(signalPayload({game, type: 'kickoff'})).toEqual({
			away: 'Iraq',
			event: 'match_kickoff',
			home: 'France',
			message: formatEvent({game, type: 'kickoff'}),
		});
	});

	it('builds a goal payload with the scorer and score', () => {
		expect(signalPayload({game, side: 'home', type: 'goal'})).toEqual({
			away: 'Iraq',
			awayScore: 1,
			event: 'match_goal',
			home: 'France',
			homeScore: 2,
			message: formatEvent({game, side: 'home', type: 'goal'}),
			scorer: 'France',
		});
	});

	it('builds a final payload with the score', () => {
		expect(signalPayload({game, type: 'final'})).toEqual({
			away: 'Iraq',
			awayScore: 1,
			event: 'match_final',
			home: 'France',
			homeScore: 2,
			message: formatEvent({game, type: 'final'}),
		});
	});
});
