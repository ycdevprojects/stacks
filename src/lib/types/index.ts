// Core data types for Stackr

export interface Stack {
	id: string;
	user_id: string;
	name: string;
	/** The existing routine the habits hang off — "After I make coffee". */
	trigger: string;
	/** Key into STACK_COLORS. */
	color: string;
	/** Emoji. */
	icon: string;
	/** Daily reminder time, "HH:MM" local. */
	reminder?: string;
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface Habit {
	id: string;
	stack_id: string;
	user_id: string;
	name: string;
	description?: string;
	/** Weekdays the habit is due (0 = Sunday). Missing or empty = every day. */
	days?: number[];
	sort_order: number;
	created_at: string;
	updated_at: string;
}

export interface Completion {
	id: string;
	habit_id: string;
	user_id: string;
	/** Local calendar date, YYYY-MM-DD. */
	completed_at: string;
	created_at: string;
}

export interface Profile {
	/** The local user id. */
	id: string;
	xp: number;
	level: number;
	streak_days: number;
	longest_streak: number;
	total_completions: number;
	theme: string;
	/** Rest days (YYYY-MM-DD): excused from streaks. At most one per 7 days. */
	rest_days?: string[];
	/** Chosen style per room placement id, e.g. { rug: 'blue' }. */
	room_styles?: Record<string, string>;
	created_at: string;
	updated_at: string;
}

export interface Achievement {
	id: string;
	user_id: string;
	badge_key: string;
	unlocked_at: string;
}

export interface BadgeDefinition {
	key: string;
	name: string;
	description: string;
	icon: string;
	category: 'streak' | 'completion' | 'level' | 'stack' | 'special';
}
