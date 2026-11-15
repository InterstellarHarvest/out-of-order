# Chapter 1 — House of Tomorrow first art batch

**Historical first pass. The speaker design and layered House portrait are superseded by the [speaker revision and complete-portrait ruling](../chapter-01-speaker-revision-2026-11-15/README.md). Room design is retained; original images below remain available for comparison.**

Open [index.html](index.html) directly in a browser. The folder is an offline private gallery; it has no external services or public deployment. A local server is optional:

```sh
python3 -m http.server 8767 --bind 127.0.0.1 --directory review
```

Then visit `http://127.0.0.1:8767/chapter-01-first-pass-2026-11-15/`. Both review versions are accessible from that server.

Exactly five current **generated candidates**, awaiting owner approval:

| Asset | File | Format |
|---|---|---|
| Foyer | `candidates/foyer.png` | 314×206 RGB |
| Dining | `candidates/dining.png` | 314×206 RGB |
| Bathroom | `candidates/bathroom.png` | 314×206 RGB |
| Foyer portrait wall | `candidates/foyer-portrait-background.png` | 564×278 RGB |
| House speaker | `candidates/house-speaker.png` | 564×278 transparent RGBA |

Gallery includes native and exact 4× main-scene views, separate portrait layers, toggled and flattened portrait composites, side-by-side comparisons and measured palette swatches. `previews/` contains derived review images, not additional candidate assets. `generation-source/` preserves originals and superseded versions. The current candidates apply the owner's distinct optimistic domestic design and period-speaker revisions.

- [ART_DIRECTION.md](ART_DIRECTION.md): specific composition plan covering all 20 Chapter 1 registry records.
- [prompts.json](prompts.json): exact built-in imagegen prompts, including superseded prompts and speaker revisions.
- [manifest.json](manifest.json): candidate status, null production paths, dimensions, measured colors, hashes, source provenance and normalization.
- [CONFLICTS.md](CONFLICTS.md): authored-story and art-state issues; no story edits applied.
- [QA.md](QA.md): bounded technical checks, visual review and limitations.

Reproduce exports/gallery using Python 3 and Pillow:

```sh
python3 review/chapter-01-first-pass-2026-11-15/build_review.py
```

Image generation used the built-in `image_gen.imagegen` tool. It returned larger source images rather than literal production-size canvases. Main exports use exact-aspect crop and NEAREST geometry; portraits were independently generated at a finer density and exported separately. Color cleanup is non-spatial and has no fixed palette count. The foreground has hard alpha and zero hidden RGB outside the sprite. All transformations are recorded, rather than representing normalized exports as direct native generator output.

Source branch `agent/ch01-playable-import-20261115`, base commit `84be05f21ad7f1d39c6841a603487cdc8c7a9bd4`. Isolated review branch `agent/ch01-art-first-pass-20261115`. Worktree `_worktrees/CYOA-ch01-art-first-pass`.

Production artwork, story/gameplay, source catalog, approved reception, main and the public storyboard are untouched. The remaining fifteen asset records await first-batch review. No artwork is approved or integrated by this package.
