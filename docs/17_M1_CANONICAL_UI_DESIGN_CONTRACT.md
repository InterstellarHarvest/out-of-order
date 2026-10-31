# M1 — CANONICAL UI DESIGN CONTRACT
**Status: OWNER LOCK — use this as the ONLY authoritative design spec for all M1 visual mockups.**
**Date:** October 30, 2026 · **Revision: v1.2 — frame-only mockups and square-slot footer sizing**
**Applies to:** The Acceptable Error (working title), CYOA interactive-story presentation.
**Scope:** Locked layout, interaction mechanics, and design constraints; NOT final art assets, exact runtime resolution, color palette, character art, or authorization for gameplay implementation.

## Authority and precedence
This replaces contradictory recommendations, diagrams, generated mockups, and lab defaults in M1 notes 07–19, particularly:
- Full-height right rail scrollbar **rejected**; scrollbar is ONLY beside the CHOICES, begins strictly **below the full-width speech box**, and ends at the bottom of the right-rail choice area; the three utility buttons have moved to the FOOTER. Scroll hardware has no relationship to portrait or speech-frame width.
- Scrollbar arrows **rejected**; show ONLY proportional draggable/scroll-position thumb/indicator in reserved channel.
- Inventory **page jumps rejected**; each arrow moves ONE item.
- Inventory-slot numbers **rejected**.
- Inventory arrows drawn as ordinary item slots or half-slots **rejected**.
- Any text on decorative frame metal **rejected**.
- Wires/pipes/bolts protruding INTO scene/portrait area **rejected**.
- Narrower portrait due to empty scrollbar gutter or tacked-on UI plaque **rejected**.
- Clean, perfectly symmetrical frames, as well as oversized dirty steampunk frames, **rejected**.
- Location preview/minimap/image in far-right footer **rejected**; **far-right footer now contains the three utility buttons**, not a decorative-only end-cap. Utility placement beneath the dialogue choices is SUPERSEDED by this revision.
- Textured, nested inventory "frame within a frame" is rejected; show **seven direct square inset slots** inside a slim housing.
- Different-width speech and portrait boxes are rejected; both must span the **same full available right-rail width**; choice scrollbar begins below speech.
- Dark/cool dialogue versus warmer highlighted player responses may distinguish who is speaking. Exact colors are not locked.
Any future assistant/image/implementation must use THIS document as first reference, then older notes only for historical rationale. Prior designs are still preserved, not deleted, for reference.

## A. Layout lock (hard)
- **Whole game viewport:** exactly 16:9; artwork is NOT a two-panel sheet that adds width beyond the viewport.
- **Upper/main area:** ~90% screen height; **illustrated scene LEFT about 70% of width**, contextual rail RIGHT about 30% width. Main illustrated composition remains roughly 4:3 within its allotted region. Do not silently widen the rail or shrink stage to fit ornament.
- **No top title/header/banner bar.** Thin perimeter framework is allowed and should not steal a meaningful band of height.
- **Bottom footer:** HEIGHT IS SET BY THE HEIGHT OF ONE SQUARE INVENTORY SLOT PLUS PHYSICAL FRAME BEZELS/PADDING, not by a free-standing arbitrary percentage; ~10–12% is an output, not a target. LEFT: a **compact seven-slot inventory** with integrated small one-item arrows (start by testing ~40–44% of overall width). MIDDLE: a **physically separate, wider objective panel** (~33–36%), with a functional 'CURRENT OBJECTIVE' label built as a replaceable plaque/content layer. RIGHT: **three utility/action buttons** (~18–23%); no separate decorative-only end-cap or location thumbnail. Visible seams/gaps distinguish the three housings. These are *study* widths, not pixel-locked runtime proportions; do not steal height or widen the rail to fit them.
- **The scene and portrait bounds NEVER move or resize** for dialogue, overflow, item inspection, notes, or location changes.
- **Portrait and immediately following SPEECH BOX both fill the SAME full available right-rail interior width** (apart from thin outer-border padding). No right-side strip, scroll gutter, miniature plaque or bolt panel taking away portrait or speech width. ONLY the choice list, below speech, reserves space for the scroll indicator.
- **CRITICAL PORTRAIT FRAME PROPORTIONS — OWNER REPEATED CORRECTION:** both LEFT and RIGHT portrait borders must be **equally THIN and simple**. Do not copy, continue, extend, echo, or visually compensate for the scrollbar track that starts BELOW the portrait; the scrollbar and portrait frame are **completely separate constructions**. No thick right-hand column/bulkhead, no big matching vertical tubing/panel, no fake inactive track beside the face. Thin portrait border should be comparable in weight to the thin top/bottom portrait trim, and should preserve almost all available rail width for the character. A practical *mockup comparison* is ~4–8 rendered pixels of border per side in a 1600px wide visual, rather than dozens; exact sprite logical pixels to be decided by art tests.

## B. Right rail — hard interaction rules
- **Portrait** top of right rail: substantial, high-detail independently authored pixel portrait of speaker. Full width, without inset extra modules; no decorative object crosses into image aperture.
- **Dialogue/speaker speech** immediately below portrait; its rectangular panel is **the same width as the portrait aperture** and is readable multiline English prose. It does not have a scroll-gutter alongside it. This treatment was demonstrated by the user's older screenshot and overrides generated alternatives.
- **Choices** below dialogue: show ~3–4 visible at baseline as space allows, but allow as many *meaningful* options as authored (no moral-wheel cap). Only the choices scroll. NPC speech and player responses should be perceptually distinct using separate colors/panel treatments, with selected replies visibly differentiated; exact colors remain open.
- **Scrollbar** is one always-reserved **narrow vertical mechanical track at the far-right edge of the CHOICES ONLY**, starting strictly **BELOW the full-width dialogue/speech box**, running alongside the response list and stopping at the bottom of that choice region, above the global footer. It must NOT extend beside the portrait, speech box or footer utility buttons.
- **NO up/down arrows on scrollbar**, top or bottom, in any state. It has one **indicator/thumb only** in its track. Without overflow, a small *centered* idle thumb. With overflow, a thumb whose length represents visible/total scrollable content and whose position accurately follows progress; begins at track top at start. It must look like an in-world manufactured pixel-art control, not a default browser scrollbar. Pointer drag, wheel and keyboard handling can be supported without visible arrow buttons.
- **Scrollbar track space remains reserved even while idle**, so CHOICE width NEVER changes when scrolling becomes possible. Crucially, **BOTH portrait AND speech box span the full right-rail width** above this channel; do not reserve an inactive scroll channel beside either of them.
- **Three small utility buttons** (Inspect / Notes / Journal are examples) have been MOVED INTO THE **BOTTOM-RIGHT FOOTER**, to reclaim more right-rail height for dialogue and choices. They remain stable and individually recognizable; in item mode their labels/actions may change or become visibly disabled. Do not place them beneath the scrolling choices, and do not put them into any inventory cell.
- **No extra title tabs or location/NPC plaques baked into frame.** Genuine functional labels inside content/buttons are allowed.

## C. Bottom strip — hard interaction rules
- **Exactly 7 unnumbered visible SQUARE item slots**. These square cells set the working footer height; allow a slim upper/lower rim but no tall surplus hardware. Compact, with crisp lower-resolution item mini-sprites; never slot index numbers. Seven directly inset square boxes belong to a single simple inventory housing—**no ornate second frame around the slots and no stretched/tall inventory band**.
- Two **small, subdued left/right navigation arrows** are physically integrated into the inventory HOUSING at its far left/far right, **visually different from the item slots**. They must be **noticeably SMALLER than a normal inventory cell** in both icon and clickable-housing outline; prefer little inset mechanical keys, tabs, or rocker glyphs in the existing outer rim. **DO NOT render enormous arrow plates, tall triangular buttons, or half-item cells**. Navigation must remain easy to recognize/click, so a small-looking arrow can have a larger invisible hit target. Both discreet housings remain present even when inactive.
- **Each arrow press slides item viewport by ONE inventory item**, never a 7-item page.
- Selecting a slot **changes right rail to item inspection**, not the illustrated scene. The inspected item gets an independently authored, high-detail pixel-art close-up, analogous to an NPC portrait. Context-sensitive actions can enable/disable; a clear Return restores conversation and choice-scroll state.
- **Objective** is a separate physical inset/panel in the FOOTER MIDDLE, with concise, useful, context-responsive text and occasional dry satire. The functional **CURRENT OBJECTIVE** label may look like a little physical frame plaque but must be dynamically replaceable UI text, not hardcoded decorative lettering. This is an explicit exception to the no-frame-words rule for a **functional label only**.
- **Footer RIGHT is the three functional utility/action buttons**, replacing the previously decorative-only end-cap. Their shared frame may have character in its margins, but must not show a location thumbnail, map or extraneous status modules. The rest of the frame can express idle eccentricity at corners and joints without occupying a dedicated large footer block.

## D. In-world frame and pixel-art visual constraints (hard design language)
- **Medium-weight authored pixel-sprite framing**: between the old overly thick brass machinery (too much lost content) and thin clean elegant trim (too little personality). Thin edges around **all image openings**, selective added physical weight at joints/corners/end-cap only.
- **Frames must NEVER impinge on content apertures**: no pipes, cables, clips, bolts, decorative brackets, plants or wires crossing into scene pixels, the portrait, dialogue, or choices. All frame detail lives entirely OUTSIDE the content rectangles. An attached pipe in the top-left scene was an explicit design FAIL.
- **No decorative text anywhere on frame parts**: no serial numbers, witty signage, captions, branding, lettering, warning stickers, stamped words, numerals or faux labels on permanent trim. The one **functional objective title plaque** ('CURRENT OBJECTIVE') may be physically mounted as a replaceable LABEL element; it is not visual flavor text. The scenic world itself may have signs; meaningful dialogue, choice and utility labels are allowed on their dedicated surfaces.
- **NO RANDOM-JUNK VARIATIONS:** owner rejected the excessive multi-colored plate/vent/bolt collage. Keep large coherent sections of fabricated frame material, choose only a handful of logically placed repair/retrofit features, and derive palette/color from material construction. Refer to [Older Frame Style Reset](23_M1_RETURN_TO_OLDER_FRAME_STYLES.md).\n- **Specific 'Brazil' off-ness through ENGINEERING, not fake dirt or typography**: reused mounting plates, mismatched screws, a deliberately excessive hinge on a small service panel, inherited layout compromises, rerouted cables outside content windows, odd repairs, irrational seams/vents, apparently unnecessary mechanisms, subtle misalignments of frame *details*—but keep CONTROL placement regular, materials legible and edge apertures precise.
- **1960s-imagined future**, not generic steampunk, sterile futuristic chrome, fantasy frames, or junkyard grime. Civic optimism and absurd institutional logic coexist; functional surface finish, small wear and repairs.
- Different kinds of setting (e.g., actual spacecraft) MAY get a materially different skin, while the exact underlying UI layout, hit areas, and interaction mechanics stay constant. No frame change from one office/corridor/bathroom to another.
- Crisp low-res scene with independently more detailed close-up portraits and inspected items; frame/functional text are sharply authored at a related finer pixel tier, but never vector-clean or blurred. **Exact grid sizes are still OPEN** for real source-art tests.
- **English-only text** in visual mockups. Film *Brazil* refers to the Gilliam movie, **not** the country or Portuguese language.

## D2. M1 FRAME-ONLY VISUAL STUDY MODE (OWNER-SELECTED, mandatory until superseded)
For subsequent frame-design mockups, **DO NOT populate the scene, NPC portrait, item inventory, dialogue or choices** with game images, NPC sprites, prop icons, fake game text, signage, speeches, or narrative content. Keep all these apertures as deliberate empty neutral placeholders to isolate the **authored pixel-art hardware around them**. 
- Scene = empty rectangular matte; portrait = empty rectangular matte (no character head); item slots = seven EMPTY squares; dialogue and choice surfaces = empty rectangles; objective body = EMPTY.
- The only permitted visible text is functional UI labeling: a small **CURRENT OBJECTIVE** label and the 3 utility buttons (e.g. INSPECT, NOTES, JOURNAL), optionally icons instead of/in addition to labels. No debug annotations or explanatory heading inside the 16:9 frame. If making a comparison sheet, variant names belong OUTSIDE the individual 16:9 game frames.
- Keep an identical underlying geometry in all variant studies. Change only the way the **sprite-built frame hardware** is colored, aged, manufactured, repaired, sculpted and assembled.
- **Footer height rule:** the square inventory cell defines usable footer height; frame top/bottom rim and padding are minimal additions. For one 1600×900 concept example, a ~80px square cell plus ~20px combined physical enclosure gives ~100px (11.1%) footer. This is illustrative, not a final art/screen-resolution lock. Any changed slot size must propagate to all footer components, not leave a random empty band.
- Portrait and speech still each fill the full right-rail width; only the choices reserve a narrow non-arrow scrollbar track below speech. The 3 utility controls remain in footer right. Each inventory arrow stays a tiny separate inset in the shared inventory housing, not an eighth cell.
- Preserve moderately imperfect Brazil-like 1960s bureaucratic hardware; do NOT compensate for blank game content by adding screens, gauges, random ornaments, labels, character silhouettes or simulated objects INSIDE empty apertures. The point of this round is FRAME PIXEL ART only.

## E. Mandatory preflight for every future mockup (FAIL / REVISE if ANY item fails)
1. Is the *whole image* a single 16:9 gameplay frame?
2. Is the scene still near 70% of the upper width, right rail near 30%, with no top header?
3. Is the portrait FULL WIDTH with **slender, matched left/right borders** and NO heavy right-side column, fake scrollbar continuation, bezel compensation or unrelated module beside it?
4. Do BOTH portrait and speech box span the **same full width**, and does the scrollbar begin ONLY below the speech box, beside choices (never portrait or speech), with **NO ARROWS**?
5. Does the choice scrollbar have its permanently reserved track and one centered idle / proportional active thumb, without moving reply widths?
6. Are there exactly **7 compact SQUARE, unnumbered slots** in one housing, with no nested frame and tiny, separate one-item arrow controls at the ends?
7. Is inventory LEFT, separate current-objective panel MIDDLE with functional plaque, and **three utility buttons FOOTER RIGHT** (no decorative-only end-cap)?
8. Is there **NO** lettering/numbering on any FRAME/hardware piece?
9. Is the scene/portrait/content aperture completely clear of pipes, cables, bolts or ornamental intrusions?
10. Does the frame have some elegant engineering **absurdity** (not sterile symmetry, not excessive dirt), with **medium thickness**?
11. Are all three utility buttons in the BOTTOM-RIGHT footer, **not beneath choices**, while the increased choice area remains scrollable?
12. Do visuals retain consistent crisp pixel-art density tiers and English-only functional text?
13. Is the overall scene-first CYOA presentation preserved (not a walkabout or deck battler)?
14. In FRAME-ONLY studies, are scene, portrait, dialogue, choices, item squares and objective body completely EMPTY, with only functional objective/utility labels?
15. Does the footer height follow one SQUARE inventory slot plus minimal frame padding, rather than a tall arbitrary bottom band?

If an image generator fails an exact detail, label the result **FAILED VISUAL STUDY** rather than silently treating it as a new approved design. Do not reset rules in future prompts to accommodate a wrong image.

## E2. Owner's preferred frame style blend — 2026-10-30
For future M1 visual mockups, use **A / Civic Enamel** from the older-style-reset round as the predominant and defining hardware/material design. Use **B / Institutional Hardware** only for the **spoken-dialogue cream inset panel directly below the portrait**: comparatively simple flat institutional inset, tiny corner rivets, restrained bordering, minimal ornamental bevel. Do NOT bring B's surrounding scroller or body frame. Keep portrait and speech both full-width; choice-only scroll rail begins below the speech box. Keep the entire frame-only blank-content comparison rule. See [owner selection 24](24_M1_A_BASE_B_DIALOGUE_SELECTION.md).

## E3. Owner final frame candidate — authoritative visual reference
As of 2026-10-30, the owner-supplied `layout final.png` is the authoritative M1 frame/layout image. Dimensions **1672×941**; SHA-256 **f5d2fb6672f9fdb4d2991a620f73de61485492c463364d8dd46f978ad55c359b**. Do not regenerate the frame for small revisions; preserve this composition and edit surgically only when owner requests. See [doc 25](25_M1_OWNER_FINAL_FRAME_AND_DIALOGUE_CHOICES.md).

## E4. Locked dialogue sizing and dynamic UI asset rules — 2026-10-30
- Player-choice viewport fits **three 2-line choices** without scrolling; 1/2/3/4-line response cards vary in height and never shrink the font to fit.
- Player-choice cards have **no rivets**; NPC speech panel retains its rivets.
- Choice hover does not move; click/press shifts the card subtly right/down.
- Player-choice scroll thumb fills the entire track when no overflow and shrinks/positions proportionally when overflow exists; track is shell art, thumb is capped/stretchable, **no arrows**.
- NPC speech uses typewriter reveal; click/tap finishes current reveal instantly. Overflow gets a small dark rounded thumb fading in inside the speech box between the right-side rivets.
- Inventory uses **one slot sprite only**. Left/right arrow controls require distinct chunky pressed-state art and move the visible inventory by one item; inventory row slides with restrained weight/settle.
- Utility buttons use the same chunky press-down physical language, preferably one generic sprite family with code labels.
See [M1 UI Assetization and Runtime Interaction Prep](26_M1_UI_ASSETIZATION_AND_RUNTIME_PREP.md).

## F. What is genuinely NOT locked
- Final pixel source resolutions, exact numerical frame widths in production, fonts, palette, invented brand/agency identities, final portrait/art, exact scroll thumb tactile styling within the constraints, number of alternate environment skins, and full game narrative.
- Gameplay code, final art production and overall game release schedule await separate authorizations.

## Owner-approved core
The player experiences a 16:9 illustrated CYOA with a ~4:3 scene at left, substantial detailed character/item portraits at right, matching **full-width portrait and full-width speech box** followed by only-the-choices scrollable replies; the footer has compact **seven-square-slot inventory LEFT**, a separately framed, reactive objective MIDDLE, and **three utility buttons RIGHT**, plus a functional, reworked institutional device as the frame. **Do not relitigate the structure to generate stylistic variations.**
