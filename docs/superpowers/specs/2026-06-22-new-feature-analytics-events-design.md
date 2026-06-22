# Analytics Cloud Custom Events for New Features — Design

## Context

The app already sends custom events to Liferay Analytics Cloud via
`acTrack(eventId, properties)` (`src/lib/analyticsCloud.ts` →
`window.Analytics.track`). Existing events: `participant_opened`,
`player_reaction {emoji, player}`, `match_reaction {emoji, matchNo}`,
`goal_celebration_shown` / `goal_celebration_click`, `cheer_sent`,
`leader_trophy {leader}`, `identified {name}`, `whatif_adjusted {matchNo}`.
`acTrack` is called directly from both `App.tsx` and components (e.g.
`WhatIfPanel.tsx`), so call-site tracking is the established convention.

The features shipped recently — the global chat, slash commands, `/celebrate`,
chat-message reactions, and the Arena minigame — emit **no** custom events yet.
This instruments them.

## Goal

Add custom AC events covering the new features' engagement funnels, reusing the
existing `acTrack` call-site convention, without introducing high-volume noise.

## Events (approved)

snake_case `eventId`, prefixed by area, with small flat numeric/string props:

| Event | Props | Fires when |
|---|---|---|
| `chat_opened` | — | the floating chat button is clicked |
| `chat_message_sent` | `{length}` | a non-command message is sent (`parseChatInput` kind `message`) |
| `chat_command_used` | `{command}` | a slash command is submitted; `command` ∈ `score`/`picks`/`whatif`/`me`/`help`/`celebrate`/`unknown` |
| `chat_reaction` | `{emoji, action}` | a reaction chip/picker is clicked; `action` ∈ `add`/`remove` |
| `celebrate_sent` | `{name}` | a client triggers `/celebrate <name>` |
| `celebrate_shown` | `{name}` | the celebrate overlay renders (per client — the reach metric, mirrors `goal_celebration_shown`) |
| `arena_opened` | — | the Arena view mounts (navigation to `/arena`) |
| `arena_ready` | — | a client marks itself READY (not on cancel) |
| `arena_ball_caught` | `{kind, points}` | a client's claim transaction commits; `kind` ∈ `normal`/`basket`/`gold` |
| `arena_round_finished` | `{score, rank, players}` | per client, on the `playing → waiting` transition (`rank` 0 = did not place) |

## Architecture / placement

Each event is a one-line `acTrack(...)` at the call site, mirroring the existing
events. No new pure logic.

- **`src/App.tsx`** (already imports `acTrack`):
  - `chat_opened` — the `ChatButton` `onClick`.
  - `celebrate_sent` — wrap the `onCelebrate={celebrate}` prop passed to `ChatPanel`.
  - `celebrate_shown` — in the existing celebrate effect, right after `setCelebrating(celebrateEvent.name)`.
- **`src/components/ChatPanel.tsx`** (add imports `acTrack`, and `parseChatInput`
  alongside the existing `runChatCommand` import):
  - `chat_message_sent` / `chat_command_used` — in `submit()`, branch on
    `parseChatInput(draft).kind` (`message` → sent, else → command).
  - `chat_reaction` — in the per-message `Reactions` `onReact`; compute
    `action` from `chatReactions.mine[msg.id]` **before** toggling.
- **`src/lib/useArena.ts`** (add import `acTrack`):
  - `arena_ball_caught` — inside `tryClaim`'s committed block, using the claim's
    `ball.kind` and `value`. Tracked here (not at the click site) because only
    the commit knows the claim *won* — call-site tracking would count misses.
- **`src/components/ArenaView.tsx`** (add import `acTrack`):
  - `arena_opened` — a mount effect (`useEffect(..., [])`).
  - `arena_ready` — the READY button `onClick`, gated on `!isReady`.
  - `arena_round_finished` — a `useEffect([phase])` detecting `playing → waiting`
    via a `prevPhase` ref, reading this client's `{identity, present, ranked,
    scores}` from a ref (so the effect depends only on `phase`, staying
    exhaustive-deps-clean like the file's existing ref-based effects). `rank` =
    index of `identity` in `ranked` + 1, or `0` if absent. Gated on `identity`.

## Volume / correctness guardrails

- **No cursor-movement tracking.** The shared Arena cursors stream continuously
  (`moveCursor` throttled to 50ms) — tracking them would flood AC. Excluded.
- **Broadcast double-count.** Broadcast events fire `onValue` on every client.
  `celebrate_shown` firing per client is intentional (reach). For Arena round
  end, we track per-client `arena_round_finished` (each client logs its own
  score/rank) rather than a single global "round started" that every client
  would double-count.
- **`arena_ball_caught` once per catch** — guarded by the claim transaction
  commit, so only the winning client logs it.

## Out of scope

Server-side validation of events, dashboards/segments in AC, a `chat_closed`
event, per-emoji reaction analytics beyond `{emoji, action}`, arena spectator
vs participant distinction beyond `score`/`rank`.

## Testing & verification

- No new pure logic; the existing 191 unit tests stay green; `npm run build`
  clean. `parseChatInput` is already unit-tested.
- AC delivery is not locally verifiable (the SDK posts to the internal
  publisher), so correctness rests on mirroring the proven existing `acTrack`
  call-sites + a fresh-eyes review of placement (double-count, miss-count, and
  add/remove correctness).

## Branch & publishing

Work on `master`; build + tests; then publish (push → `deploy.yml`). No RTDB
rule needed (analytics writes go to AC, not Firebase).
