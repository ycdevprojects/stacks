// The room's resident: a little character who lives in the room.
// Pure time-state: where they are and what they're doing is a function of the
// visible furniture, the mood and the wall clock (plus a per-day seed), so the
// renderer just derives it and tests can pin it. Walks route around furniture
// on half-tile cells.

import { ROOM_GRID, type RoomItem } from './layout';
import { kindOf } from './catalog';
import type { RoomMood } from './room-stage';

export type Pose = 'stand' | 'walk' | 'sleep';

/** The character is 1x1 tiles; x,y is the sprite's top-left corner in tiles. */
export interface CharacterState {
	x: number;
	y: number;
	pose: Pose;
	/** What they're up to, shown when tapped. */
	activity: string;
	/** Where the z's float while asleep. */
	zzzAt?: { x: number; y: number };
}

export interface Spot {
	id: string;
	x: number;
	y: number;
	/** Placement that must be visible for this spot to be used. */
	needs?: string;
	period: 'day' | 'night';
	/** Free cell to walk to first, for spots tucked into furniture. */
	approach?: { x: number; y: number };
	/** Z's position for sleep spots. */
	zzz?: { x: number; y: number };
	activity: string;
}

/** Hand-measured against layout.ts. Free-standing spots sit on the half-tile grid; tucked ones use `approach`. */
export const SPOTS: readonly Spot[] = [
	{ id: 'stretch', x: 5.0, y: 4.0, period: 'day', activity: 'Stretching' },
	{ id: 'crate', x: 7.5, y: 5.5, needs: 'crate', period: 'day', activity: 'Rummaging in the crate' },
	{
		id: 'floorbed-sit',
		x: 0.8,
		y: 2.3,
		needs: 'floorbed',
		period: 'day',
		approach: { x: 1, y: 3.5 },
		activity: 'Sitting on the sleeping bag'
	},
	{
		id: 'desk',
		x: 7.4,
		y: 2.5,
		needs: 'chair',
		period: 'day',
		approach: { x: 7.5, y: 4 },
		activity: 'Working at the desk'
	},
	{ id: 'bookshelf', x: 4.5, y: 1.5, needs: 'bookshelf', period: 'day', activity: 'Picking a book' },
	{ id: 'rug', x: 3, y: 6, needs: 'rug', period: 'day', activity: 'Lounging on the rug' },
	{
		id: 'beanbag',
		x: 3.6,
		y: 2.6,
		needs: 'beanbag',
		period: 'day',
		approach: { x: 4, y: 4 },
		activity: 'Sinking into the beanbag'
	},
	{ id: 'cat', x: 5.5, y: 8, needs: 'cat', period: 'day', activity: 'Petting the cat' },
	{ id: 'records', x: 7.5, y: 7, needs: 'record-player', period: 'day', activity: 'Spinning a record' },
	{
		id: 'bed-sleep',
		x: 0.65,
		y: 2.4,
		needs: 'bed',
		period: 'night',
		zzz: { x: 1.3, y: 1.5 },
		activity: 'Fast asleep'
	},
	{
		id: 'floorbed-sleep',
		x: 0.8,
		y: 2.3,
		needs: 'floorbed',
		period: 'night',
		zzz: { x: 1.2, y: 1.7 },
		activity: 'Asleep in the sleeping bag'
	}
];

/** Activity slots rotate every SLOT_MINUTES; walks take STEP_SECONDS per half tile. */
export const SLOT_MINUTES = 8;
const STEP_SECONDS = 0.4;
const CELL = 0.5;

function hashStr(s: string): number {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** Spots available given the visible furniture. */
export function availableSpots(visible: readonly RoomItem[], period: Spot['period']): Spot[] {
	const ids = new Set(visible.map((i) => i.id));
	return SPOTS.filter((s) => s.period === period && (!s.needs || ids.has(s.needs)));
}

const key = (x: number, y: number) => `${x}:${y}`;

/** Half-tile cells (top-left corners) the character can stand on: floor, clear of solid furniture. */
export function walkableCells(visible: readonly RoomItem[]): Set<string> {
	const { cols, rows, wallRows } = ROOM_GRID;
	const solid = visible.filter((i) => !kindOf(i.kindId).walkable && i.y + i.h > wallRows);
	const cells = new Set<string>();
	for (let x = 0; x <= cols - 1; x += CELL) {
		for (let y = wallRows; y <= rows - 1; y += CELL) {
			// sample the cell's centre
			const cx = x + CELL / 2;
			const cy = y + CELL / 2;
			if (!solid.some((i) => cx > i.x && cx < i.x + i.w && cy > i.y && cy < i.y + i.h)) cells.add(key(x, y));
		}
	}
	return cells;
}

const snap = (v: number) => Math.round(v / CELL) * CELL;

/** Shortest half-tile route (excluding the start), or null when there is none. */
export function walkPath(
	from: { x: number; y: number },
	to: { x: number; y: number },
	walkable: Set<string>
): { x: number; y: number }[] | null {
	const start = { x: snap(from.x), y: snap(from.y) };
	const goal = { x: snap(to.x), y: snap(to.y) };
	if (start.x === goal.x && start.y === goal.y) return [];
	const open = new Set(walkable);
	open.add(key(goal.x, goal.y));
	const prev = new Map<string, string | null>([[key(start.x, start.y), null]]);
	const queue = [start];
	while (queue.length) {
		const cur = queue.shift()!;
		if (cur.x === goal.x && cur.y === goal.y) {
			const path: { x: number; y: number }[] = [];
			for (let k: string | null = key(cur.x, cur.y); k; k = prev.get(k) ?? null) {
				const [x, y] = k.split(':').map(Number);
				path.push({ x, y });
			}
			return path.reverse().slice(1);
		}
		for (const [dx, dy] of [
			[CELL, 0],
			[-CELL, 0],
			[0, CELL],
			[0, -CELL]
		]) {
			const n = { x: cur.x + dx, y: cur.y + dy };
			const k = key(n.x, n.y);
			if (!open.has(k) || prev.has(k)) continue;
			prev.set(k, key(cur.x, cur.y));
			queue.push(n);
		}
	}
	return null;
}

function pick(spots: Spot[], slot: number, seed: string): Spot {
	return spots[hashStr(`${seed}:${slot}`) % spots.length];
}

/**
 * The character at a moment. By day they rotate between the available spots
 * every SLOT_MINUTES, walking over at the start of each slot. At night, or
 * when the room is sleepy, they sleep in whichever bed is out.
 */
export function characterState(
	visible: readonly RoomItem[],
	mood: RoomMood,
	now: Date,
	seed = now.toDateString()
): CharacterState {
	if (mood.period === 'night' || mood.sleepy) {
		const bed = availableSpots(visible, 'night')[0];
		if (bed) return { x: bed.x, y: bed.y, pose: 'sleep', activity: bed.activity, zzzAt: bed.zzz };
	}

	const spots = availableSpots(visible, 'day');
	const minute = now.getHours() * 60 + now.getMinutes();
	const slot = Math.floor(minute / SLOT_MINUTES);
	const prevSpot = pick(spots, slot - 1, seed);
	let spot = pick(spots, slot, seed);
	if (spot.id === prevSpot.id && spots.length > 1) spot = spots[(spots.indexOf(spot) + 1) % spots.length];

	const age = (minute - slot * SLOT_MINUTES) * 60 + now.getSeconds();
	if (spot.id !== prevSpot.id) {
		const walkable = walkableCells(visible);
		const from = prevSpot.approach ?? prevSpot;
		const route = walkPath(from, spot.approach ?? spot, walkable) ?? [];
		const step = Math.floor(age / STEP_SECONDS);
		if (step < route.length) {
			const cell = route[step];
			return { x: cell.x, y: cell.y, pose: 'walk', activity: 'On the move' };
		}
	}
	return { x: spot.x, y: spot.y, pose: 'stand', activity: spot.activity };
}
