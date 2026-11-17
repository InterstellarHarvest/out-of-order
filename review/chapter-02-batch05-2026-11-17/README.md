# Chapter2 Batch5 — Irrigation and Exits

Five genuine built-in image-generation scene candidates, generated and unselected. Batch4 has final Nate approval and Art Director PASS; all six exact selections are registered. No gameplay integration.

Open [the offline gallery](index.html) for five native/exact4× views and six continuity comparisons. [Candidate paths/hashes](CANDIDATE_HASHES.md), [pixel QA](qa.json), [visual findings](ARTWORK_CONTINUITY_REVIEW.md), [story context](STORY_CONTINUITY.md), [remaining queue](REMAINING_QUEUE.md).

## Source and preservation

- Art branch: `InterstellarHarvest/CYOA@agent/ch02-art-batch05-irrigation-exits`.
- Immutable art baseline: `ec54699bf15455e1003e8aa41cec008abac1983f`.
- Canonical generation source: `InterstellarHarvest/CYOA-storyboard@1316cfc591d806aca7daeda7ce0c4ce13446d2e1`.
- Complete five artwork records and every associated narrative node are preserved in `target-source-records.json`; exact source snapshots/hashes are under `sources/`.
- 75 local/fetched remote refs inspected. No completed Chapter2 Batch5 targets existed. Name-only public_exit matches belong to Chapter1 House of Tomorrow, not these scene keys. See `EXISTING_ART_AUDIT.json`.
- All1,353 pre-existing tracked game-repository files remain byte-exact, including every earlier approved image, raw generation, rejected version, processing history, production image, story JSON and engine file.
- All91 selected public PNGs were fetched and hash-verified after Batch4 registration. See [approval receipt](BATCH4_APPROVAL.md).

## File contract

| Role | Files | Contract |
|---|---|---|
| Detailed original generations | `generation-source/*.png` | Original opaque tool outputs, unchanged; exact sizes in manifest |
| Native game candidates | `candidates/*.png` | Opaque RGB314×206; colors from existing64-color palette |
| Native review copies | `previews/<scene>-native.png` | Identical candidate pixels |
| Enlarged review copies | `previews/<scene>-4x.png` | Exact1256×824 NEAREST; every native pixel becomes a uniform4×4 block |

Use the native PNG for later gameplay integration and render at integer4× scale with smoothing disabled. No source render or review enlargement has been integrated into the game.

## Reproduce

Python3 + Pillow. From this folder:

```sh
python3 build_review.py
python3 build_gallery.py
```

The whole source canvas maps to314×206 with NEAREST and is quantized to the exact existing64-paint palette, without dithering. No crop, padding, local repainting, alpha removal from transparent source, procedural scene substitute or broad restyling. Original alpha is verified opaque before RGB export. Native aspect correction and quantization metrics are measured in the manifest.

All five source generations are preserved with exact prompts, original tool paths and reference roles. No discarded render or later scene edit exists in this batch. Source signage already consists of pictograms and deliberate bars, so no corrective lettering edits were needed. `processing-history/normalization-v01.json` records the deterministic source-to-candidate hashes.

45 approved reference PNGs are copied byte-exact and checked, including exact4× blocks and alpha where applicable. All source/image checksum lists are supplied. No approved Batch1–4 pixels are modified.

Status: generated, selected:false, production assetPath:null. Technical checks do not establish creative approval. See [canonical publication receipt](STORYBOARD_SYNC.md). Stop after Batch5 for Art Director review; Gameplay PMO integration remains separate.

Immutable five-candidate source commit: `a9b3817d0c72d2ed5ba398f1f374b0c3b7befeaf`. Canonical generated-status publication: `1a4a67c844704b1f37f2aed0302f95c9300aa2ec`. Pages and live verification passed, including all91 selected public PNG hashes. Final receipt commits retain the same five candidate bytes. No actual delivery blocker remains.
