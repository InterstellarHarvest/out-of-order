# CYOA M2 — Reception Polish Lab

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-polish-lab`, created by PMO from `6472cecb377a6e00484f92cdee55f6500858daa3`, the accepted player-facing-art-complete checkpoint.  
**Lab:** `tools/m2-reception-polish-lab/`. Open <http://127.0.0.1:8137/tools/m2-reception-polish-lab/index.html>.  
**Status:** ready for owner use. No tuning value has been chosen or applied, and nothing is merged.

> **M2 POLISH CANNOT CLOSE UNTIL OWNER LAB REVIEW IS COMPLETE AND THE OWNER-APPROVED EXPORTED CHANGES HAVE BEEN APPLIED BACK TO PRODUCTION.**

## 1. Purpose

Art complete is not polish complete. The lab is the final visual and interaction tuning gate for the complete reception slice. The owner sees the finished presentation in action, makes small placement and timing adjustments, compares them with production, and exports them. The exported changes are then applied back to the game in a separate step, before M2 closeout.

## 2. It is the production game, not a mockup

- **Same code and art:** each stage frame (`stage.html`) loads the production `game/game.css`, `game/content/reception.js`, `game/js/{rules,pixeltext,tuning,placeholders,stage,flow,main}.js`, the layout bundle and the committed art. Nothing is copied or recreated. The lab folder contains no images, and QA checks that every image it loads is a production file under `art/`.
- **Two frames:** the lab page holds two stage frames:
  - `?mode=production`: the game exactly as committed;
  - `?mode=lab`: `lab-apply.js` writes the lab values into `G.TUNING` / `G.layout` **before** `stage.js` builds anything.
- **PRODUCTION / LAB** flips between the frames instantly, without losing the lab values.
- **Live values (docs/63):** after load, every change reaches the lab frame live, at most once per animation frame. `LAB_STAGE.applyValues` writes the values and calls `G.rebuildStage()`, which rebuilds the production stage in place where it stands. There is no reload and no state replay.
- **The game never loads the lab:** `game/index.html` loads no lab script, and the game has no storage access at all (static QA).

## 3. Production values source

- **Defaults** are read **at runtime from the production frame** through the registry (`tunables.js`, one `read(G)` per key). QA confirms they equal the values read from a plain `game/index.html`. The lab hard-codes no production number.
- **Sources:**
  - layout values come from `G.layout`, the committed `tools/layout-lab/data/placement.default.json` via `lab_data.js`, unchanged;
  - the constants that were literals in `stage.js` / `flow.js` now come from **`game/js/tuning.js`** (`G.TUNING`).

### Low-risk production refactor (values unchanged)

**What moved into `game/js/tuning.js`, with identical values:**
- `NOTICE_MS` 3600 and the slip geometry: x 56, y 738, item (14, 9), text x 134, middle rows 28 / 77;
- the card stagger 40;
- `beforeChoicesMs` 200;
- the tooltip box constants: padding 10 / 7, gap 4, offset 0;
- the NOTES/FILES text regions: title (100, centred on 60), body (48, 140, 1159 × 620), line 26;
- the inspector item-text top 12;
- new zero defaults: portrait layer offsets and inspector nudges 0, tooltip show / hide delay 0.

**How the game uses it:**
- `stage.js` and `flow.js` read `G.TUNING`.
- `game/index.html` loads `tuning.js` after `pixeltext.js`.
- `pixeltext.js` accepts `window.CYOA_ROOT`, which only the lab's stage frame sets, so the same scripts can load from `tools/`.
- The tooltip's optional show / hide delay is 0, so it shows and hides at once as before.

**Proof that production is unchanged:**
- **Game QA:** 431/431 (Chromium + Firefox) after the refactor.
- **Screenshots:** of the 29 game QA screenshots, 23 are byte-identical to the committed base. The other 6 differ only in timing-captured regions: typing progress in the dialogue box (`01`, `00f`, `00k`, `09`), the speech indicator mid-fade (`05b`), and a choice card caught mid-arrival (`10`).
- **Lab QA:** PRODUCTION and LAB are pixel-identical at defaults in every representative state.

## 4. Locked (not tunable in the lab)

- **Shell and stage:** the canonical shell pixels (`art/ui/shell/layout-final.png`, `813e0884…`), the 1920 × 1080 stage, and the three-utility-button structure.
- **Scene:** aperture (32, 44) 1255 × 822; 314 × 206 density; exact 4× rendering.
- **Portrait:** aperture (1333, 44) 564 × 278; 564 × 278 density; 1× rendering; layer contract background → rear FX → NPC → front FX → shell.
- **Approved art:** the scene, portrait background, `receptionist_idle`, the inspector frame / item overlay, FACILITIES KEY inspect art (565 × 451), the NOTES panel and the FILES panel (each 1255 × 822; FILES has its own since docs/63), the item-received slip (560 × 116), and the action-button sprite family.
- **Choice cards:** the width and height contract as committed in production, `placement.default.json`: **width 535, heights 79 / 107 / 135 / 162** (1–4 lines). The scrollbar width (20) is reserved, with no arrows.
  - The brief quoted 548 and 80 / 108 / 136. Those are not the production values; the lab locks what production actually uses.
- **Inventory:** the slot concept and slot / arrow art.
  - Production shows **6 slots** (`slotCount` 6; a 7-slot layout exists in the data). The brief said "7-slot". The lab keeps the count locked as committed and does not reopen it.

## 5. Tunables (73)

Spatial values are whole pixels, and timings whole milliseconds; both must be integers. "Bounds" are the import / control limits.

**Portrait**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `portrait.npcX` | Receptionist X offset | 0 px | -40...40 | `G.TUNING.portrait.npcX` |
| `portrait.npcY` | Receptionist Y offset | 0 px | -40...40 | `G.TUNING.portrait.npcY` |
| `portrait.backgroundX` | Background X offset | 0 px | -20...20 | `G.TUNING.portrait.backgroundX` |
| `portrait.backgroundY` | Background Y offset | 0 px | -20...20 | `G.TUNING.portrait.backgroundY` |

**Dialogue**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `dialogue.textX` | Text box X (left inset) | 1342 px | 1302...1382 | `G.layout.speech.text.x` |
| `dialogue.textY` | Text box Y (top inset) | 360 px | 320...400 | `G.layout.speech.text.y` |
| `dialogue.textWidth` | Text box width (right padding) | 540 px | 480...570 | `G.layout.speech.text.width` |
| `dialogue.textHeight` | Visible history height (bottom padding) | 144 px | 84...174 | `G.layout.speech.text.height` |
| `dialogue.lineHeight` | Line height | 24 px | 16...40 | `G.layout.speech.text.lineHeight` |
| `dialogue.speakerGap` | Gap between speakers | 8 px | 0...32 | `G.layout.speech.text.speakerGap` |

**Choices + scrollbar**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `choices.listY` | Choice list top (viewport Y) | 527 px | 497...557 | `G.layout.choices.viewport.y` |
| `choices.gap` | Gap between cards | 5 px | 0...30 | `G.layout.choices.gap` |
| `choices.textX` | Card text X inset | 29 px | 0...80 | `G.layout.choices.text.offsetX` |
| `choices.textY` | Card text Y inset | 0 px | -20...20 | `G.layout.choices.text.offsetY` |
| `scrollbar.x` | Scrollbar indicator X | 1880 px | 1850...1910 | `G.layout.scrollbar.thumb.x (= track.x)` |
| `scrollbar.top` | Scrollbar track top | 539 px | 509...569 | `G.layout.scrollbar.track.y` |
| `scrollbar.bottom` | Scrollbar track bottom | 851 px | 821...881 | `G.layout.scrollbar.track.y + height` |

**Inventory**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `inventory.slotsX` | Slot group X | 92 px | 52...132 | `G.layout.inventory.slotLayouts[slotCount].x` |
| `inventory.slotsY` | Slot group Y | 935 px | 905...965 | `G.layout.inventory.slotLayouts[slotCount].y` |
| `inventory.slotGap` | Slot gap (pitch = 96 + gap) | 20 px | 0...40 | `G.layout.inventory.gap / pitch` |
| `inventory.leftArrowX` | Left arrow X | 33 px | 3...63 | `G.layout.inventory.leftArrow.x` |
| `inventory.leftArrowY` | Left arrow Y | 948 px | 918...978 | `G.layout.inventory.leftArrow.y` |
| `inventory.rightArrowX` | Right arrow X | 782 px | 752...812 | `G.layout.inventory.rightArrow.x` |
| `inventory.rightArrowY` | Right arrow Y | 948 px | 918...978 | `G.layout.inventory.rightArrow.y` |

**Utility buttons**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `utility.groupX` | Group X (first button) | 1482 px | 1422...1542 | `G.layout.utility.buttons[0].x` |
| `utility.spacing` | Spacing between buttons | 2 px | 0...30 | `buttons[1].x - buttons[0].x - width` |
| `utility.rowY` | Row Y | 930 px | 900...960 | `G.layout.utility.buttons[*].y` |

**Tooltip**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `tooltip.offsetX` | X offset from the button centre | 0 px | -40...40 | `G.TUNING.tooltip.offsetX` |
| `tooltip.gapY` | Gap above the button | 4 px | 0...40 | `G.TUNING.tooltip.gapY` |
| `tooltip.padX` | Horizontal padding | 10 px | 2...30 | `G.TUNING.tooltip.padX` |
| `tooltip.padY` | Vertical padding | 7 px | 2...20 | `G.TUNING.tooltip.padY` |

**Item-received slip**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `notice.x` | Slip X | 56 px | -4...116 | `G.TUNING.notice.x` |
| `notice.y` | Slip Y | 730 px (was 738; §12) | 670...790 | `G.TUNING.notice.y` |
| `notice.itemX` | Item art X (in slip) | 14 px | 2...26 | `G.TUNING.notice.itemX` |
| `notice.itemY` | Item art Y (in slip) | 9 px | -3...21 | `G.TUNING.notice.itemY` |
| `notice.titleX` | ITEM RECEIVED X | 134 px | 104...164 | `G.TUNING.notice.titleX` |
| `notice.titleY` | ITEM RECEIVED middle row Y | 28 px | 16...40 | `G.TUNING.notice.titleMidY` |
| `notice.nameX` | Item name X | 134 px | 104...164 | `G.TUNING.notice.nameX` |
| `notice.nameY` | Item name middle row Y | 77 px | 65...89 | `G.TUNING.notice.nameMidY` |
| `notice.fadeInMs` | Fade in (§12) | 180 ms | 0...600 | `G.TUNING.notice.fadeInMs` |
| `notice.fadeOutMs` | Fade out (§12) | 220 ms | 0...600 | `G.TUNING.notice.fadeOutMs` |

**Inspector**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `inspector.artX` | Inspect art X nudge | 0 px | -20...20 | `G.TUNING.inspector.artDx` |
| `inspector.artY` | Inspect art Y nudge | 0 px | -20...20 | `G.TUNING.inspector.artDy` |
| `inspector.closeX` | Close X nudge X | 0 px | -20...20 | `G.TUNING.inspector.closeDx` |
| `inspector.closeY` | Close X nudge Y | 0 px | -20...20 | `G.TUNING.inspector.closeDy` |
| `inspector.textX` | Item text X (vs card text inset) | 0 px | -20...20 | `G.TUNING.inspector.textDx` |
| `inspector.textY` | Item text top | 12 px | 0...40 | `G.TUNING.inspector.textY` |

**NOTES / FILES**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `overlay.titleX` | NOTES title X | 100 px | 40...160 | `G.TUNING.overlay.titleX` |
| `overlay.titleY` | NOTES title middle row Y | 60 px | 30...90 | `G.TUNING.overlay.titleCenterY` |
| `overlay.filesTitleX` | FILES title (`YOUR FILES`) centre X, in the label plate (docs/63) | 630 px | 590...670 | `G.TUNING.overlay.filesTitleCenterX` |
| `overlay.filesTitleY` | FILES title middle row Y, in the label plate | 70 px | 58...82 | `G.TUNING.overlay.filesTitleCenterY` |
| `overlay.bodyX` | Body X | 48 px | 18...88 | `G.TUNING.overlay.bodyX` |
| `overlay.bodyY` | Body Y | 140 px | 110...180 | `G.TUNING.overlay.bodyY` |
| `overlay.bodyWidth` | Body width | 1159 px | 1039...1189 | `G.TUNING.overlay.bodyWidth` |
| `overlay.bodyHeight` | Body height | 620 px | 500...650 | `G.TUNING.overlay.bodyHeight` |
| `overlay.lineHeight` | Line height | 26 px | 18...40 | `G.TUNING.overlay.lineHeight` |
| `overlay.notesPanel` | NOTES background: 1 = v1 `notes_files_panel.png`, 2 = v2 `notes_panel_v2.png` (owner candidate, docs/63) | 1 | 1...2 | `G.TUNING.overlay.notesPanel` |

**Objective**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `objective.titleAlignX` | Title centring adjustment | 0 px | -30...30 | `G.layout.objective.title.alignOffsetX` |
| `objective.titleY` | Title Y | 907 px | 887...927 | `G.layout.objective.title.y` |
| `objective.bodyX` | Body X | 889 px | 859...919 | `G.layout.objective.body.x` |
| `objective.bodyY` | Body Y | 958 px | 938...978 | `G.layout.objective.body.y` |
| `objective.bodyWidth` | Body width | 522 px | 462...552 | `G.layout.objective.body.width` |

**Interaction timing**

| Key | Meaning | Production | Bounds | Source |
|---|---|---|---|---|
| `timing.npcCharsPerSecond` | NPC typing speed (chars / s) | 40 cps | 5...200 | `G.layout.speech.text.charsPerSecond` |
| `timing.beforeChoicesMs` | Pause after a line, before choices | 200 ms | 0...2000 | `G.TUNING.timing.beforeChoicesMs` |
| `timing.cardSlideMs` | Card arrival / leave slide | 160 ms | 1...1000 | `G.layout.choices.feedback.awayMs` |
| `timing.cardStaggerMs` | Stagger between arriving cards | 40 ms | 0...300 | `G.TUNING.timing.cardStaggerMs` |
| `timing.sendDelayMs` | Send: wait before the chosen card rises | 120 ms | 0...1000 | `G.layout.choices.feedback.send.delayMs` |
| `timing.sendRiseMs` | Send: chosen card rise | 240 ms | 1...2000 | `G.layout.choices.feedback.send.durationMs` |
| `timing.replyBeatMs` | Reply beat (your line, then the reply) | 400 ms | 0...3000 | `G.layout.choices.feedback.send.beatMs` |
| `timing.inventorySlideMs` | Inventory slide | 275 ms | 1...1000 | `G.layout.inventory.motion.durationMs` |
| `notice.durationMs` | Item-received slip duration (the whole lifecycle, fades included; §12) | 3600 ms | 1000...10000 | `G.TUNING.notice.durationMs` |
| `tooltip.showDelayMs` | Tooltip appearance delay | 0 ms | 0...1000 | `G.TUNING.tooltip.showDelayMs` |
| `tooltip.hideDelayMs` | Tooltip hide delay | 0 ms | 0...1000 | `G.TUNING.tooltip.hideDelayMs` |

**Not separately tunable:** the player's line has no typing. It appears at once by design (docs/45 §4), so there is no "player typing interval".

## 6. Representative states (lab only)

The states are reached by **driving the production flow** through its real choices and item actions (`G.flow.begin / choose / toggleInspect / utility / closeInspector`).

- The turn timings are set near zero only while a state loads, and the frame's own values are restored before the state is shown.
- No narrative state is assigned directly (static QA), and nothing is persisted.
- Each state ends at rest, with no keyboard focus and no stale slip.

| # | State | Path |
|---|---|---|
| 1 | Opening | the opening line and first choices |
| 2 | Three choices | `ask-politely` → the misassign decision (three 2–3-line cards) |
| 3 | Long dialogue / history | `ask-politely`, `correct`, `rule`, `sigh` |
| 4 | Item received | `ask-politely`, `practical`, `ask-key`, then a fresh FACILITIES KEY slip |
| 5 | Inspector, before READ | as 4, then the key's slot is activated |
| 6 | Inspector, after READ | as 5, then READ |
| 7 | NOTES | the long path + `ask-key`, inspect / READ / close, `question-tag`, then NOTES |
| 8 | FILES | as 7, then FILES (appointment, dispute, key issued, returned at 4:52) |
| 8a | OBSERVE taken (docs/64) | `ask-politely`, then the first utility button's OBSERVE: the thought in the history |
| 9 | Tooltip, OBSERVE enabled (docs/64) | opening, with the `OBSERVE` tooltip |
| 10 | Tooltip, OBSERVE spent (docs/64) | opening, OBSERVE taken, with `OBSERVE - NOTHING NEW TO NOTICE` |
| 10a / 10b | Inspector READ / SHOW-unavailable tooltips | as 5, with `READ` / `SHOW - NOT AVAILABLE HERE` |
| 11 | Ending | as 4, `confirm-unread`, `onward-blind`, `unlock`, `enter-corridor` |
| – | Card samples | 1-, 2- and 3-line cards, and three 2-line cards. These are lab-only display text fitted to exact line counts, through the production `setChoices`, and the flow will not take them. |

## 7. Lab controls

- **Live:** every change shows in the lab frame at once, including while a slider is being dragged (docs/63).
- **Every tunable:** shows its production value, the current lab value, −/+ (1 px or 1 ms), a number box, a slider, its bounds, and a reset. Changed rows and sections are highlighted.
- **Resets:** **Reset section** and **RESET ALL TO PRODUCTION**.
- **Comparison:** **PRODUCTION / LAB** buttons, or the keys P / L / Space.
- **Stage aids:** Finish typing and Freeze motion. The hold-X UP / DOWN aid is gone: the X has no DOWN state (docs/64).
- **Trigger events (docs/64):** ITEM RECEIVED (formerly SHOW ITEM RECEIVED), REPLAY NPC TYPING, REPLAY CHOICE ARRIVAL, REPLAY INVENTORY SLIDE and TRIGGER CONTEXT ACTION, on the LAB frame only.
- **Visual QA toggles:** hide the shell, scene art, portrait background, receptionist, rear FX or front FX; bounds for the scene aperture, portrait, choices + scrollbar, inventory and utility buttons; SHOW X HITBOX (the inspector X's 44 × 44 button); the coordinates and element-under-pointer readout.
- **Collapsible sections (docs/64):** every panel and every tunable section folds from its heading.
- **Inspection aids:** never exported, and they apply to both frames.
- **View:** fit-to-window is a scaled preview, clearly labelled; 1:1 shows exact pixels.

## 8. Export / import

```json
{
  "schema": "cyoa-m2-reception-polish-lab-v1",
  "baseSha": "6472cecb377a6e00484f92cdee55f6500858daa3",
  "changes": {
    "portrait.npcY": 3,
    "tooltip.gapY": 7,
    "notice.durationMs": 3200
  }
}
```

- **COPY CHANGES JSON:** only the keys that differ from production, in registry order.
- **COPY ALL VALUES JSON:** the same schema with `"values"`, holding every tunable.
- **IMPORT JSON:** accepts either form. It rejects a wrong schema, unknown fields or keys, non-integers, out-of-bounds values and malformed JSON. A rejected import changes nothing.

## 9. Persistence

The lab page saves the tunable changes in its own `localStorage` key, `cyoa-m2-reception-polish-lab-v1` (`{ schema, changes }`). Since docs/64 the lab's UI state (selected state, view, fit, toggles, folded sections, scroll positions) has its own key, `cyoa-m2-reception-polish-lab-ui-v1`; it is never exported, and RESET leaves it alone. The production game has no storage access and ignores both (QA). No story state is ever stored.

## 10. QA

### Lab QA

`NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js`: see docs/64 §8 for the current run, which adds the trigger-event, UI-persistence and OBSERVE-state checks. At docs/63 it passed **85/85** in Chromium 147 and Firefox 148 (static 5, Chromium 40, Firefox 40), including the live-value, NOTES v2 and FILES-panel checks. Results are in `tools/m2-reception-polish-lab/qa/qa_results.json`.

- **Static checks:**
  - the lab folder holds no images;
  - the game has no storage API or lab identifier, and `game/index.html` loads no lab script;
  - the lab stage loads the production scripts and CSS from `game/` (no copies);
  - the state shortcuts never assign narrative state.
- **Defaults:** the lab opens on exact production values, which equal the registry read on a plain `game/index.html`. All 71 (73 since §12) are integers, and there are no changes at start.
- **PRODUCTION vs LAB:** **pixel-identical at defaults** in 13 representative states (1920 × 1080, 1:1, after CSS transitions settle).
- **States:**
  - every state loads where it should (node, inspector, overlay, slip, READ mark);
  - FILES shows the 4:52 record;
  - the tooltip states show `OBSERVE` / `OBSERVE - NOTHING NEW TO NOTICE` / `READ` / `SHOW - NOT AVAILABLE HERE` (before docs/64: `INSPECT` / `INSPECT - NO ITEMS`);
  - the card samples have 1 / 2 / 3 lines and 2 / 2 / 2 lines.
- **Rendering:**
  - the shell's served bytes are canonical, and every loaded image is a production file under `art/`;
  - the scene stays exactly 4× (314 × 206 → 1256 × 824);
  - the portrait stays native 1×, a lab nudge (`portrait.npcY` 3) moves only the NPC layer by whole pixels, and the PRODUCTION frame is unaffected.
- **Values and export:**
  - values are whole numbers (6.6 → 7);
  - COPY CHANGES holds only the changed keys, with the schema and base SHA; COPY ALL holds all 71 (73 since §12);
  - the helper toggles and freeze never change the export;
  - the hide-shell and bounds toggles act on the stage frames only.
- **Persistence:** values persist across a reload.
- **The game and lab storage:**
  - the production game ignores the lab storage (production values while lab changes are saved);
  - storage holds only the lab's values and UI keys, and a fresh game starts at the opening.
- **Resets:** RESET FIELD, RESET SECTION and RESET ALL work.
- **Import:**
  - IMPORT round-trips an export;
  - IMPORT rejects unknown keys, non-integers, out-of-range spatial and timing values, a wrong schema, string values and malformed JSON, and a rejected import changes nothing.
- **Live values (docs/63):**
  - a slider drag moves the stage step by step, with no reload;
  - a live change keeps NOTES open on the same lines and scroll;
  - NOTES v2 switches live in the lab frame only and is exported;
  - FILES shows its own panel;
  - after live changes and a reset, PRODUCTION and LAB are pixel-identical again.
- **Timing:** a lab tooltip delay applies in the lab frame (hidden at 120 ms, shown after 400 ms).
- **Errors:** there are no console or page errors.

Lab screenshots (Chromium): `tools/m2-reception-polish-lab/qa/screenshots/lab_overview.png` and `state_{opening,inspector-before-read,notes,files,item-received,choices-1-2-3}.png`.

### Production game

The checks were run on the final commit:

- At docs/63: `node game/qa/validate_route.js` **38/38**; `game/qa/run_qa.js` **447/447** (static 37/37, Chromium 205/205, Firefox 205/205), including the separate FILES panel and its `YOUR FILES` plate title. Before docs/63 it was 431/431.
- The current run (static X, context action) is in docs/64 §8.

The production values are unchanged (§3).

## 11. Owner workflow

From the worktree root:

```sh
python3 -c "import http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; h.test(HandlerClass=h.SimpleHTTPRequestHandler, ServerClass=h.ThreadingHTTPServer, port=8137, bind='127.0.0.1')"
```

Open <http://127.0.0.1:8137/tools/m2-reception-polish-lab/index.html>.

1. Select a representative state.
2. Adjust visual and timing controls.
3. Toggle PRODUCTION / LAB repeatedly.
4. Test all relevant representative states.
5. COPY CHANGES JSON.
6. Send the exported JSON back to PMO/Claude.
7. Do NOT call M2 complete yet. The approved changes are applied to production in a separate step, and that step closes the polish gate.


## Owner-final layout baseline ruling — 2026-11-07

The owner supplied the final layout-lab export `m1-layout-20261107-190916.json` (SHA-256 `7a728120da84ba0233f9e01b97daac1a5a5e1f17fbdb8c297d4c4da8e007f540`) and confirmed that it is the locked default.

This export matches the geometry currently used by production and by this polish lab. Therefore these are the authoritative baseline values for M2 owner tuning:

- inventory: **6 visible slots**, 96×96, **20 px gap**, **116 px pitch**, six-slot origin x=92 y=935;
- choices: viewport **x=1324 y=527 w=535 h=331**;
- choice-card width **535**;
- choice-card heights **79 / 107 / 135 / 162** for 1/2/3/4 lines;
- choice-card gap **5**.

The older M1 documents that specify seven slots / 548-wide cards are historical and are superseded by this later owner-final layout-lab output where they conflict.

The previous `placement.default.json` metadata still said `PROPOSED_FOR_OWNER_REVIEW` and `approvedForProduction: false`; those flags were stale. The values themselves were already the owner's final selections. The metadata has now been corrected without changing runtime geometry.

**No geometry correction is required before owner polish tuning.** The owner should tune from the existing six-slot / 535-wide baseline.


## 12. Owner-approved notice polish — 2026-11-08

Owner-approved changes to the ITEM RECEIVED slip, now the production baseline in `game/js/tuning.js` (the lab reads them as its production defaults):

| Value | Before | Now |
|---|---|---|
| `notice.y` | 738 | **730** |
| `notice.fadeInMs` | none | **180 ms** |
| `notice.fadeOutMs` | none | **220 ms** |
| `notice.durationMs` | 3600 | 3600, unchanged: the **whole** on-screen lifecycle |

**Lifecycle (linear opacity, the whole slip together):**

| Time from show | Opacity |
|---|---|
| 0 → 180 ms | 0 → 1 |
| 180 → 3380 ms | exactly 1 |
| 3380 → 3600 ms | 1 → 0 |
| 3600 ms | removed; the next queued slip (if any) starts its own fade-in |

- **Mechanism.** `#itemNotice` (the slip art, item sprite and both text lines) gets one `style.opacity`, set from the game's frame loop (`G.noticeTick`). There is no CSS transition, transform, filter or new dependency. At opacity 1 the slip is drawn exactly as before, and the 1:1 pixel checks are made in the hold.
- **Formula.** Opacity is the lower of the rise (`elapsed / fadeIn`) and the fall (`remaining / fadeOut`), clamped to 0–1, so fades that would overlap can never produce a negative hold.
- **Click.** A click starts the fade-out at once, from the current opacity and at the fade-out's own rate:
  - from the hold, it takes 220 ms;
  - during the fade-in, it falls from wherever it had reached, in 220 ms × that opacity, and never brightens.
  
  A second click while leaving does nothing. Then the next queued slip fades in.
- **Queue.** Each slip runs fade-in → hold → fade-out on its own. The next one starts only after the previous one is removed, so there is never a crossfade.
- **Restart.** Restart clears the slip, its opacity and its queue. No timer survives, because the fade is computed from the slip's own start time each frame.
- **Accessibility.** `role="status"`, `aria-live="polite"`. The accessible text is set once, when the slip is shown, and never on opacity frames.
- **Lab.**
  - New tunables **Fade in** (`notice.fadeInMs`) and **Fade out** (`notice.fadeOutMs`), 0–600 ms whole milliseconds, in *Item-received slip*. `notice.durationMs` stays in *Interaction timing* as the total.
  - The fades must fit the lifecycle: the lab clamps a fade to what the duration leaves (and the duration to at least both fades), and IMPORT rejects a set where fade-in + fade-out exceeds the duration.
  - TRIGGER EVENTS → ITEM RECEIVED now uses the production grant path (`G.notifyItem`), so a press while a slip is up queues behind it exactly as in play, with the LAB frame's current fade values. The PRODUCTION frame keeps the production values.
- **Unchanged.** Slip art, item art, notice text, queue semantics, and every other UI geometry. Nothing in the context-action / thought presentation was touched.

- **QA (2026-11-08, Chromium 147 + Firefox 148):**

  | Suite | Result |
  |---|---|
  | Route validation | 49/49 |
  | `game/qa/run_qa.js` | **520/520** (static 42, Chromium 239, Firefox 239), on top of the owner frame / overlay fix (464f3ab, 122dc82) |
  | Polish-lab QA | **141/141** (static 5, Chromium 68, Firefox 68) |

  - The game QA adds a frame-by-frame lifecycle record covering: y 730; the rise to exactly 1 at ~180 ms; exactly 1 through the hold; a monotonic fall; removal at ~3600 ms; opacity-only CSS; and accessible text set once. It also covers early dismiss from the hold (~220 ms) and during the fade-in (from the current opacity, never back to 1), the queue (B's fade-in only after A is gone), and restart mid-fade.
  - The slip's 1:1 pixel checks are made at opacity 1.
  - The lab QA adds: production defaults 730 / 180 / 220 / 3600; fade sliders live in the LAB frame only; ITEM RECEIVED using the LAB fades; fades in COPY CHANGES; the lifecycle clamp; and the IMPORT rejection.
  - The game's opening-typewriter check ("types character by character") failed twice in Chromium while another session's M1 layout-lab QA was loading the CPU. That check runs before any slip code; it passed on the idle re-run recorded above.
