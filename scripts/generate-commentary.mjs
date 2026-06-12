import {existsSync, readFileSync, writeFileSync} from 'node:fs';

import {
	buildLeaderboardFacts,
	buildMatchFacts,
	finishedFixtures,
	parsePredictions,
} from './commentary-facts.mjs';

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

const BOARD_SYSTEM = `You are the commentator for the "AC World Cup 2026 BET" office pool. Given the current standings, produce a state-of-the-race recap and a one-line title for every participant.

recap: 2-3 punchy sentences on the title race, the chasers, and the strugglers. Playful, never mean; use the real names and numbers. Plain text — NO emojis.

titles: for each participant, a very short tag (max ~3 words, plain text, NO emojis) capturing their current vibe — e.g. "On fire", "Ice cold", "Co-leader", "Backed Qatar". Base it on rank, points, exact-score count and recent form.

Everything in three languages — en: American English, pt: Brazilian Portuguese, es: Spain Spanish (castellano).`;

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

	const block = response.content.find((b) => b.type === 'text');

	return JSON.parse(block.text);
}

async function commentMatch(facts) {
	return callJson(MATCH_SYSTEM, facts, LOCALIZED_SCHEMA);
}

async function commentBoard(facts) {
	const schema = {
		additionalProperties: false,
		properties: {
			recap: LOCALIZED_SCHEMA,
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
		required: ['recap', 'titles'],
		type: 'object',
	};

	const result = await callJson(BOARD_SYSTEM, facts, schema);

	return {
		recap: result.recap,
		titles: Object.fromEntries(
			result.titles.map(({name, ...langs}) => [name, langs])
		),
	};
}

const games = JSON.parse(readFileSync(GAMES_FILE, 'utf8')).games;
const players = parsePredictions(PRED_DIR);

const commentary = existsSync(OUT_FILE)
	? JSON.parse(readFileSync(OUT_FILE, 'utf8'))
	: {byMatch: {}};

commentary.byMatch ??= {};

const pending = finishedFixtures(games, players).filter(
	(fixture) => !commentary.byMatch[fixture.matchNo]
);

if (pending.length === 0) {
	console.log('No newly finished matches; commentary is up to date.');
	process.exit(0);
}

if (DRY_RUN) {
	console.log(
		`[dry run] no ANTHROPIC_API_KEY — would generate commentary for ${pending.length} match(es):`
	);

	for (const fixture of pending) {
		console.log(JSON.stringify(buildMatchFacts(fixture, games, players)));
	}

	console.log('[dry run] leaderboard facts:');
	console.log(JSON.stringify(buildLeaderboardFacts(games, players)));
	process.exit(0);
}

for (const fixture of pending) {
	const facts = buildMatchFacts(fixture, games, players);

	try {
		commentary.byMatch[fixture.matchNo] = await commentMatch(facts);
		console.log(`Generated commentary for match ${fixture.matchNo}`);
	}
	catch (error) {
		console.error(`Match ${fixture.matchNo} failed: ${error.message}`);
	}
}

try {
	commentary.leaderboard = await commentBoard(
		buildLeaderboardFacts(games, players)
	);
	console.log('Generated leaderboard recap and titles');
}
catch (error) {
	console.error(`Leaderboard commentary failed: ${error.message}`);
}

commentary.generatedAt = new Date().toISOString();
writeFileSync(OUT_FILE, `${JSON.stringify(commentary, null, '\t')}\n`);
console.log('Wrote public/commentary.json');
