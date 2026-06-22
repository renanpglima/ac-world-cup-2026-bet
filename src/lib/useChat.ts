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

// chatRoom/<pushId> = {name, text, at} — one global room for everyone.
export function useChat(limit = 50): {
	messages: ChatMessage[];
	send: (name: string, text: string) => void;
} {
	const [messages, setMessages] = useState<ChatMessage[]>([]);

	useEffect(
		() =>
			onValue(
				query(ref(db, dataPath('chatRoom')), limitToLast(limit)),
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
			),
		[limit]
	);

	const send = (name: string, text: string) => {
		if (!text.trim()) {
			return;
		}

		void signedIn.then(() => {
			push(ref(db, dataPath('chatRoom')), {
				at: serverTimestamp(),
				name,
				text: text.trim(),
			});
		});
	};

	return {messages, send};
}
