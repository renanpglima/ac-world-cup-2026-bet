import type {MatchCard, MatchEntry} from './matches';
import {scorePrediction} from './scoring';
import type {MatchStatus} from './types';
import type {KnockoutMatch} from './useKnockout';

export interface KnockoutPick {
	at?: number;
	name: string;
	p1: number;
	p2: number;
	photoURL?: string | null;
	uid?: string;
}

const MONTHS_ABBR = [
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

// The knockout `date` is ISO; the rest of the app keeps kickoffs in Brasília
// time (no DST). Convert to the "Jun/29" + "17:30" shape that kickoffDate and
// the day-grouping helpers expect, so knockout cards sort and group like the
// group-stage cards.
export function knockoutKickoff(
	iso: string | null
): {date: string; time: string} | null {
	if (!iso) {
		return null;
	}

	const ms = Date.parse(iso);

	if (!Number.isFinite(ms)) {
		return null;
	}

	const brasilia = new Date(ms - 3 * 60 * 60 * 1000);

	return {
		date: `${MONTHS_ABBR[brasilia.getUTCMonth()]}/${brasilia.getUTCDate()}`,
		time: `${String(brasilia.getUTCHours()).padStart(2, '0')}:${String(
			brasilia.getUTCMinutes()
		).padStart(2, '0')}`,
	};
}

export function knockoutStatus(
	match: KnockoutMatch,
	nowMs: number
): MatchStatus {
	if (match.scoreA != null && match.scoreB != null) {
		return 'finished';
	}

	const kickoff = match.date ? Date.parse(match.date) : NaN;

	if (Number.isFinite(kickoff) && nowMs >= kickoff) {
		return 'live';
	}

	return 'notstarted';
}

export function isKnockoutPickable(
	match: KnockoutMatch,
	nowMs: number
): boolean {
	if (!match.teamA || !match.teamB || !match.date) {
		return false;
	}

	const kickoff = Date.parse(match.date);

	return Number.isFinite(kickoff) && nowMs < kickoff;
}

// Turn the knockout matches (plus everyone's in-app picks) into match cards that
// drop straight into the Upcoming/Finished lists and the predictions table.
export function buildKnockoutCards(
	matches: KnockoutMatch[],
	picksByMatch: Record<number, KnockoutPick[]>,
	nowMs: number
): MatchCard[] {
	return [...matches]
		.sort((a, b) => a.matchNumber - b.matchNumber)
		.map((match) => {
			const resolved = match.scoreA != null && match.scoreB != null;
			const kickoff = knockoutKickoff(match.date);

			const entries: MatchEntry[] = (
				picksByMatch[match.matchNumber] ?? []
			).map((pick) => ({
				name: pick.name,
				p1: pick.p1,
				p2: pick.p2,
				points: resolved
					? scorePrediction(
							pick.p1,
							pick.p2,
							match.scoreA as number,
							match.scoreB as number
						)
					: null,
			}));

			return {
				date: kickoff?.date ?? '',
				entries,
				group: match.stage,
				matchNo: match.matchNumber,
				status: knockoutStatus(match, nowMs),
				team1: match.teamA ?? match.a,
				team2: match.teamB ?? match.b,
				time: kickoff?.time ?? '',
				...(resolved
					? {r1: match.scoreA as number, r2: match.scoreB as number}
					: {}),
			};
		});
}
