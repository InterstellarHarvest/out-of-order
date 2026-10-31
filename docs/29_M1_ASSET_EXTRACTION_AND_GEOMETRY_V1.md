# M1 Asset Extraction and Geometry v1
**Date:** 2026-10-30  
**Status:** Production-prep geometry derived from the owner-approved 1920×1080 source. No source pixels modified.

## Canonical source
layout final(1).png — 1920×1080 RGBA  
SHA-256: 374d83a217c0b9ec1d682ac9b464be9a870bb131384c35300eced9b8a67014b3

The owner master remains immutable.

## Non-destructive shell derivative
A separate local/chat artifact CYOA_M1_ui_shell_magenta_transparent_v1.png was produced by changing only magenta-key pixels (R>=220, B>=220, G<=70, alpha>0) to alpha 0 while preserving RGB.

- 1,152,881 intended magenta pixels changed to transparent.
- 0 unexpected pixel changes outside that rule.

This derivative does not yet neutralize baked choice cards or inventory slots.

## Player-choice production geometry
- runtime choice zone: x1314 y522 w548 h348
- card width: 548 px
- inter-card gap: 12 px
- 1-line card: 80 px
- 2-line card: 108 px
- 3-line card: 136 px
- 4-line card: 164 px

Fit check: 3 × 108 + 2 × 12 = 348 exactly.

At the 960×540 logical UI grid: width 274, gap 6, heights 40 / 54 / 68 / 82.

This is implementation-prep geometry. Final font/line-height must still be validated inside these boxes.

## Inventory geometry
The seven current inventory interiors sit on approximately a 102 px display-pixel pitch. Use one reusable square slot sprite and place seven instances. At the 960×540 logical grid, target a 51 px pitch.

## Pixel-preserving runtime approach
Do not destructively repaint the authoritative frame merely to remove baked dynamic pieces. Prefer neutral backing layers over the choice and inventory interiors at runtime, then place reusable sprites above them. Any later cleaned production shell must be a new derivative and pass a pixel-diff audit.

## Exact reference crops
Coordinates and SHA-256 hashes for the current speech panel, three current choices, scrollbar, inventory slot/arrows, objective, and utility buttons are stored in design/ui_asset_extraction_manifest_v1.json.

## Next tasks — no owner decision required yet
1. Typography test using the 548×108 standard 2-line card and 609×191 NPC speech-panel reference.
2. Determine text-safe insets and type size at the 960×540 logical grid.
3. Design rivet-free choice-card sprites at 40/54/68/82 logical px heights.
4. Design one clean square inventory slot.
5. Create left/right inventory and generic utility button state sheets.
6. Create capped/stretchable choice-scroll thumb and small NPC-speech overflow thumb.
7. Reconstruct a runtime mockup from shell + components and compare against the authoritative master for drift.