import {describe, expect, it} from 'vitest';

import {buildHeadToHead} from './headToHead';
import type {Game, Participant} from './types';

function makeGame(overrides: Partial<Game> = {}): Game {
	return {
		awayScore: 0,
		awayTeam: 'South Africa',
		finished: false,
		group: 'A',
		homeScore: 0,
		homeTeam: 'Mexico',
		id: 1,
		localDate: '06/11/2026 13:00',
		matchday: 1,
		timeElapsed: 'notstarted',
		...overrides,
	};
}

function makeParticipant(
	name: string,
	predictions: Array<[number, string, number, number, string]>
): Participant {
	return {
		name,
		predictions: predictions.map(([matchNo, team1, p1, p2, team2]) => ({
			date: 'Jun/11',
			group: 'Group A',
			matchNo,
			p1,
			p2,
			team1,
			team2,
			time: '13:00',
		})),
	};
}

// Ana nails the 2–0 (25); Bia picks 1–1 (0). One finished match.
const ANA = makeParticipant('Ana', [[1, 'Mexico', 2, 0, 'South Africa']]);
const BIA = makeParticipant('Bia', [[1, 'Mexico', 1, 1, 'South Africa']]);

const FINISHED = makeGame({
	finished: true,
	homeScore: 2,
	timeElapsed: 'finished',
});

describe('buildHeadToHead', () => {
	it('tallies the per-match duel with a clear winner', () => {
		const h2h = buildHeadToHead('Ana', 'Bia', [ANA, BIA], [FINISHED]);

		expect(h2h.winsA).toBe(1);
		expect(h2h.winsB).toBe(0);
		expect(h2h.ties).toBe(0);
		expect(h2h.matches).toHaveLength(1);
		expect(h2h.matches[0]).toMatchObject({
			aPoints: 25,
			bPoints: 0,
			winner: 'a',
		});
	});

	it('exposes both stat lines and cumulative point curves', () => {
		const h2h = buildHeadToHead('Ana', 'Bia', [ANA, BIA], [FINISHED]);

		expect(h2h.a.total).toBe(25);
		expect(h2h.b.total).toBe(0);
		expect(h2h.aPoints).toEqual([25]);
		expect(h2h.bPoints).toEqual([0]);
	});

	it('reports no decided matches before kickoff', () => {
		const h2h = buildHeadToHead('Ana', 'Bia', [ANA, BIA], [makeGame()]);

		expect(h2h.matches).toHaveLength(0);
		expect(h2h.winsA + h2h.winsB + h2h.ties).toBe(0);
	});
});
