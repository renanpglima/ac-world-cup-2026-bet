import {useMemo, useState} from 'react';

import {buildHeadToHead} from '../lib/headToHead';
import type {LeaderboardRow} from '../lib/ranking';
import type {Game, Participant} from '../lib/types';
import {Avatar} from './Avatar';

const A_COLOR = '#34d399';
const B_COLOR = '#38bdf8';

interface HeadToHeadViewProps {
	games: Game[];
	participants: Participant[];
	rows: LeaderboardRow[];
}

function pct(value: number): string {
	return `${Math.round(value * 100)}%`;
}

function PickerRow({
	accent,
	label,
	names,
	onPick,
	selected,
}: {
	accent: 'a' | 'b';
	label: string;
	names: string[];
	onPick: (name: string) => void;
	selected: string;
}) {
	const active =
		accent === 'a'
			? 'bg-emerald-500 text-emerald-950'
			: 'bg-sky-500 text-sky-950';

	return (
		<div className="flex items-center gap-2">
			<span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
				{label}
			</span>

			<div className="flex gap-1 overflow-x-auto pb-1">
				{names.map((name) => (
					<button
						className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
							selected === name
								? active
								: 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
						}`}
						key={name}
						onClick={() => onPick(name)}
					>
						{name}
					</button>
				))}
			</div>
		</div>
	);
}

function PointsRace({
	a,
	aName,
	b,
	bName,
}: {
	a: number[];
	aName: string;
	b: number[];
	bName: string;
}) {
	const W = 460;
	const H = 170;
	const PAD = 12;
	// Reserved band at the top for the name labels, kept clear of the lines.
	const TOP = 32;

	if (a.length === 0) {
		return (
			<p className="text-xs text-slate-500">
				The race chart appears after the first final whistle.
			</p>
		);
	}

	const max = Math.max(1, ...a, ...b);
	const x = (index: number) =>
		a.length === 1 ? W / 2 : PAD + (index / (a.length - 1)) * (W - 2 * PAD);
	const y = (value: number) => H - PAD - (value / max) * (H - PAD - TOP);
	const line = (series: number[]) =>
		series.map((value, index) => `${x(index)},${y(value)}`).join(' ');

	return (
		<svg className="w-full" role="img" viewBox={`0 0 ${W} ${H}`}>
			{[a, b].map((series, index) => (
				<g key={index}>
					<polyline
						fill="none"
						points={line(series)}
						stroke={index === 0 ? A_COLOR : B_COLOR}
						strokeLinejoin="round"
						strokeWidth="1.5"
					/>

					<circle
						cx={x(series.length - 1)}
						cy={y(series[series.length - 1])}
						fill={index === 0 ? A_COLOR : B_COLOR}
						r="2.5"
					/>
				</g>
			))}

			<text fill={A_COLOR} fontSize="8" fontWeight="700" x={PAD} y={10}>
				{aName} {a[a.length - 1]}
			</text>

			<text
				fill={B_COLOR}
				fontSize="8"
				fontWeight="700"
				textAnchor="end"
				x={W - PAD}
				y={10}
			>
				{bName} {b[b.length - 1]}
			</text>
		</svg>
	);
}

function DuelRow({
	a,
	aWin,
	b,
	bWin,
	label,
}: {
	a: string;
	aWin: boolean;
	b: string;
	bWin: boolean;
	label: string;
}) {
	return (
		<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-white/5 py-2 last:border-0">
			<span
				className={`text-right font-display text-lg font-bold ${
					aWin ? 'text-emerald-400' : 'text-slate-400'
				}`}
			>
				{aWin ? `👑 ${a}` : a}
			</span>

			<span className="min-w-24 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
				{label}
			</span>

			<span
				className={`text-left font-display text-lg font-bold ${
					bWin ? 'text-sky-400' : 'text-slate-400'
				}`}
			>
				{bWin ? `${b} 👑` : b}
			</span>
		</div>
	);
}

export function HeadToHeadView({
	games,
	participants,
	rows,
}: HeadToHeadViewProps) {
	const names = useMemo(
		() =>
			rows.length
				? rows.map((row) => row.name)
				: participants.map((participant) => participant.name),
		[rows, participants]
	);

	const [aName, setAName] = useState(names[0]);
	const [bName, setBName] = useState(names[1] ?? names[0]);

	const pickA = (name: string) => {
		if (name === bName) {
			setBName(aName);
		}

		setAName(name);
	};

	const pickB = (name: string) => {
		if (name === aName) {
			setAName(bName);
		}

		setBName(name);
	};

	const h2h = useMemo(
		() => buildHeadToHead(aName, bName, participants, games),
		[aName, bName, participants, games]
	);

	const {a, b} = h2h;
	const num = (value: number | null) => value ?? 0;

	const duel = [
		{a: a.total, b: b.total, fmt: String, high: true, label: 'Points'},
		{
			a: a.rank,
			b: b.rank,
			fmt: (value: number) => `#${value}`,
			high: false,
			label: 'Rank',
		},
		{
			a: a.tierCounts[0],
			b: b.tierCounts[0],
			fmt: String,
			high: true,
			label: 'Exact scores',
		},
		{
			a: num(a.hitRate),
			b: num(b.hitRate),
			fmt: pct,
			high: true,
			label: 'Hit rate',
		},
		{
			a: num(a.avgPerMatch),
			b: num(b.avgPerMatch),
			fmt: (value: number) => value.toFixed(1),
			high: true,
			label: 'Avg / match',
		},
		{
			a: a.bestRound?.points ?? 0,
			b: b.bestRound?.points ?? 0,
			fmt: (value: number) => `+${value}`,
			high: true,
			label: 'Best round',
		},
		{a: a.streak, b: b.streak, fmt: String, high: true, label: 'Streak'},
		{
			a: num(a.contrarianRate),
			b: num(b.contrarianRate),
			fmt: pct,
			high: true,
			label: 'Contrarian',
		},
	];

	const duelTotal = h2h.winsA + h2h.winsB + h2h.ties;
	const lead =
		h2h.winsA > h2h.winsB
			? `${aName} leads ${h2h.winsA}–${h2h.winsB}`
			: h2h.winsB > h2h.winsA
				? `${bName} leads ${h2h.winsB}–${h2h.winsA}`
				: `All square ${h2h.winsA}–${h2h.winsB}`;

	return (
		<div className="space-y-4">
			<div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
				<PickerRow
					accent="a"
					label="Player 1"
					names={names}
					onPick={pickA}
					selected={aName}
				/>

				<PickerRow
					accent="b"
					label="Player 2"
					names={names}
					onPick={pickB}
					selected={bName}
				/>
			</div>

			<div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
				<div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
					<Avatar className="h-32 w-32 rounded-2xl" name={aName} />

					<p className="w-full truncate font-display text-lg font-bold text-white">
						{aName}
					</p>

					<p className="font-display text-3xl font-bold text-emerald-400">
						{a.total}
					</p>
				</div>

				<span className="shrink-0 font-display text-3xl font-bold text-slate-500">
					VS
				</span>

				<div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
					<Avatar className="h-32 w-32 rounded-2xl" name={bName} />

					<p className="w-full truncate font-display text-lg font-bold text-white">
						{bName}
					</p>

					<p className="font-display text-3xl font-bold text-sky-400">
						{b.total}
					</p>
				</div>
			</div>

			<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
				<div className="mb-2 flex items-baseline justify-between">
					<p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Head-to-head
					</p>

					<p className="text-xs text-slate-400">
						{duelTotal > 0 ? lead : 'No shared results yet'}
					</p>
				</div>

				{duelTotal > 0 && (
					<div className="flex h-3 overflow-hidden rounded-full bg-white/5">
						<div
							style={{backgroundColor: A_COLOR, flexGrow: h2h.winsA}}
							title={`${aName} ${h2h.winsA}`}
						/>

						<div
							style={{flexGrow: h2h.ties}}
							className="bg-white/10"
							title={`Ties ${h2h.ties}`}
						/>

						<div
							style={{backgroundColor: B_COLOR, flexGrow: h2h.winsB}}
							title={`${bName} ${h2h.winsB}`}
						/>
					</div>
				)}
			</div>

			<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
				<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
					Points race
				</p>

				<PointsRace
					a={h2h.aPoints}
					aName={aName}
					b={h2h.bPoints}
					bName={bName}
				/>
			</div>

			<div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2">
				{duel.map((row) => {
					const aWin = row.high ? row.a > row.b : row.a < row.b;
					const bWin = row.high ? row.b > row.a : row.b < row.a;

					return (
						<DuelRow
							a={row.fmt(row.a)}
							aWin={aWin}
							b={row.fmt(row.b)}
							bWin={bWin}
							key={row.label}
							label={row.label}
						/>
					);
				})}
			</div>

			{h2h.matches.length > 0 && (
				<div className="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
						Match by match
					</p>

					<div className="space-y-1.5">
						{h2h.matches.map((match) => (
							<div
								className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5"
								key={match.matchNo}
							>
								<span
									className={`text-center font-display text-sm font-bold ${
										match.winner === 'a'
											? 'text-emerald-400'
											: 'text-slate-500'
									}`}
								>
									{match.aPoints}
								</span>

								<span className="truncate text-center text-xs text-slate-400">
									{match.label}
								</span>

								<span
									className={`text-center font-display text-sm font-bold ${
										match.winner === 'b'
											? 'text-sky-400'
											: 'text-slate-500'
									}`}
								>
									{match.bPoints}
								</span>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
