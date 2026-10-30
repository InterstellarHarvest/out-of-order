# M1 — Frame refinement and interactive behavior, round 03
**Date:** 2026-10-30  
**Status:** Owner-selected behavior; frame aesthetics and final art-density remain open. No production game implementation is authorized.

## New owner selections (supersede older exploration notes)
1. **Seven visible inventory slots** with persistent arrow mechanisms. Each arrow click shifts the displayed items by **ONE slot**—a sliding window, *not* page-sized movement. The same seven slots remain visible when arrows are inactive.
2. **Scrollbar in the far-right edge of the entire contextual rail**, extending beside the portrait, dialogue, choices and utilities—NOT inset into the choices box. Reserve its width always; portrait, choices, speaker text and buttons **never shift** when content starts overflowing.
3. **Scrollbar thumb**: a small **centered idle indicator** when nothing needs scrolling; with more options, a proportional thumb representing visible/total content, initially at the top, moving with list position. The scroll control is original pixel-built mechanical hardware, never a browser-native scrollbar. Only the choice text scrolls in conversation; the portrait and dialogue remain fixed.
4. **Item inspection in right rail** with **independently authored, more detailed item closeup**, analogous to the detailed NPC portrait relative to small on-scene sprites. Its contextual buttons may change or be visibly disabled. The stage does not move. Back/Escape should restore previous conversation and scroll position.
5. **Default world frame for ordinary rooms and buildings**. A genuinely different setting such as a spaceship *may* have a materially distinct frame with the same controls and proportions. No room-by-room UI skin changes.
6. Short **contextually responsive, subtly satirical objective**. Bottom-right portion of footer is **only decorative frame material**, no thumbnail, mini-map or place-info widget.

## Other spatial constraints remain unchanged
- Complete 16:9 screen; no ornamental **top information banner**.
- Upper region ~**70% 4:3-ish scene / 30% contextual right rail**; lower 10% footer with wide inventory left, current objective in center, decorative frame end-cap right.
- Substantial **full-width** NPC portrait, dialogue, multiple stacked replies, then **exactly three small utility buttons** directly beneath choices.
- The scrollbar occupies a *fixed rail-wide edge channel* in every state. The moving thumb must never steal width.
- All mockup text, including signs, remains **English**. Film *Brazil* refers to the absurd bureaucratic future, not the Portuguese language.
- Frames and buttons must be distinctive **pixel-art manufactured objects**, knowingly eccentric, retrofitted, patched or irrational—but readable and coherent. Avoid generic steampunk polished symmetry and generic software-rounded rectangles.
- The low-res scene, higher-detail NPC portrait, independently detailed item closeups, and sharp/high-detail frame artwork can use distinct, related integer pixel grids. Specific resolutions are still a visual/technical test.

## Design-only v3 interface lab — implemented and tested locally
A **single-page offline HTML mockup**, *not a game engine*, was prepared for review and distributed as `CYOA_Interface_Lab_v3_Offline.zip` in the conversation. The HTML and embedded PNG sprite-frame artwork are currently delivered through the conversation ZIP; **they have not yet been imported into the repository**.

Features in this design lab:
- Normal 3-choice and crowded 8-choice conversations;
- One vertical scrollbar track spanning the right rail, idle indicator centered, active thumb changing size/position;
- Inventory with 2, 7 or 12 objects; 7 visible; one-slot-left/right shift per button press;
- Selecting an object opens an illustrated higher-detail image in the right rail, then restores conversation on Return;
- Reactive objective example and alternative test materials.
- Neutral placeholder scene/portrait, purpose-built pixel border sprite, and no external network or dependencies.

### Validation
Validated using Chromium via a document injection route because this execution environment blocked browser navigation to local `file:` pages. All checked states loaded without JavaScript page errors; the rail stayed in place; 3-choice idle thumb centered; 8-choice active thumb began at the top and moved after scroll; inventory shifted **1–7 -> 2–8 -> 3–9** after successive arrows; item inspection entered and returned to conversation. This is a design smoke test, not proof of accessibility or production quality at all screen sizes.

## Original visual reference — ongoing review
A newly generated single-screen concept explores the fixed 16:9 composition with the substantial NPC portrait, full-height scroll instrument, seven inventory slots with one-slot arrows, and a mismatched/retrofitted panel end-cap. This is a direction sample only. Generated art is **not certified pixel-pure**; actual pixel density, text readability, and exact interface sprite slicing remain to be production-authored and tested.

## Next appropriate design gate
Ask the owner to evaluate **the hardware appearance and visual hierarchy**, not re-answer the solved interaction questions:
- Does the rail's *far-right* mechanical scroller look like one cohesive instrument?
- Are seven slots and arrow button targets sufficiently readable/usable at real scale?
- Is the portrait/frame density appropriately sharper than the scene without looking disconnected?
- Does the frame feel intelligently **absurdist**, or just decorative/grimy?
- Which parts of the frame should stay consistent between major settings?

Once those are satisfied, propose a visual lock for M1 and move into M2 mystery constraints, without treating this lab as a commitment to game production.
