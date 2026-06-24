import {describe, expect, it} from 'vitest';

import {currentNavItem, type NavItem, orderMenu, visibleMenu} from './nav';

function item(id: string): NavItem {
	return {icon: '•', id, label: id, to: `/${id}`};
}

const ITEMS = [item('a'), item('b'), item('c')];

describe('orderMenu', () => {
	it('keeps the original order with an empty config', () => {
		expect(orderMenu(ITEMS, {}).map((i) => i.id)).toEqual(['a', 'b', 'c']);
	});

	it('orders listed ids first, then appends the rest in original order', () => {
		expect(orderMenu(ITEMS, {order: ['c', 'a']}).map((i) => i.id)).toEqual([
			'c',
			'a',
			'b',
		]);
	});

	it('ignores unknown and duplicate ids in the order', () => {
		expect(
			orderMenu(ITEMS, {order: ['z', 'b', 'b', 'a']}).map((i) => i.id)
		).toEqual(['b', 'a', 'c']);
	});
});

describe('visibleMenu', () => {
	it('drops hidden items but keeps the configured order', () => {
		expect(
			visibleMenu(ITEMS, {hidden: {b: true}, order: ['c', 'b', 'a']}).map(
				(i) => i.id
			)
		).toEqual(['c', 'a']);
	});

	it('hides hiddenByDefault items until the owner reveals them', () => {
		const items = [item('a'), {...item('b'), hiddenByDefault: true}];

		expect(visibleMenu(items, {}).map((i) => i.id)).toEqual(['a']);
		expect(
			visibleMenu(items, {hidden: {b: false}}).map((i) => i.id)
		).toEqual(['a', 'b']);
	});
});

describe('currentNavItem', () => {
	it('resolves the leaderboard only on an exact "/"', () => {
		expect(currentNavItem('/').id).toBe('leaderboard');
	});

	it('resolves a deep participant path to Participants', () => {
		expect(currentNavItem('/bets/adriano').id).toBe('bets');
	});

	it('prefers the most specific match for overlapping prefixes', () => {
		expect(currentNavItem('/knockout').id).toBe('knockout');
		expect(currentNavItem('/knockout-champion').id).toBe(
			'knockoutchampion'
		);
	});
});
