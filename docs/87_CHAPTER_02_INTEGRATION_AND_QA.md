# 87: Chapter 2 (Biology Park) integration, validator stabilization and QA

Branch `agent/ch02-claude-qa` in worktree `_worktrees/CYOA-ch02-claude-qa`. It starts from PR #6
(`agent/scene-pickup-inspector-20261115`, head `36bb578`) and will be pushed as a fast-forward of
PR #6.

**Status: a private, playable draft for review.**
- All three chapters stay `draft`. `--promote` was not run.
- Nothing was merged. The public storyboard repo was not touched.
- No new artwork was made.

## 1. Commits

| Commit | What |
|---|---|
| `035286a` | PR #5's `6749021`, cherry-picked with `-x`: compact numeric edges, and processed states can be garbage-collected. PR #5's first commit was already in the chain as `a1d94be`, with an identical `rules.js`. |
| `8ee0287` | Validator: `liveKeys` state merging, no double copy, `copyJson`, an equivalence gate (section 2). |
| `4238fe5` | Content-reachability correction, PMO-approved: two unreachable tower variants removed. Their prose is kept in `docs/handoff/chapter-02.removed-unreachable-variants.md`. |
| `2664b06` | Generated three-chapter preview, `game/content/story.generated.js`. |
| `9ae06a4` | Scene Pickup Inspector: the proxy cards no longer flash, and the placeholder note is accurate (section 4). |
| (QA commit) | Chapter 2 engine and browser suites; two-chapter suites extended to three; CI (section 5). |

## 2. Validator memory and run time

**Root cause.** The route walk's state key held every flag, every resolved check and every spent
`once` entry. Chapter 2 reads almost none of the Prologue or House flags, and none of their checks.
So the walk explored *the product* of the histories of all three chapters:
- CI runs 43728461993 and 43728553868 ran out of heap at about 2 GB;
- reproduced locally: out of memory after 168 s, at 2.29 GB RSS.

**Fix: `liveKeys`**, importer only. A value stays in the key only while something ahead can still
read it:
- "ahead" means any node statically reachable by `to`, by `chapter`, or by `back` to the recorded
  opener;
- it also covers anything read outside the chapters: item descriptions and effects, case files,
  context actions.

States that differ only in values nothing ahead can read have identical futures, so they are
merged.
- Nothing is capped, skipped, downgraded to a warning or removed from the conditions.
- The scan over-approximates reads (any condition-shaped key counts), so it can only keep extra
  state, never drop live state.

Also:
- `bare()` no longer deep-copies a state the walk has just made. Every caller passes a fresh state.
- The validator's own step copies use `copyJson`, a structural copy that gives the same result as
  the JSON round trip. Runtime `step()` still uses `clone()`.

**Measurements** (this Mac, Node 20.20.2):

| Story | Walk | States | Time | Peak RSS |
|---|---|---:|---:|---:|
| 3 chapters | before (full keys), 2 GB heap | out of memory | 168 s | 2.29 GB |
| 3 chapters | `liveKeys`, before the copy changes | 165,527 | 76 s | 305 MB |
| 3 chapters | `liveKeys` + no double copy + `copyJson` (committed) | 165,527 | 28–30 s | 535 MB |
| 2 chapters (PR #4 story) | full keys | 147,100 | 20 s | 0.54 GB |
| 2 chapters (PR #4 story) | `liveKeys` | 2,303 | 0.3 s | 74 MB |

**Proof that it is exact:**
- On the two-chapter story, the full walk and the `liveKeys` walk give the same errors and the same
  181 observations: every node, text variant, check outcome and item description.
- They also use the same 101 choices and entries.
- `game/qa/validate_story.js` now walks every story it validates both ways:
  - the stories: the reception, both fixtures and all 59 mutants (136 comparisons);
  - each with and without `routeMarks`;
  - it requires the same verdict, errors and observations.
- A deliberately broken liveness (flags dropped from the key) fails that gate. So does a broken
  `copyJson`, which is checked against `clone()`.
- A full-key three-chapter walk, run once locally with a 60 GB heap, **did not finish**. It was stopped after 81 CPU-minutes at a flat 25 GB RSS. So the old keying is not just over 2 GB, it is impractical: exactness rests on the two-chapter comparison and the per-mutant gate above.

## 3. Importer

- `node tools/story-import/import.js --check`: **VALID (preview)**.
  - 3 chapters, 164 nodes, 247 choices, 165,527 reachable states, 11 endings reached, 31 dice
    checks.
  - 0 errors. Warnings: art placeholders, plus two unreachable fallbacks that were already present
    and are allowed (`chapter-02:end_maintenance` variant 6, `termination_notice[2]`).
- The build wrote content `8307a99e35f7`. `--verify` reports it up to date, and a rebuild is
  byte-identical.

**Content finding, resolved by PMO ruling.**
- `tower_arrival` and `tower_archive` opened with `office_spore_inundation` variants that no route
  can show: the flag is set only in the Spore Garden, after both nodes.
- Both variants were removed. The reachable contaminated tower, `tower_late_entry`, and the garden
  plume are unchanged.

## 4. Scene Pickup Inspector (PR #6) review

PR #6's design is sound and was kept:
- READ LABEL, USE ANTIDOTE and close (X or Escape) each commit the kit node's *authored* choice
  through the rules;
- so there is no second dice or inventory implementation in the UI;
- and `F.choose` refuses while the inspector is open.

Two fixes:
1. **Proxy-card flash.**
   - Problem: `presentCards()` animated the kit's READ / USE / CLOSE cards in as ordinary choice
     cards before `ready()` opened the inspector. Measured: 15 frames, about 250 ms, in both
     browsers.
   - Fix: on a `scenePickup` node the inspector now opens directly. The browser suite counts these
     frames on every kit visit and requires 0.
2. **Placeholder text.** The kit placeholder reused the item note "THE SLOT SPRITE IS SHOWN AT 3X…".
   It now says that the kit is not in your inventory until you close it.

Lifecycle verified in Chromium and Firefox, at all three sources:
- the environmental INSPECT card opens the 565×451 inspector, and nothing is added to the
  inventory;
- READ shows the expiry (1977 / 1969 / 1981), and READ is then spent;
- USE resolves the source's own authored check, with no pickup;
- closing by X or by Escape gives exactly one source-specific injector, with one item-received slip;
- the kit cannot be opened again: not on return, and not after reloads;
- a reload inside the open kit reopens the inspector without granting anything;
- the held injector can then be inspected, read and used from the ordinary inventory;
- success clears both infection flags; failure changes neither; the dose is consumed either way.

## 5. QA totals

| Suite | Result |
|---|---|
| `validate_route.js` (v1 / v2) | 49/49, 49/49 |
| `validate_story.js` (rules, fixtures, mutants, + liveKeys/copyJson gate) | 178/178 |
| `validate_story_import.js` (three chapters, ~35 full builds, 638 s) | 92/92 |
| **`validate_ch02_routes.js`** (new, engine) | **157/157**: all 99 Chapter 2 nodes reached, all 56 outcomes of the 28 Chapter 2 checks played, all 3 entry groups reached |
| `validate_assets.js` / `--browser` | 59/59, 97/97 |
| `tools/storyboard/qa-smoke.mjs` (extended to three chapters) | PASS |
| `tools/storyboard/qa-browser.js` (Chapter 2 graph, positions, export/import) | 24/24 |
| `run_ch01_routes_qa.js` (nine House routes; surviving exits now end on CONTINUE into Chapter 2) | 154/154 |
| **`run_ch02_routes_qa.js`** (new, Chromium + Firefox) | **346/346** (173 + 173) |
| `run_story_qa.js` (now continues House → Chapter 2 → a real ending → BEGIN AGAIN) | 124/124 |
| `run_qa.js` (M2 reception) | 528/528. See note below. |
| Polish lab | 143/143 |
| Layout lab | 1916/1924: only the 8 known failures (PASS) |

**What the Chapter 2 suites cover** (`game/qa/ch02_routes.js`): 57 routes, each a real
Prologue → House → Biology Park playthrough on a fixed seed whose real rolls give the outcomes
the route names.
- **The five House exits:**
  - each takes its CONTINUE card into the Bureau, with the matching arrival narration;
  - inventory, flags, checks, marks, seed and NOTES carry across;
  - the chair death stays terminal.
- **Item gating, positive and negative:**
  - the red stapler: the feeder jam (consumed whether it passes or fails), the tape loop (kept),
    the form interlock (consumed);
  - the clicker, the rubber-band ball, the Examiner badge;
  - the *physical* Acting Director credential: taking the item out of the state, with the same
    flags, removes every Director card;
  - the House equipment registration.
- **Groundskeeper:** review, promotion, jam pass, jam fail → sorter pass or fatal, hopper pass or
  fatal.
- **Spore and thorn exposure** are separate checks; tested uninfected, spore only, thorn only and
  both.
- **Walkway, Moving Forest** (all three ways), tower trace, both Director countermand options.
- **The trams:** the rooted tour tram and the reserve car are separate scenes and nodes.
  - The Courtesy Conductor speaks only after a successful spur roll.
  - On a failed roll it stays dark, the run ends in the underground station with certification,
    and no liability is recorded.
- **Courier:** carry, surrender, destroy pass, destroy fail with dust avoided or infected.
- **Appeals and planting:**
  - all five appeals and all four interlocks;
  - breakout pass;
  - breakout fail: fatal when infected; for uninfected players, the waste chute passes or is fatal.
- **Translator:** cables pass (root door) or fail (duct pass or fatal), tape, staple-loop pass or
  fail into the contaminated late tower, clicker, ball.
- **Antidotes:**
  - all three sources × direct / read / take, with cure and no cure, and thorn variants;
  - the authored odds are pinned (need 3 / 4 / 3, spore −1, thorn −2), not rebalanced;
  - save and restore at every stage of the pickup.

**CI** (`.github/workflows/qa.yml`):
- The content job gains `validate_ch02_routes.js`.
- The browsers job gains `run_ch02_routes_qa.js`.
- The one-shot `ch02-preview-build.yml` is removed: its job was to build and commit the preview,
  which this branch now does.

## 6. Open items

Defects and questions found in review. None was fixed by inventing prose.
1. **No feedback after a direct USE from a kit** (Story Director wording).
   - `use_*_from_open_kit` and `use_*_after_read` have no `result` text on pass or fail.
   - The inventory USE of the same injector does have authored result lines.
   - So a player who injects straight from the kit is never told whether it worked.
   - Proposal: reuse the two existing inventory result lines. This needs approval.
2. **Exit narration after the kit is handled.** `public_exit_staging` (and the maintenance and
   customs equivalents) still describe the *closed, sealed* box after it has been emptied or
   taken. It needs a variant on `*_kit_handled` (Story Director).
3. **Provisional numbers, still unapproved** (Story Director):
   - all 28 Chapter 2 check targets;
   - the antidote odds;
   - the expiry dates;
   - whether the staple loop keeps the stapler (as authored now);
   - that the clicker and the ball are consumed.
4. **Long item names without art** show truncated in the inventory slot placeholder, for example
   "ANICAL". This is the existing dev slot placeholder, and it goes away with the art pass.
5. **`end_maintenance` variant 6** is an allowed but unreachable fallback: every maintenance exit
   has its own variant.
6. **Callback debts for Chapter 3** are as listed in the ledger appendix. No Chapter 3 content was
   authored.

## 7. Local review

```bash
cd "_worktrees/CYOA-ch02-claude-qa"
python3 -m http.server 8000
# New game:          http://localhost:8000/game/index.html?new
# Storyboard:        http://localhost:8000/tools/storyboard/index.html
```


## 8. Notes on the regression runs

**M2 first run: 520/528.**
- 1 static failure was real. The scene-pickup placeholder called `P.panel` directly from `stage.js`, which the M2 guard forbids. Fixed in `5a05a02`: `P.inspectArt` gained optional notes.
- 7 Firefox choice-scroll/overflow timing failures. They ran next to a hung browser process and the 25 GB walk.
- On a rerun of the final code the suite was 528/528, with Firefox 242/242.

**`run_story_qa.js` hang.** When it fails mid-scenario, the harness reports and then does not exit: its browser stays open. This is pre-existing behaviour and was not changed.
