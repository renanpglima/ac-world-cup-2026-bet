import {useDeferredValue, useMemo, useState} from 'react';

import {acTrack} from '../lib/analyticsCloud';
import type {Game, Participant} from '../lib/types';
import {liveWhatIfContext, simulateWhatIf, type WhatIfMover} from '../lib/whatif';
import {Avatar} from './Avatar';
import {Flag} from './Flag';

const MEDALS = ['🥇', '🥈', '🥉'];
const ROW_HEIGHT = 36;

// One standings row, absolutely positioned by its current rank so it slides
// smoothly when the order changes (the DOM order stays fixed by name).
function StandingRow({index, mover}: {index: number; mover: WhatIfMover}) {
	const currentTotal = mover.totalAfter - mover.pointsDelta;
	const moved = mover.rankAfter !== mover.rankBefore;
	const up = mover.rankAfter < mover.rankBefore;
	const gained = mover.pointsDelta > 0;

	return (
		<div
			className="absolute inset-x-0 flex h-9 items-center gap-2 px-2 text-xs transition-transform duration-500 ease-out"
			style={{transform: `translateY(${index * ROW_HEIGHT}px)`}}
		>
			<span className="w-8 shrink-0 text-center font-display font-bold text-slate-300">
				{mover.rankAfter <= 3 ? MEDALS[mover.rankAfter - 1] : mover.rankAfter}
			</span>

			<Avatar
				className="h-5 w-5 shrink-0 rounded-full text-[8px]"
				name={mover.name}
			/>

			<span className="flex min-w-0 flex-1 items-center gap-1.5">
				<span className="truncate font-medium text-slate-200">
					{mover.name}
				</span>

				{moved && (
					<span
						className={`shrink-0 whitespace-nowrap text-[10px] font-semibold ${
							up ? 'text-emerald-400' : 'text-rose-400'
						}`}
					>
						{mover.rankBefore} → {mover.rankAfter}
					</span>
				)}
			</span>

			<span className="w-8 shrink-0 text-right text-slate-500">
				{currentTotal}
			</span>

			<span className="flex w-16 shrink-0 items-center justify-end gap-1">
				<span className="font-display font-bold text-white">
					{mover.totalAfter}
				</span>

				{mover.pointsDelta !== 0 && (
					<span
						className={`text-[10px] font-semibold ${
							gained ? 'text-emerald-400' : 'text-rose-400'
						}`}
					>
						{gained ? '+' : ''}
						{mover.pointsDelta}
					</span>
				)}
			</span>
		</div>
	);
}

function TeamControl({
	canSubtract,
	onAdd,
	onSubtract,
	score,
	team,
}: {
	canSubtract: boolean;
	onAdd: () => void;
	onSubtract: () => void;
	score: number;
	team: string;
}) {
	return (
		<div className="flex items-center gap-2">
			<Flag className="h-4 w-6 shrink-0" team={team} />

			<span className="min-w-0 flex-1 truncate text-xs font-medium text-white">
				{team}
			</span>

			<button
				aria-label={`Remove a goal for ${team}`}
				className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-sm text-slate-300 transition enabled:hover:bg-white/20 disabled:opacity-30"
				disabled={!canSubtract}
				onClick={onSubtract}
			>
				−
			</button>

			<span className="w-5 text-center font-display text-base font-bold text-amber-300">
				{score}
			</span>

			<button
				aria-label={`Add a goal for ${team}`}
				className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-sm text-slate-300 transition hover:bg-white/20"
				onClick={onAdd}
			>
				+
			</button>
		</div>
	);
}

export function WhatIfPanel({
	games,
	matchNo,
	participants,
}: {
	games: Game[];
	matchNo: number;
	participants: Participant[];
}) {
	const ctx = liveWhatIfContext(participants, games, matchNo);
	const baseR1 = ctx?.r1 ?? 0;
	const baseR2 = ctx?.r2 ?? 0;
	const live = ctx !== null;

	// Default to one extra goal for team 1, so a scenario is always live.
	const [add1, setAdd1] = useState(1);
	const [add2, setAdd2] = useState(0);

	// Defer the recompute so the +/- taps stay instant; the standings catch up a
	// tick later, with a loading state in between.
	const deferredAdd1 = useDeferredValue(add1);
	const deferredAdd2 = useDeferredValue(add2);

	const standings = useMemo(
		() =>
			live
				? [
						...simulateWhatIf(
							participants,
							games,
							matchNo,
							baseR1 + deferredAdd1,
							baseR2 + deferredAdd2
						),
					].sort((a, b) => a.rankAfter - b.rankAfter)
				: [],
		[
			live,
			participants,
			games,
			matchNo,
			baseR1,
			baseR2,
			deferredAdd1,
			deferredAdd2,
		]
	);

	// Fixed DOM order (by name) so React keeps each node — positions come from
	// the rank below, letting CSS animate the reordering.
	const rows = useMemo(
		() => [...standings].sort((a, b) => a.name.localeCompare(b.name)),
		[standings]
	);

	const rankIndex = useMemo(
		() => new Map(standings.map((mover, index) => [mover.name, index])),
		[standings]
	);

	if (!ctx) {
		return null;
	}

	const pending = deferredAdd1 !== add1 || deferredAdd2 !== add2;
	const isDefault = add1 === 1 && add2 === 0;

	return (
		<div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
			<div className="mb-2 flex items-center justify-between">
				<p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
					🔮 What if…
					{pending && (
						<span
							aria-label="Calculating"
							className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-emerald-400/30 border-t-emerald-400"
						/>
					)}
				</p>

				{!isDefault && (
					<button
						className="text-xs font-medium text-slate-400 transition hover:text-slate-200"
						onClick={() => {
							setAdd1(1);
							setAdd2(0);
						}}
					>
						↺ Reset
					</button>
				)}
			</div>

			<div className="space-y-1.5">
				<TeamControl
					canSubtract={add1 > 0}
					onAdd={() => {
						setAdd1((value) => value + 1);
						acTrack('whatif_adjusted', {matchNo});
					}}
					onSubtract={() => {
						setAdd1((value) => Math.max(0, value - 1));
						acTrack('whatif_adjusted', {matchNo});
					}}
					score={ctx.r1 + add1}
					team={ctx.team1}
				/>

				<TeamControl
					canSubtract={add2 > 0}
					onAdd={() => {
						setAdd2((value) => value + 1);
						acTrack('whatif_adjusted', {matchNo});
					}}
					onSubtract={() => {
						setAdd2((value) => Math.max(0, value - 1));
						acTrack('whatif_adjusted', {matchNo});
					}}
					score={ctx.r2 + add2}
					team={ctx.team2}
				/>
			</div>

			<div
				className={`mt-2 border-t border-white/10 pt-2 transition-opacity ${
					pending ? 'opacity-40' : ''
				}`}
			>
				<div className="flex items-center gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
					<span className="w-8 shrink-0 text-center">#</span>

					<span className="w-5 shrink-0" />

					<span className="flex-1">Participant</span>

					<span className="w-8 shrink-0 text-right">Now</span>

					<span className="w-16 shrink-0 text-right">Points</span>
				</div>

				<div className="overflow-hidden rounded-lg">
					<div
						className="relative"
						style={{
							backgroundImage: `repeating-linear-gradient(to bottom, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) ${ROW_HEIGHT}px, transparent ${ROW_HEIGHT}px, transparent ${ROW_HEIGHT * 2}px)`,
							height: `${rows.length * ROW_HEIGHT}px`,
						}}
					>
						{rows.map((mover) => (
							<StandingRow
								index={rankIndex.get(mover.name) ?? 0}
								key={mover.name}
								mover={mover}
							/>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
