# Chapter 1 Batch 5 — final interactive artwork

**Owner review pending. All seven assets remain generated.**

Private branch: `agent/ch01-art-batch05-interactive-states`  
Parent baseline: `a4a5c012ef32cd08e78c05914e742f9049a58f74`

Open [the private local review gallery](index.html) for all before/after comparisons at native resolution and exact 4× nearest-neighbor, the three approved Focus A pages paired with the album-removed main, masks, and QA.

| ID | Canonical candidate | Format |
|---|---|---|
| A | [Album removed](assets/A-album-removed.png) | RGB 314×206 |
| B | [Named plant adoption](assets/B-plant-adoption.png) | RGBA 314×206 |
| C | [Stored desk plant](assets/C-stored-plant.png) | RGBA 314×206 |
| D | [Stored red stapler](assets/D-stored-stapler.png) | RGBA 314×206 |
| E | [Stored rubber-band ball](assets/E-stored-band-ball.png) | RGBA 314×206 |
| F | [Stored timing clicker](assets/F-stored-clicker.png) | RGBA 314×206 |
| G | [RETURNS display](assets/G-returns-display.png) | RGBA 314×206 |

## Production and inspection

No approved room was regenerated. A is a localized pixel reconstruction from **gallery v05 itself**: only the book-and-shadow polygon changes. The printer, speaker, camera, chairs and cabinet front remain intact. Revealed wall/counter colors come from intact pixels in the same source; no earlier gallery is substituted. G uses a hand-authored 4×7 block alphabet, erases the neutral dash, and changes only display-content pixels; screen/frame shading stays intact.

B–F were independently generated as isolated transparent object renders with the built-in imagegen tool, using actual approved item designs for identity and the parent room for perspective/palette context. No inventory icon was mechanically shrunk. The new isolated renders were cropped to their opaque silhouette and normalized with nearest-neighbor to environmental density, with 24-color object palettes, alpha threshold 240 and zero hidden RGB. Stored pocket objects receive small hard-edged contact shadows. The drawer lip remains clear. B includes the white fluted desk-plant pot, a modest ivory/aqua pedestal, directed care lamp and watering nozzle. Unchanged decorative room plants remain in their original source pixels.

[Exact generation prompts](prompts/generation.json) and retained originals in `sources/` document built-in generation. [build_review.py](build_review.py) is the exact deterministic edit, placement and compositing recipe for all seven assets. Run it from any working directory with Python 3 and Pillow. Only this review directory is written. Then run [verify_review.py](verify_review.py) for independent saved-file checks and the overview contact sheet.

Visual inspection covered every complete parent-scene composite at 4×, the reconstructed cabinet crop, readable RETURNS at native size, and the object references. The five object cutouts were also inspected before reduction. Final owner visual acceptance is still pending.

## QA evidence

[qa.json](qa.json) records dimensions, modes, hashes, footprints and changed-pixel counts. All seven pass the pixel constraints: zero outside-region changes; all six overlays have alpha exclusively 0/255 and zero RGB beneath transparent pixels. Binary allowed and actual difference masks are in `masks/`. Every review enlargement is exact nearest-neighbor 4×. Composites and paired Focus examples are review material, not extra canonical assets.

[original-art-hashes.json](original-art-hashes.json) records all 359 pre-existing PNG hashes at the parent commit; the rebuild verifies every one remains byte-identical. [reference-hashes.json](reference-hashes.json) records the four room baselines, approved item references and three album Focus illustrations. Generated source hashes and final candidate hashes are also recorded. Only this new review directory is included in the commit.

See [HANDOFF.md](HANDOFF.md) for selection rules and the minimum future runtime changes. No story text, choices, inventory effects, engine, Chapter 2, production artwork or public Art Lab was altered. No gallery was published or candidate promoted.
