# Admin, Google Auth & Profiles — Phase 1 (Foundation)

## Context

The app is an open, anonymous static SPA on GitHub Pages. Every browser gets an
anonymous Firebase uid; "identity" today is just a participant name in
localStorage (`useIdentity`), unverified — anyone can claim to be anyone. The 13
pool participants and their predictions come from build-time CSVs. Realtime data
(games, commentary, reactions, cheers, presence, leaderHype) lives in the
Realtime Database with permissive rules.

This is Phase 1 of a larger admin platform. Later phases (own specs): content
moderation, owner-triggered data ops via Cloud Function, and migrating
predictions from CSV to editable RTDB.

## Goal

Add optional Google sign-in, real per-user profiles, an owner-only `/admin`
screen, and owner-gated user/profile management — without breaking the open,
anonymous experience.

## Decisions (approved)

- **Login is optional.** Anonymous browsing stays exactly as today. Signing in
  with Google unlocks a real profile (photo/name) and identified
  presence/reactions.
- **Self-claim + owner-approves.** A logged-in user claims "I am <participant>";
  it stays pending until the owner approves in `/admin`. Non-pool users remain
  spectator profiles (photo/name, can react, no predictions/ranking).
- **Single owner, hardcoded email.** Owner = `adriano.interaminense@gmail.com`,
  enforced in the RTDB rules. No additional admin role in Phase 1.

## Architecture

### Auth & session

- Keep anonymous auth (`signInAnonymously`) as the default so unauthenticated
  writes (reactions, cheers, presence, leaderHype) keep working.
- Optional Google sign-in via `GoogleAuthProvider` + `signInWithPopup`, falling
  back to `signInWithRedirect` on mobile/PWA where popups are unreliable.
- Google sign-in starts a fresh Google session (its own uid). Anonymous→Google
  account linking is out of scope for Phase 1 (prior anonymous reactions are
  already counted; linking can come later).
- Remove `useIdentity` (localStorage name picker); identity now derives from the
  authenticated profile.

### Data model (RTDB)

Two nodes, split by who may write them — this keeps the rules simple:

```
profiles/<uid>      written by the owner of that uid (auth.uid === $uid)
  { email, name, photoURL, lastSeenAt, claim: "<slug>" | null }

approvals/<uid>     written ONLY by the owner
  { participant: "<slug>" | null, blocked: boolean }
```

- `claim` is the participant slug the user is requesting (pending).
- `approvals/<uid>.participant` is the confirmed link (owner-written). The app
  treats a user as participant X only when `approvals/<uid>.participant === X`.
- `<slug>` is the lowercased participant name (matches the existing `/bets/:id`
  convention).

### RTDB rules (the real security boundary)

```jsonc
{
  "rules": {
    // ... existing nodes (games, commentary, reactions, cheers, presence,
    // leaderHype, demo) keep their current rules unchanged ...

    "profiles": {
      ".read": true,
      "$uid": {
        ".write": "auth != null && auth.uid === $uid",
        ".validate": "newData.hasChildren(['email'])",
        "email":      { ".validate": "newData.isString()" },
        "name":       { ".validate": "newData.isString()" },
        "photoURL":   { ".validate": "newData.isString()" },
        "lastSeenAt": { ".validate": "newData.isNumber() || newData.isString()" },
        "claim":      { ".validate": "newData.isString() || newData.val() === null" },
        "$other":     { ".validate": false }
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

The owner check uses the verified Google email in the token. A non-owner who
forces the `/admin` route still cannot write `approvals` — the rules reject it.

### Routing & guard

- New `/admin` route (HashRouter). A guard reads the current auth user; if the
  email is not the owner, it redirects to `/`. UI-only — security is the rules.
- `useAuth` hook: exposes `{ user, profile, isOwner, signIn, signOut }`, where
  `user` is the Firebase user (or anonymous), `profile` is the RTDB profile, and
  `isOwner = user?.email === OWNER_EMAIL && user.emailVerified`.

### Components

- `src/lib/firebase.ts` — add `GoogleAuthProvider`; export sign-in/out helpers.
- `src/lib/useAuth.ts` — auth state + profile subscription + owner check.
- `src/lib/useProfiles.ts` — owner-side: subscribe to all `profiles` + `approvals`
  for the admin lists.
- `src/components/AdminView.tsx` — approval queue + user list (approve/reject,
  block, link/unlink). Owner-only.
- `src/components/AuthButton.tsx` — header control: "Sign in with Google" when
  anonymous; avatar + name + "Sign out" when signed in. Replaces the old
  identify control.
- `src/components/ClaimPrompt.tsx` — after sign-in, a pool member claims their
  participant (reuses the old IdentityPrompt UI). Writes `profiles/<uid>.claim`.
- `App.tsx` — wire `useAuth`, the `/admin` route + guard, pass real
  profile/identity to Header, PresenceBar, reactions.
- Remove `src/lib/useIdentity.ts` and `IdentityPrompt` usage as the name picker.

### Identity downstream

- Presence (`usePresence`) and reactions use the real profile (name/photo) when
  signed in; anonymous users behave as today.
- The leaderboard highlights "you" when `approvals/<uid>.participant` matches a
  row.

## Out of scope (later phases)

Content moderation; owner-triggered data ops (needs a Cloud Function / Blaze);
predictions CSV→RTDB migration; anonymous→Google linking; multi-admin roles.

## Testing & verification

- Unit (vitest): owner-email check, slug mapping, claim/approval state
  transitions (pure logic). Keep the existing 139 green and add new tests.
- Manual: sign in with two Google accounts (owner + non-owner); claim a
  participant; approve/reject/block from `/admin`; confirm a non-owner cannot
  write `approvals` (rules reject); confirm anonymous browsing + reactions still
  work logged-out.
- `npm run build` clean.

## Manual console steps (owner only)

1. Authentication → enable the **Google** provider.
2. Authentication → Settings → Authorized domains → add `interaminense.github.io`
   (`localhost` is already allowed).
3. Realtime Database → Rules → publish the rules above (merged with current).

No Cloud Functions and no Blaze plan in Phase 1 — client + rules only, so the
free tier suffices.
