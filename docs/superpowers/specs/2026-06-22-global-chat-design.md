# Single Global Chat — Design

## Context

The live chat (PR #1 + slash commands + `/celebrate`) is currently **per match**:
messages live at `chat/<matchNo>/<pushId>`, `useMatchChat(matchNo)` reads/writes
them, and `LiveChatPanel` opens per live match from the live bar (`LiveGames`).
The slash commands `/score`, `/picks`, `/whatif` use that match as context;
`/me`, `/help`, `/celebrate` are match-independent. Messages now show a
per-viewer-timezone timestamp.

This makes the chat a single global room, decoupled from matches.

## Goal

One global chat for everyone, opened from a floating button available on every
page at any time (not tied to live matches). The match-context slash commands
auto-target the single live match when there is exactly one.

## Decisions (approved)

- **Single room:** messages move to a flat global node `chatRoom/<pushId>` (the
  old per-match `chat/<matchNo>` data is abandoned/orphaned, harmless).
- **Access:** a **floating chat button** fixed at the bottom-right on every page
  opens the global chat panel (same slide-in style), anytime. Anonymous viewers
  see the existing identify CTA.
- **Slash commands:** `/me`, `/help`, `/celebrate` unchanged. `/score`,
  `/picks`, `/whatif` auto-use the **single** live match: the app passes the
  single live match card when exactly one is live, else `null`; with no single
  live match the command returns an ephemeral hint pointing to the Matches tab.
- **New RTDB rule** for `chatRoom` (append-only) — a manual console step.

## Architecture

### Data (RTDB, via `dataPath`)

```
chatRoom/<pushId> = {name, text, at}    // global, flat; at = serverTimestamp() ms
```

Replaces `chat/<matchNo>/<pushId>`. The old `chat` subtree is left orphaned.

### Hook — `src/lib/useChat.ts` (replaces `useMatchChat.ts`)

`useChat(): { messages: ChatMessage[]; send: (name: string, text: string) => void }`
— subscribes to the last 50 of `dataPath('chatRoom')` (same `limitToLast` +
mapping as `useMatchChat`, minus the `matchNo`), and `send` pushes to
`chatRoom`. `ChatMessage` shape unchanged (`{at, id, name, text}`).

### Component — `src/components/ChatPanel.tsx` (replaces `LiveChatPanel.tsx`)

Same slide-in panel and message rendering (including the per-viewer timezone
timestamps via the existing `formatMessageTime` helper), but:
- No `matchLabel` / `card` / `matchNo` props. Header reads "Live Chat" (global).
- Uses `useChat()`.
- For commands, receives the **single live match context** from `App`:
  `liveCard: MatchCard | null`, `participants`, `games`. The command context's
  `card` = `liveCard` (the single live match or null), `matchNo` =
  `liveCard?.matchNo ?? 0`.

### Floating button — `src/components/ChatButton.tsx` (new)

A fixed bottom-right button (chat icon) rendered by `App` on every page; toggles
the chat panel open. Works on all viewports.

### Command engine — `src/lib/chatCommands.ts`

`/score`, `/picks`, `/whatif` already read `ctx.card`. Change their no-card
message to a global-chat-appropriate hint: when `ctx.card` is null,
`/score` / `/picks` / `/whatif` return ephemeral
`"No single live match right now — check the Matches tab."` (covers 0 and 2+
live). `formatWhatIf` still uses `ctx.card` for teams + `ctx.matchNo`.

### App wiring — `src/App.tsx`

- Replace `chatMatchNo` state with `chatOpen: boolean`.
- Compute the single live match: `const liveCards = cards.filter(c => c.status === 'live'); const liveCard = liveCards.length === 1 ? liveCards[0] : null;`
- Render `<ChatButton onClick={() => setChatOpen(true)} />` and, when open,
  `<ChatPanel identity={...} liveCard={liveCard} games={games} participants={participants} onClose={...} onRequestIdentify={...} onCelebrate={celebrate} />`.
- Remove the per-match chat wiring.

### LiveGames — `src/components/LiveGames.tsx`

Remove the per-match chat preview / `onOpenChat` (chat is no longer per match).

## Out of scope

Migrating old `chat/<matchNo>` messages; unread badges/notifications on the
button; multiple rooms; moderation of `chatRoom` (owner moderation was a
deferred phase).

## Testing & verification

- Unit (vitest): `chatCommands` — update/verify the `/score`/`/picks`/`/whatif`
  no-live-match hint (ctx.card null → the Matches-tab hint); keep `/me`,
  `/celebrate`, `/help`, parsing tests green.
- `npm run build` clean.
- Manual on `?demo`: the floating button opens the global chat on any page;
  messages are shared (not per match); two browsers chat in one room; `/me`,
  `/celebrate` broadcast; with one live match `/score` works, with 0/2+ it
  hints; timestamps show in the viewer's tz.

## Branch & publishing

Work on `master`; build + test; manual test on `?demo`; then publish (push
master → deploy) and add the `chatRoom` RTDB rule in the console (the chat won't
work in prod without it). Provide the rule paste at publish.
