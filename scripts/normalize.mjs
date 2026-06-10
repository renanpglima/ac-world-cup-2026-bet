// Knockout rows (type r32/r16/qf/sf/third/final) have no team names until
// the bracket is decided, and the knockout stage is out of scope anyway, so
// only group-stage games make it into games.json.

export function normalizeGames(rawGames) {
	return rawGames.filter((game) => game.type === 'group').map((game) => ({
		awayScore: Number(game.away_score),
		awayTeam: game.away_team_name_en,
		finished: String(game.finished).toUpperCase() === 'TRUE',
		group: game.group,
		homeScore: Number(game.home_score),
		homeTeam: game.home_team_name_en,
		id: Number(game.id),
		localDate: game.local_date,
		matchday: Number(game.matchday),
		timeElapsed: game.time_elapsed,
	}));
}
