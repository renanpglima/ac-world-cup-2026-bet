import type {Evolution} from '../lib/evolution';
import type {Award} from '../lib/groupStageAwards';
import type {ParticipantStats} from '../lib/participantStats';
import type {PoolStats} from '../lib/stats';
import type {TimelineFrame} from '../lib/timeline';
import {AwardCard} from './AwardCard';
import {LeaderCard} from './LeaderCard';
import {StatsView} from './StatsView';

function EmptyState({children}: {children: string}) {
	return (
		<p className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-400">
			{children}
		</p>
	);
}

// The knockout wrap-up — the same shape as the Group Stage page (champion, fun
// awards, full stats) but fed knockout data. Before any knockout game is
// decided each section falls back to an empty state instead of an empty chart.
export function KnockoutChampionView({
	awards,
	evolution,
	leader,
	onHype,
	played,
	stats,
	timeline,
}: {
	awards: Award[];
	evolution: Evolution;
	leader?: {name: string; stats: ParticipantStats} | null;
	onHype: (rx: number, ry: number) => void;
	played: number;
	stats: PoolStats;
	timeline: TimelineFrame[];
}) {
	return (
		<div className="space-y-6">
			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Knockout champion
				</h2>

				{leader ? (
					<LeaderCard
						name={leader.name}
						onHype={onHype}
						stats={leader.stats}
					/>
				) : (
					<EmptyState>
						No champion yet — a clear leader is crowned once knockout
						games are decided.
					</EmptyState>
				)}
			</section>

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Awards
				</h2>

				{awards.length > 0 ? (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{awards.map((award) => (
							<AwardCard award={award} key={award.label} />
						))}
					</div>
				) : (
					<EmptyState>
						Awards unlock as the knockout games start to be decided.
					</EmptyState>
				)}
			</section>

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Stats
				</h2>

				{played > 0 ? (
					<StatsView
						evolution={evolution}
						stats={stats}
						timeline={timeline}
					/>
				) : (
					<EmptyState>
						Stats appear once the knockout phase kicks off.
					</EmptyState>
				)}
			</section>
		</div>
	);
}
