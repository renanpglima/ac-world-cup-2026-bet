import {useEffect, useMemo, useRef, useState} from 'react';
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from 'react-router-dom';

import {BetsView} from './components/BetsView';
import {GoalOverlay} from './components/GoalOverlay';
import {HeadToHeadView} from './components/HeadToHeadView';
import {Header} from './components/Header';
import {Leaderboard} from './components/Leaderboard';
import {LiveGames} from './components/LiveGames';
import {MatchesView} from './components/MatchesView';
import {NavDrawer} from './components/NavDrawer';
import {ReactionBurst} from './components/ReactionBurst';
import {RulesView} from './components/RulesView';
import {StatsView} from './components/StatsView';
import {trackEvent, trackPageView} from './lib/analytics';
import {buildEvolution} from './lib/evolution';
import {getMatchStatus} from './lib/games';
import {detectLocale, localize, stripEmoji} from './lib/locale';
import {buildStats} from './lib/stats';
import {buildMatchCards} from './lib/matches';
import {currentNavItem} from './lib/nav';
import {loadParticipants} from './lib/predictions';
import {buildLeaderboardWithMovement} from './lib/ranking';
import {buildPointsTimeline} from './lib/timeline';
import {useCommentary} from './lib/useCommentary';
import {useGames} from './lib/useGames';
import {useMatchReactions, useReactions} from './lib/useReactions';

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

export default function App() {
	const participants = useMemo(loadParticipants, []);

	const [loadingMessage, setLoadingMessage] = useState(() =>
		Math.floor(Math.random() * LOADING_MESSAGES.length)
	);

	const navigate = useNavigate();
	const location = useLocation();
	const [menuOpen, setMenuOpen] = useState(false);

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

	// GA4 page_view per route — fires on the first view and every navigation.
	useEffect(() => {
		trackPageView(location.pathname);
	}, [location.pathname]);

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
				// Impression: a celebration is being shown. Pair with
				// goal_celebration_click for a click-through rate.
				trackEvent('goal_celebration_shown');
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

	const liveGames = useMemo(
		() =>
			cards
				.filter((card) => card.status === 'live')
				.map((card) => ({
					matchNo: card.matchNo,
					r1: card.r1 ?? 0,
					r2: card.r2 ?? 0,
					team1: card.team1,
					team2: card.team2,
					timeElapsed: card.timeElapsed,
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
			<Header
				onMenuClick={() => setMenuOpen(true)}
				statusText={statusText}
			/>

			<NavDrawer
				onClose={() => setMenuOpen(false)}
				open={menuOpen}
				participants={participants.map((participant) => participant.name)}
			/>

			<LiveGames games={liveGames} />

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
				<h2 className="mb-5 flex items-center gap-2 font-display text-2xl font-bold text-white">
					<span aria-hidden>
						{currentNavItem(location.pathname).icon}
					</span>

					{currentNavItem(location.pathname).label}
				</h2>

				<Routes>
					<Route
						element={
							<Leaderboard
								live={liveGames.length > 0}
								myReactions={mine}
								onReact={react}
								onSelect={(name) =>
									navigate(`/bets/${name.toLowerCase()}`)
								}
								reactions={counts}
								recap={
									liveGames.length === 0
										? boardRecap
										: undefined
								}
								rows={rows}
								titles={boardTitles}
							/>
						}
						path="/"
					/>

					<Route
						element={
							<MatchesView
								cards={cards}
								commentary={commentary}
								games={games}
								matchReactions={matchReactions}
								onMatchReact={reactMatch}
								participants={participants}
							/>
						}
						path="/matches"
					/>

					<Route
						element={
							<Navigate
								replace
								to={`/bets/${participants[0].name.toLowerCase()}`}
							/>
						}
						path="/bets"
					/>

					<Route
						element={
							<BetsView
								games={games}
								participants={participants}
							/>
						}
						path="/bets/:id"
					/>

					<Route
						element={
							<HeadToHeadView
								games={games}
								participants={participants}
								rows={rows}
							/>
						}
						path="/h2h"
					/>

					<Route
						element={
							<StatsView
								evolution={evolution}
								stats={stats}
								timeline={timeline}
							/>
						}
						path="/stats"
					/>

					<Route element={<RulesView />} path="/rules" />

					<Route element={<Navigate replace to="/" />} path="*" />
				</Routes>
			</main>
		</div>
	);
}
