# CYOA M2 — PMO Review of Reception Slice Checkpoint 02

**Date:** 2026-11-05  
**Branch:** `agent/m2-reception-slice`  
**Reviewed head:** `6ab01a951c177c91691f4a396abd6d0eac849e7b`  
**Status:** CHECKPOINT 02 ACCEPTED FOR OWNER PLAYTEST. Do not merge yet.

## 1. Overall ruling

Checkpoint 02 satisfies the PMO scope from docs/49.

The slice remains bounded to reception, the M1 lab remains intact, and the required corrections were implemented without adding unrelated systems.

Current QA evidence is strong:
- route validation: 38/38 over 449 reachable states;
- game Chromium QA: 137/137;
- lab Chromium QA: 983/983;
- deliberate fault injection: 4/4 caught;
- Firefox remains outstanding and is still a pre-merge requirement.

## 2. Visual / interaction rulings

### 2.1 Inactive utility glyph treatment — ACCEPT FOR M2

Keep the current runtime-derived unlit treatment for unavailable actions.

It reads clearly in the inspector screenshots:
- the slot remains visibly occupied by its action;
- the glyph is recognizably present but inactive;
- the button does not press;
- the tooltip explains why the action is unavailable.

Do **not** commission separate disabled sprite art for M2 unless owner playtest finds the state unclear. The existing treatment is preferable to proliferating button-state assets.

### 2.2 Selected inventory-item cue — DEFER FOR M2, REQUIRED BEFORE MULTI-ITEM PRODUCTION

The selected-item state is now semantically correct, but the inventory currently has no visible selected cue.

That is acceptable for this reception slice because production content owns only one item.

Do not invent selection art solely to satisfy an abstract future case.

Before a future slice/content pass introduces two or more simultaneously held usable items, add an owner-reviewed physical selection cue. It must not be a web-style glow/outline.

### 2.3 Brass keyboard/controller focus tab — ACCEPT PROVISIONALLY

Keep the approved brass tab for keyboard/controller focus.

The current 14×12 sprite and approximately 12px visible travel are intentionally subtle. It should not be enlarged merely to make keyboard focus visually dominant over the dialogue card itself.

Owner should still judge it during 1:1 play, but no new art pass is requested now.

Mouse hover remains Nothing.

### 2.4 Rewritten 4:52 lines — APPROVE

Approve the two Checkpoint 02 replacements.

The receptionist now treats the contradiction as administratively self-consistent rather than demonstrating knowledge of a temporal/supernatural mechanism.

Especially strong:
- `A KEY THAT HAS BEEN RETURNED HAS, BY DEFINITION, BEEN ISSUED. I DO NOT SEE THE DIFFICULTY.`

The later request to return a key that the record already says was returned preserves bureaucratic absurdity without explaining the anomaly.

Keep the underlying 4:52 contradiction provisional story canon for this slice unless owner playtest rejects it.

### 2.5 Controller support — DEFER

Do not add gamepad/controller input before owner playtest.

The keyboard focus model is sufficient to prove the navigation model. Controller support can be added later if the target platform/input plan justifies it.

## 3. Choice-card maintenance ruling

Accept commit `22640bb` as a surgical technical correction.

The evidence is sufficient:
- only rows 0–1 changed on the six affected sprites;
- 588 pixels total;
- lower rows remain byte-identical;
- atlas/manifests/import compatibility/QA were updated;
- no geometry/design contract changes were smuggled into the maintenance commit.

Do not revisit these sprites unless a new concrete defect is discovered.

## 4. Architecture ruling

No architectural refactor is requested before owner playtest.

In particular:
- do not deduplicate layout-lab/game code yet;
- do not add save/load;
- do not add controller support;
- do not create generalized item-selection systems;
- do not add new locations;
- do not commission final art yet.

The next useful evidence is owner experience, not more implementation.

## 5. Owner playtest gate

Owner should now play `game/index.html` from start through restart, ideally at 1:1 at least once.

PMO wants feedback on:
1. whether the opening gets to the joke quickly enough;
2. whether the choice-send cadence feels satisfying or sluggish;
3. whether the dialogue font/casing is comfortable over a full conversation;
4. whether the 4:52 contradiction lands as intriguing rather than confusing;
5. whether the brass focus tab is visible enough in keyboard use;
6. whether inactive glyphs are understandable without explanation;
7. whether NOTES / FILES feel naturally located over the scene;
8. whether the ending creates a genuine desire to see Room Four.

Do not ask the owner to evaluate placeholder art quality.

## 6. Merge gate

Do not merge to `main` until:
- owner playtest is accepted;
- any owner-requested Checkpoint 02 revisions are complete;
- Firefox game QA has run successfully in an environment with the browser available.

If owner playtest succeeds with only cosmetic placeholder-art complaints, move next to a focused production-art pass for reception rather than adding more story/code.
