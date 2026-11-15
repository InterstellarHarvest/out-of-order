# Rest Assured v02 — localized owner-review candidate

Open [index.html](index.html) for native and exact4× before/after views and the unchanged initial lounge comparison.

One replacement: [chair-candidate-v02.png](candidates/chair-candidate-v02.png), opaque RGB314×206, status **generated**, owner approval pending. [Exact4× PNG](previews/chair-v02-4x.png), [native comparison](previews/chair-before-after-native.png), [4× comparison](previews/chair-before-after-4x.png).

The new cuffs have complete padded oval rims, empty wrist apertures and visible closure/latch seams. A short dark stitch break and small cream tuft make the existing picked seam perceptible at native resolution. The same chair/recline/body/room remain; no protagonist anatomy or threatening new machinery is added.

Built-in `image_gen.imagegen` authored the changes. The source is preserved in `generation-source/chair-v02.png`; [prompt.json](prompt.json) records the exact prompt. Export uses NEAREST scene geometry and copies only three cuff/seam regions onto the original v01 PNG, matching its existing palette. Every other pixel, including the intercom, greenery, architecture, other chair geometry and infinity display, remains exact. [manifest.json](manifest.json) records source/candidate hashes, regions and measured palette. [QA.md](QA.md) records checks.

All prior PNGs, original chair and comparison sheets are retained. Story Director acceptance of lounge composition, bedroom and passage is recorded without production promotion. The new locked-chair replacement remains generated. [Greenery clarification](../GREENERY_CLARIFICATION_PROPOSED.md) is a proposal only; no plant or story edits were applied.

Reproduce with Python3/Pillow:

```sh
python3 review/chapter-01-batch02-2026-11-15/rest-assured-revision-v02/build_review.py
```

Branch `agent/ch01-art-batch02-20261115`; reviewed baseline `7d76a2616cf66d89aa59f8ac5acfa26b94d37675`. No gameplay, story JSON, production art, intercom or main changes; no public gallery deployment.
