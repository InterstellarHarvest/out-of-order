# M1 Precision Correction — portrait border and inventory arrow sizing
Date: 2026-10-30
Status: Owner-locked corrections; no new layout or styling decisions.

## A. Portrait border is NOT a continuation of the scroller
- **Left and right portrait frame sides are symmetrical and THIN.** The user likes the portrait to fill almost the entire width.
- **Scrollbar hardware is completely irrelevant to portrait frame proportions**: its rail begins only BELOW the portrait and ends ABOVE the utility row; it must not extend or visually repeat beside the portrait.
- No thick vertical metal slab adjacent to the portrait on either side; no fake scrollbar track above the scrolling area; no structural 'compensation' for the track under it.
- For a 1600×900 mockup, test side trim only about 4–8 finished display pixels per edge instead of a 20–40px machine bulkhead. This is visual guidance, **not** a locked final logical-sprite resolution.
- Both side borders should look materially matched, without adding a large symmetrical machine column on each side merely to satisfy symmetry.

## B. Inventory arrows deliberately discreet
- Seven unnumbered item cells **own the width** of the inventory strip.
- Left/right navigation are **small, mechanically integrated inset arrow tabs/rockers** within the housing outside the seven slots.
- **Arrow face and visible button surround must look significantly smaller than a slot**. Not a half-slot, full-height brass arrow panel, large chevron-shaped area, or an eighth/ninth slot.
- Functional hit targets can be larger than the sprite outlines for accessibility; visual restraint is not a reason for difficult interaction.
- Each press moves the visible inventory by exactly **one item**.
- At boundaries, control remains in housing but subdued/disabled.

## Unchanged
One true 16:9 game frame; 70/30 upper split; approximately 4:3 left scene; medium-weight, visibly bureaucratically strange frame outside all scene/portrait apertures; no decorative frame text; one custom scrollbar thumb without arrows only beside dialogue/choices; three functional utility buttons beneath choices; seven inventory slots; separate current-objective housing; static, purely decorative lower-right end-cap; English-only UI text; crisp 16-to-32-bit-inspired pixel density tiers.

## Image QA rule
The next rendered image **fails** if the portrait's right side is bulkier than the left to match the lower scrollbar, or if inventory arrows read at a glance as mini item-slot panels rather than little frame controls. Stop presenting structurally failed visual variations as approved references.
