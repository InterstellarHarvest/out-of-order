# Batch 1 signage polish · review revision v02

All seven compositions were accepted at `e9dff9cb9c06ec38cda0b29cff8141df4263fb40`. This revision changes only the permitted sign interiors in A, C and E. No image generation, scene regeneration, global quantization, scene resizing or restyling was performed. B, D, F and G reference their unchanged original PNGs.

Open the [private revision gallery](index.html), [all before/after comparisons at native scale](previews/all-before-after-native.png), or the [exact 4× comparisons](previews/all-before-after-4x.png). The gallery retains before/after scenes, actual-change overlays, permitted masks and changed-pixel masks. The parent gallery now links to this current revision while retaining its original views.

| Asset | Localized correction | Changed pixels | Outside permitted regions |
|---|---|---:|---:|
| A | Small notice: correctly drawn CLOSED; nonletter administrative rows and red stamp. The large Public Conveniences Bureau title, notice emblem, border, fasteners and existing red divider stay untouched. | 454 | 0 |
| C | Two side plaques: deliberate bars, checkboxes and administrative rules replace pseudo-words. Plaque placement, outer shading, border, fasteners and large BIOLOGY PARK title stay untouched. | 1,105 | 0 |
| E | Correct two-line JUNGLE JUNCTION title; left arrow and elevated control-office icon, upward arrow and walking visitor/flower icon, right arrow and tram-on-rail icon. Route plates use no cramped wording. | 1,194 | 0 |
| B, D, F, G | Original accepted files, referenced without replacing or re-encoding them. | 0 | 0 |

The original sun, tower-left/exhibits-center/tram-right layout, greenhouse, boardwalks, vehicle, architecture and machinery remain pixel-identical outside the sign interiors. [regions.json](regions.json) records every permitted rectangle in half-open native coordinates. White in `masks/*-allowed.png` means an allowed pixel; white in `masks/*-changed.png` means an actual difference. All other pixels remain unchanged.

Only three revision candidates are saved in `candidates/`, each opaque RGB 314×206. [manifest.json](manifest.json) maps all seven effective assets: A/C/E use these revised paths; B/D/F/G use the parent candidates. Portrait contracts and original alpha remain unchanged. New marks use only colors already present in the established 64-paint palette. There is no antialiasing, smoothing, new palette, dithering or scene-wide pixel processing. Exact 4× previews are 1256×824 per main scene; comparison/contact sheets also use exact 4× nearest-neighbor.

[qa.json](qa.json) verifies dimensions, modes, palette membership, actual change masks, zero changes outside permitted rectangles, exact 4× blocks, and preservation of **all 560 original tracked PNG/story/game files**, including every original generation PNG. [preserved-file-hashes.json](preserved-file-hashes.json) records those original hashes. [SHA256SUMS.txt](SHA256SUMS.txt) covers revision PNGs, masks, previews and the preserved initial study. The original source-generation hashes in the parent folder remain unchanged.

Rebuild with `python3 review/chapter-02-batch01-2026-11-15/signage-polish-v02/build_revision.py` from the repository, using Python 3 and Pillow. It draws only explicit integer-coordinate fills, custom bitmap glyphs and native pictograms; validates masks; rebuilds comparisons; and updates gallery counts. Use this revision builder for the current signage. The parent `build_review.py` remains the historical recipe for the unchanged original candidates.

The first native label study is retained in `iterations/01-label-study/`; its short route labels were removed from the final revision so the pictograms read clearly. It is not a selected delivery. All accepted originals and untouched generation sources remain in their original locations.

[Independent visual and technical review](REVIEW.md) confirms the controlled changes. No production assets, story JSON, engine files or inventory logic were modified. No merge, deployment or external publication is part of this revision.

[Gallery browser verification](gallery-verification.json) passes in headless Chrome: all native/4× images load, the three correction sections and four unchanged assets are present, displayed comparison/mask widths are exact, gallery counts match QA, and switching back restores native sizing. [Native gallery screenshot](previews/gallery-native.png).
