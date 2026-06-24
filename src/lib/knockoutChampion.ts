import {buildEvolution, type Evolution} from './evolution';
import {type Award, buildGroupStageAwards} from './groupStageAwards';
import type {KnockoutRosterRow, KnockoutStandingRow} from './knockoutStandings';
import {buildMatchCards} from './matches';
import type {LeaderboardRow} from './ranking';
import {buildStats, type PoolStats} from './stats';
import {buildPointsTimeline, type TimelineFrame} from './timeline';
import type {Game, Participant, Prediction} from './types';
import type {KnockoutMatch} from './useKnockout';

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

export interface KnockoutChampion {
	awards: Award[];
	evolution: Evolution;
	played: number;
	stats: PoolStats;
	timeline: TimelineFrame[];
}

// A knockout match's ISO kickoff → the pool sheet's "MMM/D" + "HH:MM" in Brasília
// time (UTC-3, no DST), the format the shared kickoff/evolution helpers parse, so
// knockout games order and group on the timeline exactly like the group stage.
function sheetDateTime(iso: string | null): {date: string; time: string} {
	const ms = iso ? Date.parse(iso) : Number.NaN;

	if (Number.isNaN(ms)) {
		return {date: '', time: ''};
	}

	const br = new Date(ms - 3 * 60 * 60 * 1000);

	return {
		date: `${MONTHS[br.getUTCMonth()]}/${br.getUTCDate()}`,
		time: `${String(br.getUTCHours()).padStart(2, '0')}:${String(
			br.getUTCMinutes()
		).padStart(2, '0')}`,
	};
}

// The knockout wrap-up data — fun awards, the points timeline, the evolution
// chart, and the pool stats — all reusing the group-stage builders. We express
// the knockout (bracket games with resolved teams + each player's in-app picks)
// in the (Participant, Game) shape those builders consume. `played` (finished
// knockout matches) lets the view fall back to empty states before any game is
// decided.
export function buildKnockoutChampion(
	roster: KnockoutRosterRow[],
	picksByUid: Record<string, Record<number, {p1: number; p2: number}>>,
	matches: KnockoutMatch[],
	standings: KnockoutStandingRow[]
): KnockoutChampion {
	const resolved = matches.filter((match) => match.teamA && match.teamB);

	const games: Game[] = resolved.map((match) => {
		const finished = match.scoreA != null && match.scoreB != null;

		return {
			awayScore: match.scoreB ?? 0,
			awayTeam: match.teamB as string,
			finished,
			group: match.stage,
			homeScore: match.scoreA ?? 0,
			homeTeam: match.teamA as string,
			id: match.matchNumber,
			localDate: '',
			matchday: 0,
			timeElapsed: finished ? 'finished' : 'notstarted',
		};
	});

	const participants: Participant[] = roster.map((row) => {
		const picks = picksByUid[row.uid] ?? {};

		const predictions: Prediction[] = resolved
			.filter((match) => picks[match.matchNumber])
			.map((match) => {
				const {date, time} = sheetDateTime(match.date);
				const pick = picks[match.matchNumber];

				return {
					date,
					group: match.stage,
					matchNo: match.matchNumber,
					p1: pick.p1,
					p2: pick.p2,
					team1: match.teamA as string,
					team2: match.teamB as string,
					time,
				};
			});

		return {name: row.name, photoURL: row.photoURL ?? null, predictions};
	});

	const cards = buildMatchCards(participants, games);
	const stats = buildStats(cards);
	const timeline = buildPointsTimeline(participants, games);
	const evolution = buildEvolution(participants, games);

	const board: LeaderboardRow[] = standings.map((row) => ({
		exactCount: row.exact,
		livePoints: 0,
		name: row.name,
		photoURL: row.photoURL,
		rank: row.rank,
		total: row.points,
	}));

	return {
		awards: stats.matchesPlayed > 0 ? buildGroupStageAwards(timeline, board) : [],
		evolution,
		played: stats.matchesPlayed,
		stats,
		timeline,
	};
}
