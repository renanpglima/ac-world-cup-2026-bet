# Knockout Picks in the Upcoming Matches Tab — Design

**Date:** 2026-06-24

## Goal

Let logged-in users predict the knockout-stage matches from the **Matches →
Upcoming** tab, reusing the existing match-card UX, instead of a separate
bracket UI. The knockout games are appended to the end of Upcoming; each picks
shows in the same predictions table and scores with the same rules.

## Context (current behavior)

- `buildMatchCards(participants, games)` builds one `MatchCard` per match number
  that appears in the sheet-sourced `participants[].predictions`. `entries` are
  those predictions, scored via `scorePrediction`. There is **no in-app pick
  entry** — group-stage predictions come pre-loaded.
- Knockout matches (`useKnockout()`: match numbers 73–104, ISO `date`,
  `teamA/teamB` or placeholder `a/b`, `scoreA/scoreB`, `stage`) are not in the
  sheet, so they have no cards. They appear only in the view-only
  `KnockoutBracket` tab.
- Auth: `useAuth()` → `{isAnonymous, isOwner, profile{name,photoURL}, user{uid},
  signIn}`. Signed in ⇔ `!isAnonymous && user`.
- Date helpers (`kickoffDate`/`groupByLocalDay`/`kickoffTime`) expect the
  group-stage string format `"Jun/29"` + `"17:30"` (Brasília, -03:00).

## Approach

1. **Knockout match cards.** A pure builder turns each `KnockoutMatch` into a
   `MatchCard`: `team1 = teamA ?? a`, `team2 = teamB ?? b`, `matchNo =
   matchNumber`, `group = stage`, `date/time` converted from the ISO kickoff to
   the `"Jun/29"`/`"17:30"` format the helpers expect, `r1/r2` from
   `scoreA/scoreB` when present, `status` derived client-side. `entries` come
   from the in-app picks.

2. **In-app picks.** A new `useKnockoutPicks(identity)` hook (RTDB,
   demo-aware via `dataPath`) stores `knockoutPicks/<uid>/<matchNo> =
   {name, photoURL, p1, p2, at}` and returns `{byMatch, mine, setPick}`. On a
   knockout card, a signed-in user whose match is pickable gets a compact score
   stepper ("Seu palpite: 🇧🇷 [− p1 +] x [− p2 +] 🇭🇷") that saves on change.

3. **Same table, same scoring.** Picks feed the card's `entries`, so they render
   in the existing Players/Score/Pts table and score via `scorePrediction`
   (EXACT 25, WINNER+GOALS 18, …) once the real result is in.

## Decisions

- **All 32 knockout games** are added to Upcoming, after the group stage (their
  match numbers 73–104 and later dates sort them last; `groupByLocalDay` keeps
  them in chronological day groups at the end).
- **Pickable only when both teams are known and kickoff is in the future.**
  Matches still showing placeholders (`2A` vs `2B`) appear as read-only
  "aguardando os times" cards.
- **Pick name** = the user's claimed participant name if set, else the Google
  profile name. `photoURL` from the profile.
- **Status (client-derived):** `scoreA` & `scoreB` present → `finished`; else
  kickoff passed → `live`; else `notstarted` (→ Upcoming). No `finished` flag is
  added to the knockout data and the poller is unchanged.
- The existing **Knockout Stage bracket tab stays** (view-only).
- Built fresh on the current stable `develop`; reuses `scorePrediction`,
  `dataPath`, `kickoffDate`. No old commits restored.

## Components / files

- Create `src/lib/knockoutCards.ts` (pure): `knockoutKickoff`,
  `knockoutStatus`, `isKnockoutPickable`, `buildKnockoutCards`. Unit-tested.
- Create `src/lib/useKnockoutPicks.ts` (RTDB hook).
- Modify `src/components/MatchesView.tsx`: accept `knockoutCards`, the user's
  picks, `onKnockoutPick`, `signedIn`, `onSignIn`; merge knockout cards into
  Upcoming/Finished; render the pick entry on knockout cards.
- Modify `src/App.tsx`: build the knockout cards from `useKnockout()` +
  `useKnockoutPicks`, compute the signed-in identity, pass everything to
  `MatchesView`. Group-stage `cards` (stats/evolution/etc.) are untouched.

## Out of scope

- Group-stage in-app picks (still sheet-sourced).
- A `finished`/live-clock signal for knockout (client-derived status is enough).
- Prod RTDB rules (demo node is open; a prod `knockoutPicks` rule —
  public read, `auth.uid === $uid` write — is a follow-up before shipping).

## Verification

- `tsc` + `npm run build` clean; new `knockoutCards` tests + existing suite green.
- Manual on `?demo`: knockout games appear at the end of Upcoming; with both
  teams seeded, a signed-in user sees the stepper and the saved pick lands in
  the predictions table and `demo/knockoutPicks` (prod untouched).
