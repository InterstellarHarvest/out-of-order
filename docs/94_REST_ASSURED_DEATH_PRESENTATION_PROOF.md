# 94: Rest Assured voluntary death: feature-gated visual proof

Branch `agent/rest-assured-death-visual-proof` in worktree `_worktrees/CYOA-rest-assured-death-proof`.

- **Started from:** PR #10's head, `agent/ch01-production-art-integration` at `83f6d05` (CI run
  43798640634 passed).
- **Brief:** `docs/93_REST_ASSURED_APPROVED_DEATH_PRESENTATION_IMPLEMENTATION_BRIEF.md` on
  `agent/design-deaths-transitions-ch01-art-audit-20261115` at `8301daa`. That is a different
  document from PR #10's `docs/93_CHAPTER_01_PRODUCTION_ART_INTEGRATION.md`.
- **Approved study:** `agent/rest-assured-death-study-20261115` at `000f096`.

**Status: a private, feature-gated review proof.**
- It is OFF by default. Ordinary play is unchanged.
- The visual design is owner-locked. The body copy is provisional.
- The three control positions are approved; their labels and behaviour are **not**.
- The proposed controls, checkpoint and save contract is in docs/95, and is not implemented.
- Nothing was merged, promoted or deployed.

## 1. Review it

```bash
cd "_worktrees/CYOA-rest-assured-death-proof" && python3 -m http.server 8000
```

- **With the proof:** `http://localhost:8000/game/index.html?new&deathproof`. Play to the Rest Assured
  chair, for example:
  1. In the Prologue, deposit everything.
  2. In the House, enter, hear the greeting and allow housekeeping.
  3. Ask for the bathroom, then try the Rest Assured chair and sit down.
  4. Choose **STOP STRUGGLING AND ACCEPT THE FULL TREATMENT**.
- **Escape** closes the proof. It is review-only and returns to the authored ending; that ending's
  BEGIN AGAIN still works.
- **Without `deathproof`:** the ordinary fatal ending, exactly as before.
- **Negative controls:** WRENCH YOURSELF FREE or the stapler, on a seed that fails the check, reaches
  the same ending without the proof. Try a different `&seed=` value.
- **Reload** at the ending with the gate on: the proof appears again for that state, once.
- **Screenshots:** `node game/qa/run_end_presentation_qa.js` writes them to
  `game/qa/end_presentation_screenshots/`. They are not committed; CI keeps them in the
  `qa-browsers` artifact.

## 2. Art

`art/deaths/rest_assured_voluntary.png` is the git blob of
`review/death-screen-layout-study-2026-11-15/approved-default/native-314x206.png` at `000f096`.

| | |
|---|---|
| Git blob | `fe223d11` |
| SHA-256 | `7f469efa40548568af5dfe3c11602b9c6293282d9574caa5f36fc37113e72d9c` |
| Size | 314x206 RGB, 105,486 bytes |

- It was written with `git show`. The hash was verified before and after copying.
- It is drawn at exactly 2x (628x412), nearest neighbour.
- Provenance is in `art/deaths/rest_assured_voluntary.provenance.json`.
- The 1920x1080 A1 reference (`f38c8031...`) and the 1548x1016 original (`163a9a41...`) stay
  unchanged in the study branch. The A1 is used only as the QA reference.
- No other art was added or changed. The Chapter 1 art stays `generated`.

## 3. How it works

| Piece | Where | What it does |
|---|---|---|
| Cause | `Rules.endCause(story, state)` (`game/js/rules.js`) | Reads why the current ending was reached from the existing decision log, `state.taken`: the arriving node and choice, and the check id and outcome when there was one. Read-only. No new state; the save schema is unchanged. |
| Real frame | `G.captureStage()` (`game/js/stage-capture.js`) | Rasterises the live stage. Every `img`/`canvas` is drawn in paint order, with background fills, inset shadows, ancestor clipping and opacity. Output is canonical 1920x1080 stage coordinates, whatever the window scale. |
| Presentation | `game/js/end-presentation.js` | Generic: no chapter, node, choice, art path or copy. At a settled authored ending it matches `Rules.endCause` against the data entries. A match opens **once** (keyed by step and node). |
| Data | `game/content/end-presentations.review.js` | One entry, `rest_assured_voluntary`. `when = { end: chapter-01:exit_chair_fatal, from: chapter-01:chair_locked, choice: accept_permanent_rest }`. Also holds the A1 geometry and palette, the provisional copy, the placeholder labels and the review notice. A future cause adds an entry; no engine change. |
| Hook | `game/js/story-flow.js` | At a settled ending, hands over the cause. While the proof is open, `choose`, `skip`, the inspector, the utilities and the keyboard handler all refuse input. |
| Gate | `?deathproof` | Off by default. The art is decoded at boot only when the gate is on (`main.js`). |

**Opening sequence.**
1. Capture the real frame.
2. Turn it into the backdrop: 10x10 blocks, each block one colour taken from the frame's
   block-centre pixel (nearest neighbour, no smoothing, blur or dithering), with each RGB channel
   multiplied by 0.35 and rounded.
3. Draw the composition sharp on top, at the A1 coordinates. The layers are independent:
   - `#endPanel`: frame, shadow, art mat, separator and control boxes;
   - `#endArt`: the decoded native `img` at 2x;
   - `#endTitle` and `#endBody`: text canvases in the game's own Press Start 2P and Jersey 15
     faces, the same atlases the study used (byte-identical);
   - three `button`s carrying the label canvases;
   - the review notice, on the backdrop above the popup.

It all sits inside `#stage`, so the game's fit-to-window scale applies to it uniformly and it is
never re-centred on the window.

**Isolation while open.**
- Every other stage child is `inert`.
- Keydown and keyup are swallowed, except Tab/Shift+Tab (which cycle the three controls), Enter and
  Space on a control (which only update the review notice), and Escape (which closes).
- The flow's input entry points refuse.
- Nothing commits, saves or changes state.

**The A1 geometry, with the approved −85 px offset applied once:**
- popup 280,135, 1360x640, centre y=455, plus a 12 px shadow;
- title row at y=167;
- art frame 304,197 (644x428); mat 308,201; art 312,205 (628x412);
- body text at 972,257, width 604, 44 px lines plus an 18 px paragraph gap;
- separator 328,639 (4 px plus 2 px);
- controls at x=570/840/1110, y=669, 240x62, each with a 4 px shadow.

**Fallback.** A page opened from `file://` cannot read its own images back. The backdrop then takes
the same centre samples by a nearest-neighbour reduction, and darkens with a multiply fill (within
one level per channel). The backdrop canvas records which method it used in `data-method`. The QA
runs over HTTP, where the exact method is used.

## 4. Differences from the A1 reference (measured)

- **Title.** The brief requires the literal `PERMANENTLY SATISFIED.` The A1 mockup has no period. The
  centred title therefore shifts 8 px left and gains a period: 2,280 differing pixels, all in the
  title row.
- **Backdrop.** Genuine differences from the live game. The study's backdrop was a staged design
  composite at `chair_locked` (with a DEV placeholder replaced in the browser). The proof freezes the
  real ending frame: the integrated in-use chair art, the fatal narration and the BEGIN AGAIN card.
- **Review notice.** A labelled plate above the popup, on the backdrop, reading
  `REVIEW PROOF - PROVISIONAL CONTROLS: LABELS NOT APPROVED, NO GAME ACTION - ESC CLOSES`.
- **Everything else matches pixel for pixel**: frame, shadow, art, copy, separator and controls. In
  both browsers, 0 of 894,544 popup pixels differ outside the title row.

## 5. QA

### 5.1 The new suite: `game/qa/run_end_presentation_qa.js`

**94/94: Chromium 44, Firefox 44, engine 6.** Everything was measured from real 1920x1080
screenshots at device scale 1.

| Measurement | Chromium | Firefox |
|---|---|---|
| Popup frame edge | `#19393e` at 280,135 and 1639,774; nothing of it outside; centre y=455 | same |
| Popup shadow | `#101e22` out to 1651,786 | same |
| Art | 0 of 258,736 pixels differ from the native PNG at 2x (sharp, undimmed) | 0 |
| Controls | Top y=669, shadow to y=734; separator ends at y=645; lower border at y=759; **24 px / 24 px** clear | same |
| A1 parity, popup region | 894,544 px: **0 differ** outside the title row; 2,280 in the title row (the added period) | same |
| Backdrop blocks outside the popup | 11,076, all uniform 10x10 | 11,076, all uniform |
| Backdrop block = frame centre pixel x0.35 | **11,076 / 11,076 exact** | 10,832 exact. All 244 others lie inside the 5 downscaled sprites (max 13 levels); 0 elsewhere |
| Darkening (backdrop / frame luminance) | 0.3498 | 0.3496 |
| Capture vs browser screenshot | 99.9998% identical (4 px: CSS chamfers) | 99.9998% outside the downscaled sprites; 40.8% inside them (section 6.1) |
| After Escape vs the gate-off ending | 0 px differ | 0 px differ |

**Also checked, in both browsers:**
- **Gate off (default):** no proof, art not decoded, and the ending's BEGIN AGAIN restarts.
- **Gate on, voluntary:** the proof opens once. State, flags, inventory, checks and seed equal the
  pure rules step.
- **Real gameplay background:** the frozen backdrop is the captured live frame, compared against a
  real screenshot of the same ending (table above).
- **Independence:** the title and body are separate text canvases carrying the brief's exact words.
- **Controls:**
  - the three sit at the approved footprints;
  - they are `aria-disabled` and labelled provisional;
  - a click or Enter/Space only updates the notice.
- **Frozen frame:** unchanged after 0.7 s.
- **No input leaks:** clicks on the cards and inventory, the wheel, keys (Enter, Space, arrows,
  Home, End, letters) and direct flow calls change neither the state nor the save.
- **Focus:** Tab and Shift+Tab stay on the three controls.
- **Resize:** at 1280x720 the composition is scaled uniformly (art at 312·k, 205·k, 628·k x 412·k)
  and is still pixelated. Back at 1920x1080 the frame is identical.
- **Reduced motion:** identical static result.
- **Escape:** the ending is restored, with nothing left inert. Opening and closing never saved or
  changed state.
- **Reload at the ending:** the save is restored and the proof shows once.
- **Afterwards:** BEGIN AGAIN restarts with no proof.
- **Cause selection:**
  - a failed stapler check and a failed unarmed check (each on a real seed) reach the same ending,
    with **no** proof and the ordinary BEGIN AGAIN;
  - a successful unarmed escape reaches the service exit with no proof;
  - engine level: across 60 seeds per checked choice, the cause carries the check id and `ok: false`
    and never matches;
  - none of the 33 catalogued Chapter 2 route endings and none of the five House exits match;
  - the generic modules name no story id, art path or copy.

Screenshots (16): `game/qa/end_presentation_screenshots/{chromium,firefox}_`, numbered:
- `00`: gate-off ending
- `01`: canonical 1920x1080
- `02`: control clicked
- `03`: 1280x720
- `04`: after Escape
- `05`: after reload
- `06`: failed stapler
- `07`: failed unarmed

### 5.2 Regression (local, macOS)

| Suite | Result |
|---|---|
| `import.js --check` / `--verify` | VALID / OK. Content `407d8ec78f1c` is unchanged: no story change. 165,527 states, ~27 s, ~0.5 GB. |
| glyph ink | OK |
| `validate_route` v1 / v2 | 49/49 / 49/49 |
| `validate_story` (rules, fixtures, 59 mutants) | 178/178 |
| `validate_story_import` (incl. content independence over the new `game/js` modules) | 92/92 |
| `validate_ch02_routes` | 157/157 |
| `validate_ch01_art` | 253/253 |
| `validate_assets` static / browser | 59/59 / 97/97 |
| storyboard smoke / browser | PASS / 24/24 |
| `run_story_qa` | 124/124 |
| `run_ch01_routes_qa` | 154/154 |
| `run_ch01_art_qa` | 164/164 |
| `run_ch02_routes_qa` | 346/346 |
| `run_end_presentation_qa` (new) | 94/94 |
| Polish lab | 143/143 |
| Layout lab | 1916/1924: exactly the 8 known failures |
| M2 reception `run_qa` | 521/528 locally. Static 44/44 (the guard admits the new art by its provenance hash). Chromium 242/242. Firefox 235/242. |

**The 7 Firefox M2 failures are not caused by this change.** They are the known choice-scroll checks
(docs/87). This suite plays `?story=reception` on the v1 flow, which never runs the new code. I
checked by running the same suite on the untouched PR #10 head `83f6d05`, in a temporary detached
worktree, at the same time: it failed **the same 7 checks**. That commit passed 528/528 earlier and
in CI. CI on Linux is the arbiter for this suite.

## 6. Known limits and open items

1. **Firefox draws five downscaled sprites differently.** The game's utility buttons and inventory
   arrows are drawn by the game itself downscaled by a non-integer factor (for example 243x205 shown
   at 135x114) with `image-rendering: pixelated`.
   - Firefox's CSS filter for that downscale differs from its own canvas nearest-neighbour, so in
     Firefox those five boxes cannot be re-rasterised bit for bit from page script.
   - Their 10 px blocks differ by up to 13 levels. Measured: 244 of 11,076 backdrop blocks, all
     inside those boxes.
   - Everything else is exact, and Chromium is exact everywhere.
   - This is a pre-existing rendering trait of those sprites, not of the proof.
2. **Reload at the ending shows the proof again** for that state, once per page. Whether a real death
   screen should do that is part of the docs/95 decisions.
3. **Labels, copy and the controls' meaning are not approved.** No RETRY, checkpoint, restore,
   re-roll, quit or save deletion exists. See docs/95.
4. **Only the voluntary cause has an entry.** The failed stapler and failed unarmed checks keep the
   ordinary authored ending, as the brief requires.
5. **Activation in ordinary play** waits for the owner's gate.
