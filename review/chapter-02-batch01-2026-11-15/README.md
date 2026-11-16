# Chapter 2 · Batch 1 · Biology Park foundation

> Current review: all seven compositions accepted at `e9dff9c`. See [signage polish v02](signage-polish-v02/index.html) for the A/C/E corrections, before/after comparisons, masks and updated QA. Every original PNG below is preserved unchanged.

Seven generated PNG candidates, created with the **built-in image_gen workflow**, exported with controlled pixel processing, and ready for owner visual review. Open [the private review gallery](index.html) directly from disk. It has native/4× switches, independently composited portrait layers, and checkerboard/light/dark alpha inspection. This folder is private local review material; no hosting or deployment was created.

| ID | Candidate | Registry mapping | Contract |
|---|---|---|---|
| A | [Public Conveniences Bureau](candidates/A-conveniences-bureau.png) | `biology_park/conveniences_bureau` | RGB 314×206 |
| B | [Mechanical Groundskeeper](candidates/B-groundskeeper.png) | `biology_park/groundskeeper` | RGB 314×206 |
| C | [Formal entrance](candidates/C-formal-entrance.png) | `biology_park/formal_entrance` | RGB 314×206 |
| D | [Service entry](candidates/D-service-entry.png) | `biology_park/service_entry` | RGB 314×206 |
| E | [Jungle Junction](candidates/E-jungle-junction.png) | `biology_park/jungle_junction` | RGB 314×206 |
| F | [Portrait background](candidates/F-groundskeeper-background.png) | Groundskeeper `portraitBackground` | RGB 564×278 |
| G | [Portrait foreground](candidates/G-groundskeeper-foreground.png) | `groundskeeper:idle` | RGBA 564×278, genuine transparency |

`candidates/` contains the seven delivery PNGs. Normal main-scene presentation is exact nearest-neighbor 4×, 1256×824. Portraits normally remain 564×278 at 1×; the 2256×1112 previews provide additional diagnostic inspection. All candidates are `generated`, with `assetPath: null` in the review manifest; none is promoted to production.

## Source authority and isolation

Branch: `agent/ch02-art-batch01-biopark-foundation`. Artwork baseline: `cf575552fc729b952d99d25bea56dbc81b40619d` (`agent/ch01-art-batch05-interactive-states`). Authoritative Chapter 2 source: `e98602f7992908a750672006f556b8efc15d686f` (`agent/scene-pickup-inspector-20261115`). The three requested JSONs were read with `git show` at that exact commit. Byte-exact review snapshots and hashes are under `sources/`; they do not replace narrative files in `story/`.

Only this new review folder changes relative to the artwork baseline. Story JSON, registry, engine, inventory logic, Chapter 1 artwork and Chapter 2 routes remain unchanged. No merge or deployment. Prior branches, worktrees, generations and existing PNGs remain in place.

## Generation and reproducible export

Exact submitted prompts: [A](prompts/A.txt), [B](prompts/B.txt), [C](prompts/C.txt), [D](prompts/D.txt), [E](prompts/E.txt), [F](prompts/F.txt), [G](prompts/G.txt). [Generation records](generation-records.json) identify exact reference inputs and original tool output paths. `generation-source/` holds all seven untouched built-in renders, one call per requested asset. No CLI/API fallback or substitute illustration was used.

The original Exposition facilities corridor is the initial technology/style reference; A supplies the Bureau identity for B/C/D; C supplies the greenhouse vocabulary for E; B supplies the tighter F office viewpoint and the G machine identity; G also references F for alignment. D's submitted prompt mentions C as vocabulary, but its actual sole tool input was A; the record makes this explicit.

Run `python3 review/chapter-02-batch01-2026-11-15/build_review.py` from the repository, with Python 3 and Pillow installed, to rebuild candidates, previews, palette, manifests and numerical checks. The script reads raw source PNGs and performs these recorded operations:

1. Nearest-neighbor normalization to exact contract dimensions, without cropping or padding. Source ratios differ from target by less than 0.14%; only this tiny ratio correction is applied.
2. Shared 64-paint palette: 48 joint median-cut material colors plus 16 reserved signal/soil/leaf/light paints. No dithering. The reserved paints preserve closure reds, service handle, soil and leaf highlights that area-weighted training suppressed. Exact RGBs are in [palette.json](palette.json).
3. For G only, nearest-neighbor sampling of generated alpha, threshold at 128 to binary coverage, and zero RGB under fully transparent pixels. This preserves the generated machine silhouette with hard pixel edges. The original alpha and its native histogram remain preserved in the raw PNG and manifest; the export deliberately removes fractional fringe/near-opaque coverage.
4. Independent composition F then G at `(0,0)`, plus native and exact 4× previews. Every 4×4 preview block is checked against its native pixel, including alpha.

The first processing pass, whose area-weighted palette muted signal reds, is preserved in `processing-history/palette-pass01/`. Final delivery uses `candidates/`. The raw generation PNGs were never overwritten.

## Review evidence

- [QA data](qa.json): exact dimensions/modes, visible colors, color error, four-neighbor pixel-density metrics, alpha coverage, exact preview checks and baseline preservation.
- [Gallery browser verification](gallery-verification.json): all images load, exact native/4× rendered widths, independent layer controls, alpha backdrop switching and return to native pass in headless Chrome. [Native gallery screenshot](previews/gallery-native.png).
- [Scene/portrait comparison](previews/scene-portrait-comparison-native.png), [4×](previews/scene-portrait-comparison-4x.png), and [five-scene continuity sheet](previews/five-scenes-native.png).
- [Chapter 2 visual-direction sheet](VISUAL_DIRECTION.md), [illustrated reference sheet](previews/chapter-02-visual-direction.png), [source-grounded continuity](STORY_CONTINUITY.md), and [observed artwork review](ARTWORK_CONTINUITY_REVIEW.md).
- [SHA256 source hashes](SOURCE_SHA256SUMS.txt), [candidate manifest and hashes](manifest.json), and [baseline hashes](baseline-hashes.json).

All 491 baseline tracked PNG/story/game files pass byte-for-byte preservation. Baseline preservation and technical checks pass; owner visual approval remains pending. Dense glazing, foliage and maintenance grating create more single-pixel detail in D/E than A, which is reported instead of treated as a numerical quality pass. Small generated notice lettering is incidental and imperfect; pictograms, architecture and route silhouettes carry navigation. The full official closure wording remains in the authoritative story text.

## Later integration contract

Use the five scene candidates as proposed registry mappings only after visual acceptance. F and G share origin and dimensions; draw F opaque, then G RGBA, without offsets, stretching or flattening the background into G. The conversation view was separately generated closer to the same office-side invasion, rather than enlarged from B. Preserve the module, seed feeder, soil hopper and hose layout when preparing future poses. The scene/portrait composites and reference sheets are review artifacts, not extra runtime assets.

Future batches should quote E's screen-space geography: elevated tower and climbing walkway left; specimen boardwalk center; tram platform and rails right; one manufactured overhead sun within a giant ribbed enclosure. This is an art staging convention, not a new compass-bearing claim or route change.
