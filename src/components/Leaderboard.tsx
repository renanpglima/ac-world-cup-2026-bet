import type {LeaderboardRow} from '../lib/ranking';
import {Avatar} from './Avatar';
import {Reactions} from './Reactions';

const MEDALS = ['🥇', '🥈', '🥉'];

interface LeaderboardProps {
	live?: boolean;
	myReactions?: Record<string, string[]>;
	onReact?: (name: string, emoji: string) => void;
	onSelect: (name: string) => void;
	reactions?: Record<string, Record<string, number>>;
	recap?: string;
	rows: LeaderboardRow[];
	titles?: Record<string, string>;
}

export function Leaderboard({
	live = false,
	myReactions = {},
	onReact,
	onSelect,
	reactions = {},
	recap,
	rows,
	titles = {},
}: LeaderboardProps) {
	return (
		<div className="space-y-4">
			{recap && (
				<div className="flex gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3">
					<span aria-hidden className="text-sm">
						🎙️
					</span>

					<p className="text-sm italic leading-relaxed text-slate-300">
						{recap}
					</p>
				</div>
			)}

			<div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
				<table className="w-full text-left">
					<thead>
						<tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-slate-400">
							<th className="w-14 py-3 pl-4 pr-2 sm:w-20">Rank</th>

							<th className="py-3 pl-2 pr-2">Participant</th>

							<th className="hidden px-4 py-3 text-right sm:table-cell">
								Exact scores
							</th>

							<th className="px-3 py-3 text-right sm:px-4">Points</th>
						</tr>
					</thead>

					<tbody>
						{rows.map((row) => (
							<tr
								className="group cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/10"
								key={row.name}
								onClick={() => onSelect(row.name)}
							>
								<td className="w-14 py-3 pl-4 pr-2 font-display text-lg font-bold text-slate-300 sm:w-20">
									{row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
								</td>

								<td className="py-3 pl-2 pr-2">
									<div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
										<span className="flex min-w-0 items-center gap-2.5">
											<Avatar
												className="h-8 w-8 shrink-0 rounded-full"
												name={row.name}
											/>

											<span className="min-w-0">
												<span className="flex items-center gap-1.5">
													<span className="truncate font-medium text-white">
														{row.name}
													</span>

													{!live &&
														(row.movement ?? 0) > 0 && (
															<span className="text-xs text-emerald-400">
																▲
															</span>
														)}

													{!live &&
														(row.movement ?? 0) < 0 && (
															<span className="text-xs text-rose-400">
																▼
															</span>
														)}

													{!live && titles[row.name] && (
														<span className="hidden truncate text-xs text-slate-500 sm:inline">
															{titles[row.name]}
														</span>
													)}
												</span>

												{!live && titles[row.name] && (
													<span className="block truncate text-xs text-slate-500 sm:hidden">
														{titles[row.name]}
													</span>
												)}
											</span>
										</span>

										{onReact && (
											<Reactions
												counts={reactions[row.name] ?? {}}
												mine={myReactions[row.name] ?? []}
												onReact={(emoji) =>
													onReact(row.name, emoji)
												}
											/>
										)}
									</div>
								</td>

								<td className="hidden px-4 py-3 text-right text-slate-400 sm:table-cell">
									{row.exactCount}
								</td>

								<td className="whitespace-nowrap px-3 py-3 text-right font-display text-lg font-bold text-amber-400 sm:px-4">
									{row.livePoints > 0 ? (
										<>
											{row.total - row.livePoints}{' '}
											<span className="animate-pulse text-emerald-400">
												+{row.livePoints}
											</span>
										</>
									) : (
										row.total
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
