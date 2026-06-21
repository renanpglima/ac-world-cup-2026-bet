export const OWNER_EMAIL = 'adriano.interaminense@gmail.com';

// The owner is a single, hardcoded, verified Google email. This mirror of the
// RTDB rule is for UI convenience only — the database rules are the real gate.
export function isOwner(
	email: string | null | undefined,
	emailVerified: boolean | undefined
): boolean {
	return (
		!!email &&
		email.toLowerCase() === OWNER_EMAIL &&
		emailVerified === true
	);
}

// Slug used to link a profile to a pool participant and in /bets/:id.
export function participantSlug(name: string): string {
	return name.trim().toLowerCase();
}
