import {kickoffDate} from '../lib/kickoff';
import type {MatchCard} from '../lib/matches';
import {StatusChip, TIER_STYLES} from './StatusChip';

interface MatchesViewProps {
	cards: MatchCard[];
}

interface DayGroup {
	cards: MatchCard[];
	label: string;
}

function groupByLocalDay(cards: MatchCard[]): DayGroup[] {
	const groups: DayGroup[] = [];

	for (const card of cards) {
		const kickoff = kickoffDate(card.date, card.time);

		const label = kickoff
			? kickoff.toLocaleDateString('en-US', {
					day: 'numeric',
					month: 'short',
					weekday: 'short',
				})
			: card.date;

		const last = groups[groups.length - 1];

		if (last && last.label === label) {
			last.cards.push(card);
		}
		else {
			groups.push({cards: [card], label});
		}
	}

	return groups;
}

function kickoffTime(card: MatchCard): string {
	const kickoff = kickoffDate(card.date, card.time);

	if (!kickoff) {
		return card.time;
	}

	return kickoff.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		timeZoneName: 'short',
	});
}

function EntryPill({
	entry,
	live,
}: {
	entry: MatchCard['entries'][number];
	live: boolean;
}) {
	return (
		<div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
			<span className="truncate text-sm text-slate-300">{entry.name}</span>

			<span className="flex items-center gap-1.5">
				<span className="rounded bg-white/10 px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">
					{entry.p1}–{entry.p2}
				</span>

				{entry.points !== null && (
					<span
						className={`inline-block min-w-8 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${
							TIER_STYLES[entry.points]
						} ${live ? 'animate-pulse' : ''}`}
					>
						{entry.points}
					</span>
				)}
			</span>
		</div>
	);
}

export function MatchesView({cards}: MatchesViewProps) {
	return (
		<div className="space-y-6">
			{groupByLocalDay(cards).map((group) => (
				<section key={group.label}>
					<h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
						{group.label}
					</h2>

					<div className="grid gap-3 lg:grid-cols-2">
						{group.cards.map((card) => (
							<article
								className={`rounded-2xl border bg-white/5 p-4 ${
									card.status === 'live'
										? 'border-emerald-400/40'
										: 'border-white/10'
								} ${card.status === 'notstarted' ? 'opacity-80' : ''}`}
								key={card.matchNo}
							>
								<div className="mb-3 flex items-center justify-between text-xs text-slate-400">
									<span>
										#{card.matchNo} · {card.group} ·{' '}
										{kickoffTime(card)}
									</span>

									<StatusChip
										status={card.status}
										timeElapsed={card.timeElapsed}
									/>
								</div>

								<div className="mb-3 flex items-center justify-center gap-3 text-center">
									<span className="flex-1 text-right font-medium text-white">
										{card.team1}
									</span>

									<span className="rounded-lg bg-white/10 px-3 py-1 font-display text-lg font-bold text-amber-300">
										{card.r1 !== undefined
											? `${card.r1}–${card.r2}`
											: 'vs'}
									</span>

									<span className="flex-1 text-left font-medium text-white">
										{card.team2}
									</span>
								</div>

								<div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
									{card.entries.map((entry) => (
										<EntryPill
											entry={entry}
											key={entry.name}
											live={card.status === 'live'}
										/>
									))}
								</div>
							</article>
						))}
					</div>
				</section>
			))}
		</div>
	);
}
