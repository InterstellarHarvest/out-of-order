# CYOA M2 — Reception Portrait Background Revision 01

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-portrait-background-revise-01`, created from `8e0064da9e5185e0b1a2ba6a943c845f3672e29b`, the accepted reception-art integration checkpoint.  
**Status:** correction to the portrait background only. Not merged. `agent/m2-reception-art-integration` and `agent/m2-reception-inspector-art-01` are untouched.

## 1. Reason

The owner/PMO found that the integrated portrait background (docs/56 §2.3, docs/57), though visually strong, was **too wide in composition**. It read as a broad room slice rather than a tight conversational view at the desk:

- it included the plant;
- too much of the left-hand hallway;
- and the right-hand door.

## 2. Owner direction

- Remove the plant, the hallway and the right-hand door.
- Tighten the focus to the receptionist's immediate workstation.
- The portrait frame should feel as if it fits roughly within the larger room view, zoomed into the relevant local space: not a precise crop of the main scene, but as if the player is now standing at the reception desk.

## 3. The revised asset

- **Source:** the owner's revised Codex output `reception_portrait_background_tight_v2_raw.png`.
  - 1786×881 RGB, SHA-256 `7b4088eec989c417532391b0e9471d8e19ca2f87df405f8535b8ecb5a4a19cbc`.
  - It is kept local only in `source/reception_density/`, which is git-ignored and untracked.
- **Contents:** pigeonholes on the left; a filing cabinet and the amber-lamp control panel on the right; the teal beam, lights and pipes above.
  - The centre stays calm behind the NPC.
  - There is no plant, hallway, door, person or foreground desk.
- **Normalization:** the accepted portrait-background method (docs/56 §2.3), with Pillow 12.3.0:
  1. Centred exact-aspect crop, box `(0, 0.3333)–(1786, 880.6667)`. That trims 0.33 source px at the top and at the bottom.
  2. `LANCZOS` straight to 564×278. The source is opaque RGB, so premultiplied alpha is a no-op here.
  3. No palette, colour cleanup, dither, denoise or sharpening.
- The owner's own 564×278 review export (`art/portraits/receptionist_background_tight_v2.png` in the local working folder) was **not** used. It is a NEAREST resize without the aspect crop, a slight uneven stretch from 2.0272 to 2.0288. The reduction above follows the accepted method instead.

| | Path | Size | SHA-256 |
|---|---|---|---|
| Old | `art/portraits/receptionist/reception_background.png` | 564×278 RGB | `2f23075f151668624e3db1d687e7828a11f6fd11e447cd569ec53607e0f02d74` |
| **New** | `art/portraits/receptionist/reception_background.png` (same path) | 564×278 RGB, 25,821 colours | `16fe3a96d4304efdbd820981ae8d24039b176d30e28b6c0feee8b2baa08c3c74` |

## 4. Unchanged

- **Art:** the reception scene (`fb010301…`), the receptionist NPC (`66c4f32a…`) and the shell (`813e0884…`).
- **Code and content:** all game code and content (`game/js/`, `game/content/`, `game/game.css`, `game/index.html`), the preload list and the asset paths.
- **Contracts:** the scene and portrait densities and the layering contract. The portrait stack is still `background → rear FX → NPC → front FX → shell`, with the NPC a separate layer that is never flattened.
- **Behaviour and other surfaces:** dialogue, route logic, inspector behaviour, NOTES/FILES, `art/ui`, `art/actions`, `art/items`, `design/` and `tools/layout-lab/`.

**Changed files:**
- `art/portraits/receptionist/reception_background.png`.
- `game/qa/run_qa.js`: the background's pinned hash, with the old hash kept in a comment, plus a saved screenshot of the existing QA-only NPC-hide step.
- `game/qa/qa_results.json` and the screenshots.
- This document.

## 5. QA

- `node game/qa/validate_route.js`: **38/38**.
- `game/qa/run_qa.js`, Chromium 147.0.7727.15 + Firefox 148.0.2: **347/347** (static 23/23, Chromium 162/162, Firefox 162/162). It covers:
  - the background at the same path, exactly 564×278 opaque RGB, with the new pinned hash;
  - the layer order and 1× display;
  - every clear-shell portrait pixel (148,790) equal to the new background + NPC composite;
  - the QA-only NPC hide: the background alone is exact, and only portrait pixels change;
  - the scene unchanged, with exact 4× pixels;
  - the inspector overlay still replacing the right column, and closing it restoring the portrait;
  - NOTES/FILES layering unchanged.
- `tools/layout-lab/qa/run_qa.js`: **1920/1920**, and the lab is untouched.

## 6. Owner proofs (actual game, 1920×1080)

- `game/qa/screenshots/00_reception_art_dialogue.png`: the normal reception dialogue state with the revised background.
- `game/qa/screenshots/00a_reception_art_npc_hidden_qa_only.png`: the background alone, with the NPC hidden by a QA-only mutation (no shipped control).
- `game/qa/screenshots/00b_reception_art_inspector_open.png`: the inspector still over the right column.

A before/after comparison of the old and new background, alone and with the NPC, was made locally for review and is not committed.
