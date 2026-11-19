# CYOA M1 — Exact v2 Modular Control Sprite Production

**Date:** 2026-10-31  
**Branch:** `review/m1-ui-shell-v2`  
**Status:** PRODUCTION PNGS COMMITTED / ART CANDIDATE — owner approval pending; not game runtime.
**Starting branch head:** `41bff906a332bc0c06afd285262a2f0c76392b56`.
**Generated asset/proof commit:** `a84d2dea4bfc5123a707b03b5ac097f46742e72b`.
**Repeatable CI proof:** https://github.com/InterstellarHarvest/out-of-order/actions/runs/41266430632

## Authority and conflict resolution

The exact owner-final shell is `layout-final.png`, **1920×1080 RGBA**, SHA-256 `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6`, Git blob `1849c8ec192cd639dd8550de0dcdda1aa88d2e4f`.

The locked component ZIP is `review/m1-ui-shell-v2/CYOA_M1_locked_components_v1.zip`, SHA-256 `58c71b660f87a83400c80d0e75c2037af67827b00e2f4918cff794500050f302`, Git blob `f407b21e20dba861f192530f763a7ded6d3746e1`.

The *latest* owner instruction in `docs/39_M1_OWNER_UI_CONTROLS_CORRECTIONS.md` explicitly removed **all** action-button fasteners. This supersedes the older candidate recommendation for small mismatched fasteners, even though the current handoff allows them as an option. Hence **the v2 buttons are fastener-free**. Main shell fasteners remain untouched.

The latest image-generated illustrations were used only for the **control art direction**, not as exact crop sources: they are approximate 1672×941 pictures, *not* canonical or machine-aligned sprites. This revision authors actual PNG assets with hard alpha at exact dimensions and verifies them against the real immutable 1920×1080 PNG. All historical candidates in parent `candidate_art/` remain untouched.

## Exact v2 sprite list (13 original PNG components)

| File | Native display dimensions | Notes |
|---|---|---|
| `inv_left_up.png` | 56×112 | Smaller visible left plate + flat triangle, no fasteners |
| `inv_left_down.png` | 56×112 | Whole plate moves ~2 display pixels inward; fixed housing footprint |
| `inv_right_up.png` | 56×112 | Separately authored right plate, no runtime mirroring |
| `inv_right_down.png` | 56×112 | Separate right physical pressed relief |
| `utility_a_up.png` | 144×128 | INSPECT body, blank face, no fasteners |
| `utility_a_down.png` | 144×128 | Full recessed face, same base color; dynamic label moves independently in code |
| `utility_b_up.png` | 144×128 | NOTES body, muted grey metal |
| `utility_b_down.png` | 144×128 | Recessed NOTES treatment shared in principle across all three buttons |
| `utility_c_up.png` | 144×128 | JOURNAL body, subdued grey-green metal |
| `utility_c_down.png` | 144×128 | Recessed, no color-swapped selected state |
| `choice_scroll_thumb_top.png` | 20×12 | Fixed rounded upper cap |
| `choice_scroll_thumb_middle.png` | 20×8 | Exactly tileable repeating center |
| `choice_scroll_thumb_bottom.png` | 20×12 | Fixed rounded lower cap |

All 13 are **PNG RGBA**, hard alpha 0/255 only, authored on a **2× logical pixel grid** without antialiasing. Same canvas size and same visible silhouette bounding box across every matching UP/DOWN pair. Arrow visible bodies are intentionally much smaller than their 56×112 canvases; this is deliberate to preserve existing placement rectangles. Texture on the three-piece tan thumb is repetitive and uses no vertical cap stretching.

## Reused untouched owner-locked art

From the approved original ZIP, byte-for-byte unchanged:
- Twelve player-choice frames: 548px wide; 1/2/3/4 lines 80/108/136/164px; A/B/C wear variants per height. Three 108px cards + two 12px gaps fit a 348px viewport.
- One approved 96×96 inventory slot: seven at 102px pitch, six-pixel gap.
- Original approved dark/light bitmap-font atlas and glyph mapping.
- Original `layout-final.png` static frame and all its apertures, background, objective plaque, speech backing and scrollbar track.

**No change to the owner-final shell or original locked ZIP.** Shell SHA was checked before and after every CI assembly. All new overlays exist as separate files.

## Exact 1920×1080 shell assembly proofs

All under `review/m1-ui-shell-v2/candidate_art/v2/`, directly composited from the canonical shell, the real approved ZIP member sprites, and v2 PNGs (not image-generated concept screens):

1. `proof_01_inventory_seven_up.png` — seven approved slots plus smaller v2 arrows.
2. `proof_02_utilities_up.png` — blank v2 action bodies only, laid out in the bottom-right fixed housing.
3. `proof_03_choices_scroll_full.png` — real A/B/C choice cards and thumb filling the *usable* scrollbar rail (not the bezel).
4. `proof_04_full_up.png` — assembled UI with atlas text, 7 slots, UP buttons.
5. `proof_05_full_down.png` — all arrow and action bodies recessed; button label atlas glyphs move **with** each button (+2px,+2px).
6. `proof_06_choice_overflow_notes_pressed.png` — proportional, repositioned scroll thumb and only NOTES pressed; choice overflow does not cause a speech-overflow indicator.
7. `proof_07_six_slot_count_only.png` — six uses **the same unscaled approved 96px slot** with wider pitch. This proves count/geometry only; it is **NOT** the previously suggested enlarged six-slot sprite or an approval decision.

Review-only alpha presentations:
- `contact_sheet_checker.png` — transparent components on checkerboard (no source altered).
- `contact_sheet_black.png` — identical components on black to detect fringe.

Recommended review priority: `proof_04_full_up.png`, `proof_05_full_down.png`, `proof_06_choice_overflow_notes_pressed.png`, and `contact_sheet_checker.png`.

## QA and rejects

CI runs `generate_v2.py`, `assemble_v2.py`, `contact_v2.py`, and `qa_v2.py` through `.github/workflows/m1-v2-sprite-production.yml`; the new PNGs and reports are Git-tracked, not generated only in conversation.

Passed:
- 13/13 PNG dimensions, RGBA, alpha 0/255, integer 2× logical-grid pixels.
- Five matching UP/DOWN button pairs have exactly equal visible bounding boxes (no perceptual shrinking from silhouette drift).
- The most common body-face RGB material is identical in UP and DOWN; only depth cues and physical displacement change.
- All 7 proof screenshots are exactly 1920×1080.
- Exact owner-final PNG SHA-256 and Git blob, locked sprite ZIP SHA-256 and Git blob.
- Exact artifact digests are stored in `asset_sha256.json`; QA evidence in `qa_report.json` and `assembly_report.json`.
- Dynamic action labels use approved **light** bitmap atlas, move together with pressed state; objective plaque dynamic label is centered using actual plaque bounds, and objective body text has increased left padding.
- No fasteners anywhere on v2 utility or inventory-arrow sprite faces.

Self-rejections corrected during production:
- Original proof placed dynamic objective title to left of actual shell plaque: recentered using measured plaque x≈852..1187.
- Original action labels were drawn dark on dark: changed to the approved light atlas.
- Long objective description initially wrapped into a third line: used actual panel safe width and two lines.
- Early pressed silhouette lost a few edge pixels: added fixed dark housing silhouette so UP/DOWN outer bounds match.
- Generator accidentally added proof PNGs to the sprite manifest: restricted manifest to the exact 13 named components.

## Pending owner approval / subsequent work

**Owner approval required:** thinner arrows; v2 full-face pressed readability at normal view scale; flat fastener-free action buttons, slight sibling color differences; tan rounded three-piece scrollbar texture; actual seven-slot versus count-only six-slot composition. Six *larger* slots would require a separate explicitly approved asset design; **not silently supplied here**.

This is a static sprite-production / shell assembly pass, **not a browser runtime implementation**. CSS/HTML scrollbar tiling, live press/release mouse/touch/keyboard handling, choice card press+text offsets, typewriter and speech scrollbar conditions, and full browser interaction QA remain to be completed in the separate placement/runtime lab before canon promotion.

The v2 sprites and manifest entries are labeled **CANDIDATE**. Do not replace original locked assets or merge production art without owner approval.

## Source paths

- `review/m1-ui-shell-v2/candidate_art/v2/` — actual sprites, all proofs, four reproduction/QA scripts, hash reports.
- `design/m1_sprite_manifest.json` — 15 preserved canon asset refs and 13 v2 candidate PNG refs.
- `.github/workflows/m1-v2-sprite-production.yml` — reproducible binary CI.
- `docs/39_M1_OWNER_UI_CONTROLS_CORRECTIONS.md` — owner decisions.
