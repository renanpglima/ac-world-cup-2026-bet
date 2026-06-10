# AC World Cup 2026 BET — Design

**Date:** 2026-06-09
**Status:** Approved

## Overview

A static, frontend-only web app (GitHub Pages) that tracks the Analytics Cloud team's World Cup 2026 group-stage betting pool: each participant's score predictions, live match results, per-match points, and a leaderboard.

No login, no POST requests, no backend at runtime. The deployed site only reads same-origin static files.

## Constraints That Shaped the Architecture

1. **The score API has no CORS** — `https://worldcup26.ir/get/games` returns no `Access-Control-Allow-Origin` and sets `Cross-Origin-Resource-Policy: same-origin`, so browsers block direct fetches from `*.github.io`. (Read endpoints are public — no auth needed — despite what its README says.)
2. **The Google Sheet is private** — and predictions are frozen before the cup starts anyway, so they do not need live reads.
3. **The API's "live" updates are unverified** — its repo seeds MongoDB from static CSVs and contains no scraper/feed client. Scores may only update if the maintainer updates them. The app must degrade gracefully and be source-swappable.

## Architecture

| Data | Changes? | Ingestion | Rationale |
|---|---|---|---|
| Predictions | Frozen pre-cup | One CSV per participant committed to `src/data/predictions/`, bundled at build time via `import.meta.glob` | No runtime sheet access, no auth, no CORS |
| Match scores | Live during tournament | Scheduled GitHub Action (cron, default hourly) fetches the API server-side and commits `public/games.json`; the frontend fetches it same-origin | CI is not subject to browser CORS; cadence configurable |

### GitHub Actions

- **`update-scores.yml`** — cron (default `0 * * * *`); fetches `${API_URL}/get/games`, normalizes to `games.json` with a `fetchedAt` timestamp, commits only when content changed.
- **`deploy.yml`** — build (Vite) and deploy to GitHub Pages on push to the default branch (including the Action's own `games.json` commits, so the published site refreshes hourly too).

## Data Model

### Predictions CSV (input, one file per participant)

Format observed in the sheet's per-person tabs (e.g. `AC _ World Cup 2026 - Adriano.csv`):

- Row 1: `PREDICTIONS & POINTS FOR: <NAME>` → participant name.
- Row 4 header: `Match #, Group, Date, Time, Team 1, Prediction T1, Prediction T2, Team 2, Real Score 1, Real Score 2, Points Earned`.
- Rows 5–76: the 72 group-stage matches with the participant's predicted score. `Real Score`/`Points Earned` columns are ignored (the app computes them).
- A trailing `TOTAL:` row is ignored.

Parsed into:

```ts
Participant { name: string; predictions: Prediction[] }
Prediction { matchNo: number; group: string; date: string; time: string;
             team1: string; p1: number; team2: string; p2: number }
```

### games.json (output of the Action, input to the frontend)

Normalized from the API's `/get/games`:

```ts
GamesFile { fetchedAt: string; games: Game[] }
Game { id: number; group: string; matchday: number; localDate: string;
       homeTeam: string; awayTeam: string; homeScore: number; awayScore: number;
       finished: boolean; timeElapsed: string /* "notstarted" | minutes | "finished" */ }
```

### Join

The **team-name pair is the authoritative join**: the sheet and the API order fixtures differently within matchdays, so `Prediction.matchNo ↔ Game.id` only lines up for some matches (verified: 17 of 72 in the real data). `findGameForPrediction` tries the id join first but trusts it only when the team pair agrees; otherwise it falls back to matching by team names + date (±1 day, the sources' local dates sit in different timezones) and logs a console warning, with a final team-names-only pass as a safety net.

Team names are normalized (diacritics, case, punctuation) and canonicalized through an alias map because the sheet uses FIFA names while the API uses different English names (Korea Republic ↔ South Korea, Czechia ↔ Czech Republic, USA ↔ United States, Türkiye ↔ Turkey, Côte d'Ivoire ↔ Ivory Coast, Cabo Verde ↔ Cape Verde, IR Iran ↔ Iran, Congo DR ↔ Democratic Republic of the Congo).

`games.json` ships only the 72 group-stage games (`type: 'group'` in the raw API): knockout placeholders have no team names until the bracket is decided, and excluding them also means a future knockout rematch of a group pairing can never collide with the team-name fallback.

## Scoring Rules (from the sheet's "Ranking and Rules" tab)

Tiers are mutually exclusive — the **highest** applicable tier wins, per match. Prediction `p1–p2` vs real `r1–r2`:

| Tier | Criterion | Points |
|---|---|---|
| 1 | Exact score (`p1==r1 && p2==r2`) | 25 |
| 2 | Correct winner & winner's goals | 18 |
| 3 | Correct winner & goal difference (`p1-p2 == r1-r2`) | 15 |
| 4 | Correct draw, incorrect score | 12 |
| 5 | Correct winner only | 10 |
| — | Wrong outcome | 0 |

Notes:

- Tiers 2/3/5 require the predicted winner to equal the real winner (no draws involved).
- Tier 4: both predicted and real results are draws but the score differs (exact draw score is tier 1).
- Matches with `timeElapsed == "notstarted"` are **not scored** (prevents the seeded `0–0` from counting as a real draw). Live (in-progress) matches yield **provisional** points, visually flagged; finished matches yield final points.

## Ranking

- Total = sum of per-match points over started matches.
- **Technical tie:** equal totals share the same rank (e.g. two participants ranked 3rd; the next is 5th — standard competition ranking). Alphabetical order within a tie.
- Leaderboard also shows the count of exact scores (25-point hits) as a stat column (not a tie-breaker).

## UI (English)

- **Header** — app title, `Last updated` (from `fetchedAt`), live indicator when any match is in progress.
- **Leaderboard (default view)** — Rank, Participant, Total Points, # Exact Scores; top-3 highlight; click a row to open that participant's tab.
- **Participant tabs** — one tab per participant (auto-derived from the CSV folder). Shows their 72 predictions: match number, group, date, `Team1 [p1] × [p2] Team2`, real score, points earned (color-coded by tier), and a status chip (Not started / Live / Finished). Running total at the top.
- **Status styling** — live matches pulse; finished matches show final points; not-started rows are muted.
- Responsive and mobile-friendly. World-Cup-themed, polished, organized (see requirement 7).

## Configuration (ENV)

| Variable | Default | Used by | Purpose |
|---|---|---|---|
| `API_URL` | `https://worldcup26.ir` | update-scores Action | Score source (swappable) |
| Action cron | `0 * * * *` | update-scores Action | Server-side refresh cadence |
| `VITE_REFRESH_INTERVAL_MS` | `3600000` | frontend | Client re-fetch of `games.json` for left-open tabs |
| `VITE_GAMES_URL` | `<base>/games.json` | frontend | Override games file location |

## Stack & Project Structure

Vite + React + TypeScript. PapaParse (CSV), Vitest (unit tests), Tailwind CSS (styling).

```
.github/workflows/deploy.yml
.github/workflows/update-scores.yml
public/games.json                  # committed by the Action
src/data/predictions/*.csv         # one per participant (dropped in manually)
src/lib/parsePredictions.ts        # CSV → Participant (pure)
src/lib/games.ts                   # games.json fetch + normalize (pure normalize)
src/lib/scoring.ts                 # tier engine (pure)
src/lib/ranking.ts                 # totals + competition ranking (pure)
src/components/{Header,Leaderboard,ParticipantView,MatchRow}.tsx
src/App.tsx
```

`src/lib/*` are pure modules with unit tests — scoring and ranking are the correctness core.

## Error Handling

- `games.json` missing/unreachable → app renders predictions with all matches "Not started", a banner notes scores are unavailable.
- Malformed prediction CSV → skip the file, console error, app continues with the rest.
- Join mismatch → team-name + date fallback, console warning.

## Testing

- **Vitest unit tests** (the bulk): scoring engine across all tiers + edge cases (draws, 0–0 finished, not-started exclusion, winner-goals vs goal-diff overlap), competition ranking with ties, CSV parsing (name extraction, trailing TOTAL row, quoted team names like `"Côte d'Ivoire"`), games normalization (string→number coercion, `FALSE` strings).
- **Manual/visual check** via `yarn dev` against the real seeded API data.

## Risks

1. The upstream API may never update scores in real time (seeded DB). Mitigated by truthful "Last updated" display, graceful degradation, and `API_URL` swappability.
2. Only one participant CSV is available at design time; the other 16 are dropped in later. The folder glob makes this a zero-code-change operation (rebuild only).
3. `Match # ↔ id` misalignment if either source renumbers — covered by the parse-time guard.

## Out of Scope

- Knockout stage (sheet covers group stage only; revisit later).
- Any write path (votes are frozen; no POST anywhere).
- Authentication.
