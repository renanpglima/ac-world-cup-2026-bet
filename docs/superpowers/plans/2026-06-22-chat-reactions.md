# Chat Message Reactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let anyone react to a chat message with emojis (live-counted chips + a "+" picker), reusing the existing `Reactions` component and reaction engine.

**Architecture:** A new RTDB node `chatReactions/<msgId>/<emoji>/<uid> = true` (separate from the append-only `chatRoom`). A one-line hook `useChatReactions()` reuses `useReactionTree(dataPath('chatReactions'))`. `ChatPanel` calls it and renders the existing `Reactions` component under each message bubble; each message row gets a `group` class so the picker's "+" reveals on hover.

**Tech Stack:** React 19 + TypeScript, Firebase RTDB (client SDK + anonymous auth), Tailwind 4, Vite, Vitest.

## Global Constraints

- Work on `master`; commits `--no-gpg-sign`, title-only (no body, no trailers).
- Push only to `interaminense/ac-world-cup-2026-bet`, never any Liferay remote.
- All reaction data goes through `dataPath(...)` so `?demo` isolates a demo subtree.
- Reuse the existing `Reactions` component and `useReactionTree` engine — do not fork or reimplement them.
- No full-screen burst for chat reactions (unlike App's player/match `react`); `onReact` only toggles the count.

---

### Task 1: Chat message reactions (hook + ChatPanel wiring)

**Files:**
- Modify: `src/lib/useReactions.ts` (add `useChatReactions` export, alongside `useReactions`/`useMatchReactions`)
- Modify: `src/components/ChatPanel.tsx` (import + call the hook; render `Reactions` per message; add `group` to each message row)

**Interfaces:**
- Consumes: `useReactionTree(rootPath: string): ReactionsApi` and `dataPath(path: string): string` (both already in `src/lib/useReactions.ts` / `src/lib/dataRoot.ts`). `ReactionsApi = {counts: Record<string, Record<string, number>>; mine: Record<string, string[]>; toggle: (key: string, emoji: string) => void}`. The `Reactions` component from `./Reactions` with props `{counts: Record<string, number>; mine: string[]; onReact: (emoji: string) => void; collapsible?: boolean}`.
- Produces: `useChatReactions(): ReactionsApi`.

- [ ] **Step 1: Add the `useChatReactions` export**

In `src/lib/useReactions.ts`, after the existing `useMatchReactions` function, add:

```ts
// Reactions on each chat message (keyed by chatRoom push id).
export function useChatReactions(): ReactionsApi {
	return useReactionTree(dataPath('chatReactions'));
}
```

- [ ] **Step 2: Import the hook and `Reactions` in ChatPanel**

In `src/components/ChatPanel.tsx`, add these imports next to the existing ones (keep import order — `Avatar` is imported from `./Avatar`; add `Reactions` from `./Reactions`, and `useChatReactions` from `../lib/useReactions`):

```ts
import {useChatReactions} from '../lib/useReactions';
import {Avatar} from './Avatar';
import {Reactions} from './Reactions';
```

- [ ] **Step 3: Call the hook in the component body**

In `ChatPanel`, right after `const {messages, send} = useChat();`, add:

```ts
const chatReactions = useChatReactions();
```

- [ ] **Step 4: Add `group` to each message row**

In the `messages.map(...)` render, the outer message `div` currently is:

```tsx
<div
	className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
	key={msg.id}
>
```

Change its className to include `group` (so the `Reactions` "+" button, which is `sm:group-hover:opacity-100`, reveals on hover):

```tsx
<div
	className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
	key={msg.id}
>
```

- [ ] **Step 5: Render `Reactions` under each bubble**

Inside the inner column `div` (the one with `flex max-w-[75%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`), after the timestamp block:

```tsx
{timeLabel && (
	<span className="text-[10px] text-slate-500">
		{timeLabel}
	</span>
)}
```

add the reactions row:

```tsx
<Reactions
	counts={chatReactions.counts[msg.id] ?? {}}
	mine={chatReactions.mine[msg.id] ?? []}
	onReact={(emoji) => chatReactions.toggle(msg.id, emoji)}
/>
```

The column's `items-end`/`items-start` alignment carries to the reactions automatically.

- [ ] **Step 6: Run existing unit tests**

Run: `npm test`
Expected: PASS (no new pure logic; `chatCommands`/arena/etc. tests stay green).

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: clean TypeScript build, no type errors.

- [ ] **Step 8: Manual check on `?demo`**

Run the dev server, open the app with `?demo`, open the chat. Hover a message → "+" appears → pick an emoji → a chip with count 1 shows; click the chip again → it toggles off (chip disappears); a second browser/profile sees the count live; verify it works on both my messages (right-aligned) and others' (left-aligned).

- [ ] **Step 9: Commit**

```bash
git add src/lib/useReactions.ts src/components/ChatPanel.tsx
git commit --no-gpg-sign -m "Add emoji reactions to chat messages"
```

---

## Self-Review

- **Spec coverage:** data node (Step 1 hook → `chatReactions`), hook (Step 1), UI per-message reuse of `Reactions` (Steps 2–5), hover-reveal `group` (Step 4), no-burst (no `fireBurst` wired), testing (Steps 6–8), publish handled separately after the task. All covered.
- **Placeholder scan:** none — every step has concrete code/commands.
- **Type consistency:** `useChatReactions(): ReactionsApi`; `chatReactions.counts[msg.id]` is `Record<string, number> | undefined` → `?? {}` matches `Reactions`'s `counts: Record<string, number>`; `chatReactions.mine[msg.id]` is `string[] | undefined` → `?? []` matches `mine: string[]`; `toggle(key, emoji)` matches `onReact(emoji)` via the `msg.id` closure. Consistent.

## Post-task: publish

After Task 1 is committed and reviewed: push `master`, watch `deploy.yml`, and add the `chatReactions` RTDB rule in the Firebase console (paste provided at publish):

```json
"chatReactions": {
  ".read": true,
  "$msgId": { "$emoji": { "$uid": {
    ".write": "auth != null && auth.uid === $uid",
    ".validate": "newData.isBoolean()"
  } } }
}
```
