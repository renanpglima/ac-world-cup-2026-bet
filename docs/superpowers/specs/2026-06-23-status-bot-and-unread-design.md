# Match Status Bot + Chat Unread Badge — Design

## Context

The app has a single global chat (`chatRoom/<pushId> = {name, text, at}`, read by
`useChat`, rendered by `ChatPanel`, opened from the floating `ChatButton`). Live
scores come from a poller (`scripts/push-scores.mjs`) that runs every minute on a
free VM: it fetches games (FIFA/ESPN/worldcup26 sources), diffs against the RTDB
`games` node, and pushes only on change — then refreshes the AI commentary
(`scripts/commentary-core.mjs`) and a Slack digest. The poller uses
`firebase-admin` (bypasses RTDB rules).

This adds (1) an automated **status bot** that posts to the chat on match
kickoff, goals, and full time, and (2) an **unread badge** on the chat button.

## Goal

- A bot posts a chat message when a match goes live, when a goal is scored, and
  at full time — with flag emoji and the score.
- The chat button shows a count of unread messages; opening the chat clears it.

## Decisions (approved)

- **Bot runs in the poller (server-side), not the client.** The poller is the
  single writer that already diffs `games` every minute and holds the admin SDK,
  so each transition is detected and posted exactly once. A client-side bot would
  have every open browser post duplicates.
- **Bot messages are language-neutral** (emoji + team names + score + universal
  words: LIVE / GOOOAL / FT). The `chatRoom` text is one shared string for all
  viewers, so it cannot be localized per-viewer like the AI commentary.
- **Goal scorer is out of scope.** The FIFA calendar API we poll returns scores,
  not goal events, so a goal announces the scoring team only.
- **Unread is per-device** (`lastReadAt` in `localStorage`), initialized to "now"
  on first load (no false unread for history). Bot messages count as unread; the
  viewer's own messages do not.

## Architecture

### Server — the bot

**`scripts/match-bot.mjs`** (new; mirrors `commentary-core.mjs` as a pure-ish
engine + a thin post step):

- `detectMatchEvents(previousGames, games)` — pure function. Matches games by
  `id`, derives each side's status (`finished` / `notstarted` / `live` via the
  same rules as `src/lib/games.ts`: `finished` if `finished || timeElapsed ===
  'finished'`; `notstarted` if `timeElapsed === 'notstarted'`; else `live`), and
  returns an ordered list of events:
  - `{type: 'kickoff', game}` when status goes `notstarted → live`.
  - `{type: 'goal', game, side, prev, next}` when `homeScore`/`awayScore`
    increases while not finished (`side` is `'home'|'away'`; one event per side
    that increased; if a side jumps by >1 in a tick, still one event with the new
    score).
  - `{type: 'final', game}` when status goes `live → finished` (or
    `notstarted → finished`, e.g. a fast-forwarded tick).
  - A game absent from `previousGames` (first ever poll) yields no events — we
    only announce real transitions, never backfill history.
- `formatEvent(event)` — pure function → the message string, e.g.
  `⚽ GOOOOAL! 🇫🇷 France — France 1-0 Iraq`. Uses `teamFlagEmoji` (below).
- `postMatchEvents(db, previousGames, games)` — runs `detectMatchEvents`, then
  for each event `push`es `{name: BOT_NAME, text, at: serverTimestamp()}` to
  `dataPath('chatRoom')`. `BOT_NAME = '⚽ Match Bot'`.

Wired into **`scripts/push-scores.mjs`**: in the block that already has both
`previous` (from `db.ref('games').once('value')`) and the freshly fetched
`games`, call `postMatchEvents(db, previous?.games ?? null, games)` **before**
writing the new `games` (so the diff is against the prior state). Runs only when
games changed (the existing early-return on "unchanged" still applies), and is
idempotent because the next tick's `previous` becomes this tick's new state.

### Shared — flag emoji (DRY)

- Extract the name→code map out of `src/lib/flags.ts` into
  **`src/data/team-flags.json`** (`{"France": "fr", "Iraq": "iq", ...}` — the
  existing flagcdn codes, incl. `gb-eng`/`gb-sct`/`gb-wls`).
- `src/lib/flags.ts` imports the JSON instead of the inline literal (behavior
  unchanged).
- **`scripts/flag-emoji.mjs`** (new): imports the JSON and exposes
  `teamFlagEmoji(name)` → flag emoji. Two-letter ISO codes map to regional
  indicator symbols (`fr` → 🇫🇷); `gb-eng`/`gb-sct`/`gb-wls` map to the special
  England/Scotland/Wales emoji sequences; unknown names fall back to `🏳️`. Uses
  the same name-normalization approach as `flags.ts` for fuzzy matches.

### Client — unread badge

- **`src/lib/useChatUnread.ts`** (new): `useChatUnread(myName: string | null):
  {unread: number; markRead: () => void}`.
  - Subscribes to `dataPath('chatRoom')` with `limitToLast(50)` (the Firebase SDK
    shares the listener with `useChat`'s identical query, so no extra network
    cost).
  - Reads `lastReadAt` from `localStorage` (key `wc2026.chatLastReadAt`); on first
    ever load (no stored value) seeds it to the latest message's `at` (or
    `Date.now()` if empty) so history is not counted.
  - `unread` = count of messages with `at > lastReadAt && name !== myName`.
  - `markRead()` sets `lastReadAt` to the latest message's `at` (or `Date.now()`),
    persists it, and updates state so `unread` becomes 0.
- **`src/components/ChatButton.tsx`**: add an optional `unread?: number` prop;
  when `> 0`, render a small badge (rounded count, e.g. `9+` cap) at the top-right
  of the button.
- **`src/App.tsx`**: `const {unread, markRead} = useChatUnread(identity.name);`
  pass `unread` to `ChatButton`; call `markRead()` in the chat-open handler
  (where `setChatOpen(true)` is called, including the floating button click).

### Optional polish — bot message styling

`ChatPanel` may detect `msg.name === '⚽ Match Bot'` and render it as a centered,
muted system line (like the ephemeral command lines, but persisted) instead of a
normal bubble, so kickoffs/goals/finals stand out. Low-risk; included if it
stays small.

## Out of scope

Goal scorer names; per-viewer localized bot text; a "bot" RTDB rule (admin SDK
bypasses rules); unread persistence across devices; muting the bot.

## Testing & verification

- Unit (vitest, node env — pure logic only):
  - `match-bot`: `detectMatchEvents` across kickoff / goal (home & away) / final /
    no-previous / multi-event ticks; `formatEvent` strings.
  - `flag-emoji`: `teamFlagEmoji` for a 2-letter code, a `gb-*` subdivision, and
    an unknown name.
  - unread: the pure count (messages + lastReadAt + myName → unread) extracted as
    a testable helper.
  - `flags.ts` existing tests stay green after the JSON extraction.
- `npm run build` clean; full suite green.
- Manual on `?demo`: badge increments on a new message while the chat is closed
  and clears on open; (bot transitions are exercised by the live poller).

## Branch & publishing

Work on `master`; build + tests; then publish (push → `deploy.yml`) and
`git pull` on the VM so the poller picks up the bot. No RTDB rule needed.
