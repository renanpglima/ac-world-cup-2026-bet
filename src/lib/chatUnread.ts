import type {ChatMessage} from './useChat';

// Messages newer than the last read, excluding the viewer's own.
export function countUnread(
	messages: ChatMessage[],
	lastReadAt: number,
	myName: string | null
): number {
	return messages.filter(
		(message) => message.at > lastReadAt && message.name !== myName
	).length;
}

export function latestAt(messages: ChatMessage[]): number {
	return messages.reduce((max, message) => Math.max(max, message.at), 0);
}
