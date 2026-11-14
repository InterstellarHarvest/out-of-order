# CYOA — Story Import and the Content-Driven Game

**Date:** 2026-11-14
**Branch:** `agent/story-import-integration`, from private `main` `ca73b8e`. Not merged; promoting it to `main` needs the owner's approval (section 9).
**Entry point:** `game/index.html`. It plays the imported story. `game/index.html?story=reception` plays the M2 reception slice, which is the regression fixture.
**How-to for authors:** [tools/story-import/README.md](../tools/story-import/README.md)

## 1. What this is

The game is now content-driven. The storyboard JSON is the editable narrative source.
`tools/story-import` turns it into one generated file, which the existing engine plays inside the
existing M2 shell.

A story change is a change to content alone. It never edits engine, UI or art code, and the
generated file is never edited by hand.

```
story/*.json  ──node tools/story-import/import.js──▶  game/content/story.generated.js  ──▶  game/index.html
(authoring source:                                      (cyoa-story-v2 + build record:       (rules.js v2, story-flow.js,
 chapters, items, artwork,                               content hash, version, source        stage.js, surfaces.js)
 manifest, runtime settings)                             hashes, art status + sha256)
```

There is still one rules engine: `game/js/rules.js` v2 (docs/72, docs/74), with `begin`, `step`,
`view`, `validateStory`, `serialize`, `restore`, `resume` and the S3 asset registry.
The reception keeps its v1 flow (`js/flow.js`), unchanged. Moving the reception itself to the v2
flow is S9, a separate, gated step.

## 2. The data contract

### 2.1 Sources (`story/`)

| File | Authority | Read for |
|---|---|---|
| `storyboard-manifest.json` | storyboard | Chapter list, in play order: `{id, title, file, status}`. The first chapter is the start unless `start` says otherwise. Also names the items and artwork files. |
| `chapters/<id>.json` | storyboard | `{title, start, scene, nodes}`. Node and choice fields are the cyoa-story-v2 grammar (docs/72 section 2), used as authored. |
| `items.draft.json` | storyboard | `{id: {name, description, read?, inspect?}}`. `inspect: {effects, once}` runs when the item is opened, as with the sealed box. |
| `artwork.draft.json` | storyboard (`cyoa-storyboard-artwork-v1`) | **The only authority for art paths and art status.** It holds scenes (with an optional `portraitBackground`), portraits `<speaker>:<pose>` (with optional `layers`), items `{slot, inspect}` and focus targets. |
| `runtime-settings.json` | new, private repo | What the export does not carry: `story` id, `save` policy, and cast display names (`cast.<speaker>.name`). |
| `storyboard-layout.json` | storyboard | **Never read.** Box positions are not gameplay. |

Prompts, notes, direction text and `suggestedFilename` are not read.

### 2.2 Conversion rules (`tools/story-import/convert.js`)

- **Ids are kept exactly:** chapter, node, choice, item, scene, speaker and pose ids. A focus id is
  `location/scene/target`.
- **Every field is either imported or rejected.** An unknown field is an error, never dropped.
  `notes`, `comment`, `position` and `layout` on a node are authoring-only: they are reported, not
  imported.
- **Art comes from the artwork registry:**
  - scene ids map to `assets.scenes`;
  - a speaker's poses map to `assets.portraits.<speaker>.poses`;
  - a dialogue node's backdrop is the opaque portrait background paired with the node's scene
    (`scenes[<scene>].portraitBackground`);
  - item art comes from `items[<id>].slot/inspect`.

  An item's own `slotArt`/`inspectArt` may only be null or repeat the registry; a different value
  is an error. The default pose and backdrop do not depend on authoring order: `default` if one
  is authored, otherwise the first alphabetically.
- **Flags** are declared from every flag that content sets or tests, with initial value `false`
  (`runtime-settings.initialState` can override this).
- **Item marks** beyond the engine's own (inspected, read, shown, used) are declared from the
  effects that set them (`story.marks`). A mark that a condition tests but nothing sets is an
  error, which catches typos.
- **Unfinished nodes:** a node with no choices that is not `end: true` is an unfinished hand-off.
  - A preview build ends there explicitly: `end: true` plus one system card,
    `DRAFT ENDS HERE. BEGIN AGAIN.` The authored narration is unchanged.
  - An approved build refuses it.
  - Nothing else is ever invented.
- **Missing art** (no record, or no `assetPath`):
  - a preview build uses the labelled DEV PLACEHOLDER (fixture profile) and a warning;
  - an approved build refuses it.
  - A path that names a file which does not exist is always an error.

### 2.3 Validation

Every build runs:
1. the converter checks above;
2. `Rules.validateStory`, the full v2 validator. It checks:
   - shape and references: destinations, items, flags, marks, conditions, effects, dice checks,
     chapter transitions, back-without-opener, and the font charset;
   - a walk of every reachable state: dead ends, unreachable nodes and choices, unseen variants,
     whether an ending can still be reached.
3. art files: each must exist, be a PNG of its class's native size (scene 314×206; portrait,
   backdrop and focus 564×278; slot 96×96; inspect 565×451), and come from no
   `source/`, `originals/` or `review/` path.

Rules additions made for the import (v2 half only; the v1 half is untouched):
- item `inspect` effects;
- `story.marks`;
- `Rules.migrate` (section 6);
- the importer-only walk option `routeMarks`. It keeps only route-relevant item marks in the
  state key, which cuts the prologue walk from more than 2 minutes to 0.5 s (1867 states).

One allowance: when the conditions above an unconditional fallback variant already cover every
reachable case, the importer reports that fallback as unreachable but does not reject the build.
The schema requires the fallback to exist. Every other never-shown variant is still an error.

### 2.4 Generated output

`game/content/story.generated.js` sets `window.CYOA_STORY` (the story) and
`window.CYOA_STORY_BUILD` (the record). It is plain script, so `file://` keeps working.

The record holds:
- `contentHash` (sha256 of the canonical story);
- `version` (derived from that hash);
- `channel` (`preview` | `approved`);
- every source file's sha256 and git blob id (`git log --find-object=<blob>` finds the source
  revision);
- `draftStops`;
- every art file with its kind, artwork status and sha256;
- the validator stats.

There are no timestamps, so identical JSON always gives an identical file. Chapters are emitted in
manifest order, so changing one chapter leaves the others' text byte-identical.

## 3. Commands

| | Command | Writes |
|---|---|---|
| A. Validate only | `node tools/story-import/import.js --check` (`--from <folder>` for a fresh export elsewhere) | nothing |
| B. Preview build | `node tools/story-import/import.js` | `game/content/story.generated.js` |
| C. Approved promotion | `node tools/story-import/import.js --promote` | the same file, approved channel. Refuses when files outside `story/` are changed, and prints the review-branch Git commands. |
| Stale check | `node tools/story-import/import.js --verify` | nothing; exit 1 if the output does not match `story/` |
| Glyph ink table | `node tools/glyph-ink/build.js` (`--verify`) | `game/js/glyph-ink.js`; re-run after any font atlas edit |

Exit codes: 0 means ok, 1 means invalid or stale, 2 means usage. `--verbose` lists art that is not
yet approved.

## 4. Runtime: engine, narrative, UI and art kept apart

| Part | File | Responsibility |
|---|---|---|
| Rules | `game/js/rules.js` | State, conditions, dice, effects, inventory, choices, transitions, saves. Pure. |
| Flow | `game/js/story-flow.js` (new) | The M2 phase machine driven by `begin`/`step` events: typing → beat → arriving → choosing → sending → reply-beat → transition. Also autosave and load. |
| Surfaces | `game/js/surfaces.js` (new) | Narrative B narration on the B overlay, and the Focus A description. |
| Stage | `game/js/stage.js` | The approved M2 UI. Story reads go through one port (the v1 port by default, so the reception draws as before). Adds runtime scene, portrait and focus swaps and kind marking on cards. |
| Art | `G.ART`, built from `story.assets` | Keys `scene:` `portrait:<id>:background|pose:` `focus:` `item:` `inspect:`. Changing an art reference is content only. |

Presentation follows the owner's rounds 2–6 grammar (docs/70), using geometry from the reviewed
Narrative Study defaults (now `G.TUNING.narrative` / `focus`):

- **Dialogue**
  - Portrait background and pose layers.
  - NPC speech and directions in the Dialogue face, never quoted.
  - The player's echo: speech in the Choices face, actions in action ink, never bracketed.
- **Narrative B**
  - Second person, one dark ink, speech in quotation marks.
  - Types at dialogue speed, accumulates for the scene and scrolls with the dialogue's thumb.
  - Presentation-only CONTINUE between paragraph groups. These are never a rules step and never
    saved.
- **Focus A**
  - The close-up sits in the portrait aperture; the description is paged over the speech panel.
  - It shows the current visit only.
  - `back` returns to the B opener, whose narration continues.
- **Cards**
  - Spoken cards show quotation marks.
  - Action cards use action ink `#8e2c1f`.
  - Continue and system cards are plain.
  - Card art, geometry, motion, inventory slide, inspector, NOTES/FILES panels, slip, tooltips and
    fonts are all M2's own.

## 5. The prologue as a test chapter

`prologue-00` (29 nodes, draft) plays end to end:
- the drone conversation;
- the sealed box, which unpacks when opened;
- the property counter, with conditions on the unpacked items;
- reception on the approved M2 layers, with SHOW of the notice;
- the key-tag question, which needs the tag READ;
- the explicit DRAFT STOP at `reception_hallway`, the unfinished hand-off.

It is a test of the architecture, not canon. Its 28 art files are `generated` drafts (not
approved). The 5 reception and key files are `reused` approved M2 art.

**Not adopted:** the art-direction proposals on the docs branch (for example "pictogram
narration", c7cd75b). The chapter JSON is imported exactly as authored.

## 6. Saves and revisions

- **Autosave.** After every committed step when `story.save` is true, to
  `localStorage['cyoa-save:<story>']`. Never on a presentation CONTINUE, a scroll or an overlay.
  `?new` starts fresh; `?nosave` disables saving.
- **Every content change gives a new `version`.** On load:
  1. Same version: `Rules.restore`.
  2. Otherwise `Rules.migrate`. A save is kept only if everything it refers to still exists:
     - chapter, node and opener;
     - every decision-log node and choice or item entry;
     - every resolved check, re-derived from its seed;
     - items and marks;
     - flags: newly declared flags are added at their initial value (the one migration performed);
       a flag the save holds that is no longer declared makes it incompatible.
  3. A save that does not fit is **refused, never half-loaded**. The game starts fresh,
     `body[data-save]` is `refused` with the reason, and the old save is kept under
     `cyoa-save:<story>:refused`.
- **Rollback.** `git checkout <commit> -- story game/content/story.generated.js`, or
  `git revert <content commit>`.
- **Staleness.** `--verify` and two QA checks (`validate_story_import` baseline, `run_qa` art
  guard) fail when `story/` and the generated file differ, or when the generated file was edited
  by hand.

## 7. QA

See section 10 for the run on this branch.

| Suite | What it covers |
|---|---|
| `node game/qa/validate_story_import.js` (new) | 58 checks on edited copies of the JSON: every acceptance case of the brief except rendering. |
| `NODE_PATH="$(npm root -g)" node game/qa/run_story_qa.js` (new) | 41 checks × Chromium + Firefox, on the real page and file://. |
| `game/qa/validate_route.js` (and `--v2`), `validate_story.js`, `validate_assets.js --browser` | Engine and asset contracts. The asset audit now includes the imported story. |
| `game/qa/run_qa.js` | M2 reception regression, now at `?story=reception`. Its art guard admits the imported story's art by recorded sha256, plus the pinned B overlay. |
| polish lab, layout lab QA | M2 lab regressions. |

**Fixed here (pre-existing on `d905b0b`):** the game froze when opened from `file://` the first
time an item arrived. The slip's `inkRows` called `getImageData` on a canvas tainted by the
file-origin font atlases. The fallback now reads `game/js/glyph-ink.js`, a table generated from
the atlases and checked against them, and gives exactly the pixel scan's rows. Served pages still
use the pixel scan, so their rendering is byte-identical.

## 8. Reconciliation

| Source | Disposition |
|---|---|
| `main` `ca73b8e` | Base. |
| `agent/engine-s3-asset-integration` `d905b0b` | **Merged** (cedf697), byte-identical tree. It contains `m2-round2-integration` `312928a`, `m2-reception-polish-lab` `e66e7bf`, the engine v0 rules S1–S2.1 (cherry-picked from `agent/engine-v0-rules` `713f5a9`) and every M2 art pass: density-contract-final, art-production-01, art-integration, inspector-art-01/02, portrait-background-revise-01, notes-files-art-01, transient-ui-art-01. Conflicts were only generated QA outputs and `run_qa.js`/`core.js`/`snapshot_assets.js`, and each of main's frame-fix hunks was already in the S3 line. |
| `agent/engine-foundation-design` `53205b6` | **Cherry-picked:** docs/72. |
| `docs/story-gameplay-study-v01` `6393d43` | **Selected:** `story/` (5 files, unchanged) and the 28 PNGs that `artwork.draft.json` references. **Preserved, not merged:** its 151 commits of studies, rulings, the storyboard tool, art candidates (continuity v01–v03 alternates) and review proofs. It was active today (another session). |
| `agent/narrative-study-lab` `7544c5d` | **Selected:** the x1919-fixed B overlay (Candidate 1) and the reviewed defaults, as production values. **Not merged:** lab code, the hardcoded action ids, the vocalisation regex, the OBSERVE slate treatment (thought PMO). |
| `agent/narrative-mode-b-art-study` `5bfff16` | Preserved. Its overlay predates the x1919 fix and was not used. |
| `agent/prologue-art-review-lab-20261113`, `agent/prologue-art-public-export-20261113` | Another session's active art review. Preserved. Its seven-slot target was not adopted; the six-slot M2 strip is kept. |
| `agent/m2-reception-density-test` `f4168a8` | Superseded by density-contract-final. Preserved. |
| `agent/m2-reception-ui-art-01` (local only, the primary checkout) | Superseded by the transient-ui pass. Its 5 commits and the owner's **uncommitted art in the primary checkout** are untouched. |
| `agent/m2-reception-inspector-art-01` local `a828905` | One unpushed local WIP commit (superseded). Untouched. |
| `art/action-buttons-v5-wait` | Archival; its picks are in main since `a30fc5a`. |
| Public `CYOA-storyboard` | Read only. Its `artwork.draft.json` differs from the private one only in prompt/notes text and `suggestedFilename`. Nothing was pushed to it. |

No worktree or branch was deleted, moved or force-pushed.

## 9. Limitations and gates

- **Gates before `main`:**
  - the owner approves this integration;
  - the owner confirms B overlay Candidate 1 (`art/ui/shell/narrative-overlay.png`, PROVISIONAL);
  - the owner decides whether draft (`generated`) prologue art may sit on `main` (it is
    hash-pinned and status-recorded, but not approved).
- **Not built:**
  - thought/OBSERVE in B or A (thought PMO);
  - the chapter-title beat ([77]);
  - the fatal-retry checkpoint ([75]);
  - a risk-marker icon for checked choices (the data is in the view);
  - save slots or a menu;
  - reception migration to the v2 flow (S9).
- **Content findings from the importer** (left as authored):
  - `termination_notice`'s unconditional fallback description can never show;
  - `reception_hallway` is the unfinished hand-off.
- **Within a dialogue paragraph,** runs of different style start new lines rather than changing
  ink mid-line.

## 10. QA results on this branch

These runs were on this Mac (Chromium and Firefox through Playwright, load average about 2) on commit `92c1589`.

| Suite | Result | Notes |
|---|---|---|
| `validate_route.js` | **49/49** | Unchanged stats: 15 nodes, 449 states. |
| `validate_route.js --v2` | **49/49** | |
| `validate_story.js` | **176/176** | |
| `validate_assets.js --browser` | **97/97** | Now audits the imported story too. |
| `validate_story_import.js` (new) | **58/58** | |
| `run_story_qa.js` (new) | **82/82** | 41 checks in each of Chromium and Firefox, including file://. |
| `game/qa/run_qa.js` (M2 reception) | **526/526** | The first run was 524/526. One failure was the `P.panel` guard, fixed in `92c1589`. The other was Firefox "early dismiss during fade-in", the timing check already known to flake on every base since `eb4911d`; it passed on the rerun. |
| polish lab QA | **143/143** | The first run was 141/143 because the lab's QA opened the default page, which now autosaves; it now opens `?story=reception`. |
| layout lab QA | **1916/1924** | Exactly the **8 known baseline failures** (docs/82): shipped defaults ×2, bundle ≠ placement.default, placement unapproved, `inspect_close.png` unlisted. A first run also failed one Firefox "slide starts one pitch away" timing check; the rerun did not. This branch does not touch `tools/layout-lab`. |

**Pre-existing failures, kept separate:**
- the 8 layout-lab failures above;
- the Firefox fade-in timing flake;
- the `file://` item-slip freeze, which this branch fixes (section 7).

No new failures remain.

As before (docs/74, docs/83), regenerated browser outputs (screenshots, `qa_results.json`) were not committed.

### Demonstration (in place on `story/`, then restored with `git checkout`)

1. **Changing one line of dialogue.**
   - In `story/chapters/prologue-00.draft.json`, `drone_intercepts`, `"Good morning! Your final
     assignment has been approved. Congratulations!"` became `"Good morning! A storyboard edit just
     rewrote this greeting. Congratulations!"`.
   - `node tools/story-import/import.js` printed `WROTE game/content/story.generated.js (preview,
     content 7b0ad42a34e1)`. `git status` showed only that file and the chapter JSON.
   - Opening `game/index.html` (file://) and choosing CONTINUE showed the new line in the drone's
     dialogue box.
2. **Changing an item-based choice.**
   - In `reception_directions`, the condition on `question_returned_key` (and its SHOW entry) went
     from `{"item": ["wc_key", "read"]}` to `{"has": "wc_key"}`, then the same import command was run.
   - Before: at the key hand-off the only card was "TAKE THE KEY AND FOLLOW THE SIGNS." After: the
     spoken card "THIS TAG SAYS I ALREADY RETURNED THE KEY." is offered without reading the tag.
   - Both builds were played on the same route.
