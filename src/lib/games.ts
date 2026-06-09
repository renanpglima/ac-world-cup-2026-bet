import type {Game, GamesFile, MatchStatus, Prediction} from './types';

export function getMatchStatus(game: Game): MatchStatus {
	if (game.finished || game.timeElapsed === 'finished') {
		return 'finished';
	}

	if (game.timeElapsed === 'notstarted') {
		return 'notstarted';
	}

	return 'live';
}

export function normalizeTeamName(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function teamsMatch(prediction: Prediction, game: Game): boolean {
	const away = normalizeTeamName(game.awayTeam);
	const home = normalizeTeamName(game.homeTeam);
	const team1 = normalizeTeamName(prediction.team1);
	const team2 = normalizeTeamName(prediction.team2);

	return (
		(team1 === home && team2 === away) || (team1 === away && team2 === home)
	);
}

export function findGameForPrediction(
	prediction: Prediction,
	games: Game[]
): Game | undefined {
	const byId = games.find((game) => game.id === prediction.matchNo);

	if (byId && teamsMatch(prediction, byId)) {
		return byId;
	}

	const byTeams = games.find((game) => teamsMatch(prediction, game));

	if (byId && !byTeams) {
		console.warn(
			`Match #${prediction.matchNo} (${prediction.team1} x ${prediction.team2}): id join mismatched and no team fallback found`
		);
	}

	return byTeams;
}

export function realScoreFor(
	prediction: Prediction,
	game: Game
): {r1: number; r2: number} {
	const flipped =
		normalizeTeamName(prediction.team1) === normalizeTeamName(game.awayTeam);

	return flipped
		? {r1: game.awayScore, r2: game.homeScore}
		: {r1: game.homeScore, r2: game.awayScore};
}

const DEFAULT_GAMES_URL = `${import.meta.env.BASE_URL}games.json`;

export async function fetchGames(
	url: string = import.meta.env.VITE_GAMES_URL || DEFAULT_GAMES_URL
): Promise<GamesFile | null> {
	try {
		const response = await fetch(`${url}?t=${Date.now()}`);

		if (!response.ok) {
			return null;
		}

		return (await response.json()) as GamesFile;
	}
	catch {
		return null;
	}
}
