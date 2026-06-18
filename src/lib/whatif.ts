import {
	findGameForPrediction,
	getMatchStatus,
	normalizeTeamName,
	realScoreFor,
} from './games';
import {buildLeaderboard} from './ranking';
import type {Game, Participant, Prediction} from './types';

export interface WhatIfMover {
	name: string;
	pointsDelta: number;
	rankAfter: number;
	rankBefore: number;
	totalAfter: number;
}

export interface WhatIfScenario {
	label: string;
	movers: WhatIfMover[];
	score: string;
}

export interface WhatIfContext {
	r1: number;
	r2: number;
	team1: string;
	team2: string;
}

function fixtureAndGame(
	participants: Participant[],
	games: Game[],
	matchNo: number
): {fixture: Prediction; game: Game} | null {
	let fixture: Prediction | undefined;

	for (const participant of participants) {
		fixture = participant.predictions.find(
			(prediction) => prediction.matchNo === matchNo
		);

		if (fixture) {
			break;
		}
	}

	if (!fixture) {
		return null;
	}

	const game = findGameForPrediction(fixture, games);

	return game ? {fixture, game} : null;
}

// The live fixture's teams and current score (team1 orientation), or null when
// the match isn't live or has no pool prediction.
export function liveWhatIfContext(
	participants: Participant[],
	games: Game[],
	matchNo: number
): WhatIfContext | null {
	const found = fixtureAndGame(participants, games, matchNo);

	if (!found || getMatchStatus(found.game) !== 'live') {
		return null;
	}

	const {r1, r2} = realScoreFor(found.fixture, found.game);

	return {r1, r2, team1: found.fixture.team1, team2: found.fixture.team2};
}

// Who moves (and how) if the match ended `team1 r1 – r2 team2`, measured
// against the current standings.
export function simulateWhatIf(
	participants: Participant[],
	games: Game[],
	matchNo: number,
	r1: number,
	r2: number
): WhatIfMover[] {
	const found = fixtureAndGame(participants, games, matchNo);

	if (!found) {
		return [];
	}

	const {fixture, game} = found;

	const team1IsHome =
		normalizeTeamName(fixture.team1) === normalizeTeamName(game.homeTeam);

	const simGame = team1IsHome
		? {...game, awayScore: r2, homeScore: r1}
		: {...game, awayScore: r1, homeScore: r2};

	const simGames = games.map((item) => (item === game ? simGame : item));

	const baseline = new Map(
		buildLeaderboard(participants, games).map((row) => [
			row.name,
			{rank: row.rank, total: row.total},
		])
	);

	return buildLeaderboard(participants, simGames)
		.map((row) => {
			const before = baseline.get(row.name);

			return {
				name: row.name,
				pointsDelta: row.total - (before?.total ?? 0),
				rankAfter: row.rank,
				rankBefore: before?.rank ?? row.rank,
				totalAfter: row.total,
			};
		})
		.sort(
			(a, b) =>
				Math.abs(b.pointsDelta) - Math.abs(a.pointsDelta) ||
				a.name.localeCompare(b.name)
		);
}

// The two "one more goal" scenarios (kept for any non-interactive use/tests).
export function buildWhatIf(
	participants: Participant[],
	games: Game[],
	matchNo: number
): WhatIfScenario[] {
	const ctx = liveWhatIfContext(participants, games, matchNo);

	if (!ctx) {
		return [];
	}

	return [
		{
			label: ctx.team1,
			movers: simulateWhatIf(
				participants,
				games,
				matchNo,
				ctx.r1 + 1,
				ctx.r2
			),
			score: `${ctx.r1 + 1}–${ctx.r2}`,
		},
		{
			label: ctx.team2,
			movers: simulateWhatIf(
				participants,
				games,
				matchNo,
				ctx.r1,
				ctx.r2 + 1
			),
			score: `${ctx.r1}–${ctx.r2 + 1}`,
		},
	];
}
