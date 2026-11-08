#!/usr/bin/env python3
"""Native-resolution, static Narrative B continuation and B->A->B proofs."""

from __future__ import annotations

import hashlib
import random
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ART_STUDY = ROOT / "review/narrative-mode-b-art-study"
sys.path.insert(0, str(ART_STUDY))
import build_review as b  # noqa: E402 - reuse current shell/card/font proof helpers


OVERLAY_PATH = ART_STUDY / "narrative-mode-b-candidate-a-overlay.png"
OVERLAY_SHA = "0dca8af319f3c67ca4f382f365d4ab642ec5cced0f81031ca34e36d9efdd88f7"
assert hashlib.sha256(OVERLAY_PATH.read_bytes()).hexdigest() == OVERLAY_SHA
OVERLAY = Image.open(OVERLAY_PATH).convert("RGBA")
assert OVERLAY.size == (1920, 1080)

B_TEXT = (1350, 77, 522, 16, 26)  # x, y, max width, line budget, leading
A_TEXT = (1342, 360, 540, 6, 24)
CARD_Y = (527, 639, 751)

PARAGRAPHS = (
    "The wall speaker wakes as you reach the center of the hallway. A recorded "
    "voice announces that the corridor is open to visitors during posted hours. "
    "It does not say where the hours are posted. The lights above the locked "
    "door brighten in sequence, as if the building is acknowledging your presence.",
    "According to the notice, every visitor receives one queue number and must "
    "keep the original slip until the matter is resolved. A second number "
    "appears on the keypad without anyone touching it. The display marks both "
    "numbers as current, then asks you to wait for further instructions.",
    "The lift doors open on an empty car. A bell rings somewhere behind the "
    "wall, followed by the sound of a bolt sliding into place. The speaker "
    "thanks you for your patience in a tone that suggests the message was "
    "recorded before anyone was expected to need it.",
    "A final sentence arrives after a pause: the desk responsible for lost "
    "originals has not yet been installed. The door remains locked, the keypad "
    "remains awake, and the lift begins to close. You have time to act before "
    "the announcement repeats.",
)
ANNOUNCEMENT = "\n\n".join(PARAGRAPHS)
PAGE_1 = "\n\n".join(PARAGRAPHS[:2])
PAGE_2 = "\n\n".join(PARAGRAPHS[2:])

HALLWAY = (
    "The hallway beyond reception is quiet enough to hear the lights. A locked "
    "door sits beside a keypad with worn brass numbers. Farther down, a lift "
    "waits beneath a wall speaker. The speaker clicks once, then says nothing."
)
FOCUS = (
    "Up close, the keypad display prints a queue number before asking for a "
    "code. The seven key has a mirror-bright edge. A relay ticks behind the "
    "plate, but the door remains locked."
)
RETURN = (
    "The hallway is quiet again. Your queue number glows on the keypad, but "
    "the door has not moved. The lift stands open beneath the speaker. Its hum "
    "sounds like a held breath."
)

LONG_CHOICES = (
    "Inspect the locked door beside the keypad",
    "Wait for the announcement to repeat once",
    "Enter the lift before its doors begin to close",
)
HALL_CHOICES = (
    "Examine the keypad beside the locked door",
    "Wait beneath the wall speaker for an answer",
    "Walk to the lift at the end of the hallway",
)
FOCUS_CHOICES = (
    "Step back from the keypad to the hallway",
    "Try the polished number seven on the keypad",
    "Read the printed queue number from the display",
)
RETURN_CHOICES = (
    "Examine the keypad beside the locked door",
    "Enter the waiting lift at the hallway end",
    "Listen beneath the wall speaker for a reply",
)


def line_count(text: str, width: int) -> int:
    return len(b.wrap(text, "dialogue", width))


def base(overlay: bool, focus_image: Image.Image | None = None) -> Image.Image:
    im = Image.new("RGBA", (1920, 1080), (27, 45, 52, 255))
    if focus_image is not None:
        assert focus_image.size == (564, 278)
        # The close-up is beneath the approved portrait aperture and its frame.
        im.alpha_composite(focus_image, (1333, 44))
    im.alpha_composite(b.SHELL)
    im.paste(b.QA_FOOTER.crop((0, 895, 1920, 1080)), (0, 895))
    if overlay:
        im.alpha_composite(OVERLAY)
    return im


def passage(im: Image.Image, text: str, placement: tuple[int, int, int, int, int]) -> None:
    x, y, width, budget, leading = placement
    lines = b.wrap(text, "dialogue", width)
    assert len(lines) <= budget, (len(lines), budget)
    layer = Image.new("RGBA", (width, len(lines) * leading + 4), (0, 0, 0, 0))
    b.draw_text(layer, "\n".join(lines), (0, 0), "dialogue", leading)
    im.alpha_composite(layer, (x, y))


def cards(im: Image.Image, labels: tuple[str, ...]) -> None:
    assert 1 <= len(labels) <= 3
    for i, label in enumerate(labels):
        lines = len(b.wrap(label, "choices", 487))
        assert lines == (1 if label == "CONTINUE" else 2), (label, lines)
        b.card(im, label, CARD_Y[i], "abc"[i], marker=False)
    b.full_choice_thumb(im)


def keypad_placeholder() -> Image.Image:
    """Proof-only neutral close-up: no exported sprite or approved-art claim."""
    im = Image.new("RGBA", (564, 278), (32, 51, 56, 255))
    d = ImageDraw.Draw(im)
    rng = random.Random(66)
    for y in range(0, 278, 4):
        d.line((0, y, 563, y), fill=(35, 56, 59, 255), width=1)
    for x in (58, 506):
        d.rectangle((x, 0, x + 3, 277), fill=(22, 34, 38, 255))
        d.line((x + 1, 0, x + 1, 277), fill=(65, 78, 74, 255), width=1)

    # Wide mechanical mounting plate, inset face, four screws, and a display.
    d.rectangle((100, 10, 464, 267), fill=(8, 14, 17, 255))
    d.rectangle((106, 16, 458, 261), fill=(91, 104, 97, 255))
    d.rectangle((111, 20, 453, 256), fill=(169, 156, 128, 255))
    d.rectangle((116, 24, 448, 252), fill=(207, 191, 158, 255))
    d.line((118, 25, 446, 25), fill=(238, 219, 177, 255), width=2)
    d.line((447, 25, 447, 251), fill=(112, 94, 70, 255), width=2)
    for x, y in ((126, 34), (430, 34), (126, 242), (430, 242)):
        d.rectangle((x - 7, y - 7, x + 7, y + 7), fill=(85, 72, 60, 255))
        d.rectangle((x - 5, y - 5, x + 5, y + 5), fill=(185, 181, 162, 255))
        d.line((x - 3, y + 2, x + 3, y - 2), fill=(42, 44, 43, 255), width=2)

    d.rectangle((174, 42, 390, 89), fill=(34, 40, 39, 255))
    d.rectangle((179, 47, 385, 84), fill=(58, 81, 75, 255))
    d.rectangle((185, 53, 379, 78), fill=(159, 173, 141, 255))
    for x in range(194, 372, 12):
        d.rectangle((x, 59, x + 7, 61), fill=(112, 139, 112, 255))
    d.rectangle((190, 66, 242, 70), fill=(70, 103, 78, 255))
    d.rectangle((306, 66, 370, 70), fill=(70, 103, 78, 255))

    # Raised keys keep native hard pixel edges. The 7 is visibly polished.
    key_labels = (("1", "2", "3"), ("4", "5", "6"),
                  ("7", "8", "9"), ("*", "0", "#"))
    for row, labels in enumerate(key_labels):
        for col, label in enumerate(labels):
            x = 179 + 68 * col
            y = 99 + 37 * row
            polished = label == "7"
            d.rectangle((x, y, x + 55, y + 29), fill=(55, 54, 48, 255))
            d.rectangle((x + 2, y + 2, x + 53, y + 25),
                        fill=(235, 217, 174, 255) if polished else (181, 173, 147, 255))
            d.line((x + 3, y + 3, x + 52, y + 3), fill=(246, 231, 191, 255), width=1)
            d.line((x + 3, y + 24, x + 52, y + 24), fill=(118, 105, 83, 255), width=2)
            if label.isdigit():
                b.draw_text(im, label, (x + 22, y + 5), "choices", 24)
            elif label == "*":
                d.line((x + 25, y + 8, x + 29, y + 20), fill=(35, 51, 55, 255), width=2)
                d.line((x + 22, y + 14, x + 32, y + 14), fill=(35, 51, 55, 255), width=2)
            else:
                for dx in (23, 29):
                    d.line((x + dx, y + 8, x + dx - 4, y + 20), fill=(35, 51, 55, 255), width=2)
                d.line((x + 20, y + 13, x + 33, y + 13), fill=(35, 51, 55, 255), width=1)
    for _ in range(35):
        x, y = rng.randrange(118, 447), rng.randrange(28, 251)
        if x < 170 or x > 392:
            d.point((x, y), fill=(148, 128, 95, 255))
    return im


def comparison(frames: tuple[Image.Image, ...], labels: tuple[str, ...], path: Path) -> None:
    assert len(frames) == len(labels)
    sheet = Image.new("RGBA", (960 * len(frames), 576), (24, 41, 49, 255))
    d = ImageDraw.Draw(sheet)
    for i, (frame, label) in enumerate(zip(frames, labels)):
        d.text((i * 960 + 12, 10), label, fill=(235, 214, 174, 255))
        sheet.alpha_composite(frame.resize((960, 540), Image.Resampling.NEAREST), (i * 960, 36))
    sheet.save(path, optimize=True)


def verify_common_regions(frames: tuple[Image.Image, ...]) -> None:
    reference = frames[0]
    for frame in frames:
        assert frame.size == (1920, 1080) and frame.mode == "RGBA"
        for rect in ((0, 895, 1920, 1080), (0, 44, 1287, 866)):
            left = reference.crop(rect).convert("RGB")
            right = frame.crop(rect).convert("RGB")
            assert ImageChops.difference(left, right).getbbox() is None, rect


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    assert PAGE_1 + "\n\n" + PAGE_2 == ANNOUNCEMENT
    assert sum(line_count(p, B_TEXT[2]) for p in PARAGRAPHS) == 24
    assert line_count(PAGE_1, B_TEXT[2]) == 13
    assert line_count(PAGE_2, B_TEXT[2]) == 13
    assert line_count(RETURN, B_TEXT[2]) == 4
    assert line_count(FOCUS, A_TEXT[2]) == 4

    long_first = base(overlay=True)
    passage(long_first, PAGE_1, B_TEXT)
    cards(long_first, ("CONTINUE",))
    long_final = base(overlay=True)
    passage(long_final, PAGE_2, B_TEXT)
    cards(long_final, LONG_CHOICES)

    b_hall = base(overlay=True)
    passage(b_hall, HALLWAY, B_TEXT)
    cards(b_hall, HALL_CHOICES)
    a_keypad = base(overlay=False, focus_image=keypad_placeholder())
    passage(a_keypad, FOCUS, A_TEXT)
    cards(a_keypad, FOCUS_CHOICES)
    b_return = base(overlay=True)
    passage(b_return, RETURN, B_TEXT)
    cards(b_return, RETURN_CHOICES)

    frames = (long_first, long_final, b_hall, a_keypad, b_return)
    verify_common_regions(frames)
    for name, frame in zip((
        "long-01-continue-exact-shell.png",
        "long-02-final-choices-exact-shell.png",
        "focus-01-hallway-b-exact-shell.png",
        "focus-02-keypad-a-exact-shell.png",
        "focus-03-return-b-exact-shell.png",
    ), frames):
        frame.save(OUT / name, optimize=True)

    comparison((long_first, long_final),
               ("PAGE 1 - CONTINUE ONLY", "PAGE 2 - AUTHOR CHOICES REVEALED"),
               OUT / "long-passage-comparison.png")
    comparison((b_hall, a_keypad, b_return),
               ("NARRATIVE B - HALLWAY", "FOCUS A - KEYPAD", "NARRATIVE B - FRESH RETURN"),
               OUT / "focus-sequence-comparison.png")
    print("24 prose lines, 13 visible lines per continuation page; Focus return 4 lines")


if __name__ == "__main__":
    main()
