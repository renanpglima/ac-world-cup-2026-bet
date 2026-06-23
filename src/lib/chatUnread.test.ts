import {describe, expect, it} from 'vitest';

import {countUnread, latestAt} from './chatUnread';

const msg = (at: number, name: string) => ({at, id: String(at), name, text: 'x'});

describe('countUnread', () => {
	const messages = [msg(10, 'Ana'), msg(20, 'me'), msg(30, '⚽ Match Bot')];

	it('counts messages after lastReadAt, excluding my own', () => {
		expect(countUnread(messages, 5, 'me')).toBe(2);
	});

	it('counts bot messages as unread', () => {
		expect(countUnread(messages, 20, 'me')).toBe(1);
	});

	it('is zero when caught up', () => {
		expect(countUnread(messages, 30, 'me')).toBe(0);
	});
});

describe('latestAt', () => {
	it('returns the max at, or 0 when empty', () => {
		expect(latestAt([msg(10, 'a'), msg(40, 'b')])).toBe(40);
		expect(latestAt([])).toBe(0);
	});
});
