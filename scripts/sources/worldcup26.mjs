import {normalizeGames} from '../normalize.mjs';

export async function fetchWorldcup26Games() {
	const baseUrl = process.env.API_URL || 'https://worldcup26.ir';
	const response = await fetch(`${baseUrl}/get/games`);

	if (!response.ok) {
		throw new Error(`worldcup26 API: HTTP ${response.status}`);
	}

	const payload = await response.json();

	if (!Array.isArray(payload.games)) {
		throw new Error('worldcup26 API: missing games array');
	}

	return normalizeGames(payload.games);
}
