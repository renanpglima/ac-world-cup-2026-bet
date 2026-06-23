import {limitToLast, onValue, query, ref} from 'firebase/database';
import {useEffect, useState} from 'react';

import {countUnread, latestAt} from './chatUnread';
import {dataPath} from './dataRoot';
import {db} from './firebase';
import type {ChatMessage} from './useChat';

const STORAGE_KEY = 'wc2026.chatLastReadAt';

// Unread chat count for the floating button. `lastReadAt` lives in localStorage
// (per device); on the first ever load it seeds to the newest message so the
// existing history is not counted. The viewer's own messages never count.
export function useChatUnread(myName: string | null): {
	markRead: () => void;
	unread: number;
} {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [lastReadAt, setLastReadAt] = useState<number>(() => {
		const stored = localStorage.getItem(STORAGE_KEY);

		return stored ? Number(stored) : -1;
	});

	useEffect(
		() =>
			onValue(
				query(ref(db, dataPath('chatRoom')), limitToLast(50)),
				(snapshot) => {
					const raw = snapshot.val() as Record<
						string,
						{at: number; name: string; text: string}
					> | null;

					const list = raw
						? Object.entries(raw)
								.map(([id, data]) => ({
									at: data.at ?? 0,
									id,
									name: data.name,
									text: data.text,
								}))
								.sort((a, b) => a.at - b.at)
						: [];

					setMessages(list);

					setLastReadAt((previous) => {
						if (previous >= 0) {
							return previous;
						}

						const seed = latestAt(list);

						localStorage.setItem(STORAGE_KEY, String(seed));

						return seed;
					});
				}
			),
		[]
	);

	const markRead = () => {
		const seed = latestAt(messages) || Date.now();

		localStorage.setItem(STORAGE_KEY, String(seed));
		setLastReadAt(seed);
	};

	return {
		markRead,
		unread: lastReadAt < 0 ? 0 : countUnread(messages, lastReadAt, myName),
	};
}
