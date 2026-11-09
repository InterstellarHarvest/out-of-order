# CYOA — General Adventure Engine Foundation v0.1

**Date:** 2026-11-08
**Status:** Architecture and documentation only. **No production code is changed by this document.** Nothing here is merged.
**Branch:** `agent/engine-foundation-design`, from `agent/m2-reception-polish-lab` at `e66e7bf` (the latest M2 line).
**Sources:**
- **Story-docs branch:** `docs/story-gameplay-study-v01` @ `0c61863`, docs/64, 67, 70 and 71 (engine readiness audit). The story-docs branch numbers its docs independently: its 56–64 are different files from this branch's 56–64. This document takes 72, which is free on both lines.
- **Production code at e66e7bf:** `game/js/{rules,flow,stage,main,pixeltext,tuning}.js`, `game/content/reception.js`, `game/qa/validate_route.js`.
- **Lab code:** `tools/m2-reception-polish-lab/narrative-study*.js` on `agent/narrative-study-lab` @ `7544c5d` (lab-only Narrative B / Focus A).

**Goal:** the smallest extension of the existing engine that lets authors write a multi-scene CYOA. It must support NPC dialogue, Narrative B, Focus A, typed choices, conditional effects, checks, saves and chapters, and each scene must get its own art. It is the same engine, with the same three files and the same shell. It is not a new framework.

---

## 0. What changes and what does not

**Unchanged:**
- the rules / flow / stage split. `rules.js` stays pure (content, state). `flow.js` stays the phase machine, and `stage.js` stays the presentation layer.
- the canonical shell `79c891e1…` and the item overlay `aaac746a…`.
- the sprite package, the fonts, the action glyphs, card art and card motion, the no-hover rule, and the inventory weight.
- the reception slice itself. It keeps running from its current v1 content file and must look identical until a separate, gated migration step (S9).

**Extended:**

| File | Today | After |
|---|---|---|
| `rules.js` | One location, NPC-only nodes and 4 effect kinds. | A story made of chapters, three modes, typed text and typed choices, conditional effects, checks, Focus return, save serialisation, and one atomic `step()` that returns events. |
| `flow.js` | One NPC turn loop tied to `window.CYOA_RECEPTION`. | The same phases plus `transition`, driven by an event queue for any story. |
| `stage.js` | `G.RECEPTION_ART`, a dialogue box with one ink per line, and hard-coded reception labels. | An art registry keyed by asset id. One text-surface implementation used three ways: dialogue box, B narration and A description. Per-segment inks and mode layers. |
| `pixeltext.js` | One ink per line, light/dark only. | Segments with their own ink inside a line, including a tinted locked Choices face (action ink, slate). |
| `main.js` | Preloads the receptionist's fixed art. | Preloads the current chapter's registered assets. |

**New files (all small):**
- `game/js/surfaces.js`: the shared typing and scrolling text surface, extracted from `stage.js` speech.
- `game/qa/validate_assets.js`
- `game/fixture.html` and `game/content/fixture/story.js`: the neutral test story.
- `game/qa/run_fixture_qa.js`

**Not built:**
- free exploration or click-to-walk
- RPG stats, currencies or a quest log
- a flowchart UI
- cutscenes and chapter title cards
- a main menu
- multiple save slots
- a second, separate thought system

---

## 1. Vocabulary (fixed terms)

| Term | Meaning | Example id |
|---|---|---|
| **story** | One content package: cast, items, files, assets, declared flags, chapters. | `engine-fixture` |
| **chapter** | Story-level unit that groups nodes. Entering one is a chapter transition. | `fx_one` |
| **scene** | An illustrated place: the left-aperture image. Many nodes share one scene, and one scene can appear in several chapters. | `fixture/room_a`, `conference_hall/reception` |
| **node** | An incident or beat: the unit authors write (docs/71 calls it an "incident"). It is unique within its chapter. | `keypad` |
| **mode** | How a node is presented: `dialogue` (NPC), `narrative` (B), `focus` (A). The item inspector is a UI context over any mode, not a mode. | |
| **surface** | Where text appears: the dialogue box, the B narration panel, or the A description area. | |
| **run** | A piece of text with a semantic role: `narration`, `speech`, `action`, `direction`, `thought`. | |
| **kind** | A choice's semantic type: `spoken`, `action`, `continue`, `system`. | |
| **cast** | A speaker: name for NOTES, plus a portrait id. | `attendant` |

---

## 2. Deliverable 1: content schema `cyoa-story-v2`

### 2.1 Story manifest

```js
{
  schema: 'cyoa-story-v2',
  id: 'engine-fixture',
  version: 1,                       // bump on any change that invalidates saves (section 5.2)
  profile: 'fixture',               // 'production' | 'fixture'; fixture allows null art (labelled DEV PLACEHOLDER)
  save: true,                       // autosave after committed steps (section 5.2); reception v1 = false
  start: 'fx_one',                  // first chapter
  initialState: { flags: {...}, inventory: [], items: {} },   // flags are declared here, story-wide
  cast:   { attendant: { name: 'ATTENDANT', portrait: 'attendant' } },
  items:  { id: { name, slotArt, inspectArt, description: TEXT, read?: { effects? } } },  // as v1
  files:  [ { if?, text } ],        // FILES, story-wide (as v1)
  contextAction?: {...},            // as v1 (docs/64); dialogue mode only until the thought contract (section 8.3)
  assets: { scenes, portraits, focus },   // section 4
  chapters: { id: CHAPTER }
}
```

### 2.2 Chapter and node

```js
CHAPTER = { title, start, scene, nodes: { id: NODE } }   // scene = default for its nodes

NODE = {
  mode: 'dialogue' | 'narrative' | 'focus',   // required
  scene?: 'location/scene',                   // overrides chapter.scene
  speaker?: castId,                           // dialogue only (required there)
  pose?: poseId, backdrop?: backgroundId,     // dialogue only: portrait layer overrides
  focus?: 'location/scene/target',            // focus only (required there)
  objective?: TEXT,                           // set on arrival (as v1)
  effects?: EFFECTS,                          // applied on arrival, before `text` variants are picked (as v1)
  text: TEXT,                                 // told on arrival (v1 `npc` is an alias)
  choices: [CHOICE],                          // at least one (as v1)
  show?: { itemId: ENTRY },                   // inspector SHOW; dialogue only
  use?:  { itemId: ENTRY },                   // inspector USE; any mode
  contextAction?: {...} | null,               // as v1
  end?: true                                  // only an end node may restart
}
```

### 2.3 Typed text: `TEXT`

`TEXT` takes one of three forms:

- **`'STRING'`**: one run in the default role for where the text appears (table below). `\n` starts a new paragraph, as in v1.
- **`[RUN, RUN, …]`**: runs joined by single spaces. A run is either:
  - a string, in the default role, or
  - an object with exactly one role key: `{ say: '…', who? }` (speech), `{ act: '…' }` (the player's action), `{ desc: '…' }` (what someone else does), or `{ think: '…' }` (reserved, section 8.3).
- **`[{ if?, text }, …]`**: conditional variants, as v1. The first variant whose condition holds wins, and the last variant must be unconditional. Each `text` may itself be a string or runs.

The default role depends on where the text appears:

| Where the text appears | Default role of a plain string |
|---|---|
| `text` of a `narrative` or `focus` node | `narration` |
| `text` of a `dialogue` node | `speech`, spoken by `node.speaker` |
| a choice's `say` (its echo), `kind: 'spoken'` | `speech`, spoken by `you` |
| a choice's `say` (its echo), `kind: 'action'` | `action`, by `you` |
| `result`, when play continues in `narrative` / `focus` | `narration` |
| `result`, when play continues in `dialogue` | `direction` |

`rules.js` normalises every `TEXT` to `paras: [[{ role, who, text }]]`. The roles are **authored, never inferred**:
- No regex for sounds; a sigh is written `{ say: 'HM.' }` or as part of a spoken string.
- No list of action ids.
- No brackets carrying meaning: v1 brackets stay literal characters.

### 2.4 Choices: `CHOICE`

```js
CHOICE = {
  id, kind: 'spoken' | 'action' | 'continue' | 'system',
  text,                    // the card. Plain words: never authored quotes or brackets (marking is presentation, section 3.5)
  say?,                    // the echo in the dialogue box, if it differs from `text` (TEXT)
  if?: COND,
  effects?: EFFECTS,
  once?: true,             // hidden after it has been taken once in this playthrough
  result?: TEXT,           // appended before the destination's own text
  check?: CHECK, pass?: OUTCOME, fail?: OUTCOME,   // section 5.1; with a check the destination lives in pass/fail
  // destination: at most one of these; with none, play STAYS at this node
  to?: nodeId,             // move within the chapter
  back?: true,             // return from an excursion (section 3.2)
  chapter?: chapterId,     // chapter transition (section 5.4)
  restart?: true           // kind 'system', end nodes only
}
OUTCOME = { result?, effects?, to? | back? | chapter? }
ENTRY   = CHOICE without id/text; `kind` defaults to 'spoken' for show, 'action' for use
```

- `continue`: text defaults to `CONTINUE`. An authored `continue` is a real choice: it is saved, validated and logged. The CONTINUE cards between paragraph groups in B are **presentation only** (section 3.4) and are never in `rules.js`.
- `system` is only used for BEGIN AGAIN (`restart`). Neither `continue` nor `system` is ever echoed as speech (docs/70).
- **Stay** (no destination):
  - The node's arrival text is not repeated, and its choices are re-evaluated.
  - The validator requires a stay choice to be `once`, carry a check, or have effects. A stay that changes nothing is an authoring error.

### 2.5 Conditions and effects

**`COND`.** Every key must hold, as in v1. Kept from v1: `flag`, `notFlag`, `flagIs`, `has`, `lacks`, `item`, `itemNot`. New:
- `passed: checkId`
- `failed: checkId`
- `untried: checkId`

**`EFFECTS`.** Either one object, or a list of objects applied in order, each with an optional `if`. That list form is the conditional-effects mechanism. Each `if` is tested against the state as it stands at that point, so it sees the entries applied before it.

```js
effects: { set: { askedCode: true } }
effects: [ { set: { askedCode: true } },
           { if: { has: 'fx_card' }, objective: 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' } ]
```

- Effect keys kept from v1: `set`, `give`, `take`, `mark`.
- New key: `objective: TEXT`, for an objective change caused by a choice rather than by a node.
- Not added: counters, stats, relationship meters. Flags cover them until a real incident needs more (docs/71 P0.3).

### 2.6 Example: NPC conversation (dialogue mode)

```js
counter: {
  mode: 'dialogue', speaker: 'attendant',
  text: [ { desc: 'THE ATTENDANT LOOKS UP FROM THE CARDS.' }, 'YES? THE DOOR, IS IT. EVERYONE WANTS THE DOOR.' ],
  choices: [
    { id: 'ask-code', kind: 'spoken', text: 'HM. WHAT IS THE CODE?', if: { notFlag: 'askedCode' },
      effects: [ { set: { askedCode: true } },
                 { if: { has: 'fx_card' }, objective: 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' } ],
      to: 'counter_code' },
    { id: 'lean', kind: 'action', text: 'LEAN ON THE COUNTER.', once: true,
      result: 'THE ATTENDANT MOVES THE CARDS OUT OF YOUR REACH.' },          // stays; result = direction
    { id: 'leave', kind: 'action', text: 'STEP AWAY FROM THE COUNTER.', back: true,
      result: 'YOU STEP AWAY FROM THE COUNTER.' }                             // back to B; result = narration
  ]
}
```

What the player sees:
- **Ask the code.** The card reads `"HM. WHAT IS THE CODE?"`. It is sent, and the dialogue box shows `HM. WHAT IS THE CODE?` unquoted, in the Choices face. Then the reply types.
- **Lean.** The card is in action ink. The cards clear, `LEAN ON THE COUNTER.` appears in action ink, and the direction follows in dark ink.

### 2.7 Example: narrative scene (Narrative B)

```js
wake: {
  mode: 'narrative', objective: 'LEAVE THE TEST ROOM.',
  text: 'YOU ARE IN A SMALL GREY ROOM WITH ONE DOOR. THE DOOR HAS A KEYPAD.\n'
      + 'A DESK STANDS AGAINST THE WALL. ITS DRAWER IS SHUT.\n'
      + 'BEHIND A GLASS COUNTER, AN ATTENDANT IS FILING CARDS. NOBODY ELSE IS HERE.',
  choices: [
    { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
    { id: 'open-drawer', kind: 'action', text: 'OPEN THE DESK DRAWER', once: true,
      result: 'YOU OPEN THE DRAWER. INSIDE IS A BLUE CARD. YOU TAKE IT.',
      effects: [ { give: ['fx_card'] },
                 { if: { flag: 'askedCode' }, objective: 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' } ] },
    { id: 'go-counter', kind: 'action', text: 'GO TO THE COUNTER', to: 'counter' }
  ]
}
```

A spoken line in B is not echoed. Its result narrates it, with the speech in quotes:

```js
{ id: 'call-out', kind: 'spoken', text: 'HELLO? IS THIS LIFT WORKING?', once: true,
  result: ['YOU CALL OUT,', { say: 'HELLO? IS THIS LIFT WORKING?' }, 'NOBODY ANSWERS. THE LIFT HUMS.'] }
```

### 2.8 Example: object focus (Focus A)

```js
keypad: {
  mode: 'focus', focus: 'fixture/room_a/keypad',
  text: 'TWELVE KEYS AND A SMALL RED LAMP. A PLATE UNDER IT SAYS: FOUR DIGITS. ONE TRY. THEN WE TALK.',
  choices: [
    { id: 'try-code', kind: 'action', text: 'TRY A CODE',
      check: { id: 'fx_door', sides: 6, need: 4, fumble: 1,
               mods: [ { if: { item: ['fx_card', 'read'] }, add: 1 }, { if: { flag: 'askedCode' }, add: 1 } ] },
      pass: { result: 'THE LAMP TURNS GREEN. THE DOOR CLICKS OPEN.', to: 'corridor' },
      fail: { result: 'THE LAMP STAYS RED. SOMEWHERE, A BELL RINGS ONCE.', to: 'side_hatch' } },
    { id: 'stop', kind: 'action', text: 'STOP EXAMINING', back: true, result: 'YOU STEP BACK FROM THE KEYPAD.' }
  ]
}
```

### 2.9 v1 compatibility and the later reception migration

`Rules.fromV1(content)` wraps `reception.js` unchanged:
- **Story shape:** a one-chapter story, with `npc`→`text` and the mode set to `dialogue`. The speaker is cast `receptionist`, named `content.speaker`.
- **Choices:** every choice gets `kind: 'spoken'`, and `say` strings are kept exactly.
- **Assets:** scene `conference_hall/reception`, with the receptionist's two portrait layers registered from today's paths.
- **Saves:** `save: false`. The adapter also keeps v1's motions: an inspector SHOW/USE clears the cards rather than sending one.

Rendering through the adapter must be **byte-identical** to today. That is the regression gate for S3–S8.

S9 is a separate, gated step. It applies the owner's rounds 3–6 grammar to reception itself, which docs/70 explicitly does not ship automatically. Two nodes, written v2-style:

```js
misassign: { mode: 'dialogue', speaker: 'receptionist', effects: { set: { appointed: true } }, objective: '…',
  text: [ { if: { flag: 'blunt' }, text: ['URGENCY NOTED.', { desc: 'SHE STAMPS SOMETHING.' }, 'THE FACILITIES ARE NOT A PUBLIC LOCATION. …'] },
          { text: ['ONE MOMENT.', { desc: 'SHE STAMPS SOMETHING.' }, 'THE FACILITIES ARE NOT A PUBLIC LOCATION. …'] } ],
  choices: [ … ] }
send_off: { …, choices: [
  { id: 'unlock', kind: 'action', text: 'UNLOCK THE EXAMINERS DOOR WITH THE KEY.', to: 'door', effects: { mark: [['wc_key', 'used']] } },
  { id: 'protest', kind: 'spoken', text: 'ONE LAST TIME: I AM NOT AN EXAMINER.', if: { notFlag: 'protested' }, … } ],
  use: { wc_key: { kind: 'action', say: 'UNLOCK THE EXAMINERS DOOR WITH THE KEY.', to: 'door' } } }
// ruling: { id: 'sigh', kind: 'spoken', text: 'SIGH. AND THE BATHROOM?', … }   a sound is speech, authored as such
```

---

## 3. Deliverable 2: state transitions and renderer

### 3.1 State (everything a save holds)

```js
{
  v: 2,
  chapter: 'fx_one', node: 'keypad',
  returnTo: 'wake' | null,           // the narrative node that opened the current excursion
  flags: {...}, inventory: [...], items: { id: [marks] },        // as v1
  objective: '…',
  transcript: [ { role, who, text, mode, scene, chapter } ],      // everything shown, in order (NOTES)
  presentFrom: 17,                   // first transcript entry not yet presented when this state was saved
  taken: [ { at: 'fx_one:wake', c: 'open-drawer' } ],             // decision log (once, flowchart later)
  checks: { fx_door: { roll: 3, bonus: 1, ok: true } },           // resolved checks: never re-rolled
  seed: 'k3v9q2',                    // per playthrough; rolls derive from it (section 5.1)
  contextDone: [...]                 // as v1 (docs/64)
}
```

Presentation state stays in `G.ui` and is never saved. That covers scroll positions, card motion, the CONTINUE group, typing progress, an open inspector or overlay, and fades.

### 3.2 Modes and excursions

```
                 to / chapter (advance)
   ┌──────────────────────────────────────────────┐
   ▼                                              │
 narrative (B) ──to──▶ focus (A) ──to──▶ focus (A) ┘
   ▲   │                  │
   │   └──to──▶ dialogue ─┤      leaving B for A or dialogue sets returnTo = that B node
   │                      │      A↔A, A↔dialogue keep it; any move into B or a chapter clears it
   └──── back ────────────┘      back: return to returnTo WITHOUT re-entering it
```

- **`back` is a return, not an entry.** The opener's arrival effects and text do not run again. Its choices re-evaluate, so `once` choices stay gone and new conditions show. The `result` appends to the B narration. This is docs/64's B→A→B, and it bounds Focus A: you can only go back one level, to the node that opened it.
- **`to` to another node is advancing.** It is a page turn forward.
- **A dialogue entered from B may also use `back`**, as in "talk to the attendant, then return to the room". A dialogue reached as a forward scene simply has no `back` choice.
- **Validator rules:** `back` is only legal in `focus` or `dialogue` nodes, and only in states where `returnTo` is set. The start node must be `narrative` or `dialogue`.

### 3.3 One atomic step: `Rules.step(story, state, input) → events`

`input` is `{ choice: id }`, `{ item: id, verb: 'read' | 'show' | 'use' }` or `{ context: true }`. The order of the step is normative:

1. **Availability.** The entry must be in `Rules.view()`. That means:
   - its `if` holds;
   - it is not a `once` choice already taken;
   - its check has not already been resolved;
   - it is not a `back` choice unless `returnTo` is set.

   Otherwise the step throws (as v1).
2. **Check.**
   1. Compute `bonus` from the state as it stands **before** this step's effects, so an attempt that uses up an item still gets its bonus.
   2. Compute `roll = H(seed, check.id)` and decide pass or fail.
   3. Record `checks[id]`, then pick `pass` or `fail`.
3. **Effects.** Apply `entry.effects`, then `outcome.effects`, each in list order with conditional entries.
4. **Record.** Push to `taken`.
5. **Echo** (dialogue mode only, kinds `spoken` and `action`). Push `say || text` to the transcript as `speech` or `action` by `you`.
6. **Destination.** `chapter`, then `to`, then `back`, then stay. Work out the new mode, scene and `returnTo`.
7. **Result.** Push the result runs to the transcript, on the destination surface (if the step stays, the current one). If the scene changes, the surface's window is reset first (section 3.6).
8. **Arrival** (for `to` or `chapter`, not for `back` or stay). Apply `node.effects`, set `objective`, and pick the `text` variant from the state after those effects. Push it to the transcript.
9. **Mark.** Set `presentFrom` to the first new transcript entry. The state is now final, and `flow.js` autosaves it if `story.save`.
10. **Return** the events (section 3.3.1).

READ, the inspector's `inspect` mark and the context action go through the same `step()`, so state only ever changes in one place. This replaces today's choose-now, enter-later split: v1 `choose()` and `enter()` stay as thin wrappers until S9, because the lab and QA call them.

#### 3.3.1 Events

`rules.js` returns these as plain data. It never touches the DOM.

```js
{ t: 'echo',  role: 'speech' | 'action', who: 'you', paras }   // dialogue mode only
{ t: 'check', id, sides, roll, bonus, need, ok, chance }        // chance = exact odds, for any later presentation
{ t: 'items', gained: [...], lost: [...] }                      // item-received slip (existing)
{ t: 'mode',  from, to }       { t: 'scene', id }      { t: 'chapter', id, title }
{ t: 'text',  surface: 'dialogue' | 'narrative' | 'focus', paras }   // results, then arrival text, in order
{ t: 'objective', text }       { t: 'end' }            { t: 'restart' }
```

`Rules.view(story, state)` is the pure read model the renderer draws from:
- mode, scene id, portrait layer ids or focus id;
- the cards `[{ id, kind, text }]`;
- the inspector verbs and the context action;
- the objective, and the transcript windows (section 3.6).

### 3.4 Flow: the same phase machine, plus `transition`

The phase names that QA reads through `body.dataset.phase` are kept:

```
typing → beat → arriving → choosing → sending → [reply-beat] → [transition] → typing …
```

| Phase | Generalisation |
|---|---|
| `typing` | Whichever surface the current `text` event targets types at that surface's speed. Click, Enter or Space finishes it, as today. |
| `beat` | `timing.beforeChoicesMs` (200). Then, in B or A, if the passage has more paragraph groups, a **presentation-only CONTINUE card** arrives instead of the node's choices. Taking it appends and types the next group. Earlier groups stay, and you can scroll back to them (owner rule, docs/70 §1). |
| `arriving`, `choosing` | Unchanged. |
| `sending` | Motion is chosen by kind: `spoken` uses the existing **send**; `action`, `continue` and `system` use the existing **clear** (the lab's B behaviour, section 8.2). |
| `reply-beat` | Only after an `echo`, so only in dialogue: the echo line is in the box, then the beat, then the next text. |
| `transition` (new) | `mode`, `scene` or `chapter` events. A cross-fade of `timing.transitionMs` (200, the lab default); input is ignored. A chapter change also waits here until the next chapter's art has decoded. |

`flow.js` drains the event list from `step()` in order, inside the existing frame loop and timer. Item slips keep their own queue (docs/61). The presentation is replayable from the state alone: a resumed game re-presents the transcript entries from `presentFrom` onward, and everything earlier appears at once.

### 3.5 Renderer: modes, surfaces and marking

| | `dialogue` | `narrative` (B) | `focus` (A) |
|---|---|---|---|
| **Scene aperture** | the node's scene, 314×206 at 4× | same | same |
| **Portrait aperture** | cast layers: background → rearFx → pose → frontFx (as today) | covered by the B overlay | the focus art, 564×278 at 1× |
| **Right-column overlay** | none (shell) | B overlay, 1920×1080 RGBA (docs/64, 70) | none (shell) |
| **Text surface** | dialogue box (speech panel, as today) | B narration panel: lab defaults x1350 y77 w522, line height 26, Dialogue face | A description in the speech-panel text area: lab defaults x1342 y360 w540, line height 24 |
| **Pacing** | types and scrolls, no groups | types and scrolls; CONTINUE between paragraph groups | types; CONTINUE pages within the box (as reviewed in the lab) |
| **Choices, inventory, objective** | unchanged geometry | unchanged | unchanged |
| **Utility row** | context action / NOTES / FILES | blank / NOTES / FILES (section 8.3) | blank / NOTES / FILES |
| **Inspector** | as today | as today; USE resolves as an action; SHOW is unavailable (no one to show it to) | same as B |

Text marking follows the owner's rules from docs/70 §1. It is drawn from the run role, never authored as characters:

| Run role | Dialogue box | Narration (B and A) | Choice card |
|---|---|---|---|
| `speech` by an NPC | Dialogue face, dark ink, no quotes | dark ink, `"quoted"` | — |
| `speech` by you | Choices face, dark ink, no quotes | dark ink, `"quoted"` | spoken card: `"quoted"` |
| `action` by you | Choices face, **action ink** | dark ink, plain | action card: **action ink** |
| `direction` | Dialogue face, dark ink, plain prose | dark ink, plain | — |
| `narration` | (not used) | dark ink | — |
| `thought` | as today: `( … )` (slate is pending, section 8.3) | pending | — |
| `continue` / `system` cards | | | dark ink, plain, never quoted |

The action ink is the lab default `#8e2c1f`. Its shade is still tunable (docs/70 §7).

**Renderer architecture:**

```
rules.js ──view()/step()──▶ flow.js (phases, event queue, timers, autosave)
                                 │ calls
                                 ▼
stage.js ── G.ART registry (section 4) ── apertures: scene · portrait layers | focus layer
         ── right-column overlays: item inspector (existing) · narrative B (new)
         ── surfaces.js: TextSurface ×3  { rect, face, lineHeight, cps, thumb, paged }
         │      dialogue box = TextSurface(speech panel)  ← replaces ui.speech, same behaviour
         │      narration    = TextSurface(B panel)       ← replaces the lab's narration canvas
         │      description  = TextSurface(A box, paged)
         ── cards: kind → text marking (quotes / action ink) on the existing card art
         ── pixeltext.js: T.draw lines of segments { text, role, ink }, ink ∈ dark | light | action | slate
```

The pixeltext change is needed because today a line has one ink, and the locked Choices face uses pre-tinted atlases. Per-segment inks need a tint pass over the dark atlas. The lab faked this with zero-width marker characters, which must not reach production.

### 3.6 History windows

The rules keep one transcript. The surfaces show windows of it:

| Surface | Shows |
|---|---|
| **Dialogue box** | `dialogue` entries since the scene last changed |
| **B narration** | `narrative` entries since the scene last changed. Focus text is *not* added to B, as in the lab: on return, B continues from where it was, plus the result. |
| **A description** | the current focus visit only |
| **NOTES** | the current chapter: narration in dark ink, speech as `NAME:` / `YOU:` lines (as today), thoughts as today |
| **FILES** | story-wide, conditional entries (as v1) |

These windows are one policy constant. Section 8.1 asks the owner to confirm the defaults.

---

## 4. Deliverable 3: asset registration contract

### 4.1 Declaration (story data)

```js
assets: {
  scenes: {                                   // id = '<location>/<scene>' (owner layout 2026-11-04)
    'conference_hall/reception': 'art/scenes/conference_hall/reception/reception_scene.png'
  },
  portraits: {                                // id = cast portrait id
    receptionist: {
      backgrounds: { reception: 'art/portraits/receptionist/reception_background.png' },
      poses:       { idle: 'art/portraits/receptionist/receptionist_idle.png' },
      background: 'reception', pose: 'idle'   // defaults; node.backdrop / node.pose override
    }
  },
  focus: {                                    // id = '<location>/<scene>/<target>'
    'fixture/room_a/keypad': 'art/scenes/fixture/room_a/focus/keypad.png'
  }
}
// items keep their own fields (as v1): slotArt 'art/items/<name>_slot.png', inspectArt 'art/items/<name>_inspect.png'
```

**Art classes.** All are whole-pixel, drawn without smoothing, and checked by `validate_assets.js` from the PNG header:

| Class | Size and density | Placement | Source |
|---|---|---|---|
| scene | 314×206, drawn at 4× | scene aperture origin; the aperture clips 1 px right and 2 px bottom | docs/54 |
| portrait background, pose | 564×278 each, at 1× | portrait aperture, separate layers, never flattened | docs/54, 57 |
| focus close-up | 564×278 at 1× | portrait aperture, one layer | portrait density applied to A (section 8.2) |
| item slot | 96×96 | inventory slot | owner layout |
| item inspect | 565×451 | inspector art rect | docs/58 |
| right-column overlay | 1920×1080 RGBA, stage coordinates | above the shell | item-overlay precedent, docs/64 |

**Documents are not a separate art class:**
- A document the player **carries** is an item: slot and inspect art, READ, and description variants.
- A document **fixed in the scene**, like a notice or a file drawer, is a focus target, with its words in `text`.
- The case file is FILES.

**UI art is engine-owned, not story data:**
- the shell
- the item overlay
- the B overlay, to be promoted from `review/narrative-mode-b-art-study/…candidate-a-overlay.png` (with the x1919 fix) to `art/ui/shell/narrative-overlay.png`
- the slip, the NOTES and FILES panels, sprites and glyphs

### 4.2 Runtime and validation

- **Registry.** `stage.js` builds `G.ART` from `story.assets`, with image names `scene:<id>`, `portrait:<cast>:<layer>:<id>` and `focus:<id>`. This replaces `G.RECEPTION_ART`, which today sits in `stage.js` at line 116, is read by `main.js` at line 44, and has its aria labels at lines 149 and 153. Each aperture's aria label comes from content: the scene's and cast's names.
- **Preload.** At boot `main.js` decodes:
  - the UI art (as today);
  - every item's art;
  - every asset referenced by the current chapter's nodes.

  At a chapter change, the `transition` phase waits until the next chapter's assets have decoded, so "ready" never arrives with art still to come in.
- **Placeholders.** `null` art becomes the existing labelled DEV PLACEHOLDER (`placeholders.js`), with the asset id written on it. This is allowed **only** with `profile: 'fixture'`.
- **`validate_assets.js`** (Node). It fails if:
  - an id is referenced but not registered;
  - an asset is registered but never referenced, which would leave it orphaned;
  - a file is missing;
  - a size does not match its class;
  - a path is under `source/`, `originals/` or `review/` in a production profile;
  - an overlay is not 1920×1080.

  Optional sha256 pins, as `docs/CANONICAL_UI_SHELL.md` does for the shell.

---

## 5. Deliverable 4: checks, save/resume, objectives, chapters

### 5.1 Item and dice checks (IN: one check grammar; OUT: balance numbers and presentation art)

```js
CHECK = { id, sides: 6 | 100, need, fumble?: n, mods?: [ { if: COND, add: ±n } ], cap?: n, certain?: true }
// success  ⇔  raw > fumble  AND  raw + clamp(Σ add of mods whose if holds, -cap, cap) >= need
```

**One formula covers both of docs/57's models:**
- **Model A, 1d6:** `sides 6, need 4, fumble 1`, items +1.
- **Model B, d100:** base 45% is `sides 100, need 56`; +20 points is `add 20`; the 95% ceiling is `fumble 5`.

The owner's choice between them (section 8.1) is a **data choice, not engine work**.

- **Rolls.** `raw = 1 + (FNV-1a32(seed + ':' + check.id) mod sides)`. Each playthrough gets one seed: `crypto.getRandomValues` in play, and `?seed=` or a fixed value in QA.
  - The same seed and the same check give the same roll, whatever the order of play.
  - **Reloading a save cannot re-roll.** The seed is saved, and a resolved check's choice is gone (`checks[id]`).
  - A deliberate retry is authored as a new check id behind a condition. docs/57 calls this "a new circumstance".
- **Validator rules for checks:**
  - Both outcomes must be reachable from at least one reachable state.
  - **No check may reach 100%** with any combination of mods unless it is marked `certain: true`, because an item must not become a guaranteed bypass (docs/71 P0.4).
  - A base chance of 0% is an error; use `if` to gate the choice instead.
  - The state walk explores pass and fail from every state in which each is possible.
- **v0 presentation is hidden.** The choice is shown with no odds, and the outcome is narrated by `pass.result` or `fail.result`. The `check` event carries `chance`, `roll` and `bonus`, so qualitative, percentage or die-shown presentation can be added later without schema change.
- **Out of scope:** dice art, odds labels, balance tables, consumable-item rules beyond `take`, and repeatable or cumulative checks.

### 5.2 Save and resume (IN: one autosave slot; OUT: slots UI, menu, rewind)

- **When it saves.** After every `step()` that commits: a choice, READ, an inspect mark, USE, SHOW, or the context action. It never saves on a presentation-only CONTINUE, a scroll, or opening an overlay.
- **What it saves.** The state from section 3.1, exactly as JSON in `localStorage['cyoa-save:<story.id>']`:

  ```js
  { schema: 'cyoa-save-v1', story: id, version, savedAt, state }
  ```

  Every storage access is wrapped in try/catch, because storage can be blocked or a file:// page may not have it.
- **On boot.**
  - A valid save is restored silently. Transcript entries before `presentFrom` appear at once, and the rest type on.
  - A different `version`, an unknown node or chapter, or an undeclared flag or item means the save is refused and the game starts fresh. Saves are never half-migrated.
  - `?new` and `?nosave` are for development and QA.
- **Duplicates.** None are possible:
  - `give` is idempotent;
  - `once` choices and resolved checks are in the state;
  - the item slip announces only the step's `items` event, never a diff at boot.
- **Reception stays `save: false`.** A reload of the reception slice still starts fresh until S9 and the owner's save policy, so all 520 game QA checks keep their meaning.
- **Out of scope:**
  - several slots, a resume prompt or main menu (they need UI art);
  - undo or rewind;
  - saving in the middle of a presentation or animation;
  - cloud saves.

### 5.3 Objective changes (IN)

- `node.objective` sets the objective on arrival. `effects.objective` sets it from a choice or outcome, which can be conditional.
- There is one visible goal, on the existing plaque, redrawn as today.
- The validator checks the charset, and browser QA checks that every reachable objective fits the plaque.
- Not added: a quest log, objective history or a change animation.

### 5.4 Chapter transitions (IN: a minimal transition; OUT: title cards and cutscenes)

A `chapter: id` on a choice or outcome:
- clears `returnTo`;
- enters the target chapter's `start` node;
- emits `chapter`, `scene` and `mode` events.

The renderer runs the `transition` phase, which preloads the art and cross-fades the scene. The new chapter's first node is an ordinary establishing passage in B and sets the new objective. NOTES opens on the new chapter, under the default in section 3.6.

**Out of scope:** title beats, case-file animations, recaps, branch maps. Section 8.1 asks the owner whether the first real chapter needs a title beat.

---

## 6. Deliverable 5: implementation sequence and acceptance tests

### 6.1 Sequence (each step is one commit or a small series, with its QA, on `agent/engine-v0`)

| Step | Touches | Delivers | Gate |
|---|---|---|---|
| **S1. Rules v2 core** | `rules.js`, `qa/validate_route.js`, new `qa/validate_story.js` | Loader and normaliser, `fromV1`, typed runs, kinds, modes, conditional effects, `step()` and events, `view()`, excursions and `back`, stay and `once`, `objective` effect, chapters, validator v2 | Route **49/49 unchanged** (reception via `fromV1`, same `reachableStates`); EF-N1…N4, N9…N11 |
| **S2. Checks and save serialisation** | `rules.js`, the validators | `CHECK`, the hashed roll, `passed` / `failed` / `untried`, both-outcome walk, guaranteed-bypass guard, `serialize` and `restore` with versioning | EF-N5…N8 |
| **S3. Asset registry and preload** | `stage.js` (registry only), `main.js`, new `qa/validate_assets.js` | `G.ART` from `story.assets`; chapter preload; aria labels from content | Game QA count unchanged, screenshots byte-identical (bar the known timing captures); lab QA baseline; EF-A1…A3 |
| **S4. Flow on events (dialogue)** | `flow.js` | The event queue; phases kept, `transition` added; `G.content` and `CYOA_RECEPTION` decoupled | Same as S3 |
| **S5. Text surfaces and inks** | new `surfaces.js`, `stage.js` speech, `pixeltext.js` | TextSurface; segment inks with the tinted locked face; card marking by kind (v1 = no marking) | Same as S3, plus EF-B4 on the fixture |
| **S6. Narrative B and Focus A** | `stage.js`, `tuning.js` (`narrative`, `focus` and `timing.transitionMs`, taken from the lab defaults), the B overlay asset | B surface and overlay, CONTINUE groups, A layer and paging, cross-fade, NOTES windows | EF-B2, B3, B7, B8 |
| **S7. Fixture** | `game/fixture.html`, `game/content/fixture/story.js`, `qa/run_fixture_qa.js` | The playable fixture in section 6.3 | EF-B1…B11 in Chromium and Firefox |
| **S8. Save wiring** | `flow.js`, `main.js` | Autosave, silent resume, `presentFrom`, `?seed`, `?new`, `?nosave` | EF-B9 |
| **S9. Reception migration** (gated) | `content/reception.js` → v2 | Rounds 3–6 grammar in production: action kinds, `desc` runs, sounds as speech, OBSERVE ink | Joint M2 and thought-PMO sign-off; new baselines on purpose |

- **S1–S2** only touch `rules.js` and QA. They can start before Round 2 lands (section 8.4).
- **S3–S8** touch the files the M2 PMO owns, and each step must prove reception is unchanged.
- **The narrative-study lab adapter** is retired after S6. The lab's narrative section then drives the production modes, or is frozen. That is the M2 PMO's call.
- **Imported from `7544c5d`:** values and the corrected overlay PNG only, never code wholesale.

### 6.2 Acceptance tests

**Node tests** (`validate_route.js` / `validate_story.js`):

| ID | Proves |
|---|---|
| EF-N1 | Reception via `fromV1`: all 49 existing checks pass, with the same stats. |
| EF-N2 | The fixture validates: no dead end; every node, choice, variant, file entry and check outcome is reachable; an ending is reachable from every state, including both outcomes of every check. |
| EF-N3 | The validator rejects (one mutant each): a missing `kind`; a quote or bracket authored in card text; `back` outside A or dialogue; a reachable `back` with no `returnTo`; a focus node without a focus id; a dialogue node without a speaker; an unknown run key; a run with two role keys; a stay with no effect; a missing chapter; SHOW in a B node; a conditional last variant; an unregistered asset id. |
| EF-N4 | Step order: a check's bonus is computed before an effect in the same step that `take`s the item; conditional effects see the entries applied before them. |
| EF-N5 | Checks: the same seed gives the same rolls and transcript; across seeds 1…200 both outcomes occur, with and without the item; the item raises the measured success rate; no mod set reaches 100%; a mutant with a reachable 100% is rejected unless `certain`. |
| EF-N6 | No re-roll: after resolution the choice is gone, and still gone after `restore()`; `checks[id]` is unchanged. |
| EF-N7 | Save round trip: `restore(serialize(s))` deep-equals `s`. A script interrupted by save and restore ends in the same state as the uninterrupted one. The inventory has no duplicates, and `once` choices are not offered again. |
| EF-N8 | A save from another version or story, or one naming an unknown node, is refused without a throw. |
| EF-N9 | Focus return: `back` lands on the opener without its arrival effects or text; its `once` choices stay gone. |
| EF-N10 | A delayed callback: the chapter-two arrival text differs by check outcome and by whether the attendant was asked. |
| EF-N11 | Transcript roles: an action is never stored as speech; spoken echoes are stored unquoted; B and A results are narration; dialogue results are direction. |

**Asset tests** (`validate_assets.js`):

| ID | Proves |
|---|---|
| EF-A1 | Every referenced id is registered, and every registered asset is referenced. |
| EF-A2 | Every file exists and its PNG size matches its class (section 4.1). |
| EF-A3 | The production profile has no null art and no `source/`, `originals/` or `review/` paths. The fixture profile has nothing but `null` or registered paths. |

**Browser tests** (Playwright, Chromium and Firefox):

| ID | Proves |
|---|---|
| EF-B1 | Reception regression: the game QA count is unchanged, screenshots are byte-identical except the known timing captures, the polish-lab QA baseline holds, and the route is 49/49. |
| EF-B2 | B: the passage types at 40 cps; it scrolls with the thumb on overflow; CONTINUE appears between paragraph groups; earlier groups stay in place and can be scrolled back to; choices appear only after the last group. |
| EF-B3 | B→A→B: cross-fade; focus art in the portrait aperture; the description in the speech panel; on return the B log is intact and ends with the result. |
| EF-B4 | Dialogue: the spoken card is quoted and its echo is unquoted in the Choices face; the action card and its echo are in action ink; the direction is in dark ink; the motion is send or clear by kind; every quoted card fits its card. |
| EF-B5 | Items: the slip appears once per gain; READ in the inspector reveals the variant; USE in B resolves as an action, with no echo; SHOW is unavailable in B. |
| EF-B6 | Check: `?seed` values chosen for pass and for fail each narrate their outcome; no odds or die are drawn; the card is gone after resolution. |
| EF-B7 | Scene and chapter change: the scene aperture image swaps; every pixel outside the apertures and surfaces is identical to the shell; the objective plaque text changes and fits. |
| EF-B8 | NOTES shows the chapter's history under the section 3.6 policy, with NPC and `YOU:` labels; FILES shows exactly the entries whose conditions hold. |
| EF-B9 | Save and resume: reload after a committed choice gives the same node, mode, scene, objective, inventory, B log and cards; unpresented text types on; no slip repeats; a used check stays used. |
| EF-B10 | Keyboard only: the whole fixture is played to the end with arrows, Enter, Space and Esc; with `prefers-reduced-motion`, cross-fades become cuts. |
| EF-B11 | `ready=true`; no console errors; the static guard finds no hover or outline styling and no `G.layout` writes outside the lab. |

docs/71's 10-point definition of done maps onto these tests:

| docs/71 point | Tests |
|---|---|
| 1 | B2 |
| 2 | B3, N9 |
| 3 | B4 |
| 4 | B5 |
| 5 | B6, N5, N6 |
| 6 | B7 |
| 7 | B8 |
| 8 | B9, N7 |
| 9 | N10, N2 |
| 10 | N2, N3, A1–A3, B1, B10 |

docs/71's "presentation/content engine v0" milestone is reached at **S1 + S3–S7 without the check and save rows**.

### 6.3 The fixture (neutral, non-canon, placeholder art)

Its route covers every point in docs/71's definition of done:

- B with three paragraphs;
- Focus A with a check;
- a found card that can be READ, gives a check bonus and is USEd on the lift;
- an attendant dialogue with a spoken line, a sound, an action and a direction;
- a second scene;
- a second chapter with callbacks;
- an ending.

All art is `null`, drawn as labelled DEV PLACEHOLDERs. All text stays within the font charset.

```js
// game/content/fixture/story.js (PROPOSED. Engine test content: not story canon, never shipped as the game.)
(function (root) {
  'use strict';
  var STORY = {
    schema: 'cyoa-story-v2', id: 'engine-fixture', version: 1, profile: 'fixture', save: true, start: 'fx_one',
    initialState: { flags: { askedCode: false, usedCard: false }, inventory: [], items: {} },
    cast: { attendant: { name: 'ATTENDANT', portrait: 'attendant' } },
    assets: {
      scenes: { 'fixture/room_a': null, 'fixture/room_b': null, 'fixture/room_c': null },
      portraits: { attendant: { backgrounds: { booth: null }, poses: { idle: null }, background: 'booth', pose: 'idle' } },
      focus: { 'fixture/room_a/keypad': null }
    },
    items: {
      fx_card: { name: 'BLUE CARD', slotArt: null, inspectArt: null,
        description: [
          { if: { itemNot: ['fx_card', 'read'] }, text: 'A BLUE PLASTIC CARD WITH A LINE OF SMALL PRINT ON THE BACK.' },
          { text: 'A BLUE PLASTIC CARD. THE SMALL PRINT READS: DOOR CODE BEGINS WITH 4.' }
        ],
        read: {} }
    },
    files: [
      { text: 'SUBJECT: PRESENT. PURPOSE: UNDER TEST.' },
      { if: { has: 'fx_card' }, text: 'ISSUED: ONE BLUE CARD. NOT SIGNED FOR.' },
      { if: { passed: 'fx_door' }, text: 'DOOR: OPENED BY CODE.' },
      { if: { failed: 'fx_door' }, text: 'DOOR: ALARM RAISED. NO DISCREPANCY NOTED.' }
    ],
    chapters: {
      fx_one: { title: 'FIXTURE ONE', scene: 'fixture/room_a', start: 'wake', nodes: {
        wake: {
          mode: 'narrative', objective: 'LEAVE THE TEST ROOM.',
          text: 'YOU ARE IN A SMALL GREY ROOM WITH ONE DOOR. THE DOOR HAS A KEYPAD.\n'
              + 'A DESK STANDS AGAINST THE WALL. ITS DRAWER IS SHUT.\n'
              + 'BEHIND A GLASS COUNTER, AN ATTENDANT IS FILING CARDS. NOBODY ELSE IS HERE.',
          choices: [
            { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
            { id: 'open-drawer', kind: 'action', text: 'OPEN THE DESK DRAWER', once: true,
              result: 'YOU OPEN THE DRAWER. INSIDE IS A BLUE CARD. YOU TAKE IT.',
              effects: [ { give: ['fx_card'] },
                         { if: { flag: 'askedCode' }, objective: 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' } ] },
            { id: 'go-counter', kind: 'action', text: 'GO TO THE COUNTER', to: 'counter' }
          ]
        },
        keypad: {
          mode: 'focus', focus: 'fixture/room_a/keypad',
          text: 'TWELVE KEYS AND A SMALL RED LAMP. A PLATE UNDER IT SAYS: FOUR DIGITS. ONE TRY. THEN WE TALK.',
          choices: [
            { id: 'try-code', kind: 'action', text: 'TRY A CODE',
              check: { id: 'fx_door', sides: 6, need: 4, fumble: 1,
                       mods: [ { if: { item: ['fx_card', 'read'] }, add: 1 }, { if: { flag: 'askedCode' }, add: 1 } ] },
              pass: { result: 'THE LAMP TURNS GREEN. THE DOOR CLICKS OPEN.', to: 'corridor' },
              fail: { result: 'THE LAMP STAYS RED. SOMEWHERE, A BELL RINGS ONCE.', to: 'side_hatch' } },
            { id: 'stop', kind: 'action', text: 'STOP EXAMINING', back: true, result: 'YOU STEP BACK FROM THE KEYPAD.' }
          ]
        },
        counter: {
          mode: 'dialogue', speaker: 'attendant',
          text: [ { desc: 'THE ATTENDANT LOOKS UP FROM THE CARDS.' }, 'YES? THE DOOR, IS IT. EVERYONE WANTS THE DOOR.' ],
          choices: [
            { id: 'ask-code', kind: 'spoken', text: 'HM. WHAT IS THE CODE?', if: { notFlag: 'askedCode' },
              effects: [ { set: { askedCode: true } },
                         { if: { has: 'fx_card' }, objective: 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' } ],
              to: 'counter_code' },
            { id: 'lean', kind: 'action', text: 'LEAN ON THE COUNTER.', once: true,
              result: 'THE ATTENDANT MOVES THE CARDS OUT OF YOUR REACH.' },
            { id: 'leave', kind: 'action', text: 'STEP AWAY FROM THE COUNTER.', back: true,
              result: 'YOU STEP AWAY FROM THE COUNTER.' }
          ]
        },
        counter_code: {
          mode: 'dialogue', speaker: 'attendant',
          text: 'IT STARTS WITH A FOUR. THE REST CHANGES. I WOULD NOT KNOW THE REST. I ONLY WORK HERE.',
          choices: [
            { id: 'thanks', kind: 'spoken', text: 'THANK YOU. I THINK.', back: true, result: 'YOU LEAVE THE COUNTER.' }
          ]
        },
        side_hatch: {
          mode: 'narrative',
          text: 'A PANEL BESIDE THE DOOR SLIDES OPEN ON ITS OWN. BEHIND IT IS A NARROW SERVICE PASSAGE. THE ATTENDANT DOES NOT LOOK UP.',
          choices: [ { id: 'crawl', kind: 'action', text: 'CRAWL THROUGH THE PASSAGE', to: 'corridor' } ]
        },
        corridor: {
          mode: 'narrative', scene: 'fixture/room_b', objective: 'TAKE THE LIFT UP.',
          text: [
            { if: { passed: 'fx_door' }, text: 'YOU WALK THROUGH THE PROPER DOOR INTO A LONG CORRIDOR. AT THE END IS A LIFT WITH A CARD SLOT.' },
            { text: 'YOU CLIMB OUT INTO A LONG CORRIDOR, DUSTY TO THE ELBOWS. AT THE END IS A LIFT WITH A CARD SLOT.' }
          ],
          choices: [
            { id: 'call-lift', kind: 'action', text: 'PRESS THE LIFT BUTTON', to: 'lift' },
            { id: 'call-out', kind: 'spoken', text: 'HELLO? IS THIS LIFT WORKING?', once: true,
              result: ['YOU CALL OUT,', { say: 'HELLO? IS THIS LIFT WORKING?' }, 'NOBODY ANSWERS. THE LIFT HUMS.'] }
          ],
          use: { fx_card: { result: 'YOU PUSH THE BLUE CARD INTO THE SLOT.', effects: { take: ['fx_card'], set: { usedCard: true } }, to: 'lift' } }
        },
        lift: {
          mode: 'narrative',
          text: [
            { if: { flag: 'usedCard' }, text: 'THE LIFT DOORS OPEN AT ONCE. THE SLOT KEEPS THE CARD. A SIGN INSIDE SAYS: UP ONLY.' },
            { text: 'THE LIFT ARRIVES AFTER A LONG TIME. A SIGN INSIDE SAYS: UP ONLY.' }
          ],
          choices: [ { id: 'go-up', kind: 'action', text: 'STEP INTO THE LIFT', chapter: 'fx_two' } ]
        }
      } },
      fx_two: { title: 'FIXTURE TWO', scene: 'fixture/room_c', start: 'arrive', nodes: {
        arrive: {
          mode: 'narrative', objective: 'END OF THE FIXTURE.',
          text: [
            { if: { failed: 'fx_door' }, text: 'THE LIFT OPENS ON A WHITE ROOM. A NOTICE SAYS THAT AN ALARM WAS RAISED ON THE FLOOR BELOW, AND THAT IT HAS BEEN FILED.' },
            { if: { flag: 'askedCode' }, text: 'THE LIFT OPENS ON A WHITE ROOM. A NOTE ON THE WALL SAYS: THE CODE STARTS WITH A FOUR. THE ATTENDANT, IT SEEMS, WRITES THINGS DOWN.' },
            { text: 'THE LIFT OPENS ON A WHITE ROOM. IT IS EMPTY, AND VERY CLEAN.' }
          ],
          choices: [ { id: 'finish', kind: 'continue', to: 'end' } ]
        },
        end: {
          mode: 'narrative', end: true, text: 'END OF THE ENGINE FIXTURE.',
          choices: [ { id: 'restart', kind: 'system', text: 'BEGIN AGAIN.', restart: true } ]
        }
      } }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = STORY;
  else root.CYOA_STORY = STORY;
})(this);
```

**Check odds** (d6, need 4, a raw 1 always fails):

| Preparation | Chance |
|---|---|
| none | 3/6 |
| card read *or* attendant asked | 4/6 |
| both | 5/6 |

Never certain, and both outcomes are reachable from every preparation state.

**Design check, done for this document (not engine code; nothing committed).** A throwaway Node interpreter of sections 3.3 and 5.1 walked the fixture above:

- **342 reachable states**, 80 of them able to end;
- no dead end; the ending is reachable from every state;
- every node, choice, text variant, FILES entry and both `fx_door` outcomes are reached;
- odds measured at 3/6, 4/6 and 5/6;
- every string is drawable with the locked font's charset.

To show it can fail, three mutants were each rejected: a certain check, a missing destination, and an em-dash. S1/S2 rebuild this properly in `rules.js`.

---

## 7. What this does not do

- No new engine, framework, build step or dependency. The code is still plain scripts that run from file://.
- No wholesale merge of `agent/narrative-study-lab`, and no fast-forward of the M2 line. The production game, the polish-lab worktree and its live session, the story-docs branch and every other worktree are untouched.
- No change to settled UI or narrative decisions. Section 8.2 lists only the details the owner's rules did not cover.
- No production art. No new UI art is required for v0 except promoting the reviewed B overlay.

---

## 8. Decisions, dependencies and the integration boundary

### 8.1 Decisions that genuinely need the owner (five; each has a default so work is not blocked)

| # | Decision | Recommendation | Needed before |
|---|---|---|---|
| O1 | **Dice:** 1d6 or d100; what the player sees (hidden / qualitative / percentage / die shown). | 1d6, hidden, with the outcome narrated. The engine supports both, and the switch is data (section 5.1). | Writing the first real check; not the engine. |
| O2 | **Saves and failure:** autosave cadence; resume silently or with a prompt; what a fatal outcome allows (retry from the last checkpoint, or restart). | Autosave after every committed choice; one slot; silent resume for now; fatal outcomes retry from the last autosave. A prompt needs UI art later. | S8 production wiring. The fixture uses the defaults and has no fatal end. |
| O3 | **History:** what the B log and dialogue box keep across scene changes; what NOTES keeps across chapters. | On-screen surfaces reset at a scene change; NOTES = the current chapter; FILES = story-wide. One constant (section 3.6). | S6 sign-off. |
| O4 | **B overlay:** confirm Candidate 1 (PMO and lab default) for promotion to `art/ui/shell/`. Only if it was not already chosen (docs/70 item 5). | Candidate 1, with the x1919 fix. | S6 asset import. |
| O5 | **Chapter title beat** for the first real chapter. | None in v0. If one is wanted, it gets an art brief at E4. | Writing chapter 1; not the engine. |

### 8.2 Defaults this design takes (the owner sees them at fixture review; any one can be vetoed)

- **Card motion by kind, everywhere.** Spoken cards send; action, CONTINUE and system cards clear. This extends the lab's B behaviour to dialogue mode.
- **Results show on the destination surface.** A Focus outcome that leaves the room is narrated at the start of the next B passage.
- **Focus A description follows the narration column.** Speech is quoted and there is one ink. It keeps the lab's paged CONTINUE, so authors keep A text short.
- **Focus art density.** Focus art is 564×278 at 1×, the same as the portrait, in `art/scenes/<location>/<scene>/focus/<target>.png`. The art brief confirms this at the first commission.
- **Reduced motion cuts only the cross-fades.** The game has no reduced-motion handling today. Typing and card motion are unchanged, and click-to-finish already exists.
- **Lab values are the starting point.** B and A geometry, 40 cps, 200 ms before choices, a 200 ms cross-fade and `#8e2c1f` move into `G.TUNING`. They stay tunable in the polish lab.
- **Reception never autosaves** before S9.

### 8.3 Cross-PMO dependencies

**M2 PMO:**
- The owner-approved **Round 2 set** is promoted on the M2 line by its owner, as authorised in docs/70: two-line tooltip, colon atlas fix, 500 ms slip fade-in, NOTES v2, and the B-overlay x1919 fix carried with the overlay.
- It is **pending, not re-opened**. This design assumes it lands first and never re-implements it.
- docs/70 §5's table still says "do not auto-promote" for the slip and NOTES v2. The owner ruling at the top of docs/70 supersedes that table.
- The M2 owner's COPY CHANGES export is also still pending (M2 close).

**Thought PMO:**
- OBSERVE and thoughts are theirs. The engine reserves the `think` run, keeps `contextAction` and the `who: 'thought'` rendering exactly as they are, and offers the context action **in dialogue mode only** until their contract answers docs/70 §4's four questions.
- Slate ink for thoughts lands with that contract, not before.

**Story PMO:**
- The story PMO owns all real content. The fixture is not canon.
- docs/71 E4 (content start gate) opens after S7, with O1–O3 answered.

### 8.4 Proposed integration boundary (to agree before any production code)

1. **This branch** is docs only. Its doc may be copied to the story-docs branch, and it is never merged as code.
2. **Implementation** happens on `agent/engine-v0`, branched from the M2 line **after Round 2 lands**. S1–S2 touch only `rules.js` and QA, which Round 2 does not change, so they may start earlier and rebase later.
3. **S3–S8** change `stage.js`, `flow.js`, `main.js` and `pixeltext.js`, which the M2 PMO owns. Each step needs that PMO's go-ahead and must pass reception QA unchanged: the game count, screenshot identity, route 49/49 and the polish-lab baseline. Engine steps are rebased onto the M2 line, never the other way round.
4. **S9** changes the reception's look on purpose, applying rounds 3–6 and OBSERVE ink. It is a joint M2 + thought-PMO step with its own owner review and new baselines.
5. **Nothing reaches `main`** until the owner and the M2 PMO agree. No step force-pushes, resets, stashes or edits another session's worktree.
