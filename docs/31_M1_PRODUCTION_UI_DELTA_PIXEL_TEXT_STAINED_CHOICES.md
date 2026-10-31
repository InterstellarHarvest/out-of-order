# M1 Production UI Delta 31 — Pixel text, stained choices, speech gutter, spaced inventory
**Date:** 2026-10-31  
**Status:** OWNER-SELECTED production-prep decisions. Does not reopen the frame/layout.

## Locks
1. **Condensed institutional text direction selected.** All runtime/code text must look like crisp chunky pixel text: no smoothed browser-font appearance, no subpixel placement. Render on the logical grid and upscale nearest-neighbor; if live font rasterization is used, threshold/quantize alpha or otherwise guarantee hard pixel edges.
2. **NPC speech overflow indicator moves farther right into the dedicated gutter BETWEEN the two right-side speech-panel rivets.** It must not sit in the text column. On the 1920×1080 master, the right rivet bodies occupy about x1897–1908 at top/bottom, so the indicator should use the same narrow x-band between them vertically (candidate x1899–1906), with text padded left of that gutter.
3. **Player choice cards remain sprites, not generic CSS panels.** Rivets are removed from choices but retained on the NPC speech box. Each of the 1/2/3/4-line heights gets **three subtle surface variants A/B/C**, using restrained different stains/wear based on the approved mockup. Silhouette, padding, border, dimensions and states remain identical. Variant assignment should be stable/deterministic for a choice and avoid obvious same-variant repetition where practical.
4. **Seven inventory slots remain the target.** The owner permits six if spacing genuinely requires it, but measurement shows seven fit cleanly in the fixed lane, so no reduction is needed now. Production candidate: **96×96 display px slots with 6px visible gaps**, pitch 102px; at the 960×540 logical grid: 48×48 slots, 3px gaps, 51px pitch. Seven slots + six gaps consume 708px, fitting the ~714px fixed lane with a few pixels of margin.
5. Inventory continues to use **one slot sprite only**; variation comes from item art, not slot grime. The runtime lab's previous gap=0 is superseded.
6. Inventory and utility press states remain chunky, physical pushed-in states; hover never moves them.
7. The authoritative 1920×1080 frame source remains immutable. These are component/runtime changes only.

## Next autonomous work
- Update runtime lab to v5 with 7 spaced sprite slots, speech thumb in rivet gutter, stained choice-sprite variants, and hard-edged pixel-text rendering.
- Produce a component-only review sheet; do not regenerate the whole frame.
- Update sprite contract and geometry metadata.
- Continue until a genuinely subjective visual choice remains.
