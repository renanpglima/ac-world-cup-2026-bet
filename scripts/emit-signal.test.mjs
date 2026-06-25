import {afterEach, describe, expect, it, vi} from 'vitest';

import {emitSignal} from './emit-signal.mjs';

const URL = 'https://api.emitsignal.com/h/gh_abc';

describe('emitSignal', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.EMITSIGNAL_API_KEY;
	});

	it('no-ops when no URL is given', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		process.env.EMITSIGNAL_API_KEY = 'es_secret';

		const sent = await emitSignal(undefined, {event: 'match_goal'});

		expect(sent).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('no-ops when the API key is not set (gated to the server)', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		delete process.env.EMITSIGNAL_API_KEY;

		const sent = await emitSignal(URL, {event: 'match_goal'});

		expect(sent).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('posts to the URL with the Bearer token and a timestamp', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ok: true});
		vi.stubGlobal('fetch', fetchMock);
		process.env.EMITSIGNAL_API_KEY = 'es_secret';

		const sent = await emitSignal(URL, {event: 'match_goal', home: 'France'});

		expect(sent).toBe(true);

		const [url, init] = fetchMock.mock.calls[0];

		expect(url).toBe(URL);
		expect(init.method).toBe('POST');
		expect(init.headers.Authorization).toBe('Bearer es_secret');

		const body = JSON.parse(init.body);

		expect(body.event).toBe('match_goal');
		expect(body.home).toBe('France');
		expect(typeof body.at).toBe('string');
	});

	it('swallows fetch errors and reports failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
		process.env.EMITSIGNAL_API_KEY = 'es_secret';

		await expect(emitSignal(URL, {event: 'match_kickoff'})).resolves.toBe(
			false
		);
	});
});
