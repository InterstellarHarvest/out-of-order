**Latest correction:** [wide scene with original speaker position — candidate and before/after](wide-speaker-position-v05/index.html). The conversation portrait is approved exactly as-is. [Earlier seven-candidate review](printer-album-restoration-v04/index.html) remains available as a snapshot.

# Chapter1 Batch3 — private artwork review

Open [index.html](index.html) locally. This is a static private review package, not the public Art Lab. All seven selected candidates remain **generated, pending owner creative approval**.

Branch: `agent/ch01-art-batch03-20261115`. Baseline: `ae7ae2bfe7821f87ebc5dca686829592b7c27f49`. Commit/push receipt: [DELIVERY.md](DELIVERY.md).

| ID | Candidate | Contract |
|---|---|---|
| A | [Gallery](candidates/gallery-candidate-v02.png) | 314×206 RGB; four chairs in one row, camera through ceiling hatch, clear cabinet. |
| B | [Gallery conversation](candidates/gallery-conversation-v01.png) | 564×278 RGB; one complete close-up at v05 device scale. |
| C | [Album1](candidates/album-page-01-v02.png) | 564×278 RGB; four ordinary family photos, simplified figures. |
| D | [Album2](candidates/album-page-02-v01.png) | 564×278 RGB; three older/frightened/exhausted family photos. |
| E | [Album3](candidates/album-page-03-v01.png) | 564×278 RGB; four prints, skeletal remains to entirely empty chairs. |
| F | [Current print slot](candidates/photo-slot-v02.png) | 96×96 RGBA; real transparent paper silhouette. |
| G | [Current print inspection](candidates/photo-inspector-v02.png) | 565×451 RGB; three whole empty chairs, partial fourth chair and seated occupant's feet/lower legs only. |

[Gallery4×](previews/gallery-4x.png), [spatial comparison](previews/gallery-conversation-spatial.png), [album sequence](previews/album-chronology.png), [slot/inspection comparison](previews/photo-slot-inspection.png), [House contact sheet](previews/house-contact-sheet.png).

The latest owner corrections supersede first-pass printer/album staging, staggered chairs, detailed album humans and strict-three-chair photo crop. The taking camera appears in no photographs. Previous sources and comparisons remain available. Existing House artwork, including the intercom, foyer portraitv05 and accepted chairv04 pair, is untouched.

Production used the **built-in `image_gen.imagegen` tool**. Exact prompts and reference roles are in [prompts.json](prompts.json); all original larger source canvases are retained under `generation-source/`. [manifest.json](manifest.json) records selected exports, transforms and every source SHA256. Final dimensions are normalized exports, not a claim that imagegen directly emitted native canvases. [TECHNICAL_QA.md](TECHNICAL_QA.md) and [technical-qa.json](technical-qa.json) record format and baseline preservation checks. Run `python3 review/chapter-01-batch03-2026-11-15/build_review.py` from the repository root to rebuild review-only exports with Pillow.

Read [STORY_ART_REPORT.md](STORY_ART_REPORT.md) for explicit conflicts and [PMO_HANDOFF.md](PMO_HANDOFF.md) for the existing single-focus-image limitation and complete House conversation exception. No story, gameplay, engine, production asset, public gallery, merge or Chapter2 changes.
