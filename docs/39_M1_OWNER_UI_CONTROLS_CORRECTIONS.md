# M1 — Owner Review Corrections: Button, Inventory, Objective and Scroll UI

**Date:** 2026-10-31  
**Branch:** `review/m1-ui-shell-v2`  
**Status:** OWNER DIRECTION recorded; implementation and new pixel sprites NOT YET VALIDATED.  
**Supersedes:** The button/arrow/scrollbar *candidate presentation* in `docs/38_M1_CONTROL_CANDIDATE_REVIEW_01.md`; preserves earlier immutable shell, choice-card and slot contracts.

## Source and provenance

Owner feedback in the dedicated CYOA interface-art production discussion following three image-generated assembled mockups and detailed crops of arrows / utilities. These generated full-frame mockups are **concept illustrations only**, not the exact immutable shell with approved assets mechanically composited. **Do not pretend the generated images, their button art, or apparent slot counts were individually validated production sprites.** The current actual sprite assets and verified composite evidence are in `review/m1-ui-shell-v2/candidate_art/` and `docs/37`, `docs/38`. Those older candidate button designs are superseded by these corrections.

Canonical shell unchanged: `layout-final.png`, expected Git blob `1849c8ec192cd639dd8550de0dcdda1aa88d2e4f`; SHA-256 `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6`.
Locked component ZIP unchanged: `review/m1-ui-shell-v2/CYOA_M1_locked_components_v1.zip`, SHA-256 `58c71b660f87a83400c80d0e75c2037af67827b00e2f4918cff794500050f302`.

## New owner decisions — do not infer implementation from generated image

### Action buttons — fastener-free, recessed NOTES pressed look

- The **NOTES** recessed appearance in the recent concept mockup is the approved *direction for the pressed state of all three actions*, not an approval of that full generated image as source art.
- **Remove every fastener from all three utility button bodies**: no screws, bolts, washers, pins, rivets, or corner furniture on buttons. Do **not** remove structural hardware from the canonical static shell.
- Rework overly intense bevels into simpler, flatter, hard-edged pixel-art details. Maintain restrained blue-green/grey material family. Three buttons should be sibling dimensions and consistently laid out in the blank footer bay; minimal subtle material variation is acceptable but **pressed does not recolor**.
- UP = modest raised edge and whole-body cast shadow. DOWN = same entire face physically sinks or goes flat/recessed: top/left shadow + compressed/inverted bevel, cast shadow filled/covered. Do not simply darken center, shrink, or recolor.
- **The button label is code-rendered; it must move with its whole face and not remain pinned in place.** Use a shared pressed transform / offset for both background sprite and bitmap label. Preserve correct dynamic INSPECT / NOTES / JOURNAL or contextual words. Test all three.
- No hover art.

### Inventory arrows

- Existing candidate has **four separate PNGs**, `inv_left_up/down.png`, `inv_right_up/down.png`. The existing generator authors distinct facing geometry; **do not merely CSS-flip or mirror one composed button's lighting**.
- The new visual target is **smaller and markedly simpler than the first candidate**, ideally just a compact inner rectangular blue-grey plate and a solid triangular arrow, based on the owner's image reference. No hardware/rivets.
- UP = a slight lower/right drop shadow; DOWN = the **entire same-size button** moves about 2–3 display pixels right/down into and covers that shadow. Icon follows full-body travel; maintain same material and colors. Test physical travel/occlusion, not a selected look.
- The production target stays inside the existing 56×112 display sprite canvas if possible; actual visible plate is smaller within that fixed box. Do not change canonical inventory bay geometry to accommodate it.
- One item slot per arrow press, not one page.

### Inventory size side-by-side

- Do **not** choose six solely because an illustrative image seems to show six. Prepare accurate, separately labeled **7 × 96px (6px gap; 102px pitch)** and **6 slightly larger square-slot** alternatives on exact canonical shell geometry.
- Keep the single approved 96×96 slot for the seven-slot baseline; do not silently rescale/corrupt its identity.
- Six-slot version may use a new, separately identified square sprite or integer nearest-neighbor scale if visually valid. Determine safe dimensions inside unchanged inventory lane, with total clearances proven. Test same-position inventory arrow controls in both.
- Owner has not chosen six over seven; both require accurate comparison. **AI-generated scene illustrations cannot be used as a numerical slot-count proof**.

### Objective text (dynamic only)

- **Center the code-rendered `CURRENT OBJECTIVE` title** within its existing overlapping plaque. Calculate the atlas text width from glyph advances and center within the *actual plaque safe bounds*. Do not repaint the plaque or shell.
- Increase **left padding** of objective-description text within existing objective panel, and retain sufficient right/bottom safe space. Use original pixel-font atlas and integer display positions.
- Both label and body text must remain dynamic and out of the static PNG.

### Player choice cards

- The original **12 exact assets** are present and pass hashes: heights 80, 108, 136, 164 (1–4 lines), each with A/B/C stain-only variants at 548px width, 12px gaps. **Reuse** them. Three 108px choices + two 12px gaps = 348px viewport.
- Variation is A/B/C; choose deterministic/stable assignment rather than randomness per render.
- The newest *image-generated* mockups did **not** contain the 12 genuine raster assets. Their apparent heights and stains are **not** evidence that the real layout was implemented. Do not redraw the real cards from those images.
- Card pressed feedback = entire card shifts +3px both axes with its code-drawn text.

### Choice scrollbar indicator

- The scrollbar **track is already baked into immutable shell**.
- Generate only three transparent RGBA thumb parts: **rounded fixed top**, **vertically tileable/repeating middle**, **rounded fixed bottom**. Their cap heights and full thumb geometry must be measured against original slot. Use CSS/HTML overlay or pixel-canvas to assemble with image-rendering: pixelated; **never scale caps vertically**.
- Thumb stays entirely within usable rail (correct top **and** bottom inset); no overshoot. In no-overflow case it fills **usable track** (not including fixed slot bezel / clearance), with rounded caps at both ends. On overflow it shortens and maps to scroll progress; clamp minimum to cap sum and maximum to usable track.
- Current three-part candidate exists but cannot be presumed to fit simply because the illustrative picture looks right. Require real browser overflow/full-length tests and screenshot bounds QA.

## Runtime QA acceptance gates

1. Source PNG and locked bundle hashes remain byte-identical to owner canon.
2. Choice sprites use existing 12 exact raster hashes; seven-slot baseline uses existing slot.
3. Equal utility button rectangles, balanced horizontal and vertical spacing, zero fasteners, 3/3 correct pressed behaviors with **bitmap label moving with face**; no recolor or shrink.
4. Left and right inventory arrows separately authored, visually smaller, UP/DOWN both show whole-body travel and shadow occlusion; 102px one-slot-per-press baseline still correct.
5. Compare precisely six and seven slots in actual 1920×1080 overlays; do not trust generative image counts.
6. Objective title centered within plaque, body left padding increased; no static shell modification.
7. Scrollbar: top/bottom caps visually rounded, tile center, precise no-overflow and overflow bounds, track bezel untouched; no browser native scroll chrome.
8. End-to-end browser test for text typewriter, click-to-complete, independent speech overflow, dynamic labels, and code-driven positions.
9. Provide before/after full-size assembly plus focused button UP/DOWN strips for owner review, with PMO reporting: source, changed, preserved, checked/rejected, specific approval requested.

## Open owner questions

**None blocking.** Test both 6- and 7-slot alternatives; seek final owner choice only after accurate comparisons. Do not reopen shell design or approved choice frames.

## Artifact status honesty

Existing repository: canonical shell, locked ZIP, previous `candidate_art` PNGs, `docs/37` and `docs/38`.  
This update: **written owner design decisions and test expectations**.  
Latest image-generation outputs: **not yet committed as image binaries to Git**; they are reference-only concept imagery. This document records their actionable corrections so future production chats can work from Git without requiring those generated pictures or mistakenly treating them as canonical art.
