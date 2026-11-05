# CYOA M2 — PMO Review of Reception Slice Checkpoint 01

**Date:** 2026-11-05  
**Branch:** `agent/m2-reception-slice`  
**Reviewed head:** `de7b2e7fceaa9592c56d67945d0a053e7a066091`  
**Status:** CHECKPOINT 01 ACCEPTED WITH TARGETED REVISIONS. Do not merge yet.

## 1. Overall PMO ruling

The structural slice passes its first PMO gate.

Reasons:
- it is playable start-to-ending rather than a UI-only mockup;
- narrative content is separated from presentation code;
- the route validator and browser use the same state rules;
- M1 lab/art/design files were not modified;
- the route contains an actual early three-way decision, item-mediated information, state-dependent later copy, item use and a closing hook;
- the implementation remains within the bounded M2 charter.

Do not expand the reception slice with additional rooms or systems before owner playtest.

Firefox QA remains required before merge to `main`, but its absence does not block this checkpoint review because the environment could not obtain the browser binary.

## 2. Open-decision rulings

### 2.1 Disabled utility/action buttons — REVISE

Do not use a visually blank button plus an invisible action whose tooltip says e.g. `SHOW: NOT NOW`.

Preferred behavior:
- keep the relevant action glyph visible when that action conceptually belongs in the current inspector context;
- render it in a clearly inactive/disabled treatment;
- disabled button does not physically press;
- tooltip may say `SHOW — NOT AVAILABLE HERE` or equivalent;
- hover itself still does not brighten, outline, glow or otherwise alter the button face.

This is a disabled-state treatment, not a hover treatment.

If no action belongs in that slot at all, a genuinely blank physical button is acceptable; do not imply a hidden action via tooltip.

### 2.2 Keyboard/controller focus on choice cards — USE THE BRASS TAB

Reject the current 8px text-only shift as the final keyboard-focus cue.

Use the already approved physical brass choice-marker tab for keyboard/controller focus:
- no border/outline/glow/fill change;
- mouse hover remains Nothing;
- keyboard/controller focus receives the physical tab so focus is unambiguous;
- the tab must not change choice-card geometry or text wrapping.

### 2.3 NOTES and FILES — KEEP OVER THE SCENE

Keep NOTES and FILES as overlays occupying the large scene aperture rather than moving them into the right rail.

Reason:
- the scene aperture provides enough room for transcript/file content;
- the right rail remains the active conversation/item-inspection area;
- this preserves the mental model that NOTES/FILES are separate document surfaces rather than another dialogue mode.

For M2, the current dev panel is acceptable.

For production art, commission **one reusable NOTES/FILES overlay panel treatment**, with dynamic title/content rather than two unrelated panels. Do not block structural work on this art.

### 2.4 INSPECT behavior — REVISE BEFORE MORE ITEMS

Do not define INSPECT as “open the leftmost visible inventory item.”

That works accidentally with one item and becomes wrong as soon as inventory grows.

Introduce a lightweight UI-only selected/focused inventory item:
- clicking/focusing an item establishes the current item;
- INSPECT opens that item;
- direct item activation may continue to open it immediately if desired;
- when exactly one item is owned, defaulting selection to it is acceptable;
- when no item is selected/owned, INSPECT is disabled rather than silently choosing an unrelated slot.

Do not add generalized inventory state beyond this.

### 2.5 Item name — KEEP `FACILITIES KEY`

Keep the in-world name **FACILITIES KEY**.

The existing source filename may remain `bathroom_pass_slot.png`; filenames do not need to match player-facing nomenclature.

“Facilities Key” fits the institutional euphemism and is more useful than “Bathroom Pass” for the implemented key/fob behavior.

### 2.6 Dialogue casing — DO NOT LOCK ALL CAPS YET

The current all-capital copy is acceptable for this structural checkpoint but is **not** approved as the final prose treatment.

Before final copy/art lock, make a small visual comparison using:
- sentence/mixed case for spoken NPC/player dialogue;
- uppercase retained for action labels, FILES records, bureaucratic headings and other institutional UI where appropriate.

Reason: the selected dialogue face supports lowercase, and sustained all-caps may unnecessarily flatten character voice/readability.

Do not rewrite the full script solely for casing before that comparison.

### 2.7 Stray choice-card pixels — AUTHORIZE CLEANUP

The six newly identified disconnected pixels/rows are technical source defects of the same class as the two earlier corrections.

Authorize a **separate, clearly isolated maintenance commit** that:
- removes only the disconnected stray pixels in rows 0–1;
- changes no connected card artwork;
- updates sprite hashes/manifests;
- rebuilds the atlas/package as required;
- updates QA pins;
- runs package/lab/game QA;
- records before/after hashes.

Do not fold unrelated visual changes into that commit.

### 2.8 Story placeholders — PARTIAL KEEP / PARTIAL REVISE

#### Keep provisionally
- **Office of Unverified Conditions.**
- The **4:52 return time** on the key tag.
- The signature being recognizably in the protagonist's own handwriting.
- The bureaucratic self-dispute.
- The fact that the facilities are closed pending examination and the protagonist is now the examiner.
- Room Four as the next obligation.
- The typewriter already operating in Room Four.
- “If anyone asks, you have always been here” as a strong bureaucratic/unsettling line.

These work as slice material without requiring a final mystery model.

#### Revise
The receptionist should **not sound as though she understands a time-loop/temporal mechanism**.

Specifically, revise or remove:
- `THEN YOU HAVE UNTIL 4:52 TO GET USED TO IT. KEYS COME BACK, EXAMINER. THEY ALWAYS COME BACK.`
- the conditional closing `SEE YOU AT 4:52.`

Why:
The impossible 4:52 record is a strong first contradiction. Explaining or predicting it immediately narrows the player's hypothesis toward time-loop/time-travel mechanics and weakens the project's rule that observations and explanations remain distinct.

Preferred tone:
the receptionist treats the contradictory record as administratively normal or irrelevant rather than as supernatural knowledge.

The exact replacement copy is not locked here; preserve the contradiction and bureaucratic indifference.

### 2.9 Empty inventory slots — KEEP CURRENT LAB DEFAULT

The game should continue following the owner's current layout-lab slot count/geometry rather than reopening M1 layout during this slice.

Empty slot frames may remain visible.

Do not change the geometry contract yet.

## 3. Architecture ruling

Accept the current architecture for M2.

In particular:
- keep `game/content/reception.js` as plain narrative data;
- keep story-state rules outside DOM code;
- keep route validation sharing the runtime rules;
- keep `tools/layout-lab/` intact as a separate developer tool.

Do **not** refactor the duplicate lab/game behavior into shared modules during this checkpoint unless a concrete defect requires it. Premature deduplication would add risk without improving the slice.

## 4. QA ruling

Current checkpoint evidence:
- route validation: 36/36, 449 reachable states;
- Chromium browser QA: 119/119;
- lab Chromium regression: 981/981;
- deliberate fault injection detected all eight final injected faults;
- M1 asset immutability checks pass.

Before merge:
- run the game suite in Firefox on an environment where Playwright Firefox is available;
- rerun Chromium/Firefox after the choice-card cleanup;
- keep branch/state validation green.

## 5. Next checkpoint scope

Do only the following before PMO Checkpoint 02:

1. apply the decision rulings above;
2. make the isolated choice-card stray-pixel maintenance commit;
3. revise the two over-explicit 4:52/time-loop lines;
4. implement selected-item INSPECT behavior;
5. use brass-tab keyboard/controller focus;
6. improve disabled-action semantics;
7. preserve NOTES/FILES in the scene aperture;
8. add no new location and no generalized systems;
9. run QA;
10. prepare the slice for owner playtest.

Production reception scene/portrait/inspector art may remain placeholders for Checkpoint 02 unless the owner separately commissions that art.

Do not merge to `main` until owner playtest and Firefox QA are complete.
