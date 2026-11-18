import { describe, it, expect } from 'vitest';
import {
	xpForLevel,
	levelFromXp,
	xpProgressInLevel,
	calculateStreak,
	longestStreak
} from '$lib/utils/gamification';
import { daysAgo } from '$lib/utils/helpers';

describe('XP & Leveling', () => {
	describe('xpForLevel', () => {
		it('returns 0 for level 0', () => {
			expect(xpForLevel(0)).toBe(0);
		});

		it('returns correct XP for known levels', () => {
			// Formula: 25 * N * (N + 1)
			expect(xpForLevel(1)).toBe(50);    // 25 * 1 * 2
			expect(xpForLevel(2)).toBe(150);   // 25 * 2 * 3
			expect(xpForLevel(3)).toBe(300);   // 25 * 3 * 4
			expect(xpForLevel(5)).toBe(750);   // 25 * 5 * 6
			expect(xpForLevel(10)).toBe(2750); // 25 * 10 * 11
			expect(xpForLevel(25)).toBe(16250); // 25 * 25 * 26
		});
	});

	describe('levelFromXp', () => {
		it('returns 0 for XP below 50', () => {
			expect(levelFromXp(0)).toBe(0);
			expect(levelFromXp(25)).toBe(0);
			expect(levelFromXp(49)).toBe(0);
		});

		it('returns 1 for 50 XP', () => {
			expect(levelFromXp(50)).toBe(1);
		});

		it('returns correct levels at thresholds', () => {
			expect(levelFromXp(150)).toBe(2);   // exactly level 2
			expect(levelFromXp(300)).toBe(3);   // exactly level 3
			expect(levelFromXp(750)).toBe(5);   // exactly level 5
		});

		it('returns correct levels between thresholds', () => {
			expect(levelFromXp(100)).toBe(1);   // between level 1 (50) and level 2 (150)
			expect(levelFromXp(200)).toBe(2);   // between level 2 (150) and level 3 (300)
			expect(levelFromXp(500)).toBe(4);   // exactly at level 4 threshold (25*4*5=500)
		});

		it('handles large XP values', () => {
			expect(levelFromXp(2750)).toBe(10);
			expect(levelFromXp(10000)).toBe(19); // verified: levelFromXp(10000) should be 19 (xpForLevel(19)=9500, xpForLevel(20)=10500)
		});
	});

	describe('xpProgressInLevel', () => {
		it('returns progress at level 0 start', () => {
			const progress = xpProgressInLevel(25);
			expect(progress.current).toBe(25);
			expect(progress.needed).toBe(50); // level 0 -> 1 needs 50 XP
			expect(progress.percent).toBe(50);
		});

		it('returns 0% at exact level threshold', () => {
			const progress = xpProgressInLevel(50);
			expect(progress.current).toBe(0);
			expect(progress.percent).toBe(0);
		});

		it('calculates progress correctly mid-level', () => {
			const progress = xpProgressInLevel(100);
			// Level 1 (50 XP), need 100 more for level 2 (150 total)
			expect(progress.current).toBe(50);
			expect(progress.needed).toBe(100);
			expect(progress.percent).toBe(50);
		});

		it('caps percent at 100', () => {
			// Even at high XP, percent should max at 100
			const progress = xpProgressInLevel(99999);
			expect(progress.percent).toBeLessThanOrEqual(100);
		});
	});
});


// All dates come from the app's local-date helpers so the tests hold in any timezone.
describe('calculateStreak', () => {
	it('returns 0 for no completions', () => {
		expect(calculateStreak([])).toBe(0);
	});

	it('returns 1 for just today', () => {
		expect(calculateStreak([daysAgo(0)])).toBe(1);
	});

	it('counts consecutive days ending today', () => {
		expect(calculateStreak([0, 1, 2, 3, 4].map(daysAgo))).toBe(5);
	});

	it('keeps a streak alive when the latest completion was yesterday', () => {
		expect(calculateStreak([daysAgo(1), daysAgo(2)])).toBe(2);
	});

	it('returns 0 once a full day has been missed', () => {
		expect(calculateStreak([daysAgo(2), daysAgo(3)])).toBe(0);
	});

	it('ignores duplicates and input order', () => {
		expect(calculateStreak([daysAgo(2), daysAgo(0), daysAgo(1), daysAgo(0)])).toBe(3);
	});

	it('stops at the first gap', () => {
		expect(calculateStreak([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(5)])).toBe(3);
	});
});

describe('longestStreak', () => {
	it('returns 0 for no completions', () => {
		expect(longestStreak([])).toBe(0);
	});

	it('finds the longest run even when it has ended', () => {
		const dates = [daysAgo(20), daysAgo(19), daysAgo(18), daysAgo(17), daysAgo(1), daysAgo(0)];
		expect(longestStreak(dates)).toBe(4);
	});

	it('ignores duplicates', () => {
		expect(longestStreak([daysAgo(1), daysAgo(1), daysAgo(0)])).toBe(2);
	});
});
