import {describe, expect, it} from 'vitest';

import {buildKnockoutChampion} from './knockoutChampion';
import {buildKnockoutStandings, type KnockoutRosterRow} from './knockoutStandings';
import type {KnockoutMatch} from './useKnockout';

function match(over: Partial<KnockoutMatch>): KnockoutMatch {
	return {
		a: '1A',
		b: '2B',
		date: '2026-06-28T19:00:00Z',
		matchNumber: 73,
		scoreA: null,
		scoreB: null,
		stage: 'Round of 32',
		teamA: 'Brazil',
		teamB: 'Chile',
		...over,
	};
}

const ROSTER: KnockoutRosterRow[] = [
	{name: 'A', uid: 'a'},
	{name: 'B', uid: 'b'},
];

describe('buildKnockoutChampion', () => {
	it('falls back to empty data before any knockout game is decided', () => {
		const matches = [match({scoreA: null, scoreB: null})];
		const picks = {a: {73: {p1: 2, p2: 1}}};
		const standings = buildKnockoutStandings(ROSTER, picks, matches);

		const champion = buildKnockoutChampion(ROSTER, picks, matches, standings);

		expect(champion.played).toBe(0);
		expect(champion.awards).toEqual([]);
		expect(champion.timeline).toEqual([]);
		expect(champion.evolution.days).toEqual([]);
		expect(champion.stats.matchesPlayed).toBe(0);
	});

	it('builds awards and stats from the finished knockout matches', () => {
		const matches = [match({scoreA: 2, scoreB: 1})];
		const picks = {
			a: {73: {p1: 2, p2: 1}},
			b: {73: {p1: 0, p2: 0}},
		};
		const standings = buildKnockoutStandings(ROSTER, picks, matches);

		const champion = buildKnockoutChampion(ROSTER, picks, matches, standings);

		expect(champion.played).toBe(1);
		expect(champion.timeline).toHaveLength(1);
		expect(champion.stats.matchesPlayed).toBe(1);
		expect(champion.stats.totalPoints).toBe(25);
		expect(champion.stats.exactScoresTotal).toBe(1);

		const byLabel = Object.fromEntries(
			champion.awards.map((award) => [
				award.label,
				{name: award.name, value: award.value},
			])
		);

		expect(champion.awards).toHaveLength(6);
		expect(byLabel['Sharpest eye']).toEqual({name: 'A', value: '1 exact'});
		expect(byLabel['Biggest haul']).toEqual({name: 'A', value: '25 pts'});
		expect(byLabel['Most time on top']).toEqual({
			name: 'A',
			value: '1 match',
		});
		expect(byLabel['Wooden spoon']).toEqual({name: 'B', value: '0 pts'});
	});
});
