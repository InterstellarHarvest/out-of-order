# 97 — Canonical storyboard synchronisation (Gameplay PMO)

**Date:** 2026-11-16. **Branch:** `agent/canonical-storyboard-sync-20261116`, based on PR #13's head `0f42e50` (the most advanced playable build). **Public counterpart:** InterstellarHarvest/CYOA-storyboard `docs/105_CANONICAL_SYNC_PIPELINE.md`.

## 1. The rule

The public **InterstellarHarvest/CYOA-storyboard** repository is the only editable source for narrative, choices, endings, items, checks, conditions and artwork records. This repository owns the engine, the runtime integration, the assets as loaded by the game, the UI, saves and gameplay QA.

`story/` in this repository is now a **generated projection of one pinned public revision**. The exception is `story/runtime-settings.json`, which the game owns (story id, save switch, cast names). The revision is recorded in `story/canon.lock.json`.

Nothing here writes story data back to the public repository. The only thing the game publishes there is **integration evidence**: which selected images a real build uses, plus their preview copies.

## 2. Workflow

| Stage | Who | Where | Tool |
|---|---|---|---|
| 1. Narrative approval | Owner + Story Director | public `story/**` | the storyboard viewer's Export, then a commit to public `main` |
| 2. Artwork generation | Codex | isolated review branches | reads public `story/artwork.draft.json` |
| 3. Selection = approval | Owner + Art Director | public | `node tools/sync/register-art.mjs --key … --file … --source-*` (public repo) |
| 4. Game integration | Gameplay PMO | this repo, isolated branch | `node tools/story-sync/sync.js pull --rev <sha>`, then `node tools/story-import/import.js`, then QA |
| 5. Synchronisation | Gameplay PMO | public | `node tools/story-sync/sync.js publish --storyboard <public worktree>`, then `node tools/sync/check-canon.mjs` there, then commit, push and Pages |

## 3. `tools/story-sync/sync.js`

- **`pull --rev <40-hex>`** projects a pinned public commit into `story/`:
  - It keeps only `config.json` `chapters` (now Prologue, Chapter 1 and Chapter 2). **Chapter 3 is deliberately not consumed.**
  - It strips the storyboard-only fields named in the public `story/sync-contract.json`. Examples: `notes`, Chapter 2's `storyboardNextChapter` hand-offs, Chapter 3's `deathPopup` / `endingArt` / `displayGroup` / `missingReason`.
  - It keeps only the items the consumed chapters mention.
  - It copies the artwork catalog and layout verbatim.
  - It refuses in these cases:
    - a branch name instead of a SHA;
    - hand-edited local `story/` files (unless `--force`);
    - any field that is neither runtime nor declared storyboard-only;
    - a contract whose runtime field lists differ from `tools/story-import/convert.js`;
    - a consumed chapter missing upstream.
- **`verify`** checks `story/` against the lock: byte hashes, and no stray files. **`verify --online`** re-projects the pinned revision from GitHub and compares.
- **`status`** is the drift report against public `main`:
  - which nodes, items and art records were added, changed or removed;
  - which status changes happened;
  - which chapters were published but not consumed.
  - Storyboard-only commits do not count as drift.
- **`report`** writes the integration report:
  - every image the build references (`build.art` in `game/content/story.generated.js`);
  - plus review-gated end-presentation art;
  - each with its canonical record key and SHA-256.
- **`publish`** applies the report to the public repository:
  - It runs the public `register-art.mjs`: it copies the images into the curated preview package, raises their status to `integrated` (never lowers), and writes `story/game-integration.json`.
  - It requires a committed, pushed game commit, so the provenance resolves.

CI (`.github/workflows/qa.yml` content job) runs `verify`, `verify --online`, `status` (informational) and `tools/story-sync/qa-sync.js` (20 checks).

## 4. This integration

- **Pinned:** public `d95c01ef5059036fb8718fafe282925fdeb85c1d` (branch `agent/canonical-sync-pipeline-20261116`, merged into public `main`, so the pin stays reachable).
  - The first pin was `dc5ed47`. A second session then published fatal-ending data to public `main` (docs/104: one shared Rest Assured popup and image for all three causes; Chapter 2 death briefs). `d95c01e` merges it.
  - Its `deathPopup` / `endingArt` / `notes` fields are storyboard-only, so they are stripped. Only `deathScreens` records reached the projection, and the importer ignores those.
- **Content hash unchanged:** `407d8ec78f1c…`, the same as `0f42e50`. Gameplay text, routes, checks and items are identical.

What changed in `story/`:

- **`chapter-01`:** 24 authoring `notes` removed. They are storyboard-only, and the importer never read them.
- **`artwork.draft.json`:** now the canonical public catalog:
  - corrected statuses (`integrated` / `approved` / `reused`);
  - provenance notes;
  - Chapter 3 briefs (not consumed);
  - the Rest Assured death-screen record.
- **`storyboard-layout.json`:** the public timeline layout. The game never reads it.
- **`chapter-02`:** byte-identical to `0f42e50`, once the five storyboard-only Chapter 3 hand-offs are stripped.
- **Items:** byte-identical once the 16 Chapter 3 Pavilion items are left out.
- **Prologue:** byte-identical.

The five Chapter 1 nodes that used to differ (`house_arrival`, `badge_registration`, `portrait_print`, `showroom_reset`, `exit_showroom_reset`) are reconciled **on the public side**. The public storyboard now carries PR #7's reviewed prose, which this game already used.

## 5. Chapter 2 artwork

No Chapter 2 image is integrated in any branch, worktree or stash.

The seven accepted Biology Park Batch 1 images exist only under `review/chapter-02-batch01-2026-11-15/` on `agent/ch02-art-batch01-biopark-foundation` (`24434cb`). They are `approved` (selected) and visible in the public preview package. Integrating them is the next art task. It needs:

- production `art/` paths;
- assetPaths recorded in the public catalog;
- a pull and an import;
- the portrait pairing for the Groundskeeper.

## 6. Open

- **Retired:** the 2026-11-14 copy of the storyboard viewer in `tools/storyboard/` (docs/85).
  - It could export story JSON, which made it a second editing path for canon.
  - Its QA pinned pre-ruling `generated` statuses, so it would fail on every canonical pull.
  - `tools/storyboard/README.md` now points to the public viewer, and the two CI steps that ran its QA are removed.
  - The viewer's QA now runs only in the public repository, where it covers all four chapters.
- **Updated QA:** `game/qa/validate_ch01_art.js` now expects the 28 bound House images to be `integrated`, and the unbound chair state to be `approved`. This follows the owner ruling of 2026-11-16. It used to expect `generated`.
- `welcome_home` still says "small black speaker grille", but the selected art is an ivory intercom. That is a Story Director wording decision, recorded in docs/93.

- **Owner ruling, docs/104:** all three causes reaching `exit_chair_fatal` share one popup and one image (`deathScreens["house_of_tomorrow/rest_assured"]`). The review-gated presentation in `game/content/end-presentations.review.js` (PR #11/#13) still matches only the voluntary choice, so that is a pending gameplay change.
  - It needs `when` widened (or a generated export consumed), and `run_end_presentation_qa`'s cause-selection checks updated.
  - docs/104 also asks the game to consume `story/death-presentations.export.json`, rather than keep a hand-maintained copy of the popup text.

**Update, docs/98:**
- The shared Rest Assured popup and the consumption of `story/death-presentations.export.json` are implemented, review-gated, on `agent/canonical-death-popups-20261117`.
- `sync.js pull` now projects the death export and generates `game/content/death-presentations.generated.js`.
