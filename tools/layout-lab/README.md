# M1 Pixel Placement Lab

A developer-only tool for placing the approved M1 sprites on the canonical shell, to the pixel, and exporting the result. It is not the game and contains no gameplay. Every value in it is a proposal until the owner accepts it.

Owner direction from the live-tuning sessions, current lab state and the planned dialogue turn flow are in `docs/45_M1_OWNER_DIRECTION_INTERACTION_AND_DIALOGUE_FLOW.md`.

## Open it

Open `tools/layout-lab/index.html` in Chrome or Firefox. Double-click it in Finder, or right-click it in VS Code and choose **Reveal in Finder** first. It needs no server, install or build step.

Keep it inside the repository. It loads `layout-final.png` and the approved sprite package by relative path.

If you would rather use a server, this also works from the repository root:

```sh
python3 -m http.server 8123
```

Then open <http://localhost:8123/tools/layout-lab/index.html>.

## Use it

Start with **Live Tuning**. Everything updates while you drag, with no saving, reloading or code.

1. **Inventory:** press **6 slots** or **7 slots**, or the starter **6 slots · Small arrows · Wider spacing**.
2. **Both arrows, width** shrinks both arrows with one slider. **Outward spacing** moves them apart with another.
3. **Slot gap**, **Group X** and **Group Y** place the row.
4. **Utility Buttons:** **All buttons, width** and **Gap between** resize and space all three at once. Under **Label or glyph**, **Buttons show** switches the buttons from their text labels to the action sprites, and each button has its own glyph menu. The glyphs are the owner's chosen 96×96 sprites in `art/actions/`, drawn 1:1 and centred. **X offset**, **Y offset** and **Pressed X/Y** move whichever is showing. The choice and the glyph names are saved in the layout JSON. Labels stay the default. After adding a sprite to `art/actions/`, rerun `scripts/build_lab_data.py`.
5. **Choices**, **Scrollbar**, **Objective** and **NPC Speech** hold the padding, offset and line-height sliders. **Card width** and **Card height %** resize the choice cards without scaling: all four corners of the approved art stay pixel for pixel, and strips are dropped from the middle of the parchment. Card height % moves all four line-count versions together, and **Viewport height** sets the box. The text keeps its right padding.
6. **Typeface**, the first group, has a separate font choice for each kind of text:
   - **Dialogue:** NPC speech.
   - **Choices:** the choice cards, and your lines when they reach the dialogue box.
   - **Labels:** buttons and item names, and later the action-button tooltips (owner's pick: Press Start 2P 2×).
   - **Objective:** the objective title and text.

   To see your line and an NPC line together in their two faces, set NPC Speech → **Box shows** to **Your line + NPC reply**. **Gap between speakers** spaces them apart.

   Each menu offers the locked font and the three chosen baked faces (Jersey 15 1×, Tiny5 3×, Press Start 2P 2×). The other trial faces are in the archive tags. and the readout gives the chosen face's capital height and natural line height. Line heights stay with their own sliders. Saves from the earlier two-menu trial import with their Body choice applied to dialogue, choices and objective.
7. **Scroll motion**, at the bottom of Inventory, sets how the slots slide: on or off, time, overshoot, settle and trailing lag. The starting values come from `docs/26_M1_UI_ASSETIZATION_AND_RUNTIME_PREP.md`, and **Try it** scrolls without reaching for the arrows.
8. **Hover and click**, in Choices, sets what a card does. On hover: nothing, or the brass tab sliding out from under the frame. On click: the card presses, the others dim, the others slide away, or **Choice sends**: the others slide away, then the chosen card rises behind the divider, its line is added below the NPC's at once (scroll up to read the NPC's line), and after a beat the NPC's answer types in below it. Send delay, send time, pull-in strength, the vanish line and the beat before the NPC answer are sliders, and the reply can be turned off. Every reaction holds, then returns, because the lab has no conversation to continue into. **Try it on card 1** previews both without the pointer on the card.
9. **Save Layout Snapshot** downloads the placement JSON and a 1920×1080 PNG. The PNG always shows everything at rest, and the JSON includes these motion settings.

Each slider row has a number box, − and + for single steps, and ↺ to reset that value. With a slider focused, the arrow keys step it by one. Changed values turn gold, and a group's heading counts them. **Reset group** and **Reset everything** undo more at once, and **Undo reset** brings back what a global reset removed.

The line above the Save button says whether you are at the baseline, have changes not yet exported, or have exported everything. Work is autosaved in this browser regardless.

Red marks and the list under Live Tuning flag anything past a measured bay or overlapping its neighbour. They are information only, and **Overflow warnings** turns them off.

| Other control | What it does |
|---|---|
| **Interact / Position** | Interact presses buttons and scrolls. Position selects and drags. Arrow keys nudge 1px, Shift+arrow 5px. |
| **Fit / 1:1** | Fit scales the view to the window. 1:1 shows one shell pixel per screen pixel, also on Retina displays. Judge pixels at 1:1 with browser zoom at 100%. |
| **Grid, Measured bays** | Optional overlays. |
| **Clean Review** | Hides all tooling. Press **Esc**, or hover the top-right corner, to return. |
| **Advanced** | Compare presets, the Component Inspector for exact per-element work, and the fit report. |

### Full-resolution screenshots

Size the window to at least 1920×1080, choose **1:1**, then **Clean Review**. Capture the window, or in Chrome DevTools select `#stage` and use *Capture node screenshot*.

### Export a placement

**Copy**, **Download** and **Save Layout Snapshot** give the same `m1-ui-placement-v2` JSON. Files saved as `m1-ui-placement-v1` by the earlier lab still import, and so do v2 files from before the motion controls, which keep their values and gain the default motion settings. To restore one, paste it in the box and press **Import**, or leave the box empty and press **Import** to choose a file. Import refuses a different shell, a different sprite package, or fractional coordinates, and leaves the stage unchanged.

## Files

| Path | Contents |
|---|---|
| `../../art/ui/sprites/choice_cards/choice_marker_tab.png` | The owner-approved 14×12 hover tab, unused in the current layout. QA pins its hash. |
| `../../art/ui/fonts/`, `data/fonts.json` | The chosen faces, baked by `scripts/bake_fonts.py` from font files kept locally in `art/ui/fonts/source/` (never in git; licences in `art/ui/fonts/licenses/`). White glyphs, tinted to the two inks as they draw. Not hand-edited: change the script's face list and re-run it, then `build_lab_data.py`. |
| `data/placement.default.json` | The owner's current defaults, marked as proposed. Reset returns here. |
| `data/compare_presets.json` | The native and fit-to-bay comparison presets |
| `data/measured_shell_regions.json` | Shell and sprite measurements |
| `data/lab_data.js` | Generated bundle of the above, because `file://` pages cannot fetch JSON |
| `data/snapshot_assets.js` | Generated base64 copy of the approved bytes. A browser cannot save a PNG from `file://` images, so the snapshot draws from this copy. It loads only when a snapshot is taken, and QA checks it against the approved hashes. |
| `js/` | Lab source. `tuning.js` defines the Live Tuning controls. |
| `scripts/measure_shell.py` | Re-measures the shell. Requires Pillow. |
| `scripts/build_lab_data.py` | Rebuilds `data/lab_data.js`. Run it after editing any JSON above. |
| `qa/run_qa.js`, `qa/qa_results.json` | Playwright QA and its last results |
| `qa/fixtures/placement.qa_baseline.json` | A fixed layout the behaviour checks run against, so they do not break when the owner changes the defaults. The real defaults get their own checks. |
| `qa/screenshots/` | 1920×1080 examples, including `10_live_tuning_panel_in_use.png` |
| `FIT_AND_SCALE_NOTES.md` | Shell measurements and scaling notes |

## Run QA

From the repository root, with Playwright installed:

```sh
NODE_PATH="$(npm root -g)" node tools/layout-lab/qa/run_qa.js
```

The run tests Chromium and Firefox. Assets are hashed from the bytes the browser received. A pass shows the lab behaves as specified. It does not show that a placement looks right; that is the owner's call.

The suite was also run once against a scratch copy with nine deliberate faults: smoothing on, a pinned label, a two-item inventory step, a 6px thumb overshoot, speech tied to choice overflow, one altered sprite byte, tooling left visible in Clean Review, an off-centre title, and an export that altered a coordinate. It failed on all nine. The Live Tuning checks had the same treatment with ten faults, including an inspector rebuilt on every edit, a slider that updated only on release, a slider that changed the wrong property, and a number box out of sync. All ten were caught.

## What it never changes

The sprite package corrected a stray black line on `choice_2line_c` and `choice_4line_b` on 2026-11-02 (see the package README), and stray pixels in rows 0–1 of `choice_1line_a`, `choice_1line_b`, `choice_2line_a`, `choice_2line_b`, `choice_3line_b` and `choice_4line_a` on 2026-11-05 (PMO ruling `docs/49` §2.7; before/after hashes in each sprite's `correction` entry in the manifest). Placements saved before either refer to an earlier atlas hash; they still import and are moved to the current one.

The lab only reads `layout-final.png`, the sprite package, the locked ZIP and the V5 sources. Display scaling happens at display time: no resized image is written into the repository. Sprites never exceed native size on the sliders, and the slot stays 96×96. Hover never adds a border, outline, glow or highlight: an element shows interaction by physically changing. The obsolete 364×78 font atlas is never requested, and QA fails if it is.
