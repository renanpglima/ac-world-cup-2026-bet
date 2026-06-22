const FIFA_CALENDAR_URL =
	'https://api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023&language=en&count=500';

// FIFA MatchStatus: 0 = finished; 1 = scheduled, 4/5 = postponed/abandoned
// (these never score points). Every other value is a match in play — 3 = live,
// 11 = half-time, plus the extra-time/penalty codes — so anything that is not
// finished or a not-started state counts as live. (The old code matched only 3,
// so a match at half-time dropped off the live bar despite being in progress.)
function statusFields(match) {
	if (match.MatchStatus === 0) {
		return {finished: true, timeElapsed: 'finished'};
	}

	if (
		match.MatchStatus === 1 ||
		match.MatchStatus === 4 ||
		match.MatchStatus === 5
	) {
		return {finished: false, timeElapsed: 'notstarted'};
	}

	if (match.MatchStatus === 11) {
		return {finished: false, timeElapsed: 'HT'};
	}

	const minutes = String(match.MatchTime ?? '').match(/\d+/)?.[0];

	return {finished: false, timeElapsed: minutes ?? 'live'};
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
