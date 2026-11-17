# 98 — Canonical death-popup integration (review-gated)

**Branch:** `agent/canonical-death-popups-20261117`. It starts from PR #14's head `20b5260` (CI run 44002856798: content and browsers both green).

**Authorities:**
- public `docs/104_FATAL_ENDING_DATA_AND_ENGINE_EXPORT.md` and `docs/105_CANONICAL_SYNC_PIPELINE.md`;
- `story/death-presentations.export.json` and `story/sync-contract.json`;
- this repository's docs/94, docs/96 and docs/97.

**Status:**
- Still behind `?deathproof`. Ordinary play is unchanged.
- The canonical copy is a draft (`popupStatus: approved-art-copy-draft`, `readyForGameplay: false`). It is shown as review data, not as final dialogue.
- No art was generated or replaced. Chapter 3 is not consumed.
- Nothing was merged, promoted or deployed.

## 1. What changed

| Before (PR #11/#13) | Now |
|---|---|
| `end-presentations.review.js` held the title, body, art path and hash, plus a voluntary-only `when` | The popup's title, subtitle, narrative, art and ending come from the canonical storyboard export. The review file holds only game-owned settings: gate, opt-in, A1 geometry, palette, controls, notice, backdrop, glyph fallback |
| Only `accept_permanent_rest` opened the popup | All three causes reaching `chapter-01:exit_chair_fatal` open the same popup and illustration (owner ruling, public docs/104): voluntary acceptance, failed stapler escape, failed bare-handed escape |
| Copy: `PERMANENTLY SATISFIED.` plus two body paragraphs | Canonical: the same title; subtitle `REST ASSURED — TREATMENT COMPLETE`; one narrative paragraph |

## 2. Synchronisation (`tools/story-sync/sync.js`)

`config.json` gains `deathPresentations: { export, runtime }`. `pull --rev <sha>` now also does the following:

1. **Reads** the public `story/death-presentations.export.json` at the pinned revision. If the file is missing, the pull refuses.
2. **Re-derives** the export from that revision's chapters (`deathPopup`, `endingArt`) and its artwork catalog (`deathScreens`). This port of the public `export-death-presentations.mjs` must reproduce the file **byte for byte**. The pull refuses in any of these cases:
   - the export is stale or hand-edited;
   - the export's schema or source is wrong;
   - the exporter's rules have changed.
3. **Validates** each consumed entry:
   - its `when` is exactly `{ end: <its own id> }`;
   - it is an authored ending of a consumed chapter;
   - it has a title, subtitle and body;
   - its art is 314×206, drawn at 2×.
   - For selected art (`approved` / `integrated` / `reused`), the production path must exist in this game, with the SHA-256, git blob and size of the recorded `selectedSource`.
4. **Projects** the export into `story/` with only the consumed chapters (Prologue, Ch1, Ch2). The three Chapter 3 entries are recorded under `notConsumed.deathPresentations`.
5. **Generates** `game/content/death-presentations.generated.js`:
   - the projected entries plus the storyboard revision and the export's hash;
   - art is handed over **only when selected**, so the five Chapter 2 entries carry `art: null`.

   Its hash is in `story/canon.lock.json` (`generated`).

`verify` now also fails on a hand-edited or stale runtime module, and `verify --online` re-projects it as well. The integration `report` takes the death art of each opted-in entry from the canonical module.

**Pinned revision:** public `25921b9bb0e263c017a804c57e9069c172f6b3b4` (main).
- Since PR #14's pin (`d95c01e`), the only other projected change is `storyboard-layout.json`, which is viewer-only.
- The gameplay content hash is unchanged: `407d8ec78f1c`.

## 3. Runtime

`game/js/end-presentation.js` stays generic: it names no story id, art path or prose.
- It merges each opted-in review entry with its canonical entry.
- An entry with no canonical counterpart, or with unselected art, is **skipped**; `G.endPresentation.skipped()` reports why. Unproduced art can therefore never be displayed.
- The canonical `when` names only the ending, so every cause matches.
- The real cause (`Rules.endCause`: choice, check id, `ok`) is kept in the open log. RETRY and CHECKPOINT restore from the docs/96 points, which are unchanged:
  - RETRY returns to the state just before *that* cause's decision, with fresh attempt-scoped dice;
  - CHECKPOINT returns to the chapter entry.
- **Text column:**
  - The canonical subtitle sits at the body origin (972,257), in the labels face at 1×, with a 30 px line and a 22 px gap.
  - The narrative follows in the dialogue face at 2×.
  - The column's bottom is recorded in `data-text-bottom`; 529 against the layout limit of 615. Overflow is flagged, never cut.
- **Glyph fallback:** none of the game's three faces has an em dash. The game-owned config maps only `—` and `–` to `-`. The canonical text stays unchanged in `data-text`; what was drawn is in `data-rendered`. Any other missing glyph is still an error.
- The popup root carries `data-copy-status` and `data-revision`.

## 4. QA

| Suite | Result |
|---|---|
| `run_end_presentation_qa` | **124/124** (engine 10, Chromium 57, Firefox 57) |
| `run_death_controls_qa` | **90/90** (Chromium 45, Firefox 45) |
| `validate_death_controls` | **44/44** (new `shared-cause` group: 5) |
| `qa-sync` | **26/26** (death export: 4 new) |

The full regression is in section 6.

**New or changed checks:**
- **Cause selection.** A failed stapler and a failed unarmed check each open the same popup:
  - same entry, art, title and copy;
  - the popup and its shadow are **pixel-identical to the voluntary popup** (0 px in both browsers);
  - the cause keeps its choice, check id and `ok:false`;
  - RETRY and CHECKPOINT are available.
- **Never opens:**
  - a successful escape;
  - any Chapter 2 route ending, or any House exit;
  - the gate-off game, including after a failed cause.
- **Death controls with a failed cause.**
  - *Stapler:* at the death, a save and reload gives the same popup with the same cause. RETRY then returns to the exact pre-check state, in attempt 1, with the stapler held once. The re-attempt rolls the attempt-1 roll that Rules predicts, and a reload repeats it.
  - *Unarmed:* CHECKPOINT returns to the exact Chapter 1 entry, in attempt 1, keeping the Prologue's results. A reload is identical.
- **Data.**
  - The review file holds no story-authored field.
  - The runtime module equals the projected export at the pinned revision.
  - The art is byte-identical: `7f469efa…`, 314×206, drawn at 2×.
  - The Chapter 2 entries have no art; no Chapter 3 entry is consumed; every entry has `readyForGameplay: false`.
- **Sync.** Each of these refuses the pull, or fails verify:
  - a hand-edited export;
  - wrong art provenance;
  - a missing export;
  - a hand-edited runtime module.

## 5. Visual differences for owner review

Measured in both browsers:
- **A1 parity:**
  - **0** differing pixels in the frame, shadow, art, separator and control boxes.
  - Title row: 2,280 px, unchanged (the brief's period).
  - Control labels: 1,596 px, unchanged.
  - **Text column: 48,704 px.** This is the canonical copy.
- **Subtitle.** `REST ASSURED — TREATMENT COMPLETE` is new. It is drawn as `REST ASSURED - TREATMENT COMPLETE` (hyphen fallback) in the labels face, above the narrative. The A1 has no subtitle slot. Both the placement and the hyphen are game-side choices for review.
- **Narrative.** It is one canonical paragraph, five lines at 604 px. The A1 and the old proof had two paragraphs: `You have achieved permanent relaxation.` / `The House is delighted…`. The words are identical; only the paragraph break is gone.
- **Screenshots** (not committed; CI keeps them in `qa-browsers`):
  - `game/qa/end_presentation_screenshots/{chromium,firefox}_01_voluntary_canonical_1920x1080.png`, `_06_stapler_failed.png` and `_07_unarmed_failed.png`;
  - `game/qa/death_controls_screenshots/*_06_stapler_failed_popup.png` and `*_07_unarmed_failed_popup.png`.

## 6. Open

1. The canonical copy is a draft. Final owner wording, and activation in ordinary play, are owner decisions. The gate stays on.
2. The subtitle slot and the dash fallback need owner review (section 5). Adding an em dash to the bitmap faces would be an art and font change, which is not done here.
3. Chapter 2's five fatal popups are canonical, but they need selected art and an opt-in entry in `end-presentations.review.js`. Data only; no engine change.
4. EXIT still waits for the main menu (docs/96).
