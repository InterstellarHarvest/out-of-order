# CYOA M2 — Reception NOTES / FILES Art Pass 01

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-notes-files-art-01`, created by PMO from `c76d8d6c90a80c7b1ef7cbbe9989aeb0be1001b4`, the accepted inspector-art checkpoint.  
**Status:** the NOTES / FILES development panel is replaced with the production records panel. Not merged.

## 1. Asset

| | |
|---|---|
| Production path | `art/ui/overlays/notes_files_panel.png` (new folder `art/ui/overlays/`) |
| Size | **1255 × 822** RGB, opaque: exactly the scene aperture |
| SHA-256 | `bc9c35a880874a5f290dc3174b88fb46cd982bd1321502f39d2781dcbe94e783` |
| Display | 1:1, no runtime scaling |

- **Source:**
  - The owner's Codex master is `notes_files_records_panel_raw.png` (1549 × 1015 RGB, SHA-256 `4f3a3bc05dd9e5670d822f2f9e7449e40fd8ba671f53e5fb911685893000855d`). It is local only in `source/reception_density/`, git-ignored and untracked.
  - The owner made the native 1255 × 822 export with a nearest-neighbour fit (`art/ui/sprites/reception/notes_files_records_background.png` in the local working folder). The master's aspect, 1.5261, is essentially the panel's, 1.5268.
- **Normalization in this pass: none.** The committed file is the owner's export **byte for byte**: no crop, resample, palette, dither, denoise or sharpening.
- **Contents:** a blank teal title plate across the top, and a broad cream reading area in a riveted teal frame. There is no baked text, button or scrollbar.

## 2. Runtime (`game/js/stage.js`)

```
#overlay   (div, R.sceneAperture.rect = (32, 44) 1255x822; scene -> overlay -> shell order unchanged)
├── img#notesFilesPanel   the preloaded panel image, 1255x822 at (0, 0), 1:1, pixelated, no transform/filter/opacity/transition
└── canvas#overlayCanvas  1255x822, transparent: draws ONLY the dynamic title and text
```

- `renderOverlay()` no longer calls `P.panel()` and no longer paints the code-drawn dark content rectangle. The canvas is cleared and redrawn with text only, so every pixel without text shows the panel image exactly.
- `G.OVERLAY_ART.panel` names the image. The overlay still covers only the scene aperture: never the portrait, inventory or buttons. The shell stays on top.
- **`P.panel` callers:** after this pass the only caller is `P.inspectArt`, the inspect-art fallback for an item without `inspectArt` (`game/js/placeholders.js`). `P.panel` therefore stays.

### Text regions (panel coordinates; stage = panel + (32, 44))

The regions were measured from the art:

- **Teal title plate:** teal at x 76–1175, y 3–108. The shell frame covers the top 11 px, so the visible plate is y 11–108.
- **Solid cream reading area:** x 31–1222, y 122–776.

| Region | Placement | Ink / face |
|---|---|---|
| Title (`NOTES: EVERYTHING SAID AT RECEPTION` / `FILES: YOUR CASE FILE`) | x 100, vertically centred on y 60 (the plate's centre) | light ink, Labels face (as before) |
| Body | box x 48, y 140, 1159 × 620 (to y 760, inside the cream area) | **dark ink** on the cream (`#203037`), roles unchanged: Labels for speaker tags, Dialogue / Choices for lines |

**What changed for the geometry, and what did not:**

- **Unchanged:** the wording, fonts and roles; the line height (26); the gaps; the left edge (48); and the wrap width (1159). **Lines therefore break exactly as before.**
- **The title is drawn on the panel's title plate.** It used to be the first scrolled line; it now stays in view instead of scrolling away. `dataset.text` still begins with the title.
- **Fewer body rows are visible:** the visible body height is 620 px, against 718 before, because the text must sit inside the cream area. This is the unavoidable geometry change.
- **Unchanged scrolling:** the wheel scrolls 3 lines; ↑/↓ scroll 1 and PageUp/PageDown 10; NOTES opens at the latest lines. No scrollbar or arrows were added.
- **Unchanged closing:** pressing NOTES or FILES again, or Escape, closes the overlay.

## 3. Preload (`game/js/main.js`)

The panel joins the existing `G.loadImages` boot list, so `ready` means it is decoded.

## 4. QA

- `node game/qa/validate_route.js`: **38/38**. The route graph, states and endings are unchanged.
- `game/qa/run_qa.js`, Chromium 147.0.7727.15 + Firefox 148.0.2: **402/402** (static 32/32, Chromium 185/185, Firefox 185/185).
  - The first two-browser run was 401/402. Its one failure was the known Firefox opening-typing timing flake ("the NPC line types character by character"), and the full re-run was clean.
  - Every NOTES/FILES check passed in both runs.
- **Static checks:**
  - the panel is allowlisted by exact path and pinned hash (no wildcard), and is 1255 × 822 opaque RGB;
  - `stage.js` makes no `P.panel(` call, while `P.panel` stays for the inspect fallback;
  - every earlier pin is unchanged: the scene `fb010301…`, the background `16fe3a96…`, `receptionist_idle` `761a45d4…`, the alternate NPC designs `idle2` `38488a22…` / `idle3` `95ead2a6…`, the inspect art `9c8527a3…`, and the X `8247d4b6…` / `576b4fbc…`.
- **Loading:** the panel is decoded before `ready`, and the served bytes match the pin.
- **Structure:** `#overlay` holds exactly `IMG#notesFilesPanel, CANVAS#overlayCanvas`. The panel is 1255 × 822 natural, displayed 1:1 at the scene-aperture origin, with no transform, filter, opacity or transition, and smoothing off. The scene → overlay → shell order is unchanged.
- **Pixels:** at 1920 × 1080 and DPR 1, every clear-shell, text-free overlay pixel (919,906) equals the panel file 1:1, with 77,111 text pixels present. There is exactly one light title ink and one dark body ink (`32,48,55`).
- **NOTES:**
  - the title is fixed, and the transcript holds both speakers' lines unchanged;
  - it opens at the latest lines, and the transcript genuinely scrolls here (max scroll 16);
  - the wheel scrolls back to the start;
  - the portrait is untouched while it is open.
- **FILES:** the title is fixed, and the appointment / issued / returned-at-4:52 entries are unchanged.
- **Closing:** pressing FILES again closes and pressing it once more reopens. Escape closes. After closing, the exact scene and layered portrait are restored.
- **Layout lab:** not run. This pass touches no lab, design or shared shell file: it only adds `art/ui/overlays/`.

## 5. Proofs (actual `game/index.html`, 1920 × 1080)

- `game/qa/screenshots/00g_notes_scrolled_to_latest.png`: NOTES as it opens, scrolled to the latest lines, with several transcript entries on the production panel.
- `game/qa/screenshots/00f_notes_open_start.png` (= `09_notes_transcript.png`): NOTES scrolled back to the start.
- `game/qa/screenshots/00h_files_open.png` (= `10_files_case_file.png`): FILES with all three case-file entries (appointment, key issued, returned at 4:52).
- `game/qa/screenshots/00i_overlay_closed_restored.png`: after closing, the scene and the layered portrait are back.

## 6. Remaining placeholders

- The temporary tooltip box.
- The provisional code-drawn item-received slip.
- Slot art for QA-only overflow items (`P.slotItem`).
- The inspect-art fallback (`P.inspectArt` → `P.panel`), shown only for an item without `inspectArt` (none in the current content).
