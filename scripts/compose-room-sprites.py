#!/usr/bin/env python3
"""Compose multi-tile room sprites from the 16px piece crops in assets/room.

Run from the repo root:  python3 scripts/compose-room-sprites.py
Writes:
  src/lib/assets/room/rug.png          (96x80, 6x5 tiles)
  src/lib/assets/room/bookshelf.png    (48x16, 3x1 tiles)
  src/lib/assets/room/bed.png          (15x25, head tile + blanket rows of the body tile)
  src/lib/assets/room/sleeping-bag.png (16x11, the bag half of floorbed.png)
  src/lib/assets/room/nightstand.png   (recoloured in place: sheet-bleed white -> wood)
  src/lib/assets/room/character.png    (16x32, the roommate: row 0 stand, row 1 walk)

One sprite per object: the renderer places a single <img> per object instead
of stacking per-tile entries, and the item catalog (src/lib/room/catalog.ts)
carries the composed sprite with its native pixel size + footprint. The piece
crops stay in assets/room as the composition source and provenance.
"""
from PIL import Image
from pathlib import Path

ROOM = Path(__file__).resolve().parent.parent / "src" / "lib" / "assets" / "room"
TILE = 16  # Kenney tiles are 16px on a 17px pitch; crops already sliced to 16px

# rug.png: 6x5 grid of the Kenney 3x3 rug set -- corners, edges, fill centers
RUG_PIECES = [
    ["rug-tl", "rug-t", "rug-t", "rug-t", "rug-t", "rug-tr"],
    ["rug-l", "rug-c", "rug-c", "rug-c", "rug-c", "rug-r"],
    ["rug-l", "rug-c", "rug-c", "rug-c", "rug-c", "rug-r"],
    ["rug-l", "rug-c", "rug-c", "rug-c", "rug-c", "rug-r"],
    ["rug-bl", "rug-b", "rug-b", "rug-b", "rug-b", "rug-br"],
]

BOOKSHELF_PIECES = [["bookshelf-1", "bookshelf-2", "bookshelf-3"]]

# bed.png: the Kenney pair (col 14, rows 5-6). Both tiles repeat the wooden
# headboard in rows 0-5, so pasting them whole reads as two stacked beds.
# Keep the head tile whole and append only the body tile's blanket + footer
# rows, dropping the blank left column of both.
BED_HEAD_CROP = (1, 1, 16, 16)
BED_BODY_CROP = (1, 6, 16, 16)

# sleeping-bag.png: floorbed.png pairs a bag with a rolled mat; on its own the
# bag reads clearly as a bed on the floor.
SLEEPING_BAG_CROP = (0, 3, 16, 14)

# nightstand.png was sliced with the neighbouring tile's white frame on top.
NIGHTSTAND_RECOLOR = {(255, 255, 255): (143, 103, 63), (227, 227, 227): (115, 80, 48)}


def compose(pieces: list[list[str]], out_name: str) -> None:
    rows = len(pieces)
    cols = len(pieces[0])
    sheet = Image.new("RGBA", (cols * TILE, rows * TILE), (0, 0, 0, 0))
    for r, row in enumerate(pieces):
        for c, piece in enumerate(row):
            tile = Image.open(ROOM / f"{piece}.png").convert("RGBA")
            if tile.size != (TILE, TILE):
                raise SystemExit(f"{piece}.png is {tile.size}, expected ({TILE},{TILE})")
            sheet.paste(tile, (c * TILE, r * TILE))
    sheet.save(ROOM / out_name)
    print(f"{out_name}: {sheet.size[0]}x{sheet.size[1]}")


def compose_bed() -> None:
    head = Image.open(ROOM / "bed-half-head.png").convert("RGBA").crop(BED_HEAD_CROP)
    body = Image.open(ROOM / "bed-half-body.png").convert("RGBA").crop(BED_BODY_CROP)
    bed = Image.new("RGBA", (head.width, head.height + body.height), (0, 0, 0, 0))
    bed.paste(head, (0, 0))
    bed.paste(body, (0, head.height))
    bed.save(ROOM / "bed.png")
    print(f"bed.png: {bed.size[0]}x{bed.size[1]}")


# The roommate: layers of the Kenney avatar kit share one 16x16 grid.
CHAR_FRAMES = [
    ("char-stand", ["char-base", "char-chest", "char-legs-a"]),
    ("char-walk", ["char-base", "char-chest", "char-legs-b"]),
]


def compose_character() -> None:
    frames = []
    for name, layers in CHAR_FRAMES:
        frame = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
        for layer in layers:
            frame.alpha_composite(Image.open(ROOM / f"{layer}.png").convert("RGBA"))
        frame.save(ROOM / f"{name}.png")
        frames.append(frame)
    sheet = Image.new("RGBA", (TILE, TILE * len(frames)), (0, 0, 0, 0))
    for i, frame in enumerate(frames):
        sheet.paste(frame, (0, i * TILE))
    sheet.save(ROOM / "character.png")
    print(f"character.png: {sheet.size[0]}x{sheet.size[1]}")


def crop_sleeping_bag() -> None:
    bag = Image.open(ROOM / "floorbed.png").convert("RGBA").crop(SLEEPING_BAG_CROP)
    bag.save(ROOM / "sleeping-bag.png")
    print(f"sleeping-bag.png: {bag.size[0]}x{bag.size[1]}")


def recolor_nightstand() -> None:
    img = Image.open(ROOM / "nightstand.png").convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in NIGHTSTAND_RECOLOR:
                px[x, y] = (*NIGHTSTAND_RECOLOR[(r, g, b)], a)
    img.save(ROOM / "nightstand.png")
    print("nightstand.png: recoloured")


if __name__ == "__main__":
    compose(RUG_PIECES, "rug.png")
    compose(BOOKSHELF_PIECES, "bookshelf.png")
    compose_bed()
    crop_sleeping_bag()
    recolor_nightstand()
    compose_character()