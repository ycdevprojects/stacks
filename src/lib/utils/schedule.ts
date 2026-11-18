// Which habits are due on which days, and which days are excused from streaks.

import type { Habit } from '$lib/types';
import { addDays, dateOf } from './helpers';
import type { ExcuseFn } from './gamification';

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const WEEKDAYS_ONLY = [1, 2, 3, 4, 5];

/** Normalize a picked set of weekdays: every day (or none) is stored as undefined. */
export function normalizeDays(days: number[]): number[] | undefined {
	const set = [...new Set(days.filter((d) => d >= 0 && d <= 6))].sort();
	return set.length === 0 || set.length === 7 ? undefined : set;
}

export function isScheduled(habit: Pick<Habit, 'days'>, date: string): boolean {
	return !habit.days || habit.days.length === 0 || habit.days.includes(dateOf(date).getDay());
}

export function dueHabits<H extends Pick<Habit, 'days'>>(habits: H[], date: string): H[] {
	return habits.filter((h) => isScheduled(h, date));
}

/** Short human label: "Every day", "Weekdays", "Weekends", "Mon, Wed, Fri". */
export function scheduleLabel(days: number[] | undefined): string {
	const d = normalizeDays(days ?? []);
	if (!d) return 'Every day';
	const key = d.join('');
	if (key === '12345') return 'Weekdays';
	if (key === '06') return 'Weekends';
	return d.map((n) => dayName(n, 'short')).join(', ');
}

export function dayName(day: number, width: 'narrow' | 'short' | 'long'): string {
	// 2023-01-01 was a Sunday.
	return new Date(2023, 0, 1 + day).toLocaleDateString(undefined, { weekday: width });
}

// ============ REST DAYS ============

/** Rest days must be at least this many days apart. */
export const REST_DAY_GAP = 7;

/**
 * Whether `date` can become a rest day: it has no check-ins and no other rest
 * day falls within the 6 days on either side of it.
 */
export function canRestOn(date: string, restDays: readonly string[], hasCompletions: boolean): boolean {
	if (hasCompletions || restDays.includes(date)) return false;
	for (let i = 1; i < REST_DAY_GAP; i++) {
		if (restDays.includes(addDays(date, -i)) || restDays.includes(addDays(date, i))) return false;
	}
	return true;
}

/** Days excused from the overall streak: rest days, and days with nothing scheduled. */
export function overallExcuse(habits: Pick<Habit, 'days'>[], restDays: readonly string[]): ExcuseFn {
	const rest = new Set(restDays);
	return (date) => rest.has(date) || (habits.length > 0 && dueHabits(habits, date).length === 0);
}

/** Days excused from one habit's streak: rest days and days it isn't scheduled. */
export function habitExcuse(habit: Pick<Habit, 'days'>, restDays: readonly string[]): ExcuseFn {
	const rest = new Set(restDays);
	return (date) => rest.has(date) || !isScheduled(habit, date);
}
