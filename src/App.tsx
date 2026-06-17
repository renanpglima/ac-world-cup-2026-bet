import {useEffect, useMemo, useRef, useState} from 'react';

import {GoalOverlay} from './components/GoalOverlay';
import {HeadToHeadView} from './components/HeadToHeadView';
import {Header} from './components/Header';
import {Leaderboard} from './components/Leaderboard';
import {MatchesView} from './components/MatchesView';
import {ParticipantView} from './components/ParticipantView';
import {ReactionBurst} from './components/ReactionBurst';
import {RulesView} from './components/RulesView';
import {StatsView} from './components/StatsView';
import {trackEvent} from './lib/analytics';
import {buildEvolution} from './lib/evolution';
import {getMatchStatus} from './lib/games';
import {detectLocale, localize, stripEmoji} from './lib/locale';
import {buildStats} from './lib/stats';
import {buildMatchCards} from './lib/matches';
import {loadParticipants} from './lib/predictions';
import {buildLeaderboardWithMovement} from './lib/ranking';
import {buildPointsTimeline} from './lib/timeline';
import {useCommentary} from './lib/useCommentary';
import {useGames} from './lib/useGames';
import {useMatchReactions, useReactions} from './lib/useReactions';
import {buildWhatIf} from './lib/whatif';

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
	const [loadingMessage, setLoadingMessage] = useState(() =>
		Math.floor(Math.random() * LOADING_MESSAGES.length)
	);
	const [tab, setTab] = useState('leaderboard');

	const {failed: fetchFailed, gamesFile} = useGames();
	const {commentaryFile, ready: commentaryReady} = useCommentary();

	// Both feeds are live from the Realtime Database now — hold the splash until
	// the scores and the commentary have each pushed their first snapshot.
	const loading = (gamesFile === null && !fetchFailed) || !commentaryReady;

	const locale = useMemo(detectLocale, []);

	const commentary = useMemo<Record<number, string>>(
		() =>
			Object.fromEntries(
				Object.entries(commentaryFile?.byMatch ?? {})
					.filter(([, text]) => text)
					.map(([matchNo, text]) => [
						matchNo,
						localize(text, locale) ?? '',
					])
			),
		[commentaryFile, locale]
	);

	const boardRecap = useMemo(() => {
		const recap = localize(commentaryFile?.leaderboard?.recap, locale);

		return recap ? stripEmoji(recap) : undefined;
	}, [commentaryFile, locale]);

	const boardTitles = useMemo<Record<string, string>>(
		() =>
			Object.fromEntries(
				Object.entries(commentaryFile?.leaderboard?.titles ?? {}).map(
					([name, text]) => [
						name,
						stripEmoji(localize(text, locale) ?? ''),
					]
				)
			),
		[commentaryFile, locale]
	);

	const {counts, mine, toggle} = useReactions();
	const matchReactions = useMatchReactions();
	const [bursts, setBursts] = useState<Array<{emoji: string; id: number}>>(
		[]
	);
	const burstId = useRef(0);

	const [goalKey, setGoalKey] = useState(0);
	const [showGoal, setShowGoal] = useState(false);
	const prevScores = useRef<Map<number, string> | null>(null);

	const selectBettor = (name: string) => {
		setBettor(name);
		setTab('bets');
	};

	// Track tab navigation in GA4 — one named event per tab so each shows its
	// own click count in the Events report (e.g. tab_leaderboard, tab_matches).
	const selectTab = (id: string) => {
		trackEvent(`tab_${id}`);
		setTab(id);
	};

	const fireBurst = (emoji: string) => {
		const id = (burstId.current += 1);

		setBursts((current) => [...current, {emoji, id}]);
		setTimeout(
			() =>
				setBursts((current) =>
					current.filter((burst) => burst.id !== id)
				),
			2000
		);
	};

	const react = (name: string, emoji: string) => {
		if (!(mine[name] ?? []).includes(emoji)) {
			fireBurst(emoji);
		}

		toggle(name, emoji);
	};

	const reactMatch = (matchNo: number, emoji: string) => {
		const key = String(matchNo);

		if (!(matchReactions.mine[key] ?? []).includes(emoji)) {
			fireBurst(emoji);
		}

		matchReactions.toggle(key, emoji);
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

	// Fire the goal celebration when a push raises any match's score. The first
	// snapshot only seeds the baseline — nothing to compare against yet.
	useEffect(() => {
		if (!gamesFile) {
			return;
		}

		const current = new Map(
			gamesFile.games.map((game) => [
				game.id,
				`${game.homeScore}-${game.awayScore}`,
			])
		);

		if (prevScores.current) {
			const goal = gamesFile.games.some((game) => {
				const previous = prevScores.current?.get(game.id);

				if (!previous) {
					return false;
				}

				const [home, away] = previous.split('-').map(Number);

				// Only celebrate goals scored while the match is live — not
				// post-match score corrections or backfilled finals.
				return (
					(game.homeScore > home || game.awayScore > away) &&
					getMatchStatus(game) === 'live'
				);
			});

			if (goal) {
				setGoalKey((key) => key + 1);
				setShowGoal(true);
			}
		}

		prevScores.current = current;
	}, [gamesFile]);

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

			{showGoal && (
				<GoalOverlay
					key={goalKey}
					onDismiss={() => {
						trackEvent('goal_celebration_click');
						setShowGoal(false);
					}}
				/>
			)}

			<main className="mx-auto max-w-5xl px-4 py-6">
				<nav className="mb-6 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
					<TabButton
						active={tab === 'leaderboard'}
						onClick={() => selectTab('leaderboard')}
					>
						🏆 Leaderboard
					</TabButton>

					<TabButton
						active={tab === 'matches'}
						onClick={() => selectTab('matches')}
					>
						⚽ Matches
					</TabButton>

					<TabButton
						active={tab === 'bets'}
						onClick={() => selectTab('bets')}
					>
						🎯 Bets
					</TabButton>

					<TabButton
						active={tab === 'h2h'}
						onClick={() => selectTab('h2h')}
					>
						⚔️ Head to Head
						<span className="ml-1.5 inline-block rounded-full bg-amber-400 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-amber-950">
							New
						</span>
					</TabButton>

					<TabButton
						active={tab === 'stats'}
						onClick={() => selectTab('stats')}
					>
						📊 Stats
					</TabButton>

					<TabButton
						active={tab === 'rules'}
						onClick={() => selectTab('rules')}
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
						matchReactions={matchReactions}
						onMatchReact={reactMatch}
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
