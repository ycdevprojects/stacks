#!/usr/bin/env python3
"""Draw the app icon and splash screens, and write every size the platforms need.

Run from the repo root:  python3 scripts/make-app-icons.py   (needs Pillow)

The motif is pixel art in the room's style: three stacked habit blocks with a
sprout growing on top, glowing like the room's lamp on a dusk-purple sky.

Writes:
  static/icon-192.png, static/icon-512.png, static/apple-touch-icon.png   web / PWA
  ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png        iOS (1024)
  ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png        iOS splash
  android/app/src/main/res/mipmap-*/ic_launcher*.png                       Android icons
  android/app/src/main/res/drawable*/splash.png                            Android splash
  android/app/src/main/res/values/ic_launcher_background.xml               adaptive-icon background
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
APP_BG = (2, 6, 23)  # slate-950, the app's background
SKY_TOP = (46, 32, 92)
SKY_BOTTOM = (12, 8, 28)
ADAPTIVE_BG = "#1C1440"

# Pixel motif. Palette keys -> colours.
PAL = {
    "g": (136, 189, 50),  # leaf light (room sprout)
    "G": (100, 140, 50),
    "h": (48, 126, 77),  # stem
    "y": (253, 224, 140),  # amber block light
    "a": (245, 170, 60),
    "A": (196, 112, 30),
    "v": (196, 181, 253),  # violet block light
    "p": (139, 92, 246),
    "P": (98, 58, 196),
    "i": (165, 180, 252),  # indigo block light
    "n": (99, 102, 241),
    "N": (61, 56, 180),
    "w": (255, 250, 235),  # glint
}

MOTIF = [
    "..........gg..........",
    ".....gg..gggg.........",
    "....gggg.gGgg.........",
    "....gGggghgg..........",
    ".....gGgh.............",
    "........h.............",
    "......yyyyyyyyyy......",
    ".....yaawaaaaaaaA.....",
    ".....aaaaaaaaaaaA.....",
    ".....AAAAAAAAAAAA.....",
    "......................",
    "...vvvvvvvvvvvvvvv....",
    "..vppwpppppppppppPP...",
    "..ppppppppppppppppP...",
    "..PPPPPPPPPPPPPPPPP...",
    "......................",
    "...iiiiiiiiiiiiiiiiii.",
    "..innwnnnnnnnnnnnnnnN.",
    "..nnnnnnnnnnnnnnnnnnN.",
    "..NNNNNNNNNNNNNNNNNNN.",
]


def motif(pixel: int) -> Image.Image:
    w = len(MOTIF[0])
    for i, row in enumerate(MOTIF):
        assert len(row) == w, f"motif row {i} is {len(row)} wide"
    im = Image.new("RGBA", (w * pixel, len(MOTIF) * pixel), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y, row in enumerate(MOTIF):
        for x, ch in enumerate(row):
            if ch != ".":
                d.rectangle([x * pixel, y * pixel, (x + 1) * pixel - 1, (y + 1) * pixel - 1], fill=PAL[ch] + (255,))
    return im


def sky(size: int) -> Image.Image:
    im = Image.new("RGB", (size, size))
    d = ImageDraw.Draw(im)
    for y in range(size):
        t = y / (size - 1)
        d.line([(0, y), (size, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(SKY_TOP, SKY_BOTTOM)))
    # a few dim pixel stars
    star = max(2, size // 128)
    for sx, sy in [(0.16, 0.14), (0.8, 0.1), (0.88, 0.32), (0.1, 0.42), (0.7, 0.22)]:
        x, y = int(sx * size), int(sy * size)
        d.rectangle([x, y, x + star - 1, y + star - 1], fill=(200, 190, 255))
    return im


def glow(size: int, strength: float = 0.55) -> Image.Image:
    """Warm lamp glow behind the stack."""
    g = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    r = int(size * 0.34)
    c = size // 2
    d.ellipse([c - r, c - r + size // 20, c + r, c + r + size // 20], fill=(255, 170, 80, int(255 * strength)))
    return g.filter(ImageFilter.GaussianBlur(size // 9))


def place(base: Image.Image, art: Image.Image, scale: float) -> None:
    """Centre the motif so it spans `scale` of the base's width."""
    w = int(base.width * scale)
    pixel = max(1, w // len(MOTIF[0]))
    m = motif(pixel)
    base.alpha_composite(m, ((base.width - m.width) // 2, (base.height - m.height) // 2 + base.height // 40))


def full_icon(size: int) -> Image.Image:
    im = sky(size).convert("RGBA")
    im.alpha_composite(glow(size))
    place(im, None, 0.62)
    return im


def foreground(size: int) -> Image.Image:
    """Android adaptive foreground: art inside the central 66% safe zone, transparent around it."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    im.alpha_composite(glow(size, 0.45))
    place(im, None, 0.46)
    return im


def round_icon(size: int) -> Image.Image:
    im = full_icon(size)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    return out


def splash(w: int, h: int) -> Image.Image:
    im = Image.new("RGBA", (w, h), APP_BG + (255,))
    side = min(w, h)
    art = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    art.alpha_composite(glow(side, 0.35))
    place(art, None, 0.3)
    im.alpha_composite(art, ((w - side) // 2, (h - side) // 2))
    return im


def main() -> None:
    master = full_icon(1024)
    for size, name in [(512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
        master.resize((size, size), Image.LANCZOS).convert("RGB").save(ROOT / "static" / name)

    ios = ROOT / "ios/App/App/Assets.xcassets"
    master.convert("RGB").save(ios / "AppIcon.appiconset/AppIcon-512@2x.png")
    for name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
        splash(2732, 2732).convert("RGB").save(ios / "Splash.imageset" / name)

    res = ROOT / "android/app/src/main/res"
    for density, px in {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}.items():
        folder = res / f"mipmap-{density}"
        full_icon(px * 4).resize((px, px), Image.LANCZOS).save(folder / "ic_launcher.png")
        round_icon(px * 4).resize((px, px), Image.LANCZOS).save(folder / "ic_launcher_round.png")
        fg = round(px * 108 / 48)
        foreground(fg * 2).resize((fg, fg), Image.LANCZOS).save(folder / "ic_launcher_foreground.png")
    (res / "values/ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{ADAPTIVE_BG}</color>\n</resources>\n'
    )
    for path in res.glob("drawable*/splash.png"):
        w, h = Image.open(path).size
        splash(w, h).convert("RGB").save(path)


if __name__ == "__main__":
    main()
