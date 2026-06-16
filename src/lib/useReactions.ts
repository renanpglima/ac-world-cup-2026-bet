import {onAuthStateChanged} from 'firebase/auth';
import {onValue, ref, remove, set} from 'firebase/database';
import {useEffect, useState} from 'react';

import {auth, db, signedIn} from './firebase';

// reactions/<player>/<emoji>/<uid> = true
type ReactionTree = Record<string, Record<string, Record<string, boolean>>>;

export interface ReactionsApi {
	counts: Record<string, Record<string, number>>;
	mine: Record<string, string[]>;
	toggle: (player: string, emoji: string) => void;
}

// Realtime reactions backed by Firebase. Each anonymous session can toggle one
// reaction per emoji per player; counts aggregate across everyone live.
export function useReactions(): ReactionsApi {
	const [uid, setUid] = useState<string | null>(null);
	const [tree, setTree] = useState<ReactionTree>({});

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, 'reactions'), (snapshot) => {
				setTree((snapshot.val() as ReactionTree) ?? {});
			}),
		[]
	);

	const counts: Record<string, Record<string, number>> = {};
	const mine: Record<string, string[]> = {};

	for (const [player, emojis] of Object.entries(tree)) {
		for (const [emoji, uids] of Object.entries(emojis ?? {})) {
			const ids = Object.keys(uids ?? {});

			if (ids.length === 0) {
				continue;
			}

			(counts[player] ??= {})[emoji] = ids.length;

			if (uid && uids[uid]) {
				(mine[player] ??= []).push(emoji);
			}
		}
	}

	const toggle = (player: string, emoji: string) => {
		if (!uid) {
			return;
		}

		const node = ref(db, `reactions/${player}/${emoji}/${uid}`);

		if (mine[player]?.includes(emoji)) {
			remove(node);
		}
		else {
			set(node, true);
		}
	};

	return {counts, mine, toggle};
}
