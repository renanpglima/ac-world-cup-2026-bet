import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';

import {fetchEspnGames} from './sources/espn.mjs';
import {fetchFifaGames} from './sources/fifa.mjs';
import {fetchWorldcup26Games} from './sources/worldcup26.mjs';

const SOURCES = {
	espn: fetchEspnGames,
	fifa: fetchFifaGames,
	worldcup26: fetchWorldcup26Games,
};

const DEFAULT_ORDER = ['fifa', 'espn', 'worldcup26'];

const OUT_DIR = new URL('../public/', import.meta.url);
const OUT_FILE = new URL('games.json', OUT_DIR);

const preferred = process.env.SCORE_SOURCE;

const order = preferred
	? [preferred, ...DEFAULT_ORDER.filter((name) => name !== preferred)]
	: DEFAULT_ORDER;

let games = null;
let source = null;

for (const name of order) {
	const fetchGames = SOURCES[name];

	if (!fetchGames) {
		console.error(`Unknown source "${name}"; skipping`);
		continue;
	}

	try {
		const candidate = await fetchGames();

		if (candidate.length === 0) {
			console.error(`Source "${name}" returned no games; trying next`);
			continue;
		}

		games = candidate;
		source = name;
		break;
	}
	catch (error) {
		console.error(`Source "${name}" failed: ${error.message}; trying next`);
	}
}

if (!games) {
	console.error('All score sources failed');
	process.exit(1);
}

if (existsSync(OUT_FILE)) {
	const previous = JSON.parse(readFileSync(OUT_FILE, 'utf8'));

	if (JSON.stringify(previous.games) === JSON.stringify(games)) {
		console.log(`Games unchanged (source: ${source}); skipping write`);
		process.exit(0);
	}
}

mkdirSync(OUT_DIR, {recursive: true});
writeFileSync(
	OUT_FILE,
	`${JSON.stringify(
		{fetchedAt: new Date().toISOString(), games, source},
		null,
		'\t'
	)}\n`
);
console.log(`Wrote ${games.length} games to public/games.json (source: ${source})`);
