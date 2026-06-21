# Admin, Google Auth & Profiles — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional Google sign-in, per-user RTDB profiles, an owner-only `/admin` screen, and owner-gated claim approval — without breaking the anonymous, open experience.

**Architecture:** Anonymous auth stays the default; Google sign-in is opt-in and writes a `profiles/<uid>` record. A signed-in pool member self-claims a participant (`profiles/<uid>.claim`); the owner approves by writing the owner-only `approvals/<uid>` node. Owner identity is a hardcoded verified email enforced in the RTDB rules — the UI guard is convenience only.

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind 4, Firebase (Auth + Realtime Database), Vitest (node env → pure-logic tests), react-router-dom HashRouter, deployed static to GitHub Pages.

## Global Constraints

- Branch: all work commits to `develop` (already checked out). Never push to `master`; never publish.
- Owner email (verbatim): `adriano.interaminense@gmail.com`.
- Tests run under vitest `environment: 'node'` — unit-test **pure functions only**; verify hooks/components with `npm run build` + the manual checklist in Task 10.
- Keep the existing 139 tests green; commits are title-only (no body, no trailer); commit with `--no-gpg-sign`.
- Anonymous browsing, reactions, cheers, presence, leaderHype must keep working logged-out — do not change their rules or behavior.
- Participant slug = `name.trim().toLowerCase()` (matches the existing `/bets/:id` convention).

---

## File Structure

- `src/lib/auth.ts` (create) — owner constant + pure `isOwner` / `participantSlug`.
- `src/lib/auth.test.ts` (create) — tests for the above.
- `src/lib/profiles.ts` (create) — profile/approval types + pure derivations.
- `src/lib/profiles.test.ts` (create) — tests for the above.
- `src/lib/firebase.ts` (modify) — Google provider + `signInWithGoogle` / `signOutUser`.
- `src/lib/useAuth.ts` (create) — auth state, profile upsert + subscription, owner flag, claim writer.
- `src/lib/useProfiles.ts` (create) — owner-side: all profiles+approvals, approve/reject/block/unlink.
- `src/components/AuthButton.tsx` (create) — header sign-in / signed-in chip.
- `src/components/ClaimPrompt.tsx` (create) — claim-a-participant modal (adapted from IdentityPrompt).
- `src/components/AdminView.tsx` (create) — approval queue + user list.
- `src/App.tsx` (modify) — wire `useAuth`, `/admin` route + guard, claim flow; replace `useIdentity`.
- `src/components/Header.tsx` (modify) — render `AuthButton` instead of the identify control.
- `src/components/NavDrawer.tsx` (modify) — owner-only "Admin" link.
- `src/components/NavBar.tsx` (modify) — owner-only "Admin" link.
- `src/lib/useIdentity.ts` (delete), `src/components/IdentityPrompt.tsx` (delete) — replaced.
- `database.rules.json` (create) — the intended ruleset (manual console publish in Task 10).

---

### Task 1: Auth helpers (pure)

**Files:**
- Create: `src/lib/auth.ts`
- Test: `src/lib/auth.test.ts`

**Interfaces:**
- Produces: `OWNER_EMAIL: string`, `isOwner(email: string | null | undefined, emailVerified: boolean | undefined): boolean`, `participantSlug(name: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/auth.test.ts
import {describe, expect, it} from 'vitest';

import {isOwner, OWNER_EMAIL, participantSlug} from './auth';

describe('isOwner', () => {
	it('is true only for the verified owner email', () => {
		expect(isOwner(OWNER_EMAIL, true)).toBe(true);
	});

	it('is false when the email is not verified', () => {
		expect(isOwner(OWNER_EMAIL, false)).toBe(false);
	});

	it('is false for any other email', () => {
		expect(isOwner('someone@gmail.com', true)).toBe(false);
	});

	it('is false for null/undefined', () => {
		expect(isOwner(null, true)).toBe(false);
		expect(isOwner(undefined, undefined)).toBe(false);
	});

	it('matches case-insensitively', () => {
		expect(isOwner(OWNER_EMAIL.toUpperCase(), true)).toBe(true);
	});
});

describe('participantSlug', () => {
	it('lowercases and trims', () => {
		expect(participantSlug('  Adriano ')).toBe('adriano');
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: FAIL — cannot resolve `./auth`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/auth.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/lib/auth.test.ts
git commit --no-gpg-sign -m "Add auth owner check and participant slug helpers"
```

---

### Task 2: Profile/approval model + derivations (pure)

**Files:**
- Create: `src/lib/profiles.ts`
- Test: `src/lib/profiles.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Profile { email: string; name: string; photoURL?: string; lastSeenAt?: number | string; claim?: string | null }`
  - `interface Approval { participant?: string | null; blocked?: boolean }`
  - `interface UserRow { uid: string; email: string; name: string; photoURL: string; claim: string | null; participant: string | null; blocked: boolean; pending: boolean }`
  - `buildProfileUpdate(user: {email: string | null; displayName: string | null; photoURL: string | null}, now: number): {email: string; name: string; photoURL: string; lastSeenAt: number}`
  - `deriveUserRows(profiles: Record<string, Profile>, approvals: Record<string, Approval>): UserRow[]`
  - `pendingClaims(rows: UserRow[]): UserRow[]`
  - `approvedParticipant(approvals: Record<string, Approval>, uid: string | null): string | null`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/profiles.test.ts
import {describe, expect, it} from 'vitest';

import {
	approvedParticipant,
	buildProfileUpdate,
	deriveUserRows,
	pendingClaims,
} from './profiles';

const profiles = {
	u1: {email: 'a@x.com', name: 'Ana', claim: 'adriano'},
	u2: {email: 'b@x.com', name: 'Bob', claim: 'caio'},
	u3: {email: 'c@x.com', name: 'Cid'},
};

const approvals = {
	u2: {participant: 'caio'},
	u3: {blocked: true},
};

describe('buildProfileUpdate', () => {
	it('maps a Google user with fallbacks', () => {
		expect(
			buildProfileUpdate(
				{displayName: null, email: 'x@y.com', photoURL: null},
				1234
			)
		).toEqual({
			email: 'x@y.com',
			lastSeenAt: 1234,
			name: 'x@y.com',
			photoURL: '',
		});
	});
});

describe('deriveUserRows', () => {
	const rows = deriveUserRows(profiles, approvals);

	it('flags an unapproved claim as pending', () => {
		expect(rows.find((r) => r.uid === 'u1')?.pending).toBe(true);
	});

	it('is not pending once the claim equals the approved participant', () => {
		expect(rows.find((r) => r.uid === 'u2')?.pending).toBe(false);
		expect(rows.find((r) => r.uid === 'u2')?.participant).toBe('caio');
	});

	it('never marks a blocked user pending', () => {
		expect(rows.find((r) => r.uid === 'u3')?.blocked).toBe(true);
		expect(rows.find((r) => r.uid === 'u3')?.pending).toBe(false);
	});

	it('sorts pending first', () => {
		expect(rows[0].uid).toBe('u1');
	});
});

describe('pendingClaims', () => {
	it('returns only pending rows', () => {
		const rows = deriveUserRows(profiles, approvals);

		expect(pendingClaims(rows).map((r) => r.uid)).toEqual(['u1']);
	});
});

describe('approvedParticipant', () => {
	it('returns the approved slug', () => {
		expect(approvedParticipant(approvals, 'u2')).toBe('caio');
	});

	it('returns null for blocked or unknown or null uid', () => {
		expect(approvedParticipant(approvals, 'u3')).toBeNull();
		expect(approvedParticipant(approvals, 'u1')).toBeNull();
		expect(approvedParticipant(approvals, null)).toBeNull();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/profiles.test.ts`
Expected: FAIL — cannot resolve `./profiles`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/profiles.ts

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/profiles.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profiles.ts src/lib/profiles.test.ts
git commit --no-gpg-sign -m "Add profile/approval model and admin derivations"
```

---

### Task 3: Firebase Google sign-in helpers

**Files:**
- Modify: `src/lib/firebase.ts`

**Interfaces:**
- Consumes: existing `auth` export.
- Produces: `googleProvider: GoogleAuthProvider`, `signInWithGoogle(): Promise<unknown>`, `signOutUser(): Promise<void>`, `ensureAnonymous(): Promise<unknown>`.

- [ ] **Step 1: Edit the file**

Replace the auth import line and append the helpers. The file becomes:

```ts
import {initializeApp} from 'firebase/app';
import {
	getAuth,
	GoogleAuthProvider,
	signInAnonymously,
	signInWithPopup,
	signInWithRedirect,
	signOut,
} from 'firebase/auth';
import {getDatabase} from 'firebase/database';

// Public web config — security comes from the Realtime Database rules and the
// authorized domains, not from hiding these values.
const firebaseConfig = {
	apiKey: 'AIzaSyAtJldVIYjQKRBUaepI1wQE0-u2nq4InxU',
	appId: '1:797211677840:web:61a5322b748fb4978fb415',
	authDomain: 'ac-world-cup-2026-bet.firebaseapp.com',
	databaseURL: 'https://ac-world-cup-2026-bet-default-rtdb.firebaseio.com',
	messagingSenderId: '797211677840',
	projectId: 'ac-world-cup-2026-bet',
	storageBucket: 'ac-world-cup-2026-bet.firebasestorage.app',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

export const googleProvider = new GoogleAuthProvider();

// Each browser keeps a stable anonymous uid so logged-out reactions/cheers/
// presence keep working.
export function ensureAnonymous() {
	return signInAnonymously(auth);
}

// Popup on desktop; redirect on mobile/PWA where popups are unreliable.
export function signInWithGoogle() {
	const isMobile = /Mobi|Android/i.test(navigator.userAgent);

	return isMobile
		? signInWithRedirect(auth, googleProvider)
		: signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
	return signOut(auth);
}

// Sign in anonymously on first load (no-op once a session exists).
export const signedIn = signInAnonymously(auth);
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built` with no TS errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/firebase.ts
git commit --no-gpg-sign -m "Add Google sign-in and sign-out helpers to firebase"
```

---

### Task 4: useAuth hook

**Files:**
- Create: `src/lib/useAuth.ts`

**Interfaces:**
- Consumes: `auth`, `db`, `signInWithGoogle`, `signOutUser`, `ensureAnonymous` (Task 3); `isOwner` (Task 1); `buildProfileUpdate`, `type Profile` (Task 2).
- Produces:
  - `interface AuthState { user: User | null; isAnonymous: boolean; isOwner: boolean; profile: Profile | null; signIn: () => void; signOut: () => void; setClaim: (slug: string | null) => void }`
  - `useAuth(): AuthState`

- [ ] **Step 1: Write the hook**

```ts
// src/lib/useAuth.ts
import {onAuthStateChanged, type User} from 'firebase/auth';
import {onValue, ref, serverTimestamp, set, update} from 'firebase/database';
import {useEffect, useState} from 'react';

import {isOwner as checkOwner} from './auth';
import {auth, db, ensureAnonymous, signInWithGoogle, signOutUser} from './firebase';
import {buildProfileUpdate, type Profile} from './profiles';

export interface AuthState {
	isAnonymous: boolean;
	isOwner: boolean;
	profile: Profile | null;
	setClaim: (slug: string | null) => void;
	signIn: () => void;
	signOut: () => void;
	user: User | null;
}

export function useAuth(): AuthState {
	const [user, setUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(
		() =>
			onAuthStateChanged(auth, (next) => {
				setUser(next);

				// Signed all the way out → fall back to anonymous so the open
				// features keep working.
				if (!next) {
					ensureAnonymous().catch(() => undefined);
				}
			}),
		[]
	);

	// For a real (non-anonymous) user: write the profile and subscribe to it.
	useEffect(() => {
		if (!user || user.isAnonymous) {
			setProfile(null);

			return undefined;
		}

		update(
			ref(db, `profiles/${user.uid}`),
			buildProfileUpdate(user, Date.now())
		).catch(() => undefined);

		// lastSeenAt as a server timestamp (overwrites the optimistic Date.now()).
		update(ref(db, `profiles/${user.uid}`), {
			lastSeenAt: serverTimestamp(),
		}).catch(() => undefined);

		return onValue(ref(db, `profiles/${user.uid}`), (snapshot) => {
			setProfile((snapshot.val() as Profile) ?? null);
		});
	}, [user]);

	const setClaim = (slug: string | null) => {
		if (!user || user.isAnonymous) {
			return;
		}

		set(ref(db, `profiles/${user.uid}/claim`), slug);
	};

	return {
		isAnonymous: user?.isAnonymous ?? true,
		isOwner: checkOwner(user?.email, user?.emailVerified),
		profile,
		setClaim,
		signIn: () => {
			signInWithGoogle().catch(() => undefined);
		},
		signOut: () => {
			signOutUser().catch(() => undefined);
		},
		user,
	};
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useAuth.ts
git commit --no-gpg-sign -m "Add useAuth hook with profile upsert and owner flag"
```

---

### Task 5: useProfiles hook (owner-side)

**Files:**
- Create: `src/lib/useProfiles.ts`

**Interfaces:**
- Consumes: `db` (Task 3); `deriveUserRows`, `type Approval`, `type Profile`, `type UserRow` (Task 2).
- Produces:
  - `interface ProfilesApi { rows: UserRow[]; approve: (uid: string, slug: string) => void; reject: (uid: string) => void; setBlocked: (uid: string, blocked: boolean) => void; unlink: (uid: string) => void }`
  - `useProfiles(): ProfilesApi`

- [ ] **Step 1: Write the hook**

```ts
// src/lib/useProfiles.ts
import {onValue, ref, set, update} from 'firebase/database';
import {useEffect, useMemo, useState} from 'react';

import {
	type Approval,
	deriveUserRows,
	type Profile,
	type UserRow,
} from './profiles';
import {db} from './firebase';

export interface ProfilesApi {
	approve: (uid: string, slug: string) => void;
	reject: (uid: string) => void;
	rows: UserRow[];
	setBlocked: (uid: string, blocked: boolean) => void;
	unlink: (uid: string) => void;
}

export function useProfiles(): ProfilesApi {
	const [profiles, setProfiles] = useState<Record<string, Profile>>({});
	const [approvals, setApprovals] = useState<Record<string, Approval>>({});

	useEffect(
		() =>
			onValue(ref(db, 'profiles'), (snapshot) => {
				setProfiles((snapshot.val() as Record<string, Profile>) ?? {});
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, 'approvals'), (snapshot) => {
				setApprovals(
					(snapshot.val() as Record<string, Approval>) ?? {}
				);
			}),
		[]
	);

	const rows = useMemo(
		() => deriveUserRows(profiles, approvals),
		[profiles, approvals]
	);

	return {
		// Owner writes the approved link; the claim now equals the participant
		// so the row stops being pending.
		approve: (uid, slug) => {
			update(ref(db, `approvals/${uid}`), {participant: slug});
			set(ref(db, `profiles/${uid}/claim`), slug);
		},
		// Reject clears the user's claim (owner may write profiles per rules).
		reject: (uid) => {
			set(ref(db, `profiles/${uid}/claim`), null);
		},
		rows,
		setBlocked: (uid, blocked) => {
			update(ref(db, `approvals/${uid}`), {blocked});
		},
		unlink: (uid) => {
			update(ref(db, `approvals/${uid}`), {participant: null});
		},
	};
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useProfiles.ts
git commit --no-gpg-sign -m "Add useProfiles hook for owner-side approvals"
```

---

### Task 6: AuthButton component

**Files:**
- Create: `src/components/AuthButton.tsx`

**Interfaces:**
- Consumes: nothing (presentational).
- Produces: `AuthButton({signedIn, name, photoURL, onSignIn, onSignOut}: {signedIn: boolean; name: string | null; photoURL: string | null; onSignIn: () => void; onSignOut: () => void})`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/AuthButton.tsx

// Header control: invites Google sign-in when anonymous; shows the signed-in
// user's avatar + name with a sign-out action otherwise.
export function AuthButton({
	name,
	onSignIn,
	onSignOut,
	photoURL,
	signedIn,
}: {
	name: string | null;
	onSignIn: () => void;
	onSignOut: () => void;
	photoURL: string | null;
	signedIn: boolean;
}) {
	if (!signedIn) {
		return (
			<button
				className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
				onClick={onSignIn}
			>
				Sign in with Google
			</button>
		);
	}

	return (
		<div className="flex shrink-0 items-center gap-2 rounded-full bg-white/5 py-0.5 pl-0.5 pr-1">
			{photoURL ? (
				<img
					alt=""
					className="h-6 w-6 rounded-full object-cover"
					referrerPolicy="no-referrer"
					src={photoURL}
				/>
			) : (
				<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200">
					{(name ?? '?').charAt(0)}
				</span>
			)}

			<span className="max-w-24 truncate text-xs font-medium text-slate-200">
				{name}
			</span>

			<button
				aria-label="Sign out"
				className="flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
				onClick={onSignOut}
			>
				⏻
			</button>
		</div>
	);
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/components/AuthButton.tsx
git commit --no-gpg-sign -m "Add AuthButton header control"
```

---

### Task 7: ClaimPrompt component

**Files:**
- Create: `src/components/ClaimPrompt.tsx`

**Interfaces:**
- Consumes: `Avatar` (`./Avatar`); `Participant` (`../lib/types`).
- Produces: `ClaimPrompt({participants, onClaim, onClose}: {participants: Participant[]; onClaim: (name: string) => void; onClose: () => void})`.

- [ ] **Step 1: Write the component**

```tsx
// src/components/ClaimPrompt.tsx
import type {Participant} from '../lib/types';
import {Avatar} from './Avatar';

// Shown to a signed-in user who hasn't claimed a pool spot. Picking a
// participant records a claim (pending until the owner approves). Dismissible —
// not everyone is in the pool.
export function ClaimPrompt({
	onClaim,
	onClose,
	participants,
}: {
	onClaim: (name: string) => void;
	onClose: () => void;
	participants: Participant[];
}) {
	return (
		<div
			className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
			onClick={onClose}
		>
			<div
				className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="font-display text-xl font-bold text-white">
							Which player are you? 🎯
						</h2>

						<p className="mt-1 text-sm text-slate-400">
							Claim your spot — the owner approves it before your
							bets link up.
						</p>
					</div>

					<button
						aria-label="Close"
						className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
						onClick={onClose}
					>
						✕
					</button>
				</div>

				<div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
					{participants.map((participant) => (
						<button
							className="flex flex-col items-center gap-1.5 rounded-xl p-2 transition hover:bg-white/5"
							key={participant.name}
							onClick={() => onClaim(participant.name)}
						>
							<Avatar
								className="h-12 w-12 rounded-full"
								name={participant.name}
							/>

							<span className="w-full truncate text-center text-xs text-slate-300">
								{participant.name}
							</span>
						</button>
					))}
				</div>

				<button
					className="mt-4 w-full rounded-xl bg-white/5 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
					onClick={onClose}
				>
					I'm just watching
				</button>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ClaimPrompt.tsx
git commit --no-gpg-sign -m "Add ClaimPrompt for self-claiming a pool spot"
```

---

### Task 8: AdminView component

**Files:**
- Create: `src/components/AdminView.tsx`

**Interfaces:**
- Consumes: `useProfiles` (Task 5); `Avatar` (`./Avatar`).
- Produces: `AdminView()` (no props; calls `useProfiles` itself).

- [ ] **Step 1: Write the component**

```tsx
// src/components/AdminView.tsx
import {useProfiles} from '../lib/useProfiles';
import {Avatar} from './Avatar';

// Owner-only screen: a pending-claim queue and the full user list. Route access
// is guarded in App; writes are gated by the RTDB rules.
export function AdminView() {
	const {approve, reject, rows, setBlocked, unlink} = useProfiles();

	const pending = rows.filter((row) => row.pending);

	return (
		<div className="space-y-6">
			<section>
				<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Pending claims ({pending.length})
				</h3>

				{pending.length === 0 ? (
					<p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
						No claims waiting.
					</p>
				) : (
					<ul className="space-y-2">
						{pending.map((row) => (
							<li
								className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
								key={row.uid}
							>
								<Avatar
									className="h-9 w-9 rounded-full"
									name={row.claim ?? row.name}
								/>

								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-white">
										{row.name}
									</p>

									<p className="truncate text-xs text-slate-400">
										{row.email} → claims{' '}
										<span className="font-semibold text-slate-200">
											{row.claim}
										</span>
									</p>
								</div>

								<button
									className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-emerald-950 transition hover:bg-emerald-400"
									onClick={() =>
										approve(row.uid, row.claim as string)
									}
								>
									Approve
								</button>

								<button
									className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
									onClick={() => reject(row.uid)}
								>
									Reject
								</button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Users ({rows.length})
				</h3>

				<ul className="space-y-2">
					{rows.map((row) => (
						<li
							className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 ${
								row.blocked ? 'opacity-50' : ''
							}`}
							key={row.uid}
						>
							<Avatar
								className="h-9 w-9 rounded-full"
								name={row.participant ?? row.name}
							/>

							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-white">
									{row.name}
								</p>

								<p className="truncate text-xs text-slate-400">
									{row.participant
										? `linked: ${row.participant}`
										: 'spectator'}
								</p>
							</div>

							{row.participant && (
								<button
									className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
									onClick={() => unlink(row.uid)}
								>
									Unlink
								</button>
							)}

							<button
								className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
								onClick={() => setBlocked(row.uid, !row.blocked)}
							>
								{row.blocked ? 'Unblock' : 'Block'}
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built`.

- [ ] **Step 3: Commit**

```bash
git add src/components/AdminView.tsx
git commit --no-gpg-sign -m "Add owner-only AdminView with claim queue and user list"
```

---

### Task 9: Wire auth into App, Header, and nav; remove the name picker

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Header.tsx`
- Modify: `src/components/NavDrawer.tsx`
- Modify: `src/components/NavBar.tsx`
- Delete: `src/lib/useIdentity.ts`, `src/components/IdentityPrompt.tsx`

**Interfaces:**
- Consumes: `useAuth` (Task 4), `AuthButton` (Task 6), `ClaimPrompt` (Task 7), `AdminView` (Task 8), `approvedParticipant` + `useProfiles`-free read via a small subscription, `participantSlug` (Task 1).
- Produces: a guarded `/admin` route; identity now sourced from auth.

- [ ] **Step 1: Header — render AuthButton instead of the identify control**

In `src/components/Header.tsx`, change the props and the right-side cluster. Replace the `IdentityButton` usages with `AuthButton`. New prop shape:

```tsx
import type {OnlineUser} from '../lib/usePresence';
import {AuthButton} from './AuthButton';
import {PresenceBar} from './PresenceBar';

interface HeaderProps {
	authName: string | null;
	authPhotoURL: string | null;
	online: OnlineUser[];
	onMenuClick: () => void;
	onSignIn: () => void;
	onSignOut: () => void;
	signedIn: boolean;
	statusText: string;
}
```

Delete the local `IdentityButton` function. In both the desktop cluster and the
mobile row, replace `<IdentityButton .../>` with:

```tsx
<AuthButton
	name={authName}
	onSignIn={onSignIn}
	onSignOut={onSignOut}
	photoURL={authPhotoURL}
	signedIn={signedIn}
/>
```

Keep `PresenceBar` and the menu button exactly as they are. Update the
destructured params of `Header({...})` to the new `HeaderProps`.

- [ ] **Step 2: App — replace useIdentity with useAuth + an approvals read**

In `src/App.tsx`:

Remove these imports/lines:
```tsx
import {IdentityPrompt} from './components/IdentityPrompt';
import {useIdentity} from './lib/useIdentity';
```
```tsx
const [identityOpen, setIdentityOpen] = useState(false);
const identity = useIdentity();
const online = usePresence(identity.name);
```

Add imports:
```tsx
import {AdminView} from './components/AdminView';
import {ClaimPrompt} from './components/ClaimPrompt';
import {useAuth} from './lib/useAuth';
import {approvedParticipant, type Approval} from './lib/profiles';
import {onValue, ref} from 'firebase/database';
import {db} from './lib/firebase';
```

Add state + auth wiring near the other hooks (replacing the removed lines):
```tsx
const [claimOpen, setClaimOpen] = useState(false);
const auth = useAuth();

// All approvals (small) so the signed-in viewer knows their linked participant.
const [approvals, setApprovals] = useState<Record<string, Approval>>({});
useEffect(
	() =>
		onValue(ref(db, 'approvals'), (snapshot) => {
			setApprovals((snapshot.val() as Record<string, Approval>) ?? {});
		}),
	[]
);

const myParticipantSlug = approvedParticipant(approvals, auth.user?.uid ?? null);
const myParticipantName =
	participants.find((p) => participantSlug(p.name) === myParticipantSlug)
		?.name ?? null;

const online = usePresence(myParticipantName);
```

(Import `participantSlug` from `./lib/auth` and `useEffect`/`useState` are
already imported.)

- [ ] **Step 3: App — update the Header render**

Replace the existing `<Header ... />` block with:
```tsx
<Header
	authName={auth.profile?.name ?? null}
	authPhotoURL={auth.profile?.photoURL ?? null}
	online={online}
	onMenuClick={() => setMenuOpen(true)}
	onSignIn={auth.signIn}
	onSignOut={auth.signOut}
	signedIn={!auth.isAnonymous && !!auth.user}
	statusText={statusText}
/>
```

- [ ] **Step 4: App — replace the IdentityPrompt block with the claim flow**

Replace the old `{identityOpen && (<IdentityPrompt .../>)}` block with:
```tsx
{claimOpen && (
	<ClaimPrompt
		onClaim={(name) => {
			auth.setClaim(participantSlug(name));
			setClaimOpen(false);
		}}
		onClose={() => setClaimOpen(false)}
		participants={participants}
	/>
)}
```

Add a trigger: when signed in and not yet linked, open the claim prompt from the
nav. Simplest — show it automatically once per sign-in if unclaimed. Add this
effect:
```tsx
// Offer the claim prompt to a freshly signed-in user with no link yet.
useEffect(() => {
	if (
		!auth.isAnonymous &&
		auth.user &&
		auth.profile &&
		!auth.profile.claim &&
		!myParticipantSlug
	) {
		setClaimOpen(true);
	}
}, [auth.isAnonymous, auth.user, auth.profile, myParticipantSlug]);
```

- [ ] **Step 5: App — add the guarded /admin route**

Inside `<Routes>`, add:
```tsx
<Route
	element={
		auth.isOwner ? <AdminView /> : <Navigate replace to="/" />
	}
	path="/admin"
/>
```
(`Navigate` is already imported.)

- [ ] **Step 6: Nav — owner-only Admin link**

In `src/components/NavBar.tsx` add an `isOwner` prop and, when true, render an
extra link after the mapped items:
```tsx
{isOwner && (
	<NavLink
		className={({isActive}) =>
			isActive
				? 'border-b-2 border-emerald-400 pb-1 text-white'
				: 'pb-1 text-slate-400 transition hover:text-white'
		}
		to="/admin"
	>
		Admin
	</NavLink>
)}
```
Add `isOwner: boolean` to its props. Do the same in `src/components/NavDrawer.tsx`
(append an Admin `NavLink` styled like the other drawer items when `isOwner`),
adding `isOwner` to its props. In `App.tsx`, pass `isOwner={auth.isOwner}` to
both `<NavBar />` and `<NavDrawer />`.

- [ ] **Step 7: Delete the obsolete files**

```bash
git rm src/lib/useIdentity.ts src/components/IdentityPrompt.tsx
```

- [ ] **Step 8: Build + run the full suite**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; tests `139 + new` all pass (auth + profiles tests included).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit --no-gpg-sign -m "Wire Google auth, claim flow, and owner-only admin route"
```

---

### Task 10: RTDB rules file + manual deploy + verification

**Files:**
- Create: `database.rules.json`

**Interfaces:**
- Consumes: nothing.
- Produces: a deployable ruleset (manual console publish; not auto-deployed).

- [ ] **Step 1: Write the rules file**

```json
{
	"rules": {
		"profiles": {
			".read": true,
			"$uid": {
				".write": "auth != null && (auth.uid === $uid || (auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true))",
				"email": {".validate": "newData.isString()"},
				"name": {".validate": "newData.isString()"},
				"photoURL": {".validate": "newData.isString()"},
				"lastSeenAt": {".validate": "newData.isNumber() || newData.isString()"},
				"claim": {".validate": "newData.isString() || !newData.exists()"},
				"$other": {".validate": false}
			}
		},
		"approvals": {
			".read": true,
			"$uid": {
				".write": "auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true"
			}
		}
	}
}
```

- [ ] **Step 2: Commit the file**

```bash
git add database.rules.json
git commit --no-gpg-sign -m "Add RTDB rules for profiles and owner approvals"
```

- [ ] **Step 3: Manual console steps (owner performs)**

1. Firebase console → Authentication → Sign-in method → enable **Google**.
2. Authentication → Settings → Authorized domains → add `interaminense.github.io`
   (confirm `localhost` is present for local testing).
3. Realtime Database → Rules → **merge** the `profiles` and `approvals` blocks
   above into the existing rules (leave `games`, `commentary`, `reactions`,
   `cheers`, `presence`, `leaderHype`, `demo` untouched) → Publish.

- [ ] **Step 4: Manual verification checklist**

- Run `npm run dev -- --host` and open on `localhost`.
- Logged out: leaderboard, reactions, cheers, presence still work (anonymous).
- Sign in with the **owner** Google account → profile chip shows name/photo;
  `/admin` is reachable and lists users; the "Admin" nav link appears.
- Sign in with a **non-owner** Google account in another browser → claim a
  participant → it shows as **pending** in the owner's `/admin`; approve it →
  pending clears and the link shows; block/unblock and unlink work.
- As the non-owner, navigate to `#/admin` directly → redirected to `/`; confirm
  in the console/network that a write to `approvals/<uid>` is **denied** by the
  rules.

---

## Notes

- Phase 1 keeps presence/reactions keyed on the **approved participant name**
  (replacing the old localStorage name). Showing real Google photos in the
  presence bar and a "you" row highlight are deliberately deferred — small
  follow-ups, not required for the foundation.
- No Cloud Functions, no Blaze plan in this phase. Everything is client + rules.
