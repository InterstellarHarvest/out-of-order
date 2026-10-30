# M1 Frame-only review direction — Owner decision 21
**Date:** 2026-10-30
**Authority:** Owner direction, added to [M1 Canonical UI Contract v1.2](17_M1_CANONICAL_UI_DESIGN_CONTRACT.md).
**Phase:** Frame art exploration, NOT game implementation or final source-asset lock.

The owner does not want more fully composed in-game screens during frame comparison. To avoid being distracted by environment illustration, NPC expression or storytelling copy, the NEXT frame style mockups MUST leave **all gameplay content empty**:
- Main scene and portrait both blank, no sprites, no illustrations;
- NPC speech and response rectangles blank, no game text;
- Seven square inventory slots blank, no item sprites, no slot numbers;
- Objective text body blank;
- ONLY optional functional labels remain, such as **CURRENT OBJECTIVE**, and **INSPECT / NOTES / JOURNAL** or icons on the three footer buttons.

The different variants MUST have *identical* full 16:9 geometry and positions: about 70% scene / 30% story rail, full-width matched portrait and speech rectangles, narrow choice-only scrollbar track with a thumb but NO ARROWS, and bottom inventory LEFT / objective MIDDLE / 3 utilities RIGHT.

## Bottom banner sizing
Treat **inventory-cell side length as the primary height input**. The whole footer is one square cell tall plus a modest upper/lower frame rim and padding. A useful concept test at a 1600×900 full frame is a ~80px square slot and ~100px footer, but these are not production commitments. Do NOT use an arbitrary fixed 10% footer and then distort slots into rectangles or fill surplus space with decorative widgets.

Inventory navigation consists of two SMALL frame-integrated arrows, outside the seven slots, scrolling ONE item per press. Both buttons are visually much smaller than a single slot, yet have accessible interaction bounds in later implementation.

## Frame art emphasis
Explore materially different retro bureaucratic manufactured objects, not generic clean boxes or generic heavy steampunk. Target middle-weight frames: restrained aperture edges and selectively thicker quirky joints, asymmetrical repair plates, redundant safety catches and old committee modifications. No decorative text on the frame apart from functional label components, and no frame pieces intrude upon the blank scene/portrait apertures. If a frame treatment is too smooth, too polished, too tall, too thick, or missing any functional compartment, reject it.

**What to review after images:** thickness balance, pixel density, material/patina, manufactured eccentricity, 7-slot/footer fit, serif/sans/pixel readability of permitted functional labels, and framed portrait/speech alignment. Scene/portrait/game content will be reintroduced only after frame direction is chosen.
