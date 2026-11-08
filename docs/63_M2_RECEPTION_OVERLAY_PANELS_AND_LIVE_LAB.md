# CYOA M2 — Separate FILES panel, NOTES v2 candidate, live polish lab

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-polish-lab` (on top of the polish lab, docs/62). Not merged.  
**Owner requests:**
- FILES gets its own background, separate from NOTES.
- A NOTES background v2 to try, as a toggle.
- The lab sliders should update in real time.

## 1. FILES has its own panel (production change)

The owner decided this, so it is applied to the game rather than left as a lab option.

| Overlay | Panel | Source (owner, local) | SHA-256 |
|---|---|---|---|
| NOTES | `art/ui/overlays/notes_files_panel.png` (unchanged) | `art/ui/sprites/reception/notes_files_records_background.png` | `bc9c35a8…` |
| FILES | `art/ui/overlays/files_panel.png` (**new**) | `art/ui/sprites/reception/files_records_background.png` | `e1107f21…` |

- **The art:** both panels are 1255 × 822 opaque RGB, exactly the scene aperture, and are copied byte for byte from the owner's files. Nothing was regenerated, resized or edited.
- **The code:**
  - `G.OVERLAY_ART` in `game/js/stage.js` is now per overlay: `notes`, `files`, and the `notesV2` candidate (§2).
  - `renderOverlay` puts the open overlay's own preloaded image under the text canvas, as `#overlay > img#overlayPanel, canvas#overlayCanvas`. The image was formerly `img#notesFilesPanel`.
  - `main.js` decodes the NOTES panel and the FILES panel before ready.
- **The text:** the title and body regions are unchanged and fit the FILES panel. The title at (100, centred on 60) sits on the teal band. The body box (48, 140, 1159 × 620) lies inside the FILES cream area (x 28–1225, y 133–767).
- **Open owner question:** the FILES panel has a small cream label plate at the top centre (inside about x 512–745, y 54–86). In production it is left blank, and the title stays at the left in light ink.
  - The current title, `FILES: YOUR CASE FILE`, is 336 px wide in the Labels face, so it does not fit the plate.
  - `FILES` (80 px) or `CASE FILE` (144 px) would fit, centred in dark ink.
  - That is a copy and layout decision for the owner, so nothing has been changed.

## 2. NOTES background v2: a lab toggle

- **The art:** `art/ui/overlays/notes_panel_v2.png` (`4bc4bf47…`, 1255 × 822 RGB) is the owner's `notes_files_records_background_v2.png`, byte for byte. It is committed and pinned, like the idle2 / idle3 candidates.
- **The setting:** `G.TUNING.overlay.notesPanel` chooses the NOTES panel. It is **1** in production (v1, `notes_files_panel.png`); **2** selects v2.
  - The game loads only the chosen one. QA checks that production never requests v2.
- **In the lab:** v2 is the tunable **`overlay.notesPanel`** ("NOTES background", 1 = v1, 2 = v2) in the NOTES / FILES section. It exports and imports like every other value.
  - The lab frame decodes all panel variants up front, so the switch is instant.
  - FILES always shows its own panel, whatever the NOTES choice.
- **If the owner picks v2:** set `notesPanel: 2` in `game/js/tuning.js` when the approved changes are applied.

## 3. Live lab values

**Before:** a control change reloaded the lab frame 250 ms after the last movement and replayed the current state. That took about a second, so dragging a slider showed nothing until the drag stopped.

**Now:** every change applies live, at most once per animation frame:

1. `lab.js` sends the full value map to the lab frame (`LAB_STAGE.applyValues`).
2. The lab frame writes the values into `G.TUNING` / `G.layout` and calls `G.rebuildStage()`.
3. `G.rebuildStage()` is a new function in `game/js/stage.js`. It rebuilds the stage DOM from the current values and redraws the game where it stands:
   - the history is rewrapped, keeping its scroll and the newest line;
   - the choices are laid out again, keeping their scroll;
   - the inventory position, inspector, NOTES/FILES (lines and scroll), item slip and tooltip all stay as they were.

**Details:**
- **Timing:** applying a change takes one frame. QA drives a slider drag of five steps and checks that the receptionist moves 1 px on every step.
- **No reload:** the lab frame never reloads for a value change. The reload path remains only as a fallback, for a frame that is mid-navigation.
- **During a state load:** a change that arrives while a state is loading (with the fast timings in force) is held and applied once the load ends.
- **Production game:** never calls `G.rebuildStage`, which QA checks. The lab-only aids (toggles, bounds outlines, hold-X, freeze) are reapplied after each rebuild.

## 4. QA

See docs/62 §10 for the full run, which includes these checks.

**Game QA:**
- the FILES and NOTES v2 panels are pinned by path and hash, and all three panels are 1255 × 822 RGB;
- production uses NOTES v1;
- both production panels are decoded before ready and served as the approved bytes;
- v2 is never requested;
- the overlay structure is checked;
- every text-free, clear-shell pixel equals the overlay's own panel 1:1, for **both** NOTES and FILES, with the ink rules unchanged.

**Lab QA:**
- a slider drag is live, step by step, with no reload;
- a live change keeps NOTES open on the same lines and scroll;
- v1 is the default in both frames;
- v2 switches live in the lab frame only, and is exported;
- FILES shows `files_panel.png` in both frames;
- the v2 bytes served match the committed file;
- reset returns NOTES to v1;
- **after live changes and a reset, PRODUCTION and LAB are pixel-identical again** in five states, in the same never-reloaded frame.
