# CYOA M2 — Playtest Corrections

**Date:** 2026-11-06
**Branch:** `agent/m2-reception-slice` (not merged)
**Starting head:** `1dc9ba884d6500bfeb5922058c58f8d62492a4ad`

A focused owner/PMO correction pass after the owner's reception playtest. No story, location,
inventory or inspector redesign. The 4:52 contradiction and the Checkpoint 02 copy are unchanged.

## 1. Brass choice pointer removed

The brass tab is gone from the game: no element, no sprite request, no tick. Nothing replaces it:
no border, outline, glow, fill, brightness change, text shift or marker of any kind, on focus or
on hover. Keyboard navigation is unchanged (Arrow Up/Down, Home/End, Enter/Space take a choice);
focus moves between the cards without any visible sign. `choice_marker_tab.png` stays in the
sprite package (the lab still shows it); the game never loads it.

## 2. Item inspector interactions

| Button | In conversation | While an item is inspected |
|---|---|---|
| 1 | INSPECT (inactive with no item / none selected) | READ (inactive: "NOTHING TO READ") |
| 2 | NOTES | SHOW, or USE where the node allows it (SHOW inactive: "NOT AVAILABLE HERE") |
| 3 | FILES | **blank**: the bare button, no glyph, no tooltip, never presses, not in the tab order |

RETURN is removed and not replaced. The inspector closes by:
- the X in its corner (placeholder art, unchanged);
- Escape;
- clicking the inspected item's slot again (click opens, click closes, click reopens).

## 3. Item text contrast

The inspector's item name and description are drawn in the dark ink (`#203037`) through the
existing pixel-font renderer, on the light choices panel. Dialogue and every other text keep their
own ink.

## 4. Item-received notice

When an item actually enters the inventory, a slip appears in the scene window, just above the
inventory bay (stage rect 56, 738, 560 × 116), clear of the dialogue, choices, inventory and
buttons. It shows:
- `ITEM RECEIVED` (Labels face, dark ink) over a thin rule;
- the item's player-facing name (Choices face, dark ink), e.g. `FACILITIES KEY`;
- the item's slot art at 1:1 in a ruled box on the left (empty box if an item has no slot art).

Behaviour:
- **Generic:** after every rules step (node entry, choice, INSPECT, READ, SHOW, USE) the flow
  compares the inventory with the one last announced and announces any new item ids. No item is
  named in the code.
- READ, SHOW, USE and INSPECT never add items, so they never announce. An item taken away and later
  given again is announced again.
- It shows at once, stays 3.6 s, then goes by itself. A click dismisses it early. Several items
  received together queue, one slip after another.
- It never blocks a choice, the dialogue box or the inventory; it is `role="status"`,
  `aria-live="polite"`, labelled `ITEM RECEIVED: <NAME>`.
- Restart clears any slip on show.

**PROVISIONAL treatment.** The slip is drawn in code as a placeholder for approved art:
- a parchment slip with a 2 px dark outline and stepped corners;
- the locked fonts;
- no glow, motion or particles.

It needs the owner's visual judgement and, eventually, art.

## 5. Owner font cleanup (separate maintenance commit `02325d2`)

The owner's hand-cleaned font atlases were taken from the main checkout and integrated through the
sprite pipeline: `locked_pixel_font_atlas_dark.png`, `_light.png` and the unindexed 364×78 atlas.
- **Recorded:** before/after hashes in each sprite's `correction.owner_edit`.
- **Rebuilt:** the sheet atlas, both manifests, the lab defaults and QA fixture, `lab_data.js` and
  `snapshot_assets.js`. Placements saved against the previous atlas `1f7094a5…` still import.
- **Pixels:** the owner's pixels are integrated as drawn; nothing was redrawn.

**Second owner pass (`maintenance commit after 3d51d9c`).** The owner re-edited all three atlases:
- A–G brought to full cap height;
- e, r, u, v, w, x brought to the common x-height;
- 5, 6, ( ) and [ ] brought to cap height;
- f, g, j, l, s, ? and the colon touched up;
- a, c and e moved down in the atlas.

The renderer clips each glyph to its JSON box and places it by `bearingY`, so the boxes were fitted
to the pixels. No overlaps; no character or advance changed. Before the fit, 73 pixels lay outside
their boxes; now every inked pixel is inside its box.

| Glyph | Change | Result |
|---|---|---|
| a, c | box y2 → y6 | same drawn rows as before (5–16) |
| e | y2 h13 → y7 h12 | the common x-height rows (5–16) |
| r, w, x | bearingY 5 → 4 | all short lowercase on rows 5–16 |
| v | h12 → h13, bearingY 5 → 4 | all short lowercase on rows 5–16 |
| [ ] | bearingY 0 → 1 | rows 1–17, with ( ), the capitals and digits |
| l | width 6 → 7 | holds the foot |
| : | back to its original box | the new dot fits it |

Now on common rows:
- every capital;
- every digit;
- every short lowercase letter;
- `! ? ( ) [ ]`.

**Third owner pass (W).** W brought to full cap height, so every capital now draws on rows 1–17. One `j`
pixel erased in the dark atlas only was restored to match the light atlas.

**Still for the owner's eye.** These are pixel decisions, left as drawn:
- b, d, t start a row below f, h, i, k, l.
- The descenders differ: j ends at row 19, p and q at 20, g and y at 21; y starts a row below g.

## QA (this Mac)

- Route validation: 38/38.
- Game QA: 300/300 (static 18, Chromium 141, Firefox 141).
- Layout-lab QA: 1918/1918 after the second font pass. One earlier run had 2 Firefox send-timing
  flakes, which cleared on re-run.

New game checks:
- **Brass tab:** no marker element or sprite request; focus adds no decoration.
- **Inspector buttons:** RETURN absent and never requested; the third button is bare and inert.
- **Closing:** clicking the item again closes, then reopens; the X closes.
- **Contrast:** the inspector text's only ink is `#203037`.
- **Item notice:** appears on the grant with the right name; sits clear of the controls; carries
  slot art crisp with hard alpha; dismisses on click and by itself after about 3.6 s; is not
  repeated by INSPECT, READ, SHOW or USE.
- **Overlay layering:** unchanged and still asserted.
- **Font:** one ink colour per atlas, no soft alpha, identical dark/light shapes, every inked pixel
  inside its glyph box.

Each new check was confirmed by fault injection. Light ink, a re-announce on READ, a marker
element and a toggle that never closes each failed their checks in both browsers.

## Remaining placeholders

- Reception scene art.
- Receptionist portrait.
- Item inspect art (the slot sprite stands in).
- The inspector X.
- The NOTES/FILES panel.
- The tooltip box.
- The inactive-glyph treatment.
- The item-received slip.
