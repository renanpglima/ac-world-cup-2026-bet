import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import gamesJson from '../../public/games.json?raw';
import adrianoCsv from '../data/predictions/adriano.csv?raw';
import {findGameForPrediction} from './games';
import {parsePredictionsCsv} from './parsePredictions';
import type {GamesFile} from './types';

const {games} = JSON.parse(gamesJson) as GamesFile;
const participant = parsePredictionsCsv(adrianoCsv);

describe('real games.json + predictions CSV', () => {
	beforeEach(() => {
		vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('ships only the 72 group-stage games, all with team names', () => {
		expect(games).toHaveLength(72);

		for (const game of games) {
			expect(game.awayTeam, `game ${game.id}`).toBeTruthy();
			expect(game.homeTeam, `game ${game.id}`).toBeTruthy();
		}
	});

	it('joins every prediction to a game', () => {
		expect(participant?.predictions).toHaveLength(72);

		for (const prediction of participant?.predictions ?? []) {
			expect(
				findGameForPrediction(prediction, games),
				`match #${prediction.matchNo} (${prediction.team1} x ${prediction.team2})`
			).toBeDefined();
		}
	});
});
