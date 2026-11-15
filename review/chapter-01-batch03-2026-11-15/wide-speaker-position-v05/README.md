# Wide gallery speaker placement — one candidate only

[Corrected314×206 wide scene](gallery-v05.png) · [Before/after comparison](before-after.png) · [Native and4× review](index.html).

The speaker returns to the original position from `gallery-candidate-v02.png`. The printer and closed album remain, with the four-chair row, descending camera, ceiling opening, cabinetry and room composition retained. The owner's follow-up image visually matches the saved restored-props source `printer-album-restoration-v04/generation-source/gallery-v03.png`; that existing render supplies this native export. No further scene redesign was needed. This supersedes the earlier instruction to move the physical installation higher in both views.

`printer-album-restoration-v04/candidates/gallery-conversation-v03.png` is **approved exactly as-is** and is not regenerated, copied into a replacement or edited. Its SHA256 remains `a365560b66e6d4bbb1f865214768a20dfb6bed2a870bd62ab31ce2c5b9f66f4d`. The apparent wide/close speaker-height difference is camera framing, not physical relocation or story geography.

Only one corrected artwork candidate and one comparison PNG are produced. Earlier image files are unchanged. No album-page, photograph-item, conversation-portrait, contact-sheet or other artwork replacement is generated. No story JSON, engine, production asset or public Art Lab changes.

The selected source was created with **built-in `image_gen.imagegen`** during the earlier restoration pass; its original prompt is `gallery-v03` in [the restoration prompt set](../printer-album-restoration-v04/prompts.json). This pass reuses that source after the owner's visual clarification. An initial built-in edit attempt placed the speaker too low and was not selected; [prompt.json](prompt.json) preserves that attempt and records the final selection. The selected original source already remains available in the repository, so no duplicate source image is needed.

The existing normalization helpers export opaque RGB314×206 using exact-aspect NEAREST and nonspatial radius18 substitution to nearby existing colors. [manifest.json](manifest.json) records the source/export hashes, speaker-grille position comparison, unchanged portrait hash and preservation of all earlier PNGs. Native speaker bounds are checked against the original reference within one pixel. The comparison retains both scenes at native size; the review webpage presents each at4× with nearest-neighbor CSS, without creating additional art images.

Private branch: `agent/ch01-art-batch03-20261115`; baseline `280167eccf6ad065037e5f22a6394149ed4137d0`. Corrected wide-scene record stays generated for review. Rebuild only these two deliverables with `python3 review/chapter-01-batch03-2026-11-15/wide-speaker-position-v05/build_review.py`. Final remote-verified commit is reported in the owner handoff.
