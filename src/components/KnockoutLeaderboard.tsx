import type {KnockoutStandingRow} from '../lib/knockoutStandings';
import {Avatar} from './Avatar';

// Zeroed knockout-phase ranking: approved participants scored on their in-app
// knockout picks. The current group-stage Leaderboard is untouched.
export function KnockoutLeaderboard({
	rows,
	youUid,
}: {
	rows: KnockoutStandingRow[];
	youUid: string | null;
}) {
	if (rows.length === 0) {
		return (
			<p className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-400">
				Nobody in the knockout yet — join from your profile and points
				appear once games start to be decided.
			</p>
		);
	}

	return (
		<ul className="space-y-1.5">
			{rows.map((row) => (
				<li
					className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
						row.uid === youUid
							? 'border-emerald-400/40 bg-emerald-400/10'
							: 'border-white/10 bg-white/5'
					}`}
					key={row.uid}
				>
					<span className="w-5 text-center font-display text-sm font-bold text-slate-500">
						{row.rank}
					</span>

					<Avatar
						className="h-7 w-7 shrink-0 rounded-full text-[10px]"
						name={row.name}
					/>

					<span className="min-w-0 flex-1 truncate text-sm font-medium text-white">
						{row.name}
					</span>

					<span className="shrink-0 text-[10px] text-slate-500">
						{row.exact} exact · {row.played} games
					</span>

					<span className="font-display text-base font-bold text-amber-300">
						{row.points}
					</span>
				</li>
			))}
		</ul>
	);
}
