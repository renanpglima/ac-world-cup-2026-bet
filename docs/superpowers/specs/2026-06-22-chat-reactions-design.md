# Chat Message Reactions — Design

## Context

The chat is now a single global room (`chatRoom/<msgId>`), rendered by
`ChatPanel` via `useChat()`. The app already has a reusable reaction system:
`useReactionTree(rootPath)` (returns `{counts, mine, toggle}` keyed by an
arbitrary string), with `useReactions`/`useMatchReactions` built on it, and a
`Reactions` component (`{counts, mine, onReact, collapsible?}`) that renders
emoji chips + counts + a "+" picker (full emoji set). Reaction data lives at
`<root>/<key>/<emoji>/<uid> = true`.

This adds emoji reactions to each chat message, reusing those pieces.

## Goal

Each chat message can be reacted to with emojis — chips with live counts plus a
"+" picker — using the existing reaction component and engine.

## Decisions (approved)

- **Reuse** the existing `Reactions` component + `useReactionTree`.
- **New node** `chatReactions/<msgId>/<emoji>/<uid> = true` (separate from
  `chatRoom`, which is append-only and can't hold nested reaction writes). Same
  shape as the existing `reactions` node.
- **No full-screen burst** for chat reactions — just live counts (Slack-style).
- The "+" picker shows on message hover (wrap each message row in `group`).

## Architecture

### Data (RTDB, via `dataPath`)

```
chatReactions/<msgId>/<emoji>/<uid> = true   // msgId = chatRoom push id
```

New RTDB rule (same shape as `reactions`), a manual console step at publish.

### Hook — `src/lib/useReactions.ts`

Add one export reusing the existing engine:

```ts
export function useChatReactions(): ReactionsApi {
	return useReactionTree(dataPath('chatReactions'));
}
```

### UI — `src/components/ChatPanel.tsx`

- Call `const chatReactions = useChatReactions();`.
- Each message's inner column (the one already aligned `items-end`/`items-start`
  for me/others) renders, after the timestamp, the existing `Reactions`:
  ```tsx
  <Reactions
    counts={chatReactions.counts[msg.id] ?? {}}
    mine={chatReactions.mine[msg.id] ?? []}
    onReact={(emoji) => chatReactions.toggle(msg.id, emoji)}
  />
  ```
- Wrap each message row in a `group` class so the `Reactions` "+" (which is
  `sm:group-hover:opacity-100`) reveals on hover. Reactions inherit the column's
  me/others alignment automatically.

No burst wiring (unlike App's player/match `react` which calls `fireBurst`) —
`onReact` only toggles the count.

## Out of scope

A restricted chat-only emoji set (the full picker is reused); reaction
animations/bursts; reactions on the ephemeral "only you" command lines;
notifications.

## Testing & verification

- No significant new pure logic (reuses `useReactionTree`); existing tests stay
  green. `npm run build` clean.
- Manual on `?demo`: hover a message → "+" appears → pick an emoji → a chip with
  count shows; a second client sees it live; toggling off removes it; works on
  both my and others' messages with correct alignment.

## Branch & publishing

Work on `master`; build + test; then publish (push → deploy) and add the
`chatReactions` RTDB rule in the console (reactions won't persist in prod
without it). Rule (same shape as `reactions`):

```json
"chatReactions": {
  ".read": true,
  "$msgId": { "$emoji": { "$uid": {
    ".write": "auth != null && auth.uid === $uid",
    ".validate": "newData.isBoolean()"
  } } }
}
```
