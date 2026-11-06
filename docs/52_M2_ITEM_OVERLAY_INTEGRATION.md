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
