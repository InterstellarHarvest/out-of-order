# Chapter1 Batch2 — private artwork review

**Review follow-up:** Story Director accepted the lounge composition, bedroom and passage. The [locked-chair v03 gallery](rest-assured-revision-v03/index.html) returns to the original chair after v02 was rejected and contains the generated replacement and native/4× before/after views. Original images below remain unchanged. [Greenery clarification](GREENERY_CLARIFICATION_PROPOSED.md) is proposed only.

Open [index.html](index.html) locally. The gallery is offline, with no outside services, fonts, analytics or public deployment. Optional local-only server, from repository root:

```sh
python3 -m http.server 8768 --bind 127.0.0.1 --directory review
```

Then visit `http://127.0.0.1:8768/chapter-01-batch02-2026-11-15/`.

Four **generated candidates**, pending owner creative review:

| Asset | Registry id | Native candidate | Exact4× preview |
|---|---|---|---|
| A · Lounge | `house_of_tomorrow/lounge` | [314×206 PNG](candidates/lounge-candidate-v01.png) | [1256×824 PNG](previews/lounge-4x.png) |
| B · Locked Rest Assured | `house_of_tomorrow/chair` | [314×206 PNG](candidates/chair-candidate-v01.png) | [1256×824 PNG](previews/chair-4x.png) |
| C · Martin's bedroom | `house_of_tomorrow/bedroom` | [314×206 PNG](candidates/bedroom-candidate-v01.png) | [1256×824 PNG](previews/bedroom-4x.png) |
| D · Wardrobe passage | `house_of_tomorrow/passage` | [314×206 PNG](candidates/passage-candidate-v01.png) | [1256×824 PNG](previews/passage-4x.png) |

- [Lounge/chair comparison](previews/lounge-chair-comparison.png).
- [Bedroom/passage comparison](previews/bedroom-passage-comparison.png).
- [Seven-scene House contact sheet](previews/house-continuity-contact-sheet.png).
- [CONTINUITY.md](CONTINUITY.md): physical relationships established before generation, object anchors and art/export plan.
- [prompts.json](prompts.json): all exact built-in imagegen prompts/reference paths, including the low-passage correction.
- [manifest.json](manifest.json): dimensions, color information, hashes, source provenance, null production paths and creative-reference approvals.
- [STORY_ART_REPORT.md](STORY_ART_REPORT.md): narrative consistency and review decisions.
- [QA.md](QA.md): technical and visual verification, with practical limits.

The approved first-batch references and all previous versions remain byte-identical. The first passage source read as too tall; it is preserved under `generation-source/passage-v01.png` for comparison. Current passage uses `passage-v02.png`. All other selected sources are v01. Derived comparison sheets are not additional candidate assets.

Generation used built-in `image_gen.imagegen`. It returned larger deliberately pixel-art-like source images; exports use exact-aspect crop and NEAREST geometry to314×206, then non-spatial near-color cleanup. No averaged scene reduction, fixed palette-count cap or source-image replacement with code-drawn art. Exact transforms and measured palettes are recorded. Reproduce the exports/gallery with Python3 and Pillow:

```sh
python3 review/chapter-01-batch02-2026-11-15/build_review.py
```

Branch: `agent/ch01-art-batch02-20261115`. Worktree: `_worktrees/CYOA-ch01-art-batch02`. Verified baseline: `0de7cd8c15994c8e5652feff815d7d87a70d4d75` from `agent/ch01-art-first-pass-20261115`.

The owner-approved reference direction and intercom are preserved; this package does not approve the new scenes or promote anything. Production artwork/registry, story JSON, dice/inventory, importer output, engine, main and public storyboard are unchanged. No opaque-portrait implementation, Chapter2 art or next batch.
