import {realScoreFor} from '../lib/games';
import {formatKickoff} from '../lib/kickoff';
import type {ScoredPrediction} from '../lib/ranking';
import {StatusChip, TIER_STYLES} from './StatusChip';

export function MatchRow({scored}: {scored: ScoredPrediction}) {
	const {game, points, prediction, status} = scored;

	const real =
		game && status !== 'notstarted'
			? realScoreFor(prediction, game)
			: undefined;

	return (
		<tr
			className={`border-b border-white/5 last:border-0 ${
				status === 'notstarted' ? 'opacity-50' : ''
			}`}
		>
			<td className="px-3 py-2.5 text-xs text-slate-500">
				#{prediction.matchNo}
			</td>

			<td className="px-3 py-2.5 text-xs text-slate-400">
				{prediction.group}
			</td>

			<td className="hidden px-3 py-2.5 text-xs text-slate-400 sm:table-cell">
				{formatKickoff(prediction.date, prediction.time)}
			</td>

			<td className="px-3 py-2.5 text-sm text-white">
				<span className="font-medium">{prediction.team1}</span>

				<span className="mx-2 rounded bg-white/10 px-2 py-0.5 font-display font-bold text-amber-300">
					{prediction.p1}–{prediction.p2}
				</span>

				<span className="font-medium">{prediction.team2}</span>
			</td>

			<td className="px-3 py-2.5 text-center font-display text-sm font-bold text-white">
				{real ? `${real.r1}–${real.r2}` : '—'}
			</td>

			<td className="px-3 py-2.5 text-center">
				<StatusChip status={status} timeElapsed={game?.timeElapsed} />
			</td>

			<td className="px-3 py-2.5 text-right">
				{points === null ? (
					<span className="text-slate-600">—</span>
				) : (
					<span
						className={`inline-block min-w-10 rounded-full px-2.5 py-0.5 text-center text-sm font-bold ${
							TIER_STYLES[points]
						} ${status === 'live' ? 'animate-pulse' : ''}`}
					>
						{points}
					</span>
				)}
			</td>
		</tr>
	);
}
