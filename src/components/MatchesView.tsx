import {useState} from 'react';

import knockoutData from '../data/knockout.json';
import {kickoffDate} from '../lib/kickoff';
import type {MatchCard} from '../lib/matches';
import type {Game, Participant} from '../lib/types';
import type {CheerCounts} from '../lib/useCheers';
import type {ReactionsApi} from '../lib/useReactions';
import {Avatar} from './Avatar';
import {BetSplitBar} from './BetSplitBar';
import {CheerCount} from './CheerCount';
import {Flag} from './Flag';
import {KnockoutBracket} from './KnockoutBracket';
import {Reactions} from './Reactions';
import {StatusChip, TIER_STYLES} from './StatusChip';
import {WhatIfPanel} from './WhatIfPanel';

interface MatchesViewProps {
	cards: MatchCard[];
	cheers: CheerCounts;
	commentary: Record<number, string>;
	games: Game[];
	matchReactions: ReactionsApi;
	onClearMatchReaction?: (matchNo: number, emoji: string) => void;
	onMatchReact: (matchNo: number, emoji: string) => void;
	participants: Participant[];
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
	cheers,
	commentary,
	games,
	matchReactions,
	onClearMatchReaction,
	onMatchReact,
	participants,
}: {
	card: MatchCard;
	cheers: CheerCounts;
	commentary: Record<number, string>;
	games: Game[];
	matchReactions: ReactionsApi;
	onClearMatchReaction?: (matchNo: number, emoji: string) => void;
	onMatchReact: (matchNo: number, emoji: string) => void;
	participants: Participant[];
}) {
	const tally = cheers[card.matchNo] ?? {};
	const live = card.status === 'live';
	const cheers1 = tally.team1 ?? 0;
	const cheers2 = tally.team2 ?? 0;
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

					{cheers1 > 0 && (
						<CheerCount
							count={cheers1}
							live={live && cheers1 > cheers2}
						/>
					)}
				</span>

				<span className="rounded-lg bg-white/10 px-3 py-1 font-display text-lg font-bold text-amber-300">
					{card.r1 !== undefined ? `${card.r1}–${card.r2}` : 'vs'}
				</span>

				<span className="flex flex-1 items-center justify-start gap-2 font-medium text-white">
					{cheers2 > 0 && (
						<CheerCount
							count={cheers2}
							live={live && cheers2 > cheers1}
						/>
					)}

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
				<WhatIfPanel
					games={games}
					matchNo={card.matchNo}
					participants={participants}
				/>
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

			<div className="mt-auto pt-4">
				<BetSplitBar
					entries={card.entries}
					team1={card.team1}
					team2={card.team2}
				/>
			</div>

			<div className="mt-3 border-t border-white/5 pt-2.5">
				<Reactions
					counts={matchReactions.counts[String(card.matchNo)] ?? {}}
					mine={matchReactions.mine[String(card.matchNo)] ?? []}
					onClear={
						onClearMatchReaction
							? (emoji) => onClearMatchReaction(card.matchNo, emoji)
							: undefined
					}
					onReact={(emoji) => onMatchReact(card.matchNo, emoji)}
				/>
			</div>
		</article>
	);
}

function MatchSection({
	cheers,
	commentary,
	emptyLabel,
	games,
	groups,
	matchReactions,
	onClearMatchReaction,
	onMatchReact,
	participants,
}: {
	cheers: CheerCounts;
	commentary: Record<number, string>;
	emptyLabel: string;
	games: Game[];
	groups: DayGroup[];
	matchReactions: ReactionsApi;
	onClearMatchReaction?: (matchNo: number, emoji: string) => void;
	onMatchReact: (matchNo: number, emoji: string) => void;
	participants: Participant[];
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
								cheers={cheers}
								commentary={commentary}
								games={games}
								key={card.matchNo}
								matchReactions={matchReactions}
								onClearMatchReaction={onClearMatchReaction}
								onMatchReact={onMatchReact}
								participants={participants}
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
			className={`flex w-full items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:w-auto sm:py-1.5 ${
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
				className={`ml-auto shrink-0 rounded-full px-1.5 text-xs font-bold sm:ml-0 ${
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
	cheers,
	commentary,
	games,
	matchReactions,
	onClearMatchReaction,
	onMatchReact,
	participants,
}: MatchesViewProps) {
	const upcoming = cards.filter((card) => card.status !== 'finished');
	const finished = cards.filter((card) => card.status === 'finished');

	const hasLive = upcoming.some((card) => card.status === 'live');

	const [view, setView] = useState<'bracket' | 'finished' | 'upcoming'>(() =>
		upcoming.length === 0 && finished.length > 0 ? 'finished' : 'upcoming'
	);

	const groups =
		view === 'finished'
			? groupByLocalDay([...finished].reverse())
			: groupByLocalDay(upcoming);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-1.5 sm:flex-row">
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

				<SubTab
					active={view === 'bracket'}
					count={knockoutData.length}
					onClick={() => setView('bracket')}
				>
					Knockout Stage
					<span className="shrink-0 rounded bg-amber-400/20 px-1 text-[8px] font-bold uppercase text-amber-300">
						new
					</span>
				</SubTab>
			</div>

			{view === 'bracket' ? (
				<KnockoutBracket />
			) : (
				<MatchSection
					cheers={cheers}
					commentary={commentary}
					emptyLabel={
						view === 'finished'
							? 'No finished matches yet — results show up here.'
							: 'No upcoming matches.'
					}
					games={games}
					groups={groups}
					matchReactions={matchReactions}
					onClearMatchReaction={onClearMatchReaction}
					onMatchReact={onMatchReact}
					participants={participants}
				/>
			)}
		</div>
	);
}
