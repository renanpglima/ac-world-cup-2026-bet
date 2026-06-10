import {POINTS} from '../lib/scoring';
import type {MatchStatus} from '../lib/types';

export const TIER_STYLES: Record<number, string> = {
	[POINTS.EXACT_SCORE]: 'bg-amber-400/15 text-amber-300',
	[POINTS.WINNER_AND_GOALS]: 'bg-emerald-400/15 text-emerald-300',
	[POINTS.WINNER_AND_DIFF]: 'bg-teal-400/15 text-teal-300',
	[POINTS.DRAW]: 'bg-sky-400/15 text-sky-300',
	[POINTS.WINNER_ONLY]: 'bg-indigo-400/15 text-indigo-300',
	[POINTS.NONE]: 'bg-rose-400/10 text-rose-400',
};

export function StatusChip({
	status,
	timeElapsed,
}: {
	status: MatchStatus;
	timeElapsed?: string;
}) {
	if (status === 'live') {
		return (
			<span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
				<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
				LIVE
				{timeElapsed && /^\d+$/.test(timeElapsed)
					? ` ${timeElapsed}'`
					: ''}
			</span>
		);
	}

	if (status === 'finished') {
		return (
			<span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-300">
				FT
			</span>
		);
	}

	return (
		<span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-500">
			Upcoming
		</span>
	);
}
