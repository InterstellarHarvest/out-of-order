# CYOA M2 — Reception Production-Art Pass 01

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-art-production-01`, created by PMO from `90b99f7236eca651713d7b140957cd2bc17a0f81`, the docs-only locked-density decision commit.  
**Status:** **CANDIDATES FOR OWNER/PMO ART REVIEW. THE ART IS NOT YET FINAL.** Nothing here is production-approved, nothing is wired into the game, and nothing is merged.

## 1. Locked densities (contract: docs/54)

The densities are locked as the production starting contract in `docs/54_SCENE_PORTRAIT_PIXEL_DENSITY_AND_COLOR_CONTRACT.md` §2. This pass applies them; it does not restate or change them.

| Tier | Logical | Runtime display |
|---|---|---|
| Scene Density | 314 × 206 | 4× nearest neighbour = 1256 × 824, clipped by the 1255 × 822 aperture |
| Portrait Density | 564 × 278 | 1× = the 564 × 278 portrait aperture |

Docs/54 §6 has the normalization rules, §4 the layered portrait contract, and §5 the colour policy (full colour, no 256 cap, controlled palettes).

## 2. The three candidates

| # | Candidate | Committed path | Size / mode | SHA-256 |
|---|---|---|---|---|
| 1 | World scene | `art/scenes/conference_hall/reception/reception_scene_candidate_01_314x206.png` | 314 × 206 RGB, opaque, 868 colours | `fb010301d2df0c06d0cedaff6e35e60661e18764c9e5d9ed755ad78b0ac5fd53` |
| 2 | Receptionist (NPC layer) | `art/portraits/receptionist/receptionist_candidate_01_564x278.png` | 564 × 278 RGBA, alpha {0, 255}, 11,756 visible colours | `66c4f32a13a6de3cdffa07163b18de7f9959b782484c766ea3512093c4e4d2a3` |
| 3 | Portrait background | `art/portraits/receptionist/reception_background_candidate_01_564x278.png` | 564 × 278 RGB, opaque, 28,007 colours | `2f23075f151668624e3db1d687e7828a11f6fd11e447cd569ec53607e0f02d74` |

### 2.1 World scene: candidate 01

- **Origin:** the density test's Scene C.
- **Copy:** byte-identical to `art/scenes/conference_hall/reception/density_test/reception_scene_02_nearest_clean_314x206.png` on `agent/m2-reception-density-test` (`f4168a8`, git blob `0ebb25f3…`). It was not regenerated or renormalized.
- **How that file was made:**
  1. The owner's raw `reception_world_scene_density_test_02_raw.png` (1548 × 1016) was given a centred exact-aspect crop.
  2. It was reduced to 314 × 206 with NEAREST only.
  3. Its colours went through a conservative non-spatial merge: each colour joins an existing colour within ΔE00 ≤ 2.0, through a per-colour table. No pixel moved and there was no averaging (docs/54 §6).
- **The test-specific numbers are not production constants:** the 2.0 threshold and the 868-colour result.

### 2.2 Receptionist: candidate 01

- **Origin:** the density test's Portrait 03 at full size (P3-FULL). It is the current receptionist design reference.
- **Copy:** byte-identical to `art/portraits/receptionist/density_test/receptionist_03_full_564x278.png` on `agent/m2-reception-density-test` (`f4168a8`, git blob `46b370e4…`). It was not regenerated or renormalized.
- **How that file was made:**
  1. The owner's raw `receptionist_portrait_density_test_03_raw.png` (1786 × 881 RGBA) was given a centred exact-aspect crop.
  2. It was reduced with premultiplied-alpha Pillow LANCZOS straight to 564 × 278.
  3. Alpha ≥ 128 became 255, everything else 0, and RGB under alpha 0 was set to 0,0,0.
  4. There was no colour cleanup.
- **Alpha:** 122,527 transparent and 34,265 opaque pixels, with 0 partial. The opaque pixels form one connected silhouette.

### 2.3 Portrait background: candidate 01 (new in this pass)

- **Source:** the owner's raw `reception_portrait_background_density_test_03_raw.png`.
  - It is 1785 × 881 RGB, SHA-256 `0b96d8265c4eb2dba4347813ea0813cd03a250130c7ee6425d0086a8d11282a7`.
  - It is the background generated from the latest Codex portrait-background prompt, the one feeding the owner's review page.
- **Contents:** background only. There is no receptionist, no flattened NPC and no foreground desk.
- **Normalization:** the reviewed method (Pillow 12.3.0):
  1. Centred exact-aspect crop in fractional source pixels, box `(0, 0.5798)–(1785, 880.4202)`. That trims 0.58 source px at the top and at the bottom, 1.16 px in total.
  2. Pillow `LANCZOS` straight to 564 × 278. The source is opaque RGB, so premultiplied alpha is a no-op here.
  3. No forced palette, colour cleanup, dither, denoise or sharpening. No runtime scaling: the image is displayed 1:1.

   ```python
   raw = Image.open(src).convert('RGB')            # 1785 x 881
   h = 1785 * 278 / 564; y0 = (881 - h) / 2
   raw.resize((564, 278), Image.Resampling.LANCZOS, box=(0, y0, 1785, y0 + h)).save(dst, format='PNG')
   ```

- **Reproducibility:** the result is byte-identical to the candidate already on the owner's review page (`2f23075f…`).

## 3. Layered portrait requirement

`reception_background_candidate_01_564x278.png` and `receptionist_candidate_01_564x278.png` are independent layers on the same native 564 × 278 canvas. **They are never flattened together**, even while everything is static.

Stack (docs/54 §4, docs/45 §6A):

`portrait background → rear/mid FX → NPC → foreground FX → existing UI frame`

No FX layers exist yet.

## 4. Raw-source handling

- The raw generator outputs stay local in `source/reception_density/`. That folder is git-ignored (`.gitignore`: `source/`) and is never committed.
- Only the three exported candidates above are committed.
- **Not imported from the density-test branch:**
  - docs/55;
  - scenes A and B;
  - the 282 × 139 portraits;
  - the BOX portrait;
  - Portrait 01;
  - the old 282 × 139 background;
  - screenshots;
  - QA;
  - the test page's HTML/CSS/JS;
  - the normalizer and colour-merge scripts.

  docs/55 and that evidence stay on `agent/m2-reception-density-test` as provenance.

## 5. Not integrated

The candidates are **not** wired into the playable reception route, and they replace no placeholders.

`game/`, `art/ui/`, `art/actions/`, `art/items/`, `design/` and `tools/layout-lab/` are unchanged. This is an art-approval branch first.

## 6. Review criteria for this pass

### World scene
- Does the scene feel intentionally low-density rather than blurred?
- Does its architecture feel like the correct game world?
- Does the small receptionist remain readable?
- Is there enough environmental storytelling?

### Receptionist
- Does she feel like the same character while being dramatically richer than the scene representation?
- Is she detailed enough for conversation?
- Is the design animation-friendly?
- Does the face have enough character and personality?

### Portrait background
- Does it clearly belong to the same reception area?
- Does it feel like a separately authored close conversational environment, not a sharpened crop of the scene?
- Is the centre calm enough behind the NPC?
- Do the side and background details give useful local information?
- Does anything wrongly need to appear in front of the NPC?

### Composite
- Do the background and NPC together feel natural?
- Does the portrait feel substantially richer than the world scene?
- Does it avoid the earlier "blurry scene vs clear scene" problem?
- Are the world and portrait still clearly from the same game?

## 7. QA (bounded asset checks, 2026-11-07)

- **Scene:** exactly 314 × 206; opaque RGB PNG (colour type 2); SHA-256 as above; byte-identical to the density-branch blob.
- **NPC:**
  - exactly 564 × 278 RGBA (colour type 6); SHA-256 as above; byte-identical to the density-branch blob;
  - real transparency, with 122,527 transparent pixels and transparent corners;
  - binary alpha {0, 255}, no RGB hidden under alpha 0, and one connected silhouette.
- **Background:** exactly 564 × 278; opaque RGB; SHA-256 as above; reproduced byte for byte from the raw source.
- **Git:**
  - the raw sources are ignored and untracked, and nothing under `source/` or `originals/` is committed;
  - no density-test tools or assets were imported;
  - docs/54 and README are unchanged from the decision commit `90b99f7`;
  - `game/`, `art/ui/`, `art/actions/`, `art/items/`, `design/` and `tools/layout-lab/` are byte-identical to `90b99f7`.
- **Runtime:**
  - `node game/qa/validate_route.js`: 38/38.
  - `game/qa/run_qa.js`: 298/300. All 282 Chromium and Firefox checks pass. The two known static guards fail and stay unchanged:
    - "README/docs/45 changed since M2 began": inherited from main.
    - "nothing added to art/": it lists these three candidates, as expected for an art branch.

  The guards are deliberately left unedited.

## 8. Next

The owner/PMO review the candidates against §6. Approved, revised or replaced candidates come in a later pass. Integration into the playable route happens only after art approval.


## 9. PMO visual review (2026-11-07)

**Outcome: APPROVED FOR RECEPTION INTEGRATION.**

This approval applies to the three candidate assets as the current production-art set for the M2 reception slice. It does not make them immutable forever; later art revisions may still occur through an explicit reviewed pass.

### World scene — approved

The 314×206 scene now reads as intentionally authored low-density world art rather than as a blurred version of the portrait treatment. Architecture and queue geometry carry the composition, the small receptionist is readable at environmental scale, and the scene retains useful environmental storytelling without overloading the logical pixel grid.

### Receptionist portrait — approved

The 564×278 Portrait 03 treatment creates the intended large jump in conversational detail. The receptionist reads as the same character through hair colour, glasses, headset, uniform and overall silhouette while gaining substantially richer facial, hair, clothing and accessory information.

The difference from the small scene representation is intentional. The speaking portrait is a dedicated character representation, not an enlarged scene sprite.

### Portrait background — approved

The 564×278 background clearly belongs to the same reception location while functioning as a separately authored conversational environment. The centre remains calm enough for the NPC silhouette, and the stronger local details sit primarily around the character rather than competing with her face.

The background remains an independent layer. No foreground desk or other element that should cross in front of the NPC is baked into it.

### Composite — approved

The current composite resolves the failed first density experiment. The world scene and speaking portrait now read as two deliberate art languages within one game rather than as blurry-versus-clear versions of the same image.

The scene is intentionally coarse and environmental; the portrait is intentionally much richer and more intimate.

### Integration authorization

The three approved files may now replace the current reception scene and receptionist portrait placeholders in the playable M2 reception route, subject to the following hard rules:

- scene remains 314×206 logical and renders at 4× nearest-neighbour;
- portrait background and NPC remain separate 564×278 layers rendered 1:1;
- UI shell remains above all scene/portrait art;
- no background/NPC flattening;
- no new animation, FX or additional art is implied by this approval;
- no redesign of M1 geometry or narrative behavior is authorized.

Integration should be performed on a dedicated branch derived from this approved art checkpoint and should include browser QA proving exact placement, layering and no smoothing.
