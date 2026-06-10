import {useEffect, useMemo, useState} from 'react';

import {Header} from './components/Header';
import {Leaderboard} from './components/Leaderboard';
import {MatchesView} from './components/MatchesView';
import {ParticipantView} from './components/ParticipantView';
import {fetchGames, getMatchStatus} from './lib/games';
import {buildMatchCards} from './lib/matches';
import {loadParticipants} from './lib/predictions';
import {buildLeaderboard} from './lib/ranking';
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
			className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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

	const [fetchFailed, setFetchFailed] = useState(false);
	const [gamesFile, setGamesFile] = useState<GamesFile | null>(null);
	const [tab, setTab] = useState('leaderboard');

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
		() => buildLeaderboard(participants, games),
		[participants, games]
	);

	const cards = useMemo(
		() => buildMatchCards(participants, games),
		[participants, games]
	);

	const liveCount = games.filter(
		(game) => getMatchStatus(game) === 'live'
	).length;

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

	const selected = participants.find(
		(participant) => participant.name === tab
	);

	return (
		<div className="min-h-screen bg-slate-950 font-sans">
			<Header liveCount={liveCount} statusText={statusText} />

			<main className="mx-auto max-w-5xl px-4 py-6">
				<nav className="mb-6 flex gap-1 overflow-x-auto pb-1">
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

					{participants.map((participant) => (
						<TabButton
							active={tab === participant.name}
							key={participant.name}
							onClick={() => setTab(participant.name)}
						>
							{participant.name}
						</TabButton>
					))}
				</nav>

				{selected ? (
					<ParticipantView games={games} participant={selected} />
				) : tab === 'matches' ? (
					<MatchesView cards={cards} />
				) : (
					<Leaderboard onSelect={setTab} rows={rows} />
				)}
			</main>
		</div>
	);
}
