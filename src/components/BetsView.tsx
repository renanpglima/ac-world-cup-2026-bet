import {useParams} from 'react-router-dom';

import type {Game, Participant} from '../lib/types';
import type {KnockoutMatch} from '../lib/useKnockout';
import {ParticipantView} from './ParticipantView';

// The /bets/:id route: resolves the participant from the URL (id = lowercased
// name; unknown falls back to the first). Switching participants is done from
// the menu's Participants dropdown.
export function BetsView({
	games,
	knockoutMatches,
	knockoutPicksByName,
	myReactions,
	onReact,
	participants,
	reactions,
}: {
	games: Game[];
	knockoutMatches: KnockoutMatch[];
	knockoutPicksByName: Record<
		string,
		Record<number, {p1: number; p2: number}>
	>;
	myReactions: Record<string, string[]>;
	onReact: (name: string, emoji: string) => void;
	participants: Participant[];
	reactions: Record<string, Record<string, number>>;
}) {
	const {id} = useParams();

	const active =
		participants.find(
			(participant) => participant.name.toLowerCase() === id
		) ?? participants[0];

	return (
		<ParticipantView
			games={games}
			knockoutMatches={knockoutMatches}
			knockoutPicks={knockoutPicksByName[active.name] ?? {}}
			myReactions={myReactions[active.name] ?? []}
			onReact={(emoji) => onReact(active.name, emoji)}
			participant={active}
			participants={participants}
			reactions={reactions[active.name] ?? {}}
		/>
	);
}
