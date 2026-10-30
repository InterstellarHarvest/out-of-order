> **HISTORICAL / SUPERSEDED WHEN CONFLICTING:** Use the [M1 CANONICAL UI DESIGN CONTRACT](17_M1_CANONICAL_UI_DESIGN_CONTRACT.md) for all current geometry, scrollbar, inventory, frame and visual rules. This document is retained to preserve design history; its conflicting instructions are NOT binding.

# M1 — Interaction Decisions 01
**Status:** OWNER-SELECTED interaction behavior for further C+ visual design (not a completed art lock or game implementation).
**Date:** 2026-10-30.
**Preceding documents:** [partial layout lock](11_M1_PARTIAL_LAYOUT_LOCK.md), [behavior tests](12_M1_INTERACTION_STRESS_TESTS.md).

## Decision 1 — Scrollable dialogue without a browser scrollbar
- Conversations may offer as many meaningful response options as the writing requires. There is no artificial Fallout-3-style good/bad/dumb/other limit.
- The **choice list alone** scrolls inside the established right-rail region. The speaker portrait, spoken text, scene, footer and three utility buttons remain anchored.
- The scrollbar is a **custom sprite-built in-world mechanism**: physical rocker/track, arrow controls or similar. Not a native-looking browser scrollbar.
- **Always reserve exactly the same rail width for this mechanism even when no scrolling is required.** Its hardware may be absent/quiet in the idle state, but its *layout slot never collapses*, so choice text never shifts left/right when a fourth choice appears.
- The first visual stress test may show approximately three responses at once and eight available; the *number visible at one time* still needs art/readability validation. A distinguishable position indicator should make additional answers discoverable.
- Support keyboard and pointer interaction in subsequent prototypes; don't make 'invisible scrollbar' equivalent to undiscoverable extra choices.

## Decision 2 — Item inspection uses the right rail and higher detail
- Inventory contains low-resolution recognition sprites for scanning many objects quickly.
- Clicking/selecting one temporarily changes the **right rail** into an item inspection presentation, using **a separately authored, higher-resolution pixel-art illustration of that item**, just as NPCs have a detailed talking portrait.
- The object close-up can reveal funny, unusual or informative physical details not legible in its tiny inventory sprite. An occasional readable background gag in a portrait is similarly welcome. Important progression information must have an accessible path.
- The main scene remains present and anchored. This is not a full-stage modal or pop-up by default.
- Provide a predictable, discoverable Return/Back/close action; restore prior dialogue state and choice scroll on return.
- Item-specific actions can appear only when relevant; this should never become a deckbuilding hand or permanent verb menu.

## Decision 3 — Current objective is reactive and satirical
- The slim persistent objective space can react to player decisions, consequences, bureaucratic mistakes and the current situation.
- It should function as a genuine short-term orientation aid **while sometimes containing dry satire**.
- Do not turn it into a giant quest log, force jokes into dangerous moments, or reveal narrative secrets prematurely.
- The original restroom motive and its deferred satisfaction are useful motifs. Example: 'Find a restroom. Preferably today.' This is illustrative, not mandatory permanent copy.
- Do not automatically update on every NPC line. Update when there is meaningful contextual change.

## Decision 4 — A default UI frame; rare, major-world visual changes
- Establish one **recognizable default physical interface shell** with identical controls, geometry, portrait sizing, scrollbar slot, footer, and input/interaction behaviors across the normal adventure.
- Different buildings, rooms, hallways, and bathrooms **do not** each get a custom frame theme.
- A truly different category of setting, such as going into a **spaceship**, **may** have a materially distinct sprite-built exterior treatment.
- Only change cosmetic materials, engineered frame pieces, typography accents or mood; **never quietly move the buttons, change interaction grammar, widen the rail or shrink the scene**.
- Whether every later outpost warrants a special skin is a content/art budget question. No fixed count of themes is locked.
- Slightly absurd, historically accumulated engineering belongs in the frame as well as the world: over-designed hinges, bad retrofits, unnecessary plates and eccentric controls, rather than just more grime or plaques.

## Unchanged layout for all visual studies
- Complete 16:9 screen; approximately 70% main 4:3-ish scene / 30% contextual rail above; bottom strip inventory, brief objective, **decorative frame end-cap only**.
- No top title banner.
- Full-width speaking portrait on right; story choices; **three small utilities immediately below dialogue choices**.
- English-only visible mockup text. 'Brazil' references the Gilliam movie's bureaucratic absurdity, **not** Portuguese-language setting.
- Frames and controls are **sprite-built, tactile objects**, with internally consistent pixel grids and sharp display at integer scales.
- Do not copy exact copyrighted film/game art or interface pieces.

## Decisions explicitly still open
- Exact number of inventory slots in the strip (seven is a study target, not a lock); paging-arrow artwork and page-vs-smooth-scroll mechanics.
- Exact visible dialogue response count and scroll-track geometry.
- How long documents fit in the rail, exceptional cinematic closeups, and accessibility/readability at multiple screen sizes.
- Exact background/portrait/UI pixel-detail ratios; independently authored art preferred, but numerical resolutions need actual tests.
- Inventory section name; final colors, frame engineering style, final portraits and scenes.
- Which distinct settings deserve a different frame skin, if any, beyond the conceptual spaceship example.

## Next work, no approval checkpoint required
Refine the **existing design-only interface lab** to:
1. Keep the choice list width unchanged between 3-response and 8-response examples;
2. Show an item in the right rail at more detail than its inventory icon;
3. Demonstrate a responsive objective;
4. Expose the default/spacecraft material alternatives while preserving the same physical controls;
5. Exercise 12 inventory items and return/restore.

The lab remains a mockup, **not** production implementation. Later, the owner can review a purposeful frame/material visual study rather than revisit the solved interaction basics.
