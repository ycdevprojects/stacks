import { describe, it, expect } from 'vitest';
import {
	today,
	addDays,
	daysAgo,
	dateOf,
	greeting,
	plural,
	theme,
	STACK_COLORS,
	STACK_ICONS,
	randomColor,
	randomIcon,
	generateId
} from '$lib/utils/helpers';

describe('dates', () => {
	it('today() is the local date as YYYY-MM-DD', () => {
		const d = new Date();
		const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
		expect(today()).toBe(expected);
	});

	it('addDays shifts across month and year boundaries', () => {
		expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
		expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
		expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
		expect(addDays('2026-06-15', 0)).toBe('2026-06-15');
	});

	it('addDays is stable across daylight-saving changes', () => {
		// US DST starts 2026-03-08 and ends 2026-11-01
		expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
		expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
		expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
	});

	it('daysAgo counts back from today', () => {
		expect(daysAgo(0)).toBe(today());
		expect(daysAgo(1)).toBe(addDays(today(), -1));
		expect(daysAgo(30)).toBe(addDays(today(), -30));
	});

	it('dateOf parses at local noon', () => {
		const d = dateOf('2026-07-04');
		expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 6, 4, 12]);
	});
});

describe('greeting', () => {
	it('follows the time of day', () => {
		expect(greeting(2)).toBe('Up late');
		expect(greeting(8)).toBe('Good morning');
		expect(greeting(13)).toBe('Good afternoon');
		expect(greeting(20)).toBe('Good evening');
	});
});

describe('plural', () => {
	it('pluralizes everything except one', () => {
		expect(plural(0, 'habit')).toBe('0 habits');
		expect(plural(1, 'habit')).toBe('1 habit');
		expect(plural(3, 'habit')).toBe('3 habits');
	});
});

describe('stack colors and icons', () => {
	it('has a theme for every stack color', () => {
		for (const c of STACK_COLORS) {
			const t = theme(c);
			expect(t.solid).toBe(`bg-${c}-500`);
			expect(t.soft).toBe(`bg-${c}-500/15`);
			expect(t.text).toBe(`text-${c}-400`);
		}
	});

	it('falls back to indigo for unknown colors', () => {
		expect(theme('not-a-color')).toEqual(theme('indigo'));
	});

	it('random picks come from the lists', () => {
		for (let i = 0; i < 20; i++) {
			expect(STACK_COLORS).toContain(randomColor());
			expect(STACK_ICONS).toContain(randomIcon());
		}
	});

	it('has unique colors and icons', () => {
		expect(new Set(STACK_COLORS).size).toBe(STACK_COLORS.length);
		expect(new Set(STACK_ICONS).size).toBe(STACK_ICONS.length);
	});
});

describe('generateId', () => {
	it('returns unique UUIDs', () => {
		const ids = new Set(Array.from({ length: 50 }, generateId));
		expect(ids.size).toBe(50);
		for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
	});
});
