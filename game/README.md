# Reception vertical slice (M2)

The first playable slice of *The Acceptable Error* (working title), bounded by
`docs/47_M2_RECEPTION_VERTICAL_SLICE_CHARTER.md`. One location, one receptionist, one item.
The checkpoint report (route graph, state, placeholders, QA, open decisions) is
`docs/48_M2_RECEPTION_SLICE_CHECKPOINT_01.md`.

## Play it

Open `game/index.html` in Chrome or Firefox (double-click works; no server, install or build).
Keep it inside the repository: it loads the approved art and the layout lab's data by relative path.
Or, from the repository root:

```sh
python3 -m http.server 8137
```

then open <http://localhost:8137/game/index.html>.

- Click the dialogue box (or press Enter/Space) to finish a line. Scroll it to read back.
- Pick a card by clicking it, or with the arrow keys and Enter. Scroll long choice lists with the wheel or the thumb.
- Click an item in the inventory to inspect it; clicking or focusing an item also selects it, and INSPECT opens the selected item (or the only one held). READ, SHOW/USE and RETURN replace the buttons there; X or Esc closes.
- A button whose action is not available here keeps its glyph unlit, does not press, and its tooltip says why.
- Keyboard focus on a choice brings out the brass tab at the card's left edge; the mouse never does.
- NOTES shows everything said so far; FILES shows your case file. Press the button again or Esc to close.

## Files

| Path | What it is |
|---|---|
| `content/reception.js` | **All narrative content and starting state**, as plain data. Edit this to change the route. |
| `js/rules.js` | Pure state rules (conditions, effects, choices, item actions) and the route validator. Shared by the browser and Node. |
| `js/flow.js` | The dialogue-turn phase machine: typing, beat, cards arrive, choosing, sending, reply beat. |
| `js/stage.js` | Presentation: dialogue box and history, choice cards and thumb, inventory, utility buttons and tooltip, inspector, NOTES/FILES, objective. |
| `js/pixeltext.js` | Asset paths, image loading and bitmap text (ported from the lab's `core.js`). |
| `js/placeholders.js` | Labelled grey dev placeholders, drawn at runtime, for art that does not exist yet. |
| `js/main.js` | Boot and fit-to-window scaling. `?qa` in the URL exposes QA-only hooks. |
| `qa/validate_route.js` | Node route/state validation: `node game/qa/validate_route.js` |
| `qa/run_qa.js` | Playwright browser QA: `NODE_PATH="$(npm root -g)" node game/qa/run_qa.js` |
| `qa/route_results.json`, `qa/qa_results.json`, `qa/screenshots/` | Last results and owner-review evidence. |

### What it reuses, and what it leaves alone

- **Geometry, fonts and action glyphs** come from the lab's own bundle, `tools/layout-lab/data/lab_data.js`
  (built from `placement.default.json`). The slice therefore follows the owner's working lab defaults
  without copying them. Nothing here writes to the lab, and `design/ui_locked_component_contract_v1.json`
  is untouched. When the owner changes the lab defaults and rebuilds `lab_data.js`, the slice follows.
- **Behaviour** (typewriter, speaker faces and gap, card send motion, the three-piece thumb, inventory
  weight, physical presses, the no-hover rule) is ported from `tools/layout-lab/js/`. The lab is not
  modified and keeps its own QA.
- **Art** is only approved files:
  - the shell, the 29-sprite package, the fonts, the action glyphs and `art/items/bathroom_pass_slot.png`;
  - the approved reception art (docs/56, docs/57), on separate layers:
    - the scene `art/scenes/conference_hall/reception/reception_scene.png`, 314×206 shown at 4×;
    - the portrait background `art/portraits/receptionist/reception_background.png`, 564×278 at 1×;
    - the receptionist `art/portraits/receptionist/receptionist_idle.png`, 564×278 at 1×.

## Content schema (`cyoa-m2-reception-content-v1`)

```js
{
  start: 'opening',                         // first node
  speaker: 'RECEPTIONIST',                  // label used in NOTES
  initialState: { flags: {...}, inventory: [], items: {} },
  items: {
    wc_key: {
      name, slotArt, inspectArt,            // inspectArt null => labelled placeholder
      description: TEXT,                    // shown in the inspector
      read: { effects }                     // READ is offered while the item is held
    }
  },
  files: [ { if, text } ],                  // FILES shows every entry whose `if` holds
  nodes: {
    id: {
      npc: TEXT,                            // what the receptionist says on arrival
      objective: 'text',                    // optional: replaces the objective plaque text
      effects: EFFECTS,                     // optional: applied on arrival, before `npc` is chosen
      choices: [ { id, text, say?, if?, effects?, to | restart } ],
      show: { itemId: { if?, say, to, effects? } },  // optional: SHOW in the inspector, here
      use:  { itemId: { if?, say, to, effects? } },  // optional: USE in the inspector, here
      end: true                             // optional: an ending; only it may `restart`
    }
  }
}
```

- `TEXT` is a string, or a list of `{ if, text }` variants where the first whose `if` holds is used.
  The last variant must be unconditional.
- `if` (all keys must hold): `flag`, `notFlag`, `flagIs: [flag, value]`, `has: item`, `lacks: item`,
  `item: [item, mark]`, `itemNot: [item, mark]`. Marks are `inspected`, `read`, `shown`, `used`.
- `EFFECTS`: `set: { flag: value }`, `give: [item]`, `take: [item]`, `mark: [[item, mark]]`.
- A choice's `text` is the card and, unless `say` is given, the player's spoken line.
- Text may use only `A-Z a-z 0-9 space ! " ' ( ) , - . : ; ? [ ]` (what the pixel fonts can draw).
  `\n` starts a new paragraph.

`node game/qa/validate_route.js` rejects unknown keys, flags or items, missing destinations, nodes
without a card, unreachable nodes, choices or text variants nobody can see, any reachable state with
no available choice, any state from which the ending cannot be reached, and undrawable characters.

## State

The whole of the narrative state, in `G.state`:

| Field | Meaning |
|---|---|
| `node` | current dialogue node |
| `flags.appointed` | reception has made you the Examiner |
| `flags.blunt` | you asked for the bathroom curtly (changes her next line) |
| `flags.approach` | `corrected`, `cooperated` or `practical`: the first real decision |
| `flags.disputeFiled` | you filed a dispute against your own appointment |
| `flags.tagQuestioned` | you raised the key tag's return time |
| `flags.protested` | you made the last protest (it is offered once) |
| `inventory` | items held, in order |
| `items[id]` | marks on each item: `inspected`, `read`, `shown`, `used` |
| `objective` | current objective text |
| `transcript` | every line said, `{ who: 'npc' | 'player', text }` (NOTES) |

Presentation state (scroll positions, card motion, pressed buttons, the selected inventory item, which overlay is open) lives in
`G.ui` and never affects the story.
