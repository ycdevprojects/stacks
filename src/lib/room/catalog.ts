// Item-kind catalog for the rewards room.
// One entry per object species (not per placed copy): the sprite file, its
// native pixel size, and its footprint on the room grid. Placements reference
// kinds by id (see layout.ts), so swapping a sprite or rebalancing a footprint
// is a one-line change here.
//
// Height rules: the renderer sets width + native aspect (`height:auto`), so a
// kind never carries a hardcoded height — footprintH() derives the rendered /
// footprint height as footprintW * spritePx.h / spritePx.w. Tests assert the
// derivation holds for every placement.
// Window panes painted with sky (scripts/draw-room-decor.py); window.png is their source.
import windowImg from '$lib/assets/room/variants/window-day.png';
import windowNightImg from '$lib/assets/room/variants/window-night.png';
import posterImg from '$lib/assets/room/poster.png';
import sleepingBagImg from '$lib/assets/room/sleeping-bag.png';
import crateImg from '$lib/assets/room/crate.png';
import lampImg from '$lib/assets/room/lamp.png';
import deskImg from '$lib/assets/room/desk.png';
import chairImg from '$lib/assets/room/chair.png';
import sproutImg from '$lib/assets/room/sprout.png';
import bedImg from '$lib/assets/room/bed.png';
import nightstandImg from '$lib/assets/room/nightstand.png';
import rugImg from '$lib/assets/room/rug.png';
import bookshelfImg from '$lib/assets/room/bookshelf.png';
import shelfEmptyImg from '$lib/assets/room/shelf-empty.png';
import speakerImg from '$lib/assets/room/speaker.png';
import petImg from '$lib/assets/room/pet.png';
// Original decor drawn by scripts/draw-room-decor.py.
import mugImg from '$lib/assets/room/decor/mug.png';
import catImg from '$lib/assets/room/decor/cat.png';
import clockImg from '$lib/assets/room/decor/clock.png';
import beanbagImg from '$lib/assets/room/decor/beanbag.png';
import tableLampImg from '$lib/assets/room/decor/table-lamp.png';
import guitarImg from '$lib/assets/room/decor/guitar.png';
import laptopImg from '$lib/assets/room/decor/laptop.png';
import hangingPlantImg from '$lib/assets/room/decor/hanging-plant.png';
import floorLampImg from '$lib/assets/room/decor/floor-lamp.png';
import booksImg from '$lib/assets/room/decor/books.png';
import cactusImg from '$lib/assets/room/decor/cactus.png';
import recordPlayerImg from '$lib/assets/room/decor/record-player.png';
import pumpkinImg from '$lib/assets/room/decor/pumpkin.png';
import pineImg from '$lib/assets/room/decor/pine.png';
import snowGlobeImg from '$lib/assets/room/decor/snow-globe.png';
import heartBalloonImg from '$lib/assets/room/decor/heart-balloon.png';
import tulipsImg from '$lib/assets/room/decor/tulips.png';
import beachBallImg from '$lib/assets/room/decor/beach-ball.png';
import sunflowerImg from '$lib/assets/room/decor/sunflower.png';
import appleBasketImg from '$lib/assets/room/decor/apple-basket.png';
import gourdsImg from '$lib/assets/room/decor/gourds.png';
import snowmanImg from '$lib/assets/room/decor/snowman.png';
import firewoodImg from '$lib/assets/room/decor/firewood.png';
import rainBootsImg from '$lib/assets/room/decor/rain-boots.png';
import wateringCanImg from '$lib/assets/room/decor/watering-can.png';
import fanImg from '$lib/assets/room/decor/fan.png';
import lemonadeImg from '$lib/assets/room/decor/lemonade.png';
import trophyShelfImg from '$lib/assets/room/decor/trophy-shelf.png';
import trophyBronzeImg from '$lib/assets/room/decor/trophy-bronze.png';
import trophySilverImg from '$lib/assets/room/decor/trophy-silver.png';
import trophyGoldImg from '$lib/assets/room/decor/trophy-gold.png';
// Style variants (recolours, same script).
import rugBlueImg from '$lib/assets/room/variants/rug-blue.png';
import rugRoseImg from '$lib/assets/room/variants/rug-rose.png';
import bedBlueImg from '$lib/assets/room/variants/bed-blue.png';
import bedGreenImg from '$lib/assets/room/variants/bed-green.png';
import bagBlueImg from '$lib/assets/room/variants/sleeping-bag-blue.png';
import bagRedImg from '$lib/assets/room/variants/sleeping-bag-red.png';
import posterTealImg from '$lib/assets/room/variants/poster-teal.png';
import posterRoseImg from '$lib/assets/room/variants/poster-rose.png';

/** Loose buckets ("furniture", "plants") used by placement rules and labels. */
export type ItemCategory = 'wall-art' | 'furniture' | 'rug' | 'plant' | 'pet' | 'tech' | 'light' | 'decor';

/**
 * Where a kind is allowed to sit:
 * - `wall`       entirely inside the wall band (rows 0 to wallRows) — art,
 *                windows, wall shelves, furniture pushed against the wall
 * - `floor`      entirely on the floor rows (wallRows to bottom)
 * - `on-surface` rests on another item's sprite (see stacksOn instead of a band)
 */
export type ItemZone = 'wall' | 'floor' | 'on-surface';

export interface StackRule {
	/** kind id this item may rest on */
	target: string;
	/**
	 * `top-edge`: the item's bottom edge rests inside the target's square
	 * (sprout on the desk surface, speaker on the media shelf, lamp on the crate).
	 * `front`: the item's top edge is inside the target's square with its body
	 * emerging below the target's bottom (a chair tucked at the desk).
	 * `inside`: the item sits fully within the target's square (pet on the rug).
	 */
	mode: 'top-edge' | 'front' | 'inside';
}

/** An alternative look for a kind; same pixel size as the default sprite. */
export interface ItemVariant {
	id: string;
	label: string;
	sprite: string;
	/** CSS color for the picker swatch. */
	swatch: string;
}

export interface ItemKind {
	id: string;
	/** Human name — shown when the item is tapped in the room. */
	label: string;
	sprite: string;
	/** Native sprite pixels; the source of the aspect that derives footprint height. */
	spritePx: { w: number; h: number };
	/** Width in grid tiles at the canonical placed size. Height derives from the sprite aspect. */
	footprintW: number;
	zone: ItemZone;
	category: ItemCategory;
	/** Rug-category items never block placement (carpet sits under furniture). */
	walkable?: boolean;
	/** Required for zone `on-surface`: the surfaces this kind may rest on. */
	stacksOn?: StackRule[];
	/**
	 * Optional looks the player can pick. The first entry is the default and
	 * uses `sprite`; the rest carry their own recoloured sprite.
	 */
	variants?: ItemVariant[];
	/** Shown instead of `sprite` at night (same pixel size). */
	nightSprite?: string;
	alt: string;
}

export const ITEM_KINDS = {
	window: {
		id: 'window',
		label: 'Window',
		sprite: windowImg,
		nightSprite: windowNightImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 1,
		zone: 'wall',
		category: 'wall-art',
		alt: 'Window with four panes'
	},
	poster: {
		id: 'poster',
		label: 'Framed poster',
		sprite: posterImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 0.7,
		zone: 'wall',
		category: 'wall-art',
		variants: [
			{ id: 'amber', label: 'Amber', sprite: posterImg, swatch: '#df9131' },
			{ id: 'teal', label: 'Teal', sprite: posterTealImg, swatch: '#3f8f93' },
			{ id: 'rose', label: 'Rose', sprite: posterRoseImg, swatch: '#c25a6a' }
		],
		alt: 'Framed poster on the wall'
	},
	'shelf-media': {
		id: 'shelf-media',
		label: 'Media shelf',
		sprite: shelfEmptyImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 0.8,
		zone: 'wall',
		category: 'furniture',
		alt: 'Media shelf against the wall'
	},
	speaker: {
		id: 'speaker',
		label: 'Speaker',
		sprite: speakerImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 0.4,
		zone: 'on-surface',
		category: 'tech',
		stacksOn: [{ target: 'shelf-media', mode: 'top-edge' }],
		alt: 'Speaker sitting on the media shelf'
	},
	lamp: {
		id: 'lamp',
		label: 'Candelabra lamp',
		sprite: lampImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 0.75,
		zone: 'on-surface',
		category: 'light',
		stacksOn: [{ target: 'crate', mode: 'top-edge' }],
		alt: 'Lit candelabra standing on the storage crate'
	},
	desk: {
		id: 'desk',
		label: 'Desk',
		sprite: deskImg,
		spritePx: { w: 32, h: 16 },
		footprintW: 2.6,
		zone: 'floor',
		category: 'furniture',
		alt: 'Small wooden desk against the wall'
	},
	chair: {
		id: 'chair',
		label: 'Chair',
		sprite: chairImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 1.3,
		zone: 'floor',
		category: 'furniture',
		/**
		 * Soft rule: the scripted layout tucks the chair in front of the desk;
		 * canPlace() still lets users park a chair anywhere on the floor.
		 */
		stacksOn: [{ target: 'desk', mode: 'front' }],
		alt: 'Wooden chair tucked at the desk'
	},
	sprout: {
		id: 'sprout',
		label: 'Potted sprout',
		sprite: sproutImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 0.75,
		zone: 'on-surface',
		category: 'plant',
		stacksOn: [{ target: 'desk', mode: 'top-edge' }],
		alt: 'Little potted sprout on the desk'
	},
	bed: {
		id: 'bed',
		label: 'Bed',
		sprite: bedImg,
		spritePx: { w: 15, h: 25 },
		footprintW: 1.7,
		zone: 'floor',
		category: 'furniture',
		variants: [
			{ id: 'orange', label: 'Orange', sprite: bedImg, swatch: '#c66527' },
			{ id: 'blue', label: 'Blue', sprite: bedBlueImg, swatch: '#3f6fb0' },
			{ id: 'green', label: 'Green', sprite: bedGreenImg, swatch: '#4f8a55' }
		],
		alt: 'Proper bed with a cozy blanket against the wall'
	},
	nightstand: {
		id: 'nightstand',
		label: 'Nightstand',
		sprite: nightstandImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 1,
		zone: 'floor',
		category: 'furniture',
		alt: 'Small bedside cabinet next to the bed'
	},
	floorbed: {
		id: 'floorbed',
		label: 'Sleeping bag',
		sprite: sleepingBagImg,
		spritePx: { w: 16, h: 11 },
		footprintW: 1.9,
		zone: 'floor',
		category: 'furniture',
		variants: [
			{ id: 'green', label: 'Green', sprite: sleepingBagImg, swatch: '#4ba86d' },
			{ id: 'blue', label: 'Blue', sprite: bagBlueImg, swatch: '#4b7ba8' },
			{ id: 'red', label: 'Red', sprite: bagRedImg, swatch: '#a8524b' }
		],
		alt: 'Sleeping bag rolled out on the floor'
	},
	plant: {
		id: 'plant',
		label: 'Floor plant',
		sprite: sproutImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 1.1,
		zone: 'floor',
		category: 'plant',
		alt: 'Leafy potted plant on the floor'
	},
	crate: {
		id: 'crate',
		label: 'Storage crate',
		sprite: crateImg,
		spritePx: { w: 14, h: 15 },
		footprintW: 1,
		zone: 'floor',
		category: 'furniture',
		alt: 'Simple wooden storage box'
	},
	bookshelf: {
		id: 'bookshelf',
		label: 'Bookshelf row',
		sprite: bookshelfImg,
		spritePx: { w: 48, h: 16 },
		footprintW: 2.55,
		zone: 'wall',
		category: 'furniture',
		alt: 'Three bookshelves with colorful book spines against the wall'
	},
	rug: {
		id: 'rug',
		label: 'Woven rug',
		sprite: rugImg,
		spritePx: { w: 96, h: 80 },
		footprintW: 6,
		zone: 'floor',
		category: 'rug',
		walkable: true,
		variants: [
			{ id: 'green', label: 'Moss', sprite: rugImg, swatch: '#5fae6e' },
			{ id: 'blue', label: 'Lake', sprite: rugBlueImg, swatch: '#5f86ae' },
			{ id: 'rose', label: 'Rose', sprite: rugRoseImg, swatch: '#b9677f' }
		],
		alt: 'Large woven rug covering a third of the floor'
	},
	pet: {
		id: 'pet',
		label: 'Pet pig',
		sprite: petImg,
		spritePx: { w: 16, h: 16 },
		footprintW: 0.9,
		zone: 'floor',
		category: 'pet',
		/**
		 * Explicit pet-on-carpet rule (mode 'inside'). Rug-vs-pet legality also
		 * holds via the rug's walkable flag; the declared rule documents intent
		 * and pins the inside geometry. Soft on zone 'floor' — a pet may roam.
		 */
		stacksOn: [{ target: 'rug', mode: 'inside' }],
		alt: 'Pet pig napping on the rug'
	},

	// ---- Level decor (one per level after the room is complete) ----
	mug: {
		id: 'mug',
		label: 'Coffee mug',
		sprite: mugImg,
		spritePx: { w: 10, h: 10 },
		footprintW: 0.42,
		zone: 'on-surface',
		category: 'decor',
		stacksOn: [{ target: 'desk', mode: 'top-edge' }],
		alt: 'Steaming mug on the desk'
	},
	cat: {
		id: 'cat',
		label: 'Cat',
		sprite: catImg,
		spritePx: { w: 17, h: 13 },
		footprintW: 1,
		zone: 'floor',
		category: 'pet',
		stacksOn: [{ target: 'rug', mode: 'inside' }],
		alt: 'Grey cat curled up asleep on the rug'
	},
	clock: {
		id: 'clock',
		label: 'Wall clock',
		sprite: clockImg,
		spritePx: { w: 12, h: 12 },
		footprintW: 0.6,
		zone: 'wall',
		category: 'decor',
		alt: 'Round wall clock'
	},
	beanbag: {
		id: 'beanbag',
		label: 'Beanbag',
		sprite: beanbagImg,
		spritePx: { w: 18, h: 14 },
		footprintW: 1.25,
		zone: 'floor',
		category: 'furniture',
		alt: 'Squishy purple beanbag'
	},
	'table-lamp': {
		id: 'table-lamp',
		label: 'Bedside lamp',
		sprite: tableLampImg,
		spritePx: { w: 10, h: 12 },
		footprintW: 0.5,
		zone: 'on-surface',
		category: 'light',
		stacksOn: [{ target: 'nightstand', mode: 'top-edge' }],
		alt: 'Little lamp on the nightstand'
	},
	guitar: {
		id: 'guitar',
		label: 'Guitar',
		sprite: guitarImg,
		spritePx: { w: 8, h: 18 },
		footprintW: 0.5,
		zone: 'floor',
		category: 'decor',
		alt: 'Acoustic guitar leaning by the wall'
	},
	laptop: {
		id: 'laptop',
		label: 'Laptop',
		sprite: laptopImg,
		spritePx: { w: 14, h: 9 },
		footprintW: 0.85,
		zone: 'on-surface',
		category: 'tech',
		stacksOn: [{ target: 'desk', mode: 'top-edge' }],
		alt: 'Open laptop on the desk'
	},
	'hanging-plant': {
		id: 'hanging-plant',
		label: 'Hanging plant',
		sprite: hangingPlantImg,
		spritePx: { w: 12, h: 14 },
		footprintW: 0.6,
		zone: 'wall',
		category: 'plant',
		alt: 'Trailing plant in a hanging pot'
	},
	'floor-lamp': {
		id: 'floor-lamp',
		label: 'Floor lamp',
		sprite: floorLampImg,
		spritePx: { w: 8, h: 25 },
		footprintW: 0.45,
		zone: 'floor',
		category: 'light',
		alt: 'Tall floor lamp'
	},
	books: {
		id: 'books',
		label: 'Book pile',
		sprite: booksImg,
		spritePx: { w: 12, h: 10 },
		footprintW: 0.7,
		zone: 'floor',
		category: 'decor',
		alt: 'A wobbly pile of books'
	},
	cactus: {
		id: 'cactus',
		label: 'Cactus',
		sprite: cactusImg,
		spritePx: { w: 10, h: 14 },
		footprintW: 0.6,
		zone: 'floor',
		category: 'plant',
		alt: 'Small cactus in a terracotta pot'
	},
	'record-player': {
		id: 'record-player',
		label: 'Record player',
		sprite: recordPlayerImg,
		spritePx: { w: 14, h: 9 },
		footprintW: 0.9,
		zone: 'floor',
		category: 'tech',
		alt: 'Record player with a spinning vinyl'
	},

	// ---- Seasonal ----
	snowman: {
		id: 'snowman',
		label: 'Snowman plush',
		sprite: snowmanImg,
		spritePx: { w: 10, h: 13 },
		footprintW: 0.55,
		zone: 'floor',
		category: 'decor',
		alt: 'Little snowman plush in a red hat and scarf'
	},
	firewood: {
		id: 'firewood',
		label: 'Firewood',
		sprite: firewoodImg,
		spritePx: { w: 14, h: 8 },
		footprintW: 0.8,
		zone: 'floor',
		category: 'decor',
		alt: 'A stack of firewood'
	},
	'rain-boots': {
		id: 'rain-boots',
		label: 'Rain boots',
		sprite: rainBootsImg,
		spritePx: { w: 12, h: 9 },
		footprintW: 0.65,
		zone: 'floor',
		category: 'decor',
		alt: 'Pair of yellow rain boots'
	},
	'watering-can': {
		id: 'watering-can',
		label: 'Watering can',
		sprite: wateringCanImg,
		spritePx: { w: 13, h: 8 },
		footprintW: 0.8,
		zone: 'floor',
		category: 'decor',
		alt: 'Teal watering can'
	},
	fan: {
		id: 'fan',
		label: 'Desk fan',
		sprite: fanImg,
		spritePx: { w: 10, h: 14 },
		footprintW: 0.55,
		zone: 'floor',
		category: 'tech',
		alt: 'Little electric fan'
	},
	lemonade: {
		id: 'lemonade',
		label: 'Lemonade',
		sprite: lemonadeImg,
		spritePx: { w: 10, h: 11 },
		footprintW: 0.6,
		zone: 'floor',
		category: 'decor',
		alt: 'Pitcher of lemonade on a tray'
	},
	'apple-basket': {
		id: 'apple-basket',
		label: 'Apple basket',
		sprite: appleBasketImg,
		spritePx: { w: 14, h: 9 },
		footprintW: 0.75,
		zone: 'floor',
		category: 'decor',
		alt: 'Woven basket of red and green apples'
	},
	gourds: {
		id: 'gourds',
		label: 'Gourds',
		sprite: gourdsImg,
		spritePx: { w: 14, h: 8 },
		footprintW: 0.7,
		zone: 'floor',
		category: 'decor',
		alt: 'A little pile of autumn gourds'
	},
	'snow-globe': {
		id: 'snow-globe',
		label: 'Snow globe',
		sprite: snowGlobeImg,
		spritePx: { w: 12, h: 12 },
		footprintW: 0.6,
		zone: 'floor',
		category: 'decor',
		alt: 'Snow globe with a tiny tree inside'
	},
	'heart-balloon': {
		id: 'heart-balloon',
		label: 'Heart balloon',
		sprite: heartBalloonImg,
		spritePx: { w: 9, h: 17 },
		footprintW: 0.5,
		zone: 'floor',
		category: 'decor',
		alt: 'Red heart balloon tied to a weight'
	},
	tulips: {
		id: 'tulips',
		label: 'Tulips',
		sprite: tulipsImg,
		spritePx: { w: 9, h: 12 },
		footprintW: 0.6,
		zone: 'floor',
		category: 'plant',
		alt: 'Spring tulips in a teal pot'
	},
	'beach-ball': {
		id: 'beach-ball',
		label: 'Beach ball',
		sprite: beachBallImg,
		spritePx: { w: 12, h: 12 },
		footprintW: 0.65,
		zone: 'floor',
		category: 'decor',
		alt: 'Striped beach ball'
	},
	sunflower: {
		id: 'sunflower',
		label: 'Sunflower',
		sprite: sunflowerImg,
		spritePx: { w: 8, h: 18 },
		footprintW: 0.5,
		zone: 'floor',
		category: 'plant',
		alt: 'Tall sunflower in a pot'
	},
	pumpkin: {
		id: 'pumpkin',
		label: 'Pumpkin',
		sprite: pumpkinImg,
		spritePx: { w: 14, h: 10 },
		footprintW: 0.8,
		zone: 'floor',
		category: 'decor',
		alt: 'Autumn pumpkin'
	},
	pine: {
		id: 'pine',
		label: 'Little tree',
		sprite: pineImg,
		spritePx: { w: 13, h: 18 },
		footprintW: 0.95,
		zone: 'floor',
		category: 'plant',
		alt: 'Little pine tree with fairy lights'
	},

	// ---- Streak trophies ----
	'trophy-shelf': {
		id: 'trophy-shelf',
		label: 'Trophy shelf',
		sprite: trophyShelfImg,
		spritePx: { w: 40, h: 4 },
		footprintW: 1.3,
		zone: 'wall',
		category: 'furniture',
		alt: 'Wall shelf for streak trophies'
	},
	'trophy-bronze': {
		id: 'trophy-bronze',
		label: 'Bronze trophy',
		sprite: trophyBronzeImg,
		spritePx: { w: 8, h: 10 },
		footprintW: 0.32,
		zone: 'on-surface',
		category: 'decor',
		stacksOn: [{ target: 'trophy-shelf', mode: 'top-edge' }],
		alt: 'Bronze trophy for a 7-day streak'
	},
	'trophy-silver': {
		id: 'trophy-silver',
		label: 'Silver trophy',
		sprite: trophySilverImg,
		spritePx: { w: 8, h: 10 },
		footprintW: 0.32,
		zone: 'on-surface',
		category: 'decor',
		stacksOn: [{ target: 'trophy-shelf', mode: 'top-edge' }],
		alt: 'Silver trophy for a 30-day streak'
	},
	'trophy-gold': {
		id: 'trophy-gold',
		label: 'Gold trophy',
		sprite: trophyGoldImg,
		spritePx: { w: 8, h: 10 },
		footprintW: 0.32,
		zone: 'on-surface',
		category: 'decor',
		stacksOn: [{ target: 'trophy-shelf', mode: 'top-edge' }],
		alt: 'Gold trophy for a 100-day streak'
	}
} as const satisfies Record<string, ItemKind>;

/** Catalog lookup; throws on unknown ids so bad placements fail loudly in tests. */
export function kindOf(id: string): ItemKind {
	const kind = (ITEM_KINDS as Record<string, ItemKind>)[id];
	if (!kind) throw new Error(`Unknown room item kind: ${id}`);
	return kind;
}

/** Every kind, in catalog declaration order. */
export const KIND_LIST: readonly ItemKind[] = Object.values(ITEM_KINDS as Record<string, ItemKind>);

/** Sprite for a kind in the chosen style (falls back to the default). */
export function spriteFor(kind: ItemKind, variantId: string | undefined): string {
	return kind.variants?.find((v) => v.id === variantId)?.sprite ?? kind.sprite;
}

/** Rendered / footprint height of a kind: width scaled by the native sprite aspect. */
export function footprintH(kind: ItemKind): number {
	return (kind.footprintW * kind.spritePx.h) / kind.spritePx.w;
}