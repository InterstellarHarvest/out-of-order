#!/usr/bin/env python3
"""Bake candidate pixel fonts into the lab's bitmap-atlas format.

Each face is drawn once from its font file at the font's own pixel size with anti-aliasing off,
then enlarged by a whole number. The output is a white atlas, art/ui/fonts/<id>.png, and its glyph map
in data/fonts.json, in the same shape as the locked font's JSON. The lab tints the white glyphs
to the dark or light ink as it draws. Nothing here is hand-edited: change FACES and re-run, then
run build_lab_data.py. Requires Pillow and the font files in art/ui/fonts/source/<family>/,
which are local only. Licence texts are in art/ui/fonts/licenses/ (SIL Open Font License 1.1).
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

LAB = Path(__file__).resolve().parents[1]
ROOT = LAB.parents[1]
LOCKED_GLYPHS = ROOT / "art/ui/sprites/fonts/locked_pixel_font_atlas.json"
SRC = ROOT / "art/ui/fonts/source"  # local only: font files are sources and never go into git

# size is the font's own pixel em, measured from its outlines; scale is a whole-number enlargement.
FACES = [
    {"id": "jersey15-1x", "label": "Jersey 15 · 1×", "file": "jersey15/Jersey15-Regular.ttf", "size": 27, "scale": 1},
    {"id": "pressstart2p-2x", "label": "Press Start 2P · 2×", "file": "pressstart2p/PressStart2P-Regular.ttf", "size": 8, "scale": 2},
    {"id": "tiny5-3x", "label": "Tiny5 · 3×", "file": "tiny5/Tiny5.ttf", "size": 8, "scale": 3},
]

# Each source folder's licence file.
LICENSES = {"kenney": ("CC0 1.0 (public domain)", "License.txt")}
OFL = ("SIL Open Font License 1.1", "OFL.txt")
PAD = 2  # transparent pixels around each glyph in the atlas
# Characters these baked faces draw beyond the locked font's set, appended after it so every existing
# glyph keeps its atlas cell, metrics and pixels. '%' (owner decision 2026-11-20, docs/104 section 5):
# the approved Chapter 3 machine readouts. The locked face (choice cards, the player's own lines, item
# names) is unchanged, so text drawn in it must still use only the locked set (Rules.validateStory).
EXTRA_CHARS = ["%"]


def bake(face, chars):
    font = ImageFont.truetype(str(SRC / face["file"]), face["size"])
    k = face["scale"]
    shapes = {}
    for ch in chars:
        advance = round(font.getlength(ch)) * k
        left, top, right, bottom = font.getbbox(ch, anchor="ls")
        if ch == " " or right <= left or bottom <= top:
            shapes[ch] = {"advance": advance, "image": None}
            continue
        mask = Image.new("1", (right - left, bottom - top), 0)
        draw = ImageDraw.Draw(mask)
        draw.fontmode = "1"  # no anti-aliasing: every pixel is fully on or off
        draw.text((-left, -top), ch, font=font, fill=1, anchor="ls")
        mask = mask.resize((mask.width * k, mask.height * k), Image.NEAREST)
        shapes[ch] = {"advance": advance, "image": mask, "left": left * k, "top": top * k}
    ascent = max(-s["top"] for s in shapes.values() if s["image"])
    lowest = max(s["top"] + s["image"].height for s in shapes.values() if s["image"])

    # One row per 16 glyphs, white on transparent.
    cell_w = max(s["image"].width for s in shapes.values() if s["image"]) + 2 * PAD
    cell_h = max(s["image"].height for s in shapes.values() if s["image"]) + 2 * PAD
    cols = 16
    rows = -(-len(chars) // cols)
    atlas = Image.new("RGBA", (cols * cell_w, rows * cell_h), (0, 0, 0, 0))
    mapping = {}
    for i, ch in enumerate(chars):
        s = shapes[ch]
        x, y = (i % cols) * cell_w + PAD, (i // cols) * cell_h + PAD
        if s["image"] is None:
            mapping[ch] = {"x": 0, "y": 0, "w": 0, "h": 0, "advance": s["advance"], "bearingY": 0}
            continue
        white = Image.new("RGBA", s["image"].size, (255, 255, 255, 255))
        atlas.paste(white, (x, y), s["image"].convert("L"))
        # Glyphs here have no side bearing of their own, so a negative left is folded into x.
        mapping[ch] = {"x": x, "y": y, "w": s["image"].width, "h": s["image"].height,
                       "advance": s["advance"], "bearingY": ascent + s["top"], "bearingX": s["left"]}
    a = mapping["A"]
    return atlas, {
        "label": face["label"],
        "source": "../../art/ui/fonts/source/" + face["file"],
        "license": LICENSES.get(face["file"].split("/")[0], OFL)[0],
        "licenseFile": "../../art/ui/fonts/licenses/" + face["file"].split("/")[0] + "_" + LICENSES.get(face["file"].split("/")[0], OFL)[1],
        "size": face["size"],
        "scale": k,
        "atlas": "../../art/ui/fonts/" + face["id"] + ".png",
        "atlasSize": list(atlas.size),
        "lineHeight": ascent + lowest + k,
        "capHeight": a["bearingY"] + a["h"],
        "mapping": mapping,
    }


def main():
    chars = list(json.loads(LOCKED_GLYPHS.read_text())["mapping"].keys()) + EXTRA_CHARS
    out = {}
    for face in FACES:
        atlas, meta = bake(face, chars)
        atlas.save(LAB / meta["atlas"], format="PNG", optimize=True)
        out[face["id"]] = meta
        print(f'{face["id"]:16} cap {meta["capHeight"]:3}px  line {meta["lineHeight"]:3}px  atlas {atlas.size}')
    (LAB / "data/fonts.json").write_text(json.dumps(out, indent=1) + "\n")


if __name__ == "__main__":
    main()
