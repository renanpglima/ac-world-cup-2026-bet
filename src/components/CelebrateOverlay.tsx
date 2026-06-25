import {Avatar} from './Avatar';

const EMOJIS = [
	'🎉', '🥳', '🎊', '⭐', '🔥', '👏', '🙌', '💥', '✨', '🏆', '⚽',
	'💚', '🎈', '💫', '🤩', '😎', '💪', '🚀', '🌟', '❤️', '👑', '🍾',
];

// Full-screen, everyone-sees-it celebration: the participant's avatar with a
// ring of emojis flying outward. Presentational — the parent mounts it for the
// duration and unmounts it.
export function CelebrateOverlay({name}: {name: string}) {
	return (
		<div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
			<div className="flex flex-col items-center gap-3">
				<div className="relative">
					<Avatar
						className="h-24 w-24 animate-bounce rounded-full shadow-2xl ring-4 ring-emerald-400/60"
						name={name}
					/>

					{EMOJIS.map((emoji, index) => {
						const angle = (index / EMOJIS.length) * Math.PI * 2;

						// Layered radius so it reads as a full explosion, not a
						// single ring.
						const dist = 240 + (index % 3) * 70;

						return (
							<span
								className="animate-celebrate-pop absolute left-1/2 top-1/2 text-3xl"
								key={index}
								style={{
									['--dx' as string]: `${Math.cos(angle) * dist}px`,
									['--dy' as string]: `${Math.sin(angle) * dist}px`,
								}}
							>
								{emoji}
							</span>
						);
					})}
				</div>

				<span className="rounded-full bg-black/60 px-4 py-1.5 text-lg font-bold text-white shadow-lg">
					🎉 {name}!
				</span>
			</div>
		</div>
	);
}
