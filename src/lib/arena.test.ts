import {describe, expect, it} from 'vitest';

import {
	type Ball,
	BALL_SPEED,
	ballPositionAt,
	isBallHit,
	nextBall,
	randomBallPosition,
	randomVelocity,
	reflect,
	sortScores,
} from './arena';

describe('randomBallPosition', () => {
	it('stays within the inner field on every roll', () => {
		for (let i = 0; i < 200; i += 1) {
			const {x, y} = randomBallPosition();

			expect(x).toBeGreaterThanOrEqual(0.08);
			expect(x).toBeLessThanOrEqual(0.92);
			expect(y).toBeGreaterThanOrEqual(0.08);
			expect(y).toBeLessThanOrEqual(0.92);
		}
	});
});

describe('randomVelocity', () => {
	it('has the requested magnitude', () => {
		const {vx, vy} = randomVelocity(0.3);

		expect(Math.sqrt(vx * vx + vy * vy)).toBeCloseTo(0.3, 10);
	});
});

describe('reflect', () => {
	it('moves linearly with no bounce', () => {
		expect(reflect(0.5, 0.1, 1, 0, 1)).toBeCloseTo(0.6, 10);
	});

	it('bounces off the max wall', () => {
		expect(reflect(0.9, 0.2, 1, 0, 1)).toBeCloseTo(0.9, 10);
	});

	it('bounces off the min wall', () => {
		expect(reflect(0.1, -0.3, 1, 0, 1)).toBeCloseTo(0.2, 10);
	});

	it('handles multiple bounces', () => {
		expect(reflect(0, 1, 2.5, 0, 1)).toBeCloseTo(0.5, 10);
	});

	it('respects a non-zero min', () => {
		expect(reflect(0.5, 1, 0.3, 0.1, 0.9)).toBeCloseTo(0.8, 10);
	});
});

describe('ballPositionAt', () => {
	const ball: Ball = {
		claimedBy: null,
		id: 1,
		t0: 1000,
		vx: 0.1,
		vy: 0,
		x0: 0.5,
		y0: 0.5,
	};

	it('is the start position at t0', () => {
		const position = ballPositionAt(ball, 1000);

		expect(position.x).toBeCloseTo(0.5, 10);
		expect(position.y).toBeCloseTo(0.5, 10);
	});

	it('advances with elapsed time', () => {
		const position = ballPositionAt(ball, 2000);

		expect(position.x).toBeCloseTo(0.6, 10);
		expect(position.y).toBeCloseTo(0.5, 10);
	});
});

describe('isBallHit', () => {
	const position = {x: 0.5, y: 0.5};

	it('is a hit within the radius', () => {
		expect(isBallHit(0.5, 0.54, position, 0.06)).toBe(true);
	});

	it('is a hit exactly on the radius edge', () => {
		expect(isBallHit(0.56, 0.5, position, 0.06)).toBe(true);
	});

	it('misses beyond the radius', () => {
		expect(isBallHit(0.5, 0.7, position, 0.06)).toBe(false);
	});
});

describe('nextBall', () => {
	it('increments id, clears claim, and seeds time + velocity', () => {
		const ball = nextBall(4, 5000);

		expect(ball.id).toBe(5);
		expect(ball.claimedBy).toBeNull();
		expect(ball.t0).toBe(5000);
		expect(ball.x0).toBeGreaterThanOrEqual(0.08);
		expect(ball.x0).toBeLessThanOrEqual(0.92);
		expect(ball.y0).toBeGreaterThanOrEqual(0.08);
		expect(ball.y0).toBeLessThanOrEqual(0.92);
		expect(Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy)).toBeCloseTo(
			BALL_SPEED,
			10
		);
		expect(['normal', 'basket', 'gold']).toContain(ball.kind);
	});
});

describe('sortScores', () => {
	it('sorts by score desc, then name asc', () => {
		expect(sortScores({Ana: 3, Bob: 5, Cid: 5})).toEqual([
			['Bob', 5],
			['Cid', 5],
			['Ana', 3],
		]);
	});

	it('handles empty', () => {
		expect(sortScores({})).toEqual([]);
	});
});

import {
	BALL_VALUES,
	cursorColor,
	formatCountdown,
	pickBallKind,
	topScorer,
} from './arena';

describe('pickBallKind', () => {
	it('maps the weight bands', () => {
		expect(pickBallKind(0)).toBe('gold');
		expect(pickBallKind(0.09)).toBe('gold');
		expect(pickBallKind(0.1)).toBe('basket');
		expect(pickBallKind(0.34)).toBe('basket');
		expect(pickBallKind(0.35)).toBe('normal');
		expect(pickBallKind(0.99)).toBe('normal');
	});
});

describe('BALL_VALUES', () => {
	it('scores 1 / 2 / 5', () => {
		expect(BALL_VALUES).toEqual({basket: 2, gold: 5, normal: 1});
	});
});

describe('topScorer', () => {
	it('returns the highest, breaking ties by name', () => {
		expect(topScorer({Ana: 3, Bob: 5, Cid: 5})).toBe('Bob');
	});

	it('is null when empty or all zero', () => {
		expect(topScorer({})).toBeNull();
		expect(topScorer({Ana: 0})).toBeNull();
	});
});

describe('formatCountdown', () => {
	it('formats m:ss and clamps at zero', () => {
		expect(formatCountdown(120000)).toBe('2:00');
		expect(formatCountdown(65000)).toBe('1:05');
		expect(formatCountdown(0)).toBe('0:00');
		expect(formatCountdown(-500)).toBe('0:00');
	});
});

describe('cursorColor', () => {
	it('is deterministic and returns an hsl color', () => {
		expect(cursorColor('Adriano')).toBe(cursorColor('Adriano'));
		expect(cursorColor('Adriano')).toMatch(/^hsl\(\d+, 70%, 60%\)$/);
	});
});
