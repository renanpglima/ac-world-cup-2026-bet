import {useEffect, useMemo, useRef, useState} from 'react';

import {HeadToHeadView} from './components/HeadToHeadView';
import {Header} from './components/Header';
import {Leaderboard} from './components/Leaderboard';
import {MatchesView} from './components/MatchesView';
import {ParticipantView} from './components/ParticipantView';
import {ReactionBurst} from './components/ReactionBurst';
import {RulesView} from './components/RulesView';
import {StatsView} from './components/StatsView';
import {fetchCommentary} from './lib/commentary';
import {buildEvolution} from './lib/evolution';
import {fetchGames} from './lib/games';
import {detectLocale, localize, stripEmoji} from './lib/locale';
import {buildStats} from './lib/stats';
import {buildMatchCards} from './lib/matches';
import {loadParticipants} from './lib/predictions';
import {buildLeaderboardWithMovement} from './lib/ranking';
import {buildPointsTimeline} from './lib/timeline';
import {useReactions} from './lib/useReactions';
import {buildWhatIf} from './lib/whatif';
import type {GamesFile} from './lib/types';

const REFRESH_INTERVAL_MS =
	Number(import.meta.env.VITE_REFRESH_INTERVAL_MS) || 3_600_000;


const LOADING_MESSAGES = [
	'Mowing the pitch…',
	'Inflating the ball…',
	'Sorting the leaderboard…',
	'Studying the rules…',
	'Lining up the predictions…',
	'Waking up the commentator…',
	'Counting up the points…',
	'Polishing the trophy…',
	'Reviewing the VAR…',
	'Tallying the bets…',
];

function TabButton({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			className={`whitespace-nowrap rounded-full px-4 py-2 text-center text-sm font-medium transition-colors sm:py-1.5 ${
				active
					? 'bg-emerald-500 text-emerald-950'
					: 'bg-white/5 text-slate-300 hover:bg-white/10'
			}`}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export default function App() {
	const participants = useMemo(loadParticipants, []);

	const [bettor, setBettor] = useState<string | null>(null);
	const [boardRecap, setBoardRecap] = useState<string | undefined>(undefined);
	const [boardTitles, setBoardTitles] = useState<Record<string, string>>({});
	const [commentary, setCommentary] = useState<Record<number, string>>({});
	const [fetchFailed, setFetchFailed] = useState(false);
	const [gamesFile, setGamesFile] = useState<GamesFile | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingMessage, setLoadingMessage] = useState(() =>
		Math.floor(Math.random() * LOADING_MESSAGES.length)
	);
	const [tab, setTab] = useState('leaderboard');

	const {counts, mine, toggle} = useReactions();
	const [bursts, setBursts] = useState<Array<{emoji: string; id: number}>>(
		[]
	);
	const burstId = useRef(0);

	const selectBettor = (name: string) => {
		setBettor(name);
		setTab('bets');
	};

	const react = (name: string, emoji: string) => {
		const adding = !(mine[name] ?? []).includes(emoji);

		if (adding) {
			const id = (burstId.current += 1);

			setBursts((current) => [...current, {emoji, id}]);
			setTimeout(
				() =>
					setBursts((current) =>
						current.filter((burst) => burst.id !== id)
					),
				2000
			);
		}

		toggle(name, emoji);
	};

	useEffect(() => {
		if (!loading) {
			return undefined;
		}

		const id = setInterval(
			() =>
				setLoadingMessage(
					(index) => (index + 1) % LOADING_MESSAGES.length
				),
			1300
		);

		return () => clearInterval(id);
	}, [loading]);

	useEffect(() => {
		let active = true;

		const load = async () => {
			const file = await fetchGames();

			if (!active) {
				return;
			}

			if (file) {
				setFetchFailed(false);
				setGamesFile(file);
			}
			else {
				setFetchFailed(true);
			}

			const commentaryFile = await fetchCommentary();

			if (active && commentaryFile) {
				const locale = detectLocale();

				setCommentary(
					Object.fromEntries(
						Object.entries(commentaryFile.byMatch).map(
							([matchNo, text]) => [
								matchNo,
								localize(text, locale) ?? '',
							]
						)
					)
				);

				const recap = localize(commentaryFile.leaderboard?.recap, locale);

				setBoardRecap(recap ? stripEmoji(recap) : undefined);

				setBoardTitles(
					Object.fromEntries(
						Object.entries(
							commentaryFile.leaderboard?.titles ?? {}
						).map(([name, text]) => [
							name,
							stripEmoji(localize(text, locale) ?? ''),
						])
					)
				);
			}
			if (active) {
				setLoading(false);
			}
		};

		load();

		const intervalId = setInterval(load, REFRESH_INTERVAL_MS);

		return () => {
			active = false;
			clearInterval(intervalId);
		};
	}, []);

	const games = gamesFile?.games ?? [];

	const rows = useMemo(
		() => buildLeaderboardWithMovement(participants, games),
		[participants, games]
	);

	const cards = useMemo(
		() => buildMatchCards(participants, games),
		[participants, games]
	);

	const evolution = useMemo(
		() => buildEvolution(participants, games),
		[participants, games]
	);

	const stats = useMemo(() => buildStats(cards), [cards]);

	const timeline = useMemo(
		() => buildPointsTimeline(participants, games),
		[participants, games]
	);

	const whatIf = useMemo(
		() =>
			Object.fromEntries(
				cards
					.filter((card) => card.status === 'live')
					.map((card) => [
						card.matchNo,
						buildWhatIf(participants, games, card.matchNo),
					])
			),
		[cards, participants, games]
	);

	const liveGames = useMemo(
		() =>
			cards
				.filter((card) => card.status === 'live')
				.map((card) => ({
					r1: card.r1 ?? 0,
					r2: card.r2 ?? 0,
					team1: card.team1,
					team2: card.team2,
				})),
		[cards]
	);

	const statusText = gamesFile
		? `Last updated ${new Date(gamesFile.fetchedAt).toLocaleString('en-US', {
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				month: 'short',
			})}`
		: fetchFailed
			? 'Scores unavailable — showing predictions only'
			: 'Loading scores…';

	const activeBettor =
		tab === 'bets'
			? (participants.find(
					(participant) => participant.name === bettor
				) ?? participants[0])
			: undefined;

	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-950 font-sans">
				<div className="flex flex-col items-center gap-4">
					<span className="animate-bounce text-5xl">⚽</span>

					<p className="text-sm font-medium text-slate-400">
						{LOADING_MESSAGES[loadingMessage]}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-950 font-sans">
			<Header liveGames={liveGames} statusText={statusText} />

			<ReactionBurst bursts={bursts} />

			<main className="mx-auto max-w-5xl px-4 py-6">
				<nav className="mb-6 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
					<TabButton
						active={tab === 'leaderboard'}
						onClick={() => setTab('leaderboard')}
					>
						🏆 Leaderboard
					</TabButton>

					<TabButton
						active={tab === 'matches'}
						onClick={() => setTab('matches')}
					>
						⚽ Matches
					</TabButton>

					<TabButton
						active={tab === 'bets'}
						onClick={() => setTab('bets')}
					>
						🎯 Bets
					</TabButton>

					<TabButton
						active={tab === 'h2h'}
						onClick={() => setTab('h2h')}
					>
						⚔️ Head to Head
						<span className="ml-1.5 inline-block rounded-full bg-amber-400 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-950">
							New
						</span>
					</TabButton>

					<TabButton
						active={tab === 'stats'}
						onClick={() => setTab('stats')}
					>
						📊 Stats
					</TabButton>

					<TabButton
						active={tab === 'rules'}
						onClick={() => setTab('rules')}
					>
						📜 Rules
					</TabButton>
				</nav>

				{tab === 'bets' && (
					<nav className="-mt-4 mb-6 flex gap-1 overflow-x-auto border-l-2 border-emerald-500/30 pb-1 pl-3">
						{participants.map((participant) => (
							<button
								className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
									activeBettor?.name === participant.name
										? 'bg-amber-400 font-semibold text-amber-950'
										: 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
								}`}
								key={participant.name}
								onClick={() => setBettor(participant.name)}
							>
								{participant.name}
							</button>
						))}
					</nav>
				)}

				{activeBettor ? (
					<ParticipantView
						games={games}
						participant={activeBettor}
						participants={participants}
					/>
				) : tab === 'matches' ? (
					<MatchesView
						cards={cards}
						commentary={commentary}
						whatIf={whatIf}
					/>
				) : tab === 'h2h' ? (
					<HeadToHeadView
						games={games}
						participants={participants}
						rows={rows}
					/>
				) : tab === 'stats' ? (
					<StatsView
						evolution={evolution}
						stats={stats}
						timeline={timeline}
					/>
				) : tab === 'rules' ? (
					<RulesView />
				) : (
					<Leaderboard
						live={liveGames.length > 0}
						myReactions={mine}
						onReact={react}
						onSelect={selectBettor}
						reactions={counts}
						recap={liveGames.length === 0 ? boardRecap : undefined}
						rows={rows}
						titles={boardTitles}
					/>
				)}
			</main>
		</div>
	);
}
