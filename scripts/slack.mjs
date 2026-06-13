import {buildLeaderboardFacts, buildMatchFacts} from './commentary-facts.mjs';

const SITE = 'https://interaminense.github.io/ac-world-cup-2026-bet/';

// Builds the approved digest: header, AI comment (en), full ranking, link.
export function buildSlackMessage(matchNo, games, players, commentary) {
	const pred = players[0].preds[matchNo];
	const fixture = {
		group: pred.group,
		matchNo,
		team1: pred.team1,
		team2: pred.team2,
	};

	const facts = buildMatchFacts(fixture, games, players);
	const score = facts.result.replace(/(\d+)-(\d+)/, '$1 x $2');
	const comment = commentary.byMatch?.[matchNo]?.en ?? '';

	const ranking = buildLeaderboardFacts(games, players)
		.standings.map((row) => `${row.rank}. ${row.name} — ${row.total} pts`)
		.join('\n');

	return [
		`⚽ Round over — ${score}`,
		'',
		`🎙️ ${comment}`,
		'',
		ranking,
		'',
		SITE,
	].join('\n');
}

export async function postToSlack(text, webhook = process.env.SLACK_WEBHOOK_URL) {
	if (!webhook) {
		return false;
	}

	const response = await fetch(webhook, {
		body: JSON.stringify({text}),
		headers: {'Content-type': 'application/json'},
		method: 'POST',
	});

	if (!response.ok) {
		throw new Error(`Slack HTTP ${response.status}`);
	}

	return true;
}
