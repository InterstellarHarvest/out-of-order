# 85: Chapter navigation and Chapter 1 scaffolding

Branch `agent/chapter-navigation-ch01`, from `origin/main` 2cb743a (worktree
`_worktrees/CYOA-chapter-navigation`). It is not merged. Both chapters stay `draft`, and
`--promote` was not run.

PMO direction (2026-11-14):
- House of Tomorrow is **Chapter 1**, not part of the Prologue.
- Chapter 1's scenes, dialogue, branches and approval belong to the Story Director.
- This branch adds only the chapter separation, the hand-off, state continuity and
  storyboard navigation, plus one explicitly labelled development placeholder.

## 1. What changed

| File | Change |
|---|---|
| `story/storyboard-manifest.json` | Two chapters, both `draft`, in order: `prologue-00` "Prologue — The Last Good Day", then `chapter-01` "Chapter 1 — House of Tomorrow". |
| `story/chapters/chapter-01.draft.json` | **New.** A separate chapter file with one node, `dev_placeholder` (see section 2). |
| `story/chapters/prologue-00.draft.json` | `reception_hallway` gets one choice (section 3). Nothing else changes. |
| `story/storyboard-layout.json` | Adds `chapters["chapter-01"].positions: {}`. The Prologue entry is unchanged (`positions: {}`), and the schema is still `cyoa-storyboard-layout-v1`. |
| `story/artwork.draft.json` | Adds one record, `scenes["house_of_tomorrow/opening"]`: `not-started`, `assetPath: null`, empty prompt. No other record changes. |
| `game/content/story.generated.js` | Rebuilt preview (content `69d62f6a8da4`). |
| `tools/storyboard/` | **New in this repo.** The storyboard viewer, copied from the public mirror (eb83805) and fixed for chapters (section 5), with `qa-smoke.mjs` (extended) and `qa-browser.js` (new). |
| `game/qa/validate_story_import.js`, `game/qa/run_story_qa.js` | Updated for two chapters, plus hand-off and continuity checks (section 6). |
| `.github/workflows/qa.yml` | Adds the two storyboard suites. |

No engine, renderer, UI or art file changes:
- `game/js/**` is untouched;
- no PNG is added or changed;
- the approved M2 reception assets are untouched.

The engine already supported `chapter:` destinations (docs/72, `Rules.step`, step 6). It moves to
the target chapter's `start` node and clears only `returnTo`.

## 2. Chapter 1 placeholder (development only)

```json
{ "title": "House of Tomorrow", "start": "dev_placeholder", "scene": "house_of_tomorrow/opening",
  "nodes": { "dev_placeholder": { "mode": "narrative", "notes": "DEVELOPMENT PLACEHOLDER, not narrative. …",
    "text": "[DEVELOPMENT PLACEHOLDER] Chapter 1: House of Tomorrow has no authored scenes yet. This card only tests the hand-off from the Prologue.",
    "choices": [] } } }
```

- **No narrative is invented.** The node's text names itself a placeholder. `notes` is
  authoring-only: the storyboard shows it, and the importer reports it but does not import it.
- **No choices, on purpose.** The importer turns this node into its existing explicit DRAFT STOP:
  a preview ends with "DRAFT ENDS HERE. BEGIN AGAIN.", and an approved build refuses it. The Prologue
  has no draft stop any more; this node is the only one.
- **Art.** The chapter's scene is `house_of_tomorrow/opening`, registered in the shared catalog
  as `not-started` with no file:
  - previews draw the existing labelled DEV PLACEHOLDER;
  - approved builds refuse it;
  - the facilities corridor art is not reused.
- **Fixture profile.** A missing file sets the build's `profile` to `fixture`, the existing
  preview-only mechanism (docs/84 section 2.2).
- **Replacing it.** The Story Director's Chapter 1 replaces the whole file (node ids, `start`,
  `scene` and the art record) through the normal storyboard JSON import. The hand-off needs no
  change, because it targets the chapter, not a node.

## 3. The hand-off (exact)

In `prologue-00`, node `reception_hallway` (scene `exposition/facilities_corridor`):
- narration, scene and objective are unchanged (QA pins the narration's sha256 `54b1047e…`);
- `"choices": []` becomes:

```json
"choices": [
  { "id": "continue_to_chapter_01", "kind": "continue", "text": "CONTINUE", "chapter": "chapter-01" }
]
```

This follows the Prologue's own continue-card convention (`kind: continue`, text `CONTINUE`).
There is no `to`, no `restart`, no `end`, and no new-game boundary. No Chapter 1 node is in the
Prologue JSON.

## 4. State continuity

`Rules.step` keeps the whole state when it changes chapters. That covers:
- flags, inventory, item marks and resolved checks;
- the seed and the objective;
- the decision log;
- the NOTES transcript (the Chapter 1 paragraph is appended).

There is still one autosave, `cyoa-save:the-acceptable-error`, which spans chapters. There is no
separate Chapter 1 save and no automatic reset. The only restart is the DRAFT STOP card, which the
player has to choose.

The engine emits its existing `chapter` event, and the flow uses it only to preload art and fade.
**No chapter-title presentation was added** (the unapproved [77] beat stays unbuilt). The
existing draft stamp now reads `CHAPTER-01: CHAPTER 1 - HOUSE OF TOMORROW [DRAFT]`.

**Proved across every Prologue path** (`validate_story_import.js` group `handoff`):
- the walk reaches **693** distinct hand-off states, the same count as the validator's 693 ending
  states;
- every one crosses with flags, inventory, item marks, checks, objective, seed and NOTES intact;
- they arrive as **693** distinct outcomes:
  - `termination_status`: `acknowledged`, `delivery_declined`, `disputed`;
  - `property_record`: `nothing_declared`, `stored_all`, `stored_three`, `voluntary_donation`;
  - `retained_item`: `timing_clicker`, `desk_plant`, `red_stapler`, `rubber_band_ball`, or none;
  - varied inventories.
- In a QA-only copy (never committed), the placeholder gets 35 condition probes:
  - `flagIs`, `has`/`lacks`, and item marks over those outcomes;
  - each probe is offered exactly when its condition holds on the arriving state;
  - 126 distinct probe sets appear.

  So Chapter 1 conditions can branch on the Prologue's outcomes.

In the browser (`run_story_qa.js`, Chromium and Firefox), a deep save plays through the key
discrepancy route and then CONTINUE. The checks:
- the scene is the DEV PLACEHOLDER canvas for `house_of_tomorrow/opening`;
- inventory, flags, item marks, checks, objective and seed are equal before and after;
- the NOTES transcript is a strict extension;
- the draft stamp names Chapter 1;
- a reload restores the one autosave in Chapter 1 with the same state;
- the DRAFT STOP then restarts only on request.

## 5. Storyboard: chapters with independent layouts

The viewer was copied byte for byte from the public mirror (eb83805) and then fixed. It keeps:
- the header `chapterSelect`, still filled only from the manifest;
- Import/Export for chapter, items, artwork and layout;
- zoom (buttons and pointer-anchored wheel), pan and drag;
- item references and the art editor.

Fixes:
- **Per-chapter browser cache, nothing shared.**
  - Each chapter keeps its positions under `cyoa-storyboard-layout-v1:<chapter>`.
  - At start-up, the browser's saved positions are folded in for **every** manifest chapter, so
    Export Layout carries chapters that were not opened in this session. Before, it exported
    the file's stale copy of them.
- **Import Layout merges per chapter, and caches each one.**
  - A file replaces only the chapters it names.
  - Every chapter in the file is cached. Before, only the open chapter was, so switching later
    could bring back stale positions.
- **Per-chapter selection.** Leaving a chapter remembers its selection (node, art, item or list);
  coming back restores it. Before, every switch reset to the start node.
- **The selector follows the board.** That includes loading through a link. The latest request
  wins: a slow earlier fetch can no longer overwrite a later choice.
- **Chapter destinations are visible:**
  - node cards show `→ chapter-01`;
  - the inspector's choice names the destination chapter by its manifest title;
  - clicking that choice opens the chapter.
- **The board heading** shows the manifest title and status, e.g.
  `Chapter 1 — House of Tomorrow · draft`.
- **Authoring `notes`** show in the node inspector.
- **A hand-imported chapter file** is keyed like its manifest entry (by filename), so its layout
  stays its own.

Every chapter resolves its art through the one shared `story/artwork.draft.json`; there is no
per-chapter catalog. The "Artwork Lab" header link points to the public mirror's art lab, which
does not exist in this private repo.

## 6. QA

QA runs on this branch (this Mac, Playwright 1.59.1, Chromium + Firefox) are recorded in section 8.

## 7. Public storyboard sync

See section 8 and the hand-off report. The public mirror receives only:
- the viewer (`tools/storyboard/index.html` and `qa-smoke.mjs`);
- `story/storyboard-manifest.json` and `story/storyboard-layout.json`;
- both chapter JSONs;
- one added artwork record (merged into the public catalog, never replacing it: the public
  catalog's notes and prompts differ from private and belong to the art-lab work).

It does not receive:
- `runtime-settings.json`, engine or game code, generated content, or private docs;
- any image;
- `qa-browser.js` (it serves the private repository root).

## 8. Results (2026-11-14, this Mac, Node 20.20.2, Playwright 1.59.1, Chromium + Firefox)

| Suite | Result |
|---|---|
| `import.js --check` / `--verify` | VALID preview, 2 chapters, 30 nodes, 2560 reachable states; generated file up to date (content `69d62f6a8da4`) |
| `glyph-ink/build.js --verify` | OK |
| `validate_route.js` v1 / `--v2` | 49/49, 49/49 |
| `validate_story.js` | 176/176 |
| `validate_story_import.js` | **90/90**: baseline 8, content-edits 10, rejects 18, draft-stop 6, chapters 7, focus+checks 15, independence 2, saves 9, art-status 3, **handoff 9**, stale 3 |
| `validate_assets.js` static / `--browser` | 59/59, 97/97 |
| `run_story_qa.js` (browser) | **120/120**, up from 108 with the hand-off checks |
| `run_qa.js` (M2 reception, `?story=reception`) | 526/526 |
| `m2-reception-polish-lab/qa/run_qa.js` | 143/143 locally (Firefox console check passed on this run) |
| `layout-lab` with `check_known_failures` | 1916/1924, only the 8 known failures (PASS) |
| `tools/storyboard/qa-smoke.mjs` | PASS (27 areas, including the chapter sequence and a fresh-browser import) |
| `tools/storyboard/qa-browser.js` | **18/18** (real drags, a real download, then an upload in a fresh profile) |

**Mutation check.** The extended `qa-smoke.mjs` fails against the unmodified public viewer
(eb83805).

**Public tree** (branch `agent/chapter-01-scaffold-20261114`):
- `qa-smoke` PASS;
- art-lab `qa-static` PASS;
- art-lab `qa-browser` 106 passed / 0 failures;
- storyboard `qa-browser` 18/18.

**Firefox polish-lab failure** (run 43658643368): investigated separately; see section 10.

## 9. Open Story Director decisions

1. Chapter 1's real opening node id, scene id(s) and art.
   - The placeholder ids `dev_placeholder` and `house_of_tomorrow/opening` are meant to be
     replaced.
   - The art record should be renamed or replaced when the real opening scene exists.
2. Whether the Prologue's last card stays a plain `CONTINUE`, or gets authored wording.
3. Which Prologue outcomes Chapter 1 acknowledges. The walk shows these exist:
   - `termination_status` (3 values);
   - `property_record`;
   - `retained_item`;
   - `appointment_response` and `appointment_disputed`;
   - `key_discrepancy_raised`;
   - the inventory, including `wc_key` READ.
4. Whether the carried-over objective ("FIND THE PUBLIC BATHROOM.") stays active on arrival or
   Chapter 1's first node sets its own.
5. The chapter-title beat ([77]) is still unapproved and unbuilt.
6. Approval: both chapters stay `draft`. `--promote` refuses them until the manifest marks each one
   `approved`.
