# M1 — UI Assetization and Runtime Interaction Prep
**Date:** 2026-10-30  
**Status:** OWNER-SELECTED production-prep decisions. This document translates the locked M1 frame into reusable sprite/runtime responsibilities. It does **not** authorize gameplay implementation yet.
**Governing visual:** owner-supplied `layout final.png`, 1920×1080, SHA-256 `374d83a217c0b9ec1d682ac9b464be9a870bb131384c35300eced9b8a67014b3`.

## 1. Production architecture
Use three layers:
1. **Static shell:** the fixed frame/hardware and neutral backing fields.
2. **Reusable sprite components:** only pieces that resize, press, scroll, slide, or otherwise need states.
3. **Code-rendered content:** text, item artwork, portrait artwork, scene art, focus/selection states where practical.

The owner does **not** want the whole UI regenerated for small changes. The authoritative shell is surgically cleaned from the final frame reference, with dynamic elements removed and replaced by neutral backing.

## 2. Static shell — keep
Keep in the master shell:
- outer frame and all fixed patchwork/fasteners;
- scene aperture frame;
- portrait aperture frame;
- structural right-rail framing;
- choice-region neutral backing and fixed scrollbar channel;
- inventory-lane neutral backing/housing;
- objective-panel neutral backing and the overlapping **CURRENT OBJECTIVE** plaque;
- fixed footer structure around the three utility buttons.

Do not bake narrative text, item icons, portrait/scene art, or individual choice cards into the shell.

## 3. NPC speech panel
The NPC speech panel is a separate sprite and **keeps its visible rivets/fasteners**. Player-choice cards deliberately do not.

### Runtime text
- NPC dialogue types in with a typewriter effect.
- Click/tap while typing = immediately reveal the rest of the current speech.
- Once the current speech is fully revealed, normal progression controls resume.

### Speech overflow
If the written speech exceeds the visible speech panel height:
- reveal a **small, thin, rounded-rectangle scrollbar thumb overlay** inside the speech panel;
- dark contrasting color, visually quiet;
- fade in only when overflow exists;
- place it in the narrow clear strip between the two right-side rivets, where text is already padded away;
- no arrows, no browser-native scrollbar appearance;
- hide/fade it away again when the current speech does not overflow.

This speech-overflow control is independent of the player-choice scrollbar.

## 4. Player choice cards — LOCKED sizing and visuals
The choice viewport outer bounds stay fixed. Individual choice cards grow vertically according to wrapped line count.

Baseline: **three standard 2-line choices fit simultaneously without scrolling.**

Relative card heights:
- 1 line ≈ 0.70× standard;
- 2 lines = 1.00× standard;
- 3 lines ≈ 1.30× standard;
- 4 lines ≈ 1.60× standard.

Implementation principle: fixed top/bottom padding + fixed line-height per wrapped line. Never shrink the font just to force text into a smaller card. Prefer 1–2 lines; allow 3; 4 is exceptional but valid.

### Choice-card art
Create one neutral sprite for each line-height class:
- `choice_1line.png`
- `choice_2line.png`
- `choice_3line.png`
- `choice_4line.png`

**No rivets on player-choice cards.** They should read as inserted response surfaces, not permanently bolted hardware.

Do **not** create multiple dirt/stain variants. Visual repetition is acceptable and preferable to artificial grime variation.

### Hover / press
- Hover/focus: subtle fill/border treatment only; **no position movement**.
- Mouse/touch press: card shifts **a few pixels right and down** to feel gently pressed into the interface, then returns/activates. No bounce spectacle.
- Prefer code-driven offset and tint/shadow changes over separate pressed sprites unless testing proves bespoke art necessary.

## 5. Player-choice scrollbar — LOCKED
Only player choices scroll; portrait and NPC speech remain fixed.

### Track
The fixed scrollbar channel is already part of the shell. **No separate track sprite is required.**

### Thumb
Create one vertically resizable thumb asset using capped/stretchable construction:
- fixed top bevel/cap;
- repeatable or stretchable center texture;
- fixed bottom bevel/cap.

Implementation can use CSS 3-slice/9-slice/border-image or equivalent HTML/CSS composition so the center grows while top/bottom edges stay pixel-correct.

Behavior:
- no overflow: thumb fills **100% of the usable track**;
- overflow: thumb shrinks proportionally to `viewportHeight / totalContentHeight`;
- position maps to scroll progress;
- clamp to a sensible minimum visible thumb height;
- **no scrollbar arrows ever**.

The thumb is flatter/rectangular rather than a tubular 3D handle.

## 6. Inventory slots — LOCKED
Use **one** reusable inventory-slot sprite:
- `inventory_slot.png`

No grime variants, alternate stains, or randomized slot art. The slot should simply fit the interface cleanly and remain square.

Place seven instances in the neutral inventory lane.

## 7. Inventory navigation buttons — LOCKED
Left and right arrows are distinct chunky mechanical buttons integrated at the inventory ends.

Because lighting/shadow direction and housing geometry differ, create separate left and right assets.

Required states:
- `inv_left_idle.png`
- `inv_left_hover.png`
- `inv_left_pressed.png`
- `inv_left_disabled.png`
- `inv_right_idle.png`
- `inv_right_hover.png`
- `inv_right_pressed.png`
- `inv_right_disabled.png`

Pressed state must visibly move **down and into the frame**, with changed highlight/shadow, like a physical 3D button being depressed.

Hover may brighten/outline subtly but does not move the button.

Each activation slides the seven-slot inventory window by exactly **one item**.

### Inventory slide motion
Use a clipped/masked inventory viewport and translate the slot/item strip by one slot increment.
Motion should be short and restrained:
- quick lateral slide;
- tiny ease/overshoot/settle;
- optionally a very small 1–2 px wobble/weight response;
- no flashy card-game physics.

The reference is the sense of tactile weight seen in games like Balatro, reduced substantially so the inventory remains calm and functional.

## 8. Utility buttons — LOCKED
The three footer utilities use the same chunky physical press language as the inventory arrows.

Preferred asset strategy: one generic button body per state, with text rendered in code:
- `utility_button_idle.png`
- `utility_button_hover.png`
- `utility_button_pressed.png`
- `utility_button_disabled.png`

Labels remain code text (currently INSPECT / NOTES / JOURNAL). Item-inspection mode may change labels/actions or disable a button contextually.

Pressed state visibly sinks into the panel with altered shadow/highlight. Hover does not move it.

## 9. Objective panel
Keep the objective backing and overlapping **CURRENT OBJECTIVE** plaque in the static shell. Objective body text is rendered in code.

No additional objective sprite is currently needed.

## 10. Likely complete first-pass asset list
### Static
- `ui_shell_master.png`

### NPC speech
- `speech_panel.png`
- optional `speech_overflow_thumb.png` only if CSS/procedural drawing cannot achieve the desired tiny rounded overlay cleanly

### Player choices
- `choice_1line.png`
- `choice_2line.png`
- `choice_3line.png`
- `choice_4line.png`
- `choice_scroll_thumb.png` (capped/stretchable)

### Inventory
- `inventory_slot.png`
- four states each for left and right navigation buttons

### Utility buttons
- four generic state sprites

No other current UI element requires sprite extraction/generation unless implementation testing uncovers a genuine need.

## 11. Runtime layer order
Recommended:
1. scene art;
2. portrait art;
3. static shell;
4. NPC speech panel;
5. NPC text + optional speech-overflow thumb;
6. player choice sprites;
7. player choice text;
8. player-choice scrollbar thumb;
9. inventory slot sprites;
10. inventory item icons;
11. inventory arrow buttons;
12. objective text;
13. utility buttons + code labels;
14. focus/hover/press overlays/effects as required.

## 12. Next production-prep task
Before any implementation, make an **extraction/measurement sheet** from the authoritative `layout final.png`:
- exact scene aperture rectangle;
- portrait aperture rectangle;
- NPC speech-panel rectangle;
- choice viewport rectangle;
- choice scrollbar track rectangle;
- 1/2/3/4-line choice sprite dimensions derived from final font metrics;
- inventory lane and single square slot dimensions;
- left/right inventory button rectangles;
- objective text safe area;
- three utility-button rectangles;
- internal NPC speech overflow-scroll zone.

Then generate/cut the reusable assets against those exact rectangles and verify a reconstruction can reproduce the authoritative frame without drift.
