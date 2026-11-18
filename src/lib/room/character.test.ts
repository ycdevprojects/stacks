import { describe, it, expect } from 'vitest';
import { characterState, availableSpots, walkableCells, walkPath, SPOTS } from './character';
import { visibleItems, type RoomContext } from './layout';
import { MAX_STAGE } from './room-stage';

const ctx = (stage: number, extra: Partial<RoomContext> = {}): RoomContext => ({
	stage,
	level: 0,
	month: 5,
	bestStreak: 0,
	...extra
});
// Everything unlocked, in a month with a seasonal piece out.
const FULL = ctx(MAX_STAGE, { level: 99, bestStreak: 999, month: 11 });
// Every stage, plus a full room and a stage-1 room in every month (each brings a different seasonal piece).
const CONTEXTS = [1, 2, 3, 4, 5, 6]
	.map((s) => ctx(s))
	.concat(Array.from({ length: 12 }, (_, month) => [{ ...FULL, month }, ctx(1, { month, bestStreak: 100 })]).flat());

const day = { period: 'day' as const, sleepy: false };
const night = { period: 'night' as const, sleepy: false };
const at = (h: number, m: number, s = 0) => new Date(2026, 10, 17, h, m, s);

describe('character spots', () => {
	it('stand on free floor in every room context', () => {
		for (const c of CONTEXTS) {
			const items = visibleItems(c);
			const free = walkableCells(items);
			for (const spot of availableSpots(items, 'day')) {
				const cell = spot.approach ?? spot;
				expect(free.has(`${cell.x}:${cell.y}`), `${spot.id} at stage ${c.stage}`).toBe(true);
			}
		}
	});

	it('are all reachable from each other', () => {
		for (const c of CONTEXTS) {
			const items = visibleItems(c);
			const free = walkableCells(items);
			const spots = availableSpots(items, 'day');
			for (const a of spots) {
				for (const b of spots) {
					expect(walkPath(a.approach ?? a, b.approach ?? b, free), `${a.id} -> ${b.id}`).not.toBeNull();
				}
			}
		}
	});

	it('always offers at least two daytime spots', () => {
		for (const c of CONTEXTS) expect(availableSpots(visibleItems(c), 'day').length).toBeGreaterThanOrEqual(2);
	});

	it('reference real placements', () => {
		const ids = new Set(visibleItems(FULL).map((i) => i.id).concat(visibleItems(ctx(1)).map((i) => i.id)));
		for (const s of SPOTS) if (s.needs) expect(ids.has(s.needs), s.id).toBe(true);
	});
});

describe('characterState', () => {
	it('sleeps in the sleeping bag early on and in the bed later', () => {
		expect(characterState(visibleItems(ctx(1)), night, at(23, 0)).activity).toMatch(/sleeping bag/);
		const late = characterState(visibleItems(ctx(5)), night, at(23, 0));
		expect(late.pose).toBe('sleep');
		expect(late.zzzAt).toBeDefined();
	});

	it('naps when the room is sleepy, even by day', () => {
		expect(characterState(visibleItems(ctx(4)), { period: 'day', sleepy: true }, at(12, 0)).pose).toBe('sleep');
	});

	it('is deterministic for the same moment', () => {
		const items = visibleItems(FULL);
		expect(characterState(items, day, at(14, 3, 10))).toEqual(characterState(items, day, at(14, 3, 10)));
	});

	it('settles at a spot once the walk is over', () => {
		const s = characterState(visibleItems(FULL), day, at(14, 7, 50));
		expect(s.pose).toBe('stand');
		expect(SPOTS.some((spot) => spot.activity === s.activity)).toBe(true);
	});

	it('walks along free cells at the start of a slot', () => {
		const items = visibleItems(FULL);
		const free = walkableCells(items);
		for (let sec = 0; sec < 20; sec++) {
			for (let slot = 0; slot < 30; slot++) {
				const s = characterState(items, day, at(9, slot * 8, sec));
				if (s.pose === 'walk') expect(free.has(`${s.x}:${s.y}`)).toBe(true);
			}
		}
	});
});
