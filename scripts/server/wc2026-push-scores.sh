#!/usr/bin/env bash
# wc2026 score poller — server edition.
#
# Mirrors the local cron wrapper: polls the score sources and pushes them to
# Firebase RTDB (the `games` node), writing only when scores change, and runs
# the AI commentary + Slack digest when a match finishes (if the keys are set).
# Driven every minute by cron during the match window. Self-disables after the
# group stage.
#
# The only difference from the local wrapper is the repo location, which is
# configurable via WC2026_REPO_DIR (defaults to ~/ac-world-cup-2026-bet, where
# bootstrap.sh clones it).
set -u

REPO_DIR="${WC2026_REPO_DIR:-$HOME/ac-world-cup-2026-bet}"

export PATH="/usr/bin:/usr/local/bin:$HOME/.local/bin:$PATH"
export GOOGLE_APPLICATION_CREDENTIALS="${GOOGLE_APPLICATION_CREDENTIALS:-$HOME/.config/wc2026/serviceAccount.json}"

# ANTHROPIC_API_KEY (commentary) + SLACK_WEBHOOK_URL (digest), kept out of this
# script. Without them the poller stays scores-only.
[ -f "$HOME/.config/wc2026/env" ] && . "$HOME/.config/wc2026/env"

LOG="$HOME/.local/share/wc2026-push/push.log"
mkdir -p "$(dirname "$LOG")"

# Stop after the group stage (same cutoff as the local cron). Bump this date to
# keep polling through the knockout rounds.
if [ "$(date +%Y%m%d)" -gt 20260628 ]; then
	exit 0
fi

{
	echo "[$(date -Is)] polling"
	cd "$REPO_DIR" && node scripts/push-scores.mjs 2>&1
} >>"$LOG"

tail -n 200 "$LOG" >"$LOG.tmp" && mv "$LOG.tmp" "$LOG"
