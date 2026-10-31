# M1 Dynamic Component Art Lock + Runtime v6
**Date:** 2026-10-31  
**Status:** OWNER LOCK. This supersedes earlier exploratory dynamic-component mockups. The static 1920×1080 frame/layout remains unchanged.

## Authoritative component-art source
The owner approved the generated sheet `a_polished_high_detail_ui_mockup_in_pixel_art_sty.png` with the instruction: **"lock in this design ... these pixel designs precisely. make them work in our UI."**

SHA-256: `8c7b2703d12c228128d543b3c058ad0045ecc851a6fca10cf754fe0094580f67`

This sheet is now the visual authority for:
- player-choice frame construction and stain language;
- the single inventory-slot sprite;
- narrow rivet-free inventory arrow controls;
- raised vs physically recessed inventory-button treatment;
- raised vs physically recessed utility-button treatment;
- the selected readable pixel-text character style.

Do not re-style these components in later passes unless the owner explicitly reopens them.

## Production adaptation rules
The accepted sheet is a style/shape source, while the fixed runtime geometry comes from the canonical 1920×1080 M1 layout. Assets are therefore adapted to the exact runtime rectangles without changing the approved visual language.

### Player choices
- Exact runtime width: **548px**.
- Heights: **80 / 108 / 136 / 164px** for 1/2/3/4-line cards.
- Three variants A/B/C per height.
- Exterior is transparent; no teal/rust backing contamination.
- Full four-sided frame.
- **No rivets.**
- Cream surface with subtle stain/wear variation.
- No hover sprite.
- Press feedback remains the previously locked subtle **+3px right / +3px down** positional press; no recoloring.

### Inventory slots
- One sprite only: **96×96px**.
- Seven visible.
- 6px gaps, 102px pitch.
- No randomized slot variants.

### Inventory arrows
- Separate left/right assets.
- **56×112px** production sprite box.
- Narrow, no rivets.
- Beveled outline follows the arrow-facing geometry.
- Only two active visual states are currently required: **UP** and **DOWN/PRESSED**.
- Pressed uses the same palette/material; the **whole button body** changes from raised to recessed through bevel/shadow depth. No hue/saturation/fill change. No hover sprite.

### Utility buttons
- Adapted into **144×128px** production sprites.
- Same accepted material/palette in UP and DOWN states.
- DOWN/PRESSED changes full-body depth/shading only; no recolor.
- No hover sprite.
- Labels remain code-rendered so INSPECT / NOTES / JOURNAL can change contextually.

## Locked pixel text
A bitmap atlas is extracted directly from the accepted sheet's approved pixel-text sample rather than relying on a browser font.

- proportional glyph widths are preserved from the source sample;
- runtime draws atlas glyphs as images, never browser-smoothed text;
- dark atlas is used for dialogue/choices/buttons;
- light atlas is retained for any future light-on-dark use;
- nearest-neighbor / hard alpha only.

This locks the *look* while keeping dialogue fully dynamic.

## Runtime v6
The component set is wired into `CYOA_M1_runtime_lab_v6.zip` as a design/runtime lab.

Validated in Chromium using an in-memory/fulfilled-resource harness:
- page errors: **0**;
- 5 stress-test choices render with locked sprites;
- choice scrollbar still uses the locked proportional behavior;
- 7 inventory slots render at 96px with 6px gaps;
- inventory left/right use UP/DOWN sprite swaps;
- utility buttons use UP/DOWN sprite swaps;
- utility labels are bitmap-atlas text;
- speech uses bitmap-atlas typewriter text;
- click-to-complete speech remains;
- speech overflow indicator fades in at x=1899 in the right-rivet gutter;
- completed stress speech produced a 76px overflow thumb in the 128px internal speech track.

## Binary package identity
Local/chat artifact `CYOA_M1_locked_components_v1.zip`:
SHA-256: `58c71b660f87a83400c80d0e75c2037af67827b00e2f4918cff794500050f302`

Local/chat artifact `CYOA_M1_runtime_lab_v6.zip`:
SHA-256: `4e9fb20cbcdc22d31fbcd45547a0bd396b1d7f9638c3579b6367ab1284c76630`

The repo stores the authoritative manifest/spec; binary chat artifacts should not be silently regenerated and treated as equivalent. Match hashes or explicitly version any replacement.

## One still-not-final micro-style
The **player-choice scrollbar thumb artwork** remains a quiet production candidate, not part of the owner's component-art lock. Its geometry/behavior *is* locked: no arrows; full track when no overflow; proportional height/position when overflow; flatter rectangular appearance. Only its final surface art may still receive a minor visual pass.

## PMO rule
From here, M1 UI work should be integration/QA, not re-design. Do not regenerate the static shell, choice frames, inventory slots/arrows, utility button shapes, or selected text style unless a concrete implementation defect requires a surgical correction or the owner explicitly reopens that component.
