# M1 — CANONICAL UI DESIGN CONTRACT
**Status: OWNER LOCK — use this as the ONLY authoritative design spec for all M1 visual mockups.**
**Date:** October 30, 2026
**Applies to:** The Acceptable Error (working title), CYOA interactive-story presentation.
**Scope:** Locked layout, interaction mechanics, and design constraints; NOT final art assets, exact runtime resolution, color palette, character art, or authorization for gameplay implementation.

## Authority and precedence
This replaces contradictory recommendations, diagrams, generated mockups, and lab defaults in M1 notes 07–16, particularly:
- Full-height right rail scrollbar **rejected**; scrollbar is ONLY beside dialogue/choices, begins **under portrait** and ends **above utility buttons**.
- Scrollbar arrows **rejected**; show ONLY proportional draggable/scroll-position thumb/indicator in reserved channel.
- Inventory **page jumps rejected**; each arrow moves ONE item.
- Inventory-slot numbers **rejected**.
- Inventory arrows drawn as ordinary item slots or half-slots **rejected**.
- Any text on decorative frame metal **rejected**.
- Wires/pipes/bolts protruding INTO scene/portrait area **rejected**.
- Narrower portrait due to empty scrollbar gutter or tacked-on UI plaque **rejected**.
- Clean, perfectly symmetrical frames, as well as oversized dirty steampunk frames, **rejected**.
- Location preview/minimap/image in far-right footer **rejected**.
Any future assistant/image/implementation must use THIS document as first reference, then older notes only for historical rationale. Prior designs are still preserved, not deleted, for reference.

## A. Layout lock (hard)
- **Whole game viewport:** exactly 16:9; artwork is NOT a two-panel sheet that adds width beyond the viewport.
- **Upper/main area:** ~90% screen height; **illustrated scene LEFT about 70% of width**, contextual rail RIGHT about 30% width. Main illustrated composition remains roughly 4:3 within its allotted region. Do not silently widen the rail or shrink stage to fit ornament.
- **No top title/header/banner bar.** Thin perimeter framework is allowed and should not steal a meaningful band of height.
- **Bottom footer:** ~10% screen height, with **7-slot inventory and integrated arrow controls at left** (~48% overall width), a **physically distinct short objective housing in middle** (~27%), and **purely decorative machine-frame end-cap at far right** (~25%). The objective and inventory must have a visible gap/joint separating their housings; do not fuse them into one undifferentiated strip.
- **The scene and portrait bounds NEVER move or resize** for dialogue, overflow, item inspection, notes, or location changes.
- **Portrait fills the WHOLE available right-rail interior width** (apart from thin outer-border padding). No right-side strip, scroll-gutter continuation, miniature plaque or bolt panel taking away portrait width.
- **CRITICAL PORTRAIT FRAME PROPORTIONS — OWNER REPEATED CORRECTION:** both LEFT and RIGHT portrait borders must be **equally THIN and simple**. Do not copy, continue, extend, echo, or visually compensate for the scrollbar track that starts BELOW the portrait; the scrollbar and portrait frame are **completely separate constructions**. No thick right-hand column/bulkhead, no big matching vertical tubing/panel, no fake inactive track beside the face. Thin portrait border should be comparable in weight to the thin top/bottom portrait trim, and should preserve almost all available rail width for the character. A practical *mockup comparison* is ~4–8 rendered pixels of border per side in a 1600px wide visual, rather than dozens; exact sprite logical pixels to be decided by art tests.

## B. Right rail — hard interaction rules
- **Portrait** top of right rail: substantial, high-detail independently authored pixel portrait of speaker. Full width, without inset extra modules; no decorative object crosses into image aperture.
- **Dialogue** immediately below portrait; readable multiline English prose.
- **Choices** below dialogue: show ~3 visible at baseline, but allow as many *meaningful* options as authored (no moral-wheel cap). Long entries may wrap; list scrolls, not the portrait or dialogue itself.
- **Scrollbar** is one always-reserved, **narrow vertical mechanical track at the far-right edge of the dialogue/CHOICE region ONLY**, starting strictly **BELOW portrait** and ending strictly **ABOVE the three bottom utility buttons**. It must NOT extend along either portrait OR utility buttons.
- **NO up/down arrows on scrollbar**, top or bottom, in any state. It has one **indicator/thumb only** in its track. Without overflow, a small *centered* idle thumb. With overflow, a thumb whose length represents visible/total scrollable content and whose position accurately follows progress; begins at track top at start. It must look like an in-world manufactured pixel-art control, not a default browser scrollbar. Pointer drag, wheel and keyboard handling can be supported without visible arrow buttons.
- **Scrollbar track space remains reserved even while idle**, so dialogue and choice width NEVER changes when scrolling becomes possible. Crucially, the portrait spans the full rail width *above* this channel; don't reserve the channel beside the portrait.
- **Three small utility buttons** (Inspect / Notes / Journal are examples) sit directly **BENEATH choices**, in a stable row. In item mode their action labels may change, or actions may become visibly disabled according to context. Never move them to inventory strip.
- **No extra title tabs or location/NPC plaques baked into frame.** Genuine functional labels inside content/buttons are allowed.

## C. Bottom strip — hard interaction rules
- **Exactly 7 unnumbered visible item slots**. Low-res crisp item mini-sprites; never slot index numbers.
- Two **small, subdued left/right navigation arrows** are physically integrated into the inventory HOUSING at its far left/far right, **visually different from the item slots**. They must be **noticeably SMALLER than a normal inventory cell** in both icon and clickable-housing outline; prefer little inset mechanical keys, tabs, or rocker glyphs in the existing outer rim. **DO NOT render enormous arrow plates, tall triangular buttons, or half-item cells**. Navigation must remain easy to recognize/click, so a small-looking arrow can have a larger invisible hit target. Both discreet housings remain present even when inactive.
- **Each arrow press slides item viewport by ONE inventory item**, never a 7-item page.
- Selecting a slot **changes right rail to item inspection**, not the illustrated scene. The inspected item gets an independently authored, high-detail pixel-art close-up, analogous to an NPC portrait. Context-sensitive actions can enable/disable; a clear Return restores conversation and choice-scroll state.
- **Objective** is a separate physical inset/panel with concise, useful, context-responsive text and occasional dry satire. Text is narrative UI content, not ornamental frame lettering.
- **Far-right end-cap** is ONLY frame artistry (mechanical asymmetry, misplaced vent, patched panel, instrument with no text, etc.). **No location thumbnails, maps, objective text, labels, or informational widgets.**

## D. In-world frame and pixel-art visual constraints (hard design language)
- **Medium-weight authored pixel-sprite framing**: between the old overly thick brass machinery (too much lost content) and thin clean elegant trim (too little personality). Thin edges around **all image openings**, selective added physical weight at joints/corners/end-cap only.
- **Frames must NEVER impinge on content apertures**: no pipes, cables, clips, bolts, decorative brackets, plants or wires crossing into scene pixels, the portrait, dialogue, or choices. All frame detail lives entirely OUTSIDE the content rectangles. An attached pipe in the top-left scene was an explicit design FAIL.
- **No decorative text anywhere on frame parts**: no serial numbers, witty signage, captions, branding, lettering, warning stickers, stamped words, numerals or faux labels attached to permanent UI hardware. The scenic world itself may have signs; meaningful dialogue/choice/objective/utility labels are allowed on their dedicated content surfaces. Keep those distinct.
- **Specific 'Brazil' off-ness through ENGINEERING, not fake dirt or typography**: reused mounting plates, mismatched screws, a deliberately excessive hinge on a small service panel, inherited layout compromises, rerouted cables outside content windows, odd repairs, irrational seams/vents, apparently unnecessary mechanisms, subtle misalignments of frame *details*—but keep CONTROL placement regular, materials legible and edge apertures precise.
- **1960s-imagined future**, not generic steampunk, sterile futuristic chrome, fantasy frames, or junkyard grime. Civic optimism and absurd institutional logic coexist; functional surface finish, small wear and repairs.
- Different kinds of setting (e.g., actual spacecraft) MAY get a materially different skin, while the exact underlying UI layout, hit areas, and interaction mechanics stay constant. No frame change from one office/corridor/bathroom to another.
- Crisp low-res scene with independently more detailed close-up portraits and inspected items; frame/functional text are sharply authored at a related finer pixel tier, but never vector-clean or blurred. **Exact grid sizes are still OPEN** for real source-art tests.
- **English-only text** in visual mockups. Film *Brazil* refers to the Gilliam movie, **not** the country or Portuguese language.

## E. Mandatory preflight for every future mockup (FAIL / REVISE if ANY item fails)
1. Is the *whole image* a single 16:9 gameplay frame?
2. Is the scene still near 70% of the upper width, right rail near 30%, with no top header?
3. Is the portrait FULL WIDTH with **slender, matched left/right borders** and NO heavy right-side column, fake scrollbar continuation, bezel compensation or unrelated module beside it?
4. Does the scrollbar begin strictly BELOW the portrait in its own entirely independent rail segment, stop above utility buttons, and contain **NO ARROWS**, without influencing the portrait frame thickness?
5. Does the scrollbar have its permanently reserved track and one centered idle / proportional active thumb?
6. Do all 7 slots have **NO numbers**, with **small, subdued, rim-integrated** arrows at both ends, visually MUCH smaller than an item slot (never arrow-shaped item-sized plates)?
7. Is objective separate from inventory, and is far-right end-cap decoration-only?
8. Is there **NO** lettering/numbering on any FRAME/hardware piece?
9. Is the scene/portrait/content aperture completely clear of pipes, cables, bolts or ornamental intrusions?
10. Does the frame have some elegant engineering **absurdity** (not sterile symmetry, not excessive dirt), with **medium thickness**?
11. Are utility buttons positioned under choices, not replaced by ornaments?
12. Do visuals retain consistent crisp pixel-art density tiers and English-only functional text?
13. Is the overall scene-first CYOA presentation preserved (not a walkabout or deck battler)?

If an image generator fails an exact detail, label the result **FAILED VISUAL STUDY** rather than silently treating it as a new approved design. Do not reset rules in future prompts to accommodate a wrong image.

## F. What is genuinely NOT locked
- Final pixel source resolutions, exact numerical frame widths in production, fonts, palette, invented brand/agency identities, final portrait/art, exact scroll thumb tactile styling within the constraints, number of alternate environment skins, and full game narrative.
- Gameplay code, final art production and overall game release schedule await separate authorizations.

## Owner-approved core
The player experiences a 16:9 illustrated CYOA with a ~4:3 scene at left, substantial detailed character/item portraits at right, meaningful variable-depth dialogue, visible seven-slot inventory with one-step arrows, readable small satirical objective, and a functional, reworked institutional device as its frame. **Do not relitigate the structure to generate stylistic variations.**
