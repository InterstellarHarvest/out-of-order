# M2 reception polish lab

The final visual and interaction tuning gate for the M2 reception slice (docs/62).

It runs the **production game** (`game/js/*`, `game/game.css`, the committed art), not a mockup. The lab lets the owner adjust small placement and timing values, flip between PRODUCTION and LAB, and export the changes. The changes are then applied back to the game in a separate step.

## Open it

From the repository root (or the worktree root):

```sh
python3 -c "import http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; h.test(HandlerClass=h.SimpleHTTPRequestHandler, ServerClass=h.ThreadingHTTPServer, port=8137, bind='127.0.0.1')"
```

<http://127.0.0.1:8137/tools/m2-reception-polish-lab/index.html>

It needs the server, because it uses frames on the same origin. A window at least about 2400 × 1150 shows the controls and the 1:1 stage together. Otherwise use **FIT TO WINDOW** for a scaled preview, then switch back to **1:1 EXACT PIXELS** to judge pixels.

## Use it

1. Pick a **State**: opening, the three-choice decision, long history, item received, the inspector before and after READ, NOTES, FILES, OBSERVE taken, the tooltips, the ending, and the choice-card samples.
2. Adjust values in **Tunable values**:
   - each row shows its production value;
   - edit a row with the control that fits the value (owner, 2026-11-08; `controls.js`): positions, sizes and counts with a slider to drag and watch live, plus **−/+** (1 px; Shift: 10) and the number box for exact steps; timings and speeds with a slider and an exact number box; a few named choices with radio buttons (the production or study value is tagged); many named choices (the narration face) in a dropdown; on / off with a checkbox. A row's **reset** appears once it is changed. Every change shows live;
   - **NOTES background** (NOTES / FILES section) switches the NOTES panel between v1 and the owner's v2 candidate;
   - **reset** returns one value to production; changed rows are highlighted.
3. Flip **PRODUCTION / LAB** (keys **P**, **L**, or **Space**) to compare.
4. Use the **Stage / inspection aids** as needed:
   - **Finish typing**, **Freeze motion**;
   - hide the shell, scene, portrait background, receptionist or FX;
   - bounds outlines, **Show X hitbox (inspector)**, and the coordinates readout.

   These aids are never exported.
5. **Trigger events** replay a transient effect on the LAB frame, where the game stands, with the production code: **ITEM RECEIVED**, **REPLAY NPC TYPING**, **REPLAY CHOICE ARRIVAL**, **REPLAY INVENTORY SLIDE**, **TRIGGER CONTEXT ACTION (OBSERVE)**. They switch the view to LAB, change no value or export, and nothing they do is saved.
6. Every section folds from its heading. Folded sections, scroll positions, the state, PRODUCTION / LAB and the preview mode are remembered across reloads.
7. **COPY CHANGES JSON** and send the result back. **COPY ALL VALUES JSON** exports every tunable. **IMPORT JSON** loads an export after validating it.

**Owner's lab defaults (2026-11-08):** a lab starts with two LAB values on top of production: the item slip's **Fade in** at **500 ms** and **NOTES background v2** (the panel without the metal corner plates). They are ordinary lab changes: highlighted, in **COPY CHANGES**, and cleared by **RESET ALL TO PRODUCTION**. A lab adds them once (it records that in its storage), so a reset is not undone by the next reload. They live in `tunables.js` (`OWNER_DEFAULTS`).

**Resets:** **RESET ALL TO PRODUCTION**, **Reset section**, and the per-row **reset**.

**Tooltip reason line:** an action that is not available keeps its label as is on the first line; the reason (NOT NOW, NOT AVAILABLE HERE...) is on a second, smaller line. **Tooltip → Reason line face** compares the Labels face at half size (production) with the Dialogue and Objective faces; **Gap between label and reason** sets the spacing.

**Storage:** lab values are saved in this page's `localStorage` (`cyoa-m2-reception-polish-lab-v1`); the lab's own UI state is kept apart under `cyoa-m2-reception-polish-lab-ui-v1`, is never exported, and RESET leaves it alone. The game never reads either.

## Narrative Study (experimental preview)

A lab-only preview of **Narrative B** and **Focus A** (docs/64–68 on `docs/story-gameplay-study-v01`), on the same stage, scaling, aids and QA as the reception states. **It is not the production game's narrative engine. The game has none yet.** No `game/` file, M2 content, shell, sprite or font is changed. Its text is representative test text, not story canon.

**States** (in their own group in **State**):

| State | Shows |
|---|---|
| NB-1 | B: a short passage and three action choices; the unused parchment is left blank |
| NB-2 | B: a longer passage that fits the panel |
| NB-3 | B: the first part of a long passage, with a single **CONTINUE** card |
| NB-4 | B: the whole long passage, added on part by part through CONTINUE, scrolled, with the authored choices |
| NA-1 | A: the keypad close-up, reached through **EXAMINE THE KEYPAD** |
| NB-5 | B → A → B, played by hand: click **EXAMINE THE KEYPAD**, then **PRESS THE KEYS AT RANDOM** or **STOP EXAMINING** |
| NB-6 | B: back from A, the narration continues below the earlier passage |
| NB-7 | B: action and spoken cards side by side (take the spoken one: what you said is told as speech) |
| NB-8 | Talking vs action on the real reception dialogue: the production conversation (stage directions, the player's [SIGH.] - a sound, so speech - and an OBSERVE thought) re-marked with the current style |
| NB-9 | Talking vs action at the door: the real conversation through the protest to the unlocked door; the player's action choices (GO TO THE EXAMINERS DOOR., UNLOCK THE EXAMINERS DOOR WITH THE KEY.) in the action ink, her drawer as a description, and the action card STEP THROUGH INTO THE CORRIDOR. in the action ink; the protest (ONE LAST TIME: I AM NOT AN EXAMINER.) was a quoted card and is unquoted in the box |
| REF | the existing reception dialogue, unchanged, through the production flow |

**What it does:**
- **B** keeps the scene. The Candidate 1 overlay (or Candidate 2) covers the portrait and speech regions, and the narration starts at the top of the panel. It works like the dialogue box (owner, 2026-11-08): new text types on below what is there (at the dialogue's 40 chars / s), and the box follows it; once it stops, the dialogue's own scroll thumb shows when there is more than fits, and the wheel scrolls back. A choice's result continues the narration. A long passage waits for **CONTINUE** between groups of whole paragraphs that fit the panel together; a paragraph longer than the panel simply types on and scrolls. The earlier study's separate replacing pages, replacing results, spoken-style action sends and quoted cards were retired once the owner chose (2026-11-08); a saved value from them is carried over (no CONTINUE) or dropped, never the other saved values.
- The narration is in the second person, present tense ("YOU STEP BACK."). Spoken words are in quotation marks and the narration stays in one dark ink (the **Talking vs action** rule, below).
- **A** brings back the normal shell. A labelled **LAB PLACEHOLDER** keypad is drawn at runtime in the portrait aperture; it is not an art file and not an asset order. The description sits in the speech panel's text area, with the object's own choices below it. Leaving A returns to B with a new passage.
- Cards, scrollbar, inventory, Current Objective and footer use the production code and stay in place. An **action** leaves with the production slide-away. A **spoken** line uses the production send, but its result is narrated. Neither is written into the transcript or the dialogue history.
- A card you click in one frame is also taken in the other, so a PRODUCTION / LAB flip compares the same moment. While a preview is on show, those buttons read **STUDY DEFAULTS** and **LAB + STUDY VALUES**, and the header carries an **EXPERIMENTAL PREVIEW** badge. The utility buttons, the inventory inspector and the reception-only triggers (NPC typing, context action) do nothing in a preview.
- Click the narration to finish a reveal. **RESTART THIS PREVIEW** reloads the state.

**Controls** (Narrative Study panel; whole numbers, bounded; defaults are the static proofs' values, not production values):

| Group | Controls |
|---|---|
| Narrative B surface | Candidate 1 / Candidate 2 overlay |
| Narrative B text | X, Y, wrap width (x + width stays on the parchment, ≤ 1908), bottom safe margin, face (Dialogue / Choices / Labels / Objective, all approved baked faces), line spacing |
| Passage length + continuation | CONTINUE between paragraph groups (checkbox; off: the whole passage types on and scrolls); max lines per CONTINUE group (0 = all that fit); long-passage test text (4 paragraphs / one very long paragraph / 6 long paragraphs) |
| Focus A description | X, Y, wrap width, line spacing (inside the speech panel) |
| Typing + transitions | typing speed (40 = the dialogue's; 0 = all at once), pause before choices, B ↔ A cross-fade (0 = cut) |
| Talking vs action | the owner's rule (default, 2026-11-08) or brackets / parentheses (the game today). Owner's rule, narration: one dark ink, anyone's speech in quotation marks, actions plain. Dialogue box: nobody is quoted; the player's actions (a [bracketed] part, or a whole action choice: unlock, unlock-after, to-door, enter-corridor) take the action ink, without brackets; a sigh or other vocal sound ([SIGH.], [AHEM.], [HM.] ...) is speech; her stage directions read as plain descriptions in the dark ink ([STAMP.] becomes SHE STAMPS SOMETHING.); OBSERVE's thought keeps the game's parentheses and is drawn in slate (**OBSERVE's lines in slate**, on by default). Action ink: red ribbon / faded brown / slate. Choice cards (owner, 2026-11-08), in NB-8 / NB-9 and in Narrative B / Focus A: **Action choice cards in the action ink** (on by default) paints a card whose whole line is an action in the action ink; **Spoken choice cards in quotation marks** (on by default) shows a spoken card's words in quotes ("THEN PLEASE ISSUE ME THE KEY."; a sigh is quoted with its words). Taken, the line reaches the dialogue box without the quotes. CONTINUE and BEGIN AGAIN. are neither. Only the card's drawing changes: its text, accessible name and the line it sends are the production ones. Every spoken reception choice still fits its card when quoted (QA) |

Changes apply live to the LAB frame. The other frame keeps the study defaults.

**Kept apart from production:** the values are stored under `cyoa-m2-reception-polish-lab-narrative-study-v1`. They export with **COPY NARRATIVE STUDY JSON** / **COPY ALL STUDY VALUES** (schema `cyoa-m2-narrative-study-v1`, with an EXPERIMENTAL note) and come back in with **IMPORT NARRATIVE JSON**. Each import refuses the other schema. **RESET NARRATIVE STUDY** clears only these values. **RESET ALL TO PRODUCTION** never touches them, and the production COPY CHANGES / COPY ALL never include them. The stage frames get the values from the lab page in memory and never read storage. The aid **Narration / description box** outlines the text box and its safe surface.

**Review overlays:** `review/narrative-mode-b-art-study/narrative-mode-b-candidate-{a,b}-overlay.png`, from `agent/narrative-mode-b-art-study` (Candidate 1 = `a`, Candidate 2 = `b`). Both arrived with a stray cream column at x 1919, outside the frame's dark edge (a 1 px light line at the panel's right edge, owner 2026-11-08); there, and only there, each now repeats column 1918 (`a` `0dca8af3…` → `ebc7ccd0…`, `b` `3b163752…` → `dddb6be4…`; QA proves no other pixel changed). They are review assets only and live outside this folder, which holds no art.

## Files

| File | Role |
|---|---|
| `index.html`, `lab.css`, `lab.js` | the lab page: PRODUCTION / LAB, export / import, persistence |
| `controls.js` | the value controls shared by both panels: one widget per kind of value (slider with −/+, slider, radio, dropdown, checkbox) |
| `tunables.js` | the registry of every tunable: key, label, production source path, bounds, read / write |
| `stage.html` | a stage frame that loads the production game scripts and CSS from `game/` |
| `lab-apply.js` | in a stage frame, before the stage is built: `?mode=lab` writes the lab values into `G.TUNING` / `G.layout`; `?mode=production` writes nothing |
| `lab-stage.js` | in a stage frame, after boot: representative states (driven through the real flow), live values (`applyValues` → `G.rebuildStage`), inspection aids |
| `narrative-study.js` | Narrative Study: the experimental value registry (bounds, defaults, safe surfaces, overlay pins), loaded by the page and the frames |
| `narrative-study-stage.js` | Narrative Study: the lab-only preview adapter in a stage frame (fixtures, pagination, B / A layers, choices, live values) |
| `narrative-study-panel.js` | Narrative Study: the panel on the lab page (controls, own storage, export / import / reset, header labels) |
| `qa/run_qa.js` | lab QA (`NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js`) |
