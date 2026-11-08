#!/usr/bin/env python3
"""Build isolated Narrative Mode B art studies from the immutable M1 shell.

Only review/ artifacts are written. Run from any directory with Pillow installed.
"""

from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
SHELL_PATH = ROOT / "art/ui/shell/layout-final.png"
SHELL_SHA = "813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6"
SHELL = Image.open(SHELL_PATH).convert("RGBA")
QA_FOOTER = Image.open(ROOT / "game/qa/screenshots/01_opening_typing.png").convert("RGBA")
assert SHELL.size == (1920, 1080)
assert QA_FOOTER.size == SHELL.size
assert hashlib.sha256(SHELL_PATH.read_bytes()).hexdigest() == SHELL_SHA

INNER = (1323, 50, 1909, 515)
PALETTE_A = (224, 208, 174)
INK = (32, 48, 55, 255)


def panel_border(out: Image.Image) -> None:
    """Nine-slice the approved dialogue surround, retaining native pixel size."""
    # The top rim is placed separately beneath the existing upper hardware.
    # The bottom stays at its original y. Choice panel and track are untouched.
    for y in range(50, 515):
        sy = 355 + (y - 50) % 150
        out.alpha_composite(SHELL.crop((1316, sy, 1323, sy + 1)), (1316, y))
        out.alpha_composite(SHELL.crop((1909, sy, 1920, sy + 1)), (1909, y))
    out.alpha_composite(SHELL.crop((1316, 515, 1920, 520)), (1316, 515))


def top_frame_bottom(x: int) -> int:
    """Last solid upper-frame pixel, before the portrait aperture begins."""
    if x >= 1880:
        # Keep the original silver bracket head and large screw. Its surviving
        # lower contour is rounded; the narrow 90-degree leg and lower screw
        # are covered by the taller dialogue panel.
        distance = abs(x - 1900)
        if distance >= 18:
            return 50
        if distance >= 14:
            return 51
        if distance >= 10:
            return 53
        if distance >= 6:
            return 54
        return 55
    for y in range(55, 34, -1):
        if SHELL.getpixel((x, y))[3] >= 200:
            return y
    return 41


def top_border_below_frame(out: Image.Image) -> None:
    """Move the EXISTING dialogue top border up to touch the upper frame."""
    # The upper hardware has an irregular lower edge: the pipe is shallower
    # than the enamel plates. The black edge follows that edge one pixel below
    # instead of drawing a new rail across the existing hardware.
    for x in range(1316, 1920):
        top = top_frame_bottom(x) + 1
        for y in range(top):
            out.putpixel((x, y), (0, 0, 0, 0))
        sx = min(x, 1914)
        out.alpha_composite(SHELL.crop((sx, 338, sx + 1, 350)), (x, top))


def paper_a() -> Image.Image:
    """Speech-panel cream extended upward with restrained source-tone grain."""
    w, h = 586, 465
    rng = random.Random(6401)
    paper = Image.new("RGBA", (w, h), PALETTE_A + (255,))
    px = paper.load()
    # The broad surface has the same sampled cream and single-pixel grain as
    # the canonical speech inset. Block variation stays weaker than the shell's
    # existing stained edges.
    block = [[rng.randrange(-2, 3) for _ in range((w + 31) // 32)]
             for _ in range((h + 31) // 32)]
    for y in range(h):
        for x in range(w):
            n = rng.choice((-3, -2, -1, 0, 0, 0, 1, 2, 3)) + block[y // 32][x // 32]
            e = max(0, 16 - min(x, w - 1 - x))
            px[x, y] = (max(0, 224 + n - e // 5),
                        max(0, 208 + n - e // 3),
                        max(0, 174 + n - e // 2), 255)
    # Preserve the original paper's lower edge wear. A long gradual blend
    # keeps its stained foot without repeating the original top edge inside
    # the newly unified panel.
    src = SHELL.crop((1323, 445, 1909, 515))
    sp = src.load()
    for y in range(395, 465):
        t = (y - 394) / 70
        for x in range(w):
            a = px[x, y]
            b = sp[x, y - 395]
            px[x, y] = tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3)) + (255,)
    return paper


def paper_b() -> Image.Image:
    """Slightly warmer institutional paper in the same dialogue-box form."""
    w, h = 586, 465
    rng = random.Random(6402)
    paper = Image.new("RGBA", (w, h), (232, 220, 191, 255))
    px = paper.load()
    for y in range(h):
        for x in range(w):
            n = rng.choice((-3, -2, -1, 0, 0, 1, 2, 3))
            edge = max(0, 22 - min(x, w - 1 - x, y, h - 1 - y))
            px[x, y] = (232 + n - edge // 6,
                        220 + n - edge // 4,
                        191 + n - edge // 3, 255)
    return paper


def overlay(kind: str) -> Image.Image:
    out = Image.new("RGBA", SHELL.size, (0, 0, 0, 0))
    ImageDraw.Draw(out).rectangle((1316, 41, 1919, 519), fill=PALETTE_A + (255,))
    out.paste(paper_a() if kind == "a" else paper_b(), INNER[:2])
    panel_border(out)
    top_border_below_frame(out)
    # A candidate overlay must fully occlude the portrait/speech divider and
    # nowhere touch the scene, choices, choice track, objective, or footer.
    assert out.getbbox() == (1316, 42, 1920, 520)
    alpha = out.getchannel("A")
    assert alpha.crop((1316, 68, 1920, 520)).getextrema() == (255, 255)
    assert alpha.crop((0, 0, 1316, 1080)).getbbox() is None
    assert alpha.crop((0, 520, 1920, 1080)).getbbox() is None
    for x in (1340, 1500, 1750, 1850, 1890, 1900, 1918):
        first_panel_pixel = top_frame_bottom(x) + 1
        assert alpha.getpixel((x, first_panel_pixel - 1)) == 0
        assert alpha.getpixel((x, first_panel_pixel)) == 255
    return out


def glyph_config(role: str):
    if role == "choices":
        data = json.loads((ROOT / "art/ui/sprites/fonts/locked_pixel_font_atlas.json").read_text())
        atlas = Image.open(ROOT / "art/ui/sprites/fonts/locked_pixel_font_atlas_dark.png").convert("RGBA")
    else:
        data = json.loads((ROOT / "tools/layout-lab/data/fonts.json").read_text())["jersey15-1x"]
        atlas = Image.open(ROOT / "art/ui/fonts/jersey15-1x.png").convert("RGBA")
    return data, atlas


FONTS = {role: glyph_config(role) for role in ("choices", "dialogue")}


def width(text: str, role: str) -> int:
    m = FONTS[role][0]["mapping"]
    return sum(m.get(c, m["?"])["advance"] for c in text)


def wrap(text: str, role: str, max_width: int) -> list[str]:
    out = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        line = ""
        for word in words:
            proposal = (line + " " + word).strip()
            if line and width(proposal, role) > max_width:
                out.append(line)
                line = word
            else:
                line = proposal
        out.append(line)
    return out


def draw_text(im: Image.Image, text: str, xy: tuple[int, int], role: str,
              line_height: int, max_width: int | None = None,
              opacity: int = 255) -> int:
    data, atlas = FONTS[role]
    mapping = data["mapping"]
    lines = wrap(text, role, max_width) if max_width else text.split("\n")
    x0, y0 = xy
    for row, line in enumerate(lines):
        x = x0
        for c in line:
            g = mapping.get(c, mapping["?"])
            if g["w"] and g["h"]:
                glyph = atlas.crop((g["x"], g["y"], g["x"] + g["w"], g["y"] + g["h"]))
                if role == "dialogue":
                    inked = Image.new("RGBA", glyph.size, INK)
                    inked.putalpha(glyph.getchannel("A"))
                    glyph = inked
                if opacity != 255:
                    glyph.putalpha(glyph.getchannel("A").point(lambda a: a * opacity // 255))
                im.alpha_composite(glyph, (x + g.get("bearingX", 0), y0 + row * line_height + g.get("bearingY", 0)))
            x += g["advance"]
    return len(lines)


def card_sprite(lines: int, variant: str, size: tuple[int, int]) -> Image.Image:
    src = Image.open(ROOT / f"art/ui/sprites/choice_cards/choice_{lines}line_{variant}.png").convert("RGBA")
    return src.resize(size, Image.Resampling.NEAREST)


def card(im: Image.Image, text: str, y: int, variant: str, marker: bool = False) -> None:
    lines = wrap(text, "choices", 465 if marker else 487)
    lines = lines[:2]
    size = (535, 107 if len(lines) > 1 else 79)
    im.alpha_composite(card_sprite(len(lines), variant, size), (1324, y))
    line_y = y + max(6, (size[1] - len(lines) * 24) // 2)
    if marker:
        draw_text(im, "A:", (1342, line_y), "choices", 24, opacity=180)
    draw_text(im, "\n".join(lines), (1353 if not marker else 1380, line_y), "choices", 24)


def full_choice_thumb(im: Image.Image) -> None:
    parts = ROOT / "art/ui/sprites/controls"
    top = Image.open(parts / "choice_scroll_thumb_top.png").convert("RGBA").resize((20, 10), Image.Resampling.NEAREST)
    middle = Image.open(parts / "choice_scroll_thumb_middle.png").convert("RGBA").resize((20, 292), Image.Resampling.NEAREST)
    bottom = Image.open(parts / "choice_scroll_thumb_bottom.png").convert("RGBA").resize((20, 10), Image.Resampling.NEAREST)
    for part, y in ((top, 539), (middle, 549), (bottom, 841)):
        im.alpha_composite(part, (1880, y))


SHORT = (
    "The hall beyond reception is almost empty. A keypad waits beside a locked door. "
    "Somewhere above you, a ceiling speaker clicks once and falls quiet."
)
LONG = (
    "The model home has been arranged to look lived in, but nothing has quite settled. "
    "A cup rests on the table with its handle facing the visitor. The windows show a "
    "garden that cannot be seen from the street.\n\n"
    "When you step closer, a wall speaker announces that the house is ready to assist. "
    "It does not ask your name. A small camera turns toward the entryway, stops short, "
    "then begins again as if following a second person a pace behind you.\n\n"
    "The hallway offers a keypad, a closed service drawer, and a door marked only by "
    "the shine of many hands on its brass latch."
)


def proof(kind: str, length: str, text_style: str) -> Image.Image:
    # Neutral mattes make alpha and shell registration visible without
    # inventing scene or NPC artwork for this surface review.
    im = Image.new("RGBA", SHELL.size, (27, 45, 52, 255))
    im.alpha_composite(SHELL)
    # Copy the current runtime's footer controls and objective as an unchanged
    # contextual proof layer. This is not a source for either overlay PNG.
    im.paste(QA_FOOTER.crop((0, 895, 1920, 1080)), (0, 895))
    im.alpha_composite(overlay(kind))
    text = SHORT if length == "short" else LONG
    line_count = draw_text(im, text, (1350, 77), "dialogue", 27, 522)
    assert line_count <= 16, (length, line_count)
    if text_style == "quotes":
        choices = [('"Is that door locked, or am I meant to enter a code?"', False),
                   ("Examine the keypad beside the locked door", False),
                   ("Wait by the wall speaker for a response", False)]
    else:
        choices = [("Is that door locked, or am I meant to enter a code?", False),
                   ("Examine the keypad beside the locked door", True),
                   ("Wait by the wall speaker for a response", True)]
    for i, (label, is_action) in enumerate(choices):
        card(im, label, 527 + 112 * i, "abc"[i], is_action)
    full_choice_thumb(im)
    return im


def choice_comparison() -> Image.Image:
    # Review sheet only; the source card sprites are copied without edits.
    bg = Image.new("RGBA", (1160, 490), (25, 43, 51, 255))
    d = ImageDraw.Draw(bg)
    d.rectangle((0, 0, 1159, 489), outline=(165, 141, 100, 255), width=2)
    # The headings live OUTSIDE the card crops and are review labels only.
    # Use plain Pillow text only for those non-game labels.
    d.text((30, 13), "1  QUOTED SPEECH / UNQUOTED IMPERATIVE", fill=(239, 221, 181, 255))
    d.text((592, 13), "2  ORDINARY WORDING / SMALL ACTION MARKER", fill=(239, 221, 181, 255))
    rows = [
        ("SPOKEN", '"Is that door locked?"', "Is that door locked?", "a"),
        ("ACTION", "Examine the keypad", "Examine the keypad", "b"),
        ("SPOKEN", '"I can wait here."', "I can wait here.", "c"),
        ("ACTION", "Pull the lever", "Pull the lever", "a"),
    ]
    for i, (role, left, right, variant) in enumerate(rows):
        y = 46 + i * 109
        for x, label, marker in ((30, left, False), (592, right, role == "ACTION")):
            d.text((x, y - 14), role, fill=(199, 181, 147, 255))
            bg.alpha_composite(card_sprite(1, variant, (535, 79)), (x, y))
            ty = y + (79 - 24) // 2
            if marker:
                draw_text(bg, "A:", (x + 18, ty), "choices", 24, opacity=180)
            draw_text(bg, label, (x + (56 if marker else 29), ty), "choices", 24)
    return bg


def panel_comparison(length: str) -> Image.Image:
    sheet = Image.new("RGBA", (1920, 578), (24, 41, 49, 255))
    d = ImageDraw.Draw(sheet)
    d.text((18, 9), "CANDIDATE 1  -  DIALOGUE PANEL MATERIALS", fill=(235, 214, 174, 255))
    d.text((978, 9), "CANDIDATE 2  -  INSTITUTIONAL PAPER", fill=(235, 214, 174, 255))
    for i, kind in enumerate(("a", "b")):
        im = proof(kind, length, "quotes" if length == "short" else "marker")
        sheet.alpha_composite(im.resize((960, 540), Image.Resampling.NEAREST), (i * 960, 38))
    return sheet


def corner_comparison() -> Image.Image:
    sheet = Image.new("RGBA", (1100, 360), (24, 41, 49, 255))
    d = ImageDraw.Draw(sheet)
    d.text((14, 12), "PORTRAIT VIEW: CANONICAL CORNER BRACKET", fill=(235, 214, 174, 255))
    d.text((564, 12), "NARRATIVE VIEW: ROUNDED TOP END", fill=(235, 214, 174, 255))
    narrative_hardware = Image.new("RGBA", SHELL.size, (27, 45, 52, 255))
    narrative_hardware.alpha_composite(SHELL)
    narrative_hardware.alpha_composite(overlay("a"))
    for i, im in enumerate((SHELL, narrative_hardware)):
        crop = im.crop((1740, 0, 1920, 105)).resize((540, 315), Image.Resampling.NEAREST)
        sheet.alpha_composite(crop, (10 + i * 550, 42))
    return sheet


def top_border_detail() -> Image.Image:
    sheet = Image.new("RGBA", (1208, 270), (24, 41, 49, 255))
    ImageDraw.Draw(sheet).text((12, 8),
        "EXISTING UPPER FRAME ABOVE THE EXTENDED DIALOGUE BOX - NATIVE PIXEL EDGES AT 2X",
        fill=(235, 214, 174, 255))
    im = Image.new("RGBA", SHELL.size, (27, 45, 52, 255))
    im.alpha_composite(SHELL)
    im.alpha_composite(overlay("a"))
    crop = im.crop((1316, 0, 1920, 120)).resize((1208, 240), Image.Resampling.NEAREST)
    sheet.alpha_composite(crop, (0, 30))
    return sheet


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for kind in ("a", "b"):
        overlay(kind).save(OUT / f"narrative-mode-b-candidate-{kind}-overlay.png", optimize=True)
        proof(kind, "short", "quotes").save(OUT / f"candidate-{kind}-short-exact-shell.png", optimize=True)
        proof(kind, "long", "marker").save(OUT / f"candidate-{kind}-long-exact-shell.png", optimize=True)
    choice_comparison().save(OUT / "choice-text-conventions.png", optimize=True)
    for length in ("short", "long"):
        panel_comparison(length).save(OUT / f"candidate-comparison-{length}.png", optimize=True)
    corner_comparison().save(OUT / "top-end-switch-comparison.png", optimize=True)
    top_border_detail().save(OUT / "top-border-alignment-detail.png", optimize=True)


if __name__ == "__main__":
    main()
