// Group stage runs Jun 11-27 2026 (BRT); the date-bounded request is what
// keeps knockout games out of this source.
const ESPN_SCOREBOARD_URL =
	'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260628&limit=200';

function statusFields(event) {
	const state = event.status?.type?.state;

	if (state === 'post') {
		return {finished: true, timeElapsed: 'finished'};
	}

	if (state === 'in') {
		const minutes = String(event.status?.displayClock ?? '').match(
			/\d+/
		)?.[0];

		return {finished: false, timeElapsed: minutes ?? '1'};
	}

	return {finished: false, timeElapsed: 'notstarted'};
}

export function normalizeEspnEvents(rawEvents) {
	return rawEvents
		.map((event, index) => {
			const competitors = event.competitions?.[0]?.competitors ?? [];
			const away = competitors.find(
				(competitor) => competitor.homeAway === 'away'
			);
			const home = competitors.find(
				(competitor) => competitor.homeAway === 'home'
			);

			if (!home?.team?.displayName || !away?.team?.displayName) {
				return null;
			}

			return {
				awayScore: Number(away.score ?? 0),
				awayTeam: away.team.displayName,
				...statusFields(event),
				group: '',
				homeScore: Number(home.score ?? 0),
				homeTeam: home.team.displayName,
				id: Number(event.id),
				localDate: event.date,
				matchday: index + 1,
			};
		})
		.filter((game) => game !== null);
}

export async function fetchEspnGames() {
	const response = await fetch(ESPN_SCOREBOARD_URL, {
		headers: {'User-Agent': 'Mozilla/5.0 (ac-world-cup-2026-bet pool app)'},
	});

	if (!response.ok) {
		throw new Error(`ESPN API: HTTP ${response.status}`);
	}

	const payload = await response.json();

	if (!Array.isArray(payload.events)) {
		throw new Error('ESPN API: missing events array');
	}

	return normalizeEspnEvents(payload.events);
}
