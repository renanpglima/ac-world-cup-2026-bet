import {useState} from 'react';

import {kickoffDate} from '../lib/kickoff';
import type {MatchCard} from '../lib/matches';
import type {Game, Participant} from '../lib/types';
import type {CheerCounts} from '../lib/useCheers';
import type {ReactionsApi} from '../lib/useReactions';
import {Avatar} from './Avatar';
import {BetSplitBar} from './BetSplitBar';
import {CheerCount} from './CheerCount';
import {Flag} from './Flag';
import {Reactions} from './Reactions';
import {StatusChip, TIER_STYLES} from './StatusChip';
import {WhatIfPanel} from './WhatIfPanel';

// Per-knockout-card pick state handed to a match card so a signed-in user can
// predict the scoreline inline (group-stage cards have no in-app entry).
interface KnockoutEntry {
	myPick?: {p1: number; p2: number};
	onPick: (p1: number, p2: number) => void;
	onSignIn?: () => void;
	pickable: boolean;
	signedIn: boolean;
}

interface KnockoutSection {
	info: Record<number, {myPick?: {p1: number; p2: number}; pickable: boolean}>;
	onPick: (matchNo: number, p1: number, p2: number) => void;
	onSignIn?: () => void;
	signedIn: boolean;
}

interface MatchesViewProps {
	cards: MatchCard[];
	cheers: CheerCounts;
	commentary: Record<number, string>;
	games: Game[];
	knockoutCards: MatchCard[];
	knockoutPick: KnockoutSection;
	matchReactions: ReactionsApi;
	onClearCommentary?: (matchNo: number) => void;
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

function Stepper({
	onChange,
	value,
}: {
	onChange: (next: number) => void;
	value: number;
}) {
	return (
		<span className="flex items-center gap-1">
			<button
				aria-label="menos"
				className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-sm leading-none text-slate-300 hover:bg-white/20"
				onClick={() => onChange(Math.max(0, value - 1))}
			>
				−
			</button>

			<span className="w-5 text-center font-display text-base font-bold text-white">
				{value}
			</span>

			<button
				aria-label="mais"
				className="flex h-6 w-6 items-center justify-center rounded bg-white/10 text-sm leading-none text-slate-300 hover:bg-white/20"
				onClick={() => onChange(Math.min(20, value + 1))}
			>
				+
			</button>
		</span>
	);
}

function KnockoutPickRow({
	entry,
	team1,
	team2,
}: {
	entry: KnockoutEntry;
	team1: string;
	team2: string;
}) {
	if (!entry.pickable) {
		return (
			<div className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs text-slate-500">
				Waiting for teams
			</div>
		);
	}

	if (!entry.signedIn) {
		return (
			<button
				className="mb-3 w-full rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-2 text-sm font-medium text-emerald-300"
				onClick={entry.onSignIn}
			>
				👋 Sign in with Google to predict
			</button>
		);
	}

	const p1 = entry.myPick?.p1 ?? 0;
	const p2 = entry.myPick?.p2 ?? 0;

	return (
		<div className="mb-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">
			<span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
				Your pick
			</span>

			<Flag team={team1} />

			<Stepper onChange={(n) => entry.onPick(n, p2)} value={p1} />

			<span className="text-slate-500">×</span>

			<Stepper onChange={(n) => entry.onPick(p1, n)} value={p2} />

			<Flag team={team2} />
		</div>
	);
}

function MatchCardArticle({
	card,
	cheers,
	commentary,
	games,
	knockoutEntry,
	matchReactions,
	onClearCommentary,
	onClearMatchReaction,
	onMatchReact,
	participants,
}: {
	card: MatchCard;
	cheers: CheerCounts;
	commentary: Record<number, string>;
	games: Game[];
	knockoutEntry?: KnockoutEntry;
	matchReactions: ReactionsApi;
	onClearCommentary?: (matchNo: number) => void;
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

			{knockoutEntry && (
				<KnockoutPickRow
					entry={knockoutEntry}
					team1={card.team1}
					team2={card.team2}
				/>
			)}

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

			{card.status === 'live' && !knockoutEntry && (
				<WhatIfPanel
					games={games}
					matchNo={card.matchNo}
					participants={participants}
				/>
			)}

			{commentary[card.matchNo] && (
				<div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2.5">
					<span aria-hidden className="text-sm">
						🎙️
					</span>

					<p className="flex-1 text-xs italic leading-relaxed text-slate-300">
						{commentary[card.matchNo]}
					</p>

					{onClearCommentary && (
						<button
							aria-label="Remove this commentary"
							className="shrink-0 rounded-full bg-rose-500/20 px-1.5 text-[10px] text-rose-300 transition hover:bg-rose-500/40"
							onClick={() => onClearCommentary(card.matchNo)}
						>
							✕
						</button>
					)}
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
	knockout,
	matchReactions,
	onClearCommentary,
	onClearMatchReaction,
	onMatchReact,
	participants,
}: {
	cheers: CheerCounts;
	commentary: Record<number, string>;
	emptyLabel: string;
	games: Game[];
	groups: DayGroup[];
	knockout: KnockoutSection;
	matchReactions: ReactionsApi;
	onClearCommentary?: (matchNo: number) => void;
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
						{group.cards.map((card) => {
							const info = knockout.info[card.matchNo];

							const knockoutEntry: KnockoutEntry | undefined = info
								? {
										myPick: info.myPick,
										onPick: (p1, p2) =>
											knockout.onPick(card.matchNo, p1, p2),
										onSignIn: knockout.onSignIn,
										pickable: info.pickable,
										signedIn: knockout.signedIn,
									}
								: undefined;

							return (
								<MatchCardArticle
									card={card}
									cheers={cheers}
									commentary={commentary}
									games={games}
									key={card.matchNo}
									knockoutEntry={knockoutEntry}
									matchReactions={matchReactions}
									onClearCommentary={onClearCommentary}
									onClearMatchReaction={onClearMatchReaction}
									onMatchReact={onMatchReact}
									participants={participants}
								/>
							);
						})}
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
	knockoutCards,
	knockoutPick,
	matchReactions,
	onClearCommentary,
	onClearMatchReaction,
	onMatchReact,
	participants,
}: MatchesViewProps) {
	// Optimistic layer over the round-tripped picks: the steppers read the draft
	// immediately so rapid taps never read a stale score before Firebase echoes.
	const [draft, setDraft] = useState<Record<number, {p1: number; p2: number}>>(
		{}
	);

	const allCards = [...cards, ...knockoutCards];
	const upcoming = allCards.filter((card) => card.status !== 'finished');
	const finished = allCards.filter((card) => card.status === 'finished');

	const hasLive = upcoming.some((card) => card.status === 'live');

	const [view, setView] = useState<'finished' | 'upcoming'>(() =>
		upcoming.length === 0 && finished.length > 0 ? 'finished' : 'upcoming'
	);

	const groups =
		view === 'finished'
			? groupByLocalDay([...finished].reverse())
			: groupByLocalDay(upcoming);

	const knockout: KnockoutSection = {
		info: Object.fromEntries(
			Object.entries(knockoutPick.info).map(([key, value]) => {
				const num = Number(key);

				return [
					num,
					{myPick: draft[num] ?? value.myPick, pickable: value.pickable},
				];
			})
		),
		onPick: (matchNo, p1, p2) => {
			setDraft((previous) => ({...previous, [matchNo]: {p1, p2}}));
			knockoutPick.onPick(matchNo, p1, p2);
		},
		onSignIn: knockoutPick.onSignIn,
		signedIn: knockoutPick.signedIn,
	};

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
			</div>

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
				knockout={knockout}
				matchReactions={matchReactions}
				onClearCommentary={onClearCommentary}
				onClearMatchReaction={onClearMatchReaction}
				onMatchReact={onMatchReact}
				participants={participants}
			/>
		</div>
	);
}
