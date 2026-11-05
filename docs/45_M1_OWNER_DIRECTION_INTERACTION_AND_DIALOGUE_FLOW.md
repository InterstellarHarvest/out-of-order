# CYOA M1 — Owner Direction: Interaction Rules, Lab State and Dialogue Turn Flow

**Date:** 2026-11-01 to 2026-11-02
**Branch:** `agent/m1-live-tuning-devtools` (not merged)
**Status:** Owner direction recorded for later sessions. The placement values in the lab are still the owner's work in progress, not approved geometry. The dialogue turn flow is gameplay and is not implemented.

## 1. Interaction rules (owner)

- **Interaction must look physical.** The UI is full pixel art, so an element shows interaction by physically changing: it moves, slides or presses. A web-style state does not count.
- **Hover never adds a border, outline, glow or highlight, not even as an option.** This supersedes the hover wording in `26_M1_UI_ASSETIZATION_AND_RUNTIME_PREP.md` (lines 71 and 123) and `31_M1_COMPONENT_ART_BRIEF.md` (line 18), which still allow brightening, fills or outlines. Those docs have not been edited.
- **Choice cards are dialogue lines, not buttons.** They should not press like a button.
- **Inventory scrolling has weight.** Slots and items slide together as one strip, with a restrained Balatro-like overshoot and settle. This follows `26_M1_UI_ASSETIZATION_AND_RUNTIME_PREP.md`, "Inventory slide motion".
- **Hover marker:** the owner approved option A, a 14×12 brass tab that slides out from under the card's left frame. It lives at `tools/m1-ui-placement-lab/candidates/choice_marker/choice_marker_tab.png` (SHA-256 `982ed250b40d661340d09d569b5cf437884223816afe28be68e28c4053ee05b8`), outside the approved package. The owner's current layout has hover set to Nothing.
- **New art needs the owner's approval before any work starts.**

## 2. What the lab does now

`tools/m1-ui-placement-lab/index.html` opens from `file://`. Its README covers the controls; these are the additions from this session:

- The Live Tuning panel is docked on the right.
- **Inventory scroll motion:** on/off, slide time, overshoot, settle and trailing lag.
- **Choice hover:** Nothing, or the brass tab.
- **Choice click:**
  - Card presses.
  - Others dim. This is kept for comparison, though it is a colour change, not a physical one.
  - Others slide away.
  - **Choice sends**, the default: the others slide away, then the chosen card rises, accelerating, and disappears behind the divider. Following the turn flow in section 4, its line is added below the NPC's at once, in the Choices face, pushing the NPC's line up (scroll back to read it). After a beat (**Beat before NPC answer**, 400ms by default) a sample NPC answer types in below it in the Dialogue face. After a hold, every card slides back in.
- **Card width and Card height %:** narrow or shorten the cards by dropping strips from the middle of the parchment. Nothing is scaled, and all four corners stay pixel-exact. Card height % scales all four line-count versions together. **Viewport height** sets the box.
- **Defaults:** `data/placement.default.json` holds the owner's current layout: 6 slots, gap 20, arrows 45×69, utility 135×114, cards 535 wide at x 1324, y 527. The choice box is 331px tall with cards at 99% (79, 107, 135 and 162px) and a 5px gap, so the top and bottom margins mirror exactly: one row of panel background between the frame and the cards.
- **QA layout:** the behaviour checks run against `qa/fixtures/placement.qa_baseline.json`, so changing the defaults does not break QA. The real defaults have separate checks.

QA at the commit that adds this note: lab **1726/1726** (Chromium and Firefox), package **231/231**.

## 3. Sprite package correction

`choice_2line_c` and `choice_4line_b` in the locked ZIP had a stray black line in rows 0–1, cut off from the card by transparent rows. With the owner's authorisation, `approved_sprite_package/v1/build_package.py` now clears those two rows (`CORRECTIONS`) and copies every other pixel unchanged.

- The locked ZIP is not rewritten.
- The manifest keeps each original hash as `correction.source_sha256`.
- The atlas hash changed from `25e96344…` to `bf636c75…`. The lab still imports placements saved against the old atlas.
- **This correction exists only on this branch.** The package's own branch, `agent/m1-approved-spritesheet-toggle-demo`, still has the line.

## 4. Dialogue turn flow (owner direction, gameplay, not built)

1. An NPC portrait speaks; their line types into the dialogue box.
2. When the typing finishes, the choices slide in from the right.
3. The player picks a card: the others slide away, and the chosen card rises behind the divider (the lab's Choice sends).
4. **The player's line is added below the NPC's line, instantly,** at the moment the card vanishes. It pushes the NPC's text up rather than replacing it, so the player can scroll back to read it (owner, 2026-11-03; this supersedes the earlier "NPC text disappears" direction).
5. **A beat pause**, around 300–500ms as a starting point.
6. **The NPC's response types in below the player's line.** If it pushes earlier lines up and out of view, that is fine; they stay in the box to scroll back to.
7. **The choice panel stays empty** until the NPC's response has finished typing, then the next choices slide in.

### Confirmed by the owner (2026-11-04)

- **The player's line is told apart by its typeface:** Choices face for the player, Dialogue face for the NPC (section 5), with the speaker gap between them.
- **A short beat** (about 150–250ms) after the NPC finishes typing, before the choices arrive.
- **Skipping:** clicking the dialogue box finishes the typing, and the choices then follow after the same beat.
- **Ignore input while cards are moving.**
- **Each new set of choices** starts scrolled to the top, and the thumb appears only once the cards have arrived.
- **Keyboard and controller focus** moves to the first card when they arrive.
- **Endings and single actions** still get a card, such as LEAVE or CONTINUE, so the panel is never empty without a reason.
- **Scrolling back** in the dialogue box reaches the player's line after the choices arrive.
- **A transcript** of past lines belongs in NOTES or JOURNAL. The journal will probably have an index, or sections for each location.

The lab's Choice sends follows steps 3 to 6 with a fixed sample answer. Where it still differs: the cards slide back in after a hold, to the same set, rather than a new set arriving.

## 5. Typeface trial (2026-11-02)

The owner finds the locked font too thin in places: some letters are hard to read without the letters around them. It has not been rejected. The owner does not want to hand-edit font pixels; the font should be generated.

- `scripts/bake_fonts.py` bakes OFL pixel fonts into the same atlas format, at each font's own pixel size with anti-aliasing off, then enlarges them by a whole number. Sizes come in whole-number steps because pixel fonts only stay even at those.
- **Candidates (20 faces, after the owner's changes on 2026-11-03):**
  - Jersey 15 at 1×, 2× and 3×; Jersey 10 at 1× and 2×; Jersey 20 at 1×.
  - Micro 5 at 2× and 3×; Press Start 2P at 2×.
  - Tiny5 at 2× and 3×.
  - Ark Pixel 10 at 2×; Ark Pixel 12 at 2× and 3×.
  - Kenney Pixel Square at 2× and 3×; Kenney High Square at 2×; Kenney Mini Square at 2×, 3× and 4×.
  - The line-height sliders now reach 72px, so the large faces (Jersey 15 3× has 63px lines) can be judged without overlapping.
- **Removed by the owner as never likely to fit:** Press Start 2P 1×, Jersey 25, Ark Pixel 10 1×, every Kenney face without Square in its name, and (2026-11-03) Ark Pixel 12 1× and Kenney High Square 1×. Jersey 15 2× was cut, then brought back with 3× on 2026-11-03. A save naming a removed face loads that role on the locked font.
- **Owner preference:** the owner likes Press Start 2P, but finds it wide, tiny at 1× and too large at 2×. The closest in-between candidates are Ark Pixel 10 at 2× (Press Start's blocky look, narrower, 16px capitals) and Kenney Pixel Square at 2× (14px).
- **Licences:** Kenney fonts are CC0; all others are OFL. `fonts/sources/` holds each source with its licence. Ark Pixel and Tiny5 are trimmed to the lab's characters: a permitted modification that gives byte-identical atlases.
- **Rejected:**
  - VT323: its strokes are 1px at its natural size, and its shapes break when doubled.
  - Silkscreen and Sixtyfour: they never render crisp.
  - Pixel Operator: no reliable source was found.
- **Live Tuning → Typeface** sets four separate choices, at the owner's request: Dialogue (NPC speech), Choices (cards), Labels (buttons and item names) and Objective (title and text). All default to the locked font.
- **The player's lines take the Choices face, the NPC's the Dialogue face (owner, 2026-11-03).** The dialogue box can hold both at once: NPC Speech → **Box shows → Your line + NPC reply** shows them together at rest, and Choice sends shows them in the turn flow. Your line appears at once; only the NPC types. **Gap between speakers** (NPC Speech, 8px by default) adds space where the speaker changes, at the owner's request; a gap at the top of the box is not drawn.
- **Labels will not be used as they are (owner, 2026-11-03).** Item sprites fill the inventory slots and the action buttons will carry glyphs, with hover tooltips naming each action (section 6). The Labels menu stays in the lab for now, but its choice will not be needed once the owner posts their JSON.
- **Owner's current pick (2026-11-03), now the lab defaults:** Dialogue Jersey 15 1×; Choices the locked font; Objective Tiny5 3× (body at 889, 958, 522 wide, 25px lines); Labels the locked font (not a decision, see above). Not approved geometry or a final typeface.
- **The locked font may be hand-edited by the owner** (2026-11-03), unlike the baked faces. It is not editable in place today: its two pre-coloured atlases are regenerated from the locked ZIP by `build_package.py` and pinned by hash in both QAs. Making it editable means one editable glyph sheet as the source, with dark and light derived from it, and the same single rebuild command planned for the other sprites.
- **First read:**
  - Jersey 15 1× is the strongest body candidate.
  - Press Start 2P 2× is too wide for the current labels.
- **Tinting:** baked faces are white and are tinted at draw time. A third ink, for example to mark the player's lines, therefore costs no new art.

## 6. Action-button tooltips (owner direction, 2026-11-04, not built)

- **Each action button gets a hover tooltip** with the action's name in a word or two, such as INSPECT, READ or SHOW. A player moving quickly toward a choice should know at once what a glyph does.
- **Simple, styled after the UI frame** (its colours and materials) but **not pixel art.**
- **The text uses one of the lab's chosen faces** (owner, 2026-11-04): the locked font or a baked face from the Typeface trial. Only the tooltip's box is not pixel art, so the no-browser-text rule still holds. The owner chose **Press Start 2P 2×** for it (the Labels role, now the lab default).
- **It does not break the hover rule in section 1.** The button itself does not change on hover; the tooltip is a separate element beside it.
- **The text follows the button's current action,** since the buttons change in item inspection (Read, Use, Show, Return; `12_M1_INTERACTION_STRESS_TESTS.md`).

To settle when it is built (not owner-confirmed):

- **Placement.** The buttons sit at y 930–1044 of 1080, so a tooltip below them has about 36px and covers the bottom frame. One above them overlaps the choice panel.
- **Timing.** "Immediately" suggests no delay, or at most about 100ms.
- **Keyboard and touch.** Show on keyboard focus too. Touch has no hover, so it needs another trigger, such as press-and-hold.

## 7. Item inspector layout (owner direction, 2026-11-04, not built)

Clicking an inventory item switches the right column at once, with no animation:

- **The portrait window grows downward** until its bottom edge sits where the dialogue box's bottom edge is now (about y 520). It does not have to be exactly square: from the 564×278 aperture at (1333, 44), that gives about 564×476. The item's large sprite fills it.
- **The choices box stays as it is,** with its scrollbar, and holds the item's description in place of the choices.
- **The three action buttons stay.** They are disabled or swapped depending on context, for example to READ, USE or SHOW.
- **A small close button marked X** sits in the portrait window's top-right corner, over the sprite. It is square and looks pressable and three-dimensional, like the action buttons.
- This replaces the earlier idea of a square portrait with the dialogue box covering the choices and buttons.

**Art (owner, later, with ChatGPT/Codex when the inventory items are made):**

- A second right column for inspector mode, drawn as a **transparent PNG at exactly 1920×1080** with only the new column painted, laid over the main shell.
- PNG rather than JPG. It needs transparency and lossless pixels, and a mostly empty PNG compresses small.
- The close button's up and down sprites.

## 8. Repository layout (owner decisions, 2026-11-04)

- **Masters never go into git.** That means PSDs, and anything in an `originals` or `source` folder, such as the 512px cutouts or the supplied images. They stay local only. Git holds only exported assets, docs, manifests and tools.
- **Planned folders on main:**
  - `art/ui/shell/`, `art/ui/sprites/`, `art/ui/fonts/`;
  - `art/actions/`: one sprite per action, named by action, such as `inspect.png`;
  - `art/items/`: one flat folder, with each item's two sizes told apart by filename;
  - `art/portraits/`;
  - `art/scenes/<location>/<scene>`, such as `conference_hall/reception` or `spaceship/hangar`. Chapter folders may come later.
- **No `icons/` folder** until a UI icon such as a settings gear or a save disk is needed.
- **Cleanup plan:**
  1. Commit the lab work.
  2. Tag every branch tip as `archive/<name>`.
  3. Build one branch from main in the new layout, holding only the owner's picks, and merge it.
  4. Delete the other branches.
  5. Keep the local worktree `CYOA-action-buttons-batch-2` as the image archive.
  6. Replace the loose `Experiments & Projects/CYOA` folder with a clone of main.
- **Fonts on main:** the locked font and the three chosen faces: Jersey 15 1× (dialogue), Tiny5 3× (objective) and Press Start 2P 2× (labels and tooltips). The baked atlases and licence texts go in git; the `.ttf` sources stay local.
- **The choice-marker tab** goes into `art/ui/sprites/`, unused for now.
- **The old locked-components ZIP stays off main** (archive tags only).
- **Main carries the lab** with the current defaults as the working layout. The owner may still tweak it locally. The `.github` workflows, which only checked the old review branch, are dropped.
- **The loose `Experiments & Projects/CYOA` folder:** `layout final.psd` and its `layout-final.png` move, unchanged, into the local-only source folder. Its PNG differs from the canonical shell, so it is renamed `local_layout-final.png`, and the canonical copy sits beside it as `layout-final.png`.

**Owner's action picks (2026-11-04), for `art/actions/`:**

| Action | File(s) | From |
|---|---|---|
| INSPECT | `inspect.png` | v4 magnifier |
| NOTES | `notes.png` | v5 typewriter |
| JOURNAL (may be renamed, e.g. FILES) | `journal.png` | v3 file_drawer |
| READ | `read.png` | v5 read |
| USE | `use.png` | v5 keys2 |
| SHOW | `show_badge.png`, `show_id.png` | v5 badge, v3 id_card |
| RETURN | `return.png` | v5 return2 (does not suit "go back") |
| WAIT | `wait_1.png`, `wait_2.png` (picked at random) | v4 ticket, v3 ticket (an hourglass may read better) |
| CALL | `call.png` | v4 phone |
| STAMP | `stamp.png` | v4 stamp_wood_clean |
| RING | `ring.png` | v3 bell |
| SUBMIT | `submit.png` | v5 form27b6 (kept as an easter egg) |
| PULL | `pull.png` | v4 lever |
| LEAVE | `leave.png` | v3 exit |
| LISTEN | `listen.png` | v5 headphone |
| TALK | `talk_mic.png`, `talk_intercom.png` (by context) | v3 mic, v5 intercom |
| WATCH | `watch.png` | v4 camera |
| BRIBE | `bribe.png` | v5 bribe2 with the "100" replaced by a plain seal |

The bathroom pass (v4) becomes an item, `art/items/bathroom_pass_slot.png`, rather than an action. Each item has a `_slot` (96×96) and an `_inspect` (large) sprite.

## 9. Open items

- **Docs and package:**
  - Reconcile the hover wording in docs 26 and 31 with section 1.
  - Carry the card correction onto the sprite package branch, or merge in an order that keeps it.
- **Layout:** the owner is still choosing final layout values in the lab. Do not ask for final dimensions or approval until the owner offers them.
- **Remote use:** the owner works through a VS Code tunnel. Serve the worktree root on port 8137 with a larger listen queue, because the plain `python3 -m http.server` drops the burst of requests that comes through the tunnel:

  ```sh
  python3 -c "import http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; h.test(HandlerClass=h.SimpleHTTPRequestHandler, ServerClass=h.ThreadingHTTPServer, port=8137, bind='127.0.0.1')"
  ```

  Forward port 8137 as Private and open `/tools/layout-lab/index.html`. Autosave is per address, so move layouts between machines with the lab's JSON Copy and Import.
