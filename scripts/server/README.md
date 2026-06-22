# Running the score poller on a free VM

The poller (`scripts/push-scores.mjs`) normally runs from a local cron on a
developer machine. To keep it running without that machine, host it on a free
always-on VM. This mirrors the local setup exactly: a per-minute cron in the
match window, writing to Firebase RTDB only when scores change, with the AI
commentary + Slack digest when a match finishes.

## 1. Create the VM (pick one — both are free indefinitely)

### Google Cloud — e2-micro Always Free (recommended)

1. Sign in at <https://console.cloud.google.com> (a card is required for
   identity; Always Free usage is not charged).
2. **Compute Engine → VM instances → Create instance.**
3. **Region:** `us-central1` (or `us-west1` / `us-east1` — these are the
   Always-Free-eligible regions). **Machine type:** `e2-micro`.
4. **Boot disk:** Ubuntu 24.04 LTS, 30 GB standard persistent disk (the
   Always Free allowance). Leave firewall unchecked — the poller only makes
   outbound calls.
5. Create, then open **SSH** (the browser SSH button).

### Oracle Cloud — Always Free (alternative)

Create an **Always Free** compute instance with an Ubuntu image. Prefer
`VM.Standard.E2.1.Micro` (AMD) — it provisions reliably; the Ampere A1 ARM shape
is also free but is often "out of capacity" in popular regions. SSH in with the
key you set during creation.

## 2. Bootstrap

On the VM:

```bash
curl -fsSL https://raw.githubusercontent.com/interaminense/ac-world-cup-2026-bet/master/scripts/server/bootstrap.sh | bash
```

This installs Node 22, git, and cron; sets the timezone to
`America/Sao_Paulo`; clones the repo to `~/ac-world-cup-2026-bet`; installs the
runtime dependencies; and installs the per-minute cron for the match window
(`12:00–03:59`). It is idempotent — re-run it to update the checkout.

## 3. Upload the secrets (not done by the script)

Two files, exactly as on the local machine. From your **local** machine:

```bash
# GCP (uses gcloud scp; <VM> is the instance name, <ZONE> e.g. us-central1-a):
gcloud compute scp ~/.config/wc2026/serviceAccount.json <VM>:~/.config/wc2026/serviceAccount.json --zone <ZONE>
gcloud compute scp ~/.config/wc2026/env               <VM>:~/.config/wc2026/env               --zone <ZONE>

# Oracle / generic (plain scp with your key):
scp -i <key> ~/.config/wc2026/serviceAccount.json ubuntu@<VM_IP>:~/.config/wc2026/serviceAccount.json
scp -i <key> ~/.config/wc2026/env                 ubuntu@<VM_IP>:~/.config/wc2026/env
```

Then on the VM lock them down:

```bash
chmod 600 ~/.config/wc2026/serviceAccount.json ~/.config/wc2026/env
```

The `env` file is optional — without it the poller stays scores-only (no
commentary, no Slack). Its contents:

```bash
export ANTHROPIC_API_KEY=...     # AI commentary (optional)
export SLACK_WEBHOOK_URL=...      # Slack match digest (optional)
```

## 4. Verify

```bash
# Run the wrapper once by hand and read the log:
~/ac-world-cup-2026-bet/scripts/server/wc2026-push-scores.sh
tail -n 20 ~/.local/share/wc2026-push/push.log

# Confirm the cron is installed:
crontab -l
```

A healthy run logs either `Pushed N games to RTDB` or `Games unchanged …
skipping write`. The live site reflects RTDB within seconds.

## 5. Operate

- **Watch logs:** `tail -f ~/.local/share/wc2026-push/push.log`
- **Stop early:** `crontab -r` (or delete the two `wc2026-push-scores.sh`
  lines with `crontab -e`). The wrapper also **self-disables after
  2026-06-28** (the group-stage cutoff).
- **Cover the knockouts:** bump the `20260628` date in
  `scripts/server/wc2026-push-scores.sh`, commit, then re-run `bootstrap.sh`
  on the VM to pull it.
- **Update after a code change:** re-run `bootstrap.sh` (it fast-forwards the
  checkout and reinstalls deps).

## Notes

- Only **one** poller should run the commentary/Slack step at a time, or
  finished-match digests double-post. If you keep the local cron running too,
  remove the `ANTHROPIC_API_KEY`/`SLACK_WEBHOOK_URL` from one of them.
- The service account and `env` live only on the VM (and your machine), never
  in the repo.
