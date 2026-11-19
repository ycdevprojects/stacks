import { describe, it, expect } from 'vitest';
import type { Completion, Habit, Stack } from '$lib/types';
import { replayXp } from './profile';

const base = { user_id: 'u', created_at: '2026-01-01T12:00:00', updated_at: '', sort_order: 0 };
const stack: Stack = { ...base, id: 's', name: 'Morning', trigger: 'After coffee', color: 'amber', icon: '☕' };
const habits: Habit[] = [
	{ ...base, id: 'a', stack_id: 's', name: 'Water' },
	{ ...base, id: 'b', stack_id: 's', name: 'Stretch' }
];
/** A check-off on `date`, logged at noon on `loggedOn` (defaults to the same day). */
const done = (habit: string, date: string, loggedOn = date): Completion => ({
	id: `${habit}-${date}`,
	habit_id: habit,
	user_id: 'u',
	completed_at: date,
	created_at: new Date(`${loggedOn}T12:00:00`).toISOString()
});

describe('replayXp', () => {
	it('is 0 with no history', () => {
		expect(replayXp([], [stack], habits)).toBe(0);
	});

	it('adds per-habit XP, the stack bonus and the daily streak bonus', () => {
		// Day 1: both habits (2 x 10) + full stack (25) + streak 1 (5) = 50
		// Day 2: both again (20) + 25 + streak 2 (10) = 55
		const history = [done('a', '2026-11-01'), done('b', '2026-11-01'), done('a', '2026-11-02'), done('b', '2026-11-02')];
		expect(replayXp(history, [stack], habits)).toBe(105);
	});

	it('gives no stack bonus for a partial day', () => {
		// 10 + streak 1 (5)
		expect(replayXp([done('a', '2026-11-01')], [stack], habits)).toBe(15);
	});

	it('gives no streak bonus to days logged later (backfills)', () => {
		expect(replayXp([done('a', '2026-11-01', '2026-11-03')], [stack], habits)).toBe(10);
	});

	it('carries the streak across a rest day', () => {
		// Day 1: 10 + 5. Day 3 (day 2 rested): 10 + streak 2 (10)
		const history = [done('a', '2026-11-01'), done('a', '2026-11-03')];
		expect(replayXp(history, [stack], habits, ['2026-11-02'])).toBe(35);
		// without the rest day the streak restarts at 1
		expect(replayXp(history, [stack], habits)).toBe(30);
	});
});
