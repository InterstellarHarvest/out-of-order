# Fit and scale notes

Measured from `layout-final.png` (blob `bd28ac18b210…`) by `scripts/measure_shell.py`. Re-measured 2026-11-08 after the owner's top-frame pixel fix: every figure is identical to the previous shell (blob `1849c8ec192c…`). All rectangles are x, y, width, height in shell pixels. Everything under "Proposed" is unapproved.

The figures in `docs/28` and `docs/29` came from an earlier source PNG with a different hash, so they differ slightly from these.

## Measured shell regions

| Region | Bounds | Notes |
|---|---|---|
| Scene aperture | 32, 44, 1255×822 | Transparent |
| Portrait aperture | 1333, 44, 564×278 | Transparent |
| Speech panel | 1316, 344, 598×176 | Parchment 1323, 349, 586×167. No rivets on this shell. |
| Choice panel | 1316, 525, 548×338 | Free vertical band y521–875 (355px) |
| Track channel | 1878, 536, 23×316 | Full width only on rows 542–845; chamfered at both ends |
| Track housing | x1872–1906 | 35px wide, including both metal rails |
| Inventory bay floor | 23, 920, 814×126 | Clear of all corner plates: 70, 921, 731×123 |
| Objective plaque opening | 884, 897, 273×38 | Narrowest across the text rows |
| Objective panel | 859, 943, 582×103 | Clear area below the plaque |
| Utility bay floor | 1472, 918, 426×138 | Widest clear band 114 high: 1474, 930, 421×114 |

## Native size against display size

| Asset | Native | Available | Fits natively? | Proposed display | Scale |
|---|---|---|---|---|---|
| Utility buttons ×3 | 243×205 each, 729 wide | 421×114 band, 138 high at most | **No.** 173% of the width, 149% of the height | 135×114 | 0.5556 |
| Inventory arrows with 7 slots | 83×128 each, 874 wide in all | 814 wide | **No.** 60px too wide | 52×80 | 0.625 |
| Inventory arrows with 6 slots | 83×128 each, 772 wide in all | 814 wide | **Yes** | 83×128 | 1 |
| Scrollbar thumb | 40 wide | 23 channel, 35 housing | **No.** Wider than the whole housing | 20 wide, 10px caps | 0.5 |
| Inventory slots ×7 | 96×96, 708 wide | 731 clear | Yes | 96×96 | 1 |
| Inventory slots ×6 | 96×96, 606 wide | 731 clear | Yes | 96×96 | 1 |
| Choice cards, three 2-line | 548 wide, 348 high | Panel 548×338, free band 355 | Yes, with overhang | 548×348 | 1 |

The original PNGs are unchanged in every case. Scaling is done at display time with smoothing off. Both comparison sizes are one click away under **Compare and demonstrate**.

Screenshots: `qa/screenshots/06_seven_slots_native_arrows_overlap.png`, `05_six_slots_native_arrows.png`, `07_native_utility_and_thumb_overflow.png`, `08_utility_half_scale_alternative.png`.

## Scaling concerns

- **No uniform scale gives whole-pixel sizes.** 243×205 and 83×128 share no common factor, so every display size below native rounds. The aspect error is under 0.5% for the proposed sizes, but no proposal is a clean ratio of the art.
- **Utility buttons at 0.5556 are the biggest visual risk.** Nearest-neighbour keeps five columns of every nine, so the one-pixel highlights and rust flecks on the rim thin out unevenly. Check them at 1:1. The 0.5 alternative (122×103) drops pixels at a steady rhythm, but leaves the buttons smaller in the bay.
- **Arrows at 0.625** keep the triangle and plate clean, and the soft cast shadow turns slightly stepped.
- **The thumb at 0.5** is the safest case. Its width is an exact half, and the caps come to exactly 10px because each cap has one empty row, which the lab skips when drawing.
- **Cross-browser:** Chromium and Firefox agree within one colour level across the frame. The thumb is drawn with explicit pixel-centre sampling to achieve this.

## Open items

These stay open. Live Tuning exists so the owner can explore them directly, so none needs an answer before experimenting. The baseline values are starting points only.

1. **Six or seven slots.** Seven is the baseline, but six is the only arrangement where the V5 arrows stay at native size. Six also leaves the approved slot unresized. Compare `01_default_seven_slots_fit.png` with `05_six_slots_native_arrows.png`.
2. **Arrow size.** If seven slots stay, accept 52×80 (0.625), or commission arrows drawn for that size. The native arrows are 128 tall against a 126 floor, so with six slots the faint outer rows of their shadow still cross the bay's lower edge by 4px. The proposed y of 922 is a compromise between the top-left corner plate and centring on the slots.
3. **Utility button scale.** Accept 135×114 (0.5556), or 122×103 (0.5), or commission smaller art. Native size is not an option for three buttons: fewer than two fit between the bay's left edge and the edge of the stage.
4. **Thumb scale.** Accept the 20px fit, or the native 40px, which covers both rails of the track and overhangs them by 2–3px on each side.
5. **Choice card overhang.** Three 2-line cards need 348px and the panel is 338px, so the cards cover the panel's frame and overhang it by 3px above and 7px below. They stay clear of the speech panel and the frame strip. An overflowing list also cuts its last card at y870, in the dark gap below the panel. Moving to x1316 aligns the cards with the measured panel; earlier work used x1314.
6. **Choice press at the edge.** A pressed card at the viewport edge moves its visible portion 3px past the viewport with it, into the dark gap. Confirm this looks right.
7. **Utility press travel.** The V5 DOWN sprites have the same outline as UP, so the art itself does not travel. The label moves +2, +2 as a lab default, adjustable under the Utility group. Doc 39's "shared pressed transform" could also mean moving the sprite; the brief says only the sprite swap and label move, so that is what is built.
8. **Left arrow travel direction.** The V5 left arrow is a mirror of the right, so its DOWN state travels left and down (-2, +3 native) and its shadow falls left. Every other control presses right and down. Doc 39 asks for right and down. This is approved art and was not changed.
9. **Speech indicator.** The package has no sprite for it, so it is a code-drawn placeholder in the x1899–1906 gutter. The docs place it "between the rivets", but this shell has no rivets on the speech panel. Decide whether it needs art.
10. **Inventory row position.** The row sits at x76, y935, centred in the measured bay. Earlier assemblies used x75, y932.
11. **Promotion and contract.** The V5 entries in `design/m1_sprite_manifest.json` still read `CANDIDATE`, as doc 43 intends. Once geometry is accepted, `design/ui_component_geometry_proposed_v2.json` can become a real v2 contract by explicit owner approval.

## Placeholder content

Slot item names, choices, NPC speech and the objective body are sample text for this lab. Item names exist only to make the one-slot shift visible; the docs say slots are unnumbered, and no item art exists yet.
