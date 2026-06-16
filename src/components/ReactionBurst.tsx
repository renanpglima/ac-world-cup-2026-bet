import {useMemo} from 'react';

const PER_BURST = 14;

interface Particle {
	begin: number;
	dur: number;
	dx: number;
	dy: number;
	rot: number;
	size: number;
	x: number;
	y: number;
}

// One SVG burst: PER_BURST copies of the emoji rise from the bottom-center,
// drift sideways, spin and fade — Google-Meet style. SMIL drives each particle
// so the animation is self-contained; the parent unmounts it when it's done.
function Burst({emoji}: {emoji: string}) {
	const particles = useMemo<Particle[]>(() => {
		const width = window.innerWidth;
		const height = window.innerHeight;
		const originX = width / 2;
		const originY = height - 80;

		return Array.from({length: PER_BURST}, () => ({
			begin: Math.random() * 0.2,
			dur: 1.3 + Math.random() * 0.5,
			dx: Math.random() * 280 - 140,
			dy: -(height * (0.45 + Math.random() * 0.4)),
			rot: Math.random() * 100 - 50,
			size: 22 + Math.random() * 24,
			x: originX + (Math.random() * 140 - 70),
			y: originY + (Math.random() * 40 - 20),
		}));
	}, []);

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
						from={`${particle.x} ${particle.y}`}
						keySplines="0.12 0.6 0.2 1"
						keyTimes="0;1"
						to={`${particle.x + particle.dx} ${particle.y + particle.dy}`}
						type="translate"
					/>

					<text
						fontSize={particle.size}
						opacity="0"
						textAnchor="middle"
					>
						{emoji}

						<animate
							attributeName="opacity"
							begin={`${particle.begin}s`}
							dur={`${particle.dur}s`}
							fill="freeze"
							keyTimes="0;0.12;0.65;1"
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

export function ReactionBurst({
	bursts,
}: {
	bursts: Array<{emoji: string; id: number}>;
}) {
	return (
		<div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
			{bursts.map((burst) => (
				<Burst emoji={burst.emoji} key={burst.id} />
			))}
		</div>
	);
}
