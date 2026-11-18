#!/usr/bin/env python3
"""Draw the room's decor, seasonal and trophy sprites, and the style variants.

Run from the repo root:  python3 scripts/draw-room-decor.py   (needs Pillow)

Decor sprites are original pixel art drawn here from text maps, using the
palette of the CC0 Kenney pieces so they sit in the same room. Variants are
recolours of existing sprites (only the strongly saturated "fabric" pixels
are shifted, so wood and outlines stay put).

Writes:
  src/lib/assets/room/decor/<name>.png
  src/lib/assets/room/variants/<sprite>-<variant>.png
"""
import colorsys
from pathlib import Path

from PIL import Image

ROOM = Path(__file__).resolve().parent.parent / "src" / "lib" / "assets" / "room"
DECOR = ROOM / "decor"
VARIANTS = ROOM / "variants"

PALETTE = {
    "K": "#141b1b",  # outline
    "W": "#ffffff",
    "w": "#fff4c9",  # warm white
    "c": "#e6dabf",  # cream
    "b": "#b4a78c",  # cream shadow
    "L": "#c8a480",  # wood light
    "M": "#b98b5e",  # wood
    "D": "#8f673f",  # wood dark
    "E": "#735030",  # wood darkest
    "o": "#e46d3a",  # orange
    "O": "#c66527",
    "r": "#a35422",
    "y": "#ffad5d",  # light orange
    "g": "#88bd32",  # leaf light
    "G": "#648c32",
    "l": "#4ba86d",  # green
    "h": "#307e4d",  # deep green
    "t": "#37aaa5",  # teal
    "T": "#287d79",
    "p": "#f2ad7d",  # pink
    "P": "#cf736d",
    "q": "#8a8a96",  # cat grey
    "Q": "#5f5f6b",
    "R": "#3d3d47",
    "Z": "#404040",  # charcoal
    "u": "#8b6bbf",  # purple
    "U": "#6a4c9c",
    "v": "#b097e0",
    "n": "#df9131",  # gold
    "N": "#b8741c",
    "m": "#ffe6af",
    "j": "#fff07a",  # bulb yellow
    "k": "#d94a4a",  # red
    "i": "#8fd3ff",  # sky
    "I": "#4f8fd6",
    "x": "#26222e",  # vinyl
    "s": "#ffffffaa",  # steam
}

SPRITES = {
    "mug": [
        "..s..s....",
        "...s..s...",
        "..........",
        "cccccccc..",
        "tttttttbb.",
        "ttttttt..b",
        "TTTTTTT..b",
        "cccccccbb.",
        "cccccccc..",
        ".bbbbbb...",
    ],
    "cat": [
        "..................",
        "..Q...Q...........",
        "..QQ.QQ...........",
        "..qQqQq...........",
        "..qqqqqqQ.........",
        "..qRqqRqqqqqqq....",
        "..qqpqqqqqqqqqqQ..",
        "...qqqqqQqqQqqqqQ.",
        "...qqqqqqqqqqqqqQ.",
        "...WqqqqqqqqqqqQq.",
        "....WWQQQQQQQQQqq.",
        "..........qqqqqq..",
        "..................",
    ],
    "clock": [
        "....DDDD....",
        "..DDwwwwDD..",
        ".DwwwKwwwwD.",
        ".DwwwKwwwwD.",
        "DwwwwKwwwwwD",
        "DwwwwKwwwwwD",
        "DwwwwKKKKwwD",
        "DwwwwwwwwwwD",
        ".DwwwwwwwwD.",
        ".DmwwwwwwmD.",
        "..DDmmmmDD..",
        "....DDDD....",
    ],
    "beanbag": [
        "..................",
        ".......uuuu.......",
        ".....uuvvvuuu.....",
        "....uvvvvvvuuu....",
        "...uvvvuuuuuuuu...",
        "...uvuuuuuuuuuuU..",
        "..uuuuuuuuuuuuuU..",
        "..uuuuuuuuuuuuuUU.",
        ".uuuuuuuuuuuuuuUU.",
        ".uUuuuuuuuuuuuUUU.",
        ".UUUuuuuuuuuuUUU..",
        "..UUUUUUUUUUUUUU..",
        "....UUUUUUUUUU....",
        "..................",
    ],
    "table-lamp": [
        "...nnnn...",
        "..nmmmmn..",
        "..nmmmmn..",
        ".nmmmmmmn.",
        ".nmmmmmmn.",
        "nmmmmmmmmn",
        "NNNNNNNNNN",
        "....DD....",
        "....DD....",
        "....DD....",
        "...DDDD...",
        "..EEEEEE..",
    ],
    "guitar": [
        "...EE...",
        "...EE...",
        "...DE...",
        "...DE...",
        "...DE...",
        "...DE...",
        "...DE...",
        "..OOOO..",
        ".OyyyyO.",
        ".OyyyyO.",
        "..OyyO..",
        ".OyyyyO.",
        "OyyKKyyO",
        "OyyKKyyO",
        "OyyyyyyO",
        "OyyEEyyO",
        ".OyyyyO.",
        "..OOOO..",
    ],
    "laptop": [
        ".ZZZZZZZZZZZZ.",
        ".ZIIIIIIIIIIZ.",
        ".ZIiiiiiiiiIZ.",
        ".ZIiIIiiiiiIZ.",
        ".ZIiiiiiiIiIZ.",
        ".ZIIIIIIIIIIZ.",
        ".ZZZZZZZZZZZZ.",
        "qqqqqqqqqqqqqq",
        ".QQQQQQQQQQQQ.",
    ],
    "floor-lamp": [
        ".nnnnnn.",
        "nmmmmmmn",
        "nmmmmmmn",
        "nmmmmmmn",
        "NNNNNNNN",
    ]
    + ["...QQ..."] * 18
    + [
        "..QQQQ..",
        ".QQQQQQ.",
    ],
    "books": [
        "...kkkkkkk..",
        "...kwwwwwk..",
        ".tttttttttt.",
        ".tTTTTTTTTt.",
        "..nnnnnnnnnn",
        "..nNNNNNNNNn",
        "uuuuuuuuuu..",
        "uUUUUUUUUu..",
        ".lllllllllll",
        ".lhhhhhhhhhl",
    ],
    "cactus": [
        "....hh....",
        "...hllh...",
        "...hlgh...",
        ".h.hlgh...",
        "hlhhlgh.h.",
        "hlllllghlh",
        ".hhhlghllh",
        "...hlghhh.",
        "...hlgh...",
        ".OOOOOOOO.",
        ".yyyyyyyy.",
        "..OOOOOO..",
        "..OOOOOO..",
        "...rrrr...",
    ],
    "record-player": [
        "..............",
        "...xxxxxx.....",
        ".xxxRRRRxxx.Q.",
        ".xxRkkkRxxx.Q.",
        ".xxxRRRRxxx.Q.",
        "...xxxxxx...Q.",
        "DDDDDDDDDDDDDD",
        "DLLLLLLLLLLLLD",
        "DLLqLLLLLLqLLD",
        "EEEEEEEEEEEEEE",
    ],
    "hanging-plant": [
        ".....QQ.....",
        "....Q..Q....",
        "...Q....Q...",
        "..Q......Q..",
        ".Q........Q.",
        ".OOOOOOOOOO.",
        "lgOOOOOOOOgl",
        "lg.OOOOOO.gl",
        ".g..gllg..g.",
        ".l..g..g..l.",
        ".g..l..l..g.",
        "....g..g..l.",
        "....l.....g.",
        "..........l.",
    ],
    "pine": [
        "......j......",
        ".....jjj.....",
        "......j......",
        ".....hlh.....",
        "....hlllh....",
        "...hlkllgh...",
        "..hhhlllhhh..",
        "....hllljh...",
        "...hllllllh..",
        "..hlilllkllh.",
        ".hhhhllllhhhh",
        "...hlllllljh.",
        "..hljllllillh",
        ".hlllllkllllh",
        "hhhhhhhhhhhhh",
        ".....DDD.....",
        "....kkkkk....",
        "....kOOOk....",
    ],
    "pumpkin": [
        "......hh......",
        "......Dh......",
        "..rOOOrrOOOr..",
        ".rOyOOrOOyOOr.",
        "rOyOOOrOOOyOOr",
        "rOyOOOrOOOyOOr",
        "rOOOOOrOOOOOOr",
        "rOOOOOrOOOOOOr",
        ".rOOOOrOOOOOr.",
        "..rrrrrrrrrr..",
    ],
    "trophy-shelf": [
        "L" * 40,
        "M" * 40,
        ".." + "D" * 2 + "." * 32 + "D" * 2 + "..",
        ".." + "D" + "." * 34 + "D" + "..",
    ],
}

# Trophy cups: 1 = light, 2 = mid, 3 = dark metal.
TROPHY = [
    "22222222",
    "2.1112.2",
    "2.1122.2",
    ".211222.",
    "..2122..",
    "...22...",
    "...33...",
    "..2222..",
    ".EEEEEE.",
    ".EEEEEE.",
]
METALS = {
    "bronze": ("#f0b27a", "#c07a3a", "#8a5326"),
    "silver": ("#f4f4fa", "#b8b8c8", "#7c7c8c"),
    "gold": ("#fff0a0", "#e8b030", "#a87818"),
}

# Sprites that get a 1px dark outline, like the Kenney pet and crate.
OUTLINED = {"cat", "pumpkin", "beanbag"}


def rgba(hex_color: str) -> tuple[int, int, int, int]:
    h = hex_color.lstrip("#")
    a = int(h[6:8], 16) if len(h) == 8 else 255
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a


def draw(rows: list[str], palette: dict[str, str]) -> Image.Image:
    width = len(rows[0])
    for i, row in enumerate(rows):
        assert len(row) == width, f"row {i} is {len(row)} wide, expected {width}: {row!r}"
    im = Image.new("RGBA", (width, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                im.putpixel((x, y), rgba(palette[ch]))
    return im


def outline(im: Image.Image) -> Image.Image:
    out = im.copy()
    w, h = im.size
    dark = rgba(PALETTE["K"])
    for y in range(h):
        for x in range(w):
            if im.getpixel((x, y))[3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and im.getpixel((nx, ny))[3] == 255:
                    out.putpixel((x, y), dark)
                    break
    return out.crop(out.getbbox())


def shift_hue(
    src: str,
    dst: str,
    degrees: float,
    min_sat: float,
    hue_band: tuple[float, float],
    light: float = 0,
    sat: float = 1,
) -> None:
    """Rotate the hue of saturated pixels whose hue falls in hue_band (degrees)."""
    im = Image.open(ROOM / src).convert("RGBA")
    out = im.copy()
    lo, hi = hue_band
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = im.getpixel((x, y))
            if not a:
                continue
            hh, ll, ss = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if ss < min_sat or not (lo <= hh * 360 <= hi):
                continue
            hh = ((hh * 360 + degrees) % 360) / 360
            ll = min(1, max(0, ll + light))
            ss = min(1, ss * sat)
            nr, ng, nb = colorsys.hls_to_rgb(hh, ll, ss)
            out.putpixel((x, y), (round(nr * 255), round(ng * 255), round(nb * 255), a))
    out.save(VARIANTS / dst)


def main() -> None:
    DECOR.mkdir(exist_ok=True)
    VARIANTS.mkdir(exist_ok=True)
    for name, rows in SPRITES.items():
        im = draw(rows, PALETTE)
        if name in OUTLINED:
            im = outline(im)
        im = im.crop(im.getbbox())
        im.save(DECOR / f"{name}.png")
    for metal, (light, mid, dark) in METALS.items():
        pal = {**PALETTE, "1": light, "2": mid, "3": dark}
        draw(TROPHY, pal).save(DECOR / f"trophy-{metal}.png")

    # Style variants: source, output, hue shift, min saturation, hue band, lightness, saturation scale
    shift_hue("rug.png", "rug-blue.png", 70, 0.15, (90, 180))
    shift_hue("rug.png", "rug-rose.png", 200, 0.15, (90, 180), 0.04)
    shift_hue("bed.png", "bed-blue.png", 190, 0.55, (10, 40), 0, 0.75)
    shift_hue("bed.png", "bed-green.png", 115, 0.55, (10, 40), -0.06, 0.5)
    shift_hue("sleeping-bag.png", "sleeping-bag-blue.png", 70, 0.2, (90, 180))
    shift_hue("sleeping-bag.png", "sleeping-bag-red.png", 220, 0.2, (90, 180))
    shift_hue("poster.png", "poster-teal.png", 150, 0.5, (20, 50), -0.12, 0.55)
    shift_hue("poster.png", "poster-rose.png", -40, 0.5, (20, 50), -0.05, 0.6)


if __name__ == "__main__":
    main()
