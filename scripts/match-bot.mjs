import {ServerValue} from 'firebase-admin/database';

import {teamFlagEmoji} from './flag-emoji.mjs';

export const BOT_NAME = '⚽ Match Bot';

// Mirror src/lib/games.ts getMatchStatus, on the normalized poller shape.
function statusOf(game) {
	if (game.finished || game.timeElapsed === 'finished') {
		return 'finished';
	}

	if (game.timeElapsed === 'notstarted') {
		return 'notstarted';
	}

	return 'live';
}

// Compare the prior RTDB games against the freshly fetched games and return the
// transitions worth announcing. No previous snapshot (first poll) → nothing, so
// history is never backfilled.
export function detectMatchEvents(previousGames, games) {
	if (!previousGames) {
		return [];
	}

	const prevById = new Map(previousGames.map((game) => [game.id, game]));
	const events = [];

	for (const game of games) {
		const prev = prevById.get(game.id);

		if (!prev) {
			continue;
		}

		const before = statusOf(prev);
		const after = statusOf(game);

		if (before === 'notstarted' && after === 'live') {
			events.push({game, type: 'kickoff'});
		}

		if (after === 'live') {
			if (game.homeScore > prev.homeScore) {
				events.push({game, side: 'home', type: 'goal'});
			}

			if (game.awayScore > prev.awayScore) {
				events.push({game, side: 'away', type: 'goal'});
			}
		}

		if (before !== 'finished' && after === 'finished') {
			events.push({game, type: 'final'});
		}
	}

	return events;
}

export function formatEvent(event) {
	const {game} = event;
	const home = `${teamFlagEmoji(game.homeTeam)} ${game.homeTeam}`;
	const away = `${game.awayTeam} ${teamFlagEmoji(game.awayTeam)}`;

	if (event.type === 'kickoff') {
		return `🟢 LIVE — ${home} 🆚 ${away}`;
	}

	if (event.type === 'final') {
		return `🏁 FT — ${home} ${game.homeScore} x ${game.awayScore} ${away}`;
	}

	const team = event.side === 'home' ? game.homeTeam : game.awayTeam;

	return `⚽ GOOOOAL! ${teamFlagEmoji(team)} ${team} — ${game.homeTeam} ${game.homeScore}-${game.awayScore} ${game.awayTeam}`;
}

// The JSON payload for a match channel hook, one per event. `message` is the
// readable line (same text as the chat bot); the rest is structured data. Each
// channel has its own hook (see MATCH_HOOKS in push-scores), so the channel is
// the URL, not a field here.
export function signalPayload(event) {
	const {game} = event;
	const common = {
		away: game.awayTeam,
		home: game.homeTeam,
		message: formatEvent(event),
	};

	if (event.type === 'kickoff') {
		return {...common, event: 'match_kickoff'};
	}

	if (event.type === 'final') {
		return {
			...common,
			awayScore: game.awayScore,
			event: 'match_final',
			homeScore: game.homeScore,
		};
	}

	return {
		...common,
		awayScore: game.awayScore,
		event: 'match_goal',
		homeScore: game.homeScore,
		scorer: event.side === 'home' ? game.homeTeam : game.awayTeam,
	};
}

// Post one chat message per goal, as the bot — kickoffs and full time go to the
// signal webhook instead, keeping the chat goals-only. Takes the already-detected
// events. Returns the number of goals posted.
export async function postMatchEvents(db, events) {
	const goals = events.filter((event) => event.type === 'goal');

	for (const event of goals) {
		await db.ref('chatRoom').push({
			at: ServerValue.TIMESTAMP,
			name: BOT_NAME,
			text: formatEvent(event),
		});
	}

	return goals.length;
}
