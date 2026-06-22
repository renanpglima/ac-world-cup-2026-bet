import type {CheerCounts, CheerSide} from '../lib/useCheers';
import {CheerCount} from './CheerCount';
import {Flag} from './Flag';
import {StatusChip} from './StatusChip';

export interface LiveGame {
	matchNo: number;
	r1: number;
	r2: number;
	team1: string;
	team2: string;
	timeElapsed?: string;
}

// The live-scores bar below the header. Tap a flag to cheer a team (+1, shared
// live with everyone); the 🔥 counter sits on each flag's outer side and the
// leading team's flame is alive.
export function LiveGames({
	cheers,
	games,
	onCheer,
}: {
	cheers: CheerCounts;
	games: LiveGame[];
	onCheer: (matchNo: number, side: CheerSide) => void;
}) {
	if (games.length === 0) {
		return null;
	}

	return (
		<div className="border-b border-white/10 bg-emerald-950/30">
			<div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4 px-4 py-4">
				{games.map((game) => {
					const tally = cheers[game.matchNo] ?? {};

					return (
						<div className="w-full sm:w-96" key={game.matchNo}>
							<StatusChip
								status="live"
								timeElapsed={game.timeElapsed}
							/>

							<article className="mt-2 flex items-center justify-center gap-2 rounded-2xl p-4">
								<CheerCount
									className="mr-3 w-9 shrink-0 justify-start"
									count={tally.team1 ?? 0}
									live={(tally.team1 ?? 0) > (tally.team2 ?? 0)}
								/>

								<button
									aria-label={`Cheer ${game.team1}`}
									className="flex flex-1 cursor-pointer justify-center rounded-lg transition hover:scale-110 active:scale-95"
									data-cheer={`${game.matchNo}-team1`}
									onClick={() => onCheer(game.matchNo, 'team1')}
								>
									<Flag
										className="h-14 w-20"
										team={game.team1}
										width={160}
									/>
								</button>

								<span className="font-display text-5xl font-bold text-white">
									{game.r1}
								</span>

								<span className="text-sm font-medium text-slate-500">
									vs
								</span>

								<span className="font-display text-5xl font-bold text-white">
									{game.r2}
								</span>

								<button
									aria-label={`Cheer ${game.team2}`}
									className="flex flex-1 cursor-pointer justify-center rounded-lg transition hover:scale-110 active:scale-95"
									data-cheer={`${game.matchNo}-team2`}
									onClick={() => onCheer(game.matchNo, 'team2')}
								>
									<Flag
										className="h-14 w-20"
										team={game.team2}
										width={160}
									/>
								</button>

								<CheerCount
									className="ml-3 w-9 shrink-0 justify-end"
									count={tally.team2 ?? 0}
									live={(tally.team2 ?? 0) > (tally.team1 ?? 0)}
								/>
							</article>
							</div>
						);
					})}
				</div>
			</div>
		);
}
