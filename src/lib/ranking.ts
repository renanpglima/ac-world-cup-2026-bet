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
			name: score.participant.name,
			rank,
			total: score.total,
		};
	});
}
