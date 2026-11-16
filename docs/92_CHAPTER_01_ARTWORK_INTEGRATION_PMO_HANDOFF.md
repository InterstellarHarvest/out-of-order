# 92 — Gameplay PMO: Chapter 1 House artwork integration work order

**Recorded:** 2026-11-15
**Owner instruction:** Proceed with the complete Chapter 1 artwork handoff to Gameplay PMO.
**Status:** Implement in a **private isolated integration review branch**; no owner-authorized production merge, promotion or deployment.
**Target gameplay baseline:** `agent/scene-pickup-inspector-20261115` at `e98602f7992908a750672006f556b8efc15d686f` (three-chapter draft, PR #6).
**Single authoritative ART SOURCE:** `agent/ch01-art-batch05-interactive-states` at `cf575552fc729b952d99d25bea56dbc81b40619d`.
**Prose patch source:** PR #7, `agent/ch01-photo-prose-correction-20261115` at `ae27fc18c01a35d0953efe0f0c1a4fe7a428530e`.
**Design/audit context:** PR #8 (`docs/88`, `docs/89`, `docs/90`, `docs/91`) remains a draft; death art/layout and chapter-title interstitial are independent efforts.

## Mission and gates

Bring **all selected Chapter 1 artwork** into the real private playable three-chapter game, with correct scene/portrait/focus/item registry bindings and the minimum well-tested presentation support for semantic album pages and scene-state overlays.

**Do NOT** merge the massive `review/` artwork history into game production. Copy **only the 29 exact selected PNGs below**, preserving their bytes (read from the pinned art branch, not rebuilt from prompts). Install them at stable production paths under `art/` (use the repository's existing conventions), not inside `review/`, `source/` or `originals/`. Verify SHA256 equality from exact originals to copied production files, and record provenance and hashes in the integration QA report. The generated previews, masks and alternate generations remain preserved on the art branch, not duplicated in production.

You may implement and QA on a review branch immediately. The Story Director's visual review recommends these final candidates (including new rug-hatch plant B v02); **do not treat this as permission to mark all chapters approved or to merge/publish**. Keep manifest statuses `draft`. Stop at a tested draft PR for owner creative gate.

## Exact asset manifest (29 PNGs verified as existing on pinned art commit)

All paths below are relative to the repository root. **Do not mistakenly use the superseded first-pass plant overlay** at `review/chapter-01-batch05-2026-11-15/assets/B-plant-adoption.png`.

### 14 main scenes

| Story ID / asset | Exact source path at art commit |
|---|---|
| `house_of_tomorrow/arrival` | `review/chapter-01-batch04-2026-11-15/arrival-correction-v03/arrival-v03.png` |
| `house_of_tomorrow/foyer` | `review/chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/foyer-single-door-v03.png` |
| `house_of_tomorrow/lounge` | `review/chapter-01-batch02-2026-11-15/candidates/lounge-candidate-v01.png` |
| `house_of_tomorrow/storage` | `review/chapter-01-batch04-2026-11-15/candidates/storage-v02.png` |
| `house_of_tomorrow/dining` | `review/chapter-01-speaker-revision-2026-11-15/candidates/dining-v04.png` |
| `house_of_tomorrow/public_exit` | `review/chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/public-exit-single-door-v01.png` |
| `house_of_tomorrow/bedroom` | `review/chapter-01-batch02-2026-11-15/candidates/bedroom-candidate-v01.png` |
| `house_of_tomorrow/passage` | `review/chapter-01-batch02-2026-11-15/candidates/passage-candidate-v01.png` |
| `house_of_tomorrow/service_hatch` | `review/chapter-01-batch04-2026-11-15/candidates/service-hatch-v01.png` |
| `house_of_tomorrow/chair` | `review/chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-in-use-v04.png` |
| `house_of_tomorrow/maintenance` | `review/chapter-01-batch04-2026-11-15/candidates/maintenance-v01.png` |
| `house_of_tomorrow/utility_exit` | `review/chapter-01-batch04-2026-11-15/candidates/utility-exit-v01.png` |
| `house_of_tomorrow/portrait_gallery` | `review/chapter-01-batch03-2026-11-15/wide-speaker-position-v05/gallery-v05.png` |
| `house_of_tomorrow/bathroom` | `review/chapter-01-first-pass-2026-11-15/candidates/bathroom.png` |

### 2 complete opaque House conversation views

| Story ID / asset | Exact source path at art commit |
|---|---|
| `House speaker in foyer` | `review/chapter-01-speaker-revision-2026-11-15/candidates/foyer-conversation-v05.png` |
| `House speaker in portrait gallery` | `review/chapter-01-batch03-2026-11-15/printer-album-restoration-v04/candidates/gallery-conversation-v03.png` |

### 3 semantic Focus A album pages

| Story ID / asset | Exact source path at art commit |
|---|---|
| `Album page 1 — family ages` | `review/chapter-01-batch03-2026-11-15/candidates/album-page-01-v02.png` |
| `Album page 2 — frightened/exhausted family` | `review/chapter-01-batch03-2026-11-15/candidates/album-page-02-v01.png` |
| `Album page 3 — remains then empty chairs` | `review/chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/album-page-03-v04.png` |

### 2 family photograph item images

| Story ID / asset | Exact source path at art commit |
|---|---|
| `family_portrait_photo slot (96×96 RGBA)` | `review/chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/photo-slot-v03.png` |
| `family_portrait_photo inspect (565×451)` | `review/chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/photo-inspector-v04.png` |

### 1 additional chair state

| Story ID / asset | Exact source path at art commit |
|---|---|
| `Rest Assured default, unrestrained (314×206)` | `review/chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-default-v04.png` |

### 7 interactive states / overlays

| Story ID / asset | Exact source path at art commit |
|---|---|
| `A — gallery with album temporarily removed, RGB 314×206` | `review/chapter-01-batch05-2026-11-15/assets/A-album-removed.png` |
| `B — adopted named plant foreground rug hatch v02, RGBA 314×206` | `review/chapter-01-batch05-2026-11-15/pedestal-foreground-v02/B-plant-adoption-v02.png` |
| `C — storage desk plant RGBA` | `review/chapter-01-batch05-2026-11-15/assets/C-stored-plant.png` |
| `D — storage red stapler RGBA` | `review/chapter-01-batch05-2026-11-15/assets/D-stored-stapler.png` |
| `E — storage rubber-band ball RGBA` | `review/chapter-01-batch05-2026-11-15/assets/E-stored-band-ball.png` |
| `F — storage timing clicker RGBA` | `review/chapter-01-batch05-2026-11-15/assets/F-stored-clicker.png` |
| `G — equipment corridor RETURNS display RGBA` | `review/chapter-01-batch05-2026-11-15/assets/G-returns-display.png` |

**Counts:** 14 scenes + 2 complete opaque House portraits + 3 album semantic-page images + 2 family-photo item views + 1 additional default chair pose + 7 interactive variants = **29 selected PNGs**. The extra default chair state is available for integration if used coherently; the in-use chair is the authored `house_of_tomorrow/chair` scene.

## Presentation behavior — precise contract

### 1. House dialogue portraits: a narrow *opaque-complete* exception

- NPC human portraits (e.g. receptionist) keep their existing background + transparent pose-layer implementation unchanged.
- The House intercom requires **one complete opaque `564×278` image per talking location**, not a widened scene crop and not a separate transparent speaker foreground.
- `welcome_home` in the foyer presents `foyer-conversation-v05.png`; `portrait_before_album` in the gallery presents `gallery-conversation-v03.png`.
- The wall-mounted speaker is a flush ivory fixture (not a free-standing radio). Preserve correct gallery wide lower-speaker physical position; the higher speaker within the close-up is camera framing, not a new wall installation.
- Extend importer/asset resolver/render path minimally to register and choose the appropriate complete image based on speaker + scene/backdrop, without corrupting ordinary layered NPCs. Fully preload both. Do not fake a blank duplicate pose layer and silently imply all portraits are layered.

### 2. Family album: three semantic illustrations inside Focus A

- The album is a close-up within the **right-hand portrait/Focus A aperture**; the main `314×206` picture continues to show the portrait gallery.
- On choosing **OPEN THE FAMILY PHOTOGRAPH ALBUM**, the main scene must switch to A `album-removed` **while Focus A is displayed**. It stays absent across all album pages. On **CLOSE THE ALBUM**, restore the identical gallery-v05 with album on cabinet.
- Three explicit semantic pages, with existing story content mapped in order: 1) family grows older; 2) fearful, exhausted family; 3) skeletons/remains then empty chairs. Each picture remains paired to its specific narrative content. A text-wrapping/pagination adjustment must **not** switch images prematurely. If a semantic page's text overflows, continue within that semantic page using the *same picture*, then advance to the next authored page.
- Preserve normal typewriter pacing and Focus A CONTINUE/close semantics; no new left-scene location. Existing `album_closeup` focus ID is `house_of_tomorrow/portrait_gallery/album`. Avoid introducing unrelated global state. If shifting the existing `family_album_inspected` effect to completion is necessary, do it narrowly so the flag means the player actually reached the final narrative page; do not unlock confrontation early.
- Album is never added to inventory. The **separate complimentary printed family photograph** is still acquired at `portrait_print` and retains its slot/inspect artwork and text.

### 3. Scene-state overlays and artwork changes

- **A album removed** is an alternate **opaque main-scene image** (not an overlay); choose it from the **presented** Focus A album view, *not* from persistent `family_album_inspected`.
- **B named-plant pedestal v02** is transparent and placed over the approved closed-door foyer on the `plant_adoption` interaction while the actual `desk_plant` is held and the handover is not yet complete. It is larger, foreground on red rug with a cut-in hatch; don't use first pass. The authored choice consumes the plant. Do not duplicate that inventory effect.
- **C–F storage drawer** are mutually exclusive scene-aligned transparent overlays, selected only by `house_stored_item` equaling desk_plant / red_stapler / rubber_band_ball / timing_clicker AND item not yet recovered. Clear overlay when retrieved. Never infer inventory possession merely from an earlier Prologue flag.
- **G RETURNS** is a transparent overlay over the utility/equipment-service exit baseline **only** on registered outcome (`equipment_registered` / `exit_service_registered`). Clean mechanical escape must show neutral `—`. Mechanical route alone is NOT sufficient. Equipment wristband is narrated, not a new inventory pickup.
- Draw ordering: opaque scene (or A alternate) → at most one alpha overlay for applicable interaction → existing UI/scene FX. All objects share native `314×206` origin (0,0), exact integer 4× NEAREST at runtime. No automatic scaling to inventory-slot sizes.
- Re-evaluate selection after entering/exiting Focus, page changes, node/scene transitions, inventory effects, history/back navigation, autosave restore and inspection-overlay return. Prevent stale or duplicated overlays when the scene key itself stays the same.
- The complete image candidates are static; do not invent a trapdoor animation, an album disappearance animation, extra items or changes to gameplay flags. The original underlying art remains unchanged.

### 4. Rest Assured default and in-use scene states

- Both chair images were drawn at the same native size: the default is upright/unrestrained, with indicator off; in-use has restraints and a reclined back/raised footrest, indicator on.
- Preserve the inviting lounge image for initial chair choice. For `chair_locked`, `exit_chair_fatal` use the appropriate in-use state as authored. The available default close-up may be used only if a real preceding scene/view needs it; **do not invent an otherwise unnecessary intermediate narrative node** simply to display it.
- Do not alter dice checks, consume the stapler, adjust endings or create death overlays in this task.

### 5. Text alignment from PR #7

- Apply PR #7's **source JSON** changes for the unmarked single entrance door and revised fourth-chair family photograph. The visitor mistakenly thinks the ordinary solid single entrance might be a restroom; HOUSE OF TOMORROW is revealed only after badge registration.
- The gallery printer and closed album must remain visible in the normal scene. The physical photograph still shows three complete empty chairs, part of a fourth chair and a faceless seated visitor's partial shirt/lap/legs/forward-facing shoes.
- Reconcile carefully with the current three-chapter integration. Do not replace other Chapter 2 data or overwrite the generated file by hand. Story text changes must remain narrowly scoped to these approved corrections.

## Integration process — authorizations and limits

1. Start a fresh isolated worktree/branch from the verified PR #6 head, leaving `main`, PR #6, all art branches and PR #7/#8 untouched. Avoid bringing `review/` evidence into production.
2. Fetch pinned source art ref; copy exactly 29 selected PNGs under production `art/` paths. Preserve existing original art and all non-House images. Validate dimensions, alpha, source/destination hashes and usage.
3. Integrate the narrow portrait selection, explicit Focus album semantic pages and scene-state overlay support. Use the smallest defensible importer, schema and stage changes with tests. No second dice/inventory engine; presentation must read actual rules view/state.
4. Make only the agreed PR #7 prose/crop/door alignment updates, on top of active three-chapter content. If conflict, reconcile manually rather than overwrite a chapter or shared catalog from an older branch.
5. Update `story/artwork.draft.json` and `story/items.draft.json` production art registrations, keeping honest statuses and verifying every file. The registry remains the source of truth; no `review/` paths in approved-candidate production mappings.
6. Regenerate with `node tools/story-import/import.js`, verify with `node tools/story-import/import.js --verify`, and run `--check`; **do not run `--promote`**, do not mark `approved` and do not deploy.
7. QA real browser playthroughs in Chromium and Firefox, plus importer/route/unit/asset/storyboard/regression suites, including S3 preload/hash tests. Confirm no regressions to receptionist/reception v1, old inventory inspector, M2 shell, existing Chapter 2 routes or save format.
8. Commit and push the isolated branch. Open a **draft PR** targeting the current playable Chapter 1–2 integration branch, **not `main`**. Report code SHA, changed-file summary, test totals, known failures, unresolved design questions and actual screenshots or a private review lab. Stop for owner approval. No force push or merge.

## Acceptance and negative-control QA matrix

| Path / state | Must be observable |
|---|---|
| Arrival and doorway | Unmarked single ivory door outside; matching closed single foyer door; same door open in public-exit view; no scenic glazing or HOUSE OF TOMORROW sign on approach |
| House intercom foyer + gallery | Correct complete opaque `564×278` art in each room; portraits disappear in Narrative B/Focus mode; human NPC portraits remain truly layered |
| Gallery album | All 3 illustrations in order, semantic text matched, album removed from left scene for every page, album restored immediately on close, repeat visit works; no item added for album |
| Printed photo item | Added exactly once, art in slot/inspect, carries to Chapter 2, no protagonist face or accidentally visible head |
| Named-plant route | V02 foreground rug hatch appears only when actually held and offered; donation removes plant once, scene variant disappears on next scene |
| Storage item tests | Each of 4 possible actual confiscated items produces exactly one matching overlay; leave vs retrieve; empty after retrieval; never-held/stored negative controls; no duplicate pickup |
| Equipment-service outcomes | Clean exit retains neutral display; registered exit shows RETURNS and passes `equipment_registered` to Chapter 2; no wristband inventory item |
| Rest Assured | Correct chair state, both d6 attempts remain unchanged, fatal endpoint remains fatal (death comic later) |
| History, autosave and inspector | Overlays correct on restored states, no stale album-less view, art preloads before fades, no first-frame flash, item inspector remains functional |
| Chapter 2 & prologue regression | All five House surviving exit routes preserve flags, inventory, NOTES, checks/seed; Chapter 2 choices unaffected; Prologue/M2 reception unchanged |

**Suggested existing QA commands (verify exact local scripts and arguments in repo):**
`node game/qa/validate_route.js`, `node game/qa/validate_story.js`, `node game/qa/validate_story_import.js`, `node game/qa/validate_assets.js`, `node game/qa/validate_assets.js --browser`, `node game/qa/validate_ch02_routes.js`, `node game/qa/run_ch01_routes_qa.js`, `node game/qa/run_ch02_routes_qa.js`, `node game/qa/run_story_qa.js`, `node game/qa/run_qa.js`, `node tools/storyboard/qa-smoke.mjs` and `node tools/storyboard/qa-browser.js`. Include existing polish-lab/layout known-baseline handling. Do not present unknown failures as passes.

## Parallel and deferred work

- Death-screen illustrated comic and no-face/chunky-dim background are **separate** prototype work under docs/88/90/91. Keep the current fatal ending functional until approved; do not design art or replay semantics here.
- Chapter-title interstitials/fade/pixelation are **explicitly deferred until late production**. Maintain functional chapter transitions and all route-specific outcomes now.
- Chapter 2 artwork and Chapter 3 story development are separate workstreams. Do not edit their art in this PR.

## Stop condition

Gameplay PMO's deliverable is a **reviewable, fully tested draft integration PR** that actually runs Chapter 1 artwork and its interactive states, not just a manifest or list of placeholder assets. No promotion, merge, or public deployment without explicit owner direction.
