# Arena — Multiplayer Cursors & Catch the Ball Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A desktop-only "Arena" page where every online viewer's cursor moves live for everyone, and players race to click a soccer ball — first click scores, cumulative live scoreboard.

**Architecture:** Pure helpers (`arena.ts`, fully tested) + a realtime hook (`useArena`) that mirrors the existing presence/leaderHype RTDB patterns (cursors written throttled, ball claimed via a transaction so the first click wins) + an `ArenaView` page, a desktop-only nav entry, and a route.

**Tech Stack:** Vite 7 + React 19 + TypeScript + Tailwind 4, Firebase RTDB, Vitest (node env → pure-logic tests only).

## Global Constraints

- Branch: work on `master` (already checked out). Commit locally; never push or publish until the user asks.
- All UI text in **English**.
- **Desktop only**: the Arena nav entry shows only on the desktop top nav (not the mobile drawer); on a small screen the page shows "Arena is available on desktop." Cursors track `mousemove` (no touch).
- **No score reset** — scores persist in RTDB, cumulative, with no reset control.
- All RTDB paths go through `dataPath(...)` from `src/lib/dataRoot.ts` (so `?demo` is isolated). On `?demo` the subtree is open — no rules change needed; a prod `arena` rule is deferred.
- Commit `--no-gpg-sign`, title-only messages. Keep the existing tests green.
- Cursor `x,y` are fractions 0–1 of the field rect (map across screen sizes).

---

## File Structure

- `src/lib/arena.ts` (create) — pure helpers + `Ball` type.
- `src/lib/arena.test.ts` (create) — unit tests.
- `src/lib/useArena.ts` (create) — realtime hook (cursors, ball, scores).
- `src/components/ArenaView.tsx` (create) — the page.
- `src/lib/nav.ts` (modify) — add a `desktopOnly` Arena item.
- `src/components/NavDrawer.tsx` (modify) — hide `desktopOnly` items.
- `src/App.tsx` (modify) — the `/arena` route.

---

### Task 1: Pure arena helpers

**Files:**
- Create: `src/lib/arena.ts`
- Test: `src/lib/arena.test.ts`

**Interfaces:**
- Produces:
  - `interface Ball { claimedBy: string | null; id: number; x: number; y: number }`
  - `randomBallPosition(): {x: number; y: number}` (both in `[0.08, 0.92]`)
  - `isBallHit(x: number, y: number, ball: Ball, radius: number): boolean`
  - `nextBall(prevId: number): Ball`
  - `sortScores(scores: Record<string, number>): [string, number][]`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/arena.test.ts
import {describe, expect, it} from 'vitest';

import {
	type Ball,
	isBallHit,
	nextBall,
	randomBallPosition,
	sortScores,
} from './arena';

describe('randomBallPosition', () => {
	it('stays within the inner field on every roll', () => {
		for (let i = 0; i < 200; i += 1) {
			const {x, y} = randomBallPosition();

			expect(x).toBeGreaterThanOrEqual(0.08);
			expect(x).toBeLessThanOrEqual(0.92);
			expect(y).toBeGreaterThanOrEqual(0.08);
			expect(y).toBeLessThanOrEqual(0.92);
		}
	});
});

describe('isBallHit', () => {
	const ball: Ball = {claimedBy: null, id: 1, x: 0.5, y: 0.5};

	it('is a hit at the center and within the radius', () => {
		expect(isBallHit(0.5, 0.5, ball, 0.06)).toBe(true);
		expect(isBallHit(0.5, 0.54, ball, 0.06)).toBe(true);
	});

	it('is a hit exactly on the radius edge', () => {
		expect(isBallHit(0.56, 0.5, ball, 0.06)).toBe(true);
	});

	it('misses beyond the radius', () => {
		expect(isBallHit(0.5, 0.7, ball, 0.06)).toBe(false);
	});
});

describe('nextBall', () => {
	it('increments the id, clears claimedBy, and stays in bounds', () => {
		const ball = nextBall(4);

		expect(ball.id).toBe(5);
		expect(ball.claimedBy).toBeNull();
		expect(ball.x).toBeGreaterThanOrEqual(0.08);
		expect(ball.x).toBeLessThanOrEqual(0.92);
	});
});

describe('sortScores', () => {
	it('sorts by score desc, then name asc', () => {
		expect(sortScores({Ana: 3, Bob: 5, Cid: 5})).toEqual([
			['Bob', 5],
			['Cid', 5],
			['Ana', 3],
		]);
	});

	it('handles empty', () => {
		expect(sortScores({})).toEqual([]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: FAIL — cannot resolve `./arena`.

- [ ] **Step 3: Write the implementation**

```ts
// src/lib/arena.ts

export interface Ball {
	claimedBy: string | null;
	id: number;
	x: number;
	y: number;
}

// A position in the inner field, away from the edges (fractions 0–1).
export function randomBallPosition(): {x: number; y: number} {
	return {
		x: 0.08 + Math.random() * 0.84,
		y: 0.08 + Math.random() * 0.84,
	};
}

export function isBallHit(
	x: number,
	y: number,
	ball: Ball,
	radius: number
): boolean {
	const dx = x - ball.x;
	const dy = y - ball.y;

	return Math.sqrt(dx * dx + dy * dy) <= radius;
}

export function nextBall(prevId: number): Ball {
	return {claimedBy: null, id: prevId + 1, ...randomBallPosition()};
}

export function sortScores(
	scores: Record<string, number>
): [string, number][] {
	return Object.entries(scores).sort(
		(a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/arena.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/arena.ts src/lib/arena.test.ts
git commit --no-gpg-sign -m "Add pure arena helpers (ball, hit test, scores)"
```

---

### Task 2: useArena realtime hook

**Files:**
- Create: `src/lib/useArena.ts`

**Interfaces:**
- Consumes: `Ball`, `isBallHit`, `nextBall` (`./arena`); `dataPath` (`./dataRoot`); `auth`, `db`, `signedIn` (`./firebase`).
- Produces:
  - `interface ArenaCursor { name: string; uid: string; x: number; y: number }`
  - `useArena(name: string | null): { ball: Ball | null; cursors: ArenaCursor[]; moveCursor: (x: number, y: number) => void; scores: Record<string, number>; tryClaim: (x: number, y: number) => void }`

- [ ] **Step 1: Write the hook**

```ts
// src/lib/useArena.ts
import {onAuthStateChanged} from 'firebase/auth';
import {
	increment,
	onDisconnect,
	onValue,
	ref,
	runTransaction,
	serverTimestamp,
	set,
	update,
} from 'firebase/database';
import {useEffect, useRef, useState} from 'react';

import {type Ball, isBallHit, nextBall} from './arena';
import {dataPath} from './dataRoot';
import {auth, db, signedIn} from './firebase';

const HIT_RADIUS = 0.06;
const MOVE_THROTTLE_MS = 50;

export interface ArenaCursor {
	name: string;
	uid: string;
	x: number;
	y: number;
}

export function useArena(name: string | null): {
	ball: Ball | null;
	cursors: ArenaCursor[];
	moveCursor: (x: number, y: number) => void;
	scores: Record<string, number>;
	tryClaim: (x: number, y: number) => void;
} {
	const [uid, setUid] = useState<string | null>(null);
	const [cursors, setCursors] = useState<ArenaCursor[]>([]);
	const [ball, setBall] = useState<Ball | null>(null);
	const [scores, setScores] = useState<Record<string, number>>({});
	const lastMove = useRef(0);

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/cursors')), (snapshot) => {
				const value =
					(snapshot.val() as Record<
						string,
						{name?: string; x?: number; y?: number}
					>) ?? {};

				setCursors(
					Object.entries(value)
						.filter(([id]) => id !== uid)
						.map(([id, cursor]) => ({
							name: cursor.name ?? '',
							uid: id,
							x: cursor.x ?? 0,
							y: cursor.y ?? 0,
						}))
				);
			}),
		[uid]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/ball')), (snapshot) => {
				setBall((snapshot.val() as Ball | null) ?? null);
			}),
		[]
	);

	useEffect(
		() =>
			onValue(ref(db, dataPath('arena/scores')), (snapshot) => {
				setScores((snapshot.val() as Record<string, number>) ?? {});
			}),
		[]
	);

	// Spawn the very first ball if none exists (transaction → only one wins).
	useEffect(() => {
		if (!uid) {
			return;
		}

		runTransaction(ref(db, dataPath('arena/ball')), (current: Ball | null) =>
			current ?? nextBall(0)
		).catch(() => undefined);
	}, [uid]);

	// Remove my cursor when I disconnect or leave the page.
	useEffect(() => {
		if (!uid) {
			return undefined;
		}

		const node = ref(db, `${dataPath('arena/cursors')}/${uid}`);

		onDisconnect(node).remove();

		return () => {
			set(node, null).catch(() => undefined);
		};
	}, [uid]);

	const moveCursor = (x: number, y: number) => {
		if (!uid || !name) {
			return;
		}

		const now = Date.now();

		if (now - lastMove.current < MOVE_THROTTLE_MS) {
			return;
		}

		lastMove.current = now;

		set(ref(db, `${dataPath('arena/cursors')}/${uid}`), {
			at: serverTimestamp(),
			name,
			x,
			y,
		}).catch(() => undefined);
	};

	const tryClaim = (x: number, y: number) => {
		if (!name || !ball || ball.claimedBy || !isBallHit(x, y, ball, HIT_RADIUS)) {
			return;
		}

		const ballRef = ref(db, dataPath('arena/ball'));
		const claimedId = ball.id;

		runTransaction(ballRef, (current: Ball | null) => {
			if (!current || current.id !== claimedId || current.claimedBy) {
				return undefined;
			}

			return {...current, claimedBy: name};
		})
			.then((result) => {
				const committed =
					result.committed &&
					(result.snapshot.val() as Ball | null)?.claimedBy === name;

				if (committed) {
					update(ref(db, dataPath('arena/scores')), {
						[name]: increment(1),
					});
					set(ballRef, nextBall(claimedId));
				}
			})
			.catch(() => undefined);
	};

	return {ball, cursors, moveCursor, scores, tryClaim};
}
```

- [ ] **Step 2: Build to verify it compiles**

Run: `npm run build`
Expected: `✓ built`, no TS errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/useArena.ts
git commit --no-gpg-sign -m "Add useArena realtime hook for cursors, ball, scores"
```

---

### Task 3: ArenaView page, nav entry, and route

**Files:**
- Create: `src/components/ArenaView.tsx`
- Modify: `src/lib/nav.ts`
- Modify: `src/components/NavDrawer.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useArena`, `ArenaCursor` (Task 2); `sortScores` (Task 1); `Avatar` (`./Avatar`).
- Produces: `ArenaView({identity, onRequestIdentify}: {identity: string | null; onRequestIdentify: () => void})`; a `desktopOnly?: boolean` field on `NavItem`.

- [ ] **Step 1: ArenaView component**

```tsx
// src/components/ArenaView.tsx
import {type MouseEvent, useRef} from 'react';

import {sortScores} from '../lib/arena';
import {useArena} from '../lib/useArena';
import {Avatar} from './Avatar';

export function ArenaView({
	identity,
	onRequestIdentify,
}: {
	identity: string | null;
	onRequestIdentify: () => void;
}) {
	const {ball, cursors, moveCursor, scores, tryClaim} = useArena(identity);
	const fieldRef = useRef<HTMLDivElement>(null);

	const toFraction = (event: MouseEvent) => {
		const rect = fieldRef.current?.getBoundingClientRect();

		if (!rect) {
			return null;
		}

		return {
			x: (event.clientX - rect.left) / rect.width,
			y: (event.clientY - rect.top) / rect.height,
		};
	};

	const ranked = sortScores(scores);

	return (
		<div>
			<div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400 sm:hidden">
				⚽ Arena is available on desktop.
			</div>

			<div className="hidden sm:block">
				{!identity && (
					<div className="mb-3 flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
						<span className="text-sm text-slate-300">
							Pick a name to join the arena and score.
						</span>

						<button
							className="shrink-0 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
							onClick={onRequestIdentify}
						>
							👋 Who are you?
						</button>
					</div>
				)}

				<div className="flex gap-4">
					<div
						className="relative h-[70vh] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-950/40 to-slate-950"
						onClick={(event) => {
							const point = toFraction(event);

							if (point) {
								tryClaim(point.x, point.y);
							}
						}}
						onMouseMove={(event) => {
							const point = toFraction(event);

							if (point) {
								moveCursor(point.x, point.y);
							}
						}}
						ref={fieldRef}
					>
						{ball && !ball.claimedBy && (
							<span
								className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl drop-shadow-lg"
								style={{left: `${ball.x * 100}%`, top: `${ball.y * 100}%`}}
							>
								⚽
							</span>
						)}

						{cursors.map((cursor) => (
							<div
								className="pointer-events-none absolute flex -translate-y-1 items-center gap-1"
								key={cursor.uid}
								style={{
									left: `${cursor.x * 100}%`,
									top: `${cursor.y * 100}%`,
								}}
							>
								<span aria-hidden className="text-lg text-emerald-300">
									➤
								</span>

								<span className="rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
									{cursor.name}
								</span>
							</div>
						))}
					</div>

					<div className="w-48 shrink-0 self-start rounded-2xl border border-white/10 bg-white/5 p-3">
						<p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
							Scores
						</p>

						{ranked.length === 0 ? (
							<p className="text-xs text-slate-500">
								No goals yet — click the ball!
							</p>
						) : (
							<ul className="space-y-1.5">
								{ranked.map(([name, score]) => (
									<li className="flex items-center gap-2" key={name}>
										<Avatar
											className="h-6 w-6 shrink-0 rounded-full"
											name={name}
										/>

										<span className="min-w-0 flex-1 truncate text-sm text-slate-200">
											{name}
										</span>

										<span className="font-display text-sm font-bold text-white">
											{score}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: nav.ts — a desktop-only Arena item**

In `src/lib/nav.ts`, add `desktopOnly?: boolean;` to the `NavItem` interface, and add this entry to `NAV_ITEMS` immediately after the `Stats` entry:

```ts
	{desktopOnly: true, icon: '🎮', label: 'Arena', to: '/arena'},
```

(Leaving it in `NAV_ITEMS` keeps `currentNavItem('/arena')` working, so the page title reads "Arena".)

- [ ] **Step 3: NavDrawer — hide desktop-only items on mobile**

In `src/components/NavDrawer.tsx`, change the items map from `{NAV_ITEMS.map(` to filter out desktop-only entries:

```tsx
				{NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) =>
```

(The NavBar — desktop top nav — keeps mapping all `NAV_ITEMS`, so Arena shows there.)

- [ ] **Step 4: App.tsx — the route**

In `src/App.tsx`, add the import:

```tsx
import {ArenaView} from './components/ArenaView';
```

And add this `<Route>` inside `<Routes>` (e.g., right before the `/rules` route):

```tsx
					<Route
						element={
							<ArenaView
								identity={identity.name}
								onRequestIdentify={() => setIdentityOpen(true)}
							/>
						}
						path="/arena"
					/>
```

(`identity` and `setIdentityOpen` are already in scope in `App`.)

- [ ] **Step 5: Build + full suite**

Run: `npm run build && npx vitest run`
Expected: `✓ built`; tests pass (existing + the new arena helper tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/ArenaView.tsx src/lib/nav.ts src/components/NavDrawer.tsx src/App.tsx
git commit --no-gpg-sign -m "Add Arena page with multiplayer cursors and catch-the-ball"
```

---

## Notes

- The native cursor stays visible (you see yourself); the field renders only the
  *other* players' cursors (`useArena` filters out your own uid).
- First ball is spawned by a transaction (`current ?? nextBall(0)`), so multiple
  clients arriving at once create exactly one ball.
- On `?demo`, everything writes under `demo/arena` (open) — testable with two
  desktop browsers, no rules change. Prod needs an `arena` rule (deferred).
- `/celebrate` and the chat slash-commands are unrelated work on the
  `chat-commands` branch — untouched here.
