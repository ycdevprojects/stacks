// App state (Svelte 5 runes). Local-only: everything lives in IndexedDB.

import type { Stack, Habit, Completion, Achievement, Profile, BadgeDefinition } from '$lib/types';
import * as db from '$lib/services/db';
import { generateId, today as todayStr } from '$lib/utils/helpers';
import { getBadge, timeOfDayBadges } from '$lib/utils/badges';
import { stageFromXp } from '$lib/room/room-stage';
import {
	updateProfileOnComplete,
	updateProfileOnUncomplete,
	checkAndUnlockAchievements,
	checkIfFullStackToday,
	isStackCompleteOnDate,
	profileStreak,
	replayXp
} from './profile';
import { levelFromXp } from '$lib/utils/gamification';
import { canRestOn } from '$lib/utils/schedule';

const LOCAL_USER_ID_KEY = 'stackr_local_user_id';

let stacks = $state<Stack[]>([]);
let habits = $state<Habit[]>([]);
let completions = $state<Completion[]>([]);
let achievements = $state<Achievement[]>([]);
let profile = $state<Profile | null>(null);
let userId = $state<string | null>(null);
let today = $state(todayStr());

// "habitId|date" keys of completions currently in a done-set lookup.
const doneKeys = $derived(new Set(completions.map((c) => `${c.habit_id}|${c.completed_at}`)));
// Live streak: the stored streak_days goes stale when days pass without opening the app.
const streak = $derived(profile ? profileStreak(profile, completions, habits) : 0);
const restDays = $derived(profile?.rest_days ?? []);

export function getAppState() {
	return {
		get stacks() { return stacks; },
		get habits() { return habits; },
		get completions() { return completions; },
		get achievements() { return achievements; },
		get profile() { return profile; },
		get userId() { return userId; },
		/** Current overall streak in days (rest days and unscheduled days don't break it). */
		get streak() { return streak; },
		get restDays() { return restDays; },
		/** Local date, kept current across midnight while the app stays open. */
		get today() { return today; }
	};
}

export function isDone(habitId: string, date: string): boolean {
	return doneKeys.has(`${habitId}|${date}`);
}

export function habitsOf(stackId: string): Habit[] {
	return habits.filter((h) => h.stack_id === stackId);
}

const bySortOrder = <T extends { sort_order: number; created_at: string }>(a: T, b: T) =>
	a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

function now(): string {
	return new Date().toISOString();
}

function requireUser(): string {
	if (!userId) throw new Error('App state not initialized');
	return userId;
}

function newProfile(id: string): Profile {
	return {
		id, xp: 0, level: 0, streak_days: 0, longest_streak: 0, total_completions: 0,
		theme: 'default', created_at: now(), updated_at: now()
	};
}

function getLocalUserId(): string {
	let id = localStorage.getItem(LOCAL_USER_ID_KEY);
	if (!id) {
		id = 'local_' + generateId();
		localStorage.setItem(LOCAL_USER_ID_KEY, id);
	}
	return id;
}

// ============ LIFECYCLE ============

export async function initializeState(): Promise<void> {
	const uid = getLocalUserId();
	await db.migrateFromOldUserId(uid);
	const data = await db.loadAll(uid);

	userId = uid;
	stacks = data.stacks.sort(bySortOrder);
	habits = data.habits.sort(bySortOrder);
	completions = data.completions;
	achievements = data.achievements;
	if (data.profile) {
		profile = data.profile;
	} else {
		// Save the plain object: IndexedDB can't clone the $state proxy.
		const fresh = newProfile(uid);
		await db.saveProfile(fresh);
		profile = fresh;
	}
	// Bring the stored streak up to date (it can only shrink while the app is closed).
	const live = profileStreak(profile, completions, habits);
	if (live !== profile.streak_days) await saveProfile({ streak_days: live });
	// One-time repair: a bug dropped XP for profiles with room styles or rest days, because
	// those nested fields made the profile unsavable. Replay the history once and keep the
	// larger total. Only once, so later schedule edits can't re-award old bonuses.
	if (!profile.xp_repaired && (profile.room_styles || profile.rest_days?.length)) {
		const replayed = replayXp(completions, stacks, habits, profile.rest_days ?? []);
		const xp = Math.max(profile.xp, replayed);
		await saveProfile({
			xp,
			level: levelFromXp(xp),
			total_completions: Math.max(profile.total_completions, completions.length),
			xp_repaired: true
		});
	}
	// Quietly catch up on badges earned before they were tracked (older versions, imports).
	await unlockAchievements();
}

/** Re-read the local date; call on focus/visibility so midnight rolls over. */
export function refreshToday(): void {
	const t = todayStr();
	if (t !== today) today = t;
}

async function saveProfile(changes: Partial<Profile>): Promise<void> {
	if (!profile) return;
	const updated: Profile = { ...$state.snapshot(profile), ...changes, updated_at: now() };
	await db.saveProfile(updated);
	profile = updated;
}

// ============ ACHIEVEMENTS ============

async function unlockAchievements(timeOfDay: { isNightOwl?: boolean; isEarlyBird?: boolean } = {}): Promise<BadgeDefinition[]> {
	if (!profile || !userId) return [];
	const result = await checkAndUnlockAchievements(
		profile, achievements, stacks, userId, checkIfFullStackToday(stacks, habits, completions), timeOfDay
	);
	if (result.newAchievements.length > 0) achievements = [...achievements, ...result.newAchievements];
	return result.badgeKeys.map(getBadge).filter((b): b is BadgeDefinition => !!b);
}

// ============ STACKS ============

export async function createStack(
	input: { name: string; trigger: string; color: string; icon: string },
	habitNames: string[] = []
): Promise<{ stack: Stack; newBadges: BadgeDefinition[] }> {
	const uid = requireUser();
	const stack: Stack = {
		id: generateId(), user_id: uid, ...input,
		sort_order: stacks.length ? Math.max(...stacks.map((s) => s.sort_order)) + 1 : 0,
		created_at: now(), updated_at: now()
	};
	const newHabits: Habit[] = habitNames.map((name, i) => ({
		id: generateId(), stack_id: stack.id, user_id: uid, name,
		sort_order: i, created_at: now(), updated_at: now()
	}));
	await db.saveStack(stack);
	if (newHabits.length) await db.saveHabits(newHabits);
	stacks = [...stacks, stack];
	habits = [...habits, ...newHabits];
	return { stack, newBadges: await unlockAchievements() };
}

export async function updateStack(stack: Stack): Promise<void> {
	const updated = { ...$state.snapshot(stack), updated_at: now() };
	await db.saveStack(updated);
	stacks = stacks.map((s) => (s.id === updated.id ? updated : s));
}

export async function removeStack(id: string): Promise<void> {
	const habitIds = new Set(habitsOf(id).map((h) => h.id));
	await db.deleteStack(id);
	stacks = stacks.filter((s) => s.id !== id);
	habits = habits.filter((h) => h.stack_id !== id);
	completions = completions.filter((c) => !habitIds.has(c.habit_id));
}

/** Move a stack up (-1) or down (+1) in the list. */
export async function moveStack(id: string, delta: -1 | 1): Promise<void> {
	const order = [...stacks];
	const from = order.findIndex((s) => s.id === id);
	const to = from + delta;
	if (from < 0 || to < 0 || to >= order.length) return;
	[order[from], order[to]] = [order[to], order[from]];
	const reordered = order.map((s, i) => ({ ...$state.snapshot(s), sort_order: i }));
	stacks = reordered;
	await db.saveStacks(reordered);
}

// ============ HABITS ============

export async function createHabit(
	stackId: string,
	name: string,
	description?: string,
	days?: number[]
): Promise<Habit> {
	const siblings = habitsOf(stackId);
	const habit: Habit = {
		id: generateId(), stack_id: stackId, user_id: requireUser(), name, description, days,
		sort_order: siblings.length ? Math.max(...siblings.map((h) => h.sort_order)) + 1 : 0,
		created_at: now(), updated_at: now()
	};
	await db.saveHabit(habit);
	habits = [...habits, habit];
	return habit;
}

export async function updateHabit(habit: Habit): Promise<void> {
	const updated = { ...$state.snapshot(habit), updated_at: now() };
	await db.saveHabit(updated);
	habits = habits.map((h) => (h.id === updated.id ? updated : h));
}

export async function removeHabit(id: string): Promise<void> {
	await db.deleteHabit(id);
	habits = habits.filter((h) => h.id !== id);
	completions = completions.filter((c) => c.habit_id !== id);
}

/** Move a habit up (-1) or down (+1) within its stack. */
export async function moveHabit(id: string, delta: -1 | 1): Promise<void> {
	const habit = habits.find((h) => h.id === id);
	if (!habit) return;
	const order = habitsOf(habit.stack_id);
	const from = order.findIndex((h) => h.id === id);
	const to = from + delta;
	if (to < 0 || to >= order.length) return;
	[order[from], order[to]] = [order[to], order[from]];
	const reordered = order.map((h, i) => ({ ...$state.snapshot(h), sort_order: i }));
	const byId = new Map(reordered.map((h) => [h.id, h]));
	habits = habits.map((h) => byId.get(h.id) ?? h).sort(bySortOrder);
	await db.saveHabits(reordered);
}

// ============ COMPLETIONS ============

export interface ToggleResult {
	completed: boolean;
	xpDelta: number;
	/** New level when this toggle crossed a level boundary upward. */
	levelUp: number | null;
	/** New room stage when this toggle unlocked one. */
	stageUp: number | null;
	/** The habit's stack, when this completion finished it for the day. */
	stackCompleted: Stack | null;
	newBadges: BadgeDefinition[];
}

const pending = new Set<string>();

/** Check or uncheck a habit on a date. Returns null while a toggle for the same habit is in flight. */
export async function toggleCompletion(habitId: string, date: string = today): Promise<ToggleResult | null> {
	const uid = requireUser();
	const key = `${habitId}|${date}`;
	if (pending.has(key) || !profile) return null;
	pending.add(key);
	try {
		// A plain copy: the profile functions spread it and save it to IndexedDB.
		const before: Profile = $state.snapshot(profile);
		const existing = completions.find((c) => c.habit_id === habitId && c.completed_at === date);

		if (existing) {
			await db.deleteCompletion(existing.id);
			completions = completions.filter((c) => c.id !== existing.id);
			profile = await updateProfileOnUncomplete(before, completions, stacks, habits, habitId, date);
			return {
				completed: false, xpDelta: profile.xp - before.xp,
				levelUp: null, stageUp: null, stackCompleted: null, newBadges: []
			};
		}

		const completion: Completion = { id: generateId(), habit_id: habitId, user_id: uid, completed_at: date, created_at: now() };
		await db.saveCompletion(completion);
		completions = [...completions, completion];
		profile = await updateProfileOnComplete(before, completions, stacks, habits, habitId, date);

		const stack = stacks.find((s) => s.id === habits.find((h) => h.id === habitId)?.stack_id) ?? null;
		const stageBefore = stageFromXp(before.xp);
		const stageAfter = stageFromXp(profile.xp);
		const newBadges = await unlockAchievements(date === todayStr() ? timeOfDayBadges(new Date().getHours()) : {});

		return {
			completed: true,
			xpDelta: profile.xp - before.xp,
			levelUp: profile.level > before.level ? profile.level : null,
			stageUp: stageAfter > stageBefore ? stageAfter : null,
			stackCompleted: stack && isStackCompleteOnDate(stack.id, habits, completions, date) ? stack : null,
			newBadges
		};
	} finally {
		pending.delete(key);
	}
}

// ============ REST DAYS ============

export function isRestDay(date: string): boolean {
	return restDays.includes(date);
}

export function canRest(date: string): boolean {
	return canRestOn(date, restDays, completions.some((c) => c.completed_at === date));
}

/** Mark or unmark a rest day. Returns false when the day can't be a rest day. */
export async function toggleRestDay(date: string): Promise<boolean> {
	if (!profile) return false;
	let next: string[];
	if (isRestDay(date)) next = restDays.filter((d) => d !== date);
	else if (canRest(date)) next = [...restDays, date].sort();
	else return false;
	const s = profileStreak({ rest_days: next }, completions, habits);
	await saveProfile({ rest_days: next, streak_days: s, longest_streak: Math.max(profile.longest_streak, s) });
	return true;
}

// ============ ROOM ============

export async function setRoomStyle(placementId: string, variant: string): Promise<void> {
	await saveProfile({ room_styles: { ...(profile?.room_styles ?? {}), [placementId]: variant } });
}

// ============ BACKUP / RESET ============

export function exportBackup(): db.Backup {
	return $state.snapshot({
		app: 'stackr' as const,
		version: 1 as const,
		exported_at: now(),
		stacks, habits, completions, achievements, profile
	});
}

function isBackup(value: unknown): value is db.Backup {
	const v = value as Partial<db.Backup> | null;
	return (
		!!v && v.app === 'stackr' &&
		Array.isArray(v.stacks) && Array.isArray(v.habits) &&
		Array.isArray(v.completions) && Array.isArray(v.achievements)
	);
}

/** Replace all local data with a backup file's contents. Throws on invalid input. */
export async function importBackup(json: string): Promise<void> {
	let parsed: unknown;
	try {
		parsed = JSON.parse(json);
	} catch {
		throw new Error('That file is not valid JSON.');
	}
	if (!isBackup(parsed)) throw new Error('That file is not a Stackr backup.');
	await db.replaceAll(requireUser(), parsed);
	await initializeState();
}

export async function resetAllData(): Promise<void> {
	await db.clearAll();
	await initializeState();
}
