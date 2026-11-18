import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { KIND_LIST } from './catalog';

// In tests Vite resolves an imported asset to its root-relative path (/src/lib/assets/…).
const fileOf = (sprite: string) => resolve(process.cwd(), '.' + sprite.split('?')[0]);

/** PNG size from the IHDR chunk: width at byte 16, height at byte 20. */
function pngSize(sprite: string): { w: number; h: number } {
	const png = readFileSync(fileOf(sprite));
	return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
}

// The aspect-derived-height system rests on hand-typed spritePx — this pins
// them to the real PNG headers, so a wrong pixel size fails loudly instead of
// drifting into the renderer.
describe('catalog spritePx', () => {
	it('matches the true IHDR dimensions of every sprite file', () => {
		for (const kind of KIND_LIST) {
			expect(pngSize(kind.sprite), kind.id).toEqual(kind.spritePx);
		}
	});

	it('gives every style variant the same pixel size as its default sprite', () => {
		for (const kind of KIND_LIST) {
			for (const v of kind.variants ?? []) {
				expect(pngSize(v.sprite), `${kind.id}/${v.id}`).toEqual(kind.spritePx);
			}
		}
	});

	it('lists the default sprite as the first variant', () => {
		for (const kind of KIND_LIST) {
			if (kind.variants) expect(kind.variants[0].sprite, kind.id).toBe(kind.sprite);
		}
	});
});
