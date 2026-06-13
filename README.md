# AC World Cup 2026 BET

Leaderboard for the Analytics Cloud World Cup 2026 betting pool, live at
**<https://interaminense.github.io/ac-world-cup-2026-bet/>**. Static site
(GitHub Pages): predictions are CSVs bundled at build time; live scores arrive
via a scheduled GitHub Action that commits `public/games.json`.

## Views

- **🏆 Leaderboard** — totals, exact-score count, competition ranking (ties
  share a rank).
- **⚽ Matches** — one card per game, grouped by the viewer's local day:
  kickoff time, live score, everyone's predictions ranked by points earned,
  and the what-if panel while the match is live.
- **📈 Race** — cumulative points per participant across the 17 group-stage
  days (finished matches only).
- **🎯 Bets** — pick a participant in the sub-menu to see their 72
  predictions with real scores, status, and per-match points color-coded by
  tier.
- **📜 Rules** — scoring tiers with examples, ranking rules, and how live
  matches are handled.

## How It Works

- **Predictions** — one CSV per participant in `src/data/predictions/`,
  exported from the pool's Google Sheet (per-person tab → File → Download →
  CSV). Drop a file in, rebuild, done. Predictions are frozen before kickoff.
- **Kickoff times** — the sheet records them in Brasília time (UTC-3); the UI
  converts each kickoff to the viewer's local timezone at render time.
- **What if…** — live match cards simulate one more goal for each side and
  show who gains, who drops, and how the ranking reshuffles.
- **Scores** — `.github/workflows/update-scores.yml` runs every 5 minutes
  and walks a source chain server-side: **FIFA's public JSON API**
  (`api.fifa.com`, live scores) → ESPN scoreboard → the
  [worldcup26.ir](https://github.com/rezarahiminia/worldcup2026) API. The
  first healthy source wins, gets normalized into `public/games.json`, and is
  committed when something changed; the workflow then chains the Pages deploy
  itself (bot pushes cannot trigger `on: push`). A left-open tab also
  re-fetches `games.json` every `VITE_REFRESH_INTERVAL_MS`.
- **🎙️ AI commentary** — when a match finishes, the same workflow runs
  `scripts/generate-commentary.mjs`: it computes the facts (exact hitters,
  lone-wolf picks, ranking swings) and asks Claude for a witty blurb plus the
  leaderboard recap and per-player titles, in en/pt/es, written to
  `public/commentary.json`. The AI is only called when a match just finished —
  never on an unchanged tick. The frontend shows it in the viewer's language.
- **Slack digest** — when a match finishes, the same step posts a digest
  (match score, the English AI blurb, the full standings, and a link to the
  app) to the pool's Slack channel via a Workflow Builder webhook. Gated by the
  `SLACK_WEBHOOK_URL` secret, so it is a no-op when the secret is unset. The
  `notify-slack.yml` workflow (manual `workflow_dispatch`) re-posts the most
  recently finished match's digest on demand — handy for testing.

## Scoring

Highest matching tier wins, per match: **25** exact score · **18** correct
winner & winner's goals · **15** correct winner & goal difference · **12**
correct draw, wrong score · **10** correct winner only. Matches that have not
started are not scored; live matches score provisionally. Ties share a rank
(competition ranking).

## Configuration

| Setting | Where | Default |
| --- | --- | --- |
| Score refresh cadence | `cron` in `update-scores.yml` | every 5 min |
| Preferred score source | `SCORE_SOURCE` repository variable (`fifa`, `espn`, `worldcup26`) | `fifa` |
| worldcup26 base URL | `API_URL` repository variable | `https://worldcup26.ir` |
| Client re-fetch interval | `VITE_REFRESH_INTERVAL_MS` (build-time) | `3600000` |
| Games file URL | `VITE_GAMES_URL` (build-time) | `<base>/games.json` |
| Claude API key (commentary) | `ANTHROPIC_API_KEY` repository **secret** | — (required for commentary) |
| Commentary model | `COMMENTARY_MODEL` repository variable | `claude-sonnet-4-6` |
| Slack webhook (match digest) | `SLACK_WEBHOOK_URL` repository **secret** | — (no digest when unset) |

## Development

```bash
npm install
npm run dev            # dev server
npm test               # unit tests (scoring, ranking, parsers)
npm run build          # production build
npm run update-scores  # refresh public/games.json from the source chain
```
