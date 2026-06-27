import {useEffect, useMemo, useRef, useState} from 'react';
import {
	Navigate,
	Route,
	Routes,
	useLocation,
	useNavigate,
} from 'react-router-dom';

import {onValue, ref, remove} from 'firebase/database';

import {AdminView} from './components/AdminView';
import {ArenaView} from './components/ArenaView';
import {BetsView} from './components/BetsView';
import {CelebrateOverlay} from './components/CelebrateOverlay';
import {CheerBurstLayer} from './components/CheerBurst';
import {ClaimPrompt} from './components/ClaimPrompt';
import {GoalOverlay} from './components/GoalOverlay';
import {GroupsView} from './components/GroupsView';
import {HeadToHeadView} from './components/HeadToHeadView';
import {Header} from './components/Header';
import {IdentityPrompt} from './components/IdentityPrompt';
import {Leaderboard} from './components/Leaderboard';
import {ChatButton} from './components/ChatButton';
import {ChatPanel} from './components/ChatPanel';
import {LiveGames} from './components/LiveGames';
import {KnockoutView} from './components/KnockoutView';
import {MatchesView} from './components/MatchesView';
import {NavBar} from './components/NavBar';
import {ProfileView} from './components/ProfileView';
import {NavDrawer} from './components/NavDrawer';
import {ReactionBurst} from './components/ReactionBurst';
import {RulesView} from './components/RulesView';
import {GroupStageView} from './components/GroupStageView';
import {KnockoutChampionView} from './components/KnockoutChampionView';
import {PhotosProvider} from './components/PhotosContext';
import {trackEvent, trackPageView} from './lib/analytics';
import {acPage, acTrack, initAnalyticsCloud} from './lib/analyticsCloud';
import {dataPath} from './lib/dataRoot';
import {participantSlug} from './lib/auth';
import {buildEvolution} from './lib/evolution';
import {buildGroupStageAwards} from './lib/groupStageAwards';
import {db} from './lib/firebase';
import {getMatchStatus} from './lib/games';
import {detectLocale, localize, stripEmoji} from './lib/locale';
import {buildStats} from './lib/stats';
import {buildKnockoutCards, isKnockoutPickable} from './lib/knockoutCards';
import {buildMatchCards} from './lib/matches';
import {currentNavItem, NAV_ITEMS, visibleMenu} from './lib/nav';
import {buildParticipantStats} from './lib/participantStats';
import {loadParticipants} from './lib/predictions';
import {
	buildKnockoutLeaderStats,
	buildKnockoutStandings,
	knockoutRoster,
	mergeKnockoutParticipants,
} from './lib/knockoutStandings';
import {buildKnockoutChampion} from './lib/knockoutChampion';
import {approvedParticipant, type Approval, type Profile} from './lib/profiles';
import {buildLeaderboardWithMovement} from './lib/ranking';
import {buildPointsTimeline} from './lib/timeline';
import {simulateTitleOdds} from './lib/titleOdds';
import {useAuth} from './lib/useAuth';
import {useChatUnread} from './lib/useChatUnread';
import {useCommentary} from './lib/useCommentary';
import {type CheerCounts, useCheers} from './lib/useCheers';
import {useGames} from './lib/useGames';
import {useKnockout} from './lib/useKnockout';
import {type KnockoutIdentity, useKnockoutPicks} from './lib/useKnockoutPicks';
import {useIdentity} from './lib/useIdentity';
import {useCelebrate} from './lib/useCelebrate';
import {useLeaderHype} from './lib/useLeaderHype';
import {useMenu} from './lib/useMenu';
import {usePresence} from './lib/usePresence';
import {useMatchReactions, useReactions} from './lib/useReactions';
import {useSettings} from './lib/useSettings';

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
	const [identityOpen, setIdentityOpen] = useState(false);
	const [chatOpen, setChatOpen] = useState(false);
	const [claimOpen, setClaimOpen] = useState(false);

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
	const {cheer, counts: cheerCounts, loaded: cheersLoaded} = useCheers();
	const identity = useIdentity();
	const {markRead: markChatRead, unread: chatUnread} = useChatUnread(
		identity.name
	);
	const auth = useAuth();

	const {config: menuConfig} = useMenu();
	const menuItems = useMemo(
		() => visibleMenu(NAV_ITEMS, menuConfig),
		[menuConfig]
	);

	// When the owner restricts the chat, anonymous visitors can't open or read it.
	const {chatLoginOnly} = useSettings();
	const chatLocked = chatLoginOnly && auth.isAnonymous;

	// All approvals (small) so the signed-in viewer knows their linked participant.
	const [approvals, setApprovals] = useState<Record<string, Approval>>({});
	useEffect(
		() =>
			onValue(ref(db, dataPath('approvals')), (snapshot) => {
				setApprovals((snapshot.val() as Record<string, Approval>) ?? {});
			}),
		[]
	);

	// All profiles (small) so the knockout ranking can name every approved
	// participant and the admin can see knockout sign-ups.
	const [profiles, setProfiles] = useState<Record<string, Profile>>({});
	useEffect(
		() =>
			onValue(ref(db, dataPath('profiles')), (snapshot) => {
				setProfiles((snapshot.val() as Record<string, Profile>) ?? {});
			}),
		[]
	);

	const myParticipantSlug = approvedParticipant(approvals, auth.user?.uid ?? null);
	const myParticipantName =
		participants.find((p) => participantSlug(p.name) === myParticipantSlug)
			?.name ?? null;

	// Identified presence: pool name when claimed, else Google name; real photo
	// when signed in.
	const presenceName = myParticipantName ?? auth.profile?.name ?? null;
	const presencePhoto = auth.profile?.photoURL ?? null;
	const online = usePresence(presenceName, presencePhoto);

	// Knockout picks: signed-in users predict the bracket games from the
	// Upcoming tab. Identity carries the pool name when claimed, else the Google
	// name, so picks read consistently with the rest of the app.
	const knockoutMatches = useKnockout();

	const knockoutIdentity: KnockoutIdentity | null =
		!auth.isAnonymous && auth.user
			? {
					name: presenceName ?? 'Player',
					photoURL: presencePhoto,
					uid: auth.user.uid,
				}
			: null;

	const {
		byMatch: knockoutPicksByMatch,
		byUid: knockoutPicksByUid,
		mine: myKnockoutPicks,
		setPick: setKnockoutPick,
	} = useKnockoutPicks(knockoutIdentity);

	const myKnockoutApproval = auth.user ? approvals[auth.user.uid] : undefined;
	const knockoutApproved = Boolean(
		myKnockoutApproval &&
			!myKnockoutApproval.blocked &&
			(myKnockoutApproval.knockout === true ||
				myKnockoutApproval.participant)
	);
	const knockoutPending =
		Boolean(auth.profile?.wantsKnockout) && !knockoutApproved;
	const {hype, last: leaderHype, loaded: hypeLoaded} = useLeaderHype();
	const {celebrate, last: celebrateEvent, loaded: celebrateLoaded} =
		useCelebrate();
	const prevCelebrateN = useRef<number | null>(null);
	const [celebrating, setCelebrating] = useState<string | null>(null);
	const [bursts, setBursts] = useState<Array<{emoji: string; id: number}>>(
		[]
	);
	const burstId = useRef(0);

	const [cheerBursts, setCheerBursts] = useState<
		Array<{emoji?: string; id: number; x: number; y: number}>
	>([]);
	const cheerBurstId = useRef(0);

	const [goalKey, setGoalKey] = useState(0);
	const [showGoal, setShowGoal] = useState(false);
	const prevScores = useRef<Map<number, string> | null>(null);
	const prevCheers = useRef<CheerCounts | null>(null);
	const prevHypeN = useRef<number | null>(null);

	// Load the Analytics Cloud SDK once.
	useEffect(() => {
		initAnalyticsCloud();
	}, []);

	// Title the page after the current route, then send the page view (GA4 and
	// Analytics Cloud) so the reported title matches. On navigation, the cleanup
	// fires pageUnloaded for the page being left, then this body fires
	// pageLoaded for the page being entered.
	useEffect(() => {
		const page = location.pathname;

		document.title = `AC World Cup 2026 BET - ${currentNavItem(page).label}`;

		trackPageView(page);
		acPage('pageViewed', {page, title: document.title});
		acPage('pageLoaded', {page, title: document.title});

		if (page.startsWith('/bets/')) {
			acTrack('participant_opened', {
				participant: page.slice('/bets/'.length),
			});
		}

		return () => {
			acPage('pageUnloaded', {page});
		};
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

	// A radial burst at (x, y) — every online client sees its own. With no
	// emoji it's a random shower (live-bar cheers); with one it's that emoji
	// (the leader card's trophies).
	const fireCheer = (x: number, y: number, emoji?: string) => {
		const id = (cheerBurstId.current += 1);

		setCheerBursts((current) => [...current, {emoji, id, x, y}]);
		setTimeout(
			() =>
				setCheerBursts((current) =>
					current.filter((burst) => burst.id !== id)
				),
			1400
		);
	};

	const react = (name: string, emoji: string) => {
		if (!(mine[name] ?? []).includes(emoji)) {
			fireBurst(emoji);
			acTrack('player_reaction', {emoji, player: name});
		}

		toggle(name, emoji);
	};

	const reactMatch = (matchNo: number, emoji: string) => {
		const key = String(matchNo);

		if (!(matchReactions.mine[key] ?? []).includes(emoji)) {
			fireBurst(emoji);
			acTrack('match_reaction', {emoji, matchNo});
		}

		matchReactions.toggle(key, emoji);
	};

	const clearPlayerReaction = (name: string, emoji: string) => {
		remove(ref(db, `${dataPath('reactions')}/${name}/${emoji}`));
	};

	const clearMatchReaction = (matchNo: number, emoji: string) => {
		remove(ref(db, `${dataPath('matches/reactions')}/${matchNo}/${emoji}`));
	};

	const clearMatchCommentary = (matchNo: number) => {
		remove(ref(db, `${dataPath('commentary')}/byMatch/${matchNo}`));
	};

	const clearRecap = () => {
		remove(ref(db, `${dataPath('commentary')}/leaderboard/recap`));
	};

	const resetCheers = (matchNo: number) => {
		remove(ref(db, `${dataPath('cheers')}/${matchNo}`));
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
				acTrack('goal_celebration_shown');
				setGoalKey((key) => key + 1);
				setShowGoal(true);
			}
		}

		prevScores.current = current;
	}, [gamesFile]);

	// A cheer from anyone bumps a team's count in the RTDB; every online client
	// sees it rise here and fires its own random emoji shower. The first
	// snapshot only seeds the baseline.
	useEffect(() => {
		if (!cheersLoaded) {
			return;
		}

		const previous = prevCheers.current;

		if (previous) {
			for (const [matchNo, sides] of Object.entries(cheerCounts)) {
				const before = previous[matchNo] ?? {team1: 0, team2: 0};

				for (const side of ['team1', 'team2'] as const) {
					if ((sides[side] ?? 0) <= (before[side] ?? 0)) {
						continue;
					}

					// Anchor the burst on the flag that was cheered — wherever
					// it sits in this client's live bar.
					const flag = document.querySelector(
						`[data-cheer="${matchNo}-${side}"]`
					);

					if (flag) {
						const rect = flag.getBoundingClientRect();

						fireCheer(
							rect.left + rect.width / 2,
							rect.top + rect.height / 2
						);
					}
				}
			}
		}

		prevCheers.current = cheerCounts;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cheerCounts, cheersLoaded]);

	// Someone tapped the leader card: explode trophies at the same relative spot
	// on this client's card. Only clients showing the card (the home) react.
	useEffect(() => {
		if (!hypeLoaded) {
			return;
		}

		const prev = prevHypeN.current;

		if (prev !== null && leaderHype.n > prev) {
			const card = document.querySelector('[data-leader-card]');

			if (card) {
				const rect = card.getBoundingClientRect();

				fireCheer(
					rect.left + leaderHype.rx * rect.width,
					rect.top + leaderHype.ry * rect.height,
					'🏆'
				);
			}
		}

		prevHypeN.current = leaderHype.n;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [leaderHype, hypeLoaded]);

	// A celebrate event bumped — show the overlay for everyone, briefly.
	useEffect(() => {
		if (!celebrateLoaded) {
			return;
		}

		const prev = prevCelebrateN.current;

		prevCelebrateN.current = celebrateEvent.n;

		if (prev === null || celebrateEvent.n <= prev || !celebrateEvent.name) {
			return;
		}

		setCelebrating(celebrateEvent.name);
		acTrack('celebrate_shown', {name: celebrateEvent.name});

		const timer = setTimeout(() => setCelebrating(null), 2600);

		return () => clearTimeout(timer);
	}, [celebrateEvent, celebrateLoaded]);

	// Offer the claim prompt to a freshly signed-in user with no link yet.
	useEffect(() => {
		if (
			!auth.isAnonymous &&
			auth.user &&
			auth.profile &&
			!auth.profile.claim &&
			!myParticipantSlug
		) {
			setClaimOpen(true);
		}
	}, [auth.isAnonymous, auth.user, auth.profile, myParticipantSlug]);

	const games = gamesFile?.games ?? [];

	const rows = useMemo(
		() => buildLeaderboardWithMovement(participants, games),
		[participants, games]
	);

	const leaderName = rows[0]?.name;

	const leader = useMemo(() => {
		const participant = participants.find(
			(item) => item.name === leaderName
		);

		return participant && leaderName
			? {
					name: leaderName,
					stats: buildParticipantStats(
						participant,
						participants,
						games
					),
				}
			: undefined;
	}, [leaderName, participants, games]);

	const cards = useMemo(
		() => buildMatchCards(participants, games),
		[participants, games]
	);

	const knockoutCards = useMemo(
		() =>
			buildKnockoutCards(knockoutMatches, knockoutPicksByMatch, Date.now()),
		[knockoutMatches, knockoutPicksByMatch]
	);

	const knockoutRosterRows = useMemo(
		() => knockoutRoster(profiles, approvals, participants),
		[profiles, approvals, participants]
	);

	// Participant display name → signed-in Google photo, for every Avatar. Only
	// approved/linked accounts are here, so a photo is never attributed to a CSV
	// name before the owner confirms the link.
	const photosByName = useMemo(() => {
		const map: Record<string, string> = {};

		for (const row of knockoutRosterRows) {
			if (row.photoURL) {
				map[row.name] = row.photoURL;
			}
		}

		return map;
	}, [knockoutRosterRows]);

	const knockoutStandings = useMemo(
		() =>
			buildKnockoutStandings(
				knockoutRosterRows,
				knockoutPicksByUid,
				knockoutMatches
			),
		[knockoutRosterRows, knockoutPicksByUid, knockoutMatches]
	);

	// CSV players plus approved knockout newcomers, for the Participants menu and
	// their profile pages (the group-stage computations keep using `participants`).
	const menuParticipants = useMemo(
		() => mergeKnockoutParticipants(participants, knockoutRosterRows),
		[participants, knockoutRosterRows]
	);

	// Each participant's knockout picks (by display name), for their profile page.
	const knockoutPicksByName = useMemo(() => {
		const map: Record<
			string,
			Record<number, {p1: number; p2: number}>
		> = {};

		for (const row of knockoutRosterRows) {
			map[row.name] = knockoutPicksByUid[row.uid] ?? {};
		}

		return map;
	}, [knockoutRosterRows, knockoutPicksByUid]);

	const knockoutLeader = useMemo(
		() =>
			buildKnockoutLeaderStats(
				knockoutStandings,
				knockoutPicksByUid,
				knockoutMatches
			),
		[knockoutStandings, knockoutPicksByUid, knockoutMatches]
	);

	const knockoutChampion = useMemo(
		() =>
			buildKnockoutChampion(
				knockoutRosterRows,
				knockoutPicksByUid,
				knockoutMatches,
				knockoutStandings
			),
		[
			knockoutRosterRows,
			knockoutPicksByUid,
			knockoutMatches,
			knockoutStandings,
		]
	);

	const knockoutInfo = useMemo(
		() =>
			Object.fromEntries(
				knockoutMatches.map((match) => [
					match.matchNumber,
					{
						myPick: myKnockoutPicks[match.matchNumber]
							? {
									p1: myKnockoutPicks[match.matchNumber].p1,
									p2: myKnockoutPicks[match.matchNumber].p2,
								}
							: undefined,
						pickable: isKnockoutPickable(match, Date.now()),
					},
				])
			),
		[knockoutMatches, myKnockoutPicks]
	);

	const liveCards = cards.filter((card) => card.status === 'live');
	const liveCard = liveCards.length === 1 ? liveCards[0] : null;

	const evolution = useMemo(
		() => buildEvolution(participants, games),
		[participants, games]
	);

	const stats = useMemo(() => buildStats(cards), [cards]);

	const timeline = useMemo(
		() => buildPointsTimeline(participants, games),
		[participants, games]
	);

	const titleOdds = useMemo(
		() => simulateTitleOdds(participants, games),
		[participants, games]
	);

	const groupStageAwards = useMemo(
		() => buildGroupStageAwards(timeline, rows),
		[timeline, rows]
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
		<PhotosProvider photos={photosByName}>
		<div className="min-h-screen bg-slate-950 font-sans">
			<div className="bg-amber-400/10 px-4 py-2 text-center text-sm leading-relaxed text-amber-100">
				Sign in with Google to join the next phase. Once the matches
				start being decided, you'll be able to submit your picks for each
				knockout game right here.
			</div>

			<Header
				authName={auth.profile?.name ?? null}
				authPhotoURL={auth.profile?.photoURL ?? null}
				online={online}
				onMenuClick={() => setMenuOpen(true)}
				onProfile={() => navigate('/profile')}
				onSignIn={auth.signIn}
				onSignOut={auth.signOut}
				signedIn={!auth.isAnonymous && !!auth.user}
				statusText={statusText}
			/>

			{claimOpen && (
				<ClaimPrompt
					onClaim={(name) => {
						auth.setClaim(participantSlug(name));
						setClaimOpen(false);
					}}
					onClose={() => setClaimOpen(false)}
					participants={participants}
				/>
			)}

			{identityOpen && (
				<IdentityPrompt
					onChoose={(name) => {
						identity.choose(name);

						if (name) {
							acTrack('identified', {name});
						}

						setIdentityOpen(false);
					}}
					onClose={() => setIdentityOpen(false)}
					participants={participants}
				/>
			)}

			<NavBar
				isOwner={auth.isOwner}
				items={menuItems}
				participants={menuParticipants.map(
					(participant) => participant.name
				)}
			/>

			<NavDrawer
				isOwner={auth.isOwner}
				items={menuItems}
				onClose={() => setMenuOpen(false)}
				open={menuOpen}
				participants={menuParticipants.map(
					(participant) => participant.name
				)}
			/>

			<LiveGames
				cheers={cheerCounts}
				games={liveGames}
				onCheer={(matchNo, side) => {
					cheer(matchNo, side);

					const game = liveGames.find(
						(item) => item.matchNo === matchNo
					);

					acTrack('cheer_sent', {
						matchNo,
						team: side === 'team1' ? game?.team1 : game?.team2,
					});
				}}
				onResetCheers={auth.isOwner ? resetCheers : undefined}
			/>

			<ReactionBurst bursts={bursts} />

			<CheerBurstLayer bursts={cheerBursts} />

			{celebrating && <CelebrateOverlay name={celebrating} />}

			{showGoal && (
				<GoalOverlay
					key={goalKey}
					onDismiss={() => {
						trackEvent('goal_celebration_click');
						acTrack('goal_celebration_click');
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
								leader={leader}
								live={liveGames.length > 0}
								myReactions={mine}
								onClearReaction={auth.isOwner ? clearPlayerReaction : undefined}
								onClearRecap={auth.isOwner ? clearRecap : undefined}
								onHype={(rx, ry) => {
									hype(rx, ry);
									acTrack('leader_trophy', {leader: leaderName});
								}}
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
								titleOdds={titleOdds}
								titles={boardTitles}
								youName={myParticipantName}
							/>
						}
						path="/"
					/>

					<Route
						element={
							<MatchesView
								cards={cards}
								cheers={cheerCounts}
								commentary={commentary}
								games={games}
								knockoutCards={knockoutCards}
								knockoutPick={{
									info: knockoutInfo,
									onPick: setKnockoutPick,
									onSignIn: auth.signIn,
									signedIn: !auth.isAnonymous && !!auth.user,
								}}
								matchReactions={matchReactions}
								myName={presenceName}
								onClearCommentary={auth.isOwner ? clearMatchCommentary : undefined}
								onClearMatchReaction={auth.isOwner ? clearMatchReaction : undefined}
								onMatchReact={reactMatch}
								participants={participants}
							/>
						}
						path="/matches"
					/>

					<Route
						element={<GroupsView games={games} />}
						path="/groups"
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
								knockoutMatches={knockoutMatches}
								knockoutPicksByName={knockoutPicksByName}
								myReactions={mine}
								onReact={react}
								participants={menuParticipants}
								reactions={counts}
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
							<GroupStageView
								awards={groupStageAwards}
								evolution={evolution}
								leader={leader}
								onHype={hype}
								stats={stats}
								timeline={timeline}
							/>
						}
						path="/group-stage"
					/>

					<Route
						element={
							<KnockoutChampionView
								awards={knockoutChampion.awards}
								evolution={knockoutChampion.evolution}
								leader={knockoutLeader}
								onHype={hype}
								played={knockoutChampion.played}
								stats={knockoutChampion.stats}
								timeline={knockoutChampion.timeline}
							/>
						}
						path="/knockout-champion"
					/>

					<Route
						element={<Navigate replace to="/group-stage" />}
						path="/stats"
					/>

					<Route
						element={
							<ArenaView
								identity={identity.name}
								onRequestIdentify={() => setIdentityOpen(true)}
							/>
						}
						path="/arena"
					/>

					<Route element={<RulesView />} path="/rules" />

					<Route
						element={
							auth.loading ? null : auth.isOwner ? (
								<AdminView />
							) : (
								<Navigate replace to="/" />
							)
						}
						path="/admin"
					/>

					<Route
						element={
							<KnockoutView
								leader={knockoutLeader}
								myReactions={mine}
								onClearReaction={
									auth.isOwner ? clearPlayerReaction : undefined
								}
								onHype={hype}
								onReact={react}
								onSelect={(name) =>
									navigate(`/bets/${name.toLowerCase()}`)
								}
								reactions={counts}
								rows={knockoutStandings}
								youName={presenceName}
							/>
						}
						path="/knockout"
					/>

					<Route
						element={
							<ProfileView
								approved={knockoutApproved}
								isAnonymous={auth.isAnonymous}
								name={auth.profile?.name ?? null}
								nickname={auth.profile?.nickname ?? null}
								onRequestKnockout={auth.requestKnockout}
								onSetNickname={auth.setNickname}
								onSignIn={auth.signIn}
								pending={knockoutPending}
								photoURL={auth.profile?.photoURL ?? null}
							/>
						}
						path="/profile"
					/>

					<Route element={<Navigate replace to="/" />} path="*" />
				</Routes>
			</main>

			{!chatOpen && !chatLocked && (
				<ChatButton
					onClick={() => {
						setChatOpen(true);
						markChatRead();
						acTrack('chat_opened');
					}}
					unread={chatUnread}
				/>
			)}

			{chatOpen && !chatLocked && (
				<>
					<div
						className="fixed inset-0 z-40 bg-black/50"
						onClick={() => setChatOpen(false)}
					/>

					<ChatPanel
						games={games}
						identity={identity.name}
						liveCard={liveCard}
						onCelebrate={(name) => {
							celebrate(name);
							acTrack('celebrate_sent', {name});
						}}
						onClose={() => setChatOpen(false)}
						onRequestIdentify={() => {
							setChatOpen(false);
							setIdentityOpen(true);
						}}
						participants={participants}
					/>
				</>
			)}
		</div>
		</PhotosProvider>
	);
}
