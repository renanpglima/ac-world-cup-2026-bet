import {Flag} from './Flag';

export interface LiveGame {
	r1: number;
	r2: number;
	team1: string;
	team2: string;
}

interface HeaderProps {
	liveGames: LiveGame[];
	statusText: string;
}

export function Header({liveGames, statusText}: HeaderProps) {
	return (
		<header className="border-b border-white/10 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950">
			<div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
						Analytics Cloud
					</p>

					<h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
						World Cup 2026 <span className="text-amber-400">BET</span>
					</h1>
				</div>

				<div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
					{liveGames.map((game) => (
						<span
							className="flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1"
							key={`${game.team1}-${game.team2}`}
						>
							<Flag className="h-3.5 w-5" team={game.team1} />

							<span className="font-display font-bold text-amber-300">
								{game.r1}–{game.r2}
							</span>

							<Flag className="h-3.5 w-5" team={game.team2} />
						</span>
					))}

					{liveGames.length > 0 && (
						<span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-400">
							<span aria-hidden className="inline-block animate-spin">
								⚽
							</span>

							{liveGames.length} live
						</span>
					)}

					<span>{statusText}</span>
				</div>
			</div>
		</header>
	);
}
