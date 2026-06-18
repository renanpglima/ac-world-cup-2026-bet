import {useDeferredValue, useMemo, useState} from 'react';

import type {Game, Participant} from '../lib/types';
import {liveWhatIfContext, simulateWhatIf, type WhatIfMover} from '../lib/whatif';
import {Avatar} from './Avatar';
import {Flag} from './Flag';

function ordinal(rank: number): string {
	const mod100 = rank % 100;

	if (mod100 >= 11 && mod100 <= 13) {
		return `${rank}th`;
	}

	const suffix =
		rank % 10 === 1
			? 'st'
			: rank % 10 === 2
				? 'nd'
				: rank % 10 === 3
					? 'rd'
					: 'th';

	return `${rank}${suffix}`;
}

function MoverRow({mover}: {mover: WhatIfMover}) {
	const gained = mover.pointsDelta > 0;
	const moved = mover.rankAfter !== mover.rankBefore;
	const up = mover.rankAfter < mover.rankBefore;
	const newLeader = mover.rankAfter === 1 && mover.rankBefore !== 1;

	return (
		<div className="flex items-center gap-2">
			<Avatar
				className="h-5 w-5 shrink-0 rounded-full text-[8px]"
				name={mover.name}
			/>

			<span className="flex min-w-0 flex-1 items-center gap-1 truncate text-xs font-medium text-slate-200">
				{mover.name}

				{newLeader && (
					<span aria-label="New leader" title="New leader">
						👑
					</span>
				)}
			</span>

			<span
				className={`font-display text-xs font-bold ${
					gained ? 'text-emerald-300' : 'text-rose-300'
				}`}
			>
				{gained ? '+' : ''}
				{mover.pointsDelta}
			</span>

			{moved && (
				<span
					className={`flex items-center gap-0.5 whitespace-nowrap text-[10px] font-semibold ${
						up ? 'text-emerald-400' : 'text-rose-400'
					}`}
				>
					{up ? '▲' : '▼'} {ordinal(mover.rankBefore)}→
					{ordinal(mover.rankAfter)}
				</span>
			)}
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

	// Defer the (relatively heavy) recompute so the +/- taps stay instant; the
	// movers catch up a tick later, with a loading state in between.
	const deferredAdd1 = useDeferredValue(add1);
	const deferredAdd2 = useDeferredValue(add2);

	const movers = useMemo(
		() =>
			live
				? simulateWhatIf(
						participants,
						games,
						matchNo,
						baseR1 + deferredAdd1,
						baseR2 + deferredAdd2
					).filter((mover) => mover.pointsDelta !== 0)
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
					onAdd={() => setAdd1((value) => value + 1)}
					onSubtract={() => setAdd1((value) => Math.max(0, value - 1))}
					score={ctx.r1 + add1}
					team={ctx.team1}
				/>

				<TeamControl
					canSubtract={add2 > 0}
					onAdd={() => setAdd2((value) => value + 1)}
					onSubtract={() => setAdd2((value) => Math.max(0, value - 1))}
					score={ctx.r2 + add2}
					team={ctx.team2}
				/>
			</div>

			<div
				className={`mt-2 border-t border-white/10 pt-2 transition-opacity ${
					pending ? 'opacity-40' : ''
				}`}
			>
				{movers.length === 0 ? (
					<p className="text-xs text-slate-500">Nobody moves 😴</p>
				) : (
					<div className="space-y-1.5">
						{movers.map((mover) => (
							<MoverRow key={mover.name} mover={mover} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
