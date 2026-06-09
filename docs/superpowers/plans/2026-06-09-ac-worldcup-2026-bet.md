# AC World Cup 2026 BET Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static GitHub Pages app that shows each participant's World Cup 2026 group-stage score predictions, live results, per-match points, and a leaderboard.

**Architecture:** Frontend-only at runtime. Predictions are per-participant CSVs bundled at build time (`import.meta.glob`). Scores arrive via a scheduled GitHub Action that fetches `https://worldcup26.ir/get/games` server-side (the API has no CORS) and commits a normalized `public/games.json`, which the frontend fetches same-origin. Pure, unit-tested lib modules (`scoring`, `ranking`, `parsePredictions`, `games`) do all the logic.

**Tech Stack:** Vite 7 + React 19 + TypeScript, Tailwind CSS 4 (`@tailwindcss/vite`), PapaParse, Vitest. Plain-Node update script (no deps). npm.

**Project root:** `/home/me/dev/projects/adriano/ac-world-cup-2026-bet` (git repo already initialized, spec committed; remote `origin` → `https://github.com/interaminense/ac-world-cup-2026-bet`, an empty repo created by the user — currently **private**, see Task 12). All paths below are relative to it. All UI text is **English**.

**Scoring (from the pool's sheet, tiers mutually exclusive — highest wins):** Exact score 25 · Correct winner & winner's goals 18 · Correct winner & goal difference 15 · Correct draw wrong score 12 · Correct winner only 10 · else 0. Matches not started are NOT scored (the API seeds future games as 0–0). Ranking uses competition ranking (ties share rank, next rank skips), alphabetical within ties.

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`, `.env.example`
- Create: `src/main.tsx`, `src/index.css`, `src/App.tsx` (placeholder)

- [ ] **Step 1: Write `package.json`**

```json
{
	"name": "ac-world-cup-2026-bet",
	"private": true,
	"version": "1.0.0",
	"type": "module",
	"scripts": {
		"dev": "vite",
		"build": "tsc && vite build",
		"preview": "vite preview",
		"test": "vitest run",
		"test:watch": "vitest",
		"update-scores": "node scripts/update-scores.mjs"
	},
	"dependencies": {
		"papaparse": "^5.5.0",
		"react": "^19.0.0",
		"react-dom": "^19.0.0"
	},
	"devDependencies": {
		"@tailwindcss/vite": "^4.1.0",
		"@types/papaparse": "^5.3.0",
		"@types/react": "^19.0.0",
		"@types/react-dom": "^19.0.0",
		"@vitejs/plugin-react": "^5.0.0",
		"tailwindcss": "^4.1.0",
		"typescript": "^5.9.0",
		"vite": "^7.0.0",
		"vitest": "^3.2.0"
	}
}
```

- [ ] **Step 2: Write `vite.config.ts`**

`base: './'` makes the build path-agnostic so it works at `https://<user>.github.io/<repo>/` without hardcoding the repo name.

```ts
/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
	base: './',
	plugins: [react(), tailwindcss()],
	test: {
		environment: 'node',
		include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
	},
});
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["ES2022", "DOM", "DOM.Iterable"],
		"module": "ESNext",
		"moduleResolution": "bundler",
		"jsx": "react-jsx",
		"strict": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"noFallthroughCasesInSwitch": true,
		"isolatedModules": true,
		"skipLibCheck": true,
		"noEmit": true,
		"types": ["vite/client"]
	},
	"include": ["src"]
}
```

- [ ] **Step 4: Write `index.html`**

```html
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚽</text></svg>" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>AC World Cup 2026 BET</title>
		<link rel="preconnect" href="https://fonts.googleapis.com" />
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
		<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/main.tsx"></script>
	</body>
</html>
```

- [ ] **Step 5: Write `src/index.css`**

```css
@import 'tailwindcss';

@theme {
	--font-display: 'Archivo', system-ui, sans-serif;
	--font-sans: 'Inter', system-ui, sans-serif;
}
```

- [ ] **Step 6: Write `src/main.tsx`**

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<App />
	</StrictMode>
);
```

- [ ] **Step 7: Write placeholder `src/App.tsx`** (replaced in Task 9)

```tsx
export default function App() {
	return <div className="p-8 font-display text-2xl font-bold">AC World Cup 2026 BET</div>;
}
```

- [ ] **Step 8: Write `.gitignore`**

```
node_modules
dist
.env
*.local
```

- [ ] **Step 9: Write `.env.example`**

```
# Client-side re-fetch interval for games.json, in milliseconds. Default: 1 hour.
VITE_REFRESH_INTERVAL_MS=3600000

# Override the games.json URL (defaults to <base>/games.json).
# VITE_GAMES_URL=

# Score source used by scripts/update-scores.mjs and the update-scores workflow.
API_URL=https://worldcup26.ir
```

- [ ] **Step 10: Install and verify the build**

Run: `cd /home/me/dev/projects/adriano/ac-worldcup-2026-bet && npm install && npm run build`
Expected: `vite build` completes, `dist/index.html` exists. (`npm install` creates `package-lock.json` — commit it; `npm ci` in CI needs it.)

- [ ] **Step 11: Commit**

```bash
git add -A && git commit -m "Scaffold Vite + React + TypeScript + Tailwind project"
```

---

### Task 2: Domain Types and Scoring Engine (TDD)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/scoring.ts`
- Test: `src/lib/scoring.test.ts`

- [ ] **Step 1: Write `src/lib/types.ts`**

```ts
export interface Prediction {
	matchNo: number;
	group: string;
	date: string;
	time: string;
	team1: string;
	p1: number;
	team2: string;
	p2: number;
}

export interface Participant {
	name: string;
	predictions: Prediction[];
}

export interface Game {
	id: number;
	group: string;
	matchday: number;
	localDate: string;
	homeTeam: string;
	awayTeam: string;
	homeScore: number;
	awayScore: number;
	finished: boolean;
	timeElapsed: string;
}

export interface GamesFile {
	fetchedAt: string;
	games: Game[];
}

export type MatchStatus = 'notstarted' | 'live' | 'finished';
```

- [ ] **Step 2: Write the failing test `src/lib/scoring.test.ts`**

```ts
import {describe, expect, it} from 'vitest';

import {POINTS, scorePrediction} from './scoring';

describe('scorePrediction', () => {
	it('awards 25 for the exact score', () => {
		expect(scorePrediction(2, 1, 2, 1)).toBe(POINTS.EXACT_SCORE);
	});

	it('awards 25 for an exact draw score', () => {
		expect(scorePrediction(1, 1, 1, 1)).toBe(POINTS.EXACT_SCORE);
	});

	it('awards 18 for the correct winner with correct winner goals', () => {
		expect(scorePrediction(2, 1, 2, 0)).toBe(POINTS.WINNER_AND_GOALS);
	});

	it('awards 18 when the away team is the winner', () => {
		expect(scorePrediction(1, 3, 0, 3)).toBe(POINTS.WINNER_AND_GOALS);
	});

	it('awards 15 for the correct winner with correct goal difference', () => {
		expect(scorePrediction(2, 1, 3, 2)).toBe(POINTS.WINNER_AND_DIFF);
	});

	it('awards 12 for a correct draw with the wrong score', () => {
		expect(scorePrediction(1, 1, 2, 2)).toBe(POINTS.DRAW);
	});

	it('awards 10 for the correct winner only', () => {
		expect(scorePrediction(2, 1, 4, 1)).toBe(POINTS.WINNER_ONLY);
	});

	it('awards 0 when the predicted winner loses', () => {
		expect(scorePrediction(2, 1, 0, 1)).toBe(POINTS.NONE);
	});

	it('awards 0 when a draw was predicted but a team won', () => {
		expect(scorePrediction(1, 1, 2, 1)).toBe(POINTS.NONE);
	});

	it('awards 0 when a win was predicted but the match drew', () => {
		expect(scorePrediction(2, 0, 1, 1)).toBe(POINTS.NONE);
	});
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/lib/scoring.test.ts`
Expected: FAIL — cannot resolve `./scoring`.

- [ ] **Step 4: Write `src/lib/scoring.ts`**

```ts
export const POINTS = {
	EXACT_SCORE: 25,
	WINNER_AND_GOALS: 18,
	WINNER_AND_DIFF: 15,
	DRAW: 12,
	WINNER_ONLY: 10,
	NONE: 0,
} as const;

export function scorePrediction(
	p1: number,
	p2: number,
	r1: number,
	r2: number
): number {
	if (p1 === r1 && p2 === r2) {
		return POINTS.EXACT_SCORE;
	}

	const predictedDraw = p1 === p2;
	const realDraw = r1 === r2;

	if (predictedDraw && realDraw) {
		return POINTS.DRAW;
	}

	if (predictedDraw || realDraw) {
		return POINTS.NONE;
	}

	if (p1 > p2 !== r1 > r2) {
		return POINTS.NONE;
	}

	if (Math.max(p1, p2) === Math.max(r1, r2)) {
		return POINTS.WINNER_AND_GOALS;
	}

	if (p1 - p2 === r1 - r2) {
		return POINTS.WINNER_AND_DIFF;
	}

	return POINTS.WINNER_ONLY;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/lib/scoring.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib && git commit -m "Add domain types and tier-based scoring engine"
```

---

### Task 3: API Normalization Script Module (TDD)

The API returns every field as a string (`"id": "1"`, `"finished": "FALSE"`). This pure module converts the raw `/get/games` payload into the typed `Game` shape. It is plain `.mjs` so the no-dependency Node script (Task 7) can import it; Vitest tests it directly.

**Files:**
- Create: `scripts/normalize.mjs`
- Test: `scripts/normalize.test.mjs`

- [ ] **Step 1: Write the failing test `scripts/normalize.test.mjs`**

```js
import {describe, expect, it} from 'vitest';

import {normalizeGames} from './normalize.mjs';

const RAW_GAME = {
	away_score: '0',
	away_team_name_en: 'South Africa',
	finished: 'FALSE',
	group: 'A',
	home_score: '0',
	home_team_name_en: 'Mexico',
	id: '1',
	local_date: '06/11/2026 13:00',
	matchday: '1',
	time_elapsed: 'notstarted',
	type: 'group',
};

describe('normalizeGames', () => {
	it('coerces API string fields into typed values', () => {
		expect(normalizeGames([RAW_GAME])).toEqual([
			{
				awayScore: 0,
				awayTeam: 'South Africa',
				finished: false,
				group: 'A',
				homeScore: 0,
				homeTeam: 'Mexico',
				id: 1,
				localDate: '06/11/2026 13:00',
				matchday: 1,
				timeElapsed: 'notstarted',
			},
		]);
	});

	it('treats finished TRUE as finished regardless of case', () => {
		const [game] = normalizeGames([{...RAW_GAME, finished: 'True'}]);

		expect(game.finished).toBe(true);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- scripts/normalize.test.mjs`
Expected: FAIL — cannot resolve `./normalize.mjs`.

- [ ] **Step 3: Write `scripts/normalize.mjs`**

```js
export function normalizeGames(rawGames) {
	return rawGames.map((game) => ({
		awayScore: Number(game.away_score),
		awayTeam: game.away_team_name_en,
		finished: String(game.finished).toUpperCase() === 'TRUE',
		group: game.group,
		homeScore: Number(game.home_score),
		homeTeam: game.home_team_name_en,
		id: Number(game.id),
		localDate: game.local_date,
		matchday: Number(game.matchday),
		timeElapsed: game.time_elapsed,
	}));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- scripts/normalize.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add scripts && git commit -m "Add API games normalization module"
```

---

### Task 4: Game Helpers — Status, Join, Orientation (TDD)

**Files:**
- Create: `src/lib/games.ts`
- Test: `src/lib/games.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/games.test.ts`**

```ts
import {describe, expect, it} from 'vitest';

import {
	findGameForPrediction,
	getMatchStatus,
	normalizeTeamName,
	realScoreFor,
} from './games';
import type {Game, Prediction} from './types';

function makeGame(overrides: Partial<Game> = {}): Game {
	return {
		awayScore: 0,
		awayTeam: 'South Africa',
		finished: false,
		group: 'A',
		homeScore: 0,
		homeTeam: 'Mexico',
		id: 1,
		localDate: '06/11/2026 13:00',
		matchday: 1,
		timeElapsed: 'notstarted',
		...overrides,
	};
}

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
	return {
		date: 'Jun/11',
		group: 'Group A',
		matchNo: 1,
		p1: 2,
		p2: 0,
		team1: 'Mexico',
		team2: 'South Africa',
		time: '16:00',
		...overrides,
	};
}

describe('getMatchStatus', () => {
	it('reports notstarted', () => {
		expect(getMatchStatus(makeGame())).toBe('notstarted');
	});

	it('reports finished when the finished flag is set', () => {
		expect(getMatchStatus(makeGame({finished: true}))).toBe('finished');
	});

	it('reports finished when time elapsed says so', () => {
		expect(getMatchStatus(makeGame({timeElapsed: 'finished'}))).toBe(
			'finished'
		);
	});

	it('reports live for anything in between', () => {
		expect(getMatchStatus(makeGame({timeElapsed: '37'}))).toBe('live');
	});
});

describe('normalizeTeamName', () => {
	it('strips diacritics, case, and punctuation', () => {
		expect(normalizeTeamName("Côte d'Ivoire")).toBe('cotedivoire');
		expect(normalizeTeamName('Türkiye')).toBe('turkiye');
		expect(normalizeTeamName('Korea Republic')).toBe('korearepublic');
	});
});

describe('findGameForPrediction', () => {
	it('joins by match number when the teams line up', () => {
		expect(findGameForPrediction(makePrediction(), [makeGame()])).toEqual(
			makeGame()
		);
	});

	it('falls back to team matching when the id points at the wrong game', () => {
		const games = [
			makeGame({awayTeam: 'Czechia', homeTeam: 'Korea Republic', id: 1}),
			makeGame({id: 50}),
		];

		expect(findGameForPrediction(makePrediction(), games)?.id).toBe(50);
	});

	it('matches teams in flipped order', () => {
		const prediction = makePrediction({
			team1: 'South Africa',
			team2: 'Mexico',
		});

		expect(findGameForPrediction(prediction, [makeGame()])?.id).toBe(1);
	});

	it('returns undefined when no game matches', () => {
		expect(findGameForPrediction(makePrediction(), [])).toBeUndefined();
	});
});

describe('realScoreFor', () => {
	it('returns home/away when the prediction follows game orientation', () => {
		const game = makeGame({awayScore: 1, homeScore: 3});

		expect(realScoreFor(makePrediction(), game)).toEqual({r1: 3, r2: 1});
	});

	it('flips the score when the prediction lists the away team first', () => {
		const game = makeGame({awayScore: 1, homeScore: 3});
		const prediction = makePrediction({
			team1: 'South Africa',
			team2: 'Mexico',
		});

		expect(realScoreFor(prediction, game)).toEqual({r1: 1, r2: 3});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/games.test.ts`
Expected: FAIL — cannot resolve `./games`.

- [ ] **Step 3: Write `src/lib/games.ts`**

```ts
import type {Game, GamesFile, MatchStatus, Prediction} from './types';

export function getMatchStatus(game: Game): MatchStatus {
	if (game.finished || game.timeElapsed === 'finished') {
		return 'finished';
	}

	if (game.timeElapsed === 'notstarted') {
		return 'notstarted';
	}

	return 'live';
}

export function normalizeTeamName(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');
}

function teamsMatch(prediction: Prediction, game: Game): boolean {
	const away = normalizeTeamName(game.awayTeam);
	const home = normalizeTeamName(game.homeTeam);
	const team1 = normalizeTeamName(prediction.team1);
	const team2 = normalizeTeamName(prediction.team2);

	return (
		(team1 === home && team2 === away) || (team1 === away && team2 === home)
	);
}

export function findGameForPrediction(
	prediction: Prediction,
	games: Game[]
): Game | undefined {
	const byId = games.find((game) => game.id === prediction.matchNo);

	if (byId && teamsMatch(prediction, byId)) {
		return byId;
	}

	const byTeams = games.find((game) => teamsMatch(prediction, game));

	if (byId && !byTeams) {
		console.warn(
			`Match #${prediction.matchNo} (${prediction.team1} x ${prediction.team2}): id join mismatched and no team fallback found`
		);
	}

	return byTeams;
}

export function realScoreFor(
	prediction: Prediction,
	game: Game
): {r1: number; r2: number} {
	const flipped =
		normalizeTeamName(prediction.team1) === normalizeTeamName(game.awayTeam);

	return flipped
		? {r1: game.awayScore, r2: game.homeScore}
		: {r1: game.homeScore, r2: game.awayScore};
}

const DEFAULT_GAMES_URL = `${import.meta.env.BASE_URL}games.json`;

export async function fetchGames(
	url: string = import.meta.env.VITE_GAMES_URL || DEFAULT_GAMES_URL
): Promise<GamesFile | null> {
	try {
		const response = await fetch(`${url}?t=${Date.now()}`);

		if (!response.ok) {
			return null;
		}

		return (await response.json()) as GamesFile;
	}
	catch {
		return null;
	}
}
```

Note: `import.meta.env` is undefined under the node test environment, but the two module-level reads use it only for defaults; Vitest stubs `import.meta.env` via Vite, so this works in tests too. `fetchGames` itself is untested network glue.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/games.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib && git commit -m "Add match status, prediction-game join, and score orientation helpers"
```

---

### Task 5: Predictions CSV Parser (TDD)

The per-participant CSV (exported from the pool's Google Sheet) has: row 1 `PREDICTIONS & POINTS FOR: <NAME>`, an instruction row, a blank row, the header row starting with `Match #`, 72 match rows, and a trailing `TOTAL:` row. `Real Score`/`Points Earned` columns are ignored — the app computes them.

**Files:**
- Create: `src/lib/parsePredictions.ts`
- Test: `src/lib/parsePredictions.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/parsePredictions.test.ts`**

```ts
import {describe, expect, it} from 'vitest';

import {parsePredictionsCsv} from './parsePredictions';

const SAMPLE_CSV = `PREDICTIONS & POINTS FOR: ADRIANO,,,,,,,,,,
Enter your predictions in 'Prediction T1' and 'Prediction T2'. Points calculate automatically.,,,,,,,,,,
,,,,,,,,,,
Match #,Group,Date,Time,Team 1,Prediction T1,Prediction T2,Team 2,Real Score 1,Real Score 2,Points Earned
1,Group A,Jun/11,16:00,Mexico,2,0,South Africa,,,
11,Group E,Jun/14,20:00,"Côte d'Ivoire",1,1,Ecuador,,,
12,Group F,Jun/14,23:00,Sweden,,,Tunisia,,,
,,,,,,,,TOTAL:,0,
`;

describe('parsePredictionsCsv', () => {
	it('extracts the participant name in title case', () => {
		expect(parsePredictionsCsv(SAMPLE_CSV)?.name).toBe('Adriano');
	});

	it('parses match rows into predictions', () => {
		const participant = parsePredictionsCsv(SAMPLE_CSV);

		expect(participant?.predictions[0]).toEqual({
			date: 'Jun/11',
			group: 'Group A',
			matchNo: 1,
			p1: 2,
			p2: 0,
			team1: 'Mexico',
			team2: 'South Africa',
			time: '16:00',
		});
	});

	it('keeps quoted team names intact', () => {
		expect(parsePredictionsCsv(SAMPLE_CSV)?.predictions[1].team1).toBe(
			"Côte d'Ivoire"
		);
	});

	it('skips rows without a prediction and the trailing total row', () => {
		expect(parsePredictionsCsv(SAMPLE_CSV)?.predictions).toHaveLength(2);
	});

	it('returns null for content without the title header', () => {
		expect(parsePredictionsCsv('a,b,c\n1,2,3\n')).toBeNull();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/parsePredictions.test.ts`
Expected: FAIL — cannot resolve `./parsePredictions`.

- [ ] **Step 3: Write `src/lib/parsePredictions.ts`**

```ts
import Papa from 'papaparse';

import type {Participant, Prediction} from './types';

export function parsePredictionsCsv(content: string): Participant | null {
	const {data} = Papa.parse<string[]>(content.trim(), {
		skipEmptyLines: 'greedy',
	});

	const titleMatch = (data[0]?.[0] ?? '').match(
		/PREDICTIONS & POINTS FOR:\s*(.+)/i
	);

	if (!titleMatch) {
		return null;
	}

	const rawName = titleMatch[1].trim();
	const name = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();

	const headerIndex = data.findIndex((row) => row[0]?.trim() === 'Match #');

	if (headerIndex === -1) {
		return null;
	}

	const predictions: Prediction[] = [];

	for (const row of data.slice(headerIndex + 1)) {
		const matchNo = Number(row[0]);

		if (!row[0]?.trim() || !Number.isFinite(matchNo)) {
			continue;
		}

		const p1 = Number(row[5]);
		const p2 = Number(row[6]);

		if (
			!row[5]?.trim() ||
			!row[6]?.trim() ||
			!Number.isFinite(p1) ||
			!Number.isFinite(p2)
		) {
			continue;
		}

		predictions.push({
			date: row[2]?.trim() ?? '',
			group: row[1]?.trim() ?? '',
			matchNo,
			p1,
			p2,
			team1: row[4]?.trim() ?? '',
			team2: row[7]?.trim() ?? '',
			time: row[3]?.trim() ?? '',
		});
	}

	if (predictions.length === 0) {
		return null;
	}

	return {name, predictions};
}
```

(The `!row[0]?.trim()` guard matters: `Number('') === 0`, which `Number.isFinite` accepts.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/parsePredictions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib && git commit -m "Add predictions CSV parser"
```

---

### Task 6: Participant Scoring and Leaderboard Ranking (TDD)

**Files:**
- Create: `src/lib/ranking.ts`
- Test: `src/lib/ranking.test.ts`

- [ ] **Step 1: Write the failing test `src/lib/ranking.test.ts`**

```ts
import {describe, expect, it} from 'vitest';

import {buildLeaderboard, scoreParticipant} from './ranking';
import type {Game, Participant} from './types';

function makeGame(overrides: Partial<Game> = {}): Game {
	return {
		awayScore: 0,
		awayTeam: 'South Africa',
		finished: false,
		group: 'A',
		homeScore: 0,
		homeTeam: 'Mexico',
		id: 1,
		localDate: '06/11/2026 13:00',
		matchday: 1,
		timeElapsed: 'notstarted',
		...overrides,
	};
}

function makeParticipant(name: string, p1: number, p2: number): Participant {
	return {
		name,
		predictions: [
			{
				date: 'Jun/11',
				group: 'Group A',
				matchNo: 1,
				p1,
				p2,
				team1: 'Mexico',
				team2: 'South Africa',
				time: '16:00',
			},
		],
	};
}

const FINISHED_2_1 = makeGame({
	awayScore: 1,
	finished: true,
	homeScore: 2,
	timeElapsed: 'finished',
});

describe('scoreParticipant', () => {
	it('does not score matches that have not started', () => {
		const result = scoreParticipant(makeParticipant('Ana', 0, 0), [
			makeGame(),
		]);

		expect(result.scored[0].points).toBeNull();
		expect(result.total).toBe(0);
		expect(result.exactCount).toBe(0);
	});

	it('scores finished matches', () => {
		const result = scoreParticipant(makeParticipant('Ana', 2, 1), [
			FINISHED_2_1,
		]);

		expect(result.scored[0].points).toBe(25);
		expect(result.total).toBe(25);
		expect(result.exactCount).toBe(1);
	});

	it('scores live matches provisionally', () => {
		const game = makeGame({homeScore: 1, timeElapsed: '37'});
		const result = scoreParticipant(makeParticipant('Ana', 1, 0), [game]);

		expect(result.scored[0].status).toBe('live');
		expect(result.scored[0].points).toBe(25);
	});

	it('orients the real score when the prediction lists teams flipped', () => {
		const participant: Participant = {
			name: 'Ana',
			predictions: [
				{
					date: 'Jun/11',
					group: 'Group A',
					matchNo: 1,
					p1: 1,
					p2: 2,
					team1: 'South Africa',
					team2: 'Mexico',
					time: '16:00',
				},
			],
		};
		const result = scoreParticipant(participant, [FINISHED_2_1]);

		expect(result.scored[0].points).toBe(25);
	});

	it('leaves predictions without a matching game unscored', () => {
		const result = scoreParticipant(makeParticipant('Ana', 1, 0), []);

		expect(result.scored[0].points).toBeNull();
		expect(result.scored[0].status).toBe('notstarted');
	});
});

describe('buildLeaderboard', () => {
	it('ranks by total points descending', () => {
		const rows = buildLeaderboard(
			[makeParticipant('Ana', 0, 1), makeParticipant('Bia', 2, 1)],
			[FINISHED_2_1]
		);

		expect(rows.map((row) => [row.rank, row.name, row.total])).toEqual([
			[1, 'Bia', 25],
			[2, 'Ana', 0],
		]);
	});

	it('applies competition ranking to ties, alphabetical within a tie', () => {
		const rows = buildLeaderboard(
			[
				makeParticipant('Caio', 0, 1),
				makeParticipant('Zeca', 2, 1),
				makeParticipant('Ana', 2, 1),
			],
			[FINISHED_2_1]
		);

		expect(rows.map((row) => [row.rank, row.name])).toEqual([
			[1, 'Ana'],
			[1, 'Zeca'],
			[3, 'Caio'],
		]);
	});

	it('counts exact scores per participant', () => {
		const rows = buildLeaderboard([makeParticipant('Ana', 2, 1)], [
			FINISHED_2_1,
		]);

		expect(rows[0].exactCount).toBe(1);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/lib/ranking.test.ts`
Expected: FAIL — cannot resolve `./ranking`.

- [ ] **Step 3: Write `src/lib/ranking.ts`**

```ts
import {findGameForPrediction, getMatchStatus, realScoreFor} from './games';
import {POINTS, scorePrediction} from './scoring';
import type {
	Game,
	MatchStatus,
	Participant,
	Prediction,
} from './types';

export interface ScoredPrediction {
	game?: Game;
	points: number | null;
	prediction: Prediction;
	status: MatchStatus;
}

export interface ParticipantScore {
	exactCount: number;
	participant: Participant;
	scored: ScoredPrediction[];
	total: number;
}

export function scoreParticipant(
	participant: Participant,
	games: Game[]
): ParticipantScore {
	const scored: ScoredPrediction[] = participant.predictions.map(
		(prediction) => {
			const game = findGameForPrediction(prediction, games);

			if (!game) {
				return {points: null, prediction, status: 'notstarted'};
			}

			const status = getMatchStatus(game);

			if (status === 'notstarted') {
				return {game, points: null, prediction, status};
			}

			const {r1, r2} = realScoreFor(prediction, game);

			return {
				game,
				points: scorePrediction(prediction.p1, prediction.p2, r1, r2),
				prediction,
				status,
			};
		}
	);

	return {
		exactCount: scored.filter(
			(item) => item.points === POINTS.EXACT_SCORE
		).length,
		participant,
		scored,
		total: scored.reduce((sum, item) => sum + (item.points ?? 0), 0),
	};
}

export interface LeaderboardRow {
	exactCount: number;
	name: string;
	rank: number;
	total: number;
}

export function buildLeaderboard(
	participants: Participant[],
	games: Game[]
): LeaderboardRow[] {
	const scores = participants
		.map((participant) => scoreParticipant(participant, games))
		.sort(
			(a, b) =>
				b.total - a.total ||
				a.participant.name.localeCompare(b.participant.name)
		);

	let lastRank = 0;
	let lastTotal = Number.NaN;

	return scores.map((score, index) => {
		const rank = score.total === lastTotal ? lastRank : index + 1;

		lastRank = rank;
		lastTotal = score.total;

		return {
			exactCount: score.exactCount,
			name: score.participant.name,
			rank,
			total: score.total,
		};
	});
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/lib/ranking.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS — scoring, normalize, games, parsePredictions, ranking all green.

- [ ] **Step 6: Commit**

```bash
git add src/lib && git commit -m "Add participant scoring and competition-ranked leaderboard"
```

---

### Task 7: Update-Scores Script + Real games.json

**Files:**
- Create: `scripts/update-scores.mjs`
- Create: `public/games.json` (generated by running the script)

- [ ] **Step 1: Write `scripts/update-scores.mjs`**

No dependencies — runs with bare `node` in CI. Skips the write when games are unchanged so the Action only commits real updates.

```js
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';

import {normalizeGames} from './normalize.mjs';

const API_URL = process.env.API_URL || 'https://worldcup26.ir';
const OUT_DIR = new URL('../public/', import.meta.url);
const OUT_FILE = new URL('games.json', OUT_DIR);

const response = await fetch(`${API_URL}/get/games`);

if (!response.ok) {
	console.error(`Failed to fetch games: HTTP ${response.status}`);
	process.exit(1);
}

const payload = await response.json();

if (!Array.isArray(payload.games)) {
	console.error('Unexpected API payload: missing games array');
	process.exit(1);
}

const games = normalizeGames(payload.games);

if (existsSync(OUT_FILE)) {
	const previous = JSON.parse(readFileSync(OUT_FILE, 'utf8'));

	if (JSON.stringify(previous.games) === JSON.stringify(games)) {
		console.log('Games unchanged; skipping write');
		process.exit(0);
	}
}

mkdirSync(OUT_DIR, {recursive: true});
writeFileSync(
	OUT_FILE,
	`${JSON.stringify({fetchedAt: new Date().toISOString(), games}, null, '\t')}\n`
);
console.log(`Wrote ${games.length} games to public/games.json`);
```

- [ ] **Step 2: Run it for real to generate `public/games.json`**

Run: `npm run update-scores`
Expected: `Wrote 104 games to public/games.json`. Inspect: `head -c 400 public/games.json` shows `fetchedAt` and typed fields (`"id": 1`, `"finished": false`).

- [ ] **Step 3: Verify idempotence**

Run: `npm run update-scores`
Expected: `Games unchanged; skipping write`.

- [ ] **Step 4: Commit**

```bash
git add scripts public/games.json && git commit -m "Add update-scores script and seed games.json"
```

---

### Task 8: Bundled Predictions Loader + Real CSV

**Files:**
- Create: `src/lib/predictions.ts`
- Create: `src/data/predictions/adriano.csv` (copied from Downloads)

- [ ] **Step 1: Copy the real predictions CSV**

Run:
```bash
mkdir -p src/data/predictions
cp "/home/me/Downloads/AC _ World Cup 2026 - Adriano.csv" src/data/predictions/adriano.csv
```
(The other 16 CSVs get dropped into this folder later — zero code change, the glob picks them up.)

- [ ] **Step 2: Write `src/lib/predictions.ts`**

```ts
import {parsePredictionsCsv} from './parsePredictions';
import type {Participant} from './types';

const csvModules = import.meta.glob('../data/predictions/*.csv', {
	eager: true,
	import: 'default',
	query: '?raw',
}) as Record<string, string>;

export function loadParticipants(): Participant[] {
	return Object.entries(csvModules)
		.map(([path, content]) => {
			const participant = parsePredictionsCsv(content);

			if (!participant) {
				console.error(`Skipping malformed predictions CSV: ${path}`);
			}

			return participant;
		})
		.filter(
			(participant): participant is Participant => participant !== null
		)
		.sort((a, b) => a.name.localeCompare(b.name));
}
```

- [ ] **Step 3: Verify the build still passes (glob + raw import compile)**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add src/lib src/data && git commit -m "Add bundled predictions loader with Adriano's CSV"
```

---

### Task 9: UI — Components and App

**Files:**
- Create: `src/components/Header.tsx`, `src/components/Leaderboard.tsx`, `src/components/MatchRow.tsx`, `src/components/ParticipantView.tsx`
- Modify: `src/App.tsx` (replace placeholder)

Visual language: dark slate background, emerald + amber accents, glassy cards, `Archivo` for display numbers/headings. Live matches pulse. Not-started rows are muted.

- [ ] **Step 1: Write `src/components/Header.tsx`**

```tsx
interface HeaderProps {
	liveCount: number;
	statusText: string;
}

export function Header({liveCount, statusText}: HeaderProps) {
	return (
		<header className="border-b border-white/10 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950">
			<div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
						Analytics Cloud
					</p>

					<h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
						World Cup 2026 <span className="text-amber-400">BET</span>
					</h1>
				</div>

				<div className="flex items-center gap-3 text-sm text-slate-400">
					{liveCount > 0 && (
						<span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-400">
							<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

							{liveCount} live
						</span>
					)}

					<span>{statusText}</span>
				</div>
			</div>
		</header>
	);
}
```

- [ ] **Step 2: Write `src/components/Leaderboard.tsx`**

```tsx
import type {LeaderboardRow} from '../lib/ranking';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
	onSelect: (name: string) => void;
	rows: LeaderboardRow[];
}

export function Leaderboard({onSelect, rows}: LeaderboardProps) {
	return (
		<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
			<table className="w-full text-left">
				<thead>
					<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
						<th className="px-4 py-3">Rank</th>

						<th className="px-4 py-3">Participant</th>

						<th className="px-4 py-3 text-right">Exact scores</th>

						<th className="px-4 py-3 text-right">Points</th>
					</tr>
				</thead>

				<tbody>
					{rows.map((row) => (
						<tr
							className="cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/10"
							key={row.name}
							onClick={() => onSelect(row.name)}
						>
							<td className="px-4 py-3 font-display text-lg font-bold text-slate-300">
								{row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
							</td>

							<td className="px-4 py-3 font-medium text-white">
								{row.name}
							</td>

							<td className="px-4 py-3 text-right text-slate-400">
								{row.exactCount}
							</td>

							<td className="px-4 py-3 text-right font-display text-lg font-bold text-amber-400">
								{row.total}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
```

- [ ] **Step 3: Write `src/components/MatchRow.tsx`**

```tsx
import {realScoreFor} from '../lib/games';
import type {ScoredPrediction} from '../lib/ranking';
import {POINTS} from '../lib/scoring';
import type {MatchStatus} from '../lib/types';

const TIER_STYLES: Record<number, string> = {
	[POINTS.EXACT_SCORE]: 'bg-amber-400/15 text-amber-300',
	[POINTS.WINNER_AND_GOALS]: 'bg-emerald-400/15 text-emerald-300',
	[POINTS.WINNER_AND_DIFF]: 'bg-teal-400/15 text-teal-300',
	[POINTS.DRAW]: 'bg-sky-400/15 text-sky-300',
	[POINTS.WINNER_ONLY]: 'bg-indigo-400/15 text-indigo-300',
	[POINTS.NONE]: 'bg-rose-400/10 text-rose-400',
};

function StatusChip({
	status,
	timeElapsed,
}: {
	status: MatchStatus;
	timeElapsed?: string;
}) {
	if (status === 'live') {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
				LIVE
				{timeElapsed && /^\d+$/.test(timeElapsed)
					? ` ${timeElapsed}'`
					: ''}
			</span>
		);
	}

	if (status === 'finished') {
		return (
			<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300">
				FT
			</span>
		);
	}

	return (
		<span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">
			Upcoming
		</span>
	);
}

export function MatchRow({scored}: {scored: ScoredPrediction}) {
	const {game, points, prediction, status} = scored;

	const real =
		game && status !== 'notstarted'
			? realScoreFor(prediction, game)
			: undefined;

	return (
		<tr
			className={`border-b border-white/5 last:border-0 ${
				status === 'notstarted' ? 'opacity-50' : ''
			}`}
		>
			<td className="px-3 py-2.5 text-xs text-slate-500">
				#{prediction.matchNo}
			</td>

			<td className="px-3 py-2.5 text-xs text-slate-400">
				{prediction.group}
			</td>

			<td className="hidden px-3 py-2.5 text-xs text-slate-400 sm:table-cell">
				{prediction.date} {prediction.time}
			</td>

			<td className="px-3 py-2.5 text-sm text-white">
				<span className="font-medium">{prediction.team1}</span>

				<span className="mx-2 rounded bg-white/10 px-2 py-0.5 font-display font-bold text-amber-300">
					{prediction.p1}–{prediction.p2}
				</span>

				<span className="font-medium">{prediction.team2}</span>
			</td>

			<td className="px-3 py-2.5 text-center font-display text-sm font-bold text-white">
				{real ? `${real.r1}–${real.r2}` : '—'}
			</td>

			<td className="px-3 py-2.5 text-center">
				<StatusChip status={status} timeElapsed={game?.timeElapsed} />
			</td>

			<td className="px-3 py-2.5 text-right">
				{points === null ? (
					<span className="text-slate-600">—</span>
				) : (
					<span
						className={`inline-block min-w-10 rounded-full px-2.5 py-0.5 text-center text-sm font-bold ${
							TIER_STYLES[points]
						} ${status === 'live' ? 'animate-pulse' : ''}`}
					>
						{points}
					</span>
				)}
			</td>
		</tr>
	);
}
```

- [ ] **Step 4: Write `src/components/ParticipantView.tsx`**

```tsx
import {scoreParticipant} from '../lib/ranking';
import type {Game, Participant} from '../lib/types';
import {MatchRow} from './MatchRow';

interface ParticipantViewProps {
	games: Game[];
	participant: Participant;
}

export function ParticipantView({games, participant}: ParticipantViewProps) {
	const {exactCount, scored, total} = scoreParticipant(participant, games);

	return (
		<div className="space-y-4">
			<div className="flex items-end justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
				<div>
					<h2 className="font-display text-2xl font-bold text-white">
						{participant.name}
					</h2>

					<p className="text-sm text-slate-400">
						{exactCount} exact score{exactCount === 1 ? '' : 's'}
					</p>
				</div>

				<div className="text-right">
					<p className="font-display text-4xl font-bold text-amber-400">
						{total}
					</p>

					<p className="text-xs uppercase tracking-wider text-slate-400">
						points
					</p>
				</div>
			</div>

			<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
				<table className="w-full min-w-[640px] text-left">
					<thead>
						<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
							<th className="px-3 py-3">#</th>

							<th className="px-3 py-3">Group</th>

							<th className="hidden px-3 py-3 sm:table-cell">Date</th>

							<th className="px-3 py-3">Prediction</th>

							<th className="px-3 py-3 text-center">Result</th>

							<th className="px-3 py-3 text-center">Status</th>

							<th className="px-3 py-3 text-right">Points</th>
						</tr>
					</thead>

					<tbody>
						{scored.map((item) => (
							<MatchRow key={item.prediction.matchNo} scored={item} />
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
```

- [ ] **Step 5: Replace `src/App.tsx`**

```tsx
import {useEffect, useMemo, useState} from 'react';

import {Header} from './components/Header';
import {Leaderboard} from './components/Leaderboard';
import {ParticipantView} from './components/ParticipantView';
import {fetchGames, getMatchStatus} from './lib/games';
import {loadParticipants} from './lib/predictions';
import {buildLeaderboard} from './lib/ranking';
import type {GamesFile} from './lib/types';

const REFRESH_INTERVAL_MS =
	Number(import.meta.env.VITE_REFRESH_INTERVAL_MS) || 3_600_000;

function TabButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
				active
					? 'bg-emerald-500 text-emerald-950'
					: 'bg-white/5 text-slate-300 hover:bg-white/10'
			}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export default function App() {
	const participants = useMemo(loadParticipants, []);

	const [fetchFailed, setFetchFailed] = useState(false);
	const [gamesFile, setGamesFile] = useState<GamesFile | null>(null);
	const [tab, setTab] = useState('leaderboard');

	useEffect(() => {
		let active = true;

		const load = async () => {
			const file = await fetchGames();

			if (!active) {
				return;
			}

			if (file) {
				setFetchFailed(false);
				setGamesFile(file);
			}
			else {
				setFetchFailed(true);
			}
		};

		load();

		const intervalId = setInterval(load, REFRESH_INTERVAL_MS);

		return () => {
			active = false;
			clearInterval(intervalId);
		};
	}, []);

	const games = gamesFile?.games ?? [];

	const rows = useMemo(
		() => buildLeaderboard(participants, games),
		[participants, games]
	);

	const liveCount = games.filter(
		(game) => getMatchStatus(game) === 'live'
	).length;

	const statusText = gamesFile
		? `Last updated ${new Date(gamesFile.fetchedAt).toLocaleString('en-US', {
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				month: 'short',
			})}`
		: fetchFailed
			? 'Scores unavailable — showing predictions only'
			: 'Loading scores…';

	const selected = participants.find(
		(participant) => participant.name === tab
	);

	return (
		<div className="min-h-screen bg-slate-950 font-sans">
			<Header liveCount={liveCount} statusText={statusText} />

			<main className="mx-auto max-w-5xl px-4 py-6">
				<nav className="mb-6 flex gap-1 overflow-x-auto pb-1">
					<TabButton
						active={tab === 'leaderboard'}
						onClick={() => setTab('leaderboard')}
					>
						🏆 Leaderboard
					</TabButton>

					{participants.map((participant) => (
						<TabButton
							active={tab === participant.name}
							key={participant.name}
							onClick={() => setTab(participant.name)}
						>
							{participant.name}
						</TabButton>
					))}
				</nav>

				{selected ? (
					<ParticipantView games={games} participant={selected} />
				) : (
					<Leaderboard onSelect={setTab} rows={rows} />
				)}
			</main>
		</div>
	);
}
```

- [ ] **Step 6: Build and verify visually**

Run: `npm run build && npm test`
Expected: both pass.

Then run `npm run dev` in the background, open `http://localhost:5173` with the Playwright MCP browser, and verify: header renders with "Last updated"; Leaderboard shows Adriano with 0 points (all games notstarted); Adriano tab lists 72 prediction rows, all "Upcoming"/muted with "—" results. Take a screenshot. Kill the dev server.

- [ ] **Step 7: Commit**

```bash
git add src && git commit -m "Add leaderboard, participant view, and live-status UI"
```

---

### Task 10: GitHub Workflows

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `.github/workflows/update-scores.yml`

GOTCHA the design hinges on: pushes made with `GITHUB_TOKEN` do **not** trigger `push` workflows (GitHub recursion guard), so the score-update commit would never deploy. Fix: `deploy.yml` is also `workflow_call`-able and `update-scores.yml` calls it as a second job when a commit happened.

- [ ] **Step 1: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_call:
  workflow_dispatch:

permissions:
  contents: read
  id-token: write
  pages: write

concurrency:
  cancel-in-progress: true
  group: pages

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: master
      - uses: actions/setup-node@v4
        with:
          cache: npm
          node-version: 22
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

(`ref: master` matters: when called from the scheduled workflow after it pushes a new commit, the default checkout would build the pre-push SHA.)

- [ ] **Step 2: Write `.github/workflows/update-scores.yml`**

```yaml
name: Update Scores

on:
  schedule:
    - cron: '0 * * * *'
  workflow_dispatch:

permissions:
  contents: write

jobs:
  update:
    outputs:
      changed: ${{ steps.commit.outputs.changed }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - env:
          API_URL: ${{ vars.API_URL || 'https://worldcup26.ir' }}
        run: node scripts/update-scores.mjs
      - id: commit
        run: |
          if git diff --quiet; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
          else
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add public/games.json
            git commit -m "Update scores"
            git push
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

  deploy:
    if: needs.update.outputs.changed == 'true'
    needs: update
    permissions:
      contents: read
      id-token: write
      pages: write
    uses: ./.github/workflows/deploy.yml
```

Refresh cadence is the `cron` line; score source is the `API_URL` repository variable (falls back to the default).

- [ ] **Step 3: Commit**

```bash
git add .github && git commit -m "Add Pages deploy and hourly score-update workflows"
```

---### Task 11: README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# AC World Cup 2026 BET

Leaderboard for the Analytics Cloud World Cup 2026 betting pool. Static site
(GitHub Pages): predictions are CSVs bundled at build time; live scores arrive
via a scheduled GitHub Action that commits `public/games.json`.

## How It Works

- **Predictions** — one CSV per participant in `src/data/predictions/`,
  exported from the pool's Google Sheet (per-person tab → File → Download →
  CSV). Drop a file in, rebuild, done. Predictions are frozen before kickoff.
- **Scores** — `.github/workflows/update-scores.yml` runs hourly, fetches the
  [worldcup26.ir](https://github.com/rezarahiminia/worldcup2026) API
  server-side (it has no CORS), normalizes it into `public/games.json`, and
  commits when something changed; that triggers a Pages deploy. A left-open tab
  also re-fetches `games.json` every `VITE_REFRESH_INTERVAL_MS`.

## Scoring

Highest matching tier wins, per match: **25** exact score · **18** correct
winner & winner's goals · **15** correct winner & goal difference · **12**
correct draw, wrong score · **10** correct winner only. Matches that have not
started are not scored; live matches score provisionally. Ties share a rank
(competition ranking).

## Configuration

| Setting | Where | Default |
| --- | --- | --- |
| Score refresh cadence | `cron` in `update-scores.yml` | hourly |
| Score source | `API_URL` repository variable | `https://worldcup26.ir` |
| Client re-fetch interval | `VITE_REFRESH_INTERVAL_MS` (build-time) | `3600000` |
| Games file URL | `VITE_GAMES_URL` (build-time) | `<base>/games.json` |

## Development

```bash
npm install
npm run dev            # dev server
npm test               # unit tests (scoring, ranking, parsers)
npm run build          # production build
npm run update-scores  # refresh public/games.json from the API
```
```

- [ ] **Step 2: Commit**

```bash
git add README.md && git commit -m "Add README"
```

---

### Task 12: Publish — GitHub Repo, Pages, Live Verification

**Files:** none (operational task)

- [ ] **Step 1: Create the repo and push**

```bash
cd /home/me/dev/projects/adriano/ac-worldcup-2026-bet
gh repo create interaminense/ac-worldcup-2026-bet --public --source=. --push
```
Expected: repo created, `master` pushed.

- [ ] **Step 2: Enable Pages with Actions as the source**

```bash
gh api repos/interaminense/ac-worldcup-2026-bet/pages -X POST -f build_type=workflow
```
Expected: HTTP 201. (If Pages already exists, use `-X PUT` instead.)

- [ ] **Step 3: Trigger the deploy and watch it**

```bash
gh workflow run deploy.yml --repo interaminense/ac-worldcup-2026-bet
gh run watch --repo interaminense/ac-worldcup-2026-bet --exit-status
```
Expected: deploy succeeds.

- [ ] **Step 4: Verify the live site**

Run: `curl -s -o /dev/null -w "%{http_code}" https://interaminense.github.io/ac-worldcup-2026-bet/`
Expected: `200`. Then open it in the Playwright MCP browser and confirm the leaderboard renders with real `games.json` data. Screenshot for the user.

- [ ] **Step 5: Smoke-test the update workflow**

```bash
gh workflow run update-scores.yml --repo interaminense/ac-worldcup-2026-bet
gh run watch --repo interaminense/ac-worldcup-2026-bet --exit-status
```
Expected: run succeeds; deploy job is skipped if games are unchanged (idempotence already proven locally).

---

## Final Acceptance Checklist

- [ ] `npm test` — all unit tests green (scoring tiers, ranking ties, CSV parsing, normalization, join/orientation)
- [ ] `npm run build` — clean production build
- [ ] Live site loads on GitHub Pages with the leaderboard and Adriano's 72 predictions
- [ ] `update-scores.yml` runs green and is idempotent
- [ ] Dropping a new participant CSV into `src/data/predictions/` requires no code change
