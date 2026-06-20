import {describe, expect, it} from 'vitest';

import {poolBarColors} from './teamColors';

describe('poolBarColors', () => {
	it('keeps both primaries when they already differ', () => {
		const {color1, color2} = poolBarColors('Mexico', 'Korea Republic');

		expect(color1).toBe('#006847');
		expect(color2).toBe('#003478');
	});

	it('switches the away team to its secondary on a clash', () => {
		// Switzerland and Canada share the same red primary.
		const {color1, color2} = poolBarColors('Switzerland', 'Canada');

		expect(color1).toBe('#D52B1E');
		expect(color2).not.toBe(color1);
		expect(color2).toBe('#FFFFFF');
	});

	it('always returns distinct colors for same-hue teams', () => {
		const {color1, color2} = poolBarColors('Mexico', 'IR Iran');

		expect(color1).not.toBe(color2);
	});

	it('falls back gracefully for unknown teams', () => {
		const {color1, color2} = poolBarColors('Atlantis', 'Mexico');

		expect(color1).toBe('#94A3B8');
		expect(color2).toBe('#006847');
	});
});
