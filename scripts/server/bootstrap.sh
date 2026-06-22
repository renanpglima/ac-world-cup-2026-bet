#!/usr/bin/env bash
# One-shot, idempotent setup for the wc2026 score poller on a fresh Ubuntu VM
# (GCP e2-micro / Oracle Always Free / any Ubuntu 22.04+). Safe to re-run — it
# fast-forwards the checkout and re-installs the cron. It does NOT handle
# secrets; see scripts/server/README.md for the two files you upload after.
#
#   curl -fsSL https://raw.githubusercontent.com/interaminense/ac-world-cup-2026-bet/master/scripts/server/bootstrap.sh | bash
#   # or, after cloning:  bash scripts/server/bootstrap.sh
set -euo pipefail

REPO_URL="https://github.com/interaminense/ac-world-cup-2026-bet.git"
REPO_DIR="${WC2026_REPO_DIR:-$HOME/ac-world-cup-2026-bet}"
TZ_NAME="${WC2026_TZ:-America/Sao_Paulo}"
NODE_MAJOR=22

echo "==> wc2026 poller bootstrap (repo: $REPO_DIR, tz: $TZ_NAME)"

sudo apt-get update -y

# 1. Node 22 (NodeSource installs to /usr/bin/node) + git + cron.
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_MAJOR" ]; then
	echo "==> installing Node $NODE_MAJOR"
	curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash -
	sudo apt-get install -y nodejs
fi
sudo apt-get install -y git cron
sudo systemctl enable --now cron

# 2. Timezone, so the cron match-window matches the local setup (12:00-03:59).
sudo timedatectl set-timezone "$TZ_NAME"

# 3. Clone or fast-forward the repo.
if [ -d "$REPO_DIR/.git" ]; then
	git -C "$REPO_DIR" pull --ff-only
else
	git clone "$REPO_URL" "$REPO_DIR"
fi

# 4. Runtime deps only — skips vite/tailwind/typescript so the 1GB micro VM is
#    happy (the poller needs only firebase-admin, papaparse, @anthropic-ai/sdk).
( cd "$REPO_DIR" && npm ci --omit=dev )

# 5. Config + log dirs (secrets go in ~/.config/wc2026, locked down).
mkdir -p "$HOME/.config/wc2026" "$HOME/.local/share/wc2026-push"
chmod 700 "$HOME/.config/wc2026"

# 6. Install the cron — same window as local, idempotent (re-run safe).
WRAPPER="$REPO_DIR/scripts/server/wc2026-push-scores.sh"
chmod +x "$WRAPPER"
(
	crontab -l 2>/dev/null | grep -vF "wc2026-push-scores.sh" || true
	echo "* 12-23 * * * $WRAPPER"
	echo "* 0-3 * * * $WRAPPER"
) | crontab -

echo
echo "==> base setup done. Remaining (secrets — NOT handled here):"
echo "  1. Upload the Firebase service account JSON to:"
echo "       ~/.config/wc2026/serviceAccount.json   (then: chmod 600 it)"
echo "  2. (optional) Create ~/.config/wc2026/env (chmod 600) with:"
echo "       export ANTHROPIC_API_KEY=...     # AI commentary"
echo "       export SLACK_WEBHOOK_URL=...      # Slack match digest"
echo "  3. Smoke test once:"
echo "       $WRAPPER && tail -n 20 ~/.local/share/wc2026-push/push.log"
echo
if [ -f "$HOME/.config/wc2026/serviceAccount.json" ]; then
	echo "  ✓ serviceAccount.json present."
else
	echo "  ⚠ serviceAccount.json NOT present yet — the poller will fail until you add it."
fi
echo "  cron installed:"
crontab -l | grep -F "wc2026-push-scores.sh" | sed 's/^/      /'
