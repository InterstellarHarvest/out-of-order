# Narrative Mode B — right-column artwork study

**Review only.** Built on isolated branch `agent/narrative-mode-b-art-study` from
`docs/story-gameplay-study-v01` at `69c23d9`. Nothing here is wired into M2.

## Artwork

| Candidate | Overlay | Reading surface |
| --- | --- | --- |
| 1 | [narrative-mode-b-candidate-a-overlay.png](narrative-mode-b-candidate-a-overlay.png) | Existing dialogue inset cream and stained lower edge, extended as one surface. |
| 2 | [narrative-mode-b-candidate-b-overlay.png](narrative-mode-b-candidate-b-overlay.png) | Slightly warmer institutional-paper tone in the same dialogue-panel frame. |

Both are transparent **1920×1080 RGBA** PNGs with hard, binary alpha. They contain
only the altered right-column panel. They contain
no narration, choices, scene, objective, inventory, or footer controls.

The starting shell is exactly `art/ui/shell/layout-final.png`, SHA-256
`79c891e1875b0a6f6cb2006cc2bffded5dbff1a762fd3d91f5ff0806febb9625`
(the owner's 2026-11-08 top-frame pixel fix; see `docs/CANONICAL_UI_SHELL.md`). The study was first
built on `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6`. The fix
changed only opaque top-frame pixels above the overlay's top edge, so both overlay PNGs rebuilt
byte-identical and the exact-shell proofs differ only in those 2,376 frame pixels.
That is the current committed shell measured in
`tools/layout-lab/data/measured_shell_regions.json`; the older hash in doc 27
refers to an earlier owner PNG. The item-inspector precedent is
`art/ui/shell/item-overlay.png`, SHA-256
`4566079c985b7efaeeba0140dd5c6b8b8b371713391604118e3de123738a8dfb` when this study
was made. The owner re-exported it on 2026-11-08 with the top-frame fix (`aaac746a…`).
It was examined for the full-canvas, right-column-only compositing approach;
its picture-window artwork was not copied into the narration overlays.

## Exact-shell proofs

| Passage | Candidate 1 | Candidate 2 | Side-by-side |
| --- | --- | --- | --- |
| Short | [full frame](candidate-a-short-exact-shell.png) | [full frame](candidate-b-short-exact-shell.png) | [comparison](candidate-comparison-short.png) |
| Long | [full frame](candidate-a-long-exact-shell.png) | [full frame](candidate-b-long-exact-shell.png) | [comparison](candidate-comparison-long.png) |

[Top-right switch detail](top-end-switch-comparison.png) shows the original
portrait-view corner bracket beside the same metal bracket with its lower leg
masked and rounded in Narrative Mode.
[Top-border alignment detail](top-border-alignment-detail.png) shows the
existing upper hardware directly above the reused dialogue-box black edge.
[Choice text comparison](choice-text-conventions.png) shows both proposed
conventions on the **existing approved choice-card sprites and locked Choices
bitmap atlas**. The exact-shell proofs use three standard two-line cards at
`x1324`, `y527/639/751`, each `535×107` in the current placement, plus the
existing capped full-height choice thumb. The scene is a neutral matte; the
footer is copied unchanged from the current QA capture for visual context.
That capture shows the runtime's six-slot presentation; it is context only and
does not revise the M1 seven-slot design lock. These are review screenshots,
not game assets.

## Alignment and masking

- Original measured portrait aperture: `x1333 y44 w564 h278`.
- Original speech panel: `x1316 y344 w598 h176`; parchment starts
  `x1323 y349`. The existing choices begin at `y525`, track at `y536`.
- New opaque panel coverage is `x1316..1919, y68..519`, with a top edge that
  follows the lower edge of the existing top frame at about `y42..56`. The old
  portrait/speech divider around `y318..348` is fully covered, including its
  rightmost edge.
- The **actual black top edge and brass bevel from the existing dialogue box**
  are moved upward, column by column, to the first pixel below the existing
  top frame. The panel therefore sits behind that frame, with its black line
  directly touching the frame's lower edge even where the frame has a shallower
  pipe or a deeper enamel plate.
- The original silver top-right bracket head and large screw remain visible
  from the shell. The overlay masks its descending 90-degree leg and lower
  screw; the surviving metal edge is pixel-stepped into a shallow rounded end
  at `x1880..1919, y50..55`. No new cap material is drawn. Removing the
  overlay reveals the approved full bracket again.
- Alpha is zero left of `x1316` and below `y519`. Thus neither overlay touches
  the scene, choice cards/scrollbar, objective, inventory, or footer. Both
  overlays must be composited at `(0,0)` and **above** the shell and any old
  portrait/speech layers; narration text is then rendered above the overlay.

The divider cannot be removed by hiding the portrait alone: it is baked into
the shell. A narrow remnant of its right bracket was visible until the overlay
also covered the five outermost pixels. The current overlays mask it completely.
The side moulding there repeats a clean span of the existing speech-panel rail,
which is acceptable for this review but merits inspection against final game
content at native resolution before any production integration.

## Typography questions left open

1. **Quotation convention:** spoken text is quoted; action text is an unquoted
   imperative. Current M2 dialogue does not acquire quotes through this study.
2. **Marker convention:** both retain ordinary wording; only actions receive
   a muted `A:` text marker inside the existing card text layout. It is small
   but could be mistaken for a keyboard shortcut. No marker is baked into a
   card sprite.

Both use the existing Choices face and sprites; neither is approved. No
italics, parentheses, new font, or new card art is proposed. The long sample
occupies 15 lines at 27-pixel leading and fits without moving choices. Longer
passages will need a separate internal scrolling or continuation decision; no
scroll control is baked into either overlay.

Rebuild with `python3 review/narrative-mode-b-art-study/build_review.py` from
the repository root. The script checks the source-shell hash, output bounds,
and full occlusion of the divider region.
