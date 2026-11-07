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
