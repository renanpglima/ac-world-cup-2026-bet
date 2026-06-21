import type {OnlineUser} from '../lib/usePresence';
import {AuthButton} from './AuthButton';
import {PresenceBar} from './PresenceBar';

interface HeaderProps {
	authName: string | null;
	authPhotoURL: string | null;
	online: OnlineUser[];
	onMenuClick: () => void;
	onSignIn: () => void;
	onSignOut: () => void;
	signedIn: boolean;
	statusText: string;
}

export function Header({
	authName,
	authPhotoURL,
	online,
	onMenuClick,
	onSignIn,
	onSignOut,
	signedIn,
	statusText,
}: HeaderProps) {
	return (
		<header className="border-b border-white/10 bg-gradient-to-r from-emerald-950 via-slate-950 to-emerald-950 pt-[env(safe-area-inset-top)]">
			<div className="mx-auto max-w-5xl px-4 py-8">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-400">
							Analytics Cloud
						</p>

						<h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
							World Cup 2026{' '}
							<span className="text-amber-400">BET</span>
						</h1>

						<span className="mt-1 block text-xs text-slate-400">
							{statusText}
						</span>
					</div>

					<div className="flex shrink-0 items-center gap-3">
						{/* Desktop: auth + presence at the top-right. */}
						<div className="hidden items-center gap-3 sm:flex">
							<AuthButton
								name={authName}
								onSignIn={onSignIn}
								onSignOut={onSignOut}
								photoURL={authPhotoURL}
								signedIn={signedIn}
							/>

							<PresenceBar online={online} />
						</div>

						<button
							aria-label="Open menu"
							className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10 sm:hidden"
							onClick={onMenuClick}
						>
							<svg
								aria-hidden
								className="h-5 w-5"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								viewBox="0 0 24 24"
							>
								<line x1="3" x2="21" y1="6" y2="6" />

								<line x1="3" x2="21" y1="12" y2="12" />

								<line x1="3" x2="21" y1="18" y2="18" />
							</svg>
						</button>
					</div>
				</div>

				{/* Mobile: auth + presence on their own row at the bottom. */}
				<div className="mt-4 flex items-center justify-end gap-3 sm:hidden">
					<AuthButton
						name={authName}
						onSignIn={onSignIn}
						onSignOut={onSignOut}
						photoURL={authPhotoURL}
						signedIn={signedIn}
					/>

					<PresenceBar online={online} />
				</div>
			</div>
		</header>
	);
}
