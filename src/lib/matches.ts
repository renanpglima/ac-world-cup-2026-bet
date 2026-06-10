import {
	findGameForPrediction,
	getMatchStatus,
	normalizeTeamName,
	realScoreFor,
} from './games';
import {scorePrediction} from './scoring';
import type {Game, MatchStatus, Participant, Prediction} from './types';

export interface MatchEntry {
	name: string;
	p1: number;
	p2: number;
	points: number | null;
}

export interface MatchCard {
	date: string;
	entries: MatchEntry[];
	group: string;
	matchNo: number;
	r1?: number;
	r2?: number;
	status: MatchStatus;
	team1: string;
	team2: string;
	time: string;
	timeElapsed?: string;
}

export function buildMatchCards(
	participants: Participant[],
	games: Game[]
): MatchCard[] {
	const fixtures = new Map<number, Prediction>();

	for (const participant of participants) {
		for (const prediction of participant.predictions) {
			if (!fixtures.has(prediction.matchNo)) {
				fixtures.set(prediction.matchNo, prediction);
			}
		}
	}

	return [...fixtures.values()]
		.sort((a, b) => a.matchNo - b.matchNo)
		.map((fixture) => {
			const game = findGameForPrediction(fixture, games);

			const status: MatchStatus = game
				? getMatchStatus(game)
				: 'notstarted';

			const real =
				game && status !== 'notstarted'
					? realScoreFor(fixture, game)
					: undefined;

			const entries = participants
				.map((participant) => {
					const prediction = participant.predictions.find(
						(item) => item.matchNo === fixture.matchNo
					);

					if (!prediction) {
						return null;
					}

					const flipped =
						normalizeTeamName(prediction.team1) !==
						normalizeTeamName(fixture.team1);

					const p1 = flipped ? prediction.p2 : prediction.p1;
					const p2 = flipped ? prediction.p1 : prediction.p2;

					return {
						name: participant.name,
						p1,
						p2,
						points: real
							? scorePrediction(p1, p2, real.r1, real.r2)
							: null,
					};
				})
				.filter((entry): entry is MatchEntry => entry !== null)
				.sort(
					(a, b) =>
						(b.points ?? -1) - (a.points ?? -1) ||
						a.name.localeCompare(b.name)
				);

			return {
				date: fixture.date,
				entries,
				group: fixture.group,
				matchNo: fixture.matchNo,
				r1: real?.r1,
				r2: real?.r2,
				status,
				team1: fixture.team1,
				team2: fixture.team2,
				time: fixture.time,
				timeElapsed: game?.timeElapsed,
			};
		});
}
