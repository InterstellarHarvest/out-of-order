# 93: Chapter 1 (House of Tomorrow) production art integration

Branch `agent/ch01-production-art-integration` in worktree `_worktrees/CYOA-ch01-art-integration`.
It starts from PR #6 (`agent/scene-pickup-inspector-20261115`, head `e98602f`, verified as the remote
head on 2026-11-15). Work order: `docs/92_CHAPTER_01_ARTWORK_INTEGRATION_PMO_HANDOFF.md` (branch
`agent/ch01-art-integration-handoff-20261115` at `a871e1c`).

**Status: a private, playable integration review.** This is not final story or art approval, and not
publication authorization.
- All three chapters stay `draft`, and every new art record stays `generated`: owner art approval is
  a separate gate. `--promote` was not run.
- Nothing was merged. `main`, PR #6, the art branches, PR #7, PR #8 and the public storyboard were
  not touched. No art was drawn, generated, re-encoded or resized.

## 1. Commits

| Commit | What |
|---|---|
| `32df1b2` | PR #7 `52e2a7b`, cherry-picked with `-x`: the family photograph prose, item text and art brief. |
| `ed60636` | PR #7 `ae27fc1`, cherry-picked with `-x`: the unmarked single entrance door and the outward exit door. |
| `785ebc1` | Art intake: the 29 PNGs, byte for byte, and `art/house_of_tomorrow.provenance.json`. |
| `71bdb38` | Rules fix: a Focus A visit starts at the latest arrival at the close-up (section 4.4). |
| `bbfa3e3` | Engine and importer: scene states, opaque-complete portraits, paged close-ups (section 4). |
| `fcfa9c1` | Renderer: draws the scene states, the complete House views and the semantic album pages. |
| `4f0de9b` | Art registry: all 29 images registered; generated story rebuilt. |
| `58bf2a7` | Private storyboard viewer: lists the new sub-records; smoke test counts updated. |
| `2adf55d` | New suites `validate_ch01_art.js` and `run_ch01_art_qa.js`; stale assertions updated; CI. |
| (this commit) | This record. |

## 2. PR #7 prose corrections

Both PR #7 commits are applied whole. They are exactly the two approved corrections, so nothing
unapproved came with them. Together they touch only `story/` JSON, 14 lines in 3 files, and after
the two cherry-picks the tree equals PR #7's head `ae27fc1` exactly.

- **Photograph** (`52e2a7b`):
  - `portrait_print` text and notes;
  - the `family_portrait_photo` description;
  - the photo slot and inspect art briefs.
- **Single door** (`ae27fc1`):
  - `house_arrival`: three narration variants and the choice `TRY THE UNMARKED DOOR.`;
  - `badge_registration`: text and notes. HOUSE OF TOMORROW is announced only after the badge.
  - `showroom_reset` and `exit_showroom_reset`: one door, which swings outward.

No other narration, dialogue, choice, ending or Chapter 2 data changed.

## 3. The 29 images

Source: `agent/ch01-art-batch05-interactive-states` at `cf575552fc729b952d99d25bea56dbc81b40619d`.
- Each file was written from its git blob with `git show`: no decode, no re-encode, no metadata
  change.
- Every production file's git blob equals its source blob.
- Full sha256, git blob, byte size and colour type are in `art/house_of_tomorrow.provenance.json`.
  `game/qa/validate_ch01_art.js` re-checks all of them on every run.
- The superseded first-pass plant overlay (`assets/B-plant-adoption.png`) was **not** used.
- Nothing else was copied from `review/`.

In the table, source paths are relative to `review/`, and sha256 values are shortened to 16
characters.

| Kind | Registered as | Source | Production path | Size | sha256 |
|---|---|---|---|---|---|
| scene | `house_of_tomorrow/arrival` | `chapter-01-batch04-2026-11-15/arrival-correction-v03/arrival-v03.png` | `art/scenes/house_of_tomorrow/arrival.png` | 314x206 RGB | `7029c0e66b06a784` |
| scene | `house_of_tomorrow/foyer` | `chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/foyer-single-door-v03.png` | `art/scenes/house_of_tomorrow/foyer.png` | 314x206 RGB | `9e4ea0bc781dbb7c` |
| scene | `house_of_tomorrow/lounge` | `chapter-01-batch02-2026-11-15/candidates/lounge-candidate-v01.png` | `art/scenes/house_of_tomorrow/lounge.png` | 314x206 RGB | `9dc600a286bc585a` |
| scene | `house_of_tomorrow/storage` | `chapter-01-batch04-2026-11-15/candidates/storage-v02.png` | `art/scenes/house_of_tomorrow/storage.png` | 314x206 RGB | `635307df628fcdaa` |
| scene | `house_of_tomorrow/dining` | `chapter-01-speaker-revision-2026-11-15/candidates/dining-v04.png` | `art/scenes/house_of_tomorrow/dining.png` | 314x206 RGB | `2bd4f7b2127e7af4` |
| scene | `house_of_tomorrow/public_exit` | `chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/public-exit-single-door-v01.png` | `art/scenes/house_of_tomorrow/public_exit.png` | 314x206 RGB | `0ad83a23a5ee0a52` |
| scene | `house_of_tomorrow/bedroom` | `chapter-01-batch02-2026-11-15/candidates/bedroom-candidate-v01.png` | `art/scenes/house_of_tomorrow/bedroom.png` | 314x206 RGB | `792f7930e572ee91` |
| scene | `house_of_tomorrow/passage` | `chapter-01-batch02-2026-11-15/candidates/passage-candidate-v01.png` | `art/scenes/house_of_tomorrow/passage.png` | 314x206 RGB | `acdacefbaeac9649` |
| scene | `house_of_tomorrow/service_hatch` | `chapter-01-batch04-2026-11-15/candidates/service-hatch-v01.png` | `art/scenes/house_of_tomorrow/service_hatch.png` | 314x206 RGB | `1f978f6fe2334ce4` |
| scene | `house_of_tomorrow/chair` | `chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-in-use-v04.png` | `art/scenes/house_of_tomorrow/chair.png` | 314x206 RGB | `5cef601a39f2aa3e` |
| scene | `house_of_tomorrow/maintenance` | `chapter-01-batch04-2026-11-15/candidates/maintenance-v01.png` | `art/scenes/house_of_tomorrow/maintenance.png` | 314x206 RGB | `cd575f82b52796a7` |
| scene | `house_of_tomorrow/utility_exit` | `chapter-01-batch04-2026-11-15/candidates/utility-exit-v01.png` | `art/scenes/house_of_tomorrow/utility_exit.png` | 314x206 RGB | `907b962a20485b4c` |
| scene | `house_of_tomorrow/portrait_gallery` | `chapter-01-batch03-2026-11-15/wide-speaker-position-v05/gallery-v05.png` | `art/scenes/house_of_tomorrow/portrait_gallery.png` | 314x206 RGB | `7fd52ebec4008005` |
| scene | `house_of_tomorrow/bathroom` | `chapter-01-first-pass-2026-11-15/candidates/bathroom.png` | `art/scenes/house_of_tomorrow/bathroom.png` | 314x206 RGB | `418061f623770ec4` |
| portrait-view | `house@house_of_tomorrow/foyer` | `chapter-01-speaker-revision-2026-11-15/candidates/foyer-conversation-v05.png` | `art/portraits/house/foyer_conversation.png` | 564x278 RGB | `a77eb0a6ca2479cf` |
| portrait-view | `house@house_of_tomorrow/portrait_gallery` | `chapter-01-batch03-2026-11-15/printer-album-restoration-v04/candidates/gallery-conversation-v03.png` | `art/portraits/house/portrait_gallery_conversation.png` | 564x278 RGB | `a365560b66e6d4bb` |
| focus-page | `house_of_tomorrow/portrait_gallery/album:page:1` | `chapter-01-batch03-2026-11-15/candidates/album-page-01-v02.png` | `art/focus/house_of_tomorrow/album_page_1.png` | 564x278 RGB | `c789a17a2e2ee45a` |
| focus-page | `house_of_tomorrow/portrait_gallery/album:page:2` | `chapter-01-batch03-2026-11-15/candidates/album-page-02-v01.png` | `art/focus/house_of_tomorrow/album_page_2.png` | 564x278 RGB | `fcf0dcc0e10dfaa7` |
| focus-page | `house_of_tomorrow/portrait_gallery/album:page:3` | `chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/album-page-03-v04.png` | `art/focus/house_of_tomorrow/album_page_3.png` | 564x278 RGB | `579c0b2e14589e7c` |
| item-slot | `family_portrait_photo` | `chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/photo-slot-v03.png` | `art/items/family_portrait_photo_slot.png` | 96x96 RGBA | `7e1e0b42f5def951` |
| item-inspect | `family_portrait_photo` | `chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/photo-inspector-v04.png` | `art/items/family_portrait_photo_inspect.png` | 565x451 RGB | `cf9cebc88a5e320d` |
| scene-state | `house_of_tomorrow/chair#default_unrestrained` | `chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-default-v04.png` | `art/scenes/house_of_tomorrow/states/chair_default_unrestrained.png` | 314x206 RGB | `2cad345326a222fa` |
| scene-state | `house_of_tomorrow/portrait_gallery#album_removed` | `chapter-01-batch05-2026-11-15/assets/A-album-removed.png` | `art/scenes/house_of_tomorrow/states/portrait_gallery_album_removed.png` | 314x206 RGB | `96c1b1ced5a3897b` |
| scene-state | `house_of_tomorrow/foyer#named_plant_pedestal` | `chapter-01-batch05-2026-11-15/pedestal-foreground-v02/B-plant-adoption-v02.png` | `art/scenes/house_of_tomorrow/states/foyer_named_plant_pedestal.png` | 314x206 RGBA | `e1c42ce00d5fe2ad` |
| scene-state | `house_of_tomorrow/storage#stored_desk_plant` | `chapter-01-batch05-2026-11-15/assets/C-stored-plant.png` | `art/scenes/house_of_tomorrow/states/storage_stored_desk_plant.png` | 314x206 RGBA | `867019e15581bed7` |
| scene-state | `house_of_tomorrow/storage#stored_red_stapler` | `chapter-01-batch05-2026-11-15/assets/D-stored-stapler.png` | `art/scenes/house_of_tomorrow/states/storage_stored_red_stapler.png` | 314x206 RGBA | `d524b3eee63fd3c5` |
| scene-state | `house_of_tomorrow/storage#stored_rubber_band_ball` | `chapter-01-batch05-2026-11-15/assets/E-stored-band-ball.png` | `art/scenes/house_of_tomorrow/states/storage_stored_rubber_band_ball.png` | 314x206 RGBA | `00f4926835332c59` |
| scene-state | `house_of_tomorrow/storage#stored_timing_clicker` | `chapter-01-batch05-2026-11-15/assets/F-stored-clicker.png` | `art/scenes/house_of_tomorrow/states/storage_stored_timing_clicker.png` | 314x206 RGBA | `22660a4ea50b2f8b` |
| scene-state | `house_of_tomorrow/utility_exit#returns_display` | `chapter-01-batch05-2026-11-15/assets/G-returns-display.png` | `art/scenes/house_of_tomorrow/states/utility_exit_returns_display.png` | 314x206 RGBA | `a6df04106deb0da8` |

Where each image is registered in `story/artwork.draft.json`:
- **Scenes:** `scenes[<id>].assetPath`.
- **House views:** `portraits["house:idle"].views[<scene>]`. The record has `format: "opaque-complete"`.
- **Album pages:** `focus["house_of_tomorrow/portrait_gallery/album"].pages[n]`, each with `startsWith`.
- **Photo:** `items.family_portrait_photo.slot` and `.inspect`.
- **Scene states:** `scenes[<id>].states[]`, each with `layer` and `selection`.

All of these records are `generated`. The layered portrait-background records for the foyer and the
gallery were removed, because docs/92 section 1 replaces them with the complete views.

**Remaining placeholders: none in the Prologue or Chapter 1.** Chapter 2 art is a separate workstream
and is unchanged, so the build still uses the `fixture` profile.

## 4. Engine, importer and renderer

Everything below is data-driven. `game/js` holds no House id or prose; the existing independence
guard checks this. Art never adds a second state or inventory system: `Rules.view` selects art from
the real rules state, and nothing art-related is stored.

### 4.1 Scene states (docs/92 section 3)

`story.assets.sceneStates[<scene>] = [{ id, layer, path, at?, focus?, if? }]`.
- `layer: "replace"` is an opaque alternate of the whole scene.
- `layer: "overlay"` is one transparent layer, drawn at the same 0,0 origin at 4x NEAREST.
- A state shows when every selector it names holds:
  - `at`: the current node, as `chapter:node`;
  - `focus`: the close-up on show;
  - `if`: an ordinary rules condition (flags, inventory, marks, checks).
- `view().sceneArt` is `{ replace, overlay }`.
- Draw order: the opaque scene or its alternate, then at most one overlay. The scene FX are
  unchanged.

**What `Rules.validateStory` enforces:**
- the shapes;
- `at` nodes must lie in the state's scene;
- flags must be known;
- the walk proves that in every reachable state at most one `replace` and one `overlay` can show;
- every state must show in some reachable state.

**Validator cost.** `liveKeys` counts a state's flags as read only at the nodes of its scene, not
globally. The three-chapter walk stays at **165,527 states, ~28 s, ~0.5 GB RSS**, identical to PR #6.

**Renderer.**
- `stage.js` has a new `overlay` art class. `setSceneArt(key, label, overlay)` swaps the scene and the
  overlay independently.
- Every state of every scene in a chapter is preloaded with that chapter, so there is no
  first-frame flash.

| State | Layer | Selection | Notes |
|---|---|---|---|
| `portrait_gallery#album_removed` | replace | `focus: house_of_tomorrow/portrait_gallery/album` | From the close-up on show, never from `family_album_inspected`. It shows on every album page; on CLOSE THE ALBUM the base gallery is back. |
| `foyer#named_plant_pedestal` | overlay | `at: chapter-01:plant_adoption`, `if: { has: desk_plant, notFlag: plant_registered_as_resident }` | The authored choice consumes the plant; the next node is the public exit, so the pedestal goes with the scene. |
| `storage#stored_<item>` (4) | overlay | `if: { flagIs: [house_stored_item, <item>], notFlag: house_storage_recovered, lacks: <item> }` | `house_stored_item` is set only when the House takes the real held item. Retrieval clears it. |
| `utility_exit#returns_display` | overlay | `if: { flag: equipment_registered }` | The clean exit shares `house_exit_route: mechanical` but shows the neutral display. |
| `chair#default_unrestrained` | replace | `selection: null` (unbound) | Installed and size-checked, but not in the story: no authored view needs it (section 7). |

### 4.2 House intercom: opaque-complete portraits (docs/92 section 1)

`story.assets.portraits.house = { views: { "house_of_tomorrow/foyer": ..., "house_of_tomorrow/portrait_gallery": ... }, view }`.
- The node's existing `backdrop` picks the view. The importer emits it from the scene the
  conversation happens in.
- `view().portrait` is `{ cast, id, view }`.
- The renderer draws it in its own `portraitView` layer (art class `view`, 564x278 at 1x, at the
  background offset). There is no background layer, no pose layer and no blank duplicate.
- Both views are preloaded with Chapter 1.
- The receptionist and the drone keep their layered portraits, unchanged.
- A `pose` on a complete-view speaker, or a view that is not registered, is an error.

### 4.3 The family album: semantic pages (docs/92 section 2)

`story.assets.focus[<id>] = { pages: [{ path, paragraphs }] }`. The importer pairs each page with the
paragraph of the focus node's text that starts with the page's `startsWith`:

| Page | Paragraphs | Picture |
|---|---|---|
| 1 | "Page one ..." | `album_page_1.png` |
| 2 | "Page two ..." | `album_page_2.png` |
| 3 | "Page three ..." and the closing "The album continues ..." | `album_page_3.png` |

The validator requires the node's paragraph count to equal the pages' total.

**How Focus A pages the text (`surfaces.js`).**
- A text page never spans two semantic pages.
- A semantic page that overflows continues on further text pages with the **same** picture.
- `segmentA()` reports the semantic page on show.
- `story-flow.js` re-applies the art on every page change. The picture changes exactly when that
  page's text begins.

Typewriter pacing, CONTINUE and CLOSE THE ALBUM are unchanged. The album is never an item. The
printed photograph is still given once, at `portrait_print`.

**`family_album_inspected` is unchanged:** it is still set on entering the album. This was judged
narrow enough, because:
- the only card in the album, CLOSE THE ALBUM, is offered only after the last page;
- the confrontation card it unlocks appears only back at `portrait_print`.

So it cannot unlock anything early.

### 4.4 Pre-existing engine bug fixed: the Focus A visit window

A `back` return writes no transcript entry. Closing the album and opening it again therefore left
both visits next to each other in the transcript, and the focus history window merged them:
- the second visit re-showed all of the first visit's text, which breaks docs/72's "this visit
  only";
- with pages, page-one text appeared beside the page-three picture.

`Rules.history` now starts the visit at the latest arrival at the close-up (`71bdb38`). History is
presentation only, so route state, saves and validation are unaffected.

### 4.5 Re-evaluation and saves

Art is re-derived from `Rules.view` at:
- every transition, including restoring an autosave;
- every node text;
- every Focus A page;
- every item inspect or READ, and every context step done in place.

**What survives a save and reload:**
- the drawer overlay;
- the pedestal;
- RETURNS;
- the album-removed gallery. A reload mid-album restores the visit's full text on its last page,
  and the picture matches that page. This was the existing text behaviour.

Closing the album after a reload restores the album. The save format is unchanged.

## 5. QA

Each suite is listed with its local result and runtime on this Mac. Both browsers were run where
the suite supports them.

| Suite | Result | Notes |
|---|---|---|
| `import.js --check` | VALID (preview) | 3 chapters, 164 nodes, 247 choices, **165,527 reachable states**, 11 endings, 31 checks. ~28 s, ~0.5 GB RSS, the same as PR #6. |
| `import.js` + `--verify` | OK | Content `407d8ec78f1c`. |
| `glyph-ink/build.js --verify` | OK | |
| `validate_route.js` (v1, v2) | 49/49, 49/49 | |
| `validate_story.js` | 178/178 | Rules, fixtures, 59 mutants, saves, presentation, the visit window. |
| `validate_story_import.js` | 92/92 | 653 s. Two pinned art counts updated (section 5.1). |
| `validate_ch02_routes.js` | 157/157 | 99 nodes, 56 outcomes. |
| **`validate_ch01_art.js`** (new) | **253/253** | ~55 s. Provenance, including source blobs at `cf57555`; registry; state matrix on real routes; 7 mutants. |
| `validate_assets.js` | 59/59 | |
| `validate_assets.js --browser` | 97/97 | Chromium + Firefox. |
| `storyboard/qa-smoke.mjs` | PASS | |
| `storyboard/qa-browser.js` | 24/24 | |
| `run_story_qa.js` | 124/124 | Chromium + Firefox. |
| `run_ch01_routes_qa.js` | 154/154 | 9 routes × 2 browsers. |
| **`run_ch01_art_qa.js`** (new) | **164/164** | Chromium 82/82, Firefox 82/82. Pixel comparison against the source PNGs; reloads. |
| `run_ch02_routes_qa.js` | 346/346 | Includes the Scene Pickup Inspector. |
| `run_qa.js` (M2 reception) | 528/528 | A first run made concurrently with the layout lab had 7 Firefox choice-scroll failures: the known CPU-load flake (docs/87). The rerun alone passed all 528. |
| Polish lab | 143/143 | |
| Layout lab | 1916/1924 | Exactly the 8 known failures, by name (`check_known_failures.js`: PASS). |

### 5.1 Updated assertions (each encoded the pre-integration state, or the pre-PR #7 prose)

- **`validate_story_import.js`:**
  - House scenes are now their own production files, not `null`.
  - Art counts: 28 generated Prologue images plus 28 generated House images, each matching its
    provenance hash.
- **`run_story_qa.js`:** the arrival now shows its real art, not the placeholder canvas, and its
  prose is the PR #7 version.
- **`run_ch01_routes_qa.js`:** the photo brief is now PR #7's faceless crop, and it checks the
  photo's slot and inspect art.
- **`validate_assets.js`:** the contract's art classes now include `overlay` and `view`.
- **`storyboard/qa-smoke.mjs` and `qa-browser.js`:**
  - record counts now include the sub-records;
  - the House intercom is the documented opaque-complete exception;
  - the arrival prose and choice are the PR #7 wording. PR #7 had not updated these assertions.
- **`run_qa.js` (M2 static guard):** it admits two more files, each by exact path, still with no
  folder wildcard:
  - the provenance JSON;
  - any image whose sha256 matches that record (this covers the unbound default chair).

No test was disabled. No expected failure was added. No console error was suppressed.

### 5.2 What the new browser suite proves

Each scenario starts from a real Prologue save.

At every settled step, the DOM's scene, overlay and portrait layers must equal what `Rules.view`
selects for the game's own state:
- at most one overlay;
- each image decoded, at an integer scale.

At the key states, the screen's pixels are compared with the source PNGs, composited as docs/92
requires:
- opaque scene, then one overlay, at 4x NEAREST from 0,0;
- portrait and close-up art 1:1.

The shell frame is masked by its own alpha. The result is 0 differing pixels:
- the arrival;
- the House foyer and gallery views;
- album pages 1–3 and the album-removed gallery on each page;
- the restored gallery;
- the storage drawer with each of the 4 items;
- the foyer with the pedestal;
- the public exit;
- the in-use chair;
- the equipment corridor, both neutral and with RETURNS.

It also checks:
- reloads at the drawer, the pedestal, RETURNS, mid-album and after closing the album;
- a repeat album visit;
- retrieving versus leaving a stored item;
- the photo's slot and inspector art;
- that the Martin route shows its rooms.

## 6. Private review

From the worktree:

```bash
cd "_worktrees/CYOA-ch01-art-integration"
python3 -m http.server 8000
```

- Game, new playthrough: `http://localhost:8000/game/index.html?new`
- Private storyboard: `http://localhost:8000/tools/storyboard/index.html`. Open "Artwork" for the
  state, view and page records with previews; a node lists exactly the states it can show.
- Screenshots: `node game/qa/run_ch01_art_qa.js` writes 48 PNGs (24 per browser) to `game/qa/ch01_art_screenshots/`.
  They are not committed, to keep `.git` small; CI keeps them as the `qa-browsers` artifact.

**Suggested owner playtest.** In the Prologue, keep one item at intake; the House stores the first of
clicker, ball, stapler or plant that you hold.

1. **Album.** Deposit everything. In the House, refuse until dinner, then object to another activity
   and attend the photo session. Then:
   1. Open the album. Read pages 1 to 3: the album is gone from the cabinet throughout.
   2. Close it, and open it again.
   3. Ask the House about the photographs: you get the gallery intercom view.
   4. Inspect the photograph item in the inventory.
2. **Storage.** Keep the stapler, the plant, the clicker or the ball. Allow the House to put things
   away, ask for the bathroom, then recover your belongings. Check that:
   - the drawer shows that item;
   - after RETRIEVE the drawer is empty;
   - after LEAVE the item stays stored and is not held.
3. **Named plant.** Keep the plant, recover it, refuse everything and ask to leave. Introduce the
   plant: the rug-hatch pedestal appears in the foyer. Leave it: the public exit shows no pedestal.
4. **Chair and service exits.** Try the Rest Assured chair (in-use art). On escape, force the
   release: the neutral display means a clean exit; RETURNS means you are registered as equipment.
   Different `?seed=` values give different outcomes.
5. **Reload** (just reload the page) at the drawer, the pedestal, RETURNS or mid-album: the same art
   comes back.

## 7. Open items for the owner and Story Director (not changed here)

1. `welcome_home` still says "A small black speaker grille tilts toward you." The approved art is a
   flush ivory intercom; its grille is dark, but the fixture is not black and does not tilt. PR #7
   corrected `badge_registration` ("recessed faceplate") but not this line. It is a creative wording
   decision, so it is left as authored.
2. **The default upright chair** (`chair_default_unrestrained.png`) is installed but unbound:
   - `chair_warning` uses the lounge image, as docs/92 requires;
   - `chair_locked` and `exit_chair_fatal` use the in-use chair.

   Binding it needs an authored view (docs/92 section 4 forbids inventing one).
3. **All 29 images are `generated`.** Setting `approved` is the owner's art gate.
4. **The death screen and chapter-title interstitials** remain separate workstreams (PR #8). The fatal
   chair keeps its current BEGIN AGAIN ending.
