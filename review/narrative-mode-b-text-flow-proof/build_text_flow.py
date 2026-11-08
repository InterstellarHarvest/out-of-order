#!/usr/bin/env python3
"""Static Narrative Mode B text-flow comparison; no runtime integration."""

from __future__ import annotations

import hashlib
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent
ART_STUDY = ROOT / "review/narrative-mode-b-art-study"
sys.path.insert(0, str(ART_STUDY))
import build_review as b  # noqa: E402 - reuse the approved study's proof helpers


OVERLAY_PATH = ART_STUDY / "narrative-mode-b-candidate-a-overlay.png"
OVERLAY_SHA = "0dca8af319f3c67ca4f382f365d4ab642ec5cced0f81031ca34e36d9efdd88f7"
assert hashlib.sha256(OVERLAY_PATH.read_bytes()).hexdigest() == OVERLAY_SHA
OVERLAY = Image.open(OVERLAY_PATH).convert("RGBA")
assert OVERLAY.size == (1920, 1080)

TEXT_X, TEXT_Y = 1350, 77
TEXT_W, TEXT_H = 522, 416  # sixteen complete 26px lines
LINE_HEIGHT = 26
VISIBLE_LINES = 16
CARD_Y = (527, 639, 751)

INITIAL = (
    "The hallway beyond reception is quiet enough to hear the lights. "
    "A locked door sits beside a keypad with worn brass numbers. Farther down, "
    "a lift waits beneath a wall speaker. The speaker clicks once, then says nothing."
)
RESULT = (
    "You examine the keypad. Its small display wakes and prints a queue number "
    "before asking for a code. The number seven has been polished nearly smooth. "
    "Behind the panel, a relay ticks twice; the door stays locked."
)
RETURN = (
    "You step back into the hallway. The queue number remains on the display, "
    "visible from here. The lift is still waiting, and the wall speaker has begun "
    "to hum again. Nothing else in the corridor has moved."
)
STRESS = (
    "The speaker offers a recorded notice in a voice polished by repetition. "
    "It explains that the corridor is open to visitors, provided they remain "
    "inside the marked route. No marked route is visible. The lights above the "
    "locked door dim one by one, then brighten in the reverse order. A second "
    "queue number appears on the keypad, although you have not touched it. "
    "The new slip bears the same time as the first, down to the second. Beneath "
    "it, smaller print asks you to retain both copies until the original can be "
    "located. The lift doors open to an empty car. A service bell rings from "
    "somewhere behind the wall, and an unseen mechanism slides a bolt into place. "
    "The notice continues with directions to a desk that has not yet been "
    "installed. It thanks you for your patience and starts again from the beginning."
)

PASSAGES = (INITIAL, RESULT, RETURN, STRESS)
CHOICES = (
    (
        "Examine the keypad beside the locked door",
        "Wait beneath the wall speaker for an answer",
        "Walk to the lift at the end of the hallway",
    ),
    (
        "Step away from the keypad and return to the hall",
        "Try the polished number seven on the keypad",
        "Listen to the relay behind the wall panel",
    ),
    (
        "Examine the keypad beside the locked door",
        "Wait beneath the wall speaker for an answer",
        "Enter the lift at the end of the hallway",
    ),
)


def text_lines(turn: int, approach: str) -> list[str]:
    text = "\n\n".join(PASSAGES[: turn + 1]) if approach == "cumulative" else PASSAGES[turn]
    return b.wrap(text, "dialogue", TEXT_W)


def base() -> Image.Image:
    im = Image.new("RGBA", (1920, 1080), (27, 45, 52, 255))
    im.alpha_composite(b.SHELL)
    # Current QA footer is a proof-only context layer, identical in all frames.
    im.paste(b.QA_FOOTER.crop((0, 895, 1920, 1080)), (0, 895))
    im.alpha_composite(OVERLAY)
    return im


def reading_text(im: Image.Image, lines: list[str], approach: str) -> None:
    # Render all lines offscreen, then clip to the reading viewport. Cumulative
    # narration follows the newest lines as old text moves upward. A replaced
    # passage begins at its first line, including in the overflow stress case.
    # No text is painted into the overlay PNG or outside the panel aperture.
    assert lines
    tall = Image.new("RGBA", (TEXT_W, max(TEXT_H, len(lines) * LINE_HEIGHT + 4)), (0, 0, 0, 0))
    b.draw_text(tall, "\n".join(lines), (0, 0), "dialogue", LINE_HEIGHT)
    scroll = (max(0, len(lines) - VISIBLE_LINES) * LINE_HEIGHT
              if approach == "cumulative" else 0)
    im.alpha_composite(tall.crop((0, scroll, TEXT_W, scroll + TEXT_H)), (TEXT_X, TEXT_Y))


def proof(turn: int, approach: str) -> Image.Image:
    im = base()
    reading_text(im, text_lines(turn, approach), approach)
    # Three existing two-line cards retain the current x/y/size and variants.
    # Their wording changes with the turn, never their frame artwork.
    card_set = CHOICES[min(turn, 2)]
    for i, label in enumerate(card_set):
        assert len(b.wrap(label, "choices", 487)) == 2, label
        b.card(im, label, CARD_Y[i], "abc"[i], marker=False)
    b.full_choice_thumb(im)
    return im


def compare(turn: int, left: Image.Image, right: Image.Image) -> Image.Image:
    label = {1: "AFTER EXAMINE THE KEYPAD", 2: "AFTER RETURN TO THE HALLWAY",
             3: "LONG-TEXT OVERFLOW: CUMULATIVE FOLLOWS NEWEST / CURRENT STARTS AT TOP"}[turn]
    sheet = Image.new("RGBA", (1920, 590), (24, 41, 49, 255))
    d = ImageDraw.Draw(sheet)
    d.text((14, 8), label, fill=(235, 214, 174, 255))
    d.text((14, 25),
           f"CUMULATIVE - {len(text_lines(turn, 'cumulative'))} TOTAL LINES / {VISIBLE_LINES}-LINE VIEWPORT",
           fill=(203, 185, 151, 255))
    d.text((974, 25),
           f"CURRENT ONLY - {len(text_lines(turn, 'current'))} TOTAL LINES / {VISIBLE_LINES}-LINE VIEWPORT",
           fill=(203, 185, 151, 255))
    for i, im in enumerate((left, right)):
        sheet.alpha_composite(im.resize((960, 540), Image.Resampling.NEAREST), (i * 960, 50))
    return sheet


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    initial = proof(0, "current")
    assert ImageChops.difference(initial.convert("RGB"), proof(0, "cumulative").convert("RGB")).getbbox() is None
    initial.save(OUT / "turn-0-hallway-exact-shell.png", optimize=True)

    names = {1: "result", 2: "return", 3: "overflow"}
    for turn in (1, 2, 3):
        cumulative = proof(turn, "cumulative")
        current = proof(turn, "current")
        # Only narration differs between approaches at the same turn.
        assert ImageChops.difference(
            cumulative.crop((0, 520, 1920, 1080)).convert("RGB"),
            current.crop((0, 520, 1920, 1080)).convert("RGB")).getbbox() is None
        assert ImageChops.difference(
            cumulative.crop((0, 0, 1316, 1080)).convert("RGB"),
            current.crop((0, 0, 1316, 1080)).convert("RGB")).getbbox() is None
        cumulative.save(OUT / f"turn-{turn}-{names[turn]}-cumulative-exact-shell.png", optimize=True)
        current.save(OUT / f"turn-{turn}-{names[turn]}-current-exact-shell.png", optimize=True)
        compare(turn, cumulative, current).save(OUT / f"compare-turn-{turn}-{names[turn]}.png", optimize=True)
        print(f"turn {turn}: cumulative {len(text_lines(turn, 'cumulative'))} lines; "
              f"current {len(text_lines(turn, 'current'))} lines")


if __name__ == "__main__":
    main()
