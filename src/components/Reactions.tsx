import {useEffect, useRef, useState} from 'react';

// Fixed reaction set. Phase 1 is UI only (local mock state); Firebase will back
// the counts and per-session identity in phase 2.
export const REACTIONS = [
	{emoji: '👍', label: 'Thumbs up'},
	{emoji: '👎', label: 'Thumbs down'},
	{emoji: '🔥', label: 'Fire'},
	{emoji: '❤️', label: 'Heart'},
	{emoji: '😂', label: 'Laugh'},
	{emoji: '😢', label: 'Sad'},
	{emoji: '🤡', label: 'Clown'},
];

export function Reactions({
	counts,
	mine,
	onReact,
}: {
	counts: Record<string, number>;
	mine: string[];
	onReact: (emoji: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const pickerRef = useRef<HTMLDivElement>(null);

	// Close the picker when clicking anywhere outside it.
	useEffect(() => {
		if (!open) {
			return undefined;
		}

		const onPointerDown = (event: MouseEvent) => {
			if (
				pickerRef.current &&
				!pickerRef.current.contains(event.target as Node)
			) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', onPointerDown);

		return () => document.removeEventListener('mousedown', onPointerDown);
	}, [open]);

	const active = REACTIONS.filter(
		(reaction) => (counts[reaction.emoji] ?? 0) > 0
	);

	return (
		<div
			className="flex flex-wrap items-center gap-1"
			onClick={(event) => event.stopPropagation()}
		>
			{active.map((reaction) => (
				<button
					className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors ${
						mine.includes(reaction.emoji)
							? 'bg-emerald-400/20 ring-1 ring-inset ring-emerald-400/50'
							: 'bg-white/5 hover:bg-white/10'
					}`}
					key={reaction.emoji}
					onClick={() => onReact(reaction.emoji)}
				>
					<span>{reaction.emoji}</span>

					<span className="font-medium text-slate-300">
						{counts[reaction.emoji]}
					</span>
				</button>
			))}

			<div className="relative" ref={pickerRef}>
				<button
					aria-label="Add reaction"
					className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-sm text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-200"
					onClick={() => setOpen((value) => !value)}
				>
					＋
				</button>

				{open && (
					<div className="absolute left-full top-1/2 z-20 ml-1 flex -translate-y-1/2 gap-0.5 rounded-full border border-white/10 bg-slate-800 p-1 shadow-xl">
						{REACTIONS.map((reaction) => (
							<button
								aria-label={reaction.label}
								className="rounded-full px-1.5 py-0.5 text-lg transition-transform hover:scale-125"
								key={reaction.emoji}
								onClick={() => {
									onReact(reaction.emoji);
									setOpen(false);
								}}
							>
								{reaction.emoji}
							</button>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
