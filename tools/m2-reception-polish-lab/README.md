# M2 reception polish lab

The final visual and interaction tuning gate for the M2 reception slice (docs/62).

It runs the **production game** (`game/js/*`, `game/game.css`, the committed art), not a mockup. The lab lets the owner adjust small placement and timing values, flip between PRODUCTION and LAB, and export the changes. The changes are then applied back to the game in a separate step.

## Open it

From the repository root (or the worktree root):

```sh
python3 -c "import http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; h.test(HandlerClass=h.SimpleHTTPRequestHandler, ServerClass=h.ThreadingHTTPServer, port=8137, bind='127.0.0.1')"
```

<http://127.0.0.1:8137/tools/m2-reception-polish-lab/index.html>

It needs the server, because it uses frames on the same origin. A window at least about 2400 × 1150 shows the controls and the 1:1 stage together. Otherwise use **View: fit to window** for a scaled preview, then switch back to 1:1 to judge pixels.

## Use it

1. Pick a **State**: opening, the three-choice decision, long history, item received, the inspector before and after READ, NOTES, FILES, OBSERVE taken, the tooltips, the ending, and the choice-card samples.
2. Adjust values in **Tunable values**:
   - each row shows its production value;
   - edit a row with **−/+** (1 px or 1 ms), the number box or the slider; every change shows live;
   - **NOTES background** (NOTES / FILES section) switches the NOTES panel between v2 (production since Round 2, docs/82) and the earlier v1;
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

**Resets:** **RESET ALL TO PRODUCTION**, **Reset section**, and the per-row **reset**.

**Tooltip reason line:** an action that is not available keeps its label as is on the first line; the reason (NOT NOW, NOT AVAILABLE HERE...) is on a second, smaller line. **Tooltip → Reason line face** compares the Labels face at half size (production) with the Dialogue and Objective faces; **Gap between label and reason** sets the spacing.

**Round 2 (docs/82):** the item slip's 500 ms fade-in and NOTES background v2 are now **production** values, so a fresh lab opens on them with no LAB change.

**Storage:** lab values are saved in this page's `localStorage` (`cyoa-m2-reception-polish-lab-v1`); the lab's own UI state is kept apart under `cyoa-m2-reception-polish-lab-ui-v1`, is never exported, and RESET leaves it alone. The game never reads either.

## Files

| File | Role |
|---|---|
| `index.html`, `lab.css`, `lab.js` | the lab page: controls, PRODUCTION / LAB, export / import, persistence |
| `tunables.js` | the registry of every tunable: key, label, production source path, bounds, read / write |
| `stage.html` | a stage frame that loads the production game scripts and CSS from `game/` |
| `lab-apply.js` | in a stage frame, before the stage is built: `?mode=lab` writes the lab values into `G.TUNING` / `G.layout`; `?mode=production` writes nothing |
| `lab-stage.js` | in a stage frame, after boot: representative states (driven through the real flow), live values (`applyValues` → `G.rebuildStage`), inspection aids |
| `qa/run_qa.js` | lab QA (`NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js`) |
