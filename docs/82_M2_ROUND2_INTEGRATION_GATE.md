# CYOA M2 — Round 2 Integration Gate (production baseline for Engine S3)

**Date:** 2026-11-09
**Status:** Integrated and QA-complete. **Returned to the PMO for the Engine S3 clearance ruling.** This document does not clear S3.
**Branch:** `agent/m2-round2-integration` (pre-existing; no other branch created). Worktree `_worktrees/CYOA-m2-round2-integration`.
**Base:** `e66e7bfc62052cda641bf9ac9bd9b18ee463dfa8` (M2 polish-lab head; route 49/49, game 520/520, lab 141/141).
**Source:** `03ce0de6c34c707cd5b36f692110850369f97981` on `agent/narrative-study-lab`, "Owner corrections to the polish lab and Narrative Study (2026-11-08)". Its parent `eb4911d` changed only Narrative Study lab files, so every production file below differs from `e66e7bf` by exactly the `03ce0de` hunk (checked per file by `git patch-id`).
**Commits:** `bc8d5af` integration (code, art, pins); then one QA-outputs + this document commit (the branch head reported in the handoff).
**Not touched:** `main`, `agent/engine-v0-rules`, `agent/narrative-study-lab` and its worktree, `docs/81` on the PMO branch. Nothing merged.

## 1. What was promoted

| Round 2 item | Files | How |
|---|---|---|
| A. Two-line tooltips | `game/js/stage.js` (tooltip hunks), `game/js/tuning.js` (`tooltip.reasonFace: 1`, `reasonGapY: 5`), `game/README.md` (tooltip line), `game/qa/run_qa.js` (tooltip hunks) | whole file from `03ce0de` (= `e66e7bf` + its hunk only) |
| | `tools/m2-reception-polish-lab/tunables.js`: the two tunables `tooltip.reasonFace`, `tooltip.reasonGapY` | hunk only |
| | `tools/m2-reception-polish-lab/qa/run_qa.js`: the tooltip-states hunk and the reason-line hunk | hunks only |
| | `tools/m2-reception-polish-lab/README.md`: the "Tooltip reason line" paragraph | hunk only |
| B. Colon glyph | `art/ui/sprites/fonts/locked_pixel_font_atlas_{dark,light}.png`, `art/ui/m1_approved_sprite_sheet.{png,json,manifest.js}` | exact bytes from `03ce0de` |
| | `tools/layout-lab/data/{lab_data.js,placement.default.json,snapshot_assets.js}`, `tools/layout-lab/js/core.js`, `tools/layout-lab/qa/fixtures/placement.qa_baseline.json`, `tools/layout-lab/qa/run_qa.js` | whole file from `03ce0de` (= `e66e7bf` + its hunk only) |
| | `docs/53_M2_PLAYTEST_CORRECTIONS.md`: the colon paragraph | whole file from `03ce0de` |
| C. Slip fade-in 500 ms | `game/js/tuning.js`: `notice.fadeInMs` 180 → **500** | **new production edit** (03ce0de only set it as a lab default) |
| D. NOTES background v2 | `game/js/tuning.js`: `overlay.notesPanel` 1 → **2**; `game/js/stage.js` comment only | **new production edit** (03ce0de only set it as a lab default) |

QA follow-ups written here (not in `03ce0de`): game QA asserts the Round 2 production values, derives the fade-in timing from `fadeInMs`, requires NOTES v2 to be requested and v1 never to be, and pixel-checks NOTES against `notes_panel_v2.png`; lab QA asserts both values open as **production** (no lab change), keeps v1 selectable live, and its PRODUCTION/LAB pixel compare now waits for a slip's hold (with a 500 ms fade-in the old fixed 400 ms wait landed mid-fade). README lines in `game/` and the lab updated.

## 2. What was deliberately excluded from `03ce0de`

| Excluded | Why |
|---|---|
| `narrative-study-stage.js`, `narrative-study-panel.js`, `narrative-study.js` (all hunks) | Narrative B / Focus A / talking-vs-action study; these files do not exist on `e66e7bf` and are not production |
| `review/narrative-mode-b-art-study/narrative-mode-b-candidate-{a,b}-overlay.png` (x 1919 column fix) | belongs with eventual Narrative B integration |
| `tools/m2-reception-polish-lab/lab.js` (all hunks) and `OWNER_DEFAULTS` in `tunables.js` | the "owner's lab defaults" mechanism stood in for unchanged production values; production now carries 500 ms and v2, so it would be a no-op |
| Lab QA hunks: `execFileSync` import, Narrative Study static checks and overlay pins, owner-defaults checks, `ownerDefaults` storage key, every `narrativeStudy()` hunk (NB-1…NB-8, second person, ink, scroll) | Narrative Study or owner-defaults only |
| Lab README: owner-lab-defaults paragraph and every Narrative Study table/text hunk | as above |
| Later commits `ee3a723`, `5fa0df9`, `fa17f01`, `0ce9241`, `7544c5d` | Narrative Study / lab-control work; not part of Round 2 |

`flow.js`, `main.js`, `rules.js`, `pixeltext.js`, `game/content/`, scene/portrait/item art, `art/ui/overlays/`, `art/ui/shell/`, the inspector X and `review/` are byte-identical to `e66e7bf`. The OBSERVE / context-action plumbing (schema, reception OBSERVE, thought role, thought in NOTES, once/spent, item inspection from the item) is unchanged, and its QA is green.

## 3. Final behaviour and values

**Tooltip.** An available action: its label, one line. An unavailable action: line 1 the label as is, line 2 the reason (`NOT NOW`, `NOTHING NEW TO NOTICE`, `NOT AVAILABLE HERE`), in the Labels face at exactly half size (`reasonFace 1`), 5 px below (`reasonGapY 5`), both lines centred in one separate CSS box. `data-text` is `LABEL\nREASON`. Stage clamping, hover/focus show-hide, zero delays, no button hover mutation, and no glow/filter/blur are unchanged and tested.

**Colon (exact `03ce0de` bytes; pixel-verified here).**

| File | sha256 before (`e66e7bf`) | sha256 after |
|---|---|---|
| `locked_pixel_font_atlas_dark.png` | `25b089ace4cba69daad7904f32081a6e5b69566f260bc48252ea5a07bf224b75` | `fcb15fcadbcec99a6835ecd563f414a295dfe82960f06b2de950ad440b17b829` |
| `locked_pixel_font_atlas_light.png` | `93efd300a93a1926a6474fbf7a3175bbd5e2a64df577e815ca914954e0adfe0a` | `3d7e8fb84087bd08dd78de6cddeebdf7f9b75ffee1c90530571fab24fe3ef0d6` |
| `m1_approved_sprite_sheet.png` | `85dabd2fa24580db1ca9602df0f46b470aa7195f0608e541f654fe3aebef4ce0` | `6879d66f9574e388a56f150f42601fa1b52fa307f0079710e69a5bf2d2863dee` |

RGBA sha256: dark `d0f2bdca…cb8b3`, light `8799486274…f35`, as pinned in the sprite-sheet JSON/manifest. Pixel comparison against `e66e7bf`: dark 6 and light 5 changed pixels, all inside the colon's glyph box (x 370–373, y 27–38); the new colon's rows 8–11 equal rows 0–3 exactly (lower dot = upper dot); dark and light colon masks match; the sheet's 11 changed pixels all fall in the two colon boxes, and its dark (8, 1077) and light (528, 1077) sub-images equal the new atlas files exactly. The layout-lab snapshot bundle changes only its two atlas entries. `85dabd2f` joins the layout lab's importable earlier atlases.

**Item-received slip (production).** `y 730`, `durationMs 3600`, `fadeInMs 500`, `fadeOutMs 220`. Whole slip, opacity only, linear, no transform/filter/CSS transition; early click enters fade-out; queue waits; restart clears; `role=status`, `aria-live=polite`. The polish lab opens on 500 ms as production.

**NOTES (production).** `overlay.notesPanel: 2` → `art/ui/overlays/notes_panel_v2.png` (sha256 `4bc4bf47…3fa2`) is preloaded and drawn; `notes_files_panel.png` is never requested by the game (it stays the lab's v1 option). FILES keeps `files_panel.png` and YOUR FILES at its position. NOTES content/history semantics unchanged (whole-playthrough NOTES is Engine S2.1/S3, not here).

## 4. QA (this machine, 2026-11-09, load ≈ 2–3)

| Suite | Result | Baseline `e66e7bf` |
|---|---|---|
| Route validator | **49/49** (`route_results.json` unchanged) | 49/49 |
| Game QA | **525/525**: static 43/43, Chromium 241/241, Firefox 241/241 | 520/520 |
| M2 polish-lab QA | **143/143**: static 5/5, Chromium 69/69, Firefox 69/69 | 141/141 |
| M1 layout-lab QA | **1916/1924**; the 8 failures are identical to a same-session run of untouched `e66e7bf` (1914/1922) | 1914/1922 |

The 8 layout-lab failures, all pre-existing and unrelated to the font: the sprite package holds an unlisted `sprites/inspect_close.png` (static, reported twice); bundled baseline ≠ `placement.default.json` (twice); placement marked unapproved (twice); shipped defaults (Chromium, Firefox). **Zero new failures.** The two extra passing checks are `03ce0de`'s "a placement saved against atlas 85dabd2f still imports" (Chromium, Firefox).

Round 2 checks (all pass in both browsers): unavailable tooltip = exactly two semantic lines, label then reason, reason at exactly half the Labels face, centred, inside the box; available tooltip one line; clamping; focus/blur; hover leaves button styles and pixels unchanged. Production `fadeInMs` 500 with the rise measured frame by frame (linear, full at ~500 ms), hold, 220 ms fade-out, removal at ~3600 ms, early dismiss in hold and during fade-in, queue, restart. NOTES v2 production default, requested, drawn 1:1; v1 not requested; FILES on its own panel; transcript checks unchanged. Static inspector X, OBSERVE/context action, served reception art hashes and route all unchanged.

During integration, the first full lab run was 140/143: the PRODUCTION/LAB pixel compare of `item-received` caught the slip mid-fade (now 500 ms against a fixed 400 ms wait). Fixed in QA by waiting for the hold; rerun 143/143. The first game run had one static failure that only means "uncommitted art/lab changes" (working tree before commit); green after the commit.

## 5. Ownership and concurrent work

- `agent/narrative-study-lab` @ `7544c5d`, worktree `_worktrees/CYOA-narrative-study-lab` (clean): owned by the Narrative Study session. **Not edited.** Its Narrative B / Focus A, quoted spoken cards, action-card ink, OBSERVE slate thought study and Narrative Study panel remain there for later renderer work; the thought/OBSERVE presentation PMO owns that line. That branch shares `stage.js`, `tuning.js`, the font package, layout-lab pins, the polish lab and QA with this one; when it next integrates, it should rebase onto this baseline (the Round 2 hunks are already here, so `03ce0de`'s production hunks will drop out).
- `_worktrees/CYOA-m2-reception-polish-lab` is checked out at `8d67e17`, behind its own remote `e66e7bf`; clean and untouched.
- The main checkout (`CYOA`, `agent/m2-reception-ui-art-01` @ `6ac5cb1`) has 10 uncommitted entries from another session; untouched.
- `agent/engine-v0-rules` @ `713f5a9`: untouched, not rebased.

## 6. Engine S3 clearance

**Pending PMO ruling.** If accepted, the exact baseline for Engine S3 is the head of `agent/m2-round2-integration` reported in the handoff. This document does not authorize S3, a rebase of the engine branch, or any merge.
