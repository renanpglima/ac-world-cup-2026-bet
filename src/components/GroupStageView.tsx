import type {Evolution} from '../lib/evolution';
import type {Award} from '../lib/groupStageAwards';
import type {ParticipantStats} from '../lib/participantStats';
import type {PoolStats} from '../lib/stats';
import type {TimelineFrame} from '../lib/timeline';
import {AwardCard} from './AwardCard';
import {LeaderCard} from './LeaderCard';
import {StatsView} from './StatsView';

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
