# M1 Component Art Brief and Slice Rules v1

## 0. 2026-11-05 interaction supersession

`docs/45_M1_OWNER_DIRECTION_INTERACTION_AND_DIALOGUE_FLOW.md` is authoritative for current interaction behavior. In particular:

- no hover border, outline, glow, fill or brightening;
- choice cards are dialogue lines and do not use the old push-button press treatment;
- the current default hover treatment is Nothing; a separately approved physical marker may be tested only when explicitly selected;
- utility hover uses a separate tooltip rather than changing the button face.

Older hover/press bullets below remain only as historical art-brief context.

**Date:** 2026-10-30  
**Status:** Technical art brief derived from locked M1 geometry. Final component artwork and final font remain visual-review items.

## Immutable rule
Do not regenerate the whole UI. New assets are authored as isolated components against the canonical 1920×1080 reference and composited over the static shell.

## 1. Player choice cards
Canvas width: **548 display px / 274 logical px**.
Fixed heights: **80 / 108 / 136 / 164 display px** for 1 / 2 / 3 / 4 wrapped lines.
Gap between cards: **12 display px / 6 logical px**.
Text safe inset: start with **24 display px left/right** and vertically center the wrapped text block.

Art rules:
- no rivets;
- same pale institutional material family as the current choices, but cleaner and reusable;
- no randomized stains/grime variants;
- hover/focus uses code treatment without movement;
- press shifts the card ~3 display px right/down in the lab; final logical offset should settle at 1–2 logical px after visual check.

## 2. Choice scrollbar thumb
The track is fixed shell art. Do not create a track sprite.
Detected usable dark channel is approximately **x1880 y532 w18 h322**.
Create one vertical thumb with fixed top/bottom caps and stretchable/repeating center.
Candidate cap height: **12 display px** each.
No overflow: fill the full 322 px usable track.
Overflow: scale center proportionally; caps remain unchanged; no arrows.

## 3. NPC speech panel
Reference component crop: **609×191 display px** at x1308 y332.
Keep its rivets.
Initial text-safe region: **x1342 y370 w520 h124**.
Initial metric surrogate: 24 px display font / 30 px line-height.
Speech overflow indicator safe strip: **x1880 y366 w18 h126**; small dark rounded thumb, fade only when needed.

## 4. Inventory slots
One reusable slot sprite only.
Target canvas: **102×102 display px / 51×51 logical px**.
Seven positions on exact 102 px pitch beginning at x75: **75, 177, 279, 381, 483, 585, 687**; target y≈928.
No dirt variants.

## 5. Inventory navigation buttons
Housing remains in shell. Author distinct LEFT and RIGHT button faces because lighting/shadows are not assumed mirror-symmetric.
Candidate visible face canvas: **48×64 display px** at approximately left x25 y945 / right x789 y945.
Required states: idle, hover, pressed, disabled.
Pressed: physically sinks down into the interface; change shadow/highlight, not merely color.
Hover: no movement.

## 6. Utility buttons
Current interior references are ~121–123 × 103–104 display px.
Author one generic **~122×104** button body family and use 9-slice/capped stretching for the 1–2 px bay differences.
Required states: idle, hover, pressed, disabled.
Labels are code text.

## 7. Objective
The plaque and panel remain shell art.
Code text safe area begins from **x855 y930 w577 h118** and can be tightened after final type metrics.

## 8. Typography status
The current browser lab uses a technical surrogate only. Do not lock the font from that test. Geometry is fixed; choose a condensed, readable pixel-appropriate face that fits ordinary 1–2 line choices without shrinking type.

## Next visual gate
The next owner-facing decision should be a compact typography/component-art comparison, not another full-frame regeneration. Until then, technical prep may continue autonomously.