import {describe, expect, it} from 'vitest';

import {isOwner, OWNER_EMAIL, participantSlug} from './auth';

describe('isOwner', () => {
	it('is true only for the verified owner email', () => {
		expect(isOwner(OWNER_EMAIL, true)).toBe(true);
	});

	it('is false when the email is not verified', () => {
		expect(isOwner(OWNER_EMAIL, false)).toBe(false);
	});

	it('is false for any other email', () => {
		expect(isOwner('someone@gmail.com', true)).toBe(false);
	});

	it('is false for null/undefined', () => {
		expect(isOwner(null, true)).toBe(false);
		expect(isOwner(undefined, undefined)).toBe(false);
	});

	it('matches case-insensitively', () => {
		expect(isOwner(OWNER_EMAIL.toUpperCase(), true)).toBe(true);
	});
});

describe('participantSlug', () => {
	it('lowercases and trims', () => {
		expect(participantSlug('  Adriano ')).toBe('adriano');
	});
});
