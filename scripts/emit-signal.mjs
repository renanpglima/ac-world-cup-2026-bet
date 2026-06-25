// Server-side push to the emitsignal webhook, from the score-poller cron. The
// hook URL and API key live in the VM env (EMITSIGNAL_WEBHOOK_URL +
// EMITSIGNAL_API_KEY, kept out of the repo); no URL → no-op, so the poller only
// signals where it's configured. The event fields go at the top level of the
// JSON body, matching the in-app client; the API key authenticates the call as
// a Bearer token when present.
export async function emitSignal(payload) {
	const url = process.env.EMITSIGNAL_WEBHOOK_URL;

	if (!url) {
		return false;
	}

	const headers = {'Content-Type': 'application/json'};
	const apiKey = process.env.EMITSIGNAL_API_KEY;

	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	try {
		await fetch(url, {
			body: JSON.stringify({...payload, at: new Date().toISOString()}),
			headers,
			method: 'POST',
		});

		return true;
	}
	catch (error) {
		console.error(`emitSignal failed: ${error.message}`);

		return false;
	}
}
