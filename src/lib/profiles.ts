// profiles/<uid> — written by the uid owner (and the owner, to manage claims).
export interface Profile {
	claim?: string | null;
	email: string;
	lastSeenAt?: number | string;
	name: string;
	photoURL?: string;
}

// approvals/<uid> — written ONLY by the owner.
export interface Approval {
	blocked?: boolean;
	participant?: string | null;
}

export interface UserRow {
	blocked: boolean;
	claim: string | null;
	email: string;
	name: string;
	participant: string | null;
	pending: boolean;
	photoURL: string;
	uid: string;
}

// The profile fields we write on Google sign-in, with safe fallbacks.
export function buildProfileUpdate(
	user: {displayName: string | null; email: string | null; photoURL: string | null},
	now: number
): {email: string; lastSeenAt: number; name: string; photoURL: string} {
	return {
		email: user.email ?? '',
		lastSeenAt: now,
		name: user.displayName ?? user.email ?? 'Anonymous',
		photoURL: user.photoURL ?? '',
	};
}

// Merge profiles + approvals into admin rows; pending = a live claim that the
// owner hasn't approved and isn't blocked. Pending first, then by name.
export function deriveUserRows(
	profiles: Record<string, Profile>,
	approvals: Record<string, Approval>
): UserRow[] {
	return Object.entries(profiles)
		.map(([uid, profile]) => {
			const approval = approvals[uid] ?? {};
			const participant = approval.participant ?? null;
			const claim = profile.claim ?? null;
			const blocked = approval.blocked === true;

			return {
				blocked,
				claim,
				email: profile.email,
				name: profile.name,
				participant,
				pending: !blocked && !!claim && claim !== participant,
				photoURL: profile.photoURL ?? '',
				uid,
			};
		})
		.sort(
			(a, b) =>
				Number(b.pending) - Number(a.pending) ||
				a.name.localeCompare(b.name)
		);
}

export function pendingClaims(rows: UserRow[]): UserRow[] {
	return rows.filter((row) => row.pending);
}

// The approved participant slug for a uid (null if none/blocked) — drives the
// signed-in viewer's identity downstream.
export function approvedParticipant(
	approvals: Record<string, Approval>,
	uid: string | null
): string | null {
	if (!uid) {
		return null;
	}

	const approval = approvals[uid];

	return approval && !approval.blocked ? approval.participant ?? null : null;
}
