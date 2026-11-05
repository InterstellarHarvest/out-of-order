#!/usr/bin/env python3
"""Measure the canonical shell and the approved V5 sprites. Reads only; never writes PNGs.

Run from anywhere (Pillow required):
    python3 tools/layout-lab/scripts/measure_shell.py

Writes data/measured_shell_regions.json. Every number is a pixel coordinate in
layout-final.png. Rects are [x, y, w, h]; x2/y2 style values are inclusive.
"""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image

LAB = Path(__file__).resolve().parents[1]
ROOT = LAB.parents[1]
SHELL_PATH = ROOT / "art/ui/shell/layout-final.png"
SPRITES = ROOT / "art/ui/sprites"
OUT = LAB / "data/measured_shell_regions.json"

shell = Image.open(SHELL_PATH)
assert shell.mode == "RGBA" and shell.size == (1920, 1080)
W, H = shell.size
px = shell.load()


def lum(x, y):
    r, g, b, _ = px[x, y]
    return (r + g + b) / 3


def is_floor(x, y):
    """Dark teal bay floor, including the soft inner shadow against the frame."""
    r, g, b, a = px[x, y]
    return a == 255 and (r + g + b) / 3 < 62 and b >= r


def rect(x0, y0, x1, y1):
    return [x0, y0, x1 - x0 + 1, y1 - y0 + 1]


def alpha_bbox(test):
    xs0, ys0, xs1, ys1 = W, H, -1, -1
    for y in range(H):
        for x in range(W):
            if test(x, y):
                xs0, ys0, xs1, ys1 = min(xs0, x), min(ys0, y), max(xs1, x), max(ys1, y)
    return xs0, ys0, xs1, ys1


def largest_rect(bounds, inside, must_contain):
    """Largest axis-aligned rectangle of `inside` pixels containing the seed point."""
    bx0, by0, bx1, by1 = bounds
    sx, sy = must_contain
    heights = [0] * (bx1 - bx0 + 1)
    best = (0, None)
    for y in range(by0, by1 + 1):
        for i in range(len(heights)):
            heights[i] = heights[i] + 1 if inside(bx0 + i, y) else 0
        if y < sy:
            continue
        stack = []
        for i in range(len(heights) + 1):
            h = heights[i] if i < len(heights) else 0
            start = i
            while stack and stack[-1][1] >= h:
                s, sh = stack.pop()
                start = s
                top = y - sh + 1
                if bx0 + s <= sx < bx0 + i and top <= sy and sh * (i - s) > best[0]:
                    best = (sh * (i - s), rect(bx0 + s, top, bx0 + i - 1, y))
            stack.append((start, h))
    return best[1]


def widest_band(bounds, inside, seed_x, height):
    """Widest clear band of a fixed height: returns the best rect for that height."""
    bx0, by0, bx1, by1 = bounds
    best = None
    for top in range(by0, by1 - height + 2):
        rows = range(top, top + height)
        if not all(inside(seed_x, y) for y in rows):
            continue
        x0 = x1 = seed_x
        while x0 > bx0 and all(inside(x0 - 1, y) for y in rows):
            x0 -= 1
        while x1 < bx1 and all(inside(x1 + 1, y) for y in rows):
            x1 += 1
        if best is None or x1 - x0 + 1 > best[2]:
            best = [x0, top, x1 - x0 + 1, height]
    return best


def edges_h(y, seed_x, pred):
    x0 = x1 = seed_x
    while pred(x0 - 1, y):
        x0 -= 1
    while pred(x1 + 1, y):
        x1 += 1
    return x0, x1


def edges_v(x, seed_y, pred):
    y0 = y1 = seed_y
    while pred(x, y0 - 1):
        y0 -= 1
    while pred(x, y1 + 1):
        y1 += 1
    return y0, y1


# Apertures -----------------------------------------------------------------
alpha = shell.getchannel("A").tobytes()


def transparent_component(seed):
    seen = {seed}
    todo = [seed]
    while todo:
        x, y = todo.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < W and 0 <= ny < H and (nx, ny) not in seen and alpha[ny * W + nx] == 0:
                seen.add((nx, ny))
                todo.append((nx, ny))
    return min(p[0] for p in seen), min(p[1] for p in seen), max(p[0] for p in seen), max(p[1] for p in seen)


scene = transparent_component((600, 400))
portrait = transparent_component((1600, 180))

# Footer bays ---------------------------------------------------------------
inv_x = edges_h(980, 430, is_floor)
inv_y = edges_v(430, 980, is_floor)
inv_clear = largest_rect((0, 900, 860, 1060), is_floor, (430, 980))
inv_band_128 = widest_band((0, 900, 860, 1060), is_floor, 430, 124)
inv_band_113 = widest_band((0, 900, 860, 1060), is_floor, 430, 113)
inv_band_80 = widest_band((0, 900, 860, 1060), is_floor, 430, 80)

obj_clear = largest_rect((846, 936, 1452, 1060), is_floor, (1150, 1000))
obj_x = edges_h(1000, 1150, is_floor)
obj_y = edges_v(1300, 1000, is_floor)

util_x = edges_h(990, 1680, is_floor)
util_y = edges_v(1680, 990, is_floor)
util_clear = largest_rect((1456, 905, 1910, 1062), is_floor, (1680, 990))
util_band_114 = widest_band((1456, 905, 1910, 1062), is_floor, 1680, 114)
util_band_103 = widest_band((1456, 905, 1910, 1062), is_floor, 1680, 103)

# Objective plaque: dark opening between the bolts, measured at each row.
plaque_rows = {}
for y in range(897, 935):
    if lum(1020, y) < 62:
        plaque_rows[y] = edges_h(y, 1020, lambda x, yy: lum(x, yy) < 62 and x > 860 and x < 1180)
plaque_y0, plaque_y1 = min(plaque_rows), max(plaque_rows)
text_band = [plaque_rows[y] for y in range(905, 926)]
plaque_x0 = max(v[0] for v in text_band)
plaque_x1 = min(v[1] for v in text_band)

# Choice panel --------------------------------------------------------------
PANEL_EDGE = 100  # frame highlight runs brighter than the surrounding dark gap
panel_x0 = next(x for x in range(1305, 1340) if lum(x, 700) > PANEL_EDGE)
panel_x1 = next(x for x in range(1871, 1840, -1) if lum(x, 700) > PANEL_EDGE and x < 1870)
panel_y0 = next(y for y in range(522, 540) if lum(1600, y) > PANEL_EDGE)
panel_y1 = next(y for y in range(866, 840, -1) if lum(1600, y) > PANEL_EDGE)
free_y0 = next(y for y in range(521, 526) if lum(1600, y) < 40)
free_y1 = next(y for y in range(880, 862, -1) if lum(1600, y) < 60)

# Scrollbar track -----------------------------------------------------------
DARK = 60
channel = {}
for y in range(530, 860):
    if lum(1889, y) < DARK:
        channel[y] = edges_h(y, 1889, lambda x, yy: lum(x, yy) < DARK)
ch_y0, ch_y1 = min(channel), max(channel)
wide_rows = [y for y, v in channel.items() if v[1] - v[0] + 1 >= 21]
wide_y0, wide_y1 = min(wide_rows), max(wide_rows)
ch_x0 = min(channel[y][0] for y in wide_rows)
ch_x1 = max(channel[y][1] for y in wide_rows)
housing_x0 = next(x for x in range(1866, 1878) if lum(x, 700) > 120)
housing_x1 = next(x for x in range(1909, 1898, -1) if lum(x, 700) > 80)


def thumb_rows(scale_den):
    """Visible (alpha >= 128) x-spans of each cap row at 1/scale_den, sampled nearest."""
    top = Image.open(SPRITES / "controls/choice_scroll_thumb_top.png").convert("RGBA")
    bot = Image.open(SPRITES / "controls/choice_scroll_thumb_bottom.png").convert("RGBA")

    def spans(img, rows):
        out = []
        for dst in range(rows[1] // scale_den):
            sy = rows[0] + dst * scale_den + scale_den // 2
            xs = [x for x in range(40 // scale_den) if img.getpixel((x * scale_den + scale_den // 2, sy))[3] >= 128]
            out.append((min(xs), max(xs)))
        return out

    return spans(top, (1, 20)), spans(bot, (0, 20))


def thumb_limits(x, scale_den):
    """Topmost and bottommost rows at which the capped thumb stays inside the channel."""
    top_spans, bot_spans = thumb_rows(scale_den)

    def fits_top(y):
        return all(
            (y + i) in channel and channel[y + i][0] <= x + a and x + b <= channel[y + i][1]
            for i, (a, b) in enumerate(top_spans)
        )

    def fits_bottom(last):
        n = len(bot_spans)
        return all(
            (last - n + 1 + i) in channel
            and channel[last - n + 1 + i][0] <= x + a
            and x + b <= channel[last - n + 1 + i][1]
            for i, (a, b) in enumerate(bot_spans)
        )

    return min(y for y in channel if fits_top(y)), max(y for y in channel if fits_bottom(y))


half_top, half_bottom = thumb_limits(1880, 2)

# Speech panel --------------------------------------------------------------
speech_x0 = next(x for x in range(1305, 1330) if lum(x, 430) > 140)
speech_x1 = next(x for x in range(1919, 1890, -1) if lum(x, 430) > 100)
speech_y0 = next(y for y in range(335, 360) if lum(1600, y) > 140)
speech_y1 = next(y for y in range(530, 505, -1) if lum(1600, y) > 100 and y < 522)
parchment = lambda x, y: lum(x, y) > 185
parch_x = edges_h(430, 1600, parchment)
parch_y = edges_v(1600, 430, parchment)


# Sprite metrics ------------------------------------------------------------
def bbox_where(img, test):
    w, h = img.size
    data = img.load()
    pts = [(x, y) for y in range(h) for x in range(w) if test(data[x, y])]
    return [min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)]


metrics = {}
for name in [
    "controls/utility_a_up", "controls/utility_a_down", "controls/utility_b_up", "controls/utility_b_down",
    "controls/utility_c_up", "controls/utility_c_down", "controls/inv_left_up", "controls/inv_left_down",
    "controls/inv_right_up", "controls/inv_right_down", "controls/choice_scroll_thumb_top",
    "controls/choice_scroll_thumb_middle", "controls/choice_scroll_thumb_bottom", "inventory/inventory_slot",
]:
    img = Image.open(SPRITES / f"{name}.png").convert("RGBA")
    metrics[Path(name).name] = {
        "size": list(img.size),
        "alpha_gt_0": bbox_where(img, lambda p: p[3] > 0),
        "alpha_ge_128": bbox_where(img, lambda p: p[3] >= 128),
        "alpha_255": bbox_where(img, lambda p: p[3] == 255),
    }


def travel(up, down):
    a, b = metrics[up]["alpha_255"], metrics[down]["alpha_255"]
    return [b[0] - a[0], b[1] - a[1]]


try:
    blob = subprocess.check_output(["git", "hash-object", str(SHELL_PATH)], text=True).strip()
except (OSError, subprocess.CalledProcessError):
    blob = None

report = {
    "schema": "m1-measured-shell-regions-v1",
    "note": "Measured from the bytes of layout-final.png by scripts/measure_shell.py. Older figures in docs/28-29 were taken from an earlier source PNG.",
    "shell": {
        "path": "art/ui/shell/layout-final.png",
        "width": W,
        "height": H,
        "mode": shell.mode,
        "sha256": hashlib.sha256(SHELL_PATH.read_bytes()).hexdigest(),
        "git_blob": blob,
        "alpha": {
            "transparent": sum(1 for v in alpha if v == 0),
            "opaque": sum(1 for v in alpha if v == 255),
            "partial": sum(1 for v in alpha if 0 < v < 255),
        },
    },
    "regions": {
        "sceneAperture": {"rect": rect(*scene)},
        "portraitAperture": {"rect": rect(*portrait)},
        "inventoryBay": {
            "floor": rect(inv_x[0], inv_y[0], inv_x[1], inv_y[1]),
            "clear": inv_clear,
            "clearBandH124": inv_band_128,
            "clearBandH113": inv_band_113,
            "clearBandH80": inv_band_80,
            "note": "floor = dark bay between frame lines at the bay centre. clear = largest rectangle free of corner plates. clearBandHn = widest clear rectangle of that height.",
        },
        "objectivePlaque": {
            "opening": rect(plaque_x0, plaque_y0, plaque_x1, plaque_y1),
            "centerX2": plaque_x0 + plaque_x1 + 1,
            "note": "Narrowest dark opening across the text band (rows 905-925), so text never meets the bolts. centerX2 is twice the centre in edge coordinates.",
        },
        "objectivePanel": {
            "floor": rect(obj_x[0], obj_y[0], obj_x[1], obj_y[1]),
            "clearBelowPlaque": obj_clear,
        },
        "utilityBay": {
            "floor": rect(util_x[0], util_y[0], util_x[1], util_y[1]),
            "clear": util_clear,
            "clearBandH114": util_band_114,
            "clearBandH103": util_band_103,
        },
        "choicePanel": {
            "outer": rect(panel_x0, panel_y0, panel_x1, panel_y1),
            "freeVertical": [free_y0, free_y1],
            "note": "freeVertical is the inclusive y range between the speech panel's lower edge and the frame strip below; cards may overhang the panel into it.",
        },
        "choiceTrack": {
            "channel": rect(ch_x0, ch_y0, ch_x1, ch_y1),
            "channelFullWidthRows": [wide_y0, wide_y1],
            "housingX": [housing_x0, housing_x1],
            "usableHalfScale": {
                "x": 1880,
                "width": 20,
                "y": half_top,
                "height": half_bottom - half_top + 1,
                "note": "Topmost and bottommost rows at which the 0.5x capped thumb stays inside the chamfered channel.",
            },
        },
        "speechPanel": {
            "outer": rect(speech_x0, speech_y0, speech_x1, speech_y1),
            "parchment": rect(parch_x[0], parch_y[0], parch_x[1], parch_y[1]),
            "indicatorGutterX": [1899, 1906],
            "note": "This shell has no rivets on the speech panel. The gutter band is the x1899-1906 band from docs/31 and docs/34.",
        },
    },
    "sprites": metrics,
    "pressTravel": {
        "inv_left": travel("inv_left_up", "inv_left_down"),
        "inv_right": travel("inv_right_up", "inv_right_down"),
        "utility_a": travel("utility_a_up", "utility_a_down"),
    },
}

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report["regions"], indent=1))
print(report["pressTravel"])
