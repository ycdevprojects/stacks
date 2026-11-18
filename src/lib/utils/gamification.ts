// XP, leveling and streak math.

export const XP_PER_HABIT = 10;
export const XP_STACK_BONUS = 25;
export const XP_STREAK_PER_DAY = 5;
export const MAX_STREAK_BONUS = 50;

// Level N requires a total of 25 * N * (N + 1) XP.
// Level 1: 50, Level 2: 150, Level 3: 300, Level 5: 750, Level 10: 2750
export function xpForLevel(level: number): number {
	return 25 * level * (level + 1);
}

export function levelFromXp(xp: number): number {
	let level = 0;
	while (xpForLevel(level + 1) <= xp) level++;
	return level;
}

export function xpProgressInLevel(xp: number): { current: number; needed: number; percent: number } {
	const lvl = levelFromXp(xp);
	const currentLevelXp = xpForLevel(lvl);
	const needed = xpForLevel(lvl + 1) - currentLevelXp;
	const current = xp - currentLevelXp;
	return { current, needed, percent: Math.min(100, Math.round((current / needed) * 100)) };
}

import { addDays, today as todayStr } from './helpers';

/**
 * A day that neither extends nor breaks a streak: a rest day, or a day the
 * habit isn't scheduled. Streak functions skip over excused days.
 */
export type ExcuseFn = (date: string) => boolean;

const never: ExcuseFn = () => false;

/**
 * Current run of days with at least one completion, walking back from today.
 * Excused days are skipped. The streak stays alive through today if the last
 * counted day was yesterday (or an excused day before it).
 */
export function calculateStreak(completedDates: string[], isExcused: ExcuseFn = never, today: string = todayStr()): number {
	const done = new Set(completedDates.map((d) => d.slice(0, 10)));
	if (done.size === 0) return 0;
	const earliest = [...done].reduce((min, d) => (d < min ? d : min));
	let streak = 0;
	// Today never breaks the streak: it isn't over yet.
	let day = today;
	if (done.has(day)) streak++;
	day = addDays(day, -1);
	while (day >= earliest) {
		if (done.has(day)) streak++;
		else if (!isExcused(day)) break;
		day = addDays(day, -1);
	}
	return streak;
}

/** Longest run ever (excused days skipped), whether or not it is still alive. */
export function longestStreak(completedDates: string[], isExcused: ExcuseFn = never): number {
	const sorted = [...new Set(completedDates.map((d) => d.slice(0, 10)))].sort();
	if (sorted.length === 0) return 0;
	const done = new Set(sorted);
	const last = sorted[sorted.length - 1];
	let best = 0;
	let run = 0;
	for (let day = sorted[0]; day <= last; day = addDays(day, 1)) {
		if (done.has(day)) best = Math.max(best, ++run);
		else if (!isExcused(day)) run = 0;
	}
	return best;
}
