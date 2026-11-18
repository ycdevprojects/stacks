import { describe, it, expect } from 'vitest';
import type { Habit, Stack } from '$lib/types';
import { parseTime, upcomingReminders, buildCalendar, stackDays } from './reminders';

const base = { user_id: 'u', created_at: '', updated_at: '', sort_order: 0 };
const stack = (id: string, reminder?: string): Stack => ({
	...base, id, name: 'Morning', trigger: 'After coffee', color: 'amber', icon: '☕', reminder
});
const habit = (id: string, stack_id: string, days?: number[]): Habit => ({ ...base, id, stack_id, name: `Habit ${id}`, days });

// 2026-11-17 is a Tuesday.
const TODAY = '2026-11-17';

describe('parseTime', () => {
	it('parses HH:MM into minutes', () => {
		expect(parseTime('08:30')).toBe(510);
		expect(parseTime('23:59')).toBe(1439);
	});
	it('rejects junk', () => {
		expect(parseTime(undefined)).toBeNull();
		expect(parseTime('25:00')).toBeNull();
		expect(parseTime('8')).toBeNull();
	});
});

describe('upcomingReminders', () => {
	const stacks = [stack('a', '09:00'), stack('b', '07:00'), stack('c'), stack('d', '20:00')];
	const habits = [habit('1', 'a'), habit('2', 'b'), habit('3', 'c'), habit('4', 'd', [1])];
	const now = new Date(2026, 10, 17, 8, 0, 0);

	it('keeps only future reminders on stacks with habits left today', () => {
		const out = upcomingReminders(stacks, habits, () => false, TODAY, now);
		// b already passed, c has no reminder, d only has a Monday habit
		expect(out.map((r) => r.stack.id)).toEqual(['a']);
		expect(out[0].inMs).toBe(60 * 60_000);
		expect(out[0].left).toBe(1);
	});

	it('skips stacks already finished', () => {
		expect(upcomingReminders(stacks, habits, (id) => id === '1', TODAY, now)).toEqual([]);
	});
});

describe('calendar export', () => {
	it('repeats daily, or weekly on the scheduled weekdays', () => {
		const stacks = [stack('a', '07:05'), stack('g', '18:00'), stack('n')];
		const habits = [habit('1', 'a'), habit('2', 'g', [1, 3, 5]), habit('3', 'g', [5])];
		const ics = buildCalendar(stacks, habits, TODAY, 'https://example.test');
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
		expect(ics).toContain('DTSTART:20261117T070500');
		expect(ics).toContain('RRULE:FREQ=DAILY');
		// Gym starts on the next scheduled day (Wednesday)
		expect(ics).toContain('DTSTART:20261118T180000');
		expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR');
		expect(ics).toContain('TRIGGER:PT0M');
		for (const line of ics.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
	});

	it('treats a stack as daily when any habit is daily', () => {
		expect(stackDays(stack('a'), [habit('1', 'a', [1]), habit('2', 'a')])).toBeNull();
		expect(stackDays(stack('a'), [habit('1', 'a', [5, 1])])).toEqual([1, 5]);
	});
});
