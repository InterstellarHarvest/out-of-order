# CYOA — Non-NPC Narrative and Focus Modes: Owner Revision v0.2

**Date:** 2026-11-07  
**Authority:** Owner clarification of the original non-NPC presentation study. This document supersedes the A/B/C comparison framing in [63](63_NON_NPC_NARRATIVE_PRESENTATION_GATE_V01.md).  
**Scope:** Non-NPC screen presentation, choice semantics, and proposed art interface. **No modifications to M2 reception or the production M1 shell.**

## Owner-directed decisions (current design direction)

1. **B — NARRATIVE MODE is the default for non-NPC scenes.** Retain the main illustrated scene on the left. On the right, the narrative/dialogue area **expands upward over the area currently occupied by the NPC portrait**, forming one taller narration panel. **Keep the choices where they already are.** Inventory, objective, utility buttons, and frame geometry remain unchanged.
2. **A — FOCUS MODE is for an actual close-up interaction** with something in the scene (e.g. switch, keypad, file drawer, document, detailed physical mechanism). The player normally enters Focus Mode **by selecting a contextual choice while in Narrative Mode**. A close-up does not appear merely to fill the portrait window.
3. The formerly proposed **C object/document mode is not distinct from A**. An interactable object, file, or document is a Focus Mode target. Do not build redundant mode templates.
4. We need to differentiate **spoken-line choices** from **narrative action choices** visually and behaviorally; typography/convention **is not yet selected**. Owner specifically asked whether canon already has italics or parentheses.
5. **Narrative Mode probably requires new artwork.** Model it on the already-approved pattern for item inspector's right-column alteration, but **in reverse**: instead of enlarging the item portrait to cover the original dialogue space, enlarge narration upward to cover the portrait space. The choice list remains visually and structurally untouched.

## What existing canon actually specifies (verified from main docs 17, 34, 45, 47)

- M1 current frame is a locked 1920×1080 shell, with 70/30-ish left scene/right rail and unchanged footer. Do not redesign the shell.
- The owner requested a right-column **item inspector** overlay as a transparent 1920×1080 PNG containing only altered right-column art, without changing the base shell. Its *large item picture* occupies the portrait + speech space. **This supplies an established compositing precedent**, not a reusable identical artwork source.
- Reception speaking turn: NPC text appears with the Dialogue face (selected Jersey 15 1×), player-spoken line with Choices face, which is the locked approved face used on choice cards. Current Objective uses Tiny5 3×. Labels/tooltips may use Press Start 2P 2×. These reflect the M1 font decisions/documentation.
- **No canonical font, italics, parentheses, action icon, quote convention, or distinct card artwork was approved for narrative action choices.**
- Current reception choice cards represent the player's **spoken line**, and selecting them animates a “send” into the conversation. This cannot automatically apply unchanged to non-spoken actions.
- Existing full-width portrait and same-width speech aperture, choice scrollbar only alongside choices, and three footer utility buttons are fixed for reception. New *mode-specific content overlay* is proposed; do not infer general permission to resize scene, choice or footer regions.
- Approved choice card sprites, fonts, hover/click visuals, and inventory UI remain source-locked. A narrative mode should not require repainting them.

## Proposed two-mode grammar

### Mode B — NARRATIVE

**Trigger:** scene has no currently addressed speaker or specific inspected object. Default for story prose, a view of a hallway, observing the environment, moving between incidents, protagonist thought, or describing consequences.

**Visual:** Left scene unchanged. Right upper+middle (portrait aperture and speech box region) becomes **one unified narration surface** with appropriate new surface-frame/art treatment. Lower choice cards remain exactly where they are (including their reserved scrollbar). No empty portrait frame or arbitrary placeholder illustration.

**Text:** Concise environmental narration and protagonist's thoughts; scroll/reveal behavior must be tested (not yet locked). If the passage is long, its upper narration region may need its own internal scrolling or paginated continuation while never pushing choice cards down. Avoid forcing a giant wall of prose.

**Choices:** verbs and decisions: EXAMINE THE KEYPAD, ENTER THE HALL, WAIT, GO ON. These actions may change scene, select A, modify flags, advance narration or cause consequences. They are not recorded as spoken dialogue.

### Mode A — FOCUS

**Trigger:** Player chooses an authored action from B, typically “EXAMINE [THING]”. Can show specific machinery, sign, document, file drawer, switch, keypad, or a wall-mounted speaker/camera once focus is warranted.

**Visual:** Return to existing high-detail image aperture with close-up artwork. Underneath, contextual description/status, plus the existing choices underneath as interaction options. Exact behavior when a non-human device **speaks** must be handled deliberately (speaker may be a speaking focus, not a person).

**Choices:** USE, READ, TURN, ENTER, INSPECT, STOP EXAMINING, etc. Actions can resolve a check or return to B with a changed narration/state. A short focused look is not a new navigable world hub; leaving focus does not imply arbitrary backtracking through earlier CYOA pages.

**Modes:** `narrative` (B), `focus` (A), existing `dialogue` (NPC) and existing `inventory_inspector` (separate inventory context). **Do not add C.**

### Typical non-NPC flow

```
Left: hallway / Right: tall narration panel (B)
  → choice: EXAMINE KEYPAD
Left: same hallway / Right: keypad close-up + description (A)
  → choice: ENTER CODE, or STOP EXAMINING
  → result narration, any acquired knowledge/item or roll outcome
  → B next narrated choice / scene, or a new focus if story requires
```

**House of Tomorrow example:** The player enters the model home in B. A wall speaker AI can speak in text; on a deliberate interaction choice to examine/address the speaker, the close-up of a camera/speaker becomes A. No need for a random decorative portrait before any focus choice.

## Action versus speech: experimental typography and grammar

**Canonical answer:** There is **not yet** a locked action-voice distinction beyond the different selected fonts for NPC speech and the player's spoken words. Do not state that parentheses/italics are canon.

**Recommended first typography comparison:** Use existing locked choice-card sprites and Choices face for both, but change the **text convention** and **semantic action flow**:
- SPOKEN (dialogue mode): natural utterance, e.g. `"I'm just looking for a bathroom."` — quoted speech is only a candidate visual convention; current reception does not need quotes added without approval.
- ACTION (narrative/focus mode): unquoted, active verb, e.g. `EXAMINE THE KEYPAD`, `PULL THE LEVER`.
- SYSTEM/RESULT: narrative voice, e.g. `I tried the keypad. The display printed a receipt.` — never write action selection as though the player *said* it aloud.
- CONTINUATION: `CONTINUE` remains a choice card, consistent with M2 single-action card rule.

**Alternatives to compare before lock:** tiny fixed action marker/glyph inside choice text layout (only if it does not change approved card art); subtle text convention such as a short prefixed verb; two existing font faces only if the difference is readable. **Avoid italics as default** due to pixel-font clarity, and avoid parentheses because they may imply stage directions. Do not introduce another bespoke font solely for this purpose without an actual comparison.

**Behavioral requirement is stronger than typography:** A spoken selection may be printed in transcript as player speech and invoke NPC reply cadence. An action selection should execute the declared action, produce environmental narration, and preserve a record of what happened without pretending a spoken exchange. The sending animation for a spoken card is not automatically appropriate for every action; compare reusing it versus a simple physical slide into the result panel. Do not casually redesign locked cards or button press states.

## New artwork brief: Narrative Mode overlay (proposed)

**Need:** One authored PNG or sprite-built treatment that turns the right-hand portrait+speech stack into **one tall bordered narrative panel** and leaves the choices and all else unchanged. Because the existing shell permanently draws a border between the portrait and speech boxes, this cannot be achieved with merely hiding a portrait; the dividing hardware must be visually superseded.

**Recommended production/preview strategy:**
1. **Read and align** against the exact current `art/ui/shell/layout-final.png` and any current **item-inspector overlay**, if it exists; do not rely on guessed dimensions or the historically approximate item-inspector measurements in doc 45.
2. Author the proposed overlay as a **1920×1080 RGBA transparent PNG** with drawn pixels limited to the right-column area covering the portrait and dialogue sections, following the already specified item inspector overlay pattern.
3. **Hide/bridge the intermediate portrait/speech divider** with production-compatible pixel art and create one larger narration-area surround. Do not obscure main scene, choice cards, scrollbar, inventory, objective or utility buttons. Do not add unrelated text or rivets.
4. Preserve the approved patchworked enamel/industrial framing language with matched margins and clear hierarchy. The B upper surface can be warm, paper-like, or institutional, but must be legible and consistent with the existing shell.
5. No need to generate new NPC/object art. Avoid gradients, scaling blur or double framing. Do not redraw the full 1920x1080 screen; only a transparent mode overlay.
6. Produce visual **A/B comparisons** of two different treatment strengths of the **same B panel** if useful, plus an exact shell compositing proof with 1-line, 3-line and longer text samples.
7. Include the fact that action choices use existing choice frames: only their text and semantics are under study.

**Boundary:** This is a new review asset in a separate isolated art/preview branch/worktree, NOT an edit to the canonical shell or to the active M2 reception polish lab. No production code or integration until visual approval.

## Acceptance gate for next review

- B reads as a complete, deliberately authored **narration panel**, not a blank NPC portrait.
- B extends over portrait + speech sections, but **choices and footer never move**.
- A uses a meaningful high-detail object focus only after a player selection in B (for non-NPC scenes).
- C is gone.
- One can tell whether a player selection means **speaking** or **doing**.
- A selected action is resolved as an action, not a fake voiced player line.
- A button or font convention is approved only after visual comparison.
- Current M1 base shell, inspector production art, sprite package, and M2 receptionist are untouched.

## Current status

**OWNER-DIRECTED:** A and C unified as object focus; B is default, expanded narration; A follows a B choice; B needs new art; action-versus-spoken distinction to investigate.

**CANON ALREADY VERIFIED:** M1 font roles for NPC, player spoken, objective, labels; choice cards and M2 send-turn sequence; item inspector art overlay precedent.

**NOT YET CANON:** action typography, punctuation, art for B, typewriter/timeline treatment of narrative results, mode transition visuals, whether narrative scrolls.

**NEXT:** Prepare an isolated exact-shell artwork comparison for **B** and a small typographic comparison of **spoken vs action** cards; owner reviews visuals before any M2 integration. See doc 63 for broader prior alternatives (historical).
