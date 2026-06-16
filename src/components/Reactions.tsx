import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

// Reaction set, backed by Firebase (counts + per-session identity).
export const REACTIONS = [
	{emoji: '👍', label: 'Thumbs up'},
	{emoji: '👎', label: 'Thumbs down'},
	{emoji: '🔥', label: 'Fire'},
	{emoji: '❤️', label: 'Heart'},
	{emoji: '😂', label: 'Laugh'},
	{emoji: '😢', label: 'Sad'},
	{emoji: '🤡', label: 'Clown'},
	{emoji: '👀', label: 'Eyes'},
	{emoji: '🚀', label: 'Rocket'},
	{emoji: '🏆', label: 'Trophy'},
	{emoji: '🔦', label: 'Flashlight'},
	{emoji: '🐢', label: 'Turtle'},
	{emoji: '💀', label: 'Skull'},
	{emoji: '🥶', label: 'Ice cold'},
	{emoji: '🐌', label: 'Snail'},
	{emoji: '🤏', label: 'Pinch'},
	{emoji: '🐐', label: 'GOAT'},
	{emoji: '🍀', label: 'Lucky'},
	{emoji: '🍿', label: 'Popcorn'},
	{emoji: '👑', label: 'Crown'},
];

// Country flags get their own row at the bottom of the picker.
export const FLAG_REACTIONS = [
	{emoji: '🇧🇷', label: 'Brazil'},
	{emoji: '🇺🇸', label: 'USA'},
	{emoji: '🇪🇸', label: 'Spain'},
	{emoji: '🇫🇷', label: 'France'},
	{emoji: '🇦🇷', label: 'Argentina'},
];

const ALL_REACTIONS = [...REACTIONS, ...FLAG_REACTIONS];

const PICKER_WIDTH = 208;

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
	const [pos, setPos] = useState({left: 0, top: 0});
	const buttonRef = useRef<HTMLButtonElement>(null);
	const popoverRef = useRef<HTMLDivElement>(null);

	// Close on click outside (button + portaled popover), or on scroll/resize.
	useEffect(() => {
		if (!open) {
			return undefined;
		}

		const onPointerDown = (event: MouseEvent) => {
			const target = event.target as Node;

			if (
				!buttonRef.current?.contains(target) &&
				!popoverRef.current?.contains(target)
			) {
				setOpen(false);
			}
		};

		const close = () => setOpen(false);

		document.addEventListener('mousedown', onPointerDown);
		window.addEventListener('scroll', close, true);
		window.addEventListener('resize', close);

		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			window.removeEventListener('scroll', close, true);
			window.removeEventListener('resize', close);
		};
	}, [open]);

	const togglePicker = () => {
		if (open) {
			setOpen(false);

			return;
		}

		const rect = buttonRef.current?.getBoundingClientRect();

		if (!rect) {
			return;
		}

		// Open to the right of the button, flipping left if it would overflow.
		const openRight = rect.right + 6 + PICKER_WIDTH <= window.innerWidth;

		setPos({
			left: openRight ? rect.right + 6 : rect.left - 6 - PICKER_WIDTH,
			top: rect.top + rect.height / 2,
		});
		setOpen(true);
	};

	const pick = (emoji: string) => {
		onReact(emoji);
		setOpen(false);
	};

	const active = ALL_REACTIONS.filter(
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

			<button
				aria-label="Add reaction"
				className={`flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-sm text-slate-400 transition hover:bg-white/10 hover:text-slate-200 ${
					open
						? 'opacity-100'
						: 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
				}`}
				onClick={togglePicker}
				ref={buttonRef}
			>
				＋
			</button>

			{open &&
				createPortal(
					<div
						className="fixed z-50 flex w-52 -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-slate-800 p-1.5 shadow-xl"
						onClick={(event) => event.stopPropagation()}
						ref={popoverRef}
						style={{left: pos.left, top: pos.top}}
					>
						<div className="flex flex-wrap gap-0.5">
							{REACTIONS.map((reaction) => (
								<button
									aria-label={reaction.label}
									className="rounded-full px-1.5 py-0.5 text-lg transition-transform hover:scale-125"
									key={reaction.emoji}
									onClick={() => pick(reaction.emoji)}
								>
									{reaction.emoji}
								</button>
							))}
						</div>

						<div className="h-px w-full bg-white/10" />

						<div className="flex flex-wrap gap-0.5">
							{FLAG_REACTIONS.map((reaction) => (
								<button
									aria-label={reaction.label}
									className="rounded-full px-1.5 py-0.5 text-lg transition-transform hover:scale-125"
									key={reaction.emoji}
									onClick={() => pick(reaction.emoji)}
								>
									{reaction.emoji}
								</button>
							))}
						</div>
					</div>,
					document.body
				)}
		</div>
	);
}
