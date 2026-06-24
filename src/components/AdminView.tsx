// src/components/AdminView.tsx
import {pendingKnockout} from '../lib/knockoutStandings';
import {useProfiles} from '../lib/useProfiles';
import {Avatar} from './Avatar';

// Owner-only screen: a pending-claim queue, knockout sign-ups, and the full user
// list. Route access is guarded in App; writes are gated by the RTDB rules.
export function AdminView() {
	const {
		approvals,
		approve,
		approveKnockout,
		profiles,
		reject,
		rejectKnockout,
		rows,
		setBlocked,
		unlink,
	} = useProfiles();

	const pending = rows.filter((row) => row.pending);
	const knockoutSignups = pendingKnockout(profiles, approvals);

	return (
		<div className="space-y-6">
			<section>
				<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Pending claims ({pending.length})
				</h3>

				{pending.length === 0 ? (
					<p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
						No claims waiting.
					</p>
				) : (
					<ul className="space-y-2">
						{pending.map((row) => (
							<li
								className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
								key={row.uid}
							>
								<Avatar
									className="h-9 w-9 rounded-full"
									name={row.claim ?? row.name}
								/>

								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-white">
										{row.name}
									</p>

									<p className="truncate text-xs text-slate-400">
										{row.email} → claims{' '}
										<span className="font-semibold text-slate-200">
											{row.claim}
										</span>
									</p>
								</div>

								<button
									className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-emerald-950 transition hover:bg-emerald-400"
									onClick={() =>
										approve(row.uid, row.claim as string)
									}
								>
									Approve
								</button>

								<button
									className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
									onClick={() => reject(row.uid)}
								>
									Reject
								</button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Knockout sign-ups ({knockoutSignups.length})
				</h3>

				{knockoutSignups.length === 0 ? (
					<p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-400">
						No knockout requests.
					</p>
				) : (
					<ul className="space-y-2">
						{knockoutSignups.map((row) => (
							<li
								className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
								key={row.uid}
							>
								<Avatar
									className="h-9 w-9 rounded-full"
									name={row.name}
								/>

								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-white">
										{row.name}
									</p>

									<p className="truncate text-xs text-slate-400">
										{row.email}
									</p>
								</div>

								<button
									className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-emerald-950 transition hover:bg-emerald-400"
									onClick={() => approveKnockout(row.uid)}
								>
									Approve
								</button>

								<button
									className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
									onClick={() => rejectKnockout(row.uid)}
								>
									Reject
								</button>
							</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
					Users ({rows.length})
				</h3>

				<ul className="space-y-2">
					{rows.map((row) => (
						<li
							className={`flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 ${
								row.blocked ? 'opacity-50' : ''
							}`}
							key={row.uid}
						>
							<Avatar
								className="h-9 w-9 rounded-full"
								name={row.participant ?? row.name}
							/>

							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-white">
									{row.name}
								</p>

								<p className="truncate text-xs text-slate-400">
									{row.participant
										? `linked: ${row.participant}`
										: 'spectator'}
								</p>
							</div>

							{row.participant && (
								<button
									className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
									onClick={() => unlink(row.uid)}
								>
									Unlink
								</button>
							)}

							<button
								className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-300 transition hover:bg-white/20"
								onClick={() => setBlocked(row.uid, !row.blocked)}
							>
								{row.blocked ? 'Unblock' : 'Block'}
							</button>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
