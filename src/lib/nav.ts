export interface NavItem {
	badge?: string;
	desktopOnly?: boolean;
	end?: boolean;
	icon: string;
	label: string;
	to: string;
}

// Single source for the menu — used by the sidebar drawer and the page title.
export const NAV_ITEMS: NavItem[] = [
	{end: true, icon: '🏆', label: 'Leaderboard', to: '/'},
	{icon: '🥇', label: 'Knockout Stage', to: '/knockout'},
	{icon: '⚽', label: 'Matches', to: '/matches'},
	{icon: '🗂️', label: 'Groups', to: '/groups'},
	{icon: '🎯', label: 'Participants', to: '/bets'},
	{icon: '⚔️', label: 'Head to Head', to: '/h2h'},
	{icon: '📊', label: 'Stats', to: '/stats'},
	{desktopOnly: true, icon: '🎮', label: 'Arena', to: '/arena'},
	{icon: '📜', label: 'Rules', to: '/rules'},
];

// The item matching the current route — exact for "/", prefix for the rest, so
// /bets/adriano still resolves to "Bets".
// Profile is reachable from the header avatar, not the menu, so it has no
// NAV_ITEM — give it a title here instead of falling back to "Leaderboard".
const OFF_MENU: NavItem[] = [{icon: '👤', label: 'Profile', to: '/profile'}];

export function currentNavItem(pathname: string): NavItem {
	return (
		[...NAV_ITEMS, ...OFF_MENU].find((item) =>
			item.end ? pathname === item.to : pathname.startsWith(item.to)
		) ?? NAV_ITEMS[0]
	);
}
