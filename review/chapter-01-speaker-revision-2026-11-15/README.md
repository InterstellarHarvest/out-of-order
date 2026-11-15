# House speaker revision — private owner review

Open [index.html](index.html) locally. It shows native before/after room images, exact 4× room views, magnified speaker-region comparisons, and the before/after 564×278 conversation view.

Three current **generated candidates**, all pending owner visual approval:

| Candidate | File | Contract |
|---|---|---|
| Foyer | `candidates/foyer-v04.png` | 314×206 opaque RGB, 4× nearest-neighbor presentation |
| Dining | `candidates/dining-v04.png` | 314×206 opaque RGB, 4× nearest-neighbor presentation |
| Foyer conversation | `candidates/foyer-conversation-v04.png` | ONE complete opaque 564×278 RGB image, 1:1 |

The model is a compact, nearly flush ivory domestic intercom with a dark rectangular cloth grille, small green indicator, recessed thumbwheel, discreet sensor and internal pivot seam. No stand, stalk, pedestal or bottom support. The full room units are modest; the portrait retains substantial wall and mounting context.

- [DIRECTION.md](DIRECTION.md): scope and owner brief.
- [PMO_HANDOFF.md](PMO_HANDOFF.md): registry change, actual importer/runtime findings and later adoption checks.
- [artwork-registry.proposed.jsonpatch](artwork-registry.proposed.jsonpatch): reviewable proposal only; not applied and not yet supported by the current importer.
- [prompts.json](prompts.json): exact built-in imagegen prompts/references, including the scene-scale refinement.
- [manifest.json](manifest.json): candidates, source hashes, preserved originals, edit regions, dimensions, color counts and null production paths.
- [QA.md](QA.md): bounded verification and limitations.

The original room candidates and old layered speaker assets remain in [the first-pass package](../chapter-01-first-pass-2026-11-15/README.md) at baseline commit `3a763b52c1d60027549542d47381f4fbba412117`. Bathroom is untouched. No new transparent foreground or separate wall background has been generated.

Artwork edits used built-in `image_gen.imagegen`. Its larger source images are preserved in `generation-source/`. For room exports, normalize the generated edit with NEAREST and transfer only the old speaker/support region onto the original native scene. Non-spatial color alignment uses the original scene palette; every original pixel outside the documented region stays exact. This prevents unrelated generator changes to architecture or furnishings from entering the candidate. The independently authored complete portrait is reduced directly to 564×278 and uses non-spatial color cleanup; it is not an enlarged main scene.

Reproduce the review exports/gallery using Python3 and Pillow:

```sh
python3 review/chapter-01-speaker-revision-2026-11-15/build_review.py
```

All work stays on `agent/ch01-art-first-pass-20261115`, in `_worktrees/CYOA-ch01-art-first-pass`. No story JSON, generated gameplay, engine architecture, production art, approved reception, main or public storyboard changes. No promotion, animation or additional Chapter1 production in this pass.
