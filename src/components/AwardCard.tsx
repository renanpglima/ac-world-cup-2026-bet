import type {Award} from '../lib/groupStageAwards';

// One celebratory stat tile — an icon, a label, the winner's name, the headline
// value, and a one-line hint. Shared by the Group Stage and Knockout Champion
// wrap-up pages.
export function AwardCard({award}: {award: Award}) {
	return (
		<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
			<div className="flex items-center gap-2">
				<span aria-hidden className="text-2xl leading-none">
					{award.icon}
				</span>

				<span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
					{award.label}
				</span>
			</div>

			<p className="mt-2 truncate font-display text-xl font-bold text-white">
				{award.name}
			</p>

			<p className="text-sm font-bold text-amber-300">{award.value}</p>

			<p className="mt-1 text-xs leading-snug text-slate-500">
				{award.hint}
			</p>
		</div>
	);
}
