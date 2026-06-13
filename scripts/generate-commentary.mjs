import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import {
	buildLeaderboardFacts,
	buildMatchFacts,
	computeBoard,
	finishedFixtures,
	liveFixtureCount,
	parsePredictions,
} from './commentary-facts.mjs';
import {buildSlackMessage, postToSlack} from './slack.mjs';

const GAMES_FILE = new URL('../public/games.json', import.meta.url);
const OUT_FILE = new URL('../public/commentary.json', import.meta.url);
const PRED_DIR = new URL('../src/data/predictions/', import.meta.url);

const MODEL = process.env.COMMENTARY_MODEL || 'claude-sonnet-4-6';
const DRY_RUN =
	process.argv.includes('--dry-run') || !process.env.ANTHROPIC_API_KEY;

const LOCALIZED_SCHEMA = {
	additionalProperties: false,
	properties: {
		en: {type: 'string'},
		es: {type: 'string'},
		pt: {type: 'string'},
	},
	required: ['en', 'pt', 'es'],
	type: 'object',
};

const MATCH_SYSTEM = `You are the in-house commentator for a friendly office World Cup 2026 betting pool called "AC World Cup 2026 BET". After each match you write ONE short, witty blurb (2-3 sentences) about how the pool's players did on that specific game.

Voice: playful, punchy, a little cheeky — a sports pundit roasting friends at a bar. Tease bold calls and bad luck, celebrate the winners, call out lone-wolf picks and big leaderboard swings. Always punch up or sideways, NEVER mean: mock the bet or the luck, never the person. Office-safe, no profanity or slurs.

Use only the real names, scores and numbers in the facts provided — never invent anything. Scoring: 25 exact score, 18 right winner & winner's goals, 15 right winner & goal difference, 12 right draw wrong score, 10 right winner only, 0 otherwise.

Return the SAME blurb in three languages — en: American English, pt: Brazilian Portuguese (casual "zoeira"), es: Spain Spanish (castellano).`;

const RECAP_SYSTEM = `You are the commentator for the "AC World Cup 2026 BET" office pool. The match day is over — there are no live games — so write a settled state-of-the-race recap: 2-3 punchy sentences on the title race, the chasers, and the strugglers. Playful, never mean; use the real names and numbers. Plain text — NO emojis.

Return it in three languages — en: American English, pt: Brazilian Portuguese, es: Spain Spanish (castellano).`;

const TITLES_SYSTEM = `You are the commentator for the "AC World Cup 2026 BET" office pool. For every participant in the standings, write a very short tag (max ~3 words, plain text, NO emojis) capturing their current vibe — e.g. "On fire", "Ice cold", "Co-leader", "Backed the upset". Base it on rank, points, exact-score count and recent form. Return exactly one entry per participant.

Return each tag in three languages — en: American English, pt: Brazilian Portuguese, es: Spain Spanish (castellano).`;

let anthropic;

async function client() {
	if (!anthropic) {
		const {default: Anthropic} = await import('@anthropic-ai/sdk');

		anthropic = new Anthropic();
	}

	return anthropic;
}

async function callJson(system, facts, schema) {
	const response = await (await client()).messages.create({
		max_tokens: 1500,
		messages: [{content: JSON.stringify(facts), role: 'user'}],
		model: MODEL,
		output_config: {format: {schema, type: 'json_schema'}},
		system,
	});

	if (response.stop_reason === 'refusal') {
		throw new Error('model refused');
	}

	return JSON.parse(response.content.find((b) => b.type === 'text').text);
}

async function commentMatch(facts) {
	return callJson(MATCH_SYSTEM, facts, LOCALIZED_SCHEMA);
}

async function commentRecap(facts) {
	return callJson(RECAP_SYSTEM, facts, LOCALIZED_SCHEMA);
}

async function commentTitles(facts) {
	const schema = {
		additionalProperties: false,
		properties: {
			titles: {
				items: {
					additionalProperties: false,
					properties: {
						en: {type: 'string'},
						es: {type: 'string'},
						name: {type: 'string'},
						pt: {type: 'string'},
					},
					required: ['name', 'en', 'pt', 'es'],
					type: 'object',
				},
				type: 'array',
			},
		},
		required: ['titles'],
		type: 'object',
	};

	const result = await callJson(TITLES_SYSTEM, facts, schema);

	return Object.fromEntries(
		result.titles.map(({name, ...langs}) => [name, langs])
	);
}

const games = JSON.parse(readFileSync(GAMES_FILE, 'utf8')).games;
const players = parsePredictions(PRED_DIR);

const commentary = existsSync(OUT_FILE)
	? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
	: {byMatch: {}};

commentary.byMatch ??= {};
commentary.leaderboard ??= {};

const board = computeBoard(games, players);
// A signature of the standings — changes whenever a goal (or kickoff / final
// whistle) moves anyone's points, i.e. whenever the ranking actually changes.
const signature = JSON.stringify(board.map((row) => [row.name, row.total]));
const live = liveFixtureCount(games, players);
const hasScores = board.some((row) => row.total > 0);

const pendingMatches = finishedFixtures(games, players).filter(
	(fixture) => !commentary.byMatch[fixture.matchNo]
);

// Titles track every ranking change (every goal). Recap is the settled summary
// — only refreshed once a match day has no live games left.
const needTitles =
	hasScores && signature !== commentary.leaderboard.titlesSignature;
const needRecap =
	hasScores &&
	live === 0 &&
	signature !== commentary.leaderboard.recapSignature;

if (pendingMatches.length === 0 && !needTitles && !needRecap) {
	console.log('Commentary up to date; nothing to generate.');
	process.exit(0);
}

if (DRY_RUN) {
	console.log(
		`[dry run] no ANTHROPIC_API_KEY — matches=${pendingMatches.length} titles=${needTitles} recap=${needRecap} liveGames=${live}`
	);

	for (const fixture of pendingMatches) {
		console.log(JSON.stringify(buildMatchFacts(fixture, games, players)));
	}

	if (needTitles || needRecap) {
		console.log(JSON.stringify(buildLeaderboardFacts(games, players)));
	}

	process.exit(0);
}

for (const fixture of pendingMatches) {
	try {
		commentary.byMatch[fixture.matchNo] = await commentMatch(
			buildMatchFacts(fixture, games, players)
		);
		console.log(`Generated commentary for match ${fixture.matchNo}`);

		// Post the finished-match digest to Slack. Gated by SLACK_WEBHOOK_URL,
		// so a missing secret is a silent no-op rather than a hard failure.
		try {
			if (
				await postToSlack(
					buildSlackMessage(fixture.matchNo, games, players, commentary)
				)
			) {
				console.log(`Posted match ${fixture.matchNo} digest to Slack`);
			}
		}
		catch (slackError) {
			console.error(
				`Slack post for match ${fixture.matchNo} failed: ${slackError.message}`
			);
		}
	}
	catch (error) {
		console.error(`Match ${fixture.matchNo} failed: ${error.message}`);
	}
}

if (needTitles) {
	try {
		commentary.leaderboard.titles = await commentTitles(
			buildLeaderboardFacts(games, players)
		);
		commentary.leaderboard.titlesSignature = signature;
		console.log('Updated leaderboard titles (ranking changed)');
	}
	catch (error) {
		console.error(`Leaderboard titles failed: ${error.message}`);
	}
}

if (needRecap) {
	try {
		commentary.leaderboard.recap = await commentRecap(
			buildLeaderboardFacts(games, players)
		);
		commentary.leaderboard.recapSignature = signature;
		console.log('Updated leaderboard recap (no live games)');
	}
	catch (error) {
		console.error(`Leaderboard recap failed: ${error.message}`);
	}
}

commentary.generatedAt = new Date().toISOString();
writeFileSync(OUT_FILE, `${JSON.stringify(commentary, null, '\t')}\n`);
console.log('Wrote public/commentary.json');
