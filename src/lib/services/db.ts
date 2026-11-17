// IndexedDB storage — the app's only data store (offline-first, no server).

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Stack, Habit, Completion, Achievement, Profile } from '$lib/types';

const DB_NAME = 'stackr';
const DB_VERSION = 4;

interface StackrDB extends DBSchema {
	stacks: { key: string; value: Stack; indexes: { user_id: string; sort_order: number } };
	habits: { key: string; value: Habit; indexes: { stack_id: string; user_id: string } };
	completions: {
		key: string;
		value: Completion;
		indexes: { habit_id: string; completed_at: string; user_id: string; habit_date: [string, string] };
	};
	achievements: { key: string; value: Achievement; indexes: { user_id: string } };
	profile: { key: string; value: Profile };
}

const DATA_STORES = ['stacks', 'habits', 'completions', 'achievements', 'profile'] as const;

let dbPromise: Promise<IDBPDatabase<StackrDB>> | null = null;

function getDB(): Promise<IDBPDatabase<StackrDB>> {
	dbPromise ??= openDB<StackrDB>(DB_NAME, DB_VERSION, {
		upgrade(db, oldVersion, _newVersion, transaction) {
			if (oldVersion < 1) {
				const stackStore = db.createObjectStore('stacks', { keyPath: 'id' });
				stackStore.createIndex('user_id', 'user_id');
				stackStore.createIndex('sort_order', 'sort_order');

				const habitStore = db.createObjectStore('habits', { keyPath: 'id' });
				habitStore.createIndex('stack_id', 'stack_id');
				habitStore.createIndex('user_id', 'user_id');

				const completionStore = db.createObjectStore('completions', { keyPath: 'id' });
				completionStore.createIndex('habit_id', 'habit_id');
				completionStore.createIndex('completed_at', 'completed_at');
				completionStore.createIndex('user_id', 'user_id');
				completionStore.createIndex('habit_date', ['habit_id', 'completed_at'], { unique: true });

				db.createObjectStore('profile', { keyPath: 'id' });
			}

			if (oldVersion < 2 && !db.objectStoreNames.contains('achievements')) {
				db.createObjectStore('achievements', { keyPath: 'id' });
			}

			// v3: user_id index on achievements (missing in v2)
			if (oldVersion > 0 && oldVersion < 3) {
				const store = transaction.objectStore('achievements');
				if (!store.indexNames.contains('user_id')) store.createIndex('user_id', 'user_id');
			}

			// v4 added a key/value `settings` store for a since-removed feature.
			// It is never read; the version stays at 4 so existing installs open cleanly.
		}
	});
	return dbPromise;
}

// ============ MIGRATION ============

/**
 * Re-key data written under an older user id (the app once had accounts) to
 * the current local id. Runs on launch; a no-op once the local id owns data.
 */
export async function migrateFromOldUserId(newUserId: string): Promise<void> {
	const db = await getDB();
	const profiles = await db.getAll('profile');
	if (profiles.some((p) => p.id === newUserId)) return;
	const old = profiles[0];
	if (!old) return;

	const tx = db.transaction(DATA_STORES, 'readwrite');
	await tx.objectStore('profile').put({ ...old, id: newUserId });
	await tx.objectStore('profile').delete(old.id);
	const rekey = async <T extends { user_id: string }>(rows: T[], put: (row: T) => Promise<unknown>) => {
		for (const row of rows) if (row.user_id === old.id) await put({ ...row, user_id: newUserId });
	};
	await rekey(await tx.objectStore('stacks').getAll(), (r) => tx.objectStore('stacks').put(r));
	await rekey(await tx.objectStore('habits').getAll(), (r) => tx.objectStore('habits').put(r));
	await rekey(await tx.objectStore('completions').getAll(), (r) => tx.objectStore('completions').put(r));
	await rekey(await tx.objectStore('achievements').getAll(), (r) => tx.objectStore('achievements').put(r));
	await tx.done;
}

// ============ READS ============

export async function loadAll(userId: string) {
	const db = await getDB();
	const [stacks, habits, completions, achievements, profile] = await Promise.all([
		db.getAllFromIndex('stacks', 'user_id', userId),
		db.getAllFromIndex('habits', 'user_id', userId),
		db.getAllFromIndex('completions', 'user_id', userId),
		db.getAll('achievements'),
		db.get('profile', userId)
	]);
	const habitIds = new Set(habits.map((h) => h.id));
	const stackIds = new Set(stacks.map((s) => s.id));
	return {
		stacks,
		// Older builds deleted stacks/habits without their children; ignore orphans.
		habits: habits.filter((h) => stackIds.has(h.stack_id)),
		completions: completions.filter((c) => habitIds.has(c.habit_id)),
		achievements: achievements.filter((a) => a.user_id === userId),
		profile
	};
}

// ============ WRITES ============

export async function saveStack(stack: Stack): Promise<void> {
	await (await getDB()).put('stacks', stack);
}

export async function saveStacks(stacks: Stack[]): Promise<void> {
	const tx = (await getDB()).transaction('stacks', 'readwrite');
	await Promise.all([...stacks.map((s) => tx.store.put(s)), tx.done]);
}

export async function saveHabit(habit: Habit): Promise<void> {
	await (await getDB()).put('habits', habit);
}

export async function saveHabits(habits: Habit[]): Promise<void> {
	const tx = (await getDB()).transaction('habits', 'readwrite');
	await Promise.all([...habits.map((h) => tx.store.put(h)), tx.done]);
}

/** Delete a stack together with its habits and their completions. */
export async function deleteStack(id: string): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(['stacks', 'habits', 'completions'], 'readwrite');
	const completions = tx.objectStore('completions');
	for (const habitId of await tx.objectStore('habits').index('stack_id').getAllKeys(id)) {
		for (const key of await completions.index('habit_id').getAllKeys(habitId)) await completions.delete(key);
		await tx.objectStore('habits').delete(habitId);
	}
	await tx.objectStore('stacks').delete(id);
	await tx.done;
}

/** Delete a habit together with its completions. */
export async function deleteHabit(id: string): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(['habits', 'completions'], 'readwrite');
	const completions = tx.objectStore('completions');
	for (const key of await completions.index('habit_id').getAllKeys(id)) await completions.delete(key);
	await tx.objectStore('habits').delete(id);
	await tx.done;
}

export async function saveCompletion(completion: Completion): Promise<void> {
	await (await getDB()).put('completions', completion);
}

export async function deleteCompletion(id: string): Promise<void> {
	await (await getDB()).delete('completions', id);
}

export async function saveProfile(profile: Profile): Promise<void> {
	await (await getDB()).put('profile', profile);
}

export async function saveAchievement(achievement: Achievement): Promise<void> {
	await (await getDB()).put('achievements', achievement);
}

// ============ BACKUP ============

export interface Backup {
	app: 'stackr';
	version: 1;
	exported_at: string;
	stacks: Stack[];
	habits: Habit[];
	completions: Completion[];
	achievements: Achievement[];
	profile: Profile | null;
}

/** Replace every record with the backup's contents, re-keyed to `userId`. */
export async function replaceAll(userId: string, backup: Backup): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(DATA_STORES, 'readwrite');
	await Promise.all(DATA_STORES.map((name) => tx.objectStore(name).clear()));
	const own = <T extends { user_id: string }>(rows: T[]) => rows.map((r) => ({ ...r, user_id: userId }));
	for (const s of own(backup.stacks)) await tx.objectStore('stacks').put(s);
	for (const h of own(backup.habits)) await tx.objectStore('habits').put(h);
	for (const c of own(backup.completions)) await tx.objectStore('completions').put(c);
	for (const a of own(backup.achievements)) await tx.objectStore('achievements').put(a);
	if (backup.profile) await tx.objectStore('profile').put({ ...backup.profile, id: userId });
	await tx.done;
}

/** Wipe all app data. */
export async function clearAll(): Promise<void> {
	const db = await getDB();
	const tx = db.transaction(DATA_STORES, 'readwrite');
	await Promise.all([...DATA_STORES.map((name) => tx.objectStore(name).clear()), tx.done]);
}
