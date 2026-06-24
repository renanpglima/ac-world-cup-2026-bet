import type {KnockoutStandingRow} from '../lib/knockoutStandings';
import {KnockoutBracket} from './KnockoutBracket';
import {KnockoutLeaderboard} from './KnockoutLeaderboard';

// The Knockout Stage page: the bracket and the zeroed knockout ranking stacked
// as two sections on the same screen.
export function KnockoutView({
	rows,
	youUid,
}: {
	rows: KnockoutStandingRow[];
	youUid: string | null;
}) {
	return (
		<div className="space-y-8">
			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Bracket
				</h2>

				<KnockoutBracket />
			</section>

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Leaderboard
				</h2>

				<KnockoutLeaderboard rows={rows} youUid={youUid} />
			</section>
		</div>
	);
}
