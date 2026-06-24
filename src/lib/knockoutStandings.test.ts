import {describe, expect, it} from 'vitest';

import {participantSlug} from './auth';
import {
	buildKnockoutLeaderStats,
	buildKnockoutStandings,
	knockoutRoster,
	pendingKnockout,
} from './knockoutStandings';
import type {Approval, Profile} from './profiles';
import type {Participant} from './types';
import type {KnockoutMatch} from './useKnockout';

function profile(p: Partial<Profile>): Profile {
	return {email: 'x@y.com', name: 'X', ...p};
}

function match(p: Partial<KnockoutMatch>): KnockoutMatch {
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

const PARTICIPANTS: Participant[] = [
	{name: 'Adriano', predictions: []},
];

describe('knockoutRoster', () => {
	it('includes knockout-approved (nickname/name) and claim-approved (participant name), skips blocked', () => {
		const profiles: Record<string, Profile> = {
			u1: profile({name: 'New Guy', nickname: 'Newbie'}),
			u2: profile({name: 'Adriano G'}),
			u3: profile({name: 'Blocked One'}),
		};
		const approvals: Record<string, Approval> = {
			u1: {knockout: true},
			u2: {participant: participantSlug('Adriano')},
			u3: {blocked: true, knockout: true},
		};

		const roster = knockoutRoster(profiles, approvals, PARTICIPANTS);

		expect(roster).toEqual([
			{name: 'Adriano', uid: 'u2'},
			{name: 'Newbie', uid: 'u1'},
		]);
	});

	it('falls back to the Google name when there is no nickname', () => {
		const roster = knockoutRoster(
			{u1: profile({name: 'Plain Name'})},
			{u1: {knockout: true}},
			[]
		);

		expect(roster).toEqual([{name: 'Plain Name', uid: 'u1'}]);
	});
});

describe('pendingKnockout', () => {
	it('lists requests not yet approved, skipping approved and blocked', () => {
		const profiles: Record<string, Profile> = {
			u1: profile({name: 'Wants In', wantsKnockout: true}),
			u2: profile({name: 'Already', wantsKnockout: true}),
			u3: profile({name: 'Blocked', wantsKnockout: true}),
			u4: profile({name: 'Quiet'}),
		};
		const approvals: Record<string, Approval> = {
			u2: {knockout: true},
			u3: {blocked: true},
		};

		expect(pendingKnockout(profiles, approvals)).toEqual([
			{email: 'x@y.com', name: 'Wants In', uid: 'u1'},
		]);
	});
});

describe('buildKnockoutStandings', () => {
	const roster = [
		{name: 'Bruna', uid: 'b'},
		{name: 'Caio', uid: 'c'},
		{name: 'Quiet', uid: 'q'},
	];

	const matches = [
		match({matchNumber: 76, scoreA: 2, scoreB: 1}), // finished
		match({matchNumber: 73, scoreA: null, scoreB: null}), // not finished
	];

	const picksByUid = {
		b: {73: {p1: 1, p2: 0}, 76: {p1: 2, p2: 1}}, // 76 exact (25); 73 not scored
		c: {76: {p1: 0, p2: 0}}, // predicted draw, real win -> 0
	};

	it('sums only finished matches, sorts by points then exact then name, ranks ties', () => {
		const rows = buildKnockoutStandings(roster, picksByUid, matches);

		expect(rows.map((r) => [r.uid, r.points, r.exact, r.played, r.rank])).toEqual([
			['b', 25, 1, 1, 1],
			['c', 0, 0, 1, 2],
			['q', 0, 0, 0, 2],
		]);
	});

	it('zeroes everyone when nothing is finished', () => {
		const rows = buildKnockoutStandings(roster, picksByUid, [
			match({matchNumber: 73}),
		]);

		expect(rows.every((r) => r.points === 0 && r.rank === 1)).toBe(true);
	});
});

describe('buildKnockoutLeaderStats', () => {
	it('returns null when there are no standings', () => {
		expect(buildKnockoutLeaderStats([], {}, [])).toBeNull();
	});

	it('returns null when the leader has 1 point or fewer', () => {
		const standings = buildKnockoutStandings(
			[{name: 'Solo', uid: 's'}],
			{},
			[]
		);

		expect(buildKnockoutLeaderStats(standings, {}, [])).toBeNull();
	});

	it('returns null when the top is tied', () => {
		const matches = [match({matchNumber: 76, scoreA: 2, scoreB: 1})];
		const standings = buildKnockoutStandings(
			[
				{name: 'Bruna', uid: 'b'},
				{name: 'Caio', uid: 'c'},
			],
			{b: {76: {p1: 2, p2: 1}}, c: {76: {p1: 2, p2: 1}}},
			matches
		);

		expect(buildKnockoutLeaderStats(standings, {}, matches)).toBeNull();
	});

	it('builds the leader card stats from the leader picks over finished matches', () => {
		const standings = buildKnockoutStandings(
			[
				{name: 'Bruna', uid: 'b'},
				{name: 'Caio', uid: 'c'},
			],
			{b: {76: {p1: 2, p2: 1}}, c: {76: {p1: 0, p2: 0}}},
			[match({matchNumber: 76, scoreA: 2, scoreB: 1})]
		);

		const leader = buildKnockoutLeaderStats(
			standings,
			{b: {76: {p1: 2, p2: 1}}},
			[match({matchNumber: 76, scoreA: 2, scoreB: 1})]
		);

		expect(leader?.name).toBe('Bruna');
		expect(leader?.stats.total).toBe(25);
		expect(leader?.stats.tierCounts).toEqual([1, 0, 0, 0, 0, 0]);
		expect(leader?.stats.hitRate).toBe(1);
		expect(leader?.stats.streak).toBe(1);
		expect(leader?.stats.leadOverNext).toBe(25);
		expect(leader?.stats.finishedCount).toBe(1);
	});
});
