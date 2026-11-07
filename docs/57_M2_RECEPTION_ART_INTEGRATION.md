# CYOA M2 — Reception Art Integration

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-art-integration`, created by PMO from `871c9e3f3c04c0282d41f2e1fca25ba3291054b0`. That commit holds the locked density contract, the three candidates, and the docs/56 §9 PMO approval for integration.  
**Status:** the approved reception art is integrated into the playable M2 slice (`game/index.html`). Not merged. No animation, FX or new art.

docs/56 remains the art approval and provenance record, and docs/54 the density and colour contract. This document records only the integration.

## 1. Promotion to production names

The approved candidate files were moved with `git mv`; their bytes are unchanged and no duplicate candidate PNGs are kept.

| Candidate (docs/56) | Production path | SHA-256 (unchanged) |
|---|---|---|
| `art/scenes/conference_hall/reception/reception_scene_candidate_01_314x206.png` | `art/scenes/conference_hall/reception/reception_scene.png` | `fb010301d2df0c06d0cedaff6e35e60661e18764c9e5d9ed755ad78b0ac5fd53` |
| `art/portraits/receptionist/reception_background_candidate_01_564x278.png` | `art/portraits/receptionist/reception_background.png` | `2f23075f151668624e3db1d687e7828a11f6fd11e447cd569ec53607e0f02d74` |
| `art/portraits/receptionist/receptionist_candidate_01_564x278.png` | `art/portraits/receptionist/receptionist_idle.png` | `66c4f32a13a6de3cdffa07163b18de7f9959b782484c766ea3512093c4e4d2a3` |

`receptionist_idle.png` names the baseline NPC role. There are no other poses, expressions or frames.

## 2. Runtime rendering (`game/js/stage.js` `buildApertures()`)

The placeholder canvases and their `P.panel()` calls are gone from the scene and portrait. `game/js/placeholders.js` stays for the other placeholders (§6).

### Scene

```
div#scene.aperture.art-aperture   R.sceneAperture.rect = (32, 44) 1255x822, overflow clipped
└── img#sceneArt   reception_scene.png
```

- Natural size 314×206, displayed at **exactly 4× nearest neighbour = 1256×824**, starting at the aperture origin (32, 44).
- The 1255×822 aperture clips the overflow of **1 px on the right and 2 px at the bottom**. The image is never resized to fit.
- Whole stage pixels, `image-rendering: pixelated` (`crisp-edges` in Firefox), and no transform, filter, opacity or transition.

### Portrait

```
div#portrait.aperture.art-aperture   R.portraitAperture.rect = (1333, 44) 564x278, overflow clipped
├── img#portraitBackground   reception_background.png   564x278 at 1x
├── div#portraitRearFx       empty rear/mid FX layer     564x278
├── img#portraitNpc          receptionist_idle.png       564x278 RGBA at 1x (binary alpha)
└── div#portraitFrontFx      empty foreground FX layer   564x278
```

- Each layer sits at left 0, top 0, 564×278, drawn 1:1. The four layers are separate DOM elements and are never drawn to a shared canvas or combined, so the NPC and the background can later animate or change independently.
- The FX layers are empty and inert (`pointer-events: none`).
- **Stage order:** `#scene`, `#portrait`, `#overlay` (NOTES/FILES), then `#shell`, so the canonical shell stays above all scene and portrait art. The inspector (`#inspector`, with `art/ui/shell/item-overlay.png`) is built after the shell and still covers the right column when it is open.

**Paths and scales** are declared once, in `G.RECEPTION_ART` (`stage.js`). The `<img>` elements are the very `Image` objects the boot loader decoded.

## 3. Preload (`game/js/main.js`)

The three reception images are added to the existing `G.loadImages` boot list, built from `G.RECEPTION_ART` with `G.url`; there is no new asset manager. `document.body.dataset.ready = 'true'` therefore means the scene, portrait background and NPC are already loaded and decoded, with nothing left to pop in.

## 4. Files changed

- **Art:** the three `git mv` renames above.
- **`game/js/stage.js`:** `buildApertures()` builds the art layers; adds `G.RECEPTION_ART`, `artLayer()` and `fxLayer()`.
- **`game/js/main.js`:** preloads the three images.
- **`game/game.css`:** `.art-aperture` (clips) and `.art, .fx` (no pointer events).
- **`game/README.md`:** the Art bullet now lists the reception art; nothing else was changed.
- **`game/qa/run_qa.js`:** art checks and the two guard repairs (§5); regenerated `qa_results.json` and screenshots.
- **`docs/57`:** this document.

**Untouched:** `art/ui/`, `art/actions/`, `art/items/`, `design/`, `tools/layout-lab/`, dialogue, choices, inventory, narrative state, receptionist copy, the 4:52 contradiction, inspector geometry, and the shell.

## 5. QA changes

### New checks (`game/qa/run_qa.js`, Chromium and Firefox)

**Static checks:**
- The three production files exist with their approved hashes, and no `_candidate_` PNGs remain.
- The scene is 314×206 opaque RGB, and the background 564×278 opaque RGB.
- The NPC is 564×278 RGBA with alpha exactly {0,255}, real transparency, and no RGB under alpha 0.

**Runtime checks:**
- The served bytes equal the approved files, and there is no placeholder canvas or label.

**Art proof, on a fresh page at the first choices, 1920×1080, devicePixelRatio 1:**
- **Geometry:** the scene aperture is the committed 1255×822 rectangle and clips. The scene image is 314×206 natural with a 1256×824 box at the aperture origin: exactly 4×, nearest neighbour, with no transform, filter, opacity or transition, and none on its ancestors.
- **Portrait layers:**
  - the portrait aperture is the committed 564×278 rectangle and clips;
  - the layers are exactly background → rear FX → NPC → front FX, as four separate elements;
  - the background and NPC are 564×278 natural, displayed at 1×;
  - the FX layers are empty;
  - the stage order is scene, portrait, overlay, shell.
- **Pixels:**
  - **every** clear-shell scene pixel (997,017) equals its exact 4× nearest-neighbour source pixel;
  - **every** clear-shell portrait pixel (148,790) equals the 1:1 background + binary-alpha NPC composite;
  - just outside the aperture, the 1 px / 2 px overflow is clipped: only the shell over the stage colour shows.
- **NPC hide (QA only):** a mutation applied only within QA hides `#portraitNpc`. The background then shows alone and exact, and only portrait-aperture pixels change. The game ships no NPC toggle.

**Flow checks:**
- **Inspector (FACILITIES KEY):** with the inspector open, every opaque item-overlay pixel in the right column shows the overlay exactly, and less than 1% of the portrait's clear pixels still match the portrait. The inspector is drawn above the portrait and the shell. After it closes, the exact layered portrait and scene return.
- **NOTES:** the overlay keeps the scene-aperture rectangle and sits above the scene art and under the shell. It covers more than 90% of the scene pixels, and the portrait is untouched. FILES behaviour is unchanged (existing checks).

**Mutation check:** forcing `image-rendering: auto` on the scene makes four checks fail, with about 554k scene-pixel mismatches, so the checks do detect smoothing.

### Two stale static guards, repaired narrowly

1. **"M1 unchanged since M2 began"**
   - **Before:** it pinned `art/`, `design/`, `tools/layout-lab/`, `README.md` and `docs/` to the M2 starting bytes. It failed on main itself, because approved PMO documentation (docs/45 §6A, README) changed later.
   - **After:** it pins exactly the M1 runtime and design surfaces: `art/ui`, `art/actions`, `art/items`, `design` and `tools/layout-lab`, with the same recorded owner-edit exceptions as before.
   - The working-tree check covers the same surfaces plus the three production art files.
   - Mutable documentation is governed by PMO review, not byte pins. Nothing else is waived.
2. **"Nothing added to art/"**
   - **Before:** it admitted only the owner's pinned `item-overlay.png`.
   - **After:** it also admits **exactly** the three reception production files, by exact path, each pinned to its approved SHA-256.
   - There is no folder wildcard: any other new file under `art/`, `design/` or the lab still fails.

## 6. Results

| Check | Result |
|---|---|
| `node game/qa/validate_route.js` | **38/38** |
| `game/qa/run_qa.js`, Chromium 147.0.7727.15 + Firefox 148.0.2, Playwright 1.59.1 | **347/347**: static 23/23, Chromium 162/162, Firefox 162/162 |
| `tools/layout-lab/qa/run_qa.js` | **1920/1920**; its regenerated results were restored, so the lab stays byte-identical |

No narrative path changed: the route graph, states and endings validate exactly as before.

**Owner-review proofs** from the actual playable game (`game/index.html`), 1920×1080:
- `game/qa/screenshots/00_reception_art_dialogue.png`: the normal reception dialogue state, with the opening line and first choices, the production scene, the layered portrait and the canonical shell.
- `game/qa/screenshots/00b_reception_art_inspector_open.png`: the FACILITIES KEY inspector open, with the item overlay replacing the right column.

The existing screenshots `01`–`12` were regenerated and now show the integrated art.

## 7. Remaining placeholders (out of scope here)

- FACILITIES KEY inspect art (`P.inspectArt`; the slot sprite is shown at 3×).
- The inspector close button X (`P.closeButton`).
- The NOTES / FILES panel treatment (`P.panel`).
- The temporary tooltip box.
- The provisional code-drawn item-received slip.
- Slot art for QA-only overflow items (`P.slotItem`).

## 8. Play it

From the repository root:

```sh
python3 -m http.server 8137
```

Then open <http://localhost:8137/game/index.html>. Opening `game/index.html` directly from disk also works.
