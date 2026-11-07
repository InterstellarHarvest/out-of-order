# CYOA — Scene / Portrait Pixel-Density and Color Contract

**Date:** 2026-11-06  
**Status:** Owner direction / production contract for future scene and portrait art  
**Applies to:** M2 reception art and later locations/NPCs  
**Related:** `docs/45_M1_OWNER_DIRECTION_INTERACTION_AND_DIALOGUE_FLOW.md` portrait compositing contract

## 1. Core direction

The game deliberately uses **different authored pixel densities for the world scene and for close NPC portraits**.

This follows the visual logic of games such as *King's Quest VI*: the main world remains chunky and readable, while a speaking portrait can reveal substantially more facial, clothing and prop detail.

Do not describe these production tiers as literal image bit depth. "16-bit" and "32-bit" are useful aesthetic references, but the implementation is ordinary full-color PNG art.

Production terminology:

- **Scene Density** — lower-density world/environment art, roughly a rich 16-bit-era visual scale.
- **Portrait Density** — higher-density close-up art, roughly a 32-bit-era/detail-enhanced visual scale.

The difference is intentional and should be visible.

## 2. Starting authored-density targets

Current displayed apertures from the M1 layout:

- Main scene aperture: **1255 × 822 px**
- NPC portrait aperture: **564 × 278 px**

Recommended first production test:

### Scene Density

Author the main reception/world scene at approximately:

**314 × 206 logical pixels**

Render at **4× nearest-neighbor**.

314×206 becomes 1256×824, so the runtime may crop the final enlarged image by approximately 1 px horizontally and 2 px vertically to the fixed 1255×822 scene aperture. Do not non-uniformly scale the source to force an exact fit.

This is a starting production target, not permission to change the canonical aperture.

### Portrait Density

Author the portrait background and NPC at:

**282 × 139 logical pixels**

Render at **2× nearest-neighbor** into the 564×278 portrait aperture.

This gives the portrait twice the linear authored pixel density of the scene and roughly four times the logical pixel count per equivalent displayed area.

That difference is the desired effect.

If a first owner review proves 2× portrait pixels still too coarse, portrait density may be revisited. Do not jump directly to unrestricted 1:1 digital painting without review.

## 3. Scene and portrait are separate representations

A character appearing in the main scene should **not** be produced by mechanically shrinking the detailed portrait sprite.

Instead:

- scene NPC = separately authored Scene Density interpretation;
- portrait NPC = separately authored Portrait Density interpretation.

They share:

- character design;
- silhouette cues;
- clothing;
- key colors;
- recognizable props/features.

They do not need identical pixel clusters.

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

Rules:

- never permanently bake an NPC into the portrait background;
- keep the NPC independently movable/animatable;
- keep the background independently swappable/animatable;
- preserve alpha on NPC and FX layers;
- environmental events may change behind the same NPC without requiring a new flattened portrait;
- examples include fire, smoke, damage, emergency lighting, explosions, machinery failures or other scene-state changes;
- static portraits still follow the layered contract even if animation is not currently planned.

## 5. Color policy

Do **not** impose arbitrary historical hardware palette limits.

The game may use full-color PNGs and may exceed 256 colors when useful.

Scene and portrait art should share a coherent **color language**, not an identical indexed palette:

- same hue families;
- same institutional greens, creams, steels, blues, rusts and skin-tone families;
- portrait art may use more intermediate shades within those same ramps;
- scene art may simplify the same material/skin ramp to fewer shades.

A technically large color count is acceptable when the colors visibly improve the image.

The rule is:

> **Every color should be doing visible work.**

Avoid thousands of nearly identical colors caused by generation noise, filtering or uncontrolled texture.

Do not create hundreds of imperceptibly different grays/browns merely because the file format allows it.

## 6. Pixel-noise and dithering policy

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

- **Scene:** chunky, lower-density environmental storytelling.
- **Portrait background:** higher-density local environment/context.
- **Portrait NPC:** higher-density expressive character art.
- **UI:** existing native pixel-art system.
- **FX:** authored at the tier appropriate to the surface/space they inhabit and kept separate when practical.

Nearest-neighbor/integer presentation remains the default for scene and portrait raster art.

## 9. M2 receptionist production implications

Before producing the receptionist:

- create the reception portrait background separately;
- create the receptionist as a transparent Portrait Density foreground sprite;
- do not flatten the two together;
- preserve enough palette discipline that later portrait animation is practical;
- use the same broad palette families as the reception scene;
- author the receptionist portrait specifically for the 282×139 logical portrait tier rather than shrinking a larger painting;
- author any small receptionist figure visible in the main scene separately at Scene Density.

The first scene/portrait art review should test the **4× Scene Density vs 2× Portrait Density relationship in the actual 1920×1080 shell** before the density targets are treated as final production numbers.

## 10. What is intentionally not locked yet

This contract does not yet lock:

- final receptionist design;
- exact reception palette swatches;
- exact number of colors;
- number of portrait animation frames;
- whether every NPC receives animation;
- whether every location uses the exact same portrait background treatment;
- portrait density beyond the first 2× production test if owner review calls for adjustment.

The important locks are the **intentional density difference, shared color language, low-noise palette discipline, separate scene/portrait representations, and layered portrait compositing**.
