import type {Evolution} from '../lib/evolution';
import type {Award} from '../lib/groupStageAwards';
import type {ParticipantStats} from '../lib/participantStats';
import type {PoolStats} from '../lib/stats';
import type {TimelineFrame} from '../lib/timeline';
import {LeaderCard} from './LeaderCard';
import {StatsView} from './StatsView';

function AwardCard({award}: {award: Award}) {
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

// The group-stage wrap-up: the champion (reusing the leader card), fun awards,
// and the full stats (charts + timeline, moved here from the old Stats menu).
export function GroupStageView({
	awards,
	evolution,
	leader,
	onHype,
	stats,
	timeline,
}: {
	awards: Award[];
	evolution: Evolution;
	leader?: {name: string; stats: ParticipantStats};
	onHype: (rx: number, ry: number) => void;
	stats: PoolStats;
	timeline: TimelineFrame[];
}) {
	return (
		<div className="space-y-6">
			{leader && (
				<section>
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
						Group stage champion
					</h2>

					<LeaderCard
						name={leader.name}
						onHype={onHype}
						stats={leader.stats}
					/>
				</section>
			)}

			{awards.length > 0 && (
				<section>
					<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
						Awards
					</h2>

					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{awards.map((award) => (
							<AwardCard award={award} key={award.label} />
						))}
					</div>
				</section>
			)}

			<section>
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Stats
				</h2>

				<StatsView
					evolution={evolution}
					stats={stats}
					timeline={timeline}
				/>
			</section>
		</div>
	);
}
