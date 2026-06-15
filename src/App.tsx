import {useEffect, useMemo, useState} from 'react';

import {Header} from './components/Header';
import {Leaderboard} from './components/Leaderboard';
import {MatchesView} from './components/MatchesView';
import {ParticipantView} from './components/ParticipantView';
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
import {buildWhatIf} from './lib/whatif';
import type {GamesFile} from './lib/types';

const REFRESH_INTERVAL_MS =
	Number(import.meta.env.VITE_REFRESH_INTERVAL_MS) || 3_600_000;

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
	const [tab, setTab] = useState('leaderboard');

	const selectBettor = (name: string) => {
		setBettor(name);
		setTab('bets');
	};

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

	return (
		<div className="min-h-screen bg-slate-950 font-sans">
			<Header liveGames={liveGames} statusText={statusText} />

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
						onSelect={selectBettor}
						recap={liveGames.length === 0 ? boardRecap : undefined}
						rows={rows}
						titles={boardTitles}
					/>
				)}
			</main>
		</div>
	);
}
