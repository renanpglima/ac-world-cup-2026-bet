export interface NavItem {
	badge?: string;
	desktopOnly?: boolean;
	end?: boolean;
	hiddenByDefault?: boolean;
	icon: string;
	id: string;
	label: string;
	to: string;
}

// Single source for the menu — used by the top nav, the sidebar drawer, and the
// page title. `id` is the stable key the owner's menu manager orders/hides by.
export const NAV_ITEMS: NavItem[] = [
	{end: true, icon: '🏆', id: 'leaderboard', label: 'Leaderboard', to: '/'},
	{
		badge: 'new',
		icon: '🥇',
		id: 'knockout',
		label: 'Knockout Stage',
		to: '/knockout',
	},
	{icon: '⚽', id: 'matches', label: 'Matches', to: '/matches'},
	{icon: '🗂️', id: 'groups', label: 'Groups', to: '/groups'},
	{icon: '🎯', id: 'bets', label: 'Participants', to: '/bets'},
	{icon: '⚔️', id: 'h2h', label: 'Head to Head', to: '/h2h'},
	{
		hiddenByDefault: true,
		icon: '🏅',
		id: 'groupstage',
		label: 'Group Stage',
		to: '/group-stage',
	},
	{desktopOnly: true, icon: '🎮', id: 'arena', label: 'Arena', to: '/arena'},
	{icon: '📜', id: 'rules', label: 'Rules', to: '/rules'},
];

// menu/{order,hidden} — written by the owner via the admin menu manager.
export interface MenuConfig {
	hidden?: Record<string, boolean>;
	order?: string[];
}

// All items in the owner's configured order: ids listed in `order` first (in
// that order), then any items not listed, in their original order. Unknown ids
// in `order` are ignored, so renaming/removing a NAV_ITEM never breaks.
export function orderMenu(items: NavItem[], config: MenuConfig): NavItem[] {
	const byId = new Map(items.map((item) => [item.id, item]));
	const seen = new Set<string>();
	const result: NavItem[] = [];

	for (const id of config.order ?? []) {
		const item = byId.get(id);

		if (item && !seen.has(id)) {
			result.push(item);
			seen.add(id);
		}
	}

	for (const item of items) {
		if (!seen.has(item.id)) {
			result.push(item);
			seen.add(item.id);
		}
	}

	return result;
}

// Whether an item is hidden from the nav: the owner's explicit choice wins;
// otherwise items flagged `hiddenByDefault` start hidden until the owner reveals
// them from the admin menu manager.
export function isMenuItemHidden(item: NavItem, config: MenuConfig): boolean {
	const explicit = config.hidden?.[item.id];

	return explicit === undefined ? Boolean(item.hiddenByDefault) : explicit;
}

// The visible menu, ordered — what the nav renders.
export function visibleMenu(items: NavItem[], config: MenuConfig): NavItem[] {
	return orderMenu(items, config).filter(
		(item) => !isMenuItemHidden(item, config)
	);
}

// The item matching the current route — exact for "/", prefix for the rest, so
// /bets/adriano still resolves to "Participants". Profile is reachable from the
// header avatar, not the menu, so it has no NAV_ITEM — give it a title here
// instead of falling back to "Leaderboard".
const OFF_MENU: NavItem[] = [
	{icon: '👤', id: 'profile', label: 'Profile', to: '/profile'},
];

export function currentNavItem(pathname: string): NavItem {
	return (
		[...NAV_ITEMS, ...OFF_MENU].find((item) =>
			item.end ? pathname === item.to : pathname.startsWith(item.to)
		) ?? NAV_ITEMS[0]
	);
}
