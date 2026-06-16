import {useState} from 'react';

import {kickoffDate} from '../lib/kickoff';
import type {MatchCard} from '../lib/matches';
import type {ReactionsApi} from '../lib/useReactions';
import type {WhatIfScenario} from '../lib/whatif';
import {Avatar} from './Avatar';
import {Flag} from './Flag';
import {Reactions} from './Reactions';
import {StatusChip, TIER_STYLES} from './StatusChip';
import {WhatIfPanel} from './WhatIfPanel';

interface MatchesViewProps {
	cards: MatchCard[];
	commentary: Record<number, string>;
	matchReactions: ReactionsApi;
	onMatchReact: (matchNo: number, emoji: string) => void;
	whatIf: Record<number, WhatIfScenario[]>;
}

interface DayGroup {
	cards: MatchCard[];
	label: string;
}

interface PredictionGroup {
	names: string[];
	p1: number;
	p2: number;
	points: number | null;
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

// Collapse the players' bets into one row per distinct prediction, so identical
// bets sit together. Same prediction ⇒ same points, so each row scores once.
// Sorted by points, then by how many backed it, then by the scoreline.
function predictionGroups(entries: MatchCard['entries']): PredictionGroup[] {
	const groups = new Map<string, PredictionGroup>();

	for (const entry of entries) {
		const key = `${entry.p1}-${entry.p2}`;
		const group = groups.get(key);

		if (group) {
			group.names.push(entry.name);
		}
		else {
			groups.set(key, {
				names: [entry.name],
				p1: entry.p1,
				p2: entry.p2,
				points: entry.points,
			});
		}
	}

	return [...groups.values()].sort(
		(a, b) =>
			(b.points ?? -1) - (a.points ?? -1) ||
			b.names.length - a.names.length ||
			a.p1 - b.p1 ||
			a.p2 - b.p2
	);
}

function MatchCardArticle({
	card,
	commentary,
	matchReactions,
	onMatchReact,
	whatIf,
}: {
	card: MatchCard;
	commentary: Record<number, string>;
	matchReactions: ReactionsApi;
	onMatchReact: (matchNo: number, emoji: string) => void;
	whatIf: Record<number, WhatIfScenario[]>;
}) {
	return (
		<article
			className={`group flex flex-col rounded-2xl border bg-white/5 p-4 ${
				card.status === 'live'
					? 'border-emerald-400/40 lg:col-span-2'
					: 'border-white/10'
			} ${card.status === 'finished' ? 'opacity-60' : ''}`}
		>
			<div className="mb-3 flex items-center justify-between text-xs text-slate-400">
				<span>
					#{card.matchNo} · {card.group} · {kickoffTime(card)}
				</span>

				<StatusChip status={card.status} timeElapsed={card.timeElapsed} />
			</div>

			<div className="mb-3 flex items-center justify-center gap-3 text-center">
				<span className="flex flex-1 items-center justify-end gap-2 font-medium text-white">
					{card.team1}

					<Flag team={card.team1} />
				</span>

				<span className="rounded-lg bg-white/10 px-3 py-1 font-display text-lg font-bold text-amber-300">
					{card.r1 !== undefined ? `${card.r1}–${card.r2}` : 'vs'}
				</span>

				<span className="flex flex-1 items-center justify-start gap-2 font-medium text-white">
					<Flag team={card.team2} />

					{card.team2}
				</span>
			</div>

			<table className="w-full text-left text-sm">
				<thead>
					<tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
						<th className="pb-1.5 font-semibold">Players</th>

						<th className="pb-1.5 pl-2 text-right font-semibold">
							Score
						</th>

						<th className="pb-1.5 pl-2 text-right font-semibold">
							Pts
						</th>
					</tr>
				</thead>

				<tbody>
					{predictionGroups(card.entries).map((group) => (
						<tr
							className="border-t border-white/5"
							key={`${group.p1}-${group.p2}`}
						>
							<td className="py-1.5 pr-2">
								<div className="flex flex-wrap gap-1">
									{group.names.map((name) => (
										<span
											className="inline-flex items-center gap-1 rounded-full bg-white/10 py-0.5 pl-0.5 pr-2 text-xs text-slate-200"
											key={name}
										>
											<Avatar
												className="h-4 w-4 rounded-full text-[8px]"
												name={name}
											/>

											{name}
										</span>
									))}
								</div>
							</td>

							<td className="py-1.5 pl-2 text-right align-top">
								<span className="inline-block whitespace-nowrap rounded bg-white/10 px-1.5 py-0.5 font-display text-xs font-bold text-slate-200">
									{group.p1}–{group.p2}
								</span>
							</td>

							<td className="py-1.5 pl-2 text-right align-top">
								{group.points !== null ? (
									<span
										className={`inline-block min-w-8 rounded-full px-1.5 py-0.5 text-center text-xs font-bold ${
											TIER_STYLES[group.points]
										} ${card.status === 'live' ? 'animate-pulse' : ''}`}
									>
										{group.points}
									</span>
								) : (
									<span className="text-xs text-slate-600">—</span>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>

			{card.status === 'live' && (
				<WhatIfPanel scenarios={whatIf[card.matchNo] ?? []} />
			)}

			{commentary[card.matchNo] && (
				<div className="mt-3 flex gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
					<span aria-hidden className="text-sm">
						🎙️
					</span>

					<p className="text-xs italic leading-relaxed text-slate-300">
						{commentary[card.matchNo]}
					</p>
				</div>
			)}

			<div className="mt-auto border-t border-white/5 pt-2.5">
				<Reactions
					counts={matchReactions.counts[String(card.matchNo)] ?? {}}
					mine={matchReactions.mine[String(card.matchNo)] ?? []}
					onReact={(emoji) => onMatchReact(card.matchNo, emoji)}
				/>
			</div>
		</article>
	);
}

function MatchSection({
	commentary,
	emptyLabel,
	groups,
	matchReactions,
	onMatchReact,
	whatIf,
}: {
	commentary: Record<number, string>;
	emptyLabel: string;
	groups: DayGroup[];
	matchReactions: ReactionsApi;
	onMatchReact: (matchNo: number, emoji: string) => void;
	whatIf: Record<number, WhatIfScenario[]>;
}) {
	if (groups.length === 0) {
		return (
			<div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-400">
				{emptyLabel}
			</div>
		);
	}

	return (
		<section className="space-y-6">
			{groups.map((group) => (
				<div key={group.label}>
					<h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
						{group.label}
					</h3>

					<div className="grid gap-3 lg:grid-cols-2">
						{group.cards.map((card) => (
							<MatchCardArticle
								card={card}
								commentary={commentary}
								key={card.matchNo}
								matchReactions={matchReactions}
								onMatchReact={onMatchReact}
								whatIf={whatIf}
							/>
						))}
					</div>
				</div>
			))}
		</section>
	);
}

function SubTab({
	active,
	children,
	count,
	live,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	count: number;
	live?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
				active
					? 'bg-emerald-500 text-emerald-950'
					: 'bg-white/5 text-slate-300 hover:bg-white/10'
			}`}
			onClick={onClick}
		>
			{live && (
				<span
					aria-hidden
					className="h-2 w-2 animate-pulse rounded-full bg-rose-500"
				/>
			)}

			{children}

			<span
				className={`rounded-full px-1.5 text-xs font-bold ${
					active
						? 'bg-emerald-950/15 text-emerald-950'
						: 'bg-white/10 text-slate-400'
				}`}
			>
				{count}
			</span>
		</button>
	);
}

export function MatchesView({
	cards,
	commentary,
	matchReactions,
	onMatchReact,
	whatIf,
}: MatchesViewProps) {
	const upcoming = cards.filter((card) => card.status !== 'finished');
	const finished = cards.filter((card) => card.status === 'finished');

	const hasLive = upcoming.some((card) => card.status === 'live');

	const [view, setView] = useState<'finished' | 'upcoming'>(() =>
		upcoming.length === 0 && finished.length > 0 ? 'finished' : 'upcoming'
	);

	const groups =
		view === 'finished'
			? groupByLocalDay([...finished].reverse())
			: groupByLocalDay(upcoming);

	return (
		<div className="space-y-6">
			<div className="flex gap-1.5">
				<SubTab
					active={view === 'upcoming'}
					count={upcoming.length}
					live={hasLive}
					onClick={() => setView('upcoming')}
				>
					Upcoming
				</SubTab>

				<SubTab
					active={view === 'finished'}
					count={finished.length}
					onClick={() => setView('finished')}
				>
					Finished
				</SubTab>
			</div>

			<MatchSection
				commentary={commentary}
				emptyLabel={
					view === 'finished'
						? 'No finished matches yet — results show up here.'
						: 'No upcoming matches.'
				}
				groups={groups}
				matchReactions={matchReactions}
				onMatchReact={onMatchReact}
				whatIf={whatIf}
			/>
		</div>
	);
}
