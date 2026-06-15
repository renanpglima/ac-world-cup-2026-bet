import {buildMatchCards} from './matches';
import {buildParticipantStats} from './participantStats';
import type {ParticipantStats} from './participantStats';
import {buildPointsTimeline} from './timeline';
import type {Game, Participant} from './types';

export interface H2HMatch {
	aPoints: number;
	bPoints: number;
	label: string;
	matchNo: number;
	winner: 'a' | 'b' | 'tie';
}

export interface HeadToHead {
	a: ParticipantStats;
	aPoints: number[];
	b: ParticipantStats;
	bPoints: number[];
	matches: H2HMatch[];
	ties: number;
	winsA: number;
	winsB: number;
}

// Pits two players against each other: their full stat lines, a per-match duel
// over every finished game they both predicted (who scored more), the running
// tally, and each one's cumulative-points curve for the race chart.
export function buildHeadToHead(
	aName: string,
	bName: string,
	participants: Participant[],
	games: Game[]
): HeadToHead {
	const aPlayer = participants.find((player) => player.name === aName);
	const bPlayer = participants.find((player) => player.name === bName);

	const a = buildParticipantStats(aPlayer ?? participants[0], participants, games);
	const b = buildParticipantStats(bPlayer ?? participants[0], participants, games);

	const cards = buildMatchCards(participants, games);

	const matches: H2HMatch[] = [];
	let winsA = 0;
	let winsB = 0;
	let ties = 0;

	for (const card of cards) {
		if (card.status !== 'finished') {
			continue;
		}

		const aEntry = card.entries.find((entry) => entry.name === aName);
		const bEntry = card.entries.find((entry) => entry.name === bName);

		if (!aEntry || !bEntry) {
			continue;
		}

		const aPoints = aEntry.points ?? 0;
		const bPoints = bEntry.points ?? 0;
		const winner = aPoints > bPoints ? 'a' : bPoints > aPoints ? 'b' : 'tie';

		if (winner === 'a') {
			winsA++;
		}
		else if (winner === 'b') {
			winsB++;
		}
		else {
			ties++;
		}

		matches.push({
			aPoints,
			bPoints,
			label: `${card.team1} ${card.r1}–${card.r2} ${card.team2}`,
			matchNo: card.matchNo,
			winner,
		});
	}

	matches.reverse();

	const frames = buildPointsTimeline(participants, games);
	const aPointsHistory = frames.map(
		(frame) =>
			frame.standings.find((row) => row.name === aName)?.total ?? 0
	);
	const bPointsHistory = frames.map(
		(frame) =>
			frame.standings.find((row) => row.name === bName)?.total ?? 0
	);

	return {
		a,
		aPoints: aPointsHistory,
		b,
		bPoints: bPointsHistory,
		matches,
		ties,
		winsA,
		winsB,
	};
}
