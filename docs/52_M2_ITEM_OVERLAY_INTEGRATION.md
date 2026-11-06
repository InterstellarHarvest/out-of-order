# CYOA M2 — Item Inspector Overlay Integrated

**Date:** 2026-11-06  
**Branch:** `agent/m2-reception-slice`  
**Starting head:** `ed667f8a93f5e89266106033ca152cd552ebfaca`

The owner-provided `art/ui/shell/item-overlay.png` is now used directly by the reception slice when the item inspector opens.

Implementation rules:
- the overlay is a 1920×1080 RGBA full-canvas asset;
- it is placed at stage coordinate 0,0 at 1:1 size;
- the canonical `layout-final.png` remains untouched underneath;
- the old procedurally drawn `INSPECTOR COLUMN OVERLAY` placeholder has been removed;
- item inspect art and the inspector X button remain DEV placeholders until approved assets exist;
- QA now asserts that inspector mode uses the exact committed overlay path and full-canvas placement.

This is an integration of already committed owner art, not a redesign of the inspector geometry.

## Follow-up: inspect art fitted under the overlay

At `759d5f4` the placeholder inspect art used the old rectangle (x1333–1897, y44–520) and was layered
**above** the overlay, so it painted over the overlay's top rail (9 px), right rail (3 px) and the whole
bottom rail (y498–520). The overlay's see-through window is hand-drawn, roughly x1332–1894, y51–499.

Fix: the inspect art now fills `[1331, 50, 565, 451]` (x1331–1895, y50–500) and sits **under** the
overlay in the DOM, so the frame's ragged inner edge always draws on top. The X sits 8 px inside the
art's top-right corner, as before. QA asserts the new rectangle and the art-under-overlay order.
Verified on the Mac: route 38/38, game QA 264/264 (Chromium + Firefox).
