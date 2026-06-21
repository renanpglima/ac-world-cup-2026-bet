import {describe, expect, it} from 'vitest';

import {
	approvedParticipant,
	buildProfileUpdate,
	deriveUserRows,
	pendingClaims,
} from './profiles';

const profiles = {
	u1: {email: 'a@x.com', name: 'Ana', claim: 'adriano'},
	u2: {email: 'b@x.com', name: 'Bob', claim: 'caio'},
	u3: {email: 'c@x.com', name: 'Cid'},
};

const approvals = {
	u2: {participant: 'caio'},
	u3: {blocked: true},
};

describe('buildProfileUpdate', () => {
	it('maps a Google user with fallbacks', () => {
		expect(
			buildProfileUpdate(
				{displayName: null, email: 'x@y.com', photoURL: null},
				1234
			)
		).toEqual({
			email: 'x@y.com',
			lastSeenAt: 1234,
			name: 'x@y.com',
			photoURL: '',
		});
	});
});

describe('deriveUserRows', () => {
	const rows = deriveUserRows(profiles, approvals);

	it('flags an unapproved claim as pending', () => {
		expect(rows.find((r) => r.uid === 'u1')?.pending).toBe(true);
	});

	it('is not pending once the claim equals the approved participant', () => {
		expect(rows.find((r) => r.uid === 'u2')?.pending).toBe(false);
		expect(rows.find((r) => r.uid === 'u2')?.participant).toBe('caio');
	});

	it('never marks a blocked user pending', () => {
		expect(rows.find((r) => r.uid === 'u3')?.blocked).toBe(true);
		expect(rows.find((r) => r.uid === 'u3')?.pending).toBe(false);
	});

	it('sorts pending first', () => {
		expect(rows[0].uid).toBe('u1');
	});
});

describe('pendingClaims', () => {
	it('returns only pending rows', () => {
		const rows = deriveUserRows(profiles, approvals);

		expect(pendingClaims(rows).map((r) => r.uid)).toEqual(['u1']);
	});
});

describe('approvedParticipant', () => {
	it('returns the approved slug', () => {
		expect(approvedParticipant(approvals, 'u2')).toBe('caio');
	});

	it('returns null for blocked or unknown or null uid', () => {
		expect(approvedParticipant(approvals, 'u3')).toBeNull();
		expect(approvedParticipant(approvals, 'u1')).toBeNull();
		expect(approvedParticipant(approvals, null)).toBeNull();
	});
});
