import {limitToLast, onValue, push, query, ref, serverTimestamp} from 'firebase/database';
import {useEffect, useState} from 'react';

import {dataPath} from './dataRoot';
import {db, signedIn} from './firebase';

export interface ChatMessage {
	at: number;
	id: string;
	name: string;
	text: string;
}

// chat/<matchNo>/<pushId> = {name, text, at}
// Subscribes to the last `limit` messages in real-time.
export function useMatchChat(
	matchNo: number | null,
	limit = 50
): {
	messages: ChatMessage[];
	send: (name: string, text: string) => void;
} {
	const [messages, setMessages] = useState<ChatMessage[]>([]);

	useEffect(() => {
		if (matchNo === null) {
			setMessages([]);
			return;
		}

		return onValue(
			query(ref(db, dataPath(`chat/${matchNo}`)), limitToLast(limit)),
			(snapshot) => {
				const raw = snapshot.val() as Record<
					string,
					{at: number; name: string; text: string}
				> | null;

				if (!raw) {
					setMessages([]);
					return;
				}

				setMessages(
					Object.entries(raw)
						.map(([id, data]) => ({
							at: data.at ?? 0,
							id,
							name: data.name,
							text: data.text,
						}))
						.sort((a, b) => a.at - b.at)
				);
			}
		);
	}, [matchNo, limit]);

	const send = (name: string, text: string) => {
		if (matchNo === null || !text.trim()) return;

		void signedIn.then(() => {
			push(ref(db, dataPath(`chat/${matchNo}`)), {
				at: serverTimestamp(),
				name,
				text: text.trim(),
			});
		});
	};

	return {messages, send};
}
