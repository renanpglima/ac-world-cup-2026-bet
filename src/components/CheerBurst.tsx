import {useMemo} from 'react';

import {REACTIONS} from './Reactions';

const PARTICLES = 15;

interface Particle {
	begin: number;
	dur: number;
	dx: number;
	dy: number;
	emoji: string;
	rot: number;
	size: number;
}

// A cheer explosion anchored at the flag: a small ring of random supported
// emoji that bursts outward from (x, y) and fades. SMIL drives each particle;
// the parent unmounts the burst when it's done.
export function CheerBurst({x, y}: {x: number; y: number}) {
	const particles = useMemo<Particle[]>(
		() =>
			Array.from({length: PARTICLES}, (_, index) => {
				const angle =
					(Math.PI * 2 * index) / PARTICLES + Math.random() * 0.6;
				const distance = 90 + Math.random() * 90;

				return {
					begin: Math.random() * 0.06,
					dur: 0.85 + Math.random() * 0.4,
					dx: Math.cos(angle) * distance,
					dy: Math.sin(angle) * distance,
					emoji: REACTIONS[
						Math.floor(Math.random() * REACTIONS.length)
					].emoji,
					rot: Math.random() * 120 - 60,
					size: 18 + Math.random() * 14,
				};
			}),
		[]
	);

	return (
		<svg className="absolute inset-0 h-full w-full">
			{particles.map((particle, index) => (
				<g key={index}>
					<animateTransform
						attributeName="transform"
						begin={`${particle.begin}s`}
						calcMode="spline"
						dur={`${particle.dur}s`}
						fill="freeze"
						from={`${x} ${y}`}
						keySplines="0.15 0.7 0.3 1"
						keyTimes="0;1"
						to={`${x + particle.dx} ${y + particle.dy}`}
						type="translate"
					/>

					<text
						fontSize={particle.size}
						opacity="0"
						textAnchor="middle"
					>
						{particle.emoji}

						<animate
							attributeName="opacity"
							begin={`${particle.begin}s`}
							dur={`${particle.dur}s`}
							fill="freeze"
							keyTimes="0;0.18;0.6;1"
							values="0;1;1;0"
						/>

						<animateTransform
							attributeName="transform"
							begin={`${particle.begin}s`}
							dur={`${particle.dur}s`}
							fill="freeze"
							from="0"
							to={`${particle.rot}`}
							type="rotate"
						/>
					</text>
				</g>
			))}
		</svg>
	);
}

export function CheerBurstLayer({
	bursts,
}: {
	bursts: Array<{id: number; x: number; y: number}>;
}) {
	return (
		<div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
			{bursts.map((burst) => (
				<CheerBurst key={burst.id} x={burst.x} y={burst.y} />
			))}
		</div>
	);
}
