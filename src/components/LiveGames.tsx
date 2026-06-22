import type {CheerCounts, CheerSide} from '../lib/useCheers';
import {useMatchChat} from '../lib/useMatchChat';
import {CheerCount} from './CheerCount';
import {Flag} from './Flag';
import {StatusChip} from './StatusChip';

function LiveChatPreview({
	matchNo,
	onOpen,
}: {
	matchNo: number;
	onOpen: (matchNo: number) => void;
}) {
	const {messages} = useMatchChat(matchNo, 1);
	const last = messages.at(-1);

	return (
		<button
			className="mt-2 flex w-full items-center gap-2 rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-left transition-colors hover:bg-sky-400/10"
			onClick={() => onOpen(matchNo)}
		>
			<span aria-hidden className="shrink-0 text-base">
				💬
			</span>

			<div className="min-w-0 flex-1">
				{last ? (
					<p className="truncate text-xs text-slate-300">
						<span className="font-medium text-sky-300">{last.name}:</span>{' '}
						{last.text}
					</p>
				) : (
					<p className="text-xs text-slate-500">Be the first to chat!</p>
				)}
			</div>

			<span aria-hidden className="shrink-0 text-xs text-slate-500">
				›
			</span>
		</button>
	);
}

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
	onOpenChat,
}: {
	cheers: CheerCounts;
	games: LiveGame[];
	onCheer: (matchNo: number, side: CheerSide) => void;
	onOpenChat: (matchNo: number) => void;
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

							<LiveChatPreview matchNo={game.matchNo} onOpen={onOpenChat} />
						</div>
					);
				})}
			</div>
		</div>
	);
}
