import {describe, expect, it} from 'vitest';

import {kickoffDate} from './kickoff';
import {
	buildKnockoutCards,
	isKnockoutPickable,
	knockoutKickoff,
	knockoutStatus,
	type KnockoutPick,
} from './knockoutCards';
import type {KnockoutMatch} from './useKnockout';

function m(p: Partial<KnockoutMatch>): KnockoutMatch {
	return {
		a: '2A',
		b: '2B',
		date: '2026-06-29T20:30:00Z',
		matchNumber: 73,
		scoreA: null,
		scoreB: null,
		stage: 'Round of 32',
		teamA: null,
		teamB: null,
		...p,
	};
}

describe('knockoutKickoff', () => {
	it('converts an ISO kickoff to the group-stage date/time format (Brasília)', () => {
		// 2026-06-29T20:30:00Z == 17:30 at -03:00
		expect(knockoutKickoff('2026-06-29T20:30:00Z')).toEqual({
			date: 'Jun/29',
			time: '17:30',
		});
	});

	it('round-trips through kickoffDate back to the same instant', () => {
		const iso = '2026-07-01T01:00:00Z';
		const parts = knockoutKickoff(iso);
		const back = kickoffDate(parts!.date, parts!.time);

		expect(back?.toISOString()).toBe('2026-07-01T01:00:00.000Z');
	});

	it('returns null for null or invalid input', () => {
		expect(knockoutKickoff(null)).toBeNull();
		expect(knockoutKickoff('nope')).toBeNull();
	});
});

describe('knockoutStatus', () => {
	const now = Date.parse('2026-06-29T12:00:00Z');

	it('is finished when both scores are present', () => {
		expect(knockoutStatus(m({scoreA: 2, scoreB: 1}), now)).toBe('finished');
	});

	it('is notstarted before kickoff with no score', () => {
		expect(knockoutStatus(m({date: '2026-06-29T20:30:00Z'}), now)).toBe(
			'notstarted'
		);
	});

	it('is live after kickoff with no score yet', () => {
		expect(knockoutStatus(m({date: '2026-06-29T10:00:00Z'}), now)).toBe(
			'live'
		);
	});
});

describe('isKnockoutPickable', () => {
	const now = Date.parse('2026-06-29T12:00:00Z');

	it('is pickable with both teams and a future kickoff', () => {
		expect(
			isKnockoutPickable(
				m({date: '2026-06-29T20:30:00Z', teamA: 'Spain', teamB: 'Japan'}),
				now
			)
		).toBe(true);
	});

	it('is not pickable without both teams', () => {
		expect(
			isKnockoutPickable(m({teamA: 'Spain', teamB: null}), now)
		).toBe(false);
	});

	it('is not pickable after kickoff', () => {
		expect(
			isKnockoutPickable(
				m({date: '2026-06-29T10:00:00Z', teamA: 'Spain', teamB: 'Japan'}),
				now
			)
		).toBe(false);
	});
});

describe('buildKnockoutCards', () => {
	const now = Date.parse('2026-06-29T12:00:00Z');

	it('maps matches to cards sorted by number, with placeholders when unknown', () => {
		const cards = buildKnockoutCards(
			[m({matchNumber: 75, stage: 'Round of 32'}), m({matchNumber: 73})],
			{},
			now
		);

		expect(cards.map((c) => c.matchNo)).toEqual([73, 75]);
		expect(cards[0].team1).toBe('2A');
		expect(cards[0].team2).toBe('2B');
		expect(cards[0].group).toBe('Round of 32');
		expect(cards[0].status).toBe('notstarted');
		expect(cards[0].entries).toEqual([]);
	});

	it('builds entries from picks, unscored until the result is in', () => {
		const picks: Record<number, KnockoutPick[]> = {
			73: [
				{name: 'Bruna', p1: 2, p2: 1},
				{name: 'Caio', p1: 1, p2: 1},
			],
		};

		const [card] = buildKnockoutCards(
			[m({matchNumber: 73, teamA: 'Spain', teamB: 'Japan'})],
			picks,
			now
		);

		expect(card.team1).toBe('Spain');
		expect(card.entries).toEqual([
			{name: 'Bruna', p1: 2, p2: 1, points: null},
			{name: 'Caio', p1: 1, p2: 1, points: null},
		]);
	});

	it('scores entries against the real result when finished', () => {
		const picks: Record<number, KnockoutPick[]> = {
			73: [
				{name: 'Bruna', p1: 2, p2: 1}, // exact
				{name: 'Caio', p1: 1, p2: 1}, // predicted draw, real win -> 0
			],
		};

		const [card] = buildKnockoutCards(
			[m({matchNumber: 73, scoreA: 2, scoreB: 1, teamA: 'S', teamB: 'J'})],
			picks,
			now
		);

		expect(card.status).toBe('finished');
		expect(card.r1).toBe(2);
		expect(card.r2).toBe(1);
		expect(card.entries[0].points).toBe(25);
		expect(card.entries[1].points).toBe(0);
	});
});
