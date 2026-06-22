import {useEffect, useRef, useState} from 'react';

import {runChatCommand} from '../lib/chatCommands';
import type {MatchCard} from '../lib/matches';
import type {Game, Participant} from '../lib/types';
import {useChat} from '../lib/useChat';
import {Avatar} from './Avatar';

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
	const {messages, send} = useChat();
	const [draft, setDraft] = useState('');
	const [ephemeral, setEphemeral] = useState<{id: number; text: string}[]>(
		[]
	);
	const ephemeralId = useRef(0);
	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({behavior: 'smooth'});
	}, [messages.length]);

	useEffect(() => {
		inputRef.current?.focus();
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

		setDraft('');
	};

	return (
		<div className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-white/10 bg-slate-900 shadow-2xl md:w-96">
			<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
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

			<div className="flex-1 space-y-3 overflow-y-auto p-4">
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
								className={`flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
								key={msg.id}
							>
								<Avatar
									className="mt-0.5 h-6 w-6 shrink-0 rounded-full text-[9px]"
									name={msg.name}
								/>

								<div
									className={`flex max-w-[75%] flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}
								>
									{!isMe && (
										<span className="text-[10px] font-medium text-sky-300">
											{msg.name}
										</span>
									)}

									<div
										className={`rounded-2xl px-3 py-1.5 text-sm leading-relaxed ${
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

				<div ref={bottomRef} />
			</div>

			{identity ? (
				<div className="flex gap-2 border-t border-white/10 p-3">
					<input
						className="min-w-0 flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-400"
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
				<div className="border-t border-white/10 px-4 py-5 text-center">
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
