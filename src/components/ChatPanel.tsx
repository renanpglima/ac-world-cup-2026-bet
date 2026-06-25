import {useEffect, useLayoutEffect, useRef, useState} from 'react';

import {acTrack} from '../lib/analyticsCloud';
import {parseChatInput, runChatCommand} from '../lib/chatCommands';
import type {MatchCard} from '../lib/matches';
import type {Game, Participant} from '../lib/types';
import {useChat} from '../lib/useChat';
import {useChatReactions} from '../lib/useReactions';
import {Avatar} from './Avatar';
import {Reactions} from './Reactions';

function formatMessageTime(at: number, now: number): string {
	if (!at) return '';

	const msgDate = new Date(at);
	const nowDate = new Date(now);
	const isToday =
		msgDate.getFullYear() === nowDate.getFullYear() &&
		msgDate.getMonth() === nowDate.getMonth() &&
		msgDate.getDate() === nowDate.getDate();

	const time = msgDate.toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});

	if (isToday) return time;

	const date = msgDate.toLocaleDateString([], {
		day: '2-digit',
		month: 'short',
	});

	return `${date} ${time}`;
}

interface Props {
	games: Game[];
	identity: string | null;
	liveCard: MatchCard | null;
	onCelebrate: (name: string) => void;
	onClose: () => void;
	onRequestIdentify: () => void;
	participants: Participant[];
}

export function ChatPanel({
	games,
	identity,
	liveCard,
	onCelebrate,
	onClose,
	onRequestIdentify,
	participants,
}: Props) {
	const {hasMore, loadOlder, messages, send} = useChat();
	const chatReactions = useChatReactions();
	const [draft, setDraft] = useState('');
	const [ephemeral, setEphemeral] = useState<{id: number; text: string}[]>(
		[]
	);
	const ephemeralId = useRef(0);
	const listRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	// Scroll height captured right before loading older messages, so we can keep
	// the viewport steady once they prepend (null = not loading older).
	const olderLoad = useRef<number | null>(null);

	useLayoutEffect(() => {
		const list = listRef.current;

		if (!list) {
			return;
		}

		// Just loaded older messages → keep the same messages in view instead of
		// jumping to the bottom.
		if (olderLoad.current !== null) {
			list.scrollTop += list.scrollHeight - olderLoad.current;
			olderLoad.current = null;

			return;
		}

		// New message / first load → stick to the bottom. Scroll only the list
		// (not scrollIntoView, which bubbles up and scrolls the whole window on
		// mobile, pushing the fixed header out of reach).
		list.scrollTo({behavior: 'smooth', top: list.scrollHeight});
	}, [messages.length]);

	const handleLoadOlder = () => {
		olderLoad.current = listRef.current?.scrollHeight ?? 0;
		loadOlder();
	};

	useEffect(() => {
		// Only auto-focus on larger screens. On mobile it pops the soft keyboard
		// the moment the panel opens, which resizes the viewport and adds a
		// scrollbar.
		if (window.matchMedia('(min-width: 640px)').matches) {
			inputRef.current?.focus();
		}
	}, []);

	const submit = () => {
		if (!identity || !draft.trim()) {
			return;
		}

		const result = runChatCommand(draft, {
			card: liveCard,
			games,
			matchNo: liveCard?.matchNo ?? 0,
			name: identity,
			participants,
		});

		if (result.broadcast) {
			send(identity, result.broadcast);
		}

		if (result.ephemeral) {
			setEphemeral((current) => [
				...current,
				{id: (ephemeralId.current += 1), text: result.ephemeral as string},
			]);
		}

		if (result.celebrate) {
			onCelebrate(result.celebrate);
		}

		const parsed = parseChatInput(draft);

		if (parsed.kind === 'message') {
			acTrack('chat_message_sent', {length: parsed.arg.length});
		}
		else {
			acTrack('chat_command_used', {command: parsed.kind});
		}

		setDraft('');
	};

	return (
		<div className="fixed inset-y-0 left-14 right-0 z-50 flex flex-col overflow-hidden border-l border-white/10 bg-slate-900 shadow-2xl sm:left-auto sm:w-80 md:w-96">
			<div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
				<div className="min-w-0">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
						Chat
					</p>

					<p className="truncate text-sm font-medium text-white">
						Everyone online
					</p>
				</div>

				<button
					aria-label="Close chat"
					className="ml-3 shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
					onClick={onClose}
				>
					✕
				</button>
			</div>

			<div
				className="flex-1 space-y-3 overflow-y-auto overflow-x-hidden p-4"
				ref={listRef}
			>
				{hasMore && (
					<div className="flex justify-center pb-1">
						<button
							className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
							onClick={handleLoadOlder}
						>
							Load older messages
						</button>
					</div>
				)}

				{messages.length === 0 ? (
					<p className="pt-8 text-center text-sm text-slate-500">
						No messages yet — be the first!
					</p>
				) : (
					messages.map((msg) => {
						const isMe = msg.name === identity;
						const timeLabel = formatMessageTime(msg.at, Date.now());

						return (
							<div
								className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
								key={msg.id}
							>
								<Avatar
									className="mt-0.5 h-6 w-6 shrink-0 rounded-full text-[9px]"
									name={msg.name}
								/>

								<div
									className={`flex min-w-0 max-w-[75%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
								>
									{!isMe && (
										<span className="text-[10px] font-medium text-sky-300">
											{msg.name}
										</span>
									)}

									<div
										className={`break-words rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${
											isMe
												? 'rounded-tr-sm bg-emerald-500/25 text-white'
												: 'rounded-tl-sm bg-white/10 text-slate-200'
										}`}
									>
										{msg.text}
									</div>

									{timeLabel && (
										<span className="text-[10px] text-slate-500">
											{timeLabel}
										</span>
									)}

									<Reactions
										counts={chatReactions.counts[msg.id] ?? {}}
										mine={chatReactions.mine[msg.id] ?? []}
										onReact={(emoji) => {
											const action = chatReactions.mine[
												msg.id
											]?.includes(emoji)
												? 'remove'
												: 'add';

											chatReactions.toggle(msg.id, emoji);
											acTrack('chat_reaction', {
												action,
												emoji,
											});
										}}
									/>
								</div>
							</div>
						);
					})
				)}

				{ephemeral.map((line) => (
					<div className="flex justify-center" key={line.id}>
						<div className="max-w-[85%] rounded-xl bg-white/5 px-3 py-1.5 text-xs text-slate-400">
							<span className="mr-1" aria-hidden>
								🤖
							</span>

							<span className="whitespace-pre-line">{line.text}</span>

							<span className="ml-1 text-[9px] uppercase tracking-wide text-slate-600">
								only you
							</span>
						</div>
					</div>
				))}
			</div>

			{identity ? (
				<div className="flex shrink-0 gap-2 border-t border-white/10 p-3">
					<input
						autoComplete="off"
						autoCorrect="off"
						className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-base text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-400 sm:text-sm"
						maxLength={200}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								submit();
							}
						}}
						placeholder="Message or /help"
						ref={inputRef}
						spellCheck={false}
						value={draft}
					/>

					<button
						className="shrink-0 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400 disabled:opacity-40"
						disabled={!draft.trim()}
						onClick={submit}
					>
						Send
					</button>
				</div>
			) : (
				<div className="shrink-0 border-t border-white/10 px-4 py-5 text-center">
					<p className="mb-3 text-xs text-slate-400">
						Identify yourself to join the chat
					</p>

					<button
						className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
						onClick={onRequestIdentify}
					>
						👋 Who are you?
					</button>
				</div>
			)}
		</div>
	);
}
