# Batch2 — technical and visual QA

Status: **generated candidates; owner creative review pending**. Technical checks do not confer approval or integration.

## Export contract

Exactly four active scene candidates, each opaque RGB PNG at314×206. Exact4× previews are1256×824 and pixel-identical to NEAREST enlargement. Native previews use the candidate itself, with intrinsic314×206 dimensions in the gallery; no browser smoothing or fit-to-aperture rescaling is required.

Built-in imagegen sources are preserved. Scene normalization is a minimal centered exact-aspect crop, NEAREST to314×206, and non-spatial color merge to existing frequent source colors within Euclidean RGB distance18. This does not move or average pixels and has no fixed palette-count target. No BOX, bilinear, bicubic or Lanczos scene reduction. The manifest records original dimensions, crop boxes, source/candidate hashes and measured palettes. These are normalized imagegen exports, not a claim that imagegen returned literal native-sized files.

Visible RGB colors: lounge227, locked chair247, bedroom179, passage151. These counts are measurements, not hardware limits or production constants. Clean large upholstery/wood/metal silhouettes carry the room and object identities; small foliage, highlight, cloth and dusty-floor clusters remain subject to owner visual judgment.

## Visual review

Inspected each scene at native and exact4×, the paired comparison sheets, and the seven-scene House contact sheet. Checked warm ivory/blond/aqua/coral continuity, human absence, intercom identity, subtle seam/paper/scratch clues, the same chair's cushions/pivots/legrest in both states, and wardrobe/bed/plinth continuity at the service entrance. A shows no exposed cuffs; B shows closed padded cuff mechanisms and infinity indicator, no occupant or wall breach. C keeps the wardrobe closed and the room maintained. D uses a low opening and squat hatch rather than the initial tall corridor. The preserved first-batch bathroom and conversation portrait are references only.

## Bounded verification

**38 technical checks passed. All38 earlier PNGs are byte-identical; all23 linked gallery files load over local HTTP.**

[qa-results.json](qa-results.json) records candidate count/status/null production paths, exact dimensions/opaque mode, hashes, per-pixel scene geometry/color-distance bounds, exact4× previews, creative-reference preservation, all earlier PNG preservation, unchanged story/engine/production surfaces, local gallery references and HTTP file loading.

The gallery is static offline HTML with no JavaScript or external dependencies. Full rendered-browser QA is not claimed because browser automation is unavailable. The actual linked files and local HTTP responses are checked. No gameplay regression is claimed or needed for this art-only change: story, rules, engine and generated content remain byte-identical to the verified baseline.

Review limitations are called out in `STORY_ART_REPORT.md`, especially pictogram versus literal status prose and inspection-sized clues. No new scene is marked approved, and no production path is assigned.
