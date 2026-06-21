import {onAuthStateChanged} from 'firebase/auth';
import {
	onDisconnect,
	onValue,
	ref,
	remove,
	serverTimestamp,
	set,
} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {auth, db, signedIn} from './firebase';

export interface OnlineUser {
	name: string | null;
	photoURL: string | null;
	uid: string;
}

// Realtime presence. Each session announces itself at `presence/<uid>` and
// registers an onDisconnect cleanup so the list self-heals when tabs close.
// The write is driven by `.info/connected`, so presence is re-announced every
// time the socket reconnects (e.g. after the tab is backgrounded) — otherwise
// the disconnect cleanup would drop the entry and it would never come back.
export function usePresence(name: string | null, photoURL: string | null): OnlineUser[] {
	const [uid, setUid] = useState<string | null>(null);
	const [online, setOnline] = useState<OnlineUser[]>([]);

	useEffect(() => {
		signedIn.catch(() => undefined);

		return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
	}, []);

	useEffect(
		() =>
			onValue(ref(db, dataPath('presence')), (snapshot) => {
				const value =
					(snapshot.val() as Record<
						string,
						{name?: string | null; photoURL?: string | null}
					>) ?? {};

				setOnline(
					Object.entries(value).map(([id, entry]) => ({
						name: entry?.name ?? null,
						photoURL: entry?.photoURL ?? null,
						uid: id,
					}))
				);
			}),
		[]
	);

	useEffect(() => {
		if (!uid) {
			return;
		}

		const node = ref(db, `${dataPath('presence')}/${uid}`);

		// `.info/connected` lives at the root, not under the demo subtree.
		const unsubscribe = onValue(ref(db, '.info/connected'), (snapshot) => {
			if (snapshot.val() !== true) {
				return;
			}

			// Re-arm the disconnect cleanup, then (re)announce presence.
			onDisconnect(node)
				.remove()
				.then(() =>
					set(node, {
						at: serverTimestamp(),
						name: name ?? null,
						photoURL: photoURL ?? null,
					})
				)
				.catch(() => undefined);
		});

		return () => {
			unsubscribe();
			remove(node);
		};
	}, [uid, name, photoURL]);

	return online;
}
