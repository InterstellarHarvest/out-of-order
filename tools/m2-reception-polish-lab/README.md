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

1. Pick a **State**: opening, the three-choice decision, long history, item received, the inspector before and after READ, NOTES, FILES, the tooltips, the ending, and the choice-card samples.
2. Adjust values in **Tunable values**:
   - each row shows its production value;
   - edit a row with **−/+** (1 px or 1 ms), the number box or the slider;
   - **reset** returns one value to production; changed rows are highlighted.
3. Flip **PRODUCTION / LAB** (keys **P**, **L**, or **Space**) to compare.
4. Use the **Stage** aids as needed:
   - **SHOW ITEM RECEIVED**, **Finish typing**, **Freeze motion**;
   - hold the close X UP or DOWN;
   - hide the shell, scene, portrait background, receptionist or FX;
   - bounds outlines and the coordinates readout.

   These aids are never exported.
5. **COPY CHANGES JSON** and send the result back. **COPY ALL VALUES JSON** exports every tunable. **IMPORT JSON** loads an export after validating it.

**Resets:** **RESET ALL TO PRODUCTION**, **Reset section**, and the per-row **reset**.

**Storage:** lab values are saved in this page's `localStorage` (`cyoa-m2-reception-polish-lab-v1`). The game never reads it.

## Files

| File | Role |
|---|---|
| `index.html`, `lab.css`, `lab.js` | the lab page: controls, PRODUCTION / LAB, export / import, persistence |
| `tunables.js` | the registry of every tunable: key, label, production source path, bounds, read / write |
| `stage.html` | a stage frame that loads the production game scripts and CSS from `game/` |
| `lab-apply.js` | in a stage frame, before the stage is built: `?mode=lab` writes the lab values into `G.TUNING` / `G.layout`; `?mode=production` writes nothing |
| `lab-stage.js` | in a stage frame, after boot: representative states (driven through the real flow), inspection aids |
| `qa/run_qa.js` | lab QA (`NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js`) |
