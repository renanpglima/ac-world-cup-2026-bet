import {existsSync, readFileSync} from 'node:fs';

import {finishedFixtures, parsePredictions} from './commentary-facts.mjs';
import {buildSlackMessage, postToSlack} from './slack.mjs';

// Manual one-off: post the most recently finished match's digest. Used by the
// notify-slack workflow (workflow_dispatch) to test the integration in prod.
const GAMES_FILE = new URL('../public/games.json', import.meta.url);
const OUT_FILE = new URL('../public/commentary.json', import.meta.url);
const PRED_DIR = new URL('../src/data/predictions/', import.meta.url);

if (!process.env.SLACK_WEBHOOK_URL) {
	console.error('No SLACK_WEBHOOK_URL set.');
	process.exit(1);
}

const games = JSON.parse(readFileSync(GAMES_FILE, 'utf8')).games;
const players = parsePredictions(PRED_DIR);
const commentary = existsSync(OUT_FILE)
	? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
	: {byMatch: {}};

const finished = finishedFixtures(games, players);

if (finished.length === 0) {
	console.log('No finished matches to post.');
	process.exit(0);
}

const latest = finished[finished.length - 1];

await postToSlack(buildSlackMessage(latest.matchNo, games, players, commentary));

console.log(
	`Posted latest match ${latest.matchNo} (${latest.team1} x ${latest.team2}) to Slack.`
);
