# Chapter 2 Batch 3 — Administrative and Botanical Machinery

Seven actual built-in image-generation candidates, generated and unselected. No game integration. Batch 2 is already finally approved by the owner and registered; see [approval receipt](BATCH2_APPROVAL.md).

Open [the offline gallery](index.html). Start at native resolution, then use Exact 4× to inspect pixels. [Manifest](manifest.json), [QA](qa.json), [visual review](ARTWORK_CONTINUITY_REVIEW.md), [story context](STORY_CONTINUITY.md), [queue](REMAINING_QUEUE.md).

## Source pins

- Art repository: `InterstellarHarvest/CYOA`; isolated branch `agent/ch02-art-batch03-biopark-machinery`.
- Immutable art baseline: `ed098eee6999b25d44a6b4db2ad7605e430d88c6`.
- Canonical storyboard read before generation: `InterstellarHarvest/CYOA-storyboard@7079ce60ac29ed0c109b2d1e1b97abcec25a5b05`.
- All seven complete artwork records and every associated narrative node are preserved in `target-source-records.json`. Full canonical input snapshots and hashes are under `sources/`.
- Approved references: exact selected Batch 1 and Batch 2 native PNGs and exact 4× PNGs, with provenance in `references/manifest.json`.

## File contract

| Role | Files | Contract |
|---|---|---|
| Detailed generation sources | `generation-source/*.png` | Original opaque RGB 1548×1016 tool outputs, unchanged |
| Native game candidates | `candidates/*.png` | Exactly 314×206 opaque RGB; existing 64-color palette |
| Native review copies | `previews/<scene>-native.png` | Same native candidate pixels |
| Enlarged review copies | `previews/<scene>-4x.png` | Exactly 1256×824; every source pixel becomes an identical 4×4 block |

The game integration handoff is the 314×206 candidate. Render at integer scale with nearest-neighbor sampling and smoothing disabled. No high-resolution source or enlarged review PNG has been integrated into the game.

The deterministic conversion maps the whole source canvas to the native grid with NEAREST, then applies the existing palette without dithering. No crop or padding; measured aspect correction is 0.04263%. This is an AI detailed-source workflow followed by native normalization, not a claim that the generator directly authored every logical pixel. Inspect native readability in the gallery.

## Reproduce

Python 3 and Pillow are required; the processing run used the APIs recorded in the script. From this folder:

```sh
python3 build_review.py
python3 build_gallery.py
```

`build_review.py` asserts source opacity, palette membership, native dimensions, exact 4× blocks, 21 approved-reference hashes, and all 1,064 pre-existing tracked repository files. It records source/candidate hashes. D/E have reproducible local sign-interior polish and binary allowed/changed masks, proving zero changes outside those regions. The original native exports are preserved in `processing-history/normalization-v01/`.

Eight raw generations are retained for seven final candidates. Translator C-v01 prematurely exposed the later service door; C-v02 covers that door with roots. The initial and edit prompts and both raw sources remain available. All other scenes have their first raw generation preserved. No approved Batch 1 or Batch 2 image is edited.

Status: `generated`, `selected: false`, production `assetPath: null`. Pixel QA passes; selection remains with the owner/Art Director. See [publication receipt](STORYBOARD_SYNC.md) for canonical generated-status publication, separate from approval.
