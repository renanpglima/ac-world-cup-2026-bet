import {realScoreFor} from './games';
import {kickoffDate} from './kickoff';
import {buildMatchCards} from './matches';
import {buildLeaderboardWithMovement, scoreParticipant} from './ranking';
import {buildPointsTimeline} from './timeline';
import type {Game, Participant} from './types';

// The six scoring tiers, highest first, each with a color for the breakdown.
export const SCORE_TIERS = [
	{color: '#34d399', label: 'Exact', points: 25},
	{color: '#2dd4bf', label: 'Winner + goals', points: 18},
	{color: '#38bdf8', label: 'Winner + diff', points: 15},
	{color: '#a78bfa', label: 'Right draw', points: 12},
	{color: '#fbbf24', label: 'Winner', points: 10},
	{color: '#64748b', label: 'Miss', points: 0},
];

export interface ParticipantStats {
	avgGoals: number | null;
	avgPerMatch: number | null;
	bestRound: {label: string; points: number} | null;
	contrarianRate: number | null;
	favoriteScoreline: string | null;
	finishedCount: number;
	gapToLeader: number;
	hitRate: number | null;
	hits: number;
	leadOverNext: number | null;
	movement: number;
	rank: number;
	rankHistory: number[];
	streak: number;
	tierCounts: number[];
	total: number;
	uniquePicks: number;
}

export function buildParticipantStats(
	participant: Participant,
	participants: Participant[],
	games: Game[]
): ParticipantStats {
	const {scored, total} = scoreParticipant(participant, games);

	const finished = scored.filter((item) => item.status === 'finished');
	const finishedCount = finished.length;
	const finishedPoints = finished.reduce(
		(sum, item) => sum + (item.points ?? 0),
		0
	);

	// Hit rate: finished matches where the winner was called (10+ points).
	const hits = finished.filter((item) => (item.points ?? 0) >= 10).length;

	const tierCounts = SCORE_TIERS.map(
		(tier) =>
			finished.filter((item) => (item.points ?? 0) === tier.points).length
	);

	let bestRound: ParticipantStats['bestRound'] = null;

	for (const item of finished) {
		const points = item.points ?? 0;

		if (item.game && points > 0 && (!bestRound || points > bestRound.points)) {
			const {r1, r2} = realScoreFor(item.prediction, item.game);

			bestRound = {
				label: `${item.prediction.team1} ${r1}–${r2} ${item.prediction.team2}`,
				points,
			};
		}
	}

	// Current streak: trailing run of finished matches that scored, newest last.
	const chronological = [...finished].sort(
		(a, b) =>
			(kickoffDate(a.prediction.date, a.prediction.time)?.getTime() ?? 0) -
			(kickoffDate(b.prediction.date, b.prediction.time)?.getTime() ?? 0)
	);

	let streak = 0;

	for (let i = chronological.length - 1; i >= 0; i--) {
		if ((chronological[i].points ?? 0) > 0) {
			streak++;
		}
		else {
			break;
		}
	}

	const totalGoals = participant.predictions.reduce(
		(sum, prediction) => sum + prediction.p1 + prediction.p2,
		0
	);
	const avgGoals = participant.predictions.length
		? totalGoals / participant.predictions.length
		: null;

	// Favorite scoreline shape, orientation-agnostic (a 2–1 win and a 1–2 win
	// both count as "2–1").
	const scorelineCount = new Map<string, number>();

	for (const prediction of participant.predictions) {
		const key = `${Math.max(prediction.p1, prediction.p2)}–${Math.min(
			prediction.p1,
			prediction.p2
		)}`;

		scorelineCount.set(key, (scorelineCount.get(key) ?? 0) + 1);
	}

	let favoriteScoreline: string | null = null;
	let favoriteCount = 0;

	for (const [key, count] of scorelineCount) {
		if (count > favoriteCount) {
			favoriteCount = count;
			favoriteScoreline = key;
		}
	}

	const board = buildLeaderboardWithMovement(participants, games);
	const myIndex = board.findIndex((row) => row.name === participant.name);
	const myRow = myIndex >= 0 ? board[myIndex] : undefined;
	const next = myIndex >= 0 ? board[myIndex + 1] : undefined;

	const rank = myRow?.rank ?? board.length;
	const movement = myRow?.movement ?? 0;
	const gapToLeader = Math.max(0, (board[0]?.total ?? 0) - total);
	const leadOverNext = next ? total - next.total : null;

	// Contrarian index: matches where nobody else made the same (oriented) call.
	const cards = buildMatchCards(participants, games);

	let considered = 0;
	let uniquePicks = 0;

	for (const card of cards) {
		const mine = card.entries.find((entry) => entry.name === participant.name);

		if (!mine) {
			continue;
		}

		considered++;

		const same = card.entries.filter(
			(entry) => entry.p1 === mine.p1 && entry.p2 === mine.p2
		).length;

		if (same === 1) {
			uniquePicks++;
		}
	}

	const rankHistory = buildPointsTimeline(participants, games)
		.map(
			(frame) =>
				frame.standings.find((row) => row.name === participant.name)?.rank
		)
		.filter((value): value is number => value !== undefined);

	return {
		avgGoals,
		avgPerMatch: finishedCount ? finishedPoints / finishedCount : null,
		bestRound,
		contrarianRate: considered ? uniquePicks / considered : null,
		favoriteScoreline,
		finishedCount,
		gapToLeader,
		hitRate: finishedCount ? hits / finishedCount : null,
		hits,
		leadOverNext,
		movement,
		rank,
		rankHistory,
		streak,
		tierCounts,
		total,
		uniquePicks,
	};
}
