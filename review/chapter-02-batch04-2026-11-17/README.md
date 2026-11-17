# Chapter 2 Batch 4 — Reserve Transit and Courtesy Conductor

Six actual built-in image-generation candidates, generated and unselected. No game integration. Batch 3 has final owner approval and is registered; see [approval receipt](BATCH3_APPROVAL.md).

Open [the offline review gallery](index.html). It includes six asset cards, native/exact4× controls, a live layered portrait with background/foreground toggles, checker/dark/light alpha inspection, six continuity comparisons and three notice-polish comparisons.

## Source pins and boundaries

- Art branch: `InterstellarHarvest/CYOA@agent/ch02-art-batch04-reserve-transit`.
- Immutable art baseline: `009c5afea133f36a92f2af74887e00b351d9b914`.
- Canonical generation source: `InterstellarHarvest/CYOA-storyboard@744399cf57d0de07a122ab2449b774cc4598d065`.
- Six complete artwork records, parent background context and every associated Chapter 2 narrative node: `target-source-records.json`. Full canonical source snapshots are under `sources/canonical/`.
- 73 local/fetched remote refs inspected before generation; no existing target PNGs found. See `EXISTING_ART_AUDIT.json`.
- 1,198 pre-existing tracked game-repository files remain byte-exact, including all prior approved art, original sources, production images, story JSON and engine files.

## Delivery contract

| Files | Role | Native contract | Exact4× |
|---|---|---|---|
| A/B/C/F in `candidates/` | Four scenes | RGB 314×206, opaque | 1256×824 |
| D in `candidates/` | Independent conversation background | RGB 564×278, opaque | 2256×1112 |
| E in `candidates/` | One conductor talking foreground | RGBA 564×278, real binary alpha | 2256×1112 |

Original detailed source sizes are recorded per asset in `manifest.json`; no scene enlargement/crop was used to author D. D/E composite at identical canvas origin with no additional transform. Their source generations use matching camera and lighting references; source aspect normalization is measured, not hidden.

Gameplay PMO should integrate native candidate PNGs and render at integer scale with nearest-neighbor sampling and smoothing disabled. Enlarged PNGs are review previews. No candidates have production paths or approval yet.

## Reproduce

Python 3 + Pillow. From this folder:

```sh
python3 build_review.py
python3 build_gallery.py
```

The preserved script maps the entire source canvas to its logical dimensions using NEAREST, applies the exact existing 64-color palette with no dithering, and writes exact4× previews. No crop, padding, blur, random texture or procedural scene substitute. E uses the established approved Batch 1 native-alpha threshold128 and zero RGB under alpha0; its original soft-alpha source and first normalized export remain preserved. No additional character poses, expressions or animation frames were generated.

A/B/F microlettering interiors are converted to deliberate native administrative bars. Pictograms, route dots and F's zero-fare numeral remain. Binary allowed/changed masks verify zero changes outside those notice regions. The pre-polish exports for every asset are preserved under `processing-history/normalization-v01/`.

Six original tool outputs, exact prompts and all reference roles are recorded in `generation-records.json`. 36 copied approved-reference PNG hashes are verified. Source and image checksum lists are supplied.

[Candidate paths and hashes](CANDIDATE_HASHES.md) · [Pixel QA](qa.json) · [Browser QA](gallery-verification.json) · [Visual findings](ARTWORK_CONTINUITY_REVIEW.md) · [Story context](STORY_CONTINUITY.md) · [Remaining 23-record queue](REMAINING_QUEUE.md) · [Canonical status publication](STORYBOARD_SYNC.md).

All six records remain generated, selected:false, production assetPath:null. Stop here for owner/Art Director visual selection. Gameplay integration is separate.
