# M1 Control Candidate PMO Review — PROVISIONAL

**Date:** 2026-10-31  
**Status:** PROVISIONAL — owner is still actively refining sprite designs; no new control sprite is art-locked.  
**Branch:** `review/m1-ui-shell-v2`  
**Reviewed candidate documentation:** `docs/38_M1_CONTROL_CANDIDATE_REVIEW_01.md`  
**Reviewed full-frame evidence:** `assembly_candidate_up.png`, `assembly_candidate_down.png`, `assembly_candidate_overflow.png`, and `press_study.png`.

## PMO provisional visual assessment

### Existing player-choice cards — ACCEPT / LOCK
Keep the existing A/B/C choice-card assets.

The final 1920×1080 shell confirms that:
- the 548 px width fits the canonical choice bay;
- three 108 px two-line cards fit the default 348 px viewport;
- the cream material and restrained wear sit correctly against the green/grey shell;
- the cards remain visually prominent enough to function as the primary interaction surface without fighting the surrounding frame.

Do not redraw these without a demonstrated production defect.

### Existing inventory slot — ACCEPT / LOCK
Keep the existing 96×96 inventory slot.

Seven visible slots at 102 px pitch fit the final shell and preserve the intended lower-left inventory rhythm.

Do not redraw.

### Inventory arrows — PROMISING / NOT LOCKED
The new left/right UP and DOWN candidates are approved for runtime integration.

The pressed state now reads as a physical depth reversal:
- UP uses the expected raised highlight/shadow relationship;
- DOWN reverses/compresses those cues across the whole button body;
- palette and dimensions remain stable;
- the control does not read as merely highlighted or recolored.

The arrows are intentionally quiet and narrow. Do not add rivets or decorative noise.

### Utility/action buttons — PROMISING / NOT LOCKED
The three utility-button candidate pairs are approved for runtime integration.

Their lower visual intensity relative to the shell is desirable: they read as functional controls inside the housing rather than competing focal art.

The small fastener differences are sufficient. Do **not** increase fastener size or variation merely to make the differences more obvious.

The UP/DOWN relationship is approved:
- same material family and dimensions;
- whole-body bevel inversion;
- no hue-based selected state;
- no shrinking.

### Choice scrollbar thumb — PROMISING / NOT LOCKED
The three-piece tan thumb is approved.

The individual pieces are intentionally simple because the canonical shell supplies the surrounding metal track/housing. In the full overflow composition, the assembled thumb reads correctly as an insert rather than a separate ornamental control.

Keep:
- fixed top cap;
- vertically tileable middle;
- fixed bottom cap;
- proportional runtime sizing/position.

Do not add arrows or a browser-style scrollbar.

## Full-frame assessment

The candidate controls fit the final shell better in the assembled 1920×1080 views than they appear in isolation. Their restraint prevents the bottom utility bay from competing with the choice cards and scene.

The dynamic `CURRENT OBJECTIVE` label and objective text correctly demonstrate the owner's decision to remove baked objective wording from the canonical shell.

The corrected overflow preview properly keeps the player-choice scrollbar independent from the NPC-speech overflow indicator.

## Art-production decision

**SUPERSEDED:** Additional sprite refinement is authorized and currently in progress with the owner. Do not treat the candidate set reviewed here as final production art.

Runtime integration should wait for explicit owner sprite-design approval. The current work remains sprite refinement and comparison against the frozen shell.

## Runtime integration gates

Proceed to runtime integration with these requirements:

1. Use the exact frozen `layout-final.png`.
2. Use the locked choice cards and inventory slot byte-for-byte.
3. Wire inventory arrows and utility buttons with their approved UP/DOWN assets.
4. Apply DOWN only during actual pointer/touch/keyboard activation; it is not a persistent selection state.
5. Preserve integer positioning and nearest-neighbor/pixel-sharp rendering.
6. Assemble the scrollbar thumb from top/middle/bottom without scaling the caps.
7. Implement choice scrolling and proportional thumb movement.
8. Implement NPC speech typewriter behavior and click-to-complete separately from choice scrolling.
9. Implement the NPC-speech overflow indicator only when that speech panel itself overflows.
10. Run browser QA for mouse, touch, keyboard, and reduced-motion behavior before production promotion.

## Reopen criteria

Reopen sprite art only if runtime integration reveals a concrete problem such as:
- DOWN state is unreadable at actual interaction speed;
- a control collides with shell geometry;
- integer scaling produces distortion;
- text safe areas fail;
- scrollbar assembly exposes seams;
- accessibility/contrast failure.

Preference alone after implementation is not sufficient reason for another redraw unless the owner explicitly requests it.


## Owner correction — same day

The owner clarified that sprite designs are still being finalized in the dedicated sprite-production chat.

Therefore:
- Existing locked choice cards and inventory slot remain accepted.
- New inventory arrows, utility buttons, pressed states, and scrollbar thumb remain **candidates only**.
- Do not promote or integrate those candidates as final art until the owner explicitly approves them.
- The frozen canonical shell remains unchanged.
