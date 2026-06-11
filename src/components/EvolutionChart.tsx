import {useState} from 'react';

import type {Evolution} from '../lib/evolution';

const COLORS = [
	'#fbbf24',
	'#34d399',
	'#60a5fa',
	'#f472b6',
	'#a78bfa',
	'#f87171',
	'#2dd4bf',
	'#fb923c',
	'#a3e635',
	'#22d3ee',
	'#e879f9',
	'#facc15',
	'#4ade80',
	'#93c5fd',
	'#fda4af',
	'#c084fc',
	'#5eead4',
];

const WIDTH = 800;
const HEIGHT = 340;
const PAD = {bottom: 30, left: 40, right: 16, top: 14};

export function EvolutionChart({evolution}: {evolution: Evolution}) {
	const {days, series} = evolution;

	const [hovered, setHovered] = useState<string | null>(null);

	if (days.length === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
				<p className="font-display text-lg font-bold text-white">
					The race hasn't started yet 🏁
				</p>

				<p className="mt-1 text-sm text-slate-400">
					Lines appear here after the first final whistle.
				</p>
			</div>
		);
	}

	const yMax = Math.max(25, ...series.flatMap((item) => item.totals));
	const innerWidth = WIDTH - PAD.left - PAD.right;
	const innerHeight = HEIGHT - PAD.top - PAD.bottom;

	const x = (index: number) =>
		PAD.left + ((index + 1) / days.length) * innerWidth;

	const y = (value: number) =>
		PAD.top + (1 - value / yMax) * innerHeight;

	const ticks = [...new Set(
		[0.25, 0.5, 0.75, 1].map((fraction) => Math.round(yMax * fraction))
	)];

	const colorByName = new Map(
		series.map((item, index) => [item.name, COLORS[index % COLORS.length]])
	);

	const ranked = [...series].sort(
		(a, b) =>
			(b.totals[b.totals.length - 1] ?? 0) -
				(a.totals[a.totals.length - 1] ?? 0) ||
			a.name.localeCompare(b.name)
	);

	return (
		<div className="space-y-4">
			<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-4">
				<svg
					aria-label="Cumulative points per participant across tournament days"
					className="min-w-[560px]"
					role="img"
					viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				>
					{ticks.map((tick) => (
						<g key={tick}>
							<line
								stroke="rgba(255,255,255,0.08)"
								x1={PAD.left}
								x2={WIDTH - PAD.right}
								y1={y(tick)}
								y2={y(tick)}
							/>

							<text
								fill="#94a3b8"
								fontSize="11"
								textAnchor="end"
								x={PAD.left - 6}
								y={y(tick) + 4}
							>
								{tick}
							</text>
						</g>
					))}

					<line
						stroke="rgba(255,255,255,0.15)"
						x1={PAD.left}
						x2={WIDTH - PAD.right}
						y1={y(0)}
						y2={y(0)}
					/>

					{days.map((day, index) => (
						<text
							fill="#94a3b8"
							fontSize="11"
							key={day}
							textAnchor="middle"
							x={x(index)}
							y={HEIGHT - 8}
						>
							{day}
						</text>
					))}

					{series.map((item) => {
						const color = colorByName.get(item.name);

						const points = [
							`${PAD.left},${y(0)}`,
							...item.totals.map(
								(value, index) => `${x(index)},${y(value)}`
							),
						].join(' ');

						const total = item.totals[item.totals.length - 1] ?? 0;

						return (
							<g
								className="transition-opacity duration-200"
								key={item.name}
								onMouseEnter={() => setHovered(item.name)}
								onMouseLeave={() => setHovered(null)}
								opacity={
									hovered && hovered !== item.name ? 0.2 : 1
								}
							>
								<polyline
									fill="none"
									points={points}
									stroke={color}
									strokeLinejoin="round"
									strokeWidth="2"
								/>

								{/* Invisible fat stroke: hover hit-area + line tooltip. */}
								<polyline
									fill="none"
									points={points}
									stroke="transparent"
									strokeWidth="14"
								>
									<title>{`${item.name} — ${total} pts`}</title>
								</polyline>

								{item.totals.map((value, index) => (
									<circle
										cx={x(index)}
										cy={y(value)}
										fill={color}
										key={days[index]}
										r="3.5"
									>
										<title>
											{`${item.name} — ${value} pts (${days[index]})`}
										</title>
									</circle>
								))}
							</g>
						);
					})}
				</svg>
			</div>

			<div className="flex flex-wrap gap-2">
				{ranked.map((item) => (
					<span
						className={`flex cursor-default items-center gap-1.5 rounded-full px-3 py-1 text-sm text-slate-300 transition-colors ${
							hovered === item.name ? 'bg-white/15' : 'bg-white/5'
						}`}
						key={item.name}
						onMouseEnter={() => setHovered(item.name)}
						onMouseLeave={() => setHovered(null)}
					>
						<span
							className="h-2.5 w-2.5 rounded-full"
							style={{backgroundColor: colorByName.get(item.name)}}
						/>

						{item.name}

						<span className="font-display font-bold text-amber-300">
							{item.totals[item.totals.length - 1] ?? 0}
						</span>
					</span>
				))}
			</div>
		</div>
	);
}
