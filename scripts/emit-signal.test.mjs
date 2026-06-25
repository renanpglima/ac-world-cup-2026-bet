import {afterEach, describe, expect, it, vi} from 'vitest';

import {emitSignal} from './emit-signal.mjs';

describe('emitSignal', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		delete process.env.EMITSIGNAL_WEBHOOK_URL;
		delete process.env.EMITSIGNAL_API_KEY;
	});

	it('no-ops when the webhook URL is not configured', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);
		delete process.env.EMITSIGNAL_WEBHOOK_URL;

		const sent = await emitSignal({event: 'match_goal'});

		expect(sent).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('posts the payload with a timestamp when configured', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ok: true});
		vi.stubGlobal('fetch', fetchMock);
		process.env.EMITSIGNAL_WEBHOOK_URL = 'https://hook.example/h/abc';

		const sent = await emitSignal({event: 'match_goal', home: 'France'});

		expect(sent).toBe(true);

		const [url, init] = fetchMock.mock.calls[0];

		expect(url).toBe('https://hook.example/h/abc');
		expect(init.method).toBe('POST');

		const body = JSON.parse(init.body);

		expect(body.event).toBe('match_goal');
		expect(body.home).toBe('France');
		expect(typeof body.at).toBe('string');
	});

	it('sends the API key as a Bearer token when configured', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ok: true});
		vi.stubGlobal('fetch', fetchMock);
		process.env.EMITSIGNAL_WEBHOOK_URL = 'https://hook.example/h/abc';
		process.env.EMITSIGNAL_API_KEY = 'es_secret';

		await emitSignal({event: 'match_goal'});

		const [, init] = fetchMock.mock.calls[0];

		expect(init.headers.Authorization).toBe('Bearer es_secret');
	});

	it('omits the Authorization header when no API key is set', async () => {
		const fetchMock = vi.fn().mockResolvedValue({ok: true});
		vi.stubGlobal('fetch', fetchMock);
		process.env.EMITSIGNAL_WEBHOOK_URL = 'https://hook.example/h/abc';

		await emitSignal({event: 'match_goal'});

		const [, init] = fetchMock.mock.calls[0];

		expect(init.headers.Authorization).toBeUndefined();
	});

	it('swallows fetch errors and reports failure', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
		process.env.EMITSIGNAL_WEBHOOK_URL = 'https://hook.example/h/abc';

		await expect(emitSignal({event: 'match_kickoff'})).resolves.toBe(false);
	});
});
