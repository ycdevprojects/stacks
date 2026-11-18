// Cozy room layout — CC0 sprites merged from the packs documented in CREDITS.md.
// Coordinates use a 10x10 tile grid inside a 1:1 hero (2x content scale versus
// the original 20x25 portrait: fewer, bigger tiles, denser composition):
// wall rows 0-1.5, floor rows 1.5-10.
// Painter order of ROOM_PLACEMENTS is intentional — later entries render on top.
// A placement is just a kind reference + position + reveal window: sprite,
// footprint size and alt text come from the item-kind catalog (catalog.ts),
// so swapping a sprite or rebalancing a footprint is a one-line catalog change.
// The scripted layout below validates itself against the placement engine
// (placement.ts) in layout.test.ts.
import { footprintH, kindOf, spriteFor } from './catalog';
import wallTile from '$lib/assets/room/wall.png';
import wallBaseTile from '$lib/assets/room/wall-base.png';
import floorTile from '$lib/assets/room/floor.png';

export const ROOM_GRID = { cols: 10, rows: 10, wallRows: 1.5 } as const;

export const TILE_URLS = {
	wall: wallTile,
	wallBase: wallBaseTile,
	floor: floorTile
} as const;

export interface RoomPlacement {
	/** Unique, stable — DOM data-test ids and future saved-user-rooms key on it. */
	id: string;
	/** Item-kind catalog reference (catalog.ts). */
	kindId: string;
	/** left/top in tile units (fractions allowed for on-furniture stacking). */
	x: number;
	y: number;
	/**
	 * First stage at which the item is revealed. Scripted placements set it;
	 * the documented user-save contract (`{ id, kindId, x, y, source: 'user' }`)
	 * omits it — user items skip the gate entirely.
	 */
	stage?: number;
	/** optional last stage at which the item is still visible (exclusive) */
	until?: number;
	/** `'user'` placements (player-placed items) skip the stage gate. */
	source?: 'user';
	/** Also requires this profile level (level decor). */
	level?: number;
	/** Only shown in these months (0 = January) — seasonal pieces. */
	months?: number[];
	/** Also requires a best streak of at least this many days (trophies). */
	streak?: number;
}

/**
 * Stage-gated reveals (cumulative profile XP):
 * 1 bare (sleeping bag, crate with lamp, windows) -> 2 desk+chair ->
 * 3 desk sprout+poster+floor plant -> 4 proper bed+nightstand+rug (retires the
 * sleeping bag) -> 5 pet+bookshelf+second plant -> 6 media shelf+speaker.
 * Rug is a composed 6-tile x 5-tile sprite; bookshelf is a composed 3-tile strip.
 */
export const ROOM_PLACEMENTS: RoomPlacement[] = [
	{ id: 'window', kindId: 'window', x: 6.95, y: 0.08, stage: 1 },
	{ id: 'window-left', kindId: 'window', x: 0.3, y: 0.08, stage: 1 },
	{ id: 'shelf-media', kindId: 'shelf-media', x: 8.9, y: 0.15, stage: 6 },
	{ id: 'speaker', kindId: 'speaker', x: 9.05, y: 0.18, stage: 6 },
	{ id: 'bookshelf', kindId: 'bookshelf', x: 4.2, y: 0.62, stage: 5 },
	{ id: 'poster', kindId: 'poster', x: 1.25, y: 0.12, stage: 3 },
	{ id: 'lamp', kindId: 'lamp', x: 8.72, y: 3.9, stage: 1 },
	{ id: 'desk', kindId: 'desk', x: 6.4, y: 1.55, stage: 2 },
	{ id: 'chair', kindId: 'chair', x: 7.25, y: 2.7, stage: 2 },
	{ id: 'sprout', kindId: 'sprout', x: 7.35, y: 1.1, stage: 3 },
	{ id: 'bed', kindId: 'bed', x: 0.3, y: 1.55, stage: 4 },
	{ id: 'nightstand', kindId: 'nightstand', x: 2.1, y: 1.7, stage: 4 },
	{ id: 'floorbed', kindId: 'floorbed', x: 0.4, y: 2, stage: 1, until: 4 },
	{ id: 'crate', kindId: 'crate', x: 8.6, y: 4.4, stage: 1 },
	{ id: 'plant', kindId: 'plant', x: 0.4, y: 8.5, stage: 3 },
	{ id: 'plant-right', kindId: 'plant', x: 8.6, y: 8.4, stage: 5 },
	{ id: 'rug', kindId: 'rug', x: 2, y: 4.75, stage: 4 },
	{ id: 'pet', kindId: 'pet', x: 4.55, y: 6.85, stage: 5 },

	// Streak trophies on a little wall shelf (best streak 7 / 30 / 100 days).
	{ id: 'trophy-shelf', kindId: 'trophy-shelf', x: 2.15, y: 0.95, stage: 1, streak: 7 },
	{ id: 'trophy-bronze', kindId: 'trophy-bronze', x: 2.3, y: 0.58, stage: 1, streak: 7 },
	{ id: 'trophy-silver', kindId: 'trophy-silver', x: 2.64, y: 0.58, stage: 1, streak: 30 },
	{ id: 'trophy-gold', kindId: 'trophy-gold', x: 2.98, y: 0.58, stage: 1, streak: 100 },

	// Seasonal: one visitor every month, sharing one corner (months never overlap).
	{ id: 'snow-globe', kindId: 'snow-globe', x: 1.15, y: 6.5, stage: 1, months: [0] },
	{ id: 'heart-balloon', kindId: 'heart-balloon', x: 1.2, y: 6.15, stage: 1, months: [1] },
	{ id: 'tulips', kindId: 'tulips', x: 1.15, y: 6.3, stage: 1, months: [2, 3, 4] },
	{ id: 'beach-ball', kindId: 'beach-ball', x: 1.1, y: 6.45, stage: 1, months: [5, 6, 7] },
	{ id: 'sunflower', kindId: 'sunflower', x: 1.2, y: 6.0, stage: 1, months: [8] },
	{ id: 'pumpkin', kindId: 'pumpkin', x: 1.05, y: 5.95, stage: 1, months: [9, 10] },
	{ id: 'pine', kindId: 'pine', x: 1.0, y: 5.85, stage: 1, months: [11] },

	// Level decor: one piece per level once the room is complete (see DECOR_ORDER).
	{ id: 'mug', kindId: 'mug', x: 8.35, y: 1.5, stage: 6, level: 9 },
	{ id: 'cat', kindId: 'cat', x: 6.6, y: 8.3, stage: 6, level: 10 },
	{ id: 'clock', kindId: 'clock', x: 8.1, y: 0.2, stage: 6, level: 11 },
	{ id: 'beanbag', kindId: 'beanbag', x: 3.5, y: 2.9, stage: 6, level: 12 },
	{ id: 'table-lamp', kindId: 'table-lamp', x: 2.35, y: 1.3, stage: 6, level: 13 },
	{ id: 'guitar', kindId: 'guitar', x: 9.35, y: 5.8, stage: 6, level: 14 },
	{ id: 'laptop', kindId: 'laptop', x: 6.5, y: 1.48, stage: 6, level: 15 },
	{ id: 'hanging-plant', kindId: 'hanging-plant', x: 3.55, y: 0.05, stage: 6, level: 16 },
	{ id: 'floor-lamp', kindId: 'floor-lamp', x: 5.85, y: 1.6, stage: 6, level: 17 },
	{ id: 'books', kindId: 'books', x: 0.3, y: 5.2, stage: 6, level: 18 },
	{ id: 'cactus', kindId: 'cactus', x: 1.0, y: 7.2, stage: 6, level: 19 },
	{ id: 'record-player', kindId: 'record-player', x: 8.4, y: 7.3, stage: 6, level: 20 }
];

/** Level decor in unlock order. */
export const DECOR_ORDER: RoomPlacement[] = ROOM_PLACEMENTS.filter((p) => p.level !== undefined).sort(
	(a, b) => (a.level ?? 0) - (b.level ?? 0)
);

/** What the room is showing: the stage plus the extra gates. */
export interface RoomContext {
	stage: number;
	level: number;
	/** 0 = January. */
	month: number;
	bestStreak: number;
	/** Chosen style per placement id. */
	styles?: Record<string, string>;
}

/** Is a placement revealed in this room context? */
export function isVisible(
	p: Pick<RoomPlacement, 'stage' | 'until' | 'source' | 'level' | 'months' | 'streak'>,
	ctx: Omit<RoomContext, 'styles'>
): boolean {
	if (p.source === 'user') return true;
	if (ctx.stage < (p.stage ?? 1)) return false;
	if (p.until !== undefined && ctx.stage >= p.until) return false;
	if (p.level !== undefined && ctx.level < p.level) return false;
	if (p.streak !== undefined && ctx.bestStreak < p.streak) return false;
	if (p.months && !p.months.includes(ctx.month)) return false;
	return true;
}

export interface RoomItem {
	id: string;
	kindId: string;
	src: string;
	/** left/top in tile units. */
	x: number;
	y: number;
	/** size in tile units; h derives from the native sprite aspect (see catalog). */
	w: number;
	h: number;
	/** first stage at which the item is revealed (undefined for user items) */
	stage?: number;
	/** optional last stage at which the item is still visible (exclusive) */
	until?: number;
	/** `'user'` placements skip the stage gate in the component. */
	source?: 'user';
	level?: number;
	months?: number[];
	streak?: number;
	alt: string;
}

/** Resolve a placement against its kind: sprite src (in the chosen style), size and alt text. */
export function resolveItem(p: RoomPlacement, styles: Record<string, string> = {}): RoomItem {
	const kind = kindOf(p.kindId);
	return {
		id: p.id,
		kindId: kind.id,
		src: spriteFor(kind, styles[p.id]),
		x: p.x,
		y: p.y,
		w: kind.footprintW,
		h: footprintH(kind),
		stage: p.stage,
		until: p.until,
		source: p.source,
		level: p.level,
		months: p.months,
		streak: p.streak,
		alt: kind.alt
	};
}

/** Render-ready items in painter order — what LofiRoom.svelte draws (default styles). */
export const ROOM_ITEMS: RoomItem[] = ROOM_PLACEMENTS.map((p) => resolveItem(p));

function placementById(id: string): RoomPlacement {
	const p = ROOM_PLACEMENTS.find((item) => item.id === id);
	if (!p) throw new Error(`No room placement with id: ${id}`);
	return p;
}

/**
 * Derived anchors, raw floats — consumers round at the CSS boundary (the
 * component formats every position to 4 decimal places of the scene).
 */
function centerOf(id: string): { x: number; y: number } {
	const p = placementById(id);
	const kind = kindOf(p.kindId);
	return { x: p.x + kind.footprintW / 2, y: p.y + footprintH(kind) / 2 };
}

/** Rect of a placement: raw floats; consumers round at the CSS boundary. */
function rectOfId(id: string): { x: number; y: number; w: number; h: number } {
	const p = placementById(id);
	const kind = kindOf(p.kindId);
	return { x: p.x, y: p.y, w: kind.footprintW, h: footprintH(kind) };
}

/** Where the lamp (and its glow) stands — derived from the `lamp` placement. */
export const LAMP_SPOT = centerOf('lamp');

/** The window (source of the night rain layer) — derived from the `window` placement. */
export const WINDOW_SPOT = rectOfId('window');
/** Render-ready visible items for a room context, in painter order, in the chosen styles. */
export function visibleItems(ctx: RoomContext): RoomItem[] {
	return ROOM_PLACEMENTS.filter((p) => isVisible(p, ctx)).map((p) => resolveItem(p, ctx.styles));
}
