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

const DAY_MS = 86_400_000;

/** Parse YYYY-MM-DD as a local date (not UTC) to avoid timezone shifts. */
function parseLocal(dateStr: string): Date {
	const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
	return new Date(y, m - 1, d);
}

function dayDiff(later: Date, earlier: Date): number {
	return Math.round((later.getTime() - earlier.getTime()) / DAY_MS);
}

/**
 * Current run of consecutive days with at least one completion. A streak stays
 * alive through today if the most recent completion was yesterday.
 */
export function calculateStreak(completedDates: string[]): number {
	if (completedDates.length === 0) return 0;
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const sorted = [...new Set(completedDates.map((d) => d.slice(0, 10)))].sort().reverse();

	if (dayDiff(today, parseLocal(sorted[0])) > 1) return 0;

	let streak = 1;
	for (let i = 1; i < sorted.length; i++) {
		if (dayDiff(parseLocal(sorted[i - 1]), parseLocal(sorted[i])) !== 1) break;
		streak++;
	}
	return streak;
}

/** Longest run of consecutive days ever, regardless of whether it is still alive. */
export function longestStreak(completedDates: string[]): number {
	const sorted = [...new Set(completedDates.map((d) => d.slice(0, 10)))].sort();
	let best = 0;
	let run = 0;
	for (let i = 0; i < sorted.length; i++) {
		run = i > 0 && dayDiff(parseLocal(sorted[i]), parseLocal(sorted[i - 1])) === 1 ? run + 1 : 1;
		best = Math.max(best, run);
	}
	return best;
}
