# Knockout Picks in Upcoming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]`.

**Goal:** Logged-in users predict knockout matches from Matches → Upcoming, reusing the match-card UX; picks score with the existing rules.

**Architecture:** A pure builder turns `KnockoutMatch[]` + in-app picks into `MatchCard[]`; a new RTDB hook stores per-user picks (demo-aware); `MatchesView` appends those cards to Upcoming/Finished and renders a pick stepper on them. Group-stage cards, stats, and the bracket tab are untouched.

**Tech Stack:** Vite 7, React 19, TS, Tailwind 4, Vitest (node-env → pure logic only), Firebase RTDB.

## Global Constraints

- Reuse `scorePrediction` (lib/scoring), `dataPath` (lib/dataRoot), `kickoffDate` (lib/kickoff). No poller change.
- Demo-aware: all pick paths via `dataPath('knockoutPicks')`.
- Commits `--no-gpg-sign`, title-only, on `develop`. Don't push.
- Pure-logic tests only (node-env). View/hook verified by build + tsc + manual demo.

---

### Task 1: Knockout → MatchCard pure logic

**Files:** Create `src/lib/knockoutCards.ts`, `src/lib/knockoutCards.test.ts`.

**Produces:**
- `interface KnockoutPick {name: string; p1: number; p2: number; at?: number; uid?: string; photoURL?: string | null}`
- `knockoutKickoff(iso: string | null): {date: string; time: string} | null` — ISO → `"Jun/29"`/`"17:30"` at -03:00; null on null/invalid.
- `knockoutStatus(m: KnockoutMatch, nowMs: number): MatchStatus` — scores present → `finished`; kickoff passed → `live`; else `notstarted`.
- `isKnockoutPickable(m: KnockoutMatch, nowMs: number): boolean` — both teams + valid date + `nowMs < kickoff`.
- `buildKnockoutCards(matches, picksByMatch, nowMs): MatchCard[]` — sorted by matchNumber; `team1=teamA??a`, `team2=teamB??b`, `group=stage`, `matchNo=matchNumber`, date/time from `knockoutKickoff`, `r1/r2` when resolved, `status` from `knockoutStatus`, `entries` = picks mapped to `{name,p1,p2, points: resolved ? scorePrediction(p1,p2,scoreA,scoreB) : null}`.

- [ ] **Step 1: failing tests** covering: `knockoutKickoff('2026-06-29T20:30:00Z') === {date:'Jun/29', time:'17:30'}` and round-trips through `kickoffDate`; null/invalid → null; `knockoutStatus` three cases; `isKnockoutPickable` true/false; `buildKnockoutCards` maps a match with two picks → a card with 2 entries, points null when unresolved and `25` for an exact pick when `scoreA/scoreB` set, `team1` placeholder when `teamA` null.
- [ ] **Step 2:** run `npx vitest run src/lib/knockoutCards.test.ts` → FAIL (missing module).
- [ ] **Step 3:** implement `knockoutCards.ts`.
- [ ] **Step 4:** run tests → PASS.
- [ ] **Step 5:** commit `Add knockout match-card builder and helpers`.

---

### Task 2: Picks hook

**Files:** Create `src/lib/useKnockoutPicks.ts`.

**Produces:** `useKnockoutPicks(identity: {uid: string; name: string; photoURL: string | null} | null): {byMatch: Record<number, KnockoutPick[]>; mine: Record<number, KnockoutPick>; setPick: (matchNo: number, p1: number, p2: number) => void}`. Subscribes to `dataPath('knockoutPicks')`; `setPick` writes `${dataPath('knockoutPicks')}/${uid}/${matchNo} = {at: serverTimestamp(), name, photoURL, p1, p2}`. `mine` = picks where `uid === identity.uid`.

- [ ] Implement following the `useCheers` pattern (`onValue` + `set`). Verified by Task 4 build.
- [ ] Commit `Add demo-aware knockout picks hook`.

---

### Task 3: MatchesView pick entry

**Files:** Modify `src/components/MatchesView.tsx`.

- [ ] Add props: `knockoutCards: MatchCard[]`, `knockoutPick: {info: Record<number, {pickable: boolean; myPick?: {p1: number; p2: number}}>; onPick: (matchNo: number, p1: number, p2: number) => void; signedIn: boolean; onSignIn?: () => void}`.
- [ ] `upcoming = [...group upcoming, ...knockout upcoming]`, `finished = [...group finished, ...knockout finished]` (knockout split by `status`). Bracket sub-tab unchanged.
- [ ] Thread `knockoutPick` through `MatchSection` to `MatchCardArticle`. In the article, when `knockoutPick.info[card.matchNo]` exists: render a pick row below the score line — signed-out → "👋 Entre com Google para palpitar" (`onSignIn`); pickable → "Seu palpite:" + `team1` flag + stepper(p1) + `×` + stepper(p2) + `team2` flag, calling `onPick` on change, seeded from `myPick`; not pickable → muted "Aguardando os times".
- [ ] Stepper: `−`/value/`+`, clamp 0–20.
- [ ] Commit `Add knockout pick entry to the matches Upcoming cards`.

---

### Task 4: App wiring

**Files:** Modify `src/App.tsx`.

- [ ] `const knockoutMatches = useKnockout();`
- [ ] `const knockoutIdentity = !auth.isAnonymous && auth.user ? {uid: auth.user.uid, name: <claimed participant name> ?? auth.profile?.name ?? 'Player', photoURL: auth.profile?.photoURL ?? null} : null;`
- [ ] `const {byMatch, mine, setPick} = useKnockoutPicks(knockoutIdentity);`
- [ ] `const knockoutCards = useMemo(() => buildKnockoutCards(knockoutMatches, byMatch, Date.now()), [knockoutMatches, byMatch]);`
- [ ] `const knockoutInfo = useMemo(() => Object.fromEntries(knockoutMatches.map((m) => [m.matchNumber, {pickable: isKnockoutPickable(m, Date.now()), myPick: mine[m.matchNumber] ? {p1: mine[m.matchNumber].p1, p2: mine[m.matchNumber].p2} : undefined}])), [knockoutMatches, mine]);`
- [ ] Pass `knockoutCards` + `knockoutPick={{info: knockoutInfo, onPick: setPick, signedIn: !auth.isAnonymous && !!auth.user, onSignIn: auth.signIn}}` to `<MatchesView>`. Group `cards` (stats/evolution/liveGames) unchanged.
- [ ] Commit `Surface knockout matches with picks in the Upcoming tab`.

---

### Final: verify

- [ ] `npx tsc --noEmit` + `npm run build` + `npx vitest run` all green.
- [ ] On `?demo` (seed two knockout matches with both teams + future date): the knockout games appear at the end of Upcoming; signed-out shows the CTA; signed-in shows the stepper, the saved pick lands in the predictions table and `demo/knockoutPicks`.
- [ ] Screenshot. Do NOT push.

## Self-Review

Spec coverage: cards in Upcoming (T1+T3+T4), in-app picks (T2+T3+T4), same table+scoring (T1 entries via `scorePrediction`), pickable gating + placeholders (T1 `isKnockoutPickable` + T3), status/end-ordering (T1 `knockoutStatus` + matchNo sort), demo-aware (T2 `dataPath`), bracket tab untouched (T3 note). Types: `KnockoutPick`, `MatchCard`/`MatchEntry`, `MatchStatus`, `scorePrediction(p1,p2,r1,r2)`, `kickoffDate(date,time)` consistent across tasks.
