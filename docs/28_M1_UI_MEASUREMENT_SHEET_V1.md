# M1 UI Measurement Sheet v1
**Date:** 2026-10-30  
**Source:** owner-supplied canonical `layout final(1).png`  
**Canvas:** 1920×1080 RGBA  
**SHA-256:** `374d83a217c0b9ec1d682ac9b464be9a870bb131384c35300eced9b8a67014b3`

This measurement pass does **not** modify the canonical PNG. Coordinates use a top-left origin and source pixels.

## Exact detected bounds
- Scene magenta aperture bounding box: **x30 y44 w1256 h823**
- Portrait magenta aperture bounding box: **x1331 y42 w566 h280**
- NPC speech interior fill: **x1317 y348 w591 h168**
- Current baked choice interiors:
  - 1: **x1325 y533 w532 h93**
  - 2: **x1326 y646 w531 h92**
  - 3: **x1326 y759 w532 h99**
- Current choice-thumb detected footprint: **x1874 y614 w27 h146**
- Utility interior fills:
  - Inspect: **x1487 y932 w121 h104**
  - Notes: **x1625 y932 w123 h104**
  - Journal: **x1767 y932 w121 h103**

## Proposed production regions — REVIEW, NOT YET LOCKED
- Choice-card runtime zone: **x1312 y522 w556 h346**
- Choice scrollbar track: **x1871 y523 w37 h345**
- Inventory reusable slot crop: **x75 y926 w102 h112**
- Seven-slot strip: **x75 y926 w714 h112**
- Inventory left button crop: **x25 y926 w48 h112**
- Inventory right button crop: **x789 y926 w48 h112**
- Objective text safe area: **x855 y930 w577 h118**
- NPC speech-overflow thumb safe strip: **x1880 y366 w18 h126**

These proposed regions are deliberately separated from exact-detected areas. Before actual sprite extraction, review the overlay and either owner-lock or adjust them. Do not change the master art to fit a guessed rectangle.

## Important logical-grid note
The canonical source is a 1920×1080 visual master. Current details do not all prove exact 2× logical-grid alignment. Production sprites should be deliberately authored/cleaned against the chosen 960×540 logical art grid instead of resampling the whole master.

Machine-readable map: [`ui_regions_v1.json`](../design/ui_regions_v1.json)
