# Content Moderation — Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the owner inline, in-place controls to remove a reaction emoji, remove an AI commentary blurb (per-match + leaderboard recap), and reset a match's cheers — visible only when signed in as the owner, enforced by RTDB rules.

**Architecture:** Owner-only affordances render on the content itself when `auth.isOwner`. Each calls an `App` handler that `remove()`s the relevant RTDB node (via `dataPath` so `?demo` works). The RTDB rules grant the owner `write` on `reactions`, `matches/reactions`, and `commentary`; `cheers` is already world-writable.

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind 4, Firebase RTDB, Vitest (node env, pure-logic tests only), react-router-dom HashRouter.

## Global Constraints

- Branch: commit to `develop` (already checked out). Never push to `master`; never publish.
- Owner email (verbatim, for the rules): `adriano.interaminense@gmail.com`.
- All RTDB paths go through `dataPath(...)` from `src/lib/dataRoot.ts` so the `?demo` subtree works: reactions `dataPath('reactions')`, match reactions `dataPath('matches/reactions')`, cheers `dataPath('cheers')`, commentary `dataPath('commentary')`.
- Owner-only props are passed from `App` only when `auth.isOwner`; components render the affordance only when the prop is defined. A non-owner must never see the controls, and the rules must reject the write regardless.
- Commit `--no-gpg-sign`, title-only messages. Keep the existing 153 tests green.
- Reactions live under: players keyed by participant name, matches keyed by `String(matchNo)`. Commentary: `commentary/byMatch/<matchNo>` and `commentary/leaderboard/recap`.

---

## File Structure

- `src/components/Reactions.tsx` (modify) — optional `onClear` → per-chip `✕`.
- `src/components/Leaderboard.tsx` (modify) — pass `onClear` to its `Reactions`; `✕` on the recap box.
- `src/components/MatchesView.tsx` (modify) — pass `onClear` to its `Reactions`; `✕` on the per-match commentary box (threaded through MatchSection → MatchCardArticle).
- `src/components/LiveGames.tsx` (modify) — owner reset on the cheer counters.
- `src/App.tsx` (modify) — owner moderation handlers; pass them (owner-gated) to the components.
- `database.rules.json` (modify) — owner `write` on reactions / matches.reactions / commentary.

---

### Task 1: Per-emoji clear affordance in Reactions

**Files:**
- Modify: `src/components/Reactions.tsx`

**Interfaces:**
- Produces: `Reactions` gains optional prop `onClear?: (emoji: string) => void`. When defined, each active emoji chip is followed by a small `✕` button calling `onClear(emoji)`.

- [ ] **Step 1: Add the prop**

In `src/components/Reactions.tsx`, add `onClear` to the props type and destructuring:

```tsx
export function Reactions({
	collapsible = false,
	counts,
	mine,
	onClear,
	onReact,
}: {
	collapsible?: boolean;
	counts: Record<string, number>;
	mine: string[];
	onClear?: (emoji: string) => void;
	onReact: (emoji: string) => void;
}) {
```

- [ ] **Step 2: Render the ✕ next to each active chip**

Replace the `{active.map((reaction) => ( <button ...>...</button> ))}` block (the one inside the `hidden sm:flex`/`flex` div) with a wrapping span that holds the chip and, when `onClear` is set, a separate `✕` button (buttons must not nest):

```tsx
{active.map((reaction) => (
	<span className="flex items-center" key={reaction.emoji}>
		<button
			className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
				mine.includes(reaction.emoji)
					? 'bg-emerald-400/20 ring-1 ring-inset ring-emerald-400/50'
					: 'bg-white/5 hover:bg-white/10'
			}`}
			onClick={() => onReact(reaction.emoji)}
		>
			<span>{reaction.emoji}</span>

			<span className="font-medium text-slate-300">
				{counts[reaction.emoji]}
			</span>
		</button>

		{onClear && (
			<button
				aria-label={`Clear ${reaction.emoji} reactions`}
				className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/20 text-[9px] text-rose-300 transition hover:bg-rose-500/40"
				onClick={() => onClear(reaction.emoji)}
			>
				✕
			</button>
		)}
	</span>
))}
```

(The `key` moves from the chip button to the wrapping span. The collapsed mobile circle stack is unchanged — moderation happens on the chip list.)

- [ ] **Step 3: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built`, no TS errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Reactions.tsx
git commit --no-gpg-sign -m "Add optional owner clear control to reaction chips"
```

---

### Task 2: Wire reaction clearing (App + Leaderboard + MatchesView)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Leaderboard.tsx`
- Modify: `src/components/MatchesView.tsx`

**Interfaces:**
- Consumes: `Reactions.onClear` (Task 1); `auth.isOwner`, `dataPath`.
- Produces: `Leaderboard` gains `onClearReaction?: (name: string, emoji: string) => void`; `MatchesView` gains `onClearMatchReaction?: (matchNo: number, emoji: string) => void` (threaded to its `Reactions`).

- [ ] **Step 1: App — imports for RTDB removal**

In `src/App.tsx`, ensure these imports exist (add what's missing):

```tsx
import {onValue, ref, remove} from 'firebase/database';
import {dataPath} from './lib/dataRoot';
```

(`onValue, ref` are already imported for approvals — just add `remove`. Add the `dataPath` import.)

- [ ] **Step 2: App — owner reaction-clear handlers**

Add near the other handlers (e.g., after `reactMatch`):

```tsx
const clearPlayerReaction = (name: string, emoji: string) => {
	remove(ref(db, `${dataPath('reactions')}/${name}/${emoji}`));
};

const clearMatchReaction = (matchNo: number, emoji: string) => {
	remove(ref(db, `${dataPath('matches/reactions')}/${matchNo}/${emoji}`));
};
```

- [ ] **Step 3: App — pass them, owner-gated**

On the `<Leaderboard ... />` render add:

```tsx
onClearReaction={auth.isOwner ? clearPlayerReaction : undefined}
```

On the `<MatchesView ... />` render add:

```tsx
onClearMatchReaction={auth.isOwner ? clearMatchReaction : undefined}
```

- [ ] **Step 4: Leaderboard — accept + forward to Reactions**

In `src/components/Leaderboard.tsx`, add `onClearReaction?: (name: string, emoji: string) => void` to `LeaderboardProps` and the destructured params. Both `<Reactions ... />` instances (the `sm:hidden` mobile one and the `hidden sm:flex` desktop one) get:

```tsx
onClear={
	onClearReaction
		? (emoji) => onClearReaction(row.name, emoji)
		: undefined
}
```

- [ ] **Step 5: MatchesView — thread to the match Reactions**

In `src/components/MatchesView.tsx`, add `onClearMatchReaction?: (matchNo: number, emoji: string) => void` to `MatchesViewProps`, to `MatchSection`'s props, and to `MatchCardArticle`'s props, passing it down each layer. On the `<Reactions ... />` inside `MatchCardArticle` add:

```tsx
onClear={
	onClearMatchReaction
		? (emoji) => onClearMatchReaction(card.matchNo, emoji)
		: undefined
}
```

Pass `onClearMatchReaction={onClearMatchReaction}` from `MatchesView` → `MatchSection` → `MatchCardArticle`.

- [ ] **Step 6: Build + tests**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; 153/153 pass.

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/Leaderboard.tsx src/components/MatchesView.tsx
git commit --no-gpg-sign -m "Let the owner clear a reaction emoji inline"
```

---

### Task 3: Commentary + recap removal

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/MatchesView.tsx`
- Modify: `src/components/Leaderboard.tsx`

**Interfaces:**
- Consumes: `auth.isOwner`, `dataPath`, `remove`, `ref`, `db`.
- Produces: `MatchesView` gains `onClearCommentary?: (matchNo: number) => void`; `Leaderboard` gains `onClearRecap?: () => void`.

- [ ] **Step 1: App — handlers**

Add near the reaction handlers:

```tsx
const clearMatchCommentary = (matchNo: number) => {
	remove(ref(db, `${dataPath('commentary')}/byMatch/${matchNo}`));
};

const clearRecap = () => {
	remove(ref(db, `${dataPath('commentary')}/leaderboard/recap`));
};
```

- [ ] **Step 2: App — pass them, owner-gated**

On `<MatchesView ... />` add:

```tsx
onClearCommentary={auth.isOwner ? clearMatchCommentary : undefined}
```

On `<Leaderboard ... />` add:

```tsx
onClearRecap={auth.isOwner ? clearRecap : undefined}
```

- [ ] **Step 3: MatchesView — ✕ on the per-match commentary box**

Add `onClearCommentary?: (matchNo: number) => void` to `MatchesViewProps`, `MatchSection`, and `MatchCardArticle`, threading it down. In `MatchCardArticle`, replace the commentary block:

```tsx
{commentary[card.matchNo] && (
	<div className="mt-3 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
		<span aria-hidden className="text-sm">
			🎙️
		</span>

		<p className="text-xs italic leading-relaxed text-slate-300">
			{commentary[card.matchNo]}
		</p>
	</div>
)}
```

with:

```tsx
{commentary[card.matchNo] && (
	<div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
		<span aria-hidden className="text-sm">
			🎙️
		</span>

		<p className="flex-1 text-xs italic leading-relaxed text-slate-300">
			{commentary[card.matchNo]}
		</p>

		{onClearCommentary && (
			<button
				aria-label="Remove this commentary"
				className="shrink-0 rounded-full bg-rose-500/20 px-1.5 text-[10px] text-rose-300 transition hover:bg-rose-500/40"
				onClick={() => onClearCommentary(card.matchNo)}
			>
				✕
			</button>
		)}
	</div>
)}
```

- [ ] **Step 4: Leaderboard — ✕ on the recap box**

Add `onClearRecap?: () => void` to `LeaderboardProps` and params. Replace the recap block:

```tsx
{recap && (
	<div className="flex gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
		<span aria-hidden className="text-sm">
			🎙️
		</span>

		<p className="text-sm italic leading-relaxed text-slate-300">
			{recap}
		</p>
	</div>
)}
```

with:

```tsx
{recap && (
	<div className="flex items-start gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
		<span aria-hidden className="text-sm">
			🎙️
		</span>

		<p className="flex-1 text-sm italic leading-relaxed text-slate-300">
			{recap}
		</p>

		{onClearRecap && (
			<button
				aria-label="Remove the recap"
				className="shrink-0 rounded-full bg-rose-500/20 px-1.5 text-[10px] text-rose-300 transition hover:bg-rose-500/40"
				onClick={onClearRecap}
			>
				✕
			</button>
		)}
	</div>
)}
```

- [ ] **Step 5: Build + tests**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; 153/153 pass.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/MatchesView.tsx src/components/Leaderboard.tsx
git commit --no-gpg-sign -m "Let the owner remove AI commentary and the recap inline"
```

---

### Task 4: Cheers reset on the live bar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/LiveGames.tsx`

**Interfaces:**
- Consumes: `auth.isOwner`, `dataPath`, `remove`, `ref`, `db`.
- Produces: `LiveGames` gains `onResetCheers?: (matchNo: number) => void`.

- [ ] **Step 1: App — handler**

```tsx
const resetCheers = (matchNo: number) => {
	remove(ref(db, `${dataPath('cheers')}/${matchNo}`));
};
```

- [ ] **Step 2: App — pass it, owner-gated**

On `<LiveGames ... />` add:

```tsx
onResetCheers={auth.isOwner ? resetCheers : undefined}
```

- [ ] **Step 3: LiveGames — render the reset**

In `src/components/LiveGames.tsx`, add `onResetCheers?: (matchNo: number) => void` to the props type and destructuring. Inside the per-game block (the `games.map((game) => { ... })`), after the `<article>...</article>`, add an owner-only reset row:

```tsx
{onResetCheers && (
	<button
		aria-label="Reset cheers for this match"
		className="mt-1 w-full rounded-full bg-rose-500/15 py-0.5 text-[10px] font-medium text-rose-300 transition hover:bg-rose-500/30"
		onClick={() => onResetCheers(game.matchNo)}
	>
		Reset cheers
	</button>
)}
```

(Place it inside the `<div className="w-full sm:w-96" key={game.matchNo}>` wrapper, right after the `</article>`.)

- [ ] **Step 4: Build + tests**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; 153/153 pass.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/LiveGames.tsx
git commit --no-gpg-sign -m "Let the owner reset a match's cheers"
```

---

### Task 5: RTDB rules — owner moderation writes

**Files:**
- Modify: `database.rules.json`

**Interfaces:**
- Produces: the deployable ruleset granting the owner `write` on `reactions`, `matches/reactions`, and `commentary`.

- [ ] **Step 1: Update the ruleset**

Replace `database.rules.json` with the full ruleset below (current rules + the three owner `write` additions). It stays valid strict JSON (deployable whole):

```json
{
	"rules": {
		"reactions": {
			".read": true,
			".write": "auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true",
			"$player": {
				"$emoji": {
					"$uid": {
						".write": "auth != null && auth.uid === $uid",
						".validate": "newData.isBoolean()"
					}
				}
			}
		},
		"matches": {
			"reactions": {
				".read": true,
				".write": "auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true",
				"$matchId": {
					"$emoji": {
						"$uid": {
							".write": "auth != null && auth.uid === $uid",
							".validate": "newData.isBoolean()"
						}
					}
				}
			}
		},
		"games": {".read": true, ".write": false},
		"demo": {
			".read": true,
			".write": true
		},
		"commentary": {
			".read": true,
			".write": "auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true"
		},
		"cheers": {".read": true, ".write": true},
		"presence": {".read": true, ".write": true},
		"leaderHype": {".read": true, ".write": true},
		"profiles": {
			".read": true,
			"$uid": {
				".write": "auth != null && (auth.uid === $uid || (auth.token.email === 'adriano.interaminense@gmail.com' && auth.token.email_verified === true))",
				"email": {".validate": "newData.isString()"},
				"name": {".validate": "newData.isString()"},
				"photoURL": {".validate": "newData.isString()"},
				"lastSeenAt": {".validate": "newData.isNumber() || newData.isString()"},
				"claim": {".validate": "newData.isString() || !newData.exists()"},
				"$other": {".validate": false}
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

- [ ] **Step 2: Validate it is strict JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8')); console.log('valid')"`
Expected: `valid`.

- [ ] **Step 3: Commit**

```bash
git add database.rules.json
git commit --no-gpg-sign -m "Grant the owner moderation writes in the RTDB rules"
```

- [ ] **Step 4: Manual console step (owner)**

Firebase console → Realtime Database → Rules → paste the full file above → Publish. (Note: the `demo` subtree is fully open, so demo moderation works without these owner gates.)

- [ ] **Step 5: Manual verification**

- As the owner, on `localhost` (or after publishing rules): remove a reaction emoji, a per-match commentary, the recap, and reset a match's cheers — confirm each disappears live.
- As a non-owner (or logged out): confirm none of the `✕`/reset controls render, and that a forced write/remove to those nodes is denied by the rules.
- Confirm a normal user can still toggle their own reaction (the per-`$uid` rule still applies).

---

## Notes

- The `demo` subtree (`?demo`) is fully open, so all moderation works there without the owner rule (useful for local testing before publishing rules).
- No new pure logic, so no new unit tests; the 153 existing tests must stay green. Verification is build + the manual checklist.
