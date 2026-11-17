// Badge definitions and unlock checks.

import type { BadgeDefinition } from '$lib/types';

export const BADGES: BadgeDefinition[] = [
	// Streaks (consecutive days with at least one habit logged)
	{ key: 'streak_3', name: 'Getting Started', description: 'Log habits 3 days in a row', icon: '🔥', category: 'streak' },
	{ key: 'streak_7', name: 'On Fire', description: 'Log habits 7 days in a row', icon: '🔥', category: 'streak' },
	{ key: 'streak_14', name: 'Unstoppable', description: 'Log habits 14 days in a row', icon: '💪', category: 'streak' },
	{ key: 'streak_30', name: 'Habit Master', description: 'Log habits 30 days in a row', icon: '⚡', category: 'streak' },
	{ key: 'streak_100', name: 'Legendary', description: 'Log habits 100 days in a row', icon: '👑', category: 'streak' },

	// Completions
	{ key: 'first_habit', name: 'First Step', description: 'Log your first habit', icon: '👣', category: 'completion' },
	{ key: 'complete_10', name: 'Getting Going', description: 'Complete 10 habits', icon: '🚶', category: 'completion' },
	{ key: 'complete_50', name: 'Building Momentum', description: 'Complete 50 habits', icon: '🏃', category: 'completion' },
	{ key: 'complete_100', name: 'Century Club', description: 'Complete 100 habits', icon: '💯', category: 'completion' },
	{ key: 'complete_500', name: 'Half K', description: 'Complete 500 habits', icon: '🏅', category: 'completion' },
	{ key: 'complete_1000', name: 'Grand Master', description: 'Complete 1,000 habits', icon: '🏆', category: 'completion' },

	// Stacks
	{ key: 'first_stack', name: 'Stack Starter', description: 'Create your first stack', icon: '🏗️', category: 'stack' },
	{ key: 'full_stack', name: 'Full Stack', description: 'Finish every habit in a stack in one day', icon: '✅', category: 'stack' },
	{ key: 'stack_5', name: 'Architect', description: 'Create 5 stacks', icon: '🏛️', category: 'stack' },

	// Levels
	{ key: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐', category: 'level' },
	{ key: 'level_10', name: 'Veteran', description: 'Reach level 10', icon: '🌟', category: 'level' },
	{ key: 'level_25', name: 'Elite', description: 'Reach level 25', icon: '💫', category: 'level' },
	{ key: 'level_50', name: 'Transcendent', description: 'Reach level 50', icon: '✨', category: 'level' },

	// Special
	{ key: 'night_owl', name: 'Night Owl', description: 'Check off a habit between midnight and 4 AM', icon: '🦉', category: 'special' },
	{ key: 'early_bird', name: 'Early Bird', description: 'Check off a habit between 4 and 7 AM', icon: '🐦', category: 'special' }
];

export function getBadge(key: string): BadgeDefinition | undefined {
	return BADGES.find((b) => b.key === key);
}

export interface AchievementCheck {
	badgeKey: string;
	shouldUnlock: boolean;
}

const STREAK_TARGETS: Record<string, number> = { streak_3: 3, streak_7: 7, streak_14: 14, streak_30: 30, streak_100: 100 };
const COMPLETION_TARGETS: Record<string, number> = {
	first_habit: 1, complete_10: 10, complete_50: 50, complete_100: 100, complete_500: 500, complete_1000: 1000
};
const LEVEL_TARGETS: Record<string, number> = { level_5: 5, level_10: 10, level_25: 25, level_50: 50 };
const STACK_TARGETS: Record<string, number> = { first_stack: 1, stack_5: 5 };

const checks = (targets: Record<string, number>, value: number): AchievementCheck[] =>
	Object.entries(targets).map(([badgeKey, target]) => ({ badgeKey, shouldUnlock: value >= target }));

export function checkStreakBadges(maxStreak: number): AchievementCheck[] {
	return checks(STREAK_TARGETS, maxStreak);
}

export function checkCompletionBadges(totalCompletions: number): AchievementCheck[] {
	return checks(COMPLETION_TARGETS, totalCompletions);
}

export function checkLevelBadges(level: number): AchievementCheck[] {
	return checks(LEVEL_TARGETS, level);
}

/** Night owl: 00:00-03:59. Early bird: 04:00-06:59. */
export function timeOfDayBadges(hour: number): { isNightOwl: boolean; isEarlyBird: boolean } {
	return { isNightOwl: hour >= 0 && hour < 4, isEarlyBird: hour >= 4 && hour < 7 };
}

export function checkAllAchievements(
	maxStreak: number,
	totalCompletions: number,
	level: number,
	stackCount: number,
	hasFullStack: boolean,
	isNightOwl: boolean = false,
	isEarlyBird: boolean = false
): AchievementCheck[] {
	return [
		...checkStreakBadges(maxStreak),
		...checkCompletionBadges(totalCompletions),
		...checkLevelBadges(level),
		...checks(STACK_TARGETS, stackCount),
		{ badgeKey: 'full_stack', shouldUnlock: hasFullStack },
		{ badgeKey: 'night_owl', shouldUnlock: isNightOwl },
		{ badgeKey: 'early_bird', shouldUnlock: isEarlyBird }
	];
}

export interface BadgeStats {
	longestStreak: number;
	totalCompletions: number;
	level: number;
	stackCount: number;
}

/** Numeric progress toward a badge, or null for one-off badges. */
export function badgeProgress(key: string, stats: BadgeStats): { current: number; target: number } | null {
	const pick = (targets: Record<string, number>, value: number) =>
		key in targets ? { current: Math.min(value, targets[key]), target: targets[key] } : null;
	return (
		pick(STREAK_TARGETS, stats.longestStreak) ??
		pick(COMPLETION_TARGETS, stats.totalCompletions) ??
		pick(LEVEL_TARGETS, stats.level) ??
		pick(STACK_TARGETS, stats.stackCount)
	);
}
