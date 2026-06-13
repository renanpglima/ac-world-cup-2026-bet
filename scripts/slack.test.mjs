import {describe, expect, it} from 'vitest';

import {parsePredictions} from './commentary-facts.mjs';
import {buildSlackMessage} from './slack.mjs';

const players = parsePredictions(
	new URL('../src/data/predictions/', import.meta.url)
);

function gamesWith(results) {
	const fixtures = players[0].preds;

	return Object.entries(fixtures).map(([matchNo, fx]) => {
		const sim = results[matchNo];

		return {
			awayScore: sim ? sim[1] : 0,
			awayTeam: fx.team2,
			finished: Boolean(sim),
			homeScore: sim ? sim[0] : 0,
			homeTeam: fx.team1,
			id: Number(matchNo),
			timeElapsed: sim ? 'finished' : 'notstarted',
		};
	});
}

describe('buildSlackMessage', () => {
	const message = buildSlackMessage(1, gamesWith({1: [2, 0]}), players, {
		byMatch: {1: {en: 'Test comment'}},
	});

	it('starts with the ball header and the match score', () => {
		expect(message.startsWith('⚽ Round over — Mexico 2 x 0 South Africa')).toBe(
			true
		);
	});

	it('includes the AI comment, the ranking and the link', () => {
		expect(message).toContain('🎙️ Test comment');
		expect(message).toMatch(/\n1\. \w.+ — \d+ pts/);
		expect(message.trimEnd().endsWith(
			'https://interaminense.github.io/ac-world-cup-2026-bet/'
		)).toBe(true);
	});

	it('uses no medals — plain numbered ranking', () => {
		expect(message).not.toMatch(/🥇|🥈|🥉/u);
	});
});
