import {NavLink} from 'react-router-dom';

import {NAV_ITEMS} from '../lib/nav';

const itemClass = ({isActive}: {isActive: boolean}) =>
	`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
		isActive
			? 'border-emerald-400 text-white'
			: 'border-transparent text-slate-400 hover:text-slate-200'
	}`;

// Horizontal top nav for web (hidden on mobile, where the header's hamburger
// opens the drawer instead). Hovering "Bets" reveals the participant list.
export function NavBar({
	isOwner,
	participants,
}: {
	isOwner: boolean;
	participants: string[];
}) {
	return (
		<nav className="hidden border-b border-white/10 bg-slate-950 sm:block">
			<div className="mx-auto flex max-w-5xl items-center gap-1 px-4">
				{NAV_ITEMS.map((item) =>
					item.to === '/bets' ? (
						<div className="group relative" key={item.to}>
							<NavLink className={itemClass} to={item.to}>
								{item.label}

								<span aria-hidden className="text-[10px]">
									▾
								</span>
							</NavLink>

							<div className="invisible absolute left-0 top-full z-50 flex max-h-[70vh] w-48 flex-col gap-0.5 overflow-y-auto rounded-b-xl border border-white/10 bg-slate-900 p-1.5 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
								{participants.map((name) => (
									<NavLink
										className={({isActive}) =>
											`rounded-lg px-3 py-2 text-sm transition-colors ${
												isActive
													? 'bg-emerald-500/20 font-semibold text-emerald-300'
													: 'text-slate-300 hover:bg-white/10'
											}`
										}
										key={name}
										to={`/bets/${name.toLowerCase()}`}
									>
										{name}
									</NavLink>
								))}
							</div>
						</div>
					) : (
						<NavLink
							className={itemClass}
							end={item.end}
							key={item.to}
							to={item.to}
						>
							{item.label}
						</NavLink>
					)
				)}

				{isOwner && (
					<NavLink
						className={({isActive}) =>
							isActive
								? 'border-b-2 border-emerald-400 pb-1 text-white'
								: 'pb-1 text-slate-400 transition hover:text-white'
						}
						to="/admin"
					>
						Admin
					</NavLink>
				)}
			</div>
		</nav>
	);
}
