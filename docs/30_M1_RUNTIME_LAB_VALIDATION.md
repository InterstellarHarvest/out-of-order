# M1 Runtime Lab Validation + Sprite Contract v1
**Date:** 2026-10-30  
**Status:** Design-only runtime validation. No gameplay implementation authorization.

## Test method
The lab uses the canonical 1920×1080 geometry and the pixel-preserving transparent-aperture shell derivative. Because file:// and localhost navigation are blocked in this environment, Chromium loaded the exact HTML in-memory with the shell embedded as a data image.

## Passed behavior checks
- JavaScript page errors: **0**.
- Choice viewport rendered exactly **548×348** at x1314 y522.
- Inventory right press moved the strip exactly **-102 px**, proving one-slot movement.
- Choice pointer press produced exactly a **3 px right / 3 px down** temporary transform.
- Long NPC placeholder speech overflowed the fixed speech text region and caused the subtle internal overflow indicator to appear.
- With overflowing choices, the choice thumb shrank proportionally.
- With a compact three-card scenario fitting inside the viewport, the thumb filled the full usable track.

## Typography finding
The generic monospace used for the test is **not** a final font. At 22 px display / 26 px line height, some deliberately long sample copy wrapped more than its nominal line class. This is a font-metrics issue, not a geometry failure.

Do **not** change the 548×348 choice geometry to fit a placeholder font. The next typography pass should choose a readable condensed/pixel-appropriate type treatment and validate safe insets inside the locked card sizes.

## Current lab artifacts
- CYOA_M1_runtime_lab_v4.zip — offline design lab delivered in chat.
- Screenshot and component prep bundle delivered in chat.
- The repo stores the geometry/state contract but not these binary chat artifacts.

## Machine-readable sprite contract
See design/ui_sprite_contract_v1.json.

## Next autonomous work
1. Use a condensed readable metric surrogate to establish text-safe padding and minimum type size without changing geometry.
2. Produce final sprite canvas specifications and 9-slice/cap rules.
3. Prepare art briefs for rivet-free choice cards, one inventory slot, physical arrow button states, generic utility button states, choice scrollbar thumb, and NPC speech overflow thumb.
4. Stop for owner review only when the typography/art treatment becomes a genuinely visual choice rather than a technical constraint.