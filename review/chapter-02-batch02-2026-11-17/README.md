# Batch 2 — route foundations

Seven new generated candidates for Art Director and owner review. The owner accepted the revised rendering style after a tower calibration; the individual seven images have not been selected or marked approved.

- Canonical source: `InterstellarHarvest/CYOA-storyboard@25921b9bb0e263c017a804c57e9069c172f6b3b4` (`main` fetched November17,2026).
- Artwork baseline: `InterstellarHarvest/CYOA@24434cb96d48fcb2cebe1f9814fcb35dd9ab1271`, preserving selected Batch1 A/C/E signage-polish-v02 and B/D/F/G earlier selections.
- Isolated review branch: `agent/ch02-art-batch02-biopark-routes`.
- Open [the private browser gallery](index.html). It reuses Batch1 styling and native/exact4x controls; no hosting or deployment of review images was created.

| ID | Registry key | Candidate |
|---|---|---|
| A | `scenes:biology_park/control_tower` | [A-control-tower.png](candidates/A-control-tower.png) |
| B | `scenes:biology_park/spore_garden` | [B-spore-garden.png](candidates/B-spore-garden.png) |
| C | `scenes:biology_park/tour_tram` | [C-tour-tram.png](candidates/C-tour-tram.png) |
| D | `scenes:biology_park/damaged_walkway` | [D-damaged-walkway.png](candidates/D-damaged-walkway.png) |
| E | `scenes:biology_park/moving_forest` | [E-moving-forest.png](candidates/E-moving-forest.png) |
| F | `scenes:biology_park/overgrown_tram` | [F-overgrown-tram.png](candidates/F-overgrown-tram.png) |
| G | `scenes:biology_park/sensor_gallery` | [G-sensor-gallery.png](candidates/G-sensor-gallery.png) |

## Provenance and export

The seven target records were `not-started`, with null production paths, in the pinned catalog. [Source-grounded target records](target-source-records.json) preserve each full authored brief, first occurrence and every node sharing the scene. [The audit](EXISTING_ART_AUDIT.json) searched current fetched remote branch trees and local workspaces before generation; no target PNG existed and no batch-slot substitutions were needed. Missing production paths were never used to infer that the seven selected Batch1 assets required art.

Actual artwork was produced with built-in `image_gen`, one independent call per scene. All raw PNGs are under `generation-source/`; exact submitted final prompts are `prompts/A-v02.txt` through `G-v02.txt`. [Generation records](generation-records.json) list exact reference roles, source paths and original tool output locations. No API/CLI fallback, stock images or placeholder illustrations were used.

The first five chunky graphic renders were rejected after owner feedback. Their five untouched raw PNGs, exact submitted prompts and [rejection manifest](rejected/style-study-v01/manifest.json) remain preserved. F/G generation paused before that style correction. The owner accepted the revised tower style beside actual selected references, then the revised B–G images were generated. This style acceptance is not an approval or integration status for the seven candidates.

Run `python3 review/chapter-02-batch02-2026-11-17/build_review.py` followed by `python3 review/chapter-02-batch02-2026-11-17/build_gallery.py` with Python3 and Pillow. The first script normalizes each full source canvas with NEAREST to314x206 without cropping/padding; asserts source opacity; maps colors to the exact selected Batch1 64-paint palette with no dithering; writes RGB PNGs; checks every4x4 preview block; and verifies the full baseline hashes. Original aspect ratios require only a tiny whole-frame ratio correction, measured individually in the manifest. The second script rebuilds the gallery using the copied Batch1 stylesheet and its scale-switching design.

B alone has localized native notice polish: the generated microletter field is replaced with deliberate nonletter bars in box `[54,149,86,166]`. The respirator, stripe, plaque and architecture are unchanged outside that mask. [Allowed](masks/B-notice-allowed.png) and [changed](masks/B-notice-changed.png) masks prove zero changes outside it. Pre-polish candidate exports and metrics are preserved in `processing-history/normalization-v01/`. No accepted old asset has any pixel edit.

The gallery provides all seven native/4x scenes, contact sheets, selected Bureau/tower/Junction comparison, Junction/garden/catwalk comparison, Junction/tram/rooted-state comparison, service/sensor comparison, forest/sensor comparison, and a direct clean/rooted tram pair. [Source SHA256s](SOURCE_SHA256SUMS.txt), [all PNG SHA256s](PNG_SHA256SUMS.txt), [manifest](manifest.json), [QA](qa.json), source snapshots and reproducible scripts are included.

## Technical and visual review

PASS: seven RGB314x206 candidates, seven1256x824 scene previews, existing64-color palette membership, source opacity, exact integer scaling, no cropping/padding, 934 pre-existing tracked files preserved, and all seven selected Batch1 hashes matched against their public selected previews. [Visual findings](ARTWORK_CONTINUITY_REVIEW.md) and [browser verification](gallery-verification.json) are separate evidence. Technical correctness does not constitute visual approval.

Fine foliage, bark, cables and steel grating remain denser than broad office surfaces. Readability is strongest in the major route forms, hatch, feeder-free transit interior, gauge rack and numbered tree markers. D/G in particular deserve native-scale attention for fine repeated patterns. The full canonical advisory prose stays in the story; it is not forced into a tiny sign.

## Art Director and owner review

1. Open the gallery at native scale, then use exact4x. Compare the current rendering against the selected references, not the rejected studies.
2. Check the initially tidy tower, stopped garden fan/duct and damaged higher route, C/F carriage continuity, partly concealed forest tracks and the sensor-to-flower reference dependency. Confirm no later infection, crash, rescue or catastrophe is baked into neutral scenes.
3. Select by exact candidate path and SHA256. Request a localized revision or new candidate if necessary; preserve every previous source. Do not approve variants solely because they are newer.
4. Selection is creative approval. Register selected files through the canonical `register-art.mjs` workflow when the owner/Art Director chooses them; Gameplay PMO separately assigns actual production paths and verifies runtime integration. These new candidates remain `generated` and their production `assetPath` stays null.

## Canonical synchronization and remaining work

[Storyboard synchronization receipt](STORYBOARD_SYNC.md) records the published public main commit `a1dc9a2ef5730a31d62ad6f60244acfab6c40db5` and successful Pages workflow. It changes only candidate metadata and the corresponding QA expectations; the selected-art collection and ledger remain untouched. The game repository story tree and engine are unchanged.

[The ordered Chapter2 queue](REMAINING_QUEUE.md) enumerates all 36 remaining catalog records after excluding these seven new candidates, including the Concourse Crash portrait background, Courtesy Conductor foreground, all item slot/inspection pairs, three FocusA records and five death-popup illustrations. No Chapter3 art is started.

Public publication is complete: seven generated statuses, successful Pages deployment, live catalog verified, no selected-preview additions. See [the receipt](STORYBOARD_SYNC.md). All seven requested images are complete; there are no blocked images. Initial unused F/G prompt drafts are preserved under `prompts/planned-unused/`.
