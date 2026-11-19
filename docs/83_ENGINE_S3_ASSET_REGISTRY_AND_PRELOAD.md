# CYOA — Engine S3: Asset Registry and Preload

**Date:** 2026-11-09
**Status:** S3 implemented on an isolated integration branch, **for Gameplay Engine PMO review**. Not merged. S4–S9 not started.
**Branch / worktree:** `agent/engine-s3-asset-integration`, `_worktrees/CYOA-engine-s3-asset-integration`
**Authority:** `docs/ENGINE_S3_START_GATE_2026_11_09.md` (docs/story-gameplay-study-v01); [72](https://github.com/InterstellarHarvest/out-of-order/blob/agent/engine-foundation-design/docs/72_GENERAL_ADVENTURE_ENGINE_FOUNDATION_V01.md) §§4, 6; [74](74_ENGINE_V0_S1_S2_RULES_IMPLEMENTATION.md); [82](82_M2_ROUND2_INTEGRATION_GATE.md).

---

## 1. Sources and integration

| | Branch | SHA |
|---|---|---|
| M2 presentation base (frozen) | `agent/m2-round2-integration` | `312928afbac4aace37c6602e9033574f90849d2b` |
| Accepted engine | `agent/engine-v0-rules` | `713f5a9c146b8e0ea5b215290d61616ac68ff780` |

Both were fetched and matched their remote refs. Both worktrees were clean (one ignored `.DS_Store` in the engine worktree). Neither branch was moved.

The new branch was cut from exactly `312928a`. The four engine commits were then cherry-picked with `-x`, in source order:

| Source | Integration commit | Content |
|---|---|---|
| `9886100` | `918f1e5` | S1 rules v2 core |
| `9558f1f` | `7a643ed` | S2 checks and saves |
| `d5cafa8` | `8b2a6f2` | docs/74 |
| `713f5a9` | `65e83be` | S2.1 |

**Conflicts: none.** The engine and Round 2 share one file, `game/README.md`. The two sides edit different hunks, so it merged cleanly with both edits kept. The cherry-picked range `312928a..65e83be` has the same `git patch-id` as the engine range `e66e7bf..713f5a9`: the engine came across byte for byte.

No Narrative Study file, hunk or commit was imported. `7544c5d` is not an ancestor of this branch.

**S3 commit:** ``a989fc0` (code, QA and README), then this report`, on `65e83be`.

## 2. Combined baseline, before any S3 code (at `65e83be`)

This was run before any S3 code, with the outputs restored afterwards. Load average ~2–3.5 (`uptime` checked).

| Suite | Command | Result | Round 2 / engine reference |
|---|---|---|---|
| Route v1 | `node game/qa/validate_route.js` | **49/49** (15 nodes, 23 choices, 449 states, 96 ending states) | 49/49 |
| Route v2 | `node game/qa/validate_route.js --v2` | **49/49** (same stats; 1 chapter, 0 checks) | 49/49 |
| Story | `node game/qa/validate_story.js` | **176/176** | 176/176 |
| Game browser | `NODE_PATH="$(npm root -g)" node game/qa/run_qa.js` | **525/525** (static 43, Chromium 241, Firefox 241) | 525/525 |
| M2 polish lab | `… node tools/m2-reception-polish-lab/qa/run_qa.js` | **143/143** | 143/143 |
| M1 layout lab | `… node tools/layout-lab/qa/run_qa.js` | **1916/1924** | 1916/1924 |

The layout lab's 8 failures are the same list as `312928a`'s committed results:
- "the sprite package holds no unlisted files" (`inspect_close`) ×2;
- "bundled baseline equals placement.default.json" ×2;
- "placement is marked unapproved" ×2;
- "shipped defaults" in Chromium and in Firefox.

Node outputs were byte-unchanged.

Compared with `312928a`'s committed captures, the baseline run differed only in the known timing captures: game `01_opening_typing`, `02_send_in_flight`, `09_notes_transcript`; polish lab `trigger_context_action`, `trigger_item_received`.

**Verdict: the combined baseline is healthy, and the reception is unchanged by the engine import.**

## 3. What S3 changes

### 3.1 Files

| File | Change |
|---|---|
| `game/js/stage.js` | Replaces `G.RECEPTION_ART` with the art registry. Adds `G.ART_CLASS`, `G.artKey`, `G.artRegistry`, `G.chapterArtKeys`, `G.itemArtKeys`, `G.registerArt`, `G.ART` and `G.ART_ON_SHOW`, plus the legacy aperture-label adapter. `artLayer` and `buildApertures` now read from the registry. Nothing else in the file changes. |
| `game/js/main.js` | At boot: `G.story = Rules.fromV1(G.content)`, then `G.registerArt`, then the boot list built from `G.ART`. Adds `G.preloadChapter`. A registry error at boot now sets `ready=error`, the same way a missing image already did. |
| `game/js/pixeltext.js` | The minimal loader fix (§3.4): `G.decodeImages`. `G.loadImages` keeps its signature and now delegates to it. |
| `game/qa/validate_assets.js` | **New.** EF-A1…A3, the boot list, layering and pins, negative controls, and a `--browser` runtime leg. |
| `game/qa/asset_results.json` | **New.** Its last results. |
| `game/qa/validate_story.js` | One check rewritten, same count (176). It used to read the three paths out of `stage.js` with a regex; it now asserts that `stage.js` holds no second copy (§3.2). |
| `game/README.md` | Files table, plus an "Art registry and preload" section. |
| `docs/83_ENGINE_S3_ASSET_REGISTRY_AND_PRELOAD.md` | This report. |

**Not touched:** `flow.js`, `tuning.js`, `rules.js`, `placeholders.js`, `content/reception.js`, `game.css`, `index.html`, all art, fonts, atlases, manifests and pins, both labs and their QA.

### 3.2 One declaration of the reception's art

The reception's art paths now exist in one place: `Rules.fromV1`'s `V1_RECEPTION.assets` in `rules.js`. That file was accepted in S1 and is unchanged here.

`stage.js` names no `art/scenes`, `art/portraits` or `art/items` path, and no `RECEPTION_ART`. Both `validate_story.js` and `validate_assets.js` enforce this.

Item art stays on the items (`slotArt`, `inspectArt`), as doc72 §4.1 specifies. The registry reads it from `story.items`, which is `fromV1`'s copy of `content.items`.

The comment above `V1_RECEPTION` in `rules.js` still reads "the ones stage.js registers today (G.RECEPTION_ART) … S3 makes this the only copy". It is now historical. It was deliberately left alone, because `rules.js` is outside the S3 boundary. S4 can reword it (§8).

### 3.3 Registry: `G.ART`

`G.registerArt(story)` sets `G.ART = G.artRegistry(story)`. Each image becomes one entry, `{ key, cls, id, path[, portrait] }`.

| Key | Class | Size | Drawn |
|---|---|---|---|
| `scene:<location>/<scene>` | `scene` | 314×206 | 4×, scene aperture origin |
| `portrait:<portrait>:background:<id>` | `background` | 564×278 | 1×, portrait layer 1 at `TU.portrait.backgroundX/Y` |
| `portrait:<portrait>:pose:<id>` | `pose` | 564×278 | 1×, portrait layer 3 at `TU.portrait.npcX/Y` |
| `focus:<location>/<scene>/<target>` | `focus` | 564×278 | 1× (registered and preloadable; drawn from S6) |
| `item:<id>` | `slot` | 96×96 | inventory slot, item slip |
| `inspect:<id>` | `inspect` | 565×451 | inspector |

Notes on the keys:
- The portrait segment of the key is the **portrait id**, because that is how `assets.portraits` is keyed. Doc72 writes it as `<cast>`. For the reception the two are the same (`receptionist`).
- The layer names `background` and `pose` are the ones the S1 validator already uses for its `refs.layers` ids.
- `item:` and `inspect:` are the image names M2 already used, kept so they stay stable. `run_qa.js` and the slip read them.

**The reception registry, exactly:**

```
item:wc_key                                  slot        art/items/bathroom_pass_slot.png
inspect:wc_key                               inspect     art/items/bathroom_pass_inspect.png
scene:conference_hall/reception              scene       art/scenes/conference_hall/reception/reception_scene.png
portrait:receptionist:background:reception   background  art/portraits/receptionist/reception_background.png
portrait:receptionist:pose:idle              pose        art/portraits/receptionist/receptionist_idle.png
```

Other registry behaviour:
- `null` art becomes an entry with `path: null`. That is a fixture DEV PLACEHOLDER, and it is never requested.
- The registry does not refuse null art in a production story; that is EF-A3's job. Two registrations claiming one key throw.
- `G.chapterArtKeys(story, chapterId)` lists one chapter's images in first-use order: its scenes, the default background and pose of each speaker plus any node `backdrop` or `pose`, and its focus targets.
- `G.itemArtKeys(story)` lists the item art, which is story-wide.

**What is on show.** `G.ART_ON_SHOW` holds the opening chapter's scene and the first speaker's layers. S3 still plays the reception on v1, so the stage shows the story's opening; from S4, v2 `scene` events drive it.

**Layering** is unchanged: background → rear FX (empty `div`) → pose → front FX (empty `div`), with the shell above. The `<img>` elements are the decoded cache images themselves, as before.

**Aperture labels.** `cyoa-story-v2` has no human-readable scene or cast label. Per the start gate (point 6), a minimal adapter keeps the Round 2 names exactly:
- `scene` id `conference_hall/reception` → "The reception lobby"
- cast `receptionist` → "The receptionist"

Anything else falls back to the scene id or the cast member's name. *Future metadata need:* a `label` on each `assets.scenes` entry and on each `cast` entry (§8).

### 3.4 Preload

**Boot.** Boot makes the same single `G.loadImages(list)` call as Round 2, so the polish lab's `lab-apply.js` wrapper still applies. The list now comes from `G.ART`:
- item slot art;
- the opening chapter's keys (`G.chapterArtKeys(G.story, G.story.start)`);
- the slip;
- the chosen NOTES and FILES panels;
- item inspect art;
- the inspector X;
- the glyphs.

The sprite package and fonts are prepended as before.

*Proof of parity:* the Round 2 and S3 boot lists were captured from both trees' own scripts in a Node sandbox. They are identical in length (15 extras), order and URLs. The only difference is three renames: `art:scene`, `art:portraitBackground` and `art:portraitNpc` become the three reception keys above.

The shell and the inspector column are fetched by their own `<img>` elements, as in Round 2. They are not added to the decode list, because that would change element construction and boot timing. Same for the inventory slot `<img>`.

**Later chapters.** The call is `G.preloadChapter(chapterId[, story = G.story]) → Promise`:

- It decodes every image the chapter shows and reuses anything already decoded, by key and URL.
- It resolves with `{ story, chapter, keys, placeholders, requested, reused }`.
- It changes nothing on the stage, and it starts no transition or event queue.
- It rejects, without a throw, with:
  - `Unknown chapter: <id>`;
  - `Unregistered art: <keys>`;
  - `Missing image: <url>` for one failed file, the same message as boot;
  - `Images not loaded: <key> (<url>: <reason>); …` for several, with `err.failures = [{ name, url, reason }]`;
  - `already bound to <url>` as the reason when a key is already decoded from a different file.

  Nothing that failed is cached, so the call can be retried.
- S4's `transition` phase is the intended caller.

**Loader change (`pixeltext.js`): why it is necessary.** The image cache is private to `pixeltext.js`. Before S3, its only entry point, `G.loadImages`, always:
- re-requested the whole sprite package and fonts and replaced their `Image` objects, so a mid-game call would swap images the stage is drawing;
- had no reuse by name;
- failed fast on the first error.

A chapter preload cannot be built on that without either a second, parallel cache (two sources of truth for `G.image`) or this change. The change adds `G.decodeImages(list)`:
- It decodes exactly `list` into the same cache and reuses a name decoded or still decoding from the same URL.
- It refuses a name bound to a different URL.
- It waits for every image, then rejects once with all failures.
- It resolves `{ requested, reused }`.

`G.loadImages(extra)` is now that call on sprites + fonts + `extra`.

At boot nothing is cached yet and the list has no duplicate names, so boot requests, decodes and caches exactly as before. Two things differ:
- In the polish lab's lab mode (which appends the panels the boot list already holds), each duplicate is now decoded once instead of twice.
- A boot with several missing files now reports all of them instead of the first.

No text-drawing code in `pixeltext.js` changed.

## 4. `game/qa/validate_assets.js`

`node game/qa/validate_assets.js` runs the Node checks. `--browser` adds Chromium and Firefox.

The registry and the boot list are taken from the game's own scripts, loaded in `index.html` order in a Node `vm` sandbox, with `G.decodeImages` recording the boot list instead of loading it. The contract tables (art-class sizes, overlay size, SHA-256 pins) are written out separately in the QA file, so the runtime is checked against the doc rather than against itself.

| Group | Checks | What |
|---|---|---|
| registry | 10 | `G.ART_CLASS` sizes and scales against doc72 §4.1; the key grammar; `G.story` is `fromV1(content)` and `G.ART` its registry; the reception's exact five entries; what is on show and its labels; per-chapter keys for the reception and both engine-fixture chapters; unknown chapter error; key separation |
| EF-A1 | 3 | reception (production), engine fixture, endings fixture: every reference registered, every registration referenced, one key per file |
| EF-A2 | 3 | the same three stories: every file exists at its class's PNG size (read from the IHDR header) |
| EF-A3 | 6 | per story: production has no null art and no `source/`, `originals/` or `review/` path, and every path is a `.png` under `art/`; fixtures hold only null placeholders; the reception is production with no null art; SHA-256 pins on all five registered files |
| boot | 10 | the opening chapter and item art come from `G.ART`; the engine UI art is still decoded (slip, NOTES v2 and FILES, X, glyphs, fonts; never NOTES v1 or the obsolete atlas); unique names, no story/engine key collision; the M2 order; every file exists; no unapproved path; idle2/idle3 unregistered and unloaded; full-stage overlays (shell, item overlay) are 1920×1080; `stage.js`/`main.js` hold no story path or `RECEPTION_ART`; the layer order in `buildApertures` |
| negative | 24 | 23 mutants, each caught by the expected rule with the expected message, plus a positive fixture control and a vacuity control: missing scene file; missing inspect file; scene with portrait size; pose with scene size; inspect with slot size; slot with inspect size; non-PNG file; unregistered chapter scene; unregistered node pose; speaker without a portrait; orphan pose (idle2); orphan scene; one file under two keys; production null background; production null item art; production art under `review/`, `source/`, `originals/`; production art outside `art/`; fixture with a missing non-null file; orphan fixture focus; overlay size rule |
| browser:chromium, browser:firefox | 19 each | see below |

**Browser leg, per browser:**
- boot reaches `ready=true`;
- the in-page `G.ART` equals the Node registry;
- `#sceneArt`, `#portraitBackground` and `#portraitNpc` are the very decoded images for their keys;
- the four layers are in order and `aria-hidden`;
- the apertures keep `role=img` and the Round 2 labels;
- everything is decoded before ready, at 4× and 1×;
- each registered image is requested exactly once at boot, nothing from unapproved folders, idle2/idle3 never;
- `preloadChapter('reception')` requests nothing (3 reused);
- a QA-only next chapter (fixture profile; approved files under new ids plus one null focus) requests exactly its 2 new images, reuses 2, and reports 1 placeholder;
- a second call is served from the cache;
- the stage DOM, `G.ART` and what is on show are unchanged;
- two missing files give one rejection listing both, and neither is cached;
- one missing file gives `Missing image: <url>`;
- an unknown chapter and unregistered art are rejected by name;
- a conflicting key binding is refused and the image on show is kept;
- the game is still ready afterwards;
- the engine fixture preloads per chapter with only placeholders and no request;
- no console or page errors (the deliberate `qa_missing_*` 404s are excluded).

**Result:** **94/94**:
- Node: registry 10, EF-A1 3, EF-A2 3, EF-A3 6, boot 10, negative 24;
- Chromium 19 and Firefox 19.

The Node checks alone (`node game/qa/validate_assets.js`) score 56/56.

## 5. Regression after S3

The full browser regression was run **twice** on `a989fc0` (runs s3a and s3b), plus the Node suites and the asset suite.

| Suite | Before S3 (`65e83be`) | S3 run a | S3 run b |
|---|---|---|---|
| Route v1 | 49/49 | 49/49 | — |
| Route v2 | 49/49 | 49/49 | — |
| Story | 176/176 | 176/176 | — |
| **Asset (new)** | — | **94/94** (Node 56/56) | — |
| Game browser | 525/525 | **525/525** | **525/525** |
| M2 polish lab | 143/143 | **143/143** | **143/143** |
| M1 layout lab | 1916/1924 | **1916/1924** | **1916/1924** |

In both S3 runs the layout lab's 8 failures are the identical 8 listed in §2. **No new failure.**

Every game QA check that protects Round 2 passed in both browsers, both runs:
- two-line tooltips; colon glyph and font pins;
- the ITEM RECEIVED slip at y730, 500/220/3600 ms;
- NOTES v2 art;
- scene 4× and separate portrait layers, pixel-exact against the files;
- OBSERVE; inventory, inspector, cards; accessible labels.

## 6. Screenshot and ARIA parity

**Screenshots (the committed QA captures: 30 game, 10 polish lab, 12 layout lab).** Each capture was compared byte for byte across four sets: `312928a`'s committed captures, the pre-S3 run, S3 run a and S3 run b.
- **44 of 52** are byte-identical in all four.
- **Layout lab: 12/12 identical.**
- The 8 that differ are all known timing captures. Each one either matches the pre-S3 bytes in at least one S3 run, or also differs between the two S3 runs (same code):

| Capture | Pre-S3 = S3a | Pre-S3 = S3b | S3a = S3b | Reading |
|---|---|---|---|---|
| game `00f_notes_open_start` | yes | no | no | timing |
| game `00g_notes_scrolled_to_latest` | no | yes | no | timing |
| game `01_opening_typing` | yes | no | no | typing (known) |
| game `02_send_in_flight` | yes | yes | yes | identical across all 3 runs here; differs from the `312928a` commit already pre-S3 (known) |
| game `09_notes_transcript` | no | no | no | differs on every run (known) |
| game `10_files_case_file` | yes | no | no | timing |
| polish `trigger_context_action` | no | yes | no | timing (known) |
| polish `trigger_item_received` | no | no | yes | the S3 runs equal the `312928a` commit; the pre-S3 run is the outlier (slip fade, known) |

No capture differs consistently because of S3. The regenerated captures and `qa_results.json` files were **not** committed: the Round 2 set stays the reference.

**Controlled pre/post parity probe.** This is a dedicated script, run outside the repository. It serves `git archive 65e83be` and `git archive a989fc0` side by side and drives both to the same **7 settled states**:
- the opening choices;
- four choices into the route;
- NOTES open;
- FILES open.

In Chromium and in Firefox, all 7 states are identical in:
- `#stage` **outerHTML** (every id, class, role, `aria-*`, `alt`, `tabindex`, `src`, inline geometry);
- the Playwright **ARIA snapshot**;
- the **full 1920×1080 screenshot**, byte for byte.

**Result: 14/14 states identical on all three measures, with no errors.** Separately, S3 boots and preloads over `file://` (the owner's double-click path).

**ARIA.**
- The scene keeps `role="img"` with the label "The reception lobby"; the portrait keeps `role="img"` with "The receptionist".
- Art layers stay `aria-hidden="true"` with `alt=""`.
- The NOTES/FILES overlay labels, card, slot and utility labels and the objective status are unchanged (the outerHTML is identical).

## 7. Scope confirmations

- `git diff 312928a a989fc0` touches, beyond the four imported engine commits, only the files in §3.1.
- `flow.js`, `tuning.js`, `placeholders.js`, `content/reception.js`, `index.html`, `game.css`, `art/`, `tools/` (both labs and their QA): **unchanged.**
- `rules.js` is identical to `713f5a9`.
- The game still plays on the v1 rules and flow. The only v2 call in the browser is `Rules.fromV1` at boot, to read the asset declaration. No `begin`, `step`, `view` or event queue runs.
- No new text surface, card ink or marker, B or A presentation, OBSERVE change, save or autosave, transition, dossier or fatal recovery. No new story content or art.
- `agent/narrative-study-lab` (`7544c5d`) is not an ancestor, and no Narrative Study file exists in the tree.
- Source branches `agent/m2-round2-integration` (`312928a`) and `agent/engine-v0-rules` (`713f5a9`) are unmoved. No merge to main.

## 8. Known issues and S4 dependencies

**Known issues (none blocking):**
1. *Stale comment in `rules.js`* above `V1_RECEPTION`: it still says "the ones stage.js registers today (G.RECEPTION_ART)". It was left alone because `rules.js` is outside the S3 file boundary. S4 can reword it.
2. *Scene and cast labels are an adapter.* The Round 2 aria labels come from `LEGACY_LABELS` in `stage.js`. **Metadata need:** a human-readable `label` on each `assets.scenes` entry and on each `cast` entry (a schema addition to `cyoa-story-v2` and the validator, so a `rules.js` change). Then the adapter can go.
3. *The shell and the inspector column are not in the decode list.* As in Round 2, their own `<img>` elements fetch them. Moving them into the cache would change how those elements are built and when boot is ready, so it was deferred rather than slipped into S3.
4. *Null (fixture) art is registered and preloaded as a placeholder but not drawn.* Drawing the labelled DEV PLACEHOLDER with the asset id in an aperture (doc72 §4.2) belongs to the fixture page (S6/S7). `artLayer` throws a clear error if asked to draw an undecoded key.
5. *Portrait key naming:* the key segment is the portrait id; doc72 wrote `<cast>`. They coincide for the reception.
6. *Timing captures:* the 8 above remain timing-sensitive, as before S3. On this Mac one game QA timing check has flaked before ("early dismiss during fade-in", engine notes); it did not flake in any of the three runs here.

**S4 dependencies (what S3 hands over):**
- `G.preloadChapter(nextChapter)` is the hook for the `transition` phase: wait on it before presenting a new chapter, and show the error with `err.failures` if it rejects.
- On a v2 `scene` event, or a portrait change (pose or backdrop), S4 swaps an aperture's `<img>` to `G.image(<key>)`. The keys come from `G.artKey`. `G.ART_ON_SHOW` (the opening only) then gives way to the event stream.
- When `flow.js` stops reading `G.content` directly, `G.story` (already set at boot) is the story to run. A v2-native story replaces `Rules.fromV1(G.content)` without any registry change.
- `focus:` art is registered and preloadable now. S6 draws it in the portrait aperture as one 564×278 layer.
- The B overlay (`art/ui/shell/narrative-overlay.png`, doc72 §4.1) is engine UI art. When S6 promotes it, the full-stage overlay check in `validate_assets.js` will pick it up automatically: any `art/ui/shell/*.png` named in `stage.js` must be 1920×1080. That check currently expects exactly two overlays, so S6 updates the count.
