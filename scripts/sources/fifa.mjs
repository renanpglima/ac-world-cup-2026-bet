const FIFA_CALENDAR_URL =
	'https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=500';

// FIFA MatchStatus: 0 = finished, 3 = live; anything else is treated as not
// started (1 = scheduled; 4/5 postponed or abandoned never score points).
function statusFields(match) {
	if (match.MatchStatus === 0) {
		return {finished: true, timeElapsed: 'finished'};
	}

	if (match.MatchStatus === 3) {
		const minutes = String(match.MatchTime ?? '').match(/\d+/)?.[0];

		return {finished: false, timeElapsed: minutes ?? '1'};
	}

	return {finished: false, timeElapsed: 'notstarted'};
}

function localized(entries) {
	return entries?.[0]?.Description ?? '';
}

export function normalizeFifaGames(rawMatches) {
	return rawMatches
		.filter((match) => {
			const stage = localized(match.StageName).toLowerCase();

			return (
				/first stage|group/.test(stage) &&
				localized(match.Home?.TeamName) &&
				localized(match.Away?.TeamName)
			);
		})
		.map((match, index) => ({
			awayScore: Number(match.Away.Score ?? 0),
			awayTeam: localized(match.Away.TeamName),
			...statusFields(match),
			group: localized(match.GroupName),
			homeScore: Number(match.Home.Score ?? 0),
			homeTeam: localized(match.Home.TeamName),
			id: Number(match.IdMatch),
			localDate: match.Date,
			matchday: index + 1,
		}));
}

export async function fetchFifaGames() {
	const response = await fetch(FIFA_CALENDAR_URL, {
		headers: {'User-Agent': 'Mozilla/5.0 (ac-world-cup-2026-bet pool app)'},
	});

	if (!response.ok) {
		throw new Error(`FIFA API: HTTP ${response.status}`);
	}

	const payload = await response.json();

	if (!Array.isArray(payload.Results)) {
		throw new Error('FIFA API: missing Results array');
	}

	return normalizeFifaGames(payload.Results);
}
