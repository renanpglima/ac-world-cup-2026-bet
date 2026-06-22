# Single Global Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the per-match chat with one global chat opened from a floating button on every page; match-context slash commands auto-target the single live match.

**Architecture:** Messages move to a flat `chatRoom/<pushId>` node (new `useChat`). A floating `ChatButton` toggles a global `ChatPanel` (adapted from `LiveChatPanel`). The app passes the single live match (or null) so `/score`/`/picks`/`/whatif` work when exactly one is live, else hint. The per-match chat in `LiveGames` is removed.

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind 4, Firebase RTDB, Vitest (node env → pure-logic tests only).

## Global Constraints

- Branch: work on `master` (already checked out). Commit locally; publish (push) only at the end after build/tests pass.
- All RTDB via `dataPath`. New node `chatRoom/<pushId> = {name, text, at}`.
- English UI. Commit `--no-gpg-sign`, title-only. Keep tests green.
- Slash commands: `/me`, `/help`, `/celebrate` unchanged; `/score`/`/picks`/`/whatif` use the single live match (`ctx.card`) or return the no-live-match hint.
- The chat won't work in prod until the `chatRoom` rule is published (manual console step at the end).

---

## File Structure

- `src/lib/chatCommands.ts` (modify) — no-single-live-match hint for the 3 match commands.
- `src/lib/chatCommands.test.ts` (modify) — test the hint.
- `src/lib/useChat.ts` (create) — global chat hook.
- `src/components/ChatPanel.tsx` (create) — global chat panel.
- `src/components/ChatButton.tsx` (create) — floating open button.
- `src/App.tsx` (modify) — `chatOpen` state, `liveCard`, render button + panel.
- `src/components/LiveGames.tsx` (modify) — remove per-match chat.
- `src/lib/useMatchChat.ts`, `src/components/LiveChatPanel.tsx` (delete).

---

### Task 1: No-single-live-match hint for match commands

**Files:**
- Modify: `src/lib/chatCommands.ts`
- Modify: `src/lib/chatCommands.test.ts`

**Interfaces:**
- Produces: `runChatCommand` returns an ephemeral "no single live match" hint for `/score`/`/picks`/`/whatif` when `ctx.card` is null.

- [ ] **Step 1: Add the failing tests**

Append to `src/lib/chatCommands.test.ts`:

```ts
describe('runChatCommand match commands without a single live match', () => {
	const noLive = {...ctx, card: null};

	it('hints for /score, /picks, /whatif when no single live match', () => {
		const hint = 'No single live match right now — check the Matches tab.';

		expect(runChatCommand('/score', noLive).ephemeral).toBe(hint);
		expect(runChatCommand('/picks', noLive).ephemeral).toBe(hint);
		expect(runChatCommand('/whatif 2-1', noLive).ephemeral).toBe(hint);
	});

	it('still scores against a live card when present', () => {
		expect(runChatCommand('/score', ctx).ephemeral).toContain('Mexico');
	});
});
```

(`ctx` and `liveCard` already exist at the top of this test file from the earlier chat-commands tests.)

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/lib/chatCommands.test.ts`
Expected: FAIL — `/score` with null card currently returns 'No live score right now.', not the hint.

- [ ] **Step 3: Implement in `src/lib/chatCommands.ts`**

Add the constant near the top (after `HELP_TEXT`):

```ts
const NO_LIVE_MATCH = 'No single live match right now — check the Matches tab.';
```

In `runChatCommand`, replace the three match-command cases with card-guarded versions:

```ts
		case 'picks':
			return ctx.card
				? {ephemeral: formatPicks(ctx.card)}
				: {ephemeral: NO_LIVE_MATCH};
		case 'score':
			return ctx.card
				? {ephemeral: formatScore(ctx.card)}
				: {ephemeral: NO_LIVE_MATCH};
```

and

```ts
		case 'whatif':
			return ctx.card
				? {ephemeral: formatWhatIf(ctx, arg)}
				: {ephemeral: NO_LIVE_MATCH};
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run src/lib/chatCommands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/chatCommands.ts src/lib/chatCommands.test.ts
git commit --no-gpg-sign -m "Hint when a match command runs with no single live match"
```

---

### Task 2: Global chat — hook, panel, floating button, wiring

**Files:**
- Create: `src/lib/useChat.ts`
- Create: `src/components/ChatPanel.tsx`
- Create: `src/components/ChatButton.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/LiveGames.tsx`
- Delete: `src/lib/useMatchChat.ts`, `src/components/LiveChatPanel.tsx`

**Interfaces:**
- Consumes: `runChatCommand` (Task 1); `MatchCard` (`../lib/matches`), `Game`, `Participant` (`../lib/types`); `Avatar`.
- Produces: `useChat(): {messages: ChatMessage[]; send: (name, text) => void}`; `ChatPanel({identity, liveCard, games, participants, onCelebrate, onClose, onRequestIdentify})`; `ChatButton({onClick})`.

- [ ] **Step 1: Create `src/lib/useChat.ts`**

```ts
import {limitToLast, onValue, push, query, ref, serverTimestamp} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db, signedIn} from './firebase';

export interface ChatMessage {
	at: number;
	id: string;
	name: string;
	text: string;
}

// chatRoom/<pushId> = {name, text, at} — one global room for everyone.
export function useChat(limit = 50): {
	messages: ChatMessage[];
	send: (name: string, text: string) => void;
} {
	const [messages, setMessages] = useState<ChatMessage[]>([]);

	useEffect(
		() =>
			onValue(
				query(ref(db, dataPath('chatRoom')), limitToLast(limit)),
				(snapshot) => {
					const raw = snapshot.val() as Record<
						string,
						{at: number; name: string; text: string}
					> | null;

					if (!raw) {
						setMessages([]);

						return;
					}

					setMessages(
						Object.entries(raw)
							.map(([id, data]) => ({
								at: data.at ?? 0,
								id,
								name: data.name,
								text: data.text,
							}))
							.sort((a, b) => a.at - b.at)
					);
				}
			),
		[limit]
	);

	const send = (name: string, text: string) => {
		if (!text.trim()) {
			return;
		}

		void signedIn.then(() => {
			push(ref(db, dataPath('chatRoom')), {
				at: serverTimestamp(),
				name,
				text: text.trim(),
			});
		});
	};

	return {messages, send};
}
```

- [ ] **Step 2: Create `src/components/ChatPanel.tsx`**

Adapted from `LiveChatPanel` — global (no match props), uses `useChat`, keeps the timezone timestamps + ephemeral + command wiring, and derives the command context from `liveCard`:

```tsx
import {useEffect, useRef, useState} from 'react';

import {runChatCommand} from '../lib/chatCommands';
import type {MatchCard} from '../lib/matches';
import type {Game, Participant} from '../lib/types';
import {useChat} from '../lib/useChat';
import {Avatar} from './Avatar';

function formatMessageTime(at: number, now: number): string {
	if (!at) return '';

	const msgDate = new Date(at);
	const nowDate = new Date(now);
	const isToday =
		msgDate.getFullYear() === nowDate.getFullYear() &&
		msgDate.getMonth() === nowDate.getMonth() &&
		msgDate.getDate() === nowDate.getDate();

	const time = msgDate.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});

	if (isToday) return time;

	const date = msgDate.toLocaleDateString([], {
		day: '2-digit',
		month: 'short',
	});

	return `${date} ${time}`;
}

interface Props {
	games: Game[];
	identity: string | null;
	liveCard: MatchCard | null;
	onCelebrate: (name: string) => void;
	onClose: () => void;
	onRequestIdentify: () => void;
	participants: Participant[];
}

export function ChatPanel({
	games,
	identity,
	liveCard,
	onCelebrate,
	onClose,
	onRequestIdentify,
	participants,
}: Props) {
	const {messages, send} = useChat();
	const [draft, setDraft] = useState('');
	const [ephemeral, setEphemeral] = useState<{id: number; text: string}[]>(
		[]
	);
	const ephemeralId = useRef(0);
	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({behavior: 'smooth'});
	}, [messages.length]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const submit = () => {
		if (!identity || !draft.trim()) {
			return;
		}

		const result = runChatCommand(draft, {
			card: liveCard,
			games,
			matchNo: liveCard?.matchNo ?? 0,
			name: identity,
			participants,
		});

		if (result.broadcast) {
			send(identity, result.broadcast);
		}

		if (result.ephemeral) {
			setEphemeral((current) => [
				...current,
				{id: (ephemeralId.current += 1), text: result.ephemeral as string},
			]);
		}

		if (result.celebrate) {
			onCelebrate(result.celebrate);
		}

		setDraft('');
	};

	return (
		<div className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-white/10 bg-slate-900 shadow-2xl md:w-96">
			<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
				<div className="min-w-0">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
						Chat
					</p>

					<p className="truncate text-sm font-medium text-white">
						Everyone online
					</p>
				</div>

				<button
					aria-label="Close chat"
					className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
					onClick={onClose}
				>
					✕
				</button>
			</div>

			<div className="flex-1 space-y-3 overflow-y-auto p-4">
				{messages.length === 0 ? (
					<p className="pt-8 text-center text-sm text-slate-500">
						No messages yet — be the first!
					</p>
				) : (
					messages.map((msg) => {
						const isMe = msg.name === identity;
						const timeLabel = formatMessageTime(msg.at, Date.now());

						return (
							<div
								className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
								key={msg.id}
							>
								<Avatar
									className="mt-0.5 h-6 w-6 shrink-0 rounded-full text-[9px]"
									name={msg.name}
								/>

								<div
									className={`flex max-w-[75%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
								>
									{!isMe && (
										<span className="text-[10px] font-medium text-sky-300">
											{msg.name}
										</span>
									)}

									<div
										className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${
											isMe
												? 'rounded-tr-sm bg-emerald-500/25 text-white'
												: 'rounded-tl-sm bg-white/10 text-slate-200'
										}`}
									>
										{msg.text}
									</div>

									{timeLabel && (
										<span className="text-[10px] text-slate-500">
											{timeLabel}
										</span>
									)}
								</div>
							</div>
						);
					})
				)}

				{ephemeral.map((line) => (
					<div className="flex justify-center" key={line.id}>
						<div className="max-w-[85%] rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-400">
							<span className="mr-1" aria-hidden>
								🤖
							</span>

							<span className="whitespace-pre-line">{line.text}</span>

							<span className="ml-1 text-[9px] uppercase tracking-wide text-slate-600">
								only you
							</span>
						</div>
					</div>
				))}

				<div ref={bottomRef} />
			</div>

			{identity ? (
				<div className="flex gap-2 border-t border-white/10 p-3">
					<input
						className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-400"
						maxLength={200}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								submit();
							}
						}}
						placeholder="Message or /help"
						ref={inputRef}
						value={draft}
					/>

					<button
						className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:opacity-40"
						disabled={!draft.trim()}
						onClick={submit}
					>
						Send
					</button>
				</div>
			) : (
				<div className="border-t border-white/10 px-4 py-5 text-center">
					<p className="mb-3 text-xs text-slate-400">
						Identify yourself to join the chat
					</p>

					<button
						className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
						onClick={onRequestIdentify}
					>
						👋 Who are you?
					</button>
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 3: Create `src/components/ChatButton.tsx`**

```tsx
// Floating button that opens the global chat from any page.
export function ChatButton({onClick}: {onClick: () => void}) {
	return (
		<button
			aria-label="Open chat"
			className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-xl shadow-lg transition-colors hover:bg-emerald-400"
			onClick={onClick}
		>
			💬
		</button>
	);
}
```

- [ ] **Step 4: App — swap the per-match wiring for the global chat**

In `src/App.tsx`:

Replace the imports:
```tsx
import {LiveChatPanel} from './components/LiveChatPanel';
```
with:
```tsx
import {ChatButton} from './components/ChatButton';
import {ChatPanel} from './components/ChatPanel';
```

Replace the state line:
```tsx
	const [chatMatchNo, setChatMatchNo] = useState<number | null>(null);
```
with:
```tsx
	const [chatOpen, setChatOpen] = useState(false);
```

Add the single-live-match derivation right after `const cards = useMemo(...)` (find where `cards` is defined):
```tsx
	const liveCards = cards.filter((card) => card.status === 'live');
	const liveCard = liveCards.length === 1 ? liveCards[0] : null;
```

Remove the `onOpenChat={setChatMatchNo}` prop from the `<LiveGames ... />` render.

Replace the whole `{chatMatchNo !== null && (() => { ... })()}` block (the IIFE rendering `LiveChatPanel`) with:
```tsx
			{!chatOpen && <ChatButton onClick={() => setChatOpen(true)} />}

			{chatOpen && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/50"
						onClick={() => setChatOpen(false)}
					/>

					<ChatPanel
						games={games}
						identity={identity.name}
						liveCard={liveCard}
						onCelebrate={celebrate}
						onClose={() => setChatOpen(false)}
						onRequestIdentify={() => {
							setChatOpen(false);
							setIdentityOpen(true);
						}}
						participants={participants}
					/>
				</>
			)}
```

- [ ] **Step 5: LiveGames — remove the per-match chat**

In `src/components/LiveGames.tsx`:
- Delete the import `import {useMatchChat} from '../lib/useMatchChat';`.
- Delete the entire `LiveChatPreview` component (the `function LiveChatPreview({...}) { ... }`).
- Remove `onOpenChat` from the props type and the destructured params.
- Delete the line that renders it: `<LiveChatPreview matchNo={game.matchNo} onOpen={onOpenChat} />`.

- [ ] **Step 6: Delete the obsolete files**

```bash
git rm src/lib/useMatchChat.ts src/components/LiveChatPanel.tsx
```

- [ ] **Step 7: Build + full suite**

Run: `npm run build && npx vitest run`
Expected: `✓ built` (no dangling refs to `useMatchChat`/`LiveChatPanel`); tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/useChat.ts src/components/ChatPanel.tsx src/components/ChatButton.tsx src/App.tsx src/components/LiveGames.tsx
git commit --no-gpg-sign -m "Make the chat a single global room with a floating button"
```

---

## Notes

- Old `chat/<matchNo>` data is abandoned (orphaned, harmless). The global room
  is the new `chatRoom` node.
- On `?demo`, `chatRoom` is under `demo/` (open) — testable without a rule.
- **Publish (end):** push `master` → deploy, then add the `chatRoom` rule in the
  Firebase console (the chat won't work in prod without it):
  ```json
  "chatRoom": { ".read": true, "$msg": {
    ".write": "auth != null && !data.exists()",
    ".validate": "newData.hasChildren(['name','text','at'])",
    "text": {".validate": "newData.isString() && newData.val().length <= 500"}
  } }
  ```
