# CYOA M2 — Reception Slice, Checkpoint 01 (structural slice, for PMO/owner review)

**Date:** 2026-11-05
**Branch:** `agent/m2-reception-slice` (not merged). Started from `main` at `5d42b52`.
**Authority:** `docs/47_M2_RECEPTION_VERTICAL_SLICE_CHARTER.md`. Interaction rules: `docs/45`.
**Status:** Playable end to end, start to ending. Stopped here for review before adding content.
All copy is placeholder writing; all new visual elements are labelled dev placeholders.

Play: open `game/index.html`. How it is built, the content schema and the state are in `game/README.md`.

## 1. Architecture

```
game/
  index.html, game.css
  content/reception.js   narrative content + starting state (data only; PMO edits here)
  js/rules.js            pure state rules + route validator (browser and Node)
  js/flow.js             the dialogue-turn phase machine
  js/stage.js            presentation (dialogue, cards, thumb, inventory, buttons, inspector, NOTES/FILES)
  js/pixeltext.js        asset paths, image loading, bitmap text
  js/placeholders.js     runtime-drawn, labelled placeholders
  js/main.js             boot, fit-to-window
  qa/validate_route.js   route/state validation (Node)
  qa/run_qa.js           browser QA (Playwright)
```

Decisions:

1. **Lab untouched, behaviour ported.** The lab's proven behaviours were ported into `game/js/` rather than
   refactoring the lab into shared modules, so the lab and its QA stay exactly as they were. The cost is
   two copies of the typewriter/card/inventory code; if the slice is kept, the lab could later consume
   `game/js/` instead.
2. **Geometry is read, not copied.** The slice loads the lab's generated bundle
   (`tools/layout-lab/data/lab_data.js`), so it always uses the owner's current lab defaults. The locked
   geometry contract is not touched or re-exported.
3. **Content is data, rules are pure.** `content/reception.js` has no code paths; `rules.js` has no DOM.
   The same rules run in the browser and in the validator, so the validator tests what the game does.
4. **One phase machine owns input.** Only the `choosing` phase accepts a choice, an item click, INSPECT or
   SHOW/USE; every other phase ignores them. NOTES/FILES and the inventory arrows work at any time,
   because they cannot change the story.
5. **No new art files.** Placeholders are drawn at runtime on hatched grey and say DEV PLACEHOLDER.
6. **No new systems.** No stats, currency, skills, reputation, quests, dice, saving or combat.

## 2. Implemented route

```
opening ── ask-politely ─────────────┐
        └─ ask-bluntly  [blunt] ─────┴─> misassign [appointed]
misassign ── correct    [approach=corrected]  ─> dispute
          ├─ cooperate  [approach=cooperated] ─> procedure
          └─ practical  [approach=practical]  ─> facilities
dispute ── rule ─> ruling [disputeFiled] ── sigh ─> facilities
        └─ give-up ─> facilities
procedure ── standard-issue ─> issue
          └─ bathroom-first ─> facilities
facilities ── ask-key ─> issue
issue [give key] ── confirm-unread   (tag not read) ─> confirm_blind ── onward-blind ─┐
                 ├─ confirm-read     (tag read)     ─> confirm_read  ── onward-read  ─┤
                 ├─ question-tag     (tag read)     ─> tag_question  ── onward-tag   ─┤
                 └─ SHOW key         (tag read)     ─> tag_question                   │
send_off  <───────────────────────────────────────────────────────────────────────────┘
send_off ── unlock ─> door          (line varies by approach / dispute)
         ├─ USE key ─> door
         └─ protest (once) ─> last_protest ── to-door ─> send_off_after
send_off_after ── unlock-after ─> door
               └─ USE key ─> door
door (line varies by tagQuestioned) ── enter-corridor ─> ending
ending ── BEGIN AGAIN ─> opening (fresh state)
```

READ on the key is available from `issue` onward. 15 nodes, 23 choices, 2 SHOW/USE entry points per
node where offered, 1 ending. The validator explores 449 reachable states (96 at the ending).

### What the slice proves

- **Misassignment:** asking where the bathroom is makes you the Examiner, because only personnel would ask.
- **Decision point:** correct the mistake / cooperate / pursue the bathroom.
- **Consequences:** her send-off line differs for each of the three approaches, and again if you filed a
  dispute; the opening's blunt request changes her next line; a protest is offered once.
- **Item:** the bathroom-pass art is the **facilities key**. It is issued into the inventory, and she asks you
  to check the tag. Without READ you can only confirm blind (she notes nobody ever reads it). READ reveals the
  tag says the key was already returned today at 4:52, in your handwriting; that changes the choices,
  enables SHOW at the desk, changes the closing line, and adds a FILES entry. At the door, the key's USE
  opens it.
- **Closing beat:** the facilities are closed *pending examination*, and you are the examiner. Room Four is
  waiting; someone there is already typing.
- **Tone:** comic inconvenience (Thursday sentences), bureaucratic wrongness (disputing yourself), modest
  unease (a key returned before it was issued; "if anyone asks, you have always been here"). Nothing
  explains the Exchange or fixes any truth model.

## 3. Interaction contract (docs/45, docs/47 §4)

| Requirement | Implemented as |
|---|---|
| NPC line types, beat, choices slide in | `typing` → `beat` (200ms) → `arriving` (cards slide in from the right, 40ms stagger) |
| Choose; others leave; chosen sends | lab "Choice sends": others slide away, chosen rises behind the divider |
| Player line at once, Choices face | added when the card vanishes; never typed |
| Beat, NPC reply in Dialogue face | `reply-beat` (lab `beatMs`, 400ms), then `typing` |
| Next choices only after the reply | the panel is empty until the reply finishes |
| Click/tap to finish typing | click the dialogue box, or Enter/Space anywhere but a control |
| Input ignored while cards move | only `choosing` accepts input |
| Keyboard focus to first choice | on arrival; arrows/Home/End move, Enter/Space choose |
| New sets start at the top | scroll reset; thumb shown only after arrival |
| Dialogue history scrollable | every line stays in the box; wheel/arrow keys scroll back |
| Choice overflow independent | separate scroll, thumb and wheel target; tested both ways |
| Single actions still a card | e.g. `[SIGH.] AND THE BATHROOM?`, `BEGIN AGAIN.` |
| Transcript in NOTES or FILES | NOTES: full transcript; FILES: case file |
| No hover border/outline/glow/fill | no `:hover` rule; styles and pixels compared before/after hover |
| Cards are lines, not buttons | cards never press; buttons and arrows press with their DOWN sprites |

## 4. Placeholders (art still owed)

| Needed | Placeholder now | Path when approved |
|---|---|---|
| Reception scene | grey hatched panel, labelled, listing intended contents | `art/scenes/conference_hall/reception/` |
| Receptionist portrait | grey hatched panel, "now speaking: the receptionist" | `art/portraits/` |
| Key inspect art | the 96px slot sprite at 3x on a labelled panel | `art/items/bathroom_pass_inspect.png` |
| Inspector right-column overlay | labelled panel at 1316,28 598x497 | 1920x1080 transparent PNG (docs/45 §7) |
| Inspector X button UP/DOWN | grey square with a bitmap X, 2px press | sprites, 44x44 used now |
| Tooltip box | flat dark box, 1px inset line (CSS) | treatment per docs/45 §6; face already Press Start 2P 2x |
| NOTES / FILES panel | labelled panel over the scene window | not yet in the art list: owner decision |

## 5. QA

- Route validation (`node game/qa/validate_route.js`): **36/36**, including 11 deliberate content faults
  (missing destination, empty node, orphan node, impossible choice, conditional dead end, closed loop,
  flag typo, undrawable character, conditional last variant, misplaced restart, no ending), each rejected.
- Browser QA (`game/qa/run_qa.js`): **119/119 in Chromium** (12 static + 107 browser). Covers the full
  turn and its timing, skip, rapid input during arrival and send, keyboard navigation and focus, choice
  overflow and reset-to-top, dialogue scroll-back, independence of the two scrolls, inventory one-item
  stepping with slide and presses, the item's inspect/READ/SHOW/USE consequences, NOTES/FILES, the ending
  and restart, a replay with a different consequence, hover (styles and pixels), file:// and scaled windows.
- **The suite was run against copies with eight deliberate faults** (no input lock, hover brightening,
  no beat before the cards, the player's line typed, the thumb shown while cards arrive, a two-item
  inventory step, coupled scrolls, an item without effect). It fails on all eight. The first round
  missed two of them (hover brightening, typed player line); the checks were tightened until both were
  caught. A ninth fault (no reset to top) proved to have no visible effect, since the panel empties
  between sets and the scroll clamps to the top, so it was replaced.
- **Firefox was not run in this environment**: the Playwright Firefox build could not be downloaded
  (network policy denied `cdn.playwright.dev`). The suite runs Firefox by default; run it locally.
- The lab's own QA was run unchanged in Chromium: 981/981. Its outputs were not committed.
- M1 assets: the static checks confirm every committed byte of `art/`, `design/`, the lab, `README.md`
  and the existing docs is identical to `5d42b52`, and that nothing was added to `art/`, `design/` or the lab.

## 6. For owner/PMO decision

1. **Disabled action buttons** are blank (no glyph) and do not press; the tooltip says e.g. "SHOW: NOT NOW".
2. **Keyboard focus on a card** is shown by its text sliding 8px right. The approved brass tab is the alternative.
3. **NOTES and FILES** open over the scene window. Do they need panel art, or a different home?
4. **INSPECT in conversation** opens the leftmost visible item. Scene inspection would need scene hotspots.
5. **Naming:** the bathroom-pass art is used as the "FACILITIES KEY" (a WC key on a fob). Keep, or rename?
6. **Casing:** copy is all capitals, as in the M1 samples. The faces include lower case if wanted.
7. **Stray pixels in approved card sprites:** rows 0–1 of `choice_1line_a`, `choice_1line_b`,
   `choice_2line_a`, `choice_2line_b`, `choice_3line_b` and `choice_4line_a` hold sparse dark pixels that
   show just above those cards, like the two corrected in M1. Not changed; a correction needs the owner.
8. **Story placeholders:** the office title (from docs/01), the 4:52 tag and the closing beat are proposals.
9. **Empty slots:** the inventory always shows its six slot frames, filled from the left.
