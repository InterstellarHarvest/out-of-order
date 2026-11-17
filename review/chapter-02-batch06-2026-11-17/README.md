# Chapter2 Batch6 — Credentials and Courier Cargo

Four item-art candidates, generated and unselected. Each slot and inspector has its own genuine built-in image generation. A targeted inspector source-color cleanup is additionally preserved. Batch5 has final Nate approval and Art Director PASS; its five exact images are registered. No gameplay integration.

Open [the offline gallery](index.html):four native/exact4× cards, paired slot/inspector views, approved-reference comparisons, checker/dark/light icon inspection and preserved version history. [Paths/hashes](CANDIDATE_HASHES.md), [pixel QA](qa.json), [visual review](ARTWORK_CONTINUITY_REVIEW.md), [story context](STORY_CONTINUITY.md), [remaining queue](REMAINING_QUEUE.md).

## Source pins

- Art branch:`InterstellarHarvest/CYOA@agent/ch02-art-batch06-credentials-cargo`.
- Immutable art baseline:`3112565df2fd6d2f2f7f72a1ae8d6d9998d14024`.
- Canonical generation source:`InterstellarHarvest/CYOA-storyboard@7f4d086d209657f16a9ba71bcea1f0b6a52f89e0`.
- Complete four artwork records, item descriptions and relevant story nodes are preserved in `target-source-records.json`; exact canonical snapshots/hashes are under `sources/`.
-77 local/fetched remote refs inspected; no completed target item PNGs found.
- All1,485 pre-existing tracked game files remain byte-exact, including previously approved images, generations, prompts, comparisons, alpha masks, processing history, story and engine files.
- All96 selected public PNGs were fetched and checked against registered source hashes after Batch5 approval. See [approval receipt](BATCH5_APPROVAL.md).

## Native file contract

| Candidate | Contract | Exact4× review |
|---|---|---|
| A Acting Director slot | Transparent RGBA96×96 |384×384 |
| B Acting Director inspector | Opaque RGB565×451 |2260×1804 |
| C Certified seed case slot | Transparent RGBA96×96 |384×384 |
| D Certified seed case inspector | Opaque RGB565×451 |2260×1804 |

Use native PNGs for future integration. The inspectors are independently authored detailed views, not enlarged inventory icons. Exact4× files are review previews. All records remain generated, selected:false, production assetPath:null.

## Reproduce

Python3 + Pillow. From this folder:

```sh
python3 build_review.py
python3 build_gallery.py
```

Slots follow the established item convention:source alpha threshold128, retain the largest connected object, crop transparent padding only, NEAREST fit within88×88, center on96×96, final binary alpha and zero hidden RGB. Both actual sources have one connected object; no detached opaque components were removed. Alpha masks, crop boxes, scale and offsets are recorded.

Inspectors map the whole opaque source canvas to565×451 with NEAREST, without crop/padding. All four candidates reuse the exact existing industrial64-color palette without dithering. No spatial blur, hand-painted mask, procedural object substitute or invented content is used.

Four independent original item generations are preserved, plus B-v02 targeted color cleanup. The first B inspector and native exports remain archived after its source paper grain became conspicuous under palette reduction. A radius12 color-consolidation trial is preserved but is not used by the final pipeline. Every exact submitted prompt/reference role and original tool path is in `generation-records.json`.

14 approved reference PNGs include the Examiner credential, established item presentation and approved Agricultural Customs case. Source/image checksums, processing masks/history and native comparisons are supplied. Existing approved pixels remain untouched.

## Explicit art direction versus old prose

The canonical seed-item description still says “dull metal cylinder.” The owner's explicit Batch6 instruction makes the approved Customs scene's rounded-rectangular case authoritative for art. Both new cargo variants follow it. No narrative wording was silently changed. See [story continuity](STORY_CONTINUITY.md).

Stop after Batch6 for Art Director visual review. Batch7's separate Focus dimension issue and gameplay integration remain outside this work. [Canonical status publication](STORYBOARD_SYNC.md).
