// The 🔥 cheer tally shown beside a team's flag. `live` lights the flame for
// the team that's currently ahead. Display-only — the live bar wires the click
// on the flag itself; here we just render the count.
export function CheerCount({
	className = '',
	count,
	live = false,
}: {
	className?: string;
	count: number;
	live?: boolean;
}) {
	return (
		<span
			className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
				live ? 'text-orange-400' : 'text-orange-300'
			} ${className}`}
		>
			<span
				className={live ? 'inline-block animate-flame text-lg' : ''}
			>
				🔥
			</span>

			<span>{count}</span>
		</span>
	);
}
