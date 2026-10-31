# M1 — Owner Final Frame Candidate + Dialogue Choice Sizing Proposal
**Date:** 2026-10-30
**Status:** Owner-selected frame candidate is now the authoritative visual reference. Dialogue-choice sizing/scroll behavior below is a PMO proposal pending owner approval.

## Authoritative frame candidate
Owner supplied `layout final.png` and stated: **"this is what should use."**

Reference properties:
- Dimensions: **1672 × 941** (16:9-class aspect, ~1.777)
- SHA-256 of uploaded PNG: **f5d2fb6672f9fdb4d2991a620f73de61485492c463364d8dd46f978ad55c359b**
- This exact uploaded image is the visual reference for M1 frame/layout going forward. **Do not regenerate or reinterpret the frame to make small changes.**
- The magenta regions are alpha-mask placeholders for the scene and portrait apertures.
- The frame layout, inventory, objective label plate, footer utility positions, portrait/speech relationship, and choice-only scrollbar architecture are fixed unless the owner explicitly reopens them.
- The source image remains a conversation artifact/local reference; this doc records exact identity and constraints so future PMO handoffs can recover it.

## PMO continuity rule
When this conversation nears context limits or a major phase boundary, PMO must:
1. checkpoint current decisions in GitHub;
2. identify the exact authoritative image/file/hash and any uncommitted assets;
3. write a concise handoff prompt naming governing docs and unresolved decisions;
4. tell the owner to move to a new chat only when useful, not routinely.

No handoff is needed yet.

---

# Dialogue choice region — proposed lock

## A. Fixed viewport, variable-height choice boxes
Keep the current **choice region outer bounds fixed**. The player-response boxes inside it vary in height based on wrapped text length.

Design around a **2-line response as the standard unit**:
- **1-line choice:** ~0.70 × standard 2-line height
- **2-line choice:** 1.00 × standard height
- **3-line choice:** ~1.30 × standard height
- **4-line choice:** ~1.60 × standard height

This follows a simple model: fixed top/bottom padding + one line-height per wrapped line. Exact pixels depend on final font.

The viewport should fit **three standard 2-line choices at once**, including the normal gaps between them, with no scrolling.

A useful normalized model:
- line height = 0.30 units
- total vertical padding = 0.40 units
- choice height = 0.40 + (0.30 × line count)
- inter-choice gap = ~0.08 units
- viewport height = three 2-line choices + two gaps ≈ **3.16 units**

Consequences:
- Four 1-line choices can usually fit.
- Three 2-line choices fit by definition.
- Two 3-line choices fit comfortably.
- A mixture can overflow naturally.
- 4-line choices are allowed but should be unusual; they consume substantial viewport space rather than shrinking type.

## B. Choice text rules
- Never reduce font size to squeeze a long response into the standard box.
- Wrap naturally; box grows to the correct line-count height.
- Prefer authored choices that usually land at **1–2 lines**.
- 3 lines are acceptable when needed.
- 4 lines are permitted but should be exceptional; if the player's intended statement needs more than four lines, rewrite or split the interaction rather than making giant response cards.
- No ellipsized/truncated choice copy for normal dialogue.

## C. Scrolling behavior
Only the choice list scrolls. Portrait and NPC speech remain fixed.

Support:
- mouse wheel / trackpad continuous scroll;
- dragging the custom thumb;
- keyboard Up/Down to change focused choice and auto-scroll the minimum amount needed to reveal it;
- clicking a choice selects it; Enter activates focused choice.

The choice cards themselves should not 'page' in sets of three. Their variable heights make continuous content scrolling more natural.

## D. Scroll indicator — PMO recommendation
**Keep the indicator visible at all times. When no scrolling is needed, the indicator fills the ENTIRE usable track.**

Why:
- the scrollbar channel never looks broken or mysteriously empty;
- it clearly communicates "all available choices are already visible";
- it avoids a appearing/disappearing control;
- when overflow occurs, the thumb can proportionally shrink and move, using familiar scrollbar semantics without looking browser-native.

Behavior:
- no overflow: thumb height = 100% of usable track, position = top;
- overflow: `thumbHeight = trackHeight × viewportHeight / totalContentHeight`;
- clamp to a minimum visible/touchable thumb size;
- thumb Y maps proportionally to scroll progress;
- **no arrow buttons**, ever.

The thumb stays flatter and rectangular, per the current frame direction.

## E. Choice styling
NPC speech keeps the pale cream speech panel. Player choices use a related but distinct lighter/cooler inset surface so speaker vs player action reads immediately.

Selection/hover/focus should change fill/border treatment without changing card size. Disabled conditional choices, if ever used, remain legible and visibly unavailable; avoid hiding them unless story logic specifically requires secrecy.

## OWNER LOCK — 2026-10-30
The owner approved both pending decisions:
1. **Three 2-line choices** is the baseline visible capacity; 1/2/3/4-line cards use variable heights rather than font shrinking.
2. The player-choice scrollbar thumb **fills the entire track when no scrolling is needed** and shrinks/moves proportionally when overflow exists.

Additional owner-selected interaction/asset decisions are recorded in [M1 UI Assetization and Runtime Interaction Prep](26_M1_UI_ASSETIZATION_AND_RUNTIME_PREP.md): no rivets on player choices, speech box keeps rivets, NPC typewriter + click-to-reveal, subtle speech overflow thumb, pressed offsets for choices, chunky pushed inventory/utility buttons, one inventory-slot sprite only, and stretchable/capped choice-scroll thumb.
