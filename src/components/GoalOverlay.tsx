// Full-screen goal celebration: white letters ride a wave forever while soccer
// ball emojis of assorted sizes spin on their axis and bob around the text. It
// stays until the user clicks anywhere (the parent unmounts on onDismiss).
const TEXT = 'Goooooal';
const FONT_SIZE = 124;
const PAD_X = 90;
const HEIGHT = 360;

// Per-glyph advance (× FONT_SIZE) so the letters sit tight with natural kerning
// instead of an even grid — otherwise the narrow "l" floats with big gaps.
const ADVANCE: Record<string, number> = {G: 0.72, a: 0.58, l: 0.34, o: 0.6};

// Balls framing the text — kept out of the central band (y ≈ 0.32–0.68) so they
// never sit on top of the letters. {x,y} are fractions of the viewBox; r is the
// emoji's half-size.
const BALLS = [
	{dir: 1, float: 2.8, r: 34, spin: 3.6, x: 0.05, y: 0.5},
	{dir: -1, float: 3.6, r: 40, spin: 5.2, x: 0.95, y: 0.46},
	{dir: 1, float: 3, r: 26, spin: 4.2, x: 0.45, y: 0.13},
	{dir: -1, float: 2.6, r: 20, spin: 2.4, x: 0.22, y: 0.18},
	{dir: 1, float: 2.7, r: 16, spin: 2, x: 0.71, y: 0.16},
	{dir: -1, float: 3.2, r: 22, spin: 2.8, x: 0.32, y: 0.85},
	{dir: 1, float: 2.3, r: 14, spin: 1.8, x: 0.6, y: 0.88},
	{dir: -1, float: 3.4, r: 28, spin: 4.6, x: 0.83, y: 0.83},
];

export function GoalOverlay({onDismiss}: {onDismiss: () => void}) {
	const letters = [...TEXT];
	const advances = letters.map((char) => (ADVANCE[char] ?? 0.6) * FONT_SIZE);
	const width = advances.reduce((sum, adv) => sum + adv, 0) + PAD_X * 2;

	const centers: number[] = [];
	let cursor = PAD_X;

	for (const adv of advances) {
		centers.push(cursor + adv / 2);
		cursor += adv;
	}

	return (
		<div
			aria-label="Goal!"
			className="fixed inset-0 z-[60] flex cursor-pointer items-center justify-center"
			onClick={onDismiss}
			role="button"
		>
			<svg
				className="w-[96vw] max-w-4xl font-display"
				style={{filter: 'drop-shadow(0 8px 28px rgba(0,0,0,0.6))'}}
				viewBox={`0 0 ${width} ${HEIGHT}`}
			>
				{BALLS.map((ball, index) => (
					<g
						key={`ball-${index}`}
						transform={`translate(${ball.x * width} ${ball.y * HEIGHT})`}
					>
						<g>
							<animateTransform
								attributeName="transform"
								calcMode="spline"
								dur={`${ball.float}s`}
								keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
								keyTimes="0; 0.5; 1"
								repeatCount="indefinite"
								type="translate"
								values={`0 ${ball.r * 0.6}; 0 ${-ball.r * 0.6}; 0 ${ball.r * 0.6}`}
							/>

							<g>
								<animateTransform
									attributeName="transform"
									dur={`${ball.spin}s`}
									from="0 0 0"
									repeatCount="indefinite"
									to={`${ball.dir * 360} 0 0`}
									type="rotate"
								/>

								<text
									dominantBaseline="central"
									fontSize={ball.r * 2}
									textAnchor="middle"
									x={0}
									y={0}
								>
									⚽
								</text>
							</g>
						</g>
					</g>
				))}

				{letters.map((char, index) => (
					<text
						dominantBaseline="middle"
						fill="#ffffff"
						fontSize={FONT_SIZE}
						fontWeight={900}
						key={index}
						textAnchor="middle"
						x={centers[index]}
						y={HEIGHT / 2}
					>
						<animateTransform
							attributeName="transform"
							begin={`${index * 0.08}s`}
							calcMode="spline"
							dur="1s"
							keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
							keyTimes="0; 0.5; 1"
							repeatCount="indefinite"
							type="translate"
							values="0 16; 0 -24; 0 16"
						/>

						{char}
					</text>
				))}
			</svg>
		</div>
	);
}
