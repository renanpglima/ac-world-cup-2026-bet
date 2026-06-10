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

// The pool's sheet uses FIFA team names while the API uses different English
// names; map the normalized FIFA spelling to the API's vocabulary so both
// sides canonicalize to the same token.

const TEAM_ALIASES: Record<string, string> = {
	caboverde: 'capeverde',
	congodr: 'democraticrepublicofthecongo',
	cotedivoire: 'ivorycoast',
	czechia: 'czechrepublic',
	iriran: 'iran',
	korearepublic: 'southkorea',
	turkiye: 'turkey',
	usa: 'unitedstates',
};

export function normalizeTeamName(name: string): string {
	const normalized = (name ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

	return TEAM_ALIASES[normalized] ?? normalized;
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

const MONTHS: Record<string, number> = {
	apr: 4,
	aug: 8,
	dec: 12,
	feb: 2,
	jan: 1,
	jul: 7,
	jun: 6,
	mar: 3,
	may: 5,
	nov: 11,
	oct: 10,
	sep: 9,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function datesMatch(prediction: Prediction, game: Game): boolean {
	const predictionParts = prediction.date.match(/^([A-Za-z]+)\/(\d+)$/);
	const gameParts = game.localDate.match(/^(\d+)\/(\d+)\/(\d+)/);

	if (!predictionParts || !gameParts) {
		return false;
	}

	const month = MONTHS[predictionParts[1].toLowerCase().slice(0, 3)];

	if (!month) {
		return false;
	}

	const year = Number(gameParts[3]);
	const gameTime = Date.UTC(
		year,
		Number(gameParts[1]) - 1,
		Number(gameParts[2])
	);
	const predictionTime = Date.UTC(year, month - 1, Number(predictionParts[2]));

	// The sheet's dates and the API's local dates sit in different timezones,
	// so late-evening games land on the next calendar day in the sheet; allow
	// a one-day skew.

	return Math.abs(predictionTime - gameTime) <= DAY_MS;
}

export function findGameForPrediction(
	prediction: Prediction,
	games: Game[]
): Game | undefined {
	const byId = games.find((game) => game.id === prediction.matchNo);

	if (byId && teamsMatch(prediction, byId)) {
		return byId;
	}

	const byTeams =
		games.find(
			(game) => teamsMatch(prediction, game) && datesMatch(prediction, game)
		) ?? games.find((game) => teamsMatch(prediction, game));

	if (byTeams) {
		console.warn(
			`Match #${prediction.matchNo} (${prediction.team1} x ${prediction.team2}): id join mismatched; matched game ${byTeams.id} by team names`
		);
	}
	else {
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
