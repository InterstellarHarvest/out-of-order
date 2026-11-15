# CYOA M2: static inspector X, context action (OBSERVE), lab usability

**Date:** 2026-11-07
**Branch:** `agent/m2-reception-polish-lab`, on top of `9c4c167` (docs/62, docs/63). Not merged. M2 stays open.
**Owner direction:** an owner-directed polish revision.

## 1. Inspector X: one static sprite

**Owner ruling:**
- the visible X is one static sprite, centred, with a symmetrical frame;
- there is no press look, no DOWN sprite, and nothing moves when it is clicked.

**The art.** The X is now `art/ui/sprites/inspect_close.png`: 44 × 44 RGBA, alpha {0, 255}.
SHA-256: `da492070f0fcd1f7acdf92f5822a73618c29f979997001b16718a52a4d2741d6`.

It is a surgical correction of the retired `inspect_close_up.png` (`8247d4b6…`). The design was not regenerated: it keeps the same silhouette, palette and X strokes.

**What was wrong with the source:**

| | Left | Right | Top | Bottom |
|---|---|---|---|---|
| Frame weight around the face (px) | 7 | 8 | 7 | 9 |

- The face (opening) sat at x 9–33, y 9–32, which is off centre, up and to the left.
- The X strokes sat at x/y 11–28, so the X's centre was 19.5. The square's centre is 21.5, so the X sat 2 px up and 2 px left.

**The correction:**

| Part | Change |
|---|---|
| Silhouette (alpha) | Unchanged. It was already symmetrical: a 40 × 40 body at (2, 2) with 3-step chamfered corners. |
| Frame | Seven 1 px concentric rings, the same width on every side. |
| Frame colours, top / left (lit), outer → inner | `#102127 #102127 #1b343c #638084 #638084 #7c9293 #7c9293`: the source's own top/left sequence. |
| Frame colours, bottom / right (shadow), outer → inner | `#102127 #102127 #0c1a20 #09171c #09171c #638084 #638084`: the source's right/bottom sequence. One extra shadow row was dropped, and the outline is 2 px, matching the lit side. |
| Frame corners | Mitred where lit meets shadow (top-right and bottom-left). The light only implies material; the ring geometry is symmetrical. |
| Face | 26 × 26 at (9, 9)–(34, 34), in the source face colour `#36545d`. |
| X | The source's own 18 × 18 stroke pattern, moved +2, +2 to (13, 13)–(30, 30). Its centre is now (21.5, 21.5), exactly the square's centre. |

- **Palette:** only the source's 8 colours. Nothing is antialiased and there is no new ornament.
- **Comparison:** before and after, side by side at 8×, was checked locally; `game/qa/screenshots/00d_inspector_close_static.png` shows it in place.

**Retired:**
- `art/ui/sprites/inspect_close_up.png` and `inspect_close_down.png` are removed from the repository (git history keeps them).
- `G.INSPECTOR_ART` has one entry, `close`, and only it is preloaded.
- Neither old file is referenced or requested at runtime (QA).

**Behaviour:**
- `#inspectClose` is still the 44 × 44 button and hit area, at the unchanged place, tunable as `inspector.closeX` / `closeY`.
- The sprite inside it, `img#inspectCloseImg`, is passive (`pointer-events: none`) and never changes.
- The X closes the inspector in any of these ways:
  - a press and release inside it (a release outside does not close);
  - Enter or Space (on release);
  - Escape;
  - activating the open item's slot again.

## 2. Item inspection needs the player to activate the item

INSPECT has been removed from the conversation buttons. Holding exactly one item no longer makes that item the target: the "only item held" fallback is gone from `G.selectedItem`.

An item opens in the existing inspector only when the player activates its own occupied slot, and only while the player could choose:
- with a pointer click on the slot;
- with Enter or Space on the focused slot (it is a native button).

**Other details:**
- Focusing or clicking a slot still marks it (`data-selected`, UI only), but no button acts on that mark.
- Activating the open item's slot again closes it.
- The inventory is ignored while the receptionist is typing.

## 3. Context action

In conversation the three utility buttons are now **CONTEXT ACTION, NOTES, FILES**.

The first button is the optional thing the player can do in the current situation. It is smaller than, and separate from, the narrative choices, which stay as cards. While an item is open, the three buttons are still **READ, SHOW or USE, and a blank**.

### Schema

The context action is data, not code. It is set for the whole location as `content.contextAction`. A node can override it with its own `contextAction`, or set it to `null` for none.

```js
contextAction: {
  id: 'observe-receptionist',  // the key for `once`
  label: 'OBSERVE',            // the tooltip label
  glyph: 'watch',              // an existing art/actions glyph
  text: '...',                 // the unspoken observation
  once: true,                  // once per encounter
  spentWhy: 'NOTHING NEW TO NOTICE' // the tooltip reason once spent
}
```

**Where it lives:**
- `game/js/rules.js` has `contextAction`, `contextSpent` and `takeContextAction`. They are read generically by `js/flow.js` (`F.utility('context')`) and `js/stage.js` (`utilityActions`).
- `stage.js` names no action: replacing OBSERVE with another action is a content edit.
- `js/main.js` preloads the glyph of every context action named in the content.
- The old `inspect` glyph is no longer loaded by the game. The asset stays, because the M1 layout lab still uses it.

**Validation** (`rules.validate` and the route validator) rejects:
- unknown fields;
- a missing id or text;
- a malformed glyph name;
- undrawable characters;
- a `once` action without `spentWhy`.

The route validator also checks that the `watch` glyph exists in `art/actions/actions.json`.

### What M2 implements

The context action adds `text` to the transcript as `{ who: 'thought', text }`.

It does **not**:
- advance the node;
- consume or change a choice;
- open an item or another screen;
- set a flag.

**When it is live:**
- The button is live only while the player could choose (phase `choosing`, nothing open).
- Otherwise it keeps its glyph, unlit, with the tooltip `OBSERVE - NOT NOW`. For example, it is unlit while the receptionist is typing. This is the same treatment SHOW / USE already get.

**`once`:**
- After the action is used, the button stays on show, inactive. Its tooltip reads `OBSERVE - NOTHING NEW TO NOTICE`.
- A second click or Enter adds nothing.
- Completion is encounter state: `state.contextDone`, a list of ids.
  - It is not a flag and is never in a condition.
  - It is not part of the route validator's state key, so the reachable-state count is unchanged at 449.
  - A restart builds a fresh state, which clears it.

### The thought role

`thought` is its own transcript role. It is not filed as NPC speech or as spoken player dialogue.

M2 renders it with existing parts only:
- the player's approved Choices bitmap face;
- in parentheses (`G.thoughtText`);
- with no speaker label, no new box and no new font.

**In the dialogue box:**
- It sits in the same scrolling history.
- It appears at once (it does not type).
- It is scrolled into view.
- The speaker gap applies where the role changes.

**In NOTES:** it is kept in the transcript in the same treatment, parenthesised and unlabelled.

### Reception prototype: OBSERVE

- **Label:** `OBSERVE`.
- **Glyph:** the existing `watch` (`art/actions/watch.png`). No new art was made to tell WATCH and OBSERVE apart.
- **Scope:** it holds at every reception node, once per encounter.
- **Line, PROVISIONAL and NOT CANON:**

  > (I WATCHED HER FOR A SIGN THAT ANY OF THIS WAS UNUSUAL. HER FACE REMAINED PROFESSIONALLY UNAVAILABLE.)

  This is placeholder copy proving the engine grammar. The Story/Narrative PMO may rewrite or replace it.

### Later, not built

A context action **may** later:
- reveal knowledge;
- set a story flag;
- unlock or change a choice;
- interact with an object;
- produce only flavour.

None of these consequence systems is implemented. M2 proves only this: context action → optional transcript observation → no turn advance.

## 4. Lab: collapsible sections and remembered UI

**Collapsible sections:**
- Every panel folds from its heading, which is a disclosure button with `aria-expanded`. The panels are:
  - Stage / inspection aids;
  - Trigger events;
  - Export / import;
  - Tunable values;
  - Locked.
- Every tunable section folds the same way: Portrait, Dialogue, Choices + scrollbar, Inventory, Utility buttons, Tooltip, Item-received slip, Inspector, NOTES / FILES, Objective, and Interaction timing.

**Persistence:** the lab now keeps two `localStorage` keys.

| Key | Holds |
|---|---|
| `cyoa-m2-reception-polish-lab-v1` | the tunable values, `{ schema, changes }`. Unchanged in role. It no longer stores UI fields; an older save's UI fields are read once as a fallback. |
| `cyoa-m2-reception-polish-lab-ui-v1` | `{ schema, state, view, fit, toggles, folded, scrolls: { side, stageX, stageY } }`: the representative state, PRODUCTION / LAB, fit or 1:1, the aids, the folded sections, the sidebar scroll and the stage pane's scroll. |

- The UI state is never in COPY CHANGES or COPY ALL.
- RESET (field, section or all) leaves it alone.
- A remembered state that no longer exists falls back to the opening.
- Every state is reached through the real flow, so restoring one is safe.

**X aid:**
- The **hold X UP / DOWN** aid is removed, because the X has no DOWN state.
- It is replaced by a **Show X hitbox (inspector)** toggle, which outlines the 44 × 44 button.

**New representative states:**
- **8a. OBSERVE taken**: `ask-politely`, then the real first utility button;
- **9. Tooltip - OBSERVE enabled**;
- **10. Tooltip - OBSERVE spent**.

These replace the two INSPECT tooltip states.

## 5. Lab: TRIGGER EVENTS

This is a new panel, **LAB view only**: pressing a trigger switches the view to LAB. Each trigger replays a transient effect where the game stands, using the production functions that make it in play.

| Button | What it runs |
|---|---|
| **ITEM RECEIVED** | `G.clearNotices` + `G.notifyItem('wc_key')`: the production FACILITIES KEY slip, repeatable. It was the old SHOW ITEM RECEIVED, moved here. |
| **REPLAY NPC TYPING** | The latest receptionist line is re-added with `G.addSpeech(text, 'npc')`, which starts the production typewriter. The flow then runs on as in play: the beat, then the same choices arrive. Available only at rest, when the latest line is hers. |
| **REPLAY CHOICE ARRIVAL** | The cards on show re-enter with the production `'in'` motion (`G.setChoices(list, { kind: 'in' })`, phase `arriving`). The flow takes them back to `choosing`. Display-only sample cards stay display-only. |
| **REPLAY INVENTORY SLIDE** | One arrow press's slide through the production slide curve (`G.ui.inv.slide`, as `G.stepInventory` sets it). Reception holds at most one item, so there is nowhere to scroll: the strip slides one step in and settles back where it was. |
| **TRIGGER CONTEXT ACTION (OBSERVE)** | The real first utility button's action, `G.flow.utility('context')`. It is spent after one use, so a repeat first reloads the representative state through the real flow, then takes it again. Not available while the inspector is open, because the first button is READ there. |

**What the triggers never do:**
- create a tunable change or anything in COPY CHANGES;
- touch the PRODUCTION comparison frame;
- write a file;
- persist narrative state (a reload or a state load starts over).

**Nothing was omitted.** Every requested replay runs without mutating story state, apart from OBSERVE's own transcript line, which is the action itself.

## 6. Kept from 9c4c167

All of the following are unchanged:
- the separate FILES background and the `YOUR FILES` title, with its position tunables;
- the NOTES v1 / v2 lab toggle;
- live slider updates;
- the owner-locked six-slot layout and 535 px choice baseline;
- the 71 tunables and the persisted tuning values;
- the export schema `cyoa-m2-reception-polish-lab-v1` and base SHA.

## 7. Files

| Area | Files |
|---|---|
| Game | `game/js/{rules,flow,stage,main}.js`, `game/content/reception.js` (`contextAction`), `art/ui/sprites/inspect_close.png` (new), and `inspect_close_up.png` / `inspect_close_down.png` (removed) |
| Lab | `tools/m2-reception-polish-lab/{index.html,lab.js,lab-stage.js,lab.css,README.md}` |
| QA | `game/qa/{run_qa.js,validate_route.js}`, `tools/m2-reception-polish-lab/qa/run_qa.js` |
| Docs | this file, `game/README.md`, docs/62 §6, §7, §9 and §10, and docs/63 §3, where they had become stale |

## 8. QA

These were run sequentially on the implementation commit `32ada74` plus the QA fix, in Chromium 147 and Firefox 148.

| Suite | Result |
|---|---|
| `node game/qa/validate_route.js` | **49/49**; 449 reachable states, unchanged |
| `NODE_PATH="$(npm root -g)" node game/qa/run_qa.js` | **487/487** (static 41, Chromium 223, Firefox 223) |
| `NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js` | **129/129** (static 5, Chromium 62, Firefox 62) |

No M1 layout-lab file changed, so the M1 lab was not re-run.

**The X:**
- `inspect_close.png` is 44 × 44 RGBA with hard alpha and the source palette only.
- Its silhouette mirrors left/right, top/bottom and diagonally.
- The frame weight is 7 / 7 / 7 / 7, and the ring boundaries fall at equal depths from every edge.
- The X and the opening are centred (21.5, 21.5) and the X is itself symmetrical.
- Only one close sprite is preloaded; UP/DOWN are never requested and are gone from the repository.
- On screen, the X equals the file pixel for pixel. The sprite is `pointer-events: none` inside the button, which takes the click.
- A press changes no pixel. A release outside does not close; a release inside closes.
- Enter changes nothing while held and closes on release. Escape closes. Re-activating the item closes.

**The context action:**
- The conversation row is `context / notes / files`, and OBSERVE uses `watch.png`. The old `inspect.png` glyph is never requested.
- OBSERVE is unlit while the receptionist types (`OBSERVE - NOT NOW`) and enabled at rest.
- Taking it keeps the node, the choices and the phase.
- It adds exactly one `thought`, which shows at once in parentheses in the player's face and scrolls into view.
- Once used it is inactive, with `OBSERVE - NOTHING NEW TO NOTICE`. A second click or Enter adds nothing.
- NOTES holds the observation once, unlabelled.
- A restart clears it, and keyboard activation works.
- Holding one or several items never makes the first button act on an item.
- Focusing a slot opens nothing. A click, or Enter on a focused slot, opens that item.
- The inspector row is still READ / SHOW-or-USE / blank.
- The route validator rejects malformed context actions (4 new mutants). It shows that OBSERVE changes no node, flag, item, objective or choice, is spent after one use, and is cleared by a fresh start.

**The lab:**
- PRODUCTION and LAB are pixel-identical at defaults in 14 states, including OBSERVE taken.
- The OBSERVE state and tooltips are correct, and the hold-X aid is gone. SHOW X HITBOX outlines the 44 × 44 button.
- ITEM RECEIVED replays twice, and NPC typing, choice arrival and the inventory slide replay through production code (the slide is recorded frame by frame).
- TRIGGER CONTEXT ACTION takes OBSERVE again on repeat, with one thought each time.
- The PRODUCTION frame is untouched by the triggers, and the triggers create no value or export change.
- Sections fold and unfold, and every section is collapsible.
- RESET ALL keeps the UI preferences, and the UI state is never exported and is stored apart from the values.
- After a reload, the folds, sidebar scroll, state, view and 1:1 mode are restored, and no trigger state is restored.
- All earlier lab checks still pass.

**Proof screenshots:**
- `game/qa/screenshots/`:
  - `00d_inspector_close_static.png`;
  - `00l_tooltip_observe_enabled.png`;
  - `00m_tooltip_disabled_reason.png` (OBSERVE spent);
  - `14_observe_thought_in_history.png`;
  - `09b_notes_with_observation.png`.
- `tools/m2-reception-polish-lab/qa/screenshots/`:
  - `state_observed.png`;
  - `trigger_item_received.png`;
  - `trigger_context_action.png`;
  - `lab_overview.png`.


## PMO acceptance — 2026-11-07

**Outcome: ACCEPTED FOR OWNER POLISH TUNING.**

PMO accepts the owner-directed revision at `62b79da6335c98a3e61c1f21f8aa0f2b1e6ec2d2`.

Accepted rulings:
- inspector close control uses one static, centred, symmetrical X sprite with no DOWN visual state;
- item inspection begins from direct activation of the inventory item, not from an implicit only-item fallback;
- normal-scene utility slot 1 is now a generic context-action slot rather than permanently INSPECT;
- reception proves the grammar with provisional OBSERVE;
- OBSERVE remains unavailable while NPC typing is active and becomes available when the turn reaches the choosing phase;
- context-action transcript lines are semantically distinct `thought` entries and appear in NOTES;
- polish-lab sections are collapsible and restore their UI state;
- transient gameplay events can be explicitly replayed from the lab without affecting exported tuning values.

The reception OBSERVE wording remains provisional/non-canon. The broader narrative/gameplay PMO may later replace the action, wording, or consequence model without changing the accepted generic context-action plumbing.

No further implementation pass is requested before owner tuning. M2 remains open until owner review of the polish lab and application of the exported approved changes.
