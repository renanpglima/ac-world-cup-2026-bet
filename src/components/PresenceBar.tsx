import type {OnlineUser} from '../lib/usePresence';
import {Avatar} from './Avatar';

const MAX_AVATARS = 5;

// The "who's online" cluster: real Google photos (falling back to a name-based
// avatar) for identified viewers, a "+N" for anonymous guests/overflow, and a
// pulsing live count.
export function PresenceBar({online}: {online: OnlineUser[]}) {
	const identified = online.filter((user) => user.name);
	const guests = online.length - identified.length;
	const total = online.length;

	if (total === 0) {
		return null;
	}

	const shown = identified.slice(0, MAX_AVATARS);
	const overflow = identified.length - shown.length + guests;

	return (
		<div className="flex items-center gap-2">
			<div className="flex -space-x-2">
				{shown.map((user) => (
					<span key={user.uid} title={user.name ?? undefined}>
						{user.photoURL ? (
							<img
								alt=""
								className="h-7 w-7 rounded-full object-cover ring-2 ring-emerald-500/70"
								referrerPolicy="no-referrer"
								src={user.photoURL}
							/>
						) : (
							<Avatar
								className="h-7 w-7 rounded-full ring-2 ring-emerald-500/70"
								name={user.name as string}
							/>
						)}
					</span>
				))}

				{overflow > 0 && (
					<span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-slate-200 ring-2 ring-slate-900">
						+{overflow}
					</span>
				)}
			</div>

			<span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-slate-300">
				<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
				{total} online
			</span>
		</div>
	);
}
