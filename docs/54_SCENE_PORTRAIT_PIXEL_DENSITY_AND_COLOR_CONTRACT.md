# CYOA — Scene / Portrait Pixel-Density and Color Contract

**Date:** 2026-11-06; densities locked 2026-11-07  
**Status:** Owner/PMO production contract. **Scene and portrait densities are LOCKED as the production starting contract** (§2). The art produced during the density test is not final (§11).  
**Applies to:** M2 reception art and later locations/NPCs  
**Related:**
- `docs/45_M1_OWNER_DIRECTION_INTERACTION_AND_DIALOGUE_FLOW.md`: the portrait compositing contract.
- Density-test evidence: `docs/55_M2_RECEPTION_ART_DENSITY_TEST.md` on the review branch `agent/m2-reception-density-test` (§11).

## 1. Core direction

The game deliberately uses **different authored pixel densities for the world scene and for close NPC portraits**.

This follows the visual logic of games such as *King's Quest VI*: the main world remains chunky and readable, while a speaking portrait can reveal substantially more facial, clothing and prop detail.

Do not describe these production tiers as literal image bit depth. "16-bit" and "32-bit" are useful aesthetic references, but the implementation is ordinary full-color PNG art.

Production terminology:

- **Scene Density** — lower-density world/environment art, roughly a rich 16-bit-era visual scale.
- **Portrait Density** — higher-density close-up art, roughly a later 32-bit-era dedicated conversation-art scale.

The difference is intentional and should be visible.

The goal is never merely two numerical resolutions. The goal is **two deliberately different authored art languages for the same world**:

| World scene | Speaking portrait |
|---|---|
| chunky | substantially finer |
| broad shapes | expressive face |
| environmental readability | richer hair, clothing and accessory detail |
| minimal facial information | dedicated conversation art |

The portrait may be a noticeably richer, slightly different representation of the same character, provided the identity anchors stay consistent (§3).

## 2. Locked production densities

**LOCKED (owner/PMO, 2026-11-07) as the current production starting contract:**

| Tier | Logical canvas | Runtime display | Aperture |
|---|---|---|---|
| **Scene Density** | **314 × 206** | **4× nearest neighbour = 1256 × 824** | 1255 × 822 at (32, 44). The aperture clips the 1 px / 2 px overflow. |
| **Portrait Density** | **564 × 278** | **1× = 564 × 278**, drawn 1:1 with no runtime scaling or interpolation | exactly the 564 × 278 portrait aperture at (1333, 44) |

### Scene Density

- Author or normalize the world scene to **314 × 206 logical pixels**, and display it at **exactly 4× nearest neighbour**.
- 314×206 becomes 1256×824. Keep that exact 4× density and let the fixed 1255×822 aperture clip about 1 px on the right and 2 px at the bottom.
- Never resize the result to 1255×822, and never scale the source unevenly to force a fit.

### Portrait Density

- Author or export **both the portrait background and the NPC** on the native **564 × 278** portrait canvas, and display them at **1×**.
- The portrait needs no runtime enlargement. It is drawn pixel for pixel into the existing aperture.

### Retired target

**282 × 139 logical at 2×** was the first portrait hypothesis. It is **retired** as an active production target and kept only as test history (docs/55 §§2, 11, 14, 15). It forced detailed portrait sources through a non-integer reduction of about 6.3×:

- NEAREST aliased the glasses, eyes, mouth, headset and hair;
- BOX kept the forms by averaging but visibly softened them.

### What is unchanged

These densities do not change the canonical shell, the apertures or the M1 UI. The UI keeps its own native pixel language (§8).

## 3. Scene and portrait are separate representations

A character appearing in the main scene must **not** be produced by mechanically shrinking the detailed portrait sprite.

Equally, **Scene Density must not be created by averaging a higher-detail image down** (§6). The low-density look has to be authored, not produced by downsampling.

Instead:

- scene NPC = separately authored Scene Density interpretation;
- portrait NPC = separately authored Portrait Density interpretation.

They share:

- character design;
- silhouette cues;
- clothing;
- key colors;
- recognizable props/features.

They do not need identical pixel clusters. The portrait may be noticeably richer and slightly different, provided these identity anchors stay consistent.

The scene version prioritizes silhouette and readability. The portrait version prioritizes expression, facial structure, costume detail and animation.

## 4. Portrait layering contract

The portrait window is a composited system, never a permanently flattened NPC image.

Minimum layers:

1. **Portrait background** — environment/context behind the speaker.
2. **Rear/mid FX** — optional environment effects behind the character.
3. **NPC foreground sprite** — transparent character-only art.
4. **Foreground FX** — optional effects crossing in front when appropriate.
5. **Portrait UI frame** — separate shell/frame art on top.

Default draw order:

`background → rear/mid FX → NPC → foreground FX → UI frame`

**Both the portrait background and the NPC use the native 564 × 278 portrait canvas** (§2). FX layers that cover the portrait use the same canvas.

Rules:

- never permanently bake an NPC into the portrait background, and never flatten the two together;
- keep the NPC independently movable/animatable;
- keep the background independently swappable/animatable;
- preserve alpha on NPC and FX layers; NPC edges use crisp alpha, preferably 0/255, with no fuzzy fringe;
- environmental events may change behind the same NPC without requiring a new flattened portrait;
- examples include fire, smoke, damage, emergency lighting, explosions, machinery failures or other scene-state changes;
- static portraits still follow the layered contract even if animation is not currently planned.

## 5. Color policy

**Full color remains the policy.** Do **not** impose arbitrary historical hardware palette limits: **there is no 256-colour cap**, and no other fixed palette count is a target.

The game may use full-color PNGs and may exceed 256 colors when useful.

Scene and portrait art should share a coherent **color language**, not an identical indexed palette:

- same hue families;
- same institutional greens, creams, steels, blues, rusts and skin-tone families;
- portrait art may use more intermediate shades within those same ramps;
- scene art may simplify the same material/skin ramp to fewer shades.

A technically large color count is acceptable when the colors visibly improve the image.

The rule is:

> **Every color should be doing visible work.**

**Controlled, noise-conscious palettes remain required.** Avoid thousands of nearly identical colors caused by generation noise, filtering or uncontrolled texture.

Do not create hundreds of imperceptibly different grays/browns merely because the file format allows it.

Colour cleanup of generated sources is **non-spatial** (§6): it may merge visually near-identical colours, but it never moves pixels, averages neighbours, blurs, sharpens or dithers. No threshold or resulting colour count from the density test is a production constant.

## 6. Pixel-noise, dithering and normalization policy

Avoid noisy AI-painted texture masquerading as pixel detail.

Especially avoid:

- random single-pixel speckle;
- micro-variation in otherwise flat materials;
- uncontrolled color noise;
- dithering everywhere by default;
- soft airbrush transitions disguised by later downscaling.

Dithering is allowed deliberately where it improves a material or atmosphere, for example:

- distant concrete;
- smoke;
- fog;
- broad lighting transitions;
- selected environmental surfaces.

Dithering should be an exception rather than the default rendering method.

Faces, clothing, held props and other animated surfaces should favor **clean pixel clusters and controlled color ramps**.

### Scene normalization rule

For generated source art that is already deliberately pixel-art-like:

`source → exact aspect crop → NEAREST geometric reduction to 314×206 → optional conservative NON-SPATIAL colour cleanup → 4× NEAREST runtime display`

- **Never** use BOX, bilinear, bicubic or Lanczos to establish Scene Density geometry. Averaging blends the authored pixel clusters, and nearest-neighbour enlargement cannot recover them.
- Colour cleanup removes meaningless generator colour variation without changing pixel geometry or meaningful colour distinctions. Small accents, such as indicator lamps, lights, skin, hair, eyewear, plant greens and dark outlines, must survive.

### Portrait normalization rule

Portraits are authored or exported at the native **564 × 278**.

- If a workflow can produce a clean 564×278 authored source directly, prefer that.
- For high-resolution generated portrait source material, a high-quality **premultiplied-alpha** reduction straight to 564×278 is acceptable (the density test used Lanczos successfully). It must not introduce fringe. Then clean the NPC alpha: binary 0/255, no RGB hidden under alpha 0, and no stray fringe pixels.
- This does not require future portraits to start as large generated art.
- Runtime display is always 1:1: no runtime scaling or interpolation.

## 7. Portrait-animation friendliness

Detailed portraits may animate.

Therefore the NPC layer should be authored so frame-to-frame changes are intentional rather than noisy.

Preferred rules:

- hard-edged pixel clusters;
- transparent exterior;
- alpha preferably **0 or 255** on character edges;
- no fuzzy antialiased fringe;
- no generated film grain;
- no random frame-to-frame dithering changes;
- stable core palette ramps across frames;
- animate forms rather than texture noise.

Good animated changes include:

- eyes/blinks;
- mouth;
- brows;
- head angle;
- shoulders;
- hands;
- clothing folds tied to motion;
- held objects;
- deliberate lighting changes.

Do not make animation by causing arbitrary pixels to shimmer.

## 8. Relationship to the UI

The UI keeps its existing authored pixel language and does not need to adopt Scene Density or Portrait Density.

The intended hierarchy is:

- **Scene:** chunky, lower-density environmental storytelling (314×206 at 4×).
- **Portrait background:** higher-density local environment/context (564×278 at 1×).
- **Portrait NPC:** higher-density expressive character art (564×278 at 1×).
- **UI:** existing native pixel-art system.
- **FX:** authored at the tier appropriate to the surface/space they inhabit and kept separate when practical.

Scene raster art uses nearest-neighbour, integer presentation. Portrait raster art is drawn 1:1.

## 9. M2 receptionist production implications

- Create the reception portrait background separately, natively at **564 × 278**. This is the next art task, and it is commissioned separately.
- The receptionist portrait NPC is a transparent **564 × 278** Portrait Density foreground sprite, never flattened with the background.
- **Portrait 03** from the density test is the current receptionist design reference for the next production-art pass (§11).
- Author any small receptionist figure visible in the main scene separately at Scene Density, with broad silhouette and minimal facial information.
- Use the same broad palette families as the reception scene, and preserve enough palette discipline that later portrait animation is practical.

## 10. What is intentionally not locked yet

Locked: the **densities** (§2), the separate scene/portrait representations (§3), the layered portrait contract (§4), full colour with controlled palettes (§5), and the normalization rules (§6).

Not yet locked:

- final receptionist design and any production art (§11);
- exact reception palette swatches;
- exact number of colors, or any colour-cleanup threshold;
- number of portrait animation frames;
- whether every NPC receives animation;
- whether every location uses the exact same portrait background treatment.

## 11. Density decision record (2026-11-07)

The densities in §2 were decided by the owner/PMO after an in-shell density test. The full record is on the review branch `agent/m2-reception-density-test`, in `docs/55_M2_RECEPTION_ART_DENSITY_TEST.md`:

- §§11–15 cover the implementation, the owner's verdict to revise the authorship, the BOX vs NEAREST scene test, the Scene C colour merge, and the 564×278 portrait test;
- §16 is the final disposition.

That branch remains review evidence. It is **not merged**, and its tools and review assets are not part of `main`.

- **Scene evidence:** NEAREST geometry with a non-spatial colour merge (the test's Scene C) was preferred over BOX + palette cleanup, and over NEAREST with all generator colour noise kept.
  - Its ΔE00 2.0 threshold and resulting colour count are evidence, **not** production constants.
- **Portrait evidence:** Portrait 03 at 564×278, 1× (premultiplied Lanczos from the high-resolution source), preserved the speaking-portrait language that 282×139 at 2× lost.
- **Art status:** the density is locked; the exact art is not. The test's Scene C and Portrait 03 are reference/candidate art, not production-final.
