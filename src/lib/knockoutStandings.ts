import {participantSlug} from './auth';
import type {ParticipantStats} from './participantStats';
import type {Approval, Profile} from './profiles';
import {POINTS, scorePrediction} from './scoring';
import type {Participant} from './types';
import type {KnockoutMatch} from './useKnockout';

const TIER_POINTS = [25, 18, 15, 12, 10, 0];

export interface KnockoutRosterRow {
	name: string;
	uid: string;
}

function displayName(profile: Profile | undefined, fallback: string): string {
	if (!profile) {
		return fallback;
	}

	return profile.nickname || profile.name || fallback;
}

// The approved knockout pool: anyone the owner approved for the knockout
// (`knockout`) or who already approved as a CSV participant (`participant`).
// Blocked users are out. Name follows the claimed participant, else the
// nickname, else the Google name.
export function knockoutRoster(
	profiles: Record<string, Profile>,
	approvals: Record<string, Approval>,
	participants: Participant[]
): KnockoutRosterRow[] {
	const slugToName = new Map(
		participants.map((participant) => [
			participantSlug(participant.name),
			participant.name,
		])
	);

	const rows: KnockoutRosterRow[] = [];

	for (const [uid, approval] of Object.entries(approvals)) {
		if (approval.blocked) {
			continue;
		}

		const claimed = approval.participant ?? null;

		if (!approval.knockout && !claimed) {
			continue;
		}

		const profile = profiles[uid];

		const name = claimed
			? slugToName.get(claimed) ?? displayName(profile, claimed)
			: displayName(profile, uid);

		rows.push({name, uid});
	}

	return rows.sort((a, b) => a.name.localeCompare(b.name));
}

// Users who asked to join the knockout but the owner hasn't approved (and who
// aren't blocked) — the admin sign-up queue.
export function pendingKnockout(
	profiles: Record<string, Profile>,
	approvals: Record<string, Approval>
): {email: string; name: string; uid: string}[] {
	const rows: {email: string; name: string; uid: string}[] = [];

	for (const [uid, profile] of Object.entries(profiles)) {
		if (!profile.wantsKnockout) {
			continue;
		}

		const approval = approvals[uid] ?? {};

		if (approval.knockout === true || approval.blocked === true) {
			continue;
		}

		rows.push({
			email: profile.email,
			name: profile.nickname || profile.name,
			uid,
		});
	}

	return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export interface KnockoutStandingRow {
	exact: number;
	name: string;
	played: number;
	points: number;
	rank: number;
	uid: string;
}

// Zeroed knockout ranking: each approved participant's in-app picks scored over
// the finished knockout matches with the same rules as the group stage.
export function buildKnockoutStandings(
	roster: KnockoutRosterRow[],
	picksByUid: Record<string, Record<number, {p1: number; p2: number}>>,
	matches: KnockoutMatch[]
): KnockoutStandingRow[] {
	const finished = matches.filter(
		(match) => match.scoreA != null && match.scoreB != null
	);

	const scored = roster
		.map(({name, uid}) => {
			const picks = picksByUid[uid] ?? {};

			let exact = 0;
			let played = 0;
			let points = 0;

			for (const match of finished) {
				const pick = picks[match.matchNumber];

				if (!pick) {
					continue;
				}

				played += 1;

				const got = scorePrediction(
					pick.p1,
					pick.p2,
					match.scoreA as number,
					match.scoreB as number
				);

				points += got;

				if (got === POINTS.EXACT_SCORE) {
					exact += 1;
				}
			}

			return {exact, name, played, points, uid};
		})
		.sort(
			(a, b) =>
				b.points - a.points ||
				b.exact - a.exact ||
				a.name.localeCompare(b.name)
		);

	let lastRank = 0;
	let lastPoints = Number.NaN;

	return scored.map((row, index) => {
		const rank = row.points === lastPoints ? lastRank : index + 1;

		lastRank = rank;
		lastPoints = row.points;

		return {...row, rank};
	});
}

// The knockout leader (top of the standings) plus the slice of ParticipantStats
// the LeaderCard renders — hit rate, streak, lead, avg/match, and the scoring
// breakdown — computed from their in-app picks over the finished matches. The
// remaining ParticipantStats fields are unused by the card and left at zero.
export function buildKnockoutLeaderStats(
	standings: KnockoutStandingRow[],
	picksByUid: Record<string, Record<number, {p1: number; p2: number}>>,
	matches: KnockoutMatch[]
): {name: string; stats: ParticipantStats} | null {
	const leader = standings[0];

	if (!leader) {
		return null;
	}

	const finished = matches
		.filter((match) => match.scoreA != null && match.scoreB != null)
		.sort(
			(a, b) =>
				(Date.parse(a.date ?? '') || 0) - (Date.parse(b.date ?? '') || 0)
		);

	const picks = picksByUid[leader.uid] ?? {};
	const tierCounts = TIER_POINTS.map(() => 0);
	const chronological: number[] = [];
	let hits = 0;

	for (const match of finished) {
		const pick = picks[match.matchNumber];

		if (!pick) {
			continue;
		}

		const got = scorePrediction(
			pick.p1,
			pick.p2,
			match.scoreA as number,
			match.scoreB as number
		);

		chronological.push(got);
		tierCounts[TIER_POINTS.indexOf(got)] += 1;

		if (got >= POINTS.WINNER_ONLY) {
			hits += 1;
		}
	}

	const played = chronological.length;

	let streak = 0;

	for (let index = chronological.length - 1; index >= 0; index--) {
		if (chronological[index] > 0) {
			streak += 1;
		}
		else {
			break;
		}
	}

	const next = standings[1];

	return {
		name: leader.name,
		stats: {
			avgGoals: null,
			avgPerMatch: played ? leader.points / played : null,
			bestRound: null,
			contrarianRate: null,
			favoriteScoreline: null,
			finishedCount: played,
			gapToLeader: 0,
			hitRate: played ? hits / played : null,
			hits,
			leadOverNext: next ? leader.points - next.points : null,
			movement: 0,
			rank: 1,
			rankHistory: [],
			streak,
			tierCounts,
			total: leader.points,
			uniquePicks: 0,
		},
	};
}
