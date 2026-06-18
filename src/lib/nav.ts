export interface NavItem {
	badge?: string;
	end?: boolean;
	icon: string;
	label: string;
	to: string;
}

// Single source for the menu — used by the sidebar drawer and the page title.
export const NAV_ITEMS: NavItem[] = [
	{end: true, icon: '🏆', label: 'Leaderboard', to: '/'},
	{icon: '⚽', label: 'Matches', to: '/matches'},
	{icon: '🎯', label: 'Bets', to: '/bets'},
	{icon: '⚔️', label: 'Head to Head', to: '/h2h'},
	{icon: '📊', label: 'Stats', to: '/stats'},
	{icon: '📜', label: 'Rules', to: '/rules'},
];

// The item matching the current route — exact for "/", prefix for the rest, so
// /bets/adriano still resolves to "Bets".
export function currentNavItem(pathname: string): NavItem {
	return (
		NAV_ITEMS.find((item) =>
			item.end ? pathname === item.to : pathname.startsWith(item.to)
		) ?? NAV_ITEMS[0]
	);
}
