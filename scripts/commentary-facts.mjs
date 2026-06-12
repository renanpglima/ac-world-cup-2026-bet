import {readFileSync, readdirSync} from 'node:fs';

import Papa from 'papaparse';

// FIFA vocabulary (API + sheet) vs any stray variants. Mirrors src/lib/games.ts.
const TEAM_ALIASES = {
	caboverde: 'capeverde',
	congodr: 'drcongo',
	cotedivoire: 'ivorycoast',
	czechia: 'czechrepublic',
	iriran: 'iran',
	korearepublic: 'southkorea',
	turkiye: 'turkey',
	usa: 'unitedstates',
};

export function normalizeTeam(name) {
	const key = (name ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '');

	return TEAM_ALIASES[key] ?? key;
}

// Tier scoring — identical to src/lib/scoring.ts. Highest applicable wins.
export function scorePrediction(p1, p2, r1, r2) {
	if (p1 === r1 && p2 === r2) {
		return 25;
	}

	const predictedDraw = p1 === p2;
	const realDraw = r1 === r2;

	if (predictedDraw && realDraw) {
		return 12;
	}

	if (predictedDraw || realDraw) {
		return 0;
	}

	if (p1 > p2 !== r1 > r2) {
		return 0;
	}

	if (Math.max(p1, p2) === Math.max(r1, r2)) {
		return 18;
	}

	if (p1 - p2 === r1 - r2) {
		return 15;
	}

	return 10;
}

export function parsePredictions(dir) {
	return readdirSync(dir)
		.filter((file) => file.endsWith('.csv'))
		.map((file) => {
			const {data} = Papa.parse(
				readFileSync(new URL(file, dir), 'utf8').trim(),
				{skipEmptyLines: 'greedy'}
			);

			const raw = (data[0]?.[0] ?? '').match(
				/PREDICTIONS & POINTS FOR:\s*(.+)/i
			)?.[1]?.trim();

			const name = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();

			const headerIndex = data.findIndex(
				(row) => row[0]?.trim() === 'Match #'
			);

			const preds = {};

			for (const row of data.slice(headerIndex + 1)) {
				const matchNo = Number(row[0]);

				if (
					!row[0]?.trim() ||
					!Number.isFinite(matchNo) ||
					!row[5]?.trim() ||
					!row[6]?.trim()
				) {
					continue;
				}

				preds[matchNo] = {
					group: row[1]?.trim() ?? '',
					p1: Number(row[5]),
					p2: Number(row[6]),
					team1: row[4].trim(),
					team2: row[7].trim(),
				};
			}

			return {name, preds};
		});
}

function status(game) {
	if (game.finished || game.timeElapsed === 'finished') {
		return 'finished';
	}

	if (game.timeElapsed === 'notstarted') {
		return 'notstarted';
	}

	return 'live';
}

function teamsMatch(fixture, game) {
	const home = normalizeTeam(game.homeTeam);
	const away = normalizeTeam(game.awayTeam);
	const t1 = normalizeTeam(fixture.team1);
	const t2 = normalizeTeam(fixture.team2);

	return (t1 === home && t2 === away) || (t1 === away && t2 === home);
}

function findGame(fixture, games) {
	const byId = games.find((game) => game.id === fixture.matchNo);

	if (byId && teamsMatch(fixture, byId)) {
		return byId;
	}

	return games.find((game) => teamsMatch(fixture, game));
}

function realScore(fixture, game) {
	const flipped =
		normalizeTeam(fixture.team1) === normalizeTeam(game.awayTeam);

	return flipped
		? {r1: game.awayScore, r2: game.homeScore}
		: {r1: game.homeScore, r2: game.awayScore};
}

function orientedPrediction(pred, fixture) {
	const flipped = normalizeTeam(pred.team1) !== normalizeTeam(fixture.team1);

	return {
		p1: flipped ? pred.p2 : pred.p1,
		p2: flipped ? pred.p1 : pred.p2,
	};
}

export function computeBoard(games, players) {
	const rows = players
		.map((player) => {
			let total = 0;
			let exact = 0;

			for (const [matchNo, pred] of Object.entries(player.preds)) {
				const fixture = {
					matchNo: Number(matchNo),
					team1: pred.team1,
					team2: pred.team2,
				};
				const game = findGame(fixture, games);

				if (!game || status(game) === 'notstarted') {
					continue;
				}

				const {r1, r2} = realScore(fixture, game);
				const pts = scorePrediction(pred.p1, pred.p2, r1, r2);

				total += pts;

				if (pts === 25) {
					exact++;
				}
			}

			return {exact, name: player.name, total};
		})
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

	let lastRank = 0;
	let lastTotal = Number.NaN;

	rows.forEach((row, index) => {
		row.rank = row.total === lastTotal ? lastRank : index + 1;
		lastRank = row.rank;
		lastTotal = row.total;
	});

	return rows;
}

function maskGame(games, target) {
	return games.map((game) =>
		game === target
			? {...game, finished: false, timeElapsed: 'notstarted'}
			: game
	);
}

// How many of the pool's fixtures are currently live (mirrors the frontend's
// header live-count, scoped to the 72 group-stage games the pool tracks).
export function liveFixtureCount(games, players) {
	const fixtures = players[0]?.preds ?? {};
	let count = 0;

	for (const [matchNo, fixture] of Object.entries(fixtures)) {
		const game = findGame(
			{matchNo: Number(matchNo), team1: fixture.team1, team2: fixture.team2},
			games
		);

		if (game && status(game) === 'live') {
			count++;
		}
	}

	return count;
}

// Group-stage fixtures the pool tracks, drawn from the first participant
// (every CSV shares the same 72 fixtures).
export function finishedFixtures(games, players) {
	const fixtures = players[0]?.preds ?? {};

	return Object.entries(fixtures)
		.map(([matchNo, fixture]) => ({matchNo: Number(matchNo), ...fixture}))
		.filter((fixture) => {
			const game = findGame(fixture, games);

			return game && status(game) === 'finished';
		})
		.sort((a, b) => a.matchNo - b.matchNo);
}

function outcome(a, b) {
	return a > b ? 'home' : a < b ? 'away' : 'draw';
}

export function buildMatchFacts(fixture, games, players) {
	const game = findGame(fixture, games);
	const {r1, r2} = realScore(fixture, game);
	const realOutcome = outcome(r1, r2);

	const entries = players.map((player) => {
		const pred = player.preds[fixture.matchNo];
		const {p1, p2} = orientedPrediction(pred, fixture);

		return {
			name: player.name,
			outcome: outcome(p1, p2),
			pick: `${p1}-${p2}`,
			points: scorePrediction(p1, p2, r1, r2),
		};
	});

	const rightOutcome = entries.filter((e) => e.outcome === realOutcome);

	const after = computeBoard(games, players);
	const before = computeBoard(maskGame(games, game), players);
	const beforeRank = Object.fromEntries(before.map((r) => [r.name, r.rank]));

	const movers = after.map((row) => ({
		name: row.name,
		places: beforeRank[row.name] - row.rank,
	}));

	const climb = [...movers].sort((a, b) => b.places - a.places)[0];
	const fall = [...movers].sort((a, b) => a.places - b.places)[0];

	return {
		biggestClimb: climb?.places > 0 ? climb : null,
		biggestFall: fall?.places < 0 ? fall : null,
		exactHitters: entries.filter((e) => e.points === 25).map((e) => e.name),
		group: fixture.group,
		leaderboardAfterTop3: after.slice(0, 3).map((r) => ({
			name: r.name,
			rank: r.rank,
			total: r.total,
		})),
		leaderboardBottom2: after.slice(-2).map((r) => ({
			name: r.name,
			rank: r.rank,
			total: r.total,
		})),
		loneRightOutcome:
			rightOutcome.length === 1 ? rightOutcome[0].name : null,
		matchNo: fixture.matchNo,
		result: `${fixture.team1} ${r1}-${r2} ${fixture.team2}`,
		winnerGoalsHitters: entries
			.filter((e) => e.points === 18)
			.map((e) => `${e.name} (${e.pick})`),
		zeros: entries.filter((e) => e.points === 0).map((e) => e.name),
	};
}

export function buildLeaderboardFacts(games, players) {
	const after = computeBoard(games, players);
	const finished = finishedFixtures(games, players);
	const latest = finished[finished.length - 1];
	const latestGame = latest && findGame(latest, games);

	const before = latestGame
		? computeBoard(maskGame(games, latestGame), players)
		: after;
	const beforeRank = Object.fromEntries(before.map((r) => [r.name, r.rank]));

	const standings = after.map((row) => {
		let lastPts = null;

		if (latest) {
			const pred = players.find((p) => p.name === row.name).preds[
				latest.matchNo
			];
			const {p1, p2} = orientedPrediction(pred, latest);
			const {r1, r2} = realScore(latest, latestGame);

			lastPts = scorePrediction(p1, p2, r1, r2);
		}

		return {
			exact: row.exact,
			lastMatchPoints: lastPts,
			movement: beforeRank[row.name] - row.rank,
			name: row.name,
			rank: row.rank,
			total: row.total,
		};
	});

	return {matchesPlayed: finished.length, standings};
}
