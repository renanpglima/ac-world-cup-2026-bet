import {useMemo} from 'react';

import {flagCode} from '../lib/flags';
import type {KnockoutPick} from '../lib/knockoutCards';
import type {MatchEntry} from '../lib/matches';
import {scorePrediction} from '../lib/scoring';
import {type KnockoutMatch, useKnockout} from '../lib/useKnockout';
import {useKnockoutPicks} from '../lib/useKnockoutPicks';
import {Flag} from './Flag';
import {MatchPicks} from './MatchPicks';

type ByNum = Record<number, KnockoutMatch>;

// Bracket tree, derived from the FIFA "W##" feeders so each match's two feeders
// are adjacent (a planar tree). Rounds run leaves → semifinal; the final is the
// centre. Left half feeds SF #101, right half feeds SF #102.
const LEFT: number[][] = [
	[74, 77, 73, 75, 83, 84, 81, 82],
	[89, 90, 93, 94],
	[97, 98],
	[101],
];
const RIGHT: number[][] = [
	[76, 78, 79, 80, 86, 88, 85, 87],
	[91, 92, 95, 96],
	[99, 100],
	[102],
];
const SPAN = [1, 2, 4, 8];

// Round groupings for the stacked mobile view.
const MOBILE_ROUNDS: {key: string; label: string}[] = [
	{key: 'Round of 32', label: 'Round of 32'},
	{key: 'Round of 16', label: 'Round of 16'},
	{key: 'Quarter-final', label: 'Quarter-finals'},
	{key: 'Semi-final', label: 'Semi-finals'},
	{key: 'Final', label: 'Final'},
	{key: 'Play-off for third place', label: '3rd place'},
];

const LINE = 'absolute border-white/15';

function TeamLine({
	placeholder,
	score,
	team,
}: {
	placeholder: string;
	score: number | null;
	team: string | null;
}) {
	const hasFlag = Boolean(team && flagCode(team));

	return (
		<div className="flex items-center justify-between gap-1.5">
			{hasFlag ? (
				<Flag className="h-5 w-7 shrink-0" team={team as string} />
			) : (
				<span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-400">
					{placeholder}
				</span>
			)}

			{score !== null && (
				<span className="shrink-0 text-sm font-bold text-amber-300">
					{score}
				</span>
			)}
		</div>
	);
}

// Hover popover listing everyone's picks for the match (with points once the
// match is decided).
function PicksPopover({m, picks}: {m: KnockoutMatch; picks: KnockoutPick[]}) {
	const resolved = m.scoreA != null && m.scoreB != null;

	const entries: MatchEntry[] = picks.map((pick) => ({
		name: pick.name,
		p1: pick.p1,
		p2: pick.p2,
		photoURL: pick.photoURL,
		points: resolved
			? scorePrediction(
					pick.p1,
					pick.p2,
					m.scoreA as number,
					m.scoreB as number
				)
			: null,
	}));

	return (
		<div className="invisible absolute left-1/2 top-full z-50 mt-1 w-64 -translate-x-1/2 rounded-2xl border border-white/10 bg-slate-900 p-3 text-left opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
			<MatchPicks entries={entries} />
		</div>
	);
}

function MatchCard({m, picks}: {m: KnockoutMatch; picks: KnockoutPick[]}) {
	return (
		<div className="group relative w-full min-w-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-1">
			<TeamLine
				placeholder={m.a}
				score={m.scoreA ?? null}
				team={m.teamA ?? null}
			/>

			<div className="my-0.5 h-px bg-white/5" />

			<TeamLine
				placeholder={m.b}
				score={m.scoreB ?? null}
				team={m.teamB ?? null}
			/>

			{picks.length > 0 && <PicksPopover m={m} picks={picks} />}
		</div>
	);
}

function Half({
	byMatch,
	byNum,
	rounds,
	side,
}: {
	byMatch: Record<number, KnockoutPick[]>;
	byNum: ByNum;
	rounds: number[][];
	side: 'left' | 'right';
}) {
	const left = side === 'left';

	return (
		<div
			className="grid flex-1 gap-x-6"
			style={{
				gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
				gridTemplateRows: 'repeat(8, minmax(4.5rem, 1fr))',
			}}
		>
			{rounds.flatMap((nums, round) =>
				nums.map((num, index) => {
					const span = SPAN[round];
					const rowStart = index * span + 1;
					const match = byNum[num];

					if (!match) {
						return null;
					}

					return (
						<div
							className="relative flex items-center"
							key={num}
							style={{
								gridColumn: left ? round + 1 : 4 - round,
								gridRow: `${rowStart} / span ${span}`,
							}}
						>
							<span
								className={`${LINE} border-t`}
								style={{
									top: '50%',
									width: '12px',
									...(left ? {left: '100%'} : {right: '100%'}),
								}}
							/>

							{round > 0 && (
								<>
									<span
										className={`${LINE} border-l`}
										style={{
											height: '50%',
											top: '25%',
											...(left
												? {left: '-12px'}
												: {right: '-12px'}),
										}}
									/>

									<span
										className={`${LINE} border-t`}
										style={{
											top: '50%',
											width: '12px',
											...(left
												? {left: '-12px'}
												: {right: '-12px'}),
										}}
									/>
								</>
							)}

							<MatchCard
								m={match}
								picks={byMatch[num] ?? []}
							/>
						</div>
					);
				})
			)}
		</div>
	);
}

function Center({
	byMatch,
	byNum,
}: {
	byMatch: Record<number, KnockoutPick[]>;
	byNum: ByNum;
}) {
	const final = byNum[104];
	const third = byNum[103];

	return (
		<div className="relative flex w-28 shrink-0 flex-col items-center justify-center gap-1">
			<span
				className={`${LINE} border-t`}
				style={{left: '-12px', top: '50%', width: '12px'}}
			/>

			<span
				className={`${LINE} border-t`}
				style={{right: '-12px', top: '50%', width: '12px'}}
			/>

			<div aria-hidden className="text-3xl leading-none">
				🏆
			</div>

			<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
				Final
			</span>

			{final && <MatchCard m={final} picks={byMatch[104] ?? []} />}

			{third && (
				<div className="mt-2 flex w-full flex-col items-center gap-0.5">
					<span className="text-[10px] uppercase tracking-wide text-slate-500">
						3rd place
					</span>

					<MatchCard m={third} picks={byMatch[103] ?? []} />
				</div>
			)}
		</div>
	);
}

export function KnockoutBracket() {
	const matches = useKnockout();
	const {byMatch} = useKnockoutPicks(null);

	const byNum = useMemo<ByNum>(
		() =>
			Object.fromEntries(matches.map((match) => [match.matchNumber, match])),
		[matches]
	);

	return (
		<div>
			{/* Desktop: symmetric tree with the trophy in the centre. */}
			<div className="hidden sm:block">
				<div className="flex items-stretch gap-2">
					<Half
						byMatch={byMatch}
						byNum={byNum}
						rounds={LEFT}
						side="left"
					/>

					<Center byMatch={byMatch} byNum={byNum} />

					<Half
						byMatch={byMatch}
						byNum={byNum}
						rounds={RIGHT}
						side="right"
					/>
				</div>
			</div>

			{/* Mobile: rounds stacked vertically, full width. */}
			<div className="space-y-5 sm:hidden">
				{MOBILE_ROUNDS.map((round) => {
					const roundMatches = matches.filter(
						(match) => match.stage === round.key
					);

					if (roundMatches.length === 0) {
						return null;
					}

					const single = roundMatches.length <= 2;

					return (
						<section key={round.key}>
							<h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
								{round.key === 'Final' && <span aria-hidden>🏆</span>}

								{round.label}
							</h3>

							<div
								className={`grid gap-2 ${
									single ? 'grid-cols-1' : 'grid-cols-2'
								}`}
							>
								{roundMatches.map((match) => (
									<MatchCard
										key={match.matchNumber}
										m={match}
										picks={byMatch[match.matchNumber] ?? []}
									/>
								))}
							</div>
						</section>
					);
				})}
			</div>

		</div>
	);
}
