import {useEffect, useState} from 'react';
import {NavLink, useLocation} from 'react-router-dom';

import {NAV_ITEMS} from '../lib/nav';

// Right-side slide-in menu. Lists every nav item (current one highlighted);
// "Bets" expands into the participant list. Picking an item navigates and
// closes the drawer.
export function NavDrawer({
	isOwner,
	onClose,
	open,
	participants,
}: {
	isOwner: boolean;
	onClose: () => void;
	open: boolean;
	participants: string[];
}) {
	const location = useLocation();
	const onBets = location.pathname.startsWith('/bets');
	const [betsOpen, setBetsOpen] = useState(onBets);

	useEffect(() => {
		if (!open) {
			return undefined;
		}

		// Reveal the participant list when the menu opens on a bets route.
		if (onBets) {
			setBetsOpen(true);
		}

		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', onKey);

		return () => document.removeEventListener('keydown', onKey);
	}, [open, onBets, onClose]);

	const itemClass = (isActive: boolean) =>
		`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
			isActive
				? 'bg-emerald-500 text-emerald-950'
				: 'text-slate-300 hover:bg-white/10'
		}`;

	return (
		<>
			<div
				className={`fixed inset-0 z-40 bg-black/60 transition-opacity ${
					open ? 'opacity-100' : 'pointer-events-none opacity-0'
				}`}
				onClick={onClose}
			/>

			<aside
				aria-hidden={!open}
				className={`fixed right-0 top-0 z-50 flex h-full w-72 max-w-[80vw] flex-col gap-1 overflow-y-auto border-l border-white/10 bg-slate-900 p-4 shadow-2xl transition-transform ${
					open ? 'translate-x-0' : 'translate-x-full'
				}`}
			>
				<div className="mb-3 flex items-center justify-between">
					<span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
						Menu
					</span>

					<button
						aria-label="Close menu"
						className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
						onClick={onClose}
					>
						✕
					</button>
				</div>

				{NAV_ITEMS.filter((item) => !item.desktopOnly).map((item) =>
					item.to === '/bets' ? (
						<div key={item.to}>
							<button
								aria-expanded={betsOpen}
								className={`w-full ${itemClass(onBets)}`}
								onClick={() => setBetsOpen((value) => !value)}
							>
								{item.label}

								<span
									aria-hidden
									className={`ml-auto text-xs transition-transform ${
										betsOpen ? 'rotate-90' : ''
									}`}
								>
									▸
								</span>
							</button>

							{betsOpen && (
								<div className="mt-1 flex flex-col gap-1">
									{participants.map((name) => (
										<NavLink
											className={({isActive}) =>
												// Same size as the top-level items; only the
												// color sets the participants apart.
												`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
													isActive
														? 'bg-emerald-500/20 text-emerald-300'
														: 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
												}`
											}
											key={name}
											onClick={onClose}
											to={`/bets/${name.toLowerCase()}`}
										>
											{name}
										</NavLink>
									))}
								</div>
							)}
						</div>
					) : (
						<NavLink
							className={({isActive}) => itemClass(isActive)}
							end={item.end}
							key={item.to}
							onClick={onClose}
							to={item.to}
						>
							{item.label}

							{item.badge && (
								<span className="ml-auto rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950">
									{item.badge}
								</span>
							)}
						</NavLink>
					)
				)}

				{isOwner && (
					<NavLink
						className={({isActive}) => itemClass(isActive)}
						onClick={onClose}
						to="/admin"
					>
						Admin
					</NavLink>
				)}
			</aside>
		</>
	);
}
