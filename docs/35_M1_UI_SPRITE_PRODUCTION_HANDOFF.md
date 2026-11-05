# M1 UI Sprite Production Handoff

**Date:** 2026-10-31  
**PMO status:** Start the next chat from this document.  
**Working branch:** `review/m1-ui-shell-v2`

## Canon shell candidate

The owner placed:

`/layout-final.png`

on `review/m1-ui-shell-v2` and declared it the current 1920×1080 alpha UI canon candidate.

Git blob SHA observed by PMO:

`a22d0735354290754e562daa01c9ff8694e0a9dd`

The owner removed the baked Current Objective text because objective wording must remain code-rendered/dynamic.

**Do not redraw, regenerate, resize, repaint, or reinterpret the shell.** Sprite work must be composited against this exact file.

PMO connector limitation: GitHub exposes the binary blob identity but not the image bytes to the connector, so final dimensions/alpha should be verified in Photoshop/local tooling before promotion from review branch. Owner is performing that visual check.

## Phase boundary

The static interface layout/frame work is complete. The next phase is **dynamic sprite production and integration**.

Start a fresh chat for this phase. This is intentional: several rejected button/press experiments exist in the prior conversation and must not leak into new production decisions.

## Reuse vs restart

### Player choice cards — REUSE / TEST FIRST
The latest choice-card direction was liked by the owner. Do **not** start them over automatically.

Test the existing approved-looking cards against `layout-final.png` first.

Locked behavior/geometry:
- runtime width: 548 px;
- 1-line: 80 px;
- 2-line: 108 px;
- 3-line: 136 px;
- 4-line: 164 px;
- 12 px vertical gaps;
- three 2-line cards fit the default visible area;
- no rivets;
- full four-sided frame;
- subtle A/B/C stain/wear variants per height;
- transparent exterior;
- no hover sprite/state;
- click feedback: whole card moves +3 px right and +3 px down, no recolor.

If the existing cards visually fit the new canon shell, keep them. Only remake them for a concrete mismatch.

### Inventory slots — probably REUSE / RETEST
- one reusable square slot sprite;
- target 96×96 px;
- seven visible if fit remains good;
- 6 px visible gaps;
- 102 px pitch;
- arrows move inventory exactly one slot per press;
- no numbered slots;
- no randomized grime variants.

### Inventory arrows — START OVER
Previous pressed-state work never became convincing enough.

Locked art requirements:
- narrow;
- smaller/subtle relative to slots;
- rivet-free;
- separate left/right sprites;
- beveled corners should visually favor/mirror the arrow-facing side;
- no hover state for now;
- only UP and DOWN/PRESSED active art states;
- **pressed state may not recolor**;
- pressed must make the **entire button body** look physically pushed from raised to flat/recessed;
- same material/palette in both states;
- accomplish depth through bevel/highlight/shadow inversion/compression and a tiny inward positional shift;
- never shrink the button on press.

### Utility/action buttons — START OVER
These must be separate sprites; they are no longer baked into the shell.

Three buttons share one design family but should not be clones:
- same dimensions/material/color family;
- code-rendered labels, no text baked in sprite;
- each button gets subtly different **very small** fasteners;
- mixed fastener types are encouraged: tiny slotted screw, Phillips/cross screw, hex bolt, washer/pin, etc.;
- fasteners may intentionally mismatch even on the same button;
- variation should be noticeable on inspection, not distracting during play;
- no large fasteners;
- no wildly different button colors;
- no hover state for now;
- UP and DOWN/PRESSED only;
- DOWN uses the exact same color/material as UP;
- entire button body becomes flat/recessed through pseudo-3D bevel/shadow inversion, not recoloring, shrinking, or pressing only the center.

### Player-choice scrollbar
The **track/slot belongs to the canon shell**.

Dynamic part is the thumb/indicator:
- no arrows;
- flat/rectangular, not tube-like;
- use the previously approved textured gold/tan insert look;
- implement as three sprite pieces: fixed top cap, repeatable/tileable center, fixed bottom cap;
- runtime stretches by tiling center only;
- full track when no scrolling is needed;
- proportional thumb height/position when scrolling is needed.

### NPC speech box
The speech box/frame remains part of the shell.

Runtime behavior:
- typewriter reveal;
- click while typing completes current message immediately;
- if message overflows vertically, show a small thin dark rounded-rectangle indicator in the **far-right gutter between the two right-side rivets**;
- no browser scrollbar;
- indicator fades in only when needed;
- text safe area must never collide with it.

### Objective
Objective plate/background is part of shell; objective text is dynamic.
No objective wording should be baked into shell art.

### Text
Selected direction is the readable narrow/condensed institutional pixel text shown in the owner-approved choice-card mockup—not the later heavy/blocky experiments.
- hard pixel edges;
- readable first;
- no browser smoothing/subpixel positioning;
- dynamic labels/text rendered in code/bitmap font, not baked into reusable button sprites.

## Integration order

1. Verify `layout-final.png` locally: exact 1920×1080 RGBA, intended scene and portrait alpha.
2. Build a sprite overlay lab using the exact shell.
3. Test existing choice sprites against shell before remaking.
4. Test single inventory slot and seven-slot spacing.
5. Redesign inventory arrows from scratch with true UP/DOWN physical-depth states.
6. Redesign three utility buttons from scratch with small mixed fasteners and true UP/DOWN physical-depth states.
7. Build scrollbar thumb as top/middle/bottom pieces.
8. Add locked bitmap text and speech overflow behavior.
9. Produce assembled screenshots at 1920×1080 and self-reject anything that violates the locks before showing owner.
10. Only then integrate into game runtime.

## PMO visual-reporting rule

Every art/mockup output must include a short written report:
- source/reference used;
- what changed;
- what was deliberately preserved;
- what PMO checked/rejected;
- any limitations;
- exactly what owner still needs to approve.

Never present an unexplained image.

## Core design language

16–32-bit detailed pixel art; industrial futurist rather than gold/brass steampunk; grey/blue-green metals, concrete/glass influence; patched but functional; subtle Brazil-like bureaucratic wrongness; varied fasteners used sparingly; not dirty, not pristine; not random junk; frame is a physical thing in the universe.

The layout is locked. Do not reopen major proportions while making component sprites.
