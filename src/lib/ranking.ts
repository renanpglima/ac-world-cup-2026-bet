import {findGameForPrediction, getMatchStatus, realScoreFor} from './games';
import {POINTS, scorePrediction} from './scoring';
import type {
	Game,
	MatchStatus,
	Participant,
	Prediction,
} from './types';

export interface ScoredPrediction {
	game?: Game;
	points: number | null;
	prediction: Prediction;
	status: MatchStatus;
}

export interface ParticipantScore {
	exactCount: number;
	participant: Participant;
	scored: ScoredPrediction[];
	total: number;
}

export function scoreParticipant(
	participant: Participant,
	games: Game[]
): ParticipantScore {
	const scored: ScoredPrediction[] = participant.predictions.map(
		(prediction) => {
			const game = findGameForPrediction(prediction, games);

			if (!game) {
				return {points: null, prediction, status: 'notstarted'};
			}

			const status = getMatchStatus(game);

			if (status === 'notstarted') {
				return {game, points: null, prediction, status};
			}

			const {r1, r2} = realScoreFor(prediction, game);

			return {
				game,
				points: scorePrediction(prediction.p1, prediction.p2, r1, r2),
				prediction,
				status,
			};
		}
	);

	return {
		exactCount: scored.filter(
			(item) => item.points === POINTS.EXACT_SCORE
		).length,
		participant,
		scored,
		total: scored.reduce((sum, item) => sum + (item.points ?? 0), 0),
	};
}

export interface LeaderboardRow {
	exactCount: number;
	livePoints: number;
	movement?: number;
	name: string;
	rank: number;
	total: number;
}

export function buildLeaderboard(
	participants: Participant[],
	games: Game[]
): LeaderboardRow[] {
	const scores = participants
		.map((participant) => scoreParticipant(participant, games))
		.sort(
			(a, b) =>
				b.total - a.total ||
				a.participant.name.localeCompare(b.participant.name)
		);

	let lastRank = 0;
	let lastTotal = Number.NaN;

	return scores.map((score, index) => {
		const rank = score.total === lastTotal ? lastRank : index + 1;

		lastRank = rank;
		lastTotal = score.total;

		return {
			exactCount: score.exactCount,
			livePoints: score.scored
				.filter((item) => item.status === 'live')
				.reduce((sum, item) => sum + (item.points ?? 0), 0),
			name: score.participant.name,
			rank,
			total: score.total,
		};
	});
}

export function buildLeaderboardWithMovement(
	participants: Participant[],
	games: Game[]
): LeaderboardRow[] {
	const current = buildLeaderboard(participants, games);

	const finishedTimes = games
		.filter((game) => getMatchStatus(game) === 'finished')
		.map((game) => new Date(game.localDate).getTime() || 0);

	if (finishedTimes.length === 0) {
		return current.map((row) => ({...row, movement: 0}));
	}

	const lastTime = Math.max(...finishedTimes);

	const masked = games.map((game) =>
		getMatchStatus(game) === 'finished' &&
		(new Date(game.localDate).getTime() || 0) === lastTime
			? {
					...game,
					awayScore: 0,
					finished: false,
					homeScore: 0,
					timeElapsed: 'notstarted',
				}
			: game
	);

	const previousRanks = new Map(
		buildLeaderboard(participants, masked).map((row) => [
			row.name,
			row.rank,
		])
	);

	return current.map((row) => ({
		...row,
		movement: (previousRanks.get(row.name) ?? row.rank) - row.rank,
	}));
}
