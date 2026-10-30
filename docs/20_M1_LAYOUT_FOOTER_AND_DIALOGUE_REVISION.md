# M1 Layout Decision Amendment 20 — Owner comparison of variants 1–3
**Date:** October 30, 2026
**Authority:** explicit owner revision to the [single canonical M1 contract](17_M1_CANONICAL_UI_DESIGN_CONTRACT.md); historical ideas remain in older notes but do NOT override that contract.

## What won from the owner's comparison
- **Variant 1 wins for the overall scene/portrait arrangement**. Variant 3 fails established geometry; do not use its organization.
- Footer combination: **inventory LEFT**, **contextual objective MIDDLE**, **three utilities BOTTOM RIGHT**. Variant 1's earlier footer order is superseded and Variant 2's inventory was too large. The bottom right formerly used for decorative hardware is now occupied by the three functional buttons.
- Inventory visual style: **Variant 2's clean individual square recesses**, but **smaller scale like Variant 1** and without the extra inventory 'frame within a frame'. Keep **seven visible square cells** with tiny, discreet frame-integrated sliding arrows outside the cells. Each arrow press shifts the window **one** inventory item.
- Portrait and the following speech box must be **identical full widths** with slim symmetrical side borders; **scrollbar begins below speech**, next to **choices alone**, and never runs next to portrait or speech. It uses one mechanical proportional thumb, no arrow buttons, reserved width.
- The three utility buttons move to the **bottom-right footer**, leaving more vertical space for substantive NPC dialogue and meaningful choices; actions can change or disable during item inspection.
- Dialogue and player replies use **distinct color/box treatments**, rather than a column of identical areas. Avoid hard-coded good/bad/dumb response counts; choice list may scroll as deep as the writing requires.
- The prior attached older screenshot is a **layout/interaction reference, NOT a request to reproduce the frame art, color or scrollbar-arrow elements**.
- Make **CURRENT OBJECTIVE** a functional framed label or removable plaque on the objective housing (small visible exception to no decorative frame lettering). The objective itself remains short, responsive and occasionally satirical.
- Preserve 16:9 complete frame, 70/30 main split, no top title band, no decorative frame writing or moving-feature distractors, 1960s pseudo-future Brazil-like irrational repairs, cohesive scene/portrait/frame logical pixel tiers.

## Corrected schematic (not production-resolution-locked)
```text
┌────────────────────────── 16:9 viewport ────────────────────────────┐
│                                    ┌──────── PORTRAIT ─────────────┐│
│                                    │     full right-rail width    ││
│       SCENIC COMPOSITION           ├──────── NPC SPEECH ───────────┤│
│         approximately              │ same width as portrait       ││
│              4:3                   ├──────── PLAYER CHOICES ──────┤│
│                                    │ responses           ▏thumb  ││
│                                    │ scrollable ONLY HERE ▏       ││
│                                    │                     ▏       ││
├────────────────────────────────────┴───────────────────────────────┤
│  ◂ [ ] [ ] [ ] [ ] [ ] [ ] [ ] ▸ │ CURRENT OBJECTIVE │ 3 UTILITIES │
└────────────────────────────────────────────────────────────────────┘
```
The objective panel uses its own frame with a gap separating it from inventory; arrows appear as tiny integrated frame controls rather than inventory slots; all scene/portrait/speech apertures are unobstructed.

## Remaining design choices
Exact source sprite resolution and final metal treatment; whether ordinary scene is ~1× and closeups/frame ~2× detail; fonts/colors; room/character art; objective copy; exact footer widths after accessibility testing. These are **not** reauthorization to change settled component order.

**Next:** render ONE strict structural layout study with neutral placeholders (no decorative redesign), verify all placements, THEN use it as geometry guide when exploring art style.
