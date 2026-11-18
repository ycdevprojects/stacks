import { describe, it, expect } from 'vitest';
import { normalizeDays, isScheduled, dueHabits, scheduleLabel, canRestOn, overallExcuse, habitExcuse } from './schedule';

// 2026-11-16 is a Monday.
const MON = '2026-11-16';
const TUE = '2026-11-17';
const SAT = '2026-11-21';

describe('normalizeDays', () => {
	it('stores every day and no days as undefined', () => {
		expect(normalizeDays([0, 1, 2, 3, 4, 5, 6])).toBeUndefined();
		expect(normalizeDays([])).toBeUndefined();
	});
	it('sorts, dedupes and drops out-of-range values', () => {
		expect(normalizeDays([5, 1, 3, 1, 9])).toEqual([1, 3, 5]);
	});
});

describe('isScheduled / dueHabits', () => {
	it('treats a habit without days as daily', () => {
		expect(isScheduled({}, SAT)).toBe(true);
	});
	it('respects weekdays', () => {
		const weekdays = { days: [1, 2, 3, 4, 5] };
		expect(isScheduled(weekdays, MON)).toBe(true);
		expect(isScheduled(weekdays, SAT)).toBe(false);
		expect(dueHabits([weekdays, {}], SAT)).toHaveLength(1);
	});
});

describe('scheduleLabel', () => {
	it('names common schedules', () => {
		expect(scheduleLabel(undefined)).toBe('Every day');
		expect(scheduleLabel([1, 2, 3, 4, 5])).toBe('Weekdays');
		expect(scheduleLabel([0, 6])).toBe('Weekends');
		expect(scheduleLabel([1, 3, 5]).split(', ')).toHaveLength(3);
	});
});

describe('canRestOn', () => {
	it('allows a day with no check-ins and no nearby rest day', () => {
		expect(canRestOn(TUE, [], false)).toBe(true);
		expect(canRestOn(TUE, ['2026-11-10'], false)).toBe(true); // exactly 7 days earlier
	});
	it('refuses days with check-ins or a rest day within 6 days', () => {
		expect(canRestOn(TUE, [], true)).toBe(false);
		expect(canRestOn(TUE, ['2026-11-11'], false)).toBe(false);
		expect(canRestOn(TUE, ['2026-11-23'], false)).toBe(false);
		expect(canRestOn(TUE, [TUE], false)).toBe(false);
	});
});

describe('excuse functions', () => {
	it('overall: rest days and days with nothing due are excused', () => {
		const ex = overallExcuse([{ days: [1, 2, 3, 4, 5] }], [TUE]);
		expect(ex(TUE)).toBe(true);
		expect(ex(SAT)).toBe(true);
		expect(ex(MON)).toBe(false);
	});
	it('overall: with no habits nothing is excused', () => {
		expect(overallExcuse([], [])(SAT)).toBe(false);
	});
	it('habit: unscheduled days are excused', () => {
		const ex = habitExcuse({ days: [1] }, []);
		expect(ex(MON)).toBe(false);
		expect(ex(TUE)).toBe(true);
	});
});
