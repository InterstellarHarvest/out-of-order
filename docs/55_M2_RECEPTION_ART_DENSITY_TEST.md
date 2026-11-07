# CYOA M2 — Reception Scene / Portrait Density Test

**Date:** 2026-11-06  
**Status:** Review-only art test. Not production art approval.  
**Baseline:** `main` at `b9f81d8beccdf59771f068b3bd822adc3961ae60`.  
**Branch:** `agent/m2-reception-density-test`.

## 1. Purpose

Validate the current Scene Density vs Portrait Density proposal inside the real 1920×1080 shell before producing a larger quantity of game art.

This test answers one question:

> Does a deliberately lower-density world scene paired with a roughly 2× higher linear authored portrait density create the desired King's Quest VI-style jump in conversational detail while remaining visually coherent?

Do not use this test to redesign M1, rewrite M2, finalize the receptionist's story identity, or expand content.

## 2. Required test assets

Create exactly one coherent reception set:

1. **Reception world scene**
   - authored logical target: **314×206**
   - displayed at **4× nearest-neighbor**
   - world/environment uses Scene Density
   - contains a separately authored small scene version of the receptionist
   - do not derive the small scene NPC by scaling the portrait sprite

2. **Reception portrait background**
   - authored logical target: **282×139**
   - displayed at **2× nearest-neighbor**
   - contains environment/context only
   - no receptionist baked into it

3. **Receptionist portrait NPC**
   - authored logical target: **282×139 RGBA canvas**
   - displayed at **2× nearest-neighbor**
   - transparent background
   - character only
   - independently movable/animatable

Default portrait composition remains:

`portrait background → rear/mid FX → NPC sprite → foreground FX → UI frame`

No FX are required for this density test.

## 3. Density normalization

Raw image-generator output is not itself the density test.

The review assets must be normalized to the exact logical canvases above, then integer-scaled with nearest-neighbor rendering.

For the scene, 314×206 becomes 1256×824 at 4×. The production scene aperture is 1255×822. Preserve the density and allow the minimal clipping required by the existing shell rather than non-uniformly scaling the image to fit.

For the portrait, 282×139 becomes exactly 564×278 at 2×.

Do not use browser smoothing, fractional scale, or non-uniform scaling.

## 4. Color / pixel rules

- Full-color PNG is allowed.
- 256 colors is not a cap.
- Every color should do visible work.
- Scene and portrait must share a coherent color language rather than an identical indexed palette.
- Portrait may use more intermediate shades than the scene.
- Avoid AI speckle, pseudo-film-grain and meaningless near-identical colors.
- Dithering may be used deliberately on distant concrete, fog, smoke or atmosphere, but should not dominate.
- Avoid noisy dithering on faces, hands, clothing and props.
- Portrait NPC edges should use crisp alpha, preferably 0/255.
- No fuzzy fringe or texture shimmer.

## 5. Art-direction guardrails

The reception area belongs to the project's alternate 1960s/retro-futuristic institutional world: bureaucratic, manufactured, functional, slightly wrong.

For this test:
- favor concrete, painted/enamel metal, glass, molded plastic and chrome/steel details;
- avoid steampunk shorthand;
- avoid brass-heavy palettes, exposed gear motifs, leather, Victorian machinery and Edison-bulb styling;
- avoid polished modern sci-fi minimalism;
- avoid cyberpunk neon;
- avoid grime-for-grime's-sake;
- no readable signage or baked text unless specifically approved later;
- the scene should feel inhabited and administratively overbuilt, not ruined.

The receptionist design is a test character design until owner approval.

## 6. Layering / authorship rule

The scene NPC and portrait NPC are **separately authored interpretations of the same character**.

They should share:
- costume;
- palette family;
- silhouette cues;
- hairstyle/head shape;
- recognizable accessories.

They must not share identical pixels through scaling.

The portrait background and NPC must remain separate files even if both are static.

## 7. Git / source handling

Raw Codex/Canva generations are source material and stay local. Do not add generator masters, PSDs, `source/` or `originals/` material to Git.

Review-branch exports may use these paths:

- `art/scenes/conference_hall/reception/density_test/reception_scene_314x206.png`
- `art/portraits/receptionist/density_test/reception_background_282x139.png`
- `art/portraits/receptionist/density_test/receptionist_282x139.png`

A small dedicated comparison tool may be added under:

- `tools/reception-density-test/`

Do not replace production placeholder assets or alter the shipped reception route for this review.

## 8. In-shell test

The comparison tool should:

- load the canonical current shell without modifying it;
- place the 314×206 scene at 4× using nearest-neighbor rendering;
- place the 282×139 portrait background at 2×;
- composite the transparent receptionist at 2× over that background;
- keep the UI frame above the portrait layers;
- render at the canonical 1920×1080 review size;
- provide a simple way to hide/show the NPC portrait layer so the separation is obvious;
- optionally show logical dimensions in a developer-only panel outside the artwork;
- contain no new gameplay mechanics.

Do not add decorative UI to the test.

## 9. Review criteria

Owner/PMO review should judge:

### Scene
- Does 314×206 feel intentionally chunky rather than under-resolved?
- Are environment shapes readable without pixel noise?
- Does the scene still carry enough environmental storytelling?
- Does the small receptionist read clearly at environmental scale?

### Portrait
- Does 282×139 provide a meaningful increase in facial/clothing detail?
- Does it feel substantially more intimate than the scene NPC?
- Are pixel clusters stable enough for later animation?
- Is the NPC cleanly separable from the background?

### Relationship
- Does the portrait feel roughly twice as detailed linearly without looking like a different game?
- Do shared materials and palette families make both densities belong together?
- Does the contrast evoke the desired world-scene vs conversational-close-up hierarchy?
- Does either layer need a density revision before production art begins?

## 10. Pass / revise outcome

This test does **not** automatically lock the proposed resolutions.

Possible outcomes:
- **PASS:** keep 314×206 scene / 282×139 portrait as production starting densities.
- **REVISE SCENE:** change Scene Density and rerun.
- **REVISE PORTRAIT:** change Portrait Density and rerun.
- **REVISE BOTH:** choose a new relationship and rerun.

Do not create additional locations, NPCs or portrait animation until this test is reviewed.

## 11. Implementation record (2026-11-07)

Implementation facts only. **Nothing here approves the art or locks either density**; the outcome in section 10 is for owner/PMO review.

### 11.1 Selected sources (owner/PMO pick; local only)

Kept in `source/reception_density/` (git-ignored, never committed). Other generated variants are not part of this test.

| Role | Raw file | Size | SHA-256 |
|---|---|---|---|
| World scene | `reception_world_scene_v2_raw.png` | 1548×1016 RGB | `3cf8879c484eed93a705ece094b17419669ea5f9c116cf4eb476d59bef5fcddd` |
| Portrait background | `reception_background_v2_raw.png` | 1774×887 RGB | `8b6b14bdf96653e1f2a0c18fdb5fb2da03ec7d5a3ce026b406d31c45325efde0` |
| Portrait NPC | `receptionist_portrait_v1_raw.png` | 1774×887 RGBA | `08b2d28282f444f2a5390bc98fc5faddc604de8bd4be63d16783e7560f435bdb` |

The NPC source's alpha matches the PMO finding: only 802 pixels are truly 255, 442,064 sit at 251–254 and 25,982 more are intermediate edge values (256 distinct alpha values in all).

### 11.2 Normalization (`tools/reception-density-test/normalize.py`)

Deterministic: a re-run reproduces all three exports byte for byte (checked by QA). Pillow 12.3.0.

1. **Crop:** the largest centred box with the exact destination aspect, in fractional source pixels, so nothing is stretched or scaled unevenly.
   - Scene: `(0, 0.2166)–(1548, 1015.7834)`, about 0.43 source px trimmed in total, top and bottom.
   - Portrait background and NPC: one shared box, `(0, 6.2908)–(1774, 880.7092)`, about 12.6 source px trimmed in total, top and bottom. Sharing the box keeps the two layers registered.
2. **Downsample:** Pillow `BOX` (area average over each logical pixel's footprint), straight to the logical size. RGBA is resampled premultiplied. BOX has no negative lobes, so there is no sharpening, ringing or halo. The sources have no consistent pixel grid to lock onto, so area averaging is the neutral choice. No noise is added.
3. **Alpha cleanup (NPC only):** alpha ≥ 128 → 255, otherwise 0. Fully transparent pixels get RGB 0,0,0 so no hidden colour survives under them.
4. **Colour cleanup (each asset separately; no shared palette):**
   - A 256-colour adaptive palette is built from the visible pixels only, with Pillow's `MAXCOVERAGE` box split (median-cut family: it splits the box with the widest colour range rather than the most pixels), then refined by 20 k-means passes.
   - Every visible pixel is mapped to its nearest palette colour. There is **no dithering**.
5. **Why not plain median cut:** population median cut (`MEDIANCUT`) at 256 was tried first and is still measured in the manifest. It merged the small amber indicator lamps in the scene and the portrait background into beige/brown. The worst pixel errors were ≈117 and ≈102 RGB units (for example 253,188,12 → 188,130,90), and it also dulled the plants and the NPC's lips. That is a visible loss of meaningful detail. Max coverage + k-means keeps every visible pixel within about 17 RGB units, with a lower mean error, at the **same 256 colours**, so **no deviation above 256 was needed**.

| Asset | Unique RGB after downsample | Mean / p99 / max error (final) | Plain median-cut trial (rejected) |
|---|---|---|---|
| Scene | 20,611 | 4.00 / 10.25 / 16.88 | 222 colours used; 4.51 / 19.05 / 116.93 |
| Portrait background | 14,842 | 3.75 / 10.05 / 15.39 | 223 colours used; 4.76 / 25.50 / 101.97 |
| NPC (visible pixels) | 4,557 | 3.42 / 9.38 / 13.08 | 186 colours used; 3.71 / 17.38 / 33.91 |

The full record (crop boxes, method, error metrics, hashes) is in `tools/reception-density-test/density_test_manifest.json`.

### 11.3 Exports (review branch only; not production art)

| File | Logical | Mode | Display | Unique RGB | SHA-256 |
|---|---|---|---|---|---|
| `art/scenes/conference_hall/reception/density_test/reception_scene_314x206.png` | 314×206 | RGB | ×4 = 1256×824 | 256 | `6297a46db9413fdfc8b1dc63f2df2fdbfa47a8cfacedc9e921fc4c0b4ceaeb6e` |
| `art/portraits/receptionist/density_test/reception_background_282x139.png` | 282×139 | RGB | ×2 = 564×278 | 256 | `c831ba6b9c3c5255335e77d47f3ed587a38fbb48453c78774c97a5bf2d0c70f5` |
| `art/portraits/receptionist/density_test/receptionist_282x139.png` | 282×139 | RGBA | ×2 = 564×278 | 256 visible | `f80dc4edcdbb4e9b671be0ba585c0796bdaebfa6dfe7b5fce405469887159c0f` |

NPC alpha: exactly two values, `{0, 255}`. That is 27,647 transparent and 11,551 opaque pixels, with 0 partial, out of 39,198.

The committed files are not pre-upscaled. The background and NPC stay separate files.

### 11.4 Test page

`tools/reception-density-test/index.html` (see its README).

- It is independent of `game/`.
- It reads the aperture rectangles and the shell path from `tools/layout-lab/data/lab_data.js`.
- It draws the canonical shell unchanged on top.
- The stage is 1920×1080 at 1:1, with no fit scale.
- **Scene:** a 1256×824 `<img>` at the scene aperture's top-left (32,44), clipped by the 1255×822 aperture: 1 px right, 2 px bottom.
- **Portrait:** draws in the order background → empty rear/mid FX slot → NPC → empty foreground FX slot, all at 564×278 in the portrait aperture (1333,44).
- `image-rendering: pixelated` (`crisp-edges` for Firefox) is set on every image.
- **Developer-only controls:** below the stage, outside the artwork, there is an NPC ON/OFF button (also the N key) and a logical/display readout. `?shot` hides them; `?npc=off` starts with the NPC hidden.
- There is no gameplay, no dialogue and no added UI.

### 11.5 QA

`NODE_PATH="$(npm root -g)" node tools/reception-density-test/qa/run_qa.js` runs static checks, then Chromium and Firefox at 1920×1080 with devicePixelRatio 1. Results are in `tools/reception-density-test/qa/qa_results.json`.

Static checks:

- the exact sizes, RGBA mode, and NPC alpha `{0,255}`, with transparent corners and no colour hidden under alpha 0;
- the colour counts and export hashes against the manifest;
- shell SHA-256 `813e0884…23233c6`, and the shell blob is identical to main;
- `game/`, `art/ui`, `art/actions`, `art/items`, `design/`, `tools/layout-lab` and `README.md` are byte-identical to `b9f81d8`;
- every branch change sits inside the density-test paths or this document;
- nothing under `source/` or `originals/` and no `*_raw.png` is tracked or committed, the local raws are git-ignored, and no tracked file equals a raw;
- no export is larger than its logical canvas;
- `normalize.py` reproduces all three exports byte for byte.

Browser checks:

- committed lab geometry;
- integer scale (scene ×4, portrait ×2);
- smoothing off;
- the shell served with its canonical bytes;
- layer order;
- the NPC toggle (button and key);
- no console errors.

**Exact pixel proof:** at every one of 997,017 scene pixels and 148,790 portrait pixels where the shell is fully transparent, the screen equals the nearest-neighbour source pixel exactly. Just beyond the aperture, the scene's overflow is clipped: only the shell over black shows there. Hiding the NPC changes portrait-aperture pixels only, and the portrait then equals the background alone.

**Mutation check:** forcing `image-rendering: auto` makes the pixel checks fail (≈616k scene and ≈113k portrait mismatches), so they do detect smoothing.

Proof screenshots (Chromium, 1920×1080):

- `tools/reception-density-test/qa/screenshots/density_test_chromium_npc_on.png`
- `tools/reception-density-test/qa/screenshots/density_test_chromium_npc_off.png`

### 11.6 Existing M1/M2 regressions (run on this branch, Chromium + Firefox, node 20)

- `node game/qa/validate_route.js`: **38/38**.
- `tools/layout-lab/qa/run_qa.js`: **1920/1920**.
- `game/qa/run_qa.js`: **298/300**. All 282 browser checks pass. The two failures are file-list guards in the slice's static checks, and neither is a regression in behaviour:
  1. *"M1 art, design, lab and docs are unchanged since M2 began"* lists `README.md` and `docs/45`. Main's own PMO doc commits changed those (`75f735a`, `b9f81d8`), so this check already fails on main. This branch does not touch them.
  2. *"nothing was added to art/ … except the owner's pinned art"* lists the three density-test exports. This is expected for this review branch. `game/` is protected here, so the guard is left as it is.

The regenerated QA outputs of the slice and the lab were restored rather than committed, so `game/` and `tools/layout-lab/` stay byte-identical to main.

### 11.7 Status

Ready for owner/PMO visual review against section 9. Not merged, and neither density is locked.

## 12. Owner / PMO visual review correction (2026-11-07)

**Outcome: REVISE — the density relationship is not yet visually proven.**

The implementation and QA are technically successful, but the owner identified a core visual failure:

> the main scene and portrait read like a blurry and clear version of the same scene.

That observation supersedes the earlier PMO PASS.

### What failed

The test demonstrates clean integer scaling, not the intended difference in authored visual language.

Both source images began as relatively detailed high-resolution generated artwork and were then normalized downward. That process preserves composition and subject detail while reducing resolution, so the lower-density scene can read as a softened/chunkier reduction of the same kind of image rather than as independently authored lower-density pixel art.

The scene and portrait also use too-similar framing, material detail and local information. The portrait therefore feels like a clearer crop of the world scene instead of a deliberately different conversational representation.

### What the next test must change

Do **not** simply change the numeric resolutions and repeat the same pipeline.

The next test should preserve the current candidate numbers initially:

- Scene Density: 314×206 logical, 4× display.
- Portrait Density: 282×139 logical, 2× display.

But the artwork must be authored differently:

#### Scene
- Compose specifically for the 314×206 logical canvas.
- Use larger shape language, fewer small surface details and simpler value groups.
- Treat the environment like intentional 16-bit-era world art, not a high-detail illustration reduced afterward.
- Scene NPC is a separately authored small sprite/figure with broad silhouette and minimal facial information.
- Do not rely on downsampling to create the low-density look.

#### Portrait
- Use a genuinely tighter conversational composition.
- Let the NPC occupy substantially more of the portrait aperture.
- Reduce the amount of room/environment visible behind the character.
- Use Portrait Density for face, hair, headset, clothing and expression detail.
- The portrait background remains a separate layer, but should act as local context rather than recreating the world-scene composition.

### Key distinction to prove

The target is not:

`same image language → lower resolution / higher resolution`

The target is:

`world-scene art language → conversational portrait art language`

They should share character design, materials and palette family, but they should not look like two clarity settings of the same camera.

### Technical result retained

The branch remains useful evidence that:

- 314×206 can be displayed cleanly at 4×;
- 282×139 can be displayed cleanly at 2×;
- the shell/aperture geometry works;
- layered portrait compositing works;
- nearest-neighbour rendering and binary-alpha cleanup work.

Those technical findings are retained.

### Status

**REVISE ART AUTHORSHIP / COMPOSITION.**

Neither density is locked.

Do not merge this review branch as production art. The next iteration should test genuinely separately authored scene and portrait styles before any production lock.

## 13. Scene 02: BOX vs NEAREST normalization (2026-11-07)

**Question:** was the apparent blur in the normalized scene caused by BOX downsampling?

**Source:** the owner's new `reception_world_scene_density_test_02_raw.png`. It is 1548×1016 RGB, SHA-256 `1f2a122d213ec0b080e7b95d22673dcf2ca42928b715492c78f6bbad6d79b252`, and kept local only. No art was generated or selected for this step.

Both versions use the same raw file and the same crop box, `(0, 0.2166)–(1548, 1015.7834)`. Only the reduction differs:

| | Reduction | Colour cleanup | Unique RGB | SHA-256 |
|---|---|---|---|---|
| **A** `art/scenes/conference_hall/reception/density_test/reception_scene_02_box_314x206.png` | Pillow `BOX` (area average) | 256 max coverage + k-means, no dither (as §11.2) | 256 | `64600279d5a5e76ab081f62187306bd586687e4be09d65cffb94e8fd3b73a626` |
| **B** `art/scenes/conference_hall/reception/density_test/reception_scene_02_nearest_314x206.png` | Pillow `NEAREST` only | **none**, deliberately, so the palette is not a second variable | 15,403 | `56fff5b69286dd2a1980f6d04141894cd38abd5399f345e737c4ad8836c03dec` |

Both are exactly 314×206 and shown at exactly 4× nearest neighbour (1256×824, clipped 1 px right and 2 px bottom by the aperture). They sit in the identical shell, with the portrait unchanged.

**Measured:**

- Mean edge strength (Pillow `FIND_EDGES` on luminance): **B 43.0**, A 34.2, and BOX without the colour step 33.7.
- NEAREST keeps about 28% more edge energy. The colour step barely changes BOX's softness (33.7 → 34.2), so **the blur came from the BOX averaging, not from the palette**.
- Visibly, B keeps hard clusters in the receptionist's glasses and headset, the pigeonholes, the panel lamps and the railing caps, where A smears them.

**Trade-off seen in B:**

- The raw file is crisp in style but not on a clean pixel grid: about 74% of the colour runs along a row are 1 px long, against a nominal cell of about 4.93 source px. NEAREST therefore also carries the generator's per-pixel colour noise into the logical image, which is why B has 15,403 unique RGB.
- This shows as faint texture on flat walls and floor.
- Whether any colour cleanup should follow NEAREST is **not decided**. It is not applied here.

**Normalization rule (per the PMO direction of 2026-11-07, with the evidence above):**

- Deliberately authored pixel-art sources are reduced with **NEAREST only**: crop to the exact aspect, NEAREST resize to the logical size, then integer nearest-neighbour display.
- No BOX, bilinear, bicubic, Lanczos, antialiasing, supersampling or post-resize sharpening.
- `normalize.py` records the resample per asset in the manifest.
- The earlier exports (v2 scene, portrait background, receptionist) are unchanged in this step and still use BOX + 256. The portrait art and density are out of scope here.

**Tool:** the scene buttons on the test page, or the keys **A** / **B** / **V** (`?scene=a|b|v2`), switch scenes in the same shell. B is the default.

**QA:** 83/83 in Chromium and Firefox.

- Both A and B match an exact 4× nearest-neighbour upscale of their own PNG at every clear-shell scene pixel.
- The portrait is unchanged under both, and the overflow is clipped.
- Switching between A and B changes scene-aperture pixels only.
- The B export records NEAREST with no colour cleanup.
- A and B share one raw file and one crop box.
- All five exports reproduce byte for byte.

**Proofs:**

- `tools/reception-density-test/qa/screenshots/density_test_chromium_scene02_A_box.png`
- `tools/reception-density-test/qa/screenshots/density_test_chromium_scene02_B_nearest.png`

**Not done:**

- The scene density is not locked.
- Nothing is merged.
- No art was regenerated.
- No portrait production.
