# Gallery — printer/album restoration and higher speaker

[Open current seven-candidate review](index.html). Private branch: `agent/ch01-art-batch03-20261115`; baseline `0408259318c529e96312fc1b4b4b206fec9ad42c`. New candidates remain **generated, pending owner visual approval**. The final pushed commit SHA is reported directly in the owner handoff.

The owner approved the established chair/camera scene and requested restoration of the story-required printer and album. A compact cream1960s photo printer returns to the left side of the existing right-hand cabinet counter, with an oversized closed coral clothboard album beside it. The four empty chairs stay in one row, and the ceiling camera retains its short carriage and open hatch. The speaker is then raised at the owner's request, leaving clear wall above the album.

- A: [gallery v04](candidates/gallery-v04.png),314×206 opaque RGB. Restored props and raised speaker in the established room composition.
- B: [complete gallery conversation v03](candidates/gallery-conversation-v03.png),564×278 opaque RGB. Matching printer/album context, same intercom model and close camera scale, clear wall gap above book. The independent portrait export crop moves upward40sourcepixels to keep the raised bezel completely in frame at the existing scale.

The current manifest reuses C/D/E/F/G from the previous framing revision without changing their bytes, including the wide album views, clipped fourth chair and properly seated anonymous visitor. All previous image files and intermediate source renders are preserved. The new renders retain the established design; they are full-image generated edits, not a claim of masked per-pixel preservation outside the intended edit regions.

The visible printer/album omission identified in earlier reports is now resolved. `portrait_print`'s machine output and album beside the printer have visible counterparts again, so no prose change is proposed for that staging issue. The separate unapplied body-crop prose proposal and existing PMO focus-pagination/complete-House-portrait compatibility handoff remain in the previous package. No story JSON, gameplay, engine, production artwork, public Art Lab or other House room is changed.

Built-in **`image_gen.imagegen`** produced the edits. [Exact prompts and reference roles](prompts.json), original larger canvases under `generation-source/`, and [selected assets/transforms/source and export SHA256 hashes](manifest.json) are included. The initial restored lower-speaker views are retained as superseded source versions. Normalized outputs use the established exact-aspect NEAREST and nonspatial existing-color substitution process; these are not claims that imagegen emitted native canvases directly.

The gallery includes native A/B before/after comparisons, exact4× NEAREST1256×824 main view, scene/portrait comparison, updated House contact sheet and all seven selected native assets. [Technical QA](technical-qa.json) records dimensions, hashes, unchanged selected images and preservation of every previously committed PNG plus story/game/importer files. [Gallery validation](gallery-verification.json) records local links and displayed image dimensions; browser automation was not run.

To rebuild this review-only package with Pillow, run `python3 review/chapter-01-batch03-2026-11-15/printer-album-restoration-v04/build_review.py` from repository root. Previous builders rebuild their historical snapshots.
