# 103 — Final PR #2 corrections: antidote-kit Focus A visible, death-popup copy approved

**Date:** 2026-11-18.

**Authority:** PMO ruling "Final PR #2 corrections". docs/102 (Chapter 2 art integration) was accepted.

**Branch:** `agent/ch02-art-integration-20261118`. It merges into PR #2 by fast-forward.

## 1. Antidote kits: the approved Focus A close-up is now visible

**Before (docs/102 section 5):**
- Opening a wall kit opens the 565×451 Scene Pickup window over the portrait aperture. Its art area showed the labelled "DEV PLACEHOLDER … OPEN WALL KIT - ART NOT YET APPROVED".
- The three owner-approved 564×278 Focus A close-ups were bound in the portrait layer underneath, but never seen.

**Now (`game/js/stage.js` `showInspectArt`, a narrow engine adjustment):**
- On a Scene Pickup, the window's art area shows the current node's approved Focus A image: a clone of the same decoded native image.
- It is drawn at 1:1, 564×278, never scaled, and at the window's origin, where the Focus A layer stands.
- The rest of the 565×451 area is a flat fill in the palette's dark plate, `#0e1b20` (the popup notice plate).
- `#inspectArt` carries `data-kind="scene-pickup-art"` and the focus art key.
- A pickup with no approved Focus A still falls back to the labelled placeholder, as before.

**Unchanged:**
- narration, cards, READ LABEL / USE / close behaviour, and inventory timing;
- the close button, which is drawn over the art as on every inspector;
- the Focus A portrait layer.

No art was generated or altered.

| Kit | Focus A shown |
|---|---|
| Public first-aid box | `art/focus/biology_park/aid_box_open.png` |
| Maintenance decontamination kit | `art/focus/biology_park/decontamination_kit_open.png` |
| Customs exposure dispenser | `art/focus/biology_park/exposure_dispenser_open.png` |

**Tests, Chromium + Firefox (`run_ch02_art_qa.js` kits).** For each of the three kits:
- the window shows that exact file at native 564×278, unscaled;
- no placeholder element exists anywhere;
- the pixels on screen equal the source 1:1 over at least 90% of the image. Only the close button's own box is excluded.

`run_ch02_routes_qa.js` now checks the 565×451 window holds the approved image at native size with no placeholder. All its pickup-behaviour checks pass unchanged (346/346).

## 2. Death-popup copy: Story Director approval recorded

**Approved:** the exact current title, subtitle and body of all six popups the game uses:
- PERMANENTLY SATISFIED.
- CLASSIFIED AS COMPOST.
- NEW ARRIVAL.
- PERSONAL GROWTH.
- RECLASSIFIED.
- SITE IMPROVEMENT.

**Public storyboard `468f82e`:**
- `deathPopup.status` is `owner-approved`, with an approval note on each node;
- public docs/104 has a new "Death-popup copy approval" section;
- the derived export reads `popupStatus: owner-approved` and `readyForGameplay: true`, because the art is integrated.

**Unchanged:** wording, artwork statuses (kept separate in the artwork catalog), Chapter 3 entries.

**Game:** re-pinned to `468f82e` by `sync.js pull`. Only the death export and its runtime module change; the story content stays `0bb7124ab2f6`.

**Tests:**
- `run_end_presentation_qa.js`: copy provenance is `owner-approved` and ready, for all six;
- `validate_ch02_art.js`: the Chapter 2 popups are approved and ready;
- RETRY / CHECKPOINT: `run_death_controls_qa.js`, and the Chapter 2 hopper death in `run_ch02_art_qa.js`.

## 3. Still deferred (by ruling)

- The Chapter 1 `default_unrestrained` chair image stays an approved, unused reserve.
- EXIT waits for the main menu.
- Chapter 3 is unchanged and not consumed.
