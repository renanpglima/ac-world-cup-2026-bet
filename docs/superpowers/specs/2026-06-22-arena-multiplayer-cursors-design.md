# Arena — Multiplayer Cursors & "Catch the Ball" — Design

## Context

The app is a static SPA on Firebase RTDB with realtime presence (`usePresence`)
and a broadcast pattern (`useLeaderHype`/cheers: write an incrementing node,
every client reacts via `onValue`). All RTDB paths go through `dataPath` so the
`?demo` subtree is isolated and open.

This adds a new page where online users' mouse cursors are shown live to
everyone (multiplayer cursors, Figma-style) plus a simple realtime game on top.

## Goal

A new "Arena" page: every online viewer's cursor moves live for everyone, and a
soccer ball spawns that players race to click — first click scores. Live,
cumulative scoreboard.

## Decisions (approved)

- **Game:** "Catch the Ball" — a ball spawns at a random spot; the first cursor
  to click it scores a point; a new ball spawns. Cumulative score per player.
- **Score never resets** (no reset control). Scores persist in RTDB.
- **All UI text in English.**
- **Desktop only** — the Arena nav entry shows only on desktop; on a small
  screen the page shows "Arena is available on desktop." Cursors track
  `mousemove` (no touch).
- **Branch: `master`** (work directly on master, committed locally; not pushed
  or published until the user approves). Separate from the `chat-commands` work.
- No RTDB rules change for `?demo` (open). Prod rule deferred.

## Architecture

### Data (RTDB, all via `dataPath`)

```
arena/cursors/<uid> = {x, y, name, at}   // x,y are fractions 0–1 of the field
arena/ball          = {id, x, y, claimedBy}   // x,y fractions; claimedBy = name|null
arena/scores/<name> = <number>           // cumulative points
```

- **Cursors:** on `mousemove` over the field, throttle to ~50ms and write
  `arena/cursors/<uid> = {x, y, name, at: serverTimestamp()}`, with `x,y` as
  fractions of the field rect. `onDisconnect().remove()` clears the cursor on
  leave. Every client renders the *other* cursors (not its own) as a pointer +
  name label.
- **Ball:** `arena/ball`. Clicking inside the ball's hit radius runs a
  transaction on `arena/ball`: if `claimedBy` is null, set it to the clicker's
  name (first write wins; later clicks abort). The winning client then
  increments `arena/scores/<name>` and writes a fresh ball (`nextBall`: new id,
  random position, `claimedBy: null`). Everyone sees the new ball + score via
  `onValue`.
- **Scores:** read `arena/scores`, render sorted descending. No reset.

### Identity

The cursor's `name` is the viewer's `identity.name` (the existing localStorage
name picker, present on `master`). An anonymous viewer sees a CTA to identify
(reuse `IdentityPrompt`); until then they can watch but their cursor is not
broadcast and they cannot score.

### Pure helpers — `src/lib/arena.ts` (testable, vitest node env)

```ts
interface Ball { claimedBy: string | null; id: number; x: number; y: number }

randomBallPosition(): {x: number; y: number}
  // both in [0.08, 0.92], away from edges

isBallHit(x: number, y: number, ball: Ball, radius: number): boolean
  // Euclidean distance in fraction space < radius

nextBall(prevId: number): Ball
  // {id: prevId + 1, ...randomBallPosition(), claimedBy: null}

sortScores(scores: Record<string, number>): [string, number][]
  // entries sorted by count desc, then name asc
```

### Hook — `src/lib/useArena.ts`

Subscribes to `arena/cursors`, `arena/ball`, `arena/scores`. Exposes:

```ts
{
  ball: Ball | null;
  cursors: {uid: string; x: number; y: number; name: string}[]; // others only
  scores: [string, number][];
  moveCursor: (x: number, y: number) => void;  // throttled write
  tryClaim: (x: number, y: number) => void;     // hit test + transaction + score + respawn
}
```

`moveCursor`/`tryClaim` no-op when the viewer has no identity.

### Page — `src/components/ArenaView.tsx`

- `sm:hidden` block: "Arena is available on desktop."
- `hidden sm:block` block: the field — a bordered area filling the content
  width/height. `onMouseMove` → `moveCursor(fractions)`; `onClick` →
  `tryClaim(fractions)`. Renders the ball (⚽ at its fraction position), other
  players' cursors (pointer + name), and a scoreboard panel (sorted scores,
  doubles as the who's-playing roster). Identity CTA when anonymous.

### Routing & nav — `src/App.tsx`, `src/components/NavBar.tsx`

- New route `/arena` → `<ArenaView .../>` (pass `identity`, `onRequestIdentify`).
- Add an "Arena" `NavLink` to `NavBar` (desktop top nav) only. Do **not** add it
  to `NavDrawer` (the mobile menu), so it stays desktop-only.

## Out of scope

Score reset; touch/mobile play; cursor trails/emotes; spectator chat; anti-cheat
beyond the first-write-wins transaction; persisting cursors across reloads.

## Testing & verification

- Unit (vitest): `randomBallPosition` (within [0.08, 0.92]), `isBallHit`
  (inside/outside radius, exact edge), `nextBall` (id increments, claimedBy
  null, position in range), `sortScores` (desc by count, tie broken by name).
- `npm run build` clean; existing tests stay green.
- Manual on `?demo` (desktop, two browsers): cursors move live for both; the
  ball is clickable; first click scores and respawns; scoreboard updates live;
  a second clicker on the same ball does not double-score.

## Branch & publishing

Work on `master` locally; commit there. Not pushed/published until approved.
(When `chat-commands` later merges, both touch `App.tsx`/nav — a small,
expected merge reconciliation.)
