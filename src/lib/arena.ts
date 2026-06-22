export interface Ball {
	claimedBy: string | null;
	id: number;
	t0: number;
	vx: number;
	vy: number;
	x0: number;
	y0: number;
}

// The ball's center bounces within this margin of the field edges (fractions).
export const BALL_WALL = 0.04;

// Default ball speed, in fractions of the field per second.
export const BALL_SPEED = 0.25;

// A start position in the inner field, away from the edges (fractions 0–1).
export function randomBallPosition(): {x: number; y: number} {
	return {
		x: 0.08 + Math.random() * 0.84,
		y: 0.08 + Math.random() * 0.84,
	};
}

// A velocity vector of magnitude `speed`, pointing in a random direction.
export function randomVelocity(speed = BALL_SPEED): {vx: number; vy: number} {
	const angle = Math.random() * Math.PI * 2;

	return {vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed};
}

// One axis of motion with elastic wall bounces, in closed form: fold the
// straight-line position into [min, max] with a triangle wave. Pure and
// deterministic, so every client computes the same position from the same seed
// and elapsed time.
export function reflect(
	start: number,
	velocity: number,
	elapsed: number,
	min: number,
	max: number
): number {
	const range = max - min;

	if (range <= 0) {
		return min;
	}

	const period = range * 2;
	const offset = start + velocity * elapsed - min;
	const wrapped = ((offset % period) + period) % period;
	const folded = wrapped <= range ? wrapped : period - wrapped;

	return min + folded;
}

// The ball's current position (fractions), bouncing off the four walls.
export function ballPositionAt(
	ball: Ball,
	nowMs: number
): {x: number; y: number} {
	const elapsed = Math.max(0, (nowMs - ball.t0) / 1000);

	return {
		x: reflect(ball.x0, ball.vx, elapsed, BALL_WALL, 1 - BALL_WALL),
		y: reflect(ball.y0, ball.vy, elapsed, BALL_WALL, 1 - BALL_WALL),
	};
}

export function isBallHit(
	x: number,
	y: number,
	position: {x: number; y: number},
	radius: number
): boolean {
	const dx = x - position.x;
	const dy = y - position.y;

	return dx * dx + dy * dy <= radius * radius + Number.EPSILON;
}

export function nextBall(prevId: number, nowMs: number): Ball {
	const {x, y} = randomBallPosition();
	const {vx, vy} = randomVelocity();

	return {claimedBy: null, id: prevId + 1, t0: nowMs, vx, vy, x0: x, y0: y};
}

export function sortScores(
	scores: Record<string, number>
): [string, number][] {
	return Object.entries(scores).sort(
		(a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
	);
}
