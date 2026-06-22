import {useEffect, useRef, useState} from 'react';

import {useMatchChat} from '../lib/useMatchChat';
import {Avatar} from './Avatar';

interface Props {
	identity: string | null;
	matchLabel: string;
	matchNo: number;
	onClose: () => void;
	onRequestIdentify: () => void;
}

export function LiveChatPanel({
	identity,
	matchLabel,
	matchNo,
	onClose,
	onRequestIdentify,
}: Props) {
	const {messages, send} = useMatchChat(matchNo);
	const [draft, setDraft] = useState('');
	const bottomRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({behavior: 'smooth'});
	}, [messages.length]);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const submit = () => {
		if (!identity || !draft.trim()) return;
		send(identity, draft);
		setDraft('');
	};

	return (
		<div className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-white/10 bg-slate-900 shadow-2xl md:w-96">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
				<div className="min-w-0">
					<p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
						Live Chat
					</p>

					<p className="truncate text-sm font-medium text-white">
						{matchLabel}
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

			{/* Messages */}
			<div className="flex-1 space-y-3 overflow-y-auto p-4">
				{messages.length === 0 ? (
					<p className="pt-8 text-center text-sm text-slate-500">
						No messages yet — be the first!
					</p>
				) : (
					messages.map((msg) => {
						const isMe = msg.name === identity;

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
								</div>
							</div>
						);
					})
				)}

				<div ref={bottomRef} />
			</div>

			{/* Input or identity gate */}
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
						placeholder="Type a message…"
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
