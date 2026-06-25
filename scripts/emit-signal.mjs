// Server-side push to an emitsignal channel hook, from the score-poller cron.
// Each match channel (match_kickoff, match_goals, match_finished) has its own
// hook URL. The API key (EMITSIGNAL_API_KEY) authenticates the call as a Bearer
// token AND gates it: no key → no-op, so only the configured server (the VM)
// signals, never a local checkout or CI. The event fields go at the top level
// of the JSON body.
export async function emitSignal(url, payload) {
	const apiKey = process.env.EMITSIGNAL_API_KEY;

	if (!url || !apiKey) {
		return false;
	}

	try {
		await fetch(url, {
			body: JSON.stringify({...payload, at: new Date().toISOString()}),
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			method: 'POST',
		});

		return true;
	}
	catch (error) {
		console.error(`emitSignal failed: ${error.message}`);

		return false;
	}
}
