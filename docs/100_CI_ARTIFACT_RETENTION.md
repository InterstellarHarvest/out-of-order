# 100 — CI artifact retention and historical cleanup

**Date:** 2026-11-17.

**Trigger:**
- First, GitHub warned that 90% of the InterstellarHarvest account's included Actions storage was used.
- Then the account reached **100% of its 500 MB allowance** (storage emergency).

**Branch:** `agent/ci-artifact-retention-20261117`, from PR #16's verified head `7592eff`.

**Scope:** infrastructure only.
- No gameplay, narrative, storyboard, image, engine, deployment, billing or production-branch change.
- No test was removed, disabled or weakened.
- No workflow run or log was deleted.
- Artifacts were deleted only with the owner's explicit authorisation (section 5).

## 1. Where the storage goes

| Repository | Counts against the allowance? | Live artifacts (2026-11-17) | Size |
|---|---|---|---|
| `InterstellarHarvest/out-of-order` (private) | **Yes** | 130 | **9.74 GB** |
| `InterstellarHarvest/CYOA-storyboard` (public) | No: GitHub measures the storage allowance for private repositories only | 29 | 0.95 GB |
| Other InterstellarHarvest private repositories (MoonSammy, Science, tender) | — | 0 | 0 |

**Breakdown:**
- Of CYOA's 9.74 GB, **9.41 GB** was `qa-browsers`: 54 uploads of 120–318 MB each, kept for the 90-day default.
- The upload took everything in the browser job's QA folders: about 240 screenshots (about 300 MB), plus a lab's script.
- It ran on every run, including the 31 runs cancelled when a newer push replaced them.
- `qa-content` (55 uploads, 1.3 MB in total) was already small.

**How the allowance works:**
- Storage accrues in GB-hours. The 500 MB allowance is **0.5 GB-month, about 360 GB-hours a month**.
- 9.74 GB held for one day is about 234 GB-hours, roughly two-thirds of a month's allowance.
- The repository's own artifact and log retention is the 90-day default (maximum 400). It was not changed, because lowering it would also shorten log retention.

## 2. New policy (`.github/workflows/qa.yml`)

| Artifact | Contents | When | Kept |
|---|---|---|---|
| `qa-content` | Content-job JSON results (unchanged list) | Every run | **7 days** (was 90) |
| `qa-browsers-summary` | Every browser suite's JSON results, plus `ci_artifact_index_browsers.json` | Every run | **7 days** |
| `qa-browsers-failure-screenshots` | PNGs of **only the suites that failed** | **Failed browser job**; never on cancel | **1 day** |
| `qa-browsers-screenshots` | Every PNG of every suite | **Manual visual-review run** only | **1 day** |

Every QA step still runs, on every run, with the same command and run condition. Only what is kept afterwards changed. Lab directories are never uploaded whole; only named JSON files and `*.png` files are.

**The artifact index** (`tools/ci/qa-artifact-index.js`) runs on every run. It records:
- every screenshot, by folder, name, size and SHA-256;
- every results file, with its pass/total and its origin:
  - `written-this-run`;
  - `rewritten-this-run`;
  - `rewritten-identical` (the suite wrote the same bytes as the committed copy, which is common for deterministic results);
  - `untouched-committed-copy`.

  Several results files and four screenshot folders are tracked in git, so an untouched file means its suite did not write it. Rewritten is told from untouched by the file's modified time against the checkout.
- the outcome of every QA step.

On a failed run, it copies the failed suites' PNGs, and nothing else, into `qa-failure-screenshots/` for upload. The same tables appear on the run's summary page.

**Screenshot folder sizes on a full run** (about 298–304 MB in total), so a failure uploads only its suite's share:

| Suite (step id) | Folder | Size |
|---|---|---|
| `story` | `game/qa/story_screenshots` | 52 MB |
| `ch01_routes` | `game/qa/ch01_route_screenshots` | 21 MB |
| `ch01_art` | `game/qa/ch01_art_screenshots` | 66 MB |
| `end_presentation` | `game/qa/end_presentation_screenshots` | 9 MB |
| `death_controls` | `game/qa/death_controls_screenshots` | 9 MB |
| `ch02_routes` | `game/qa/ch02_route_screenshots` | 68 MB |
| `m2_reception` | `game/qa/screenshots` | 54 MB |
| `polish_lab` | `tools/m2-reception-polish-lab/qa/screenshots` | 15 MB |
| `layout_lab` | `tools/layout-lab/qa/screenshots` | 10 MB |
| `assets_browser` | — | 0 |

**A refused upload cannot change the result.** Every upload step is `continue-on-error`.
- If GitHub refuses an upload (for example, because the storage quota has been reached), a passing run stays green.
- A failing run stays red, because the job's result comes only from the QA steps.

**Policy check** (`tools/ci/check-qa-artifacts.js`, content job, Node only, 100 checks). It enforces that nothing can hide a test failure. It fails when:
- `continue-on-error` appears anywhere except the uploads and the informational storyboard drift report (which already had it);
- a QA step loses its id, script or run condition;
- a QA command gains anything that could swallow its exit code (`|| true` and the like). The layout lab is the exception: its 8 known failures are gated by exact name in the same step, as before;
- an upload loses its retention or condition;
- an upload takes a whole folder;
- the `visual_review` input is missing or defaults to true;
- a suite's screenshot folders or results files differ from what its own source writes (so a new suite cannot go un-uploaded).

Mutation-tested: 14 out of 14 deliberate breakages fail it, and the unmodified workflow passes.

`run_ch01_routes_qa.js` writes no results file; its result is in the job log, as before.

## 3. Getting full screenshots for creative or visual approval

1. GitHub: **Actions → QA → Run workflow**, choose the branch, tick **visual_review**, then run.
   Or from a terminal:

   ```
   gh workflow run qa.yml -R InterstellarHarvest/out-of-order --ref <branch> -f visual_review=true
   ```

2. When it finishes, download **within 24 hours**:

   ```
   gh run download <run-id> -R InterstellarHarvest/out-of-order -n qa-browsers-screenshots
   ```

3. A failed run keeps its failed suites' screenshots for 24 hours as `qa-browsers-failure-screenshots`.
4. Locally, every suite still writes its screenshots to the same folders as before.

The input is read from the branch's own `qa.yml`. A branch without this change ignores it and uploads the old 90-day `qa-browsers`.

## 4. Expected savings

**Per run:**

| Run | Before | After |
|---|---|---|
| Passing (most runs) | about 300 MB × 90 days ≈ 27,000 MB-days | about 0.13 MB × 7 days ≈ **1 MB-day** |
| Cancelled by a newer push | about 300 MB × 90 days | about 0.13 MB × 7 days |
| Failed browser job | about 300 MB × 90 days | the failed suites only: typically 9–68 MB × 1 day |
| Manual visual review | — | about 300 MB × 1 day ≈ 7.2 GB-hours (2% of the monthly allowance) |

**At the 15–16 November pace** (about 26 runs a day, about 4 failures a day):
- Before: about **470 GB** live at steady state.
- After: about **25 MB** of summaries plus about **0.1–0.3 GB** of failure screenshots on heavy days, each gone after 24 hours. That is well inside 0.5 GB.

**Coverage:** the policy only applies to runs on branches whose `qa.yml` contains this change.
- 28 other remote branches, including the open draft PRs #2–#16, still have the old `qa.yml` (full screenshots, 90 days).
- A push to one of them uploads about 300 MB for 90 days, until it contains this change (see the merge order in the PR) or the artifact is pruned.
- Three art-review workflows (`prologue-art-quick.yml`, `m1-*.yml`) upload only on pushes to dormant review branches.

## 5. Historical cleanup

**Tool:** `tools/ci/prune-artifacts.js`.
- It is a **dry run unless `--apply` is given**, and it never deletes workflow runs or logs.
- KEEP rows can never be deleted. OWNER rows need an explicit `--ids` list.
- Before touching a row it re-checks it live:
  - the artifact still exists, with the same name and size;
  - its commit is not the current head of PR #16;
  - a CANDIDATE row at an open-PR head is deleted only while the current PR #16 still contains that commit;
  - a main-head artifact is deleted only when a newer attempt of the same commit exists.

**Inventories:**
- `docs/100_ci_artifact_inventory_20261117.tsv`: the first inventory (130 artifacts).
- `docs/100_ci_artifact_inventory_20261117_r2.tsv`: the current one, largest first, with PR, run, commit, expiry and reason.

### Cleanup log

- **2026-11-17: SAFE class deleted with owner authorisation.**
  - Run: `prune-artifacts.js --class SAFE --apply --inventory docs/100_ci_artifact_inventory_20261117.tsv`.
  - **89 artifacts and 5.86 GB deleted** (superseded intermediate pushes and earlier re-run attempts); none skipped.
  - Every KEEP and OWNER artifact was confirmed still present.
  - Live total afterwards: 52 artifacts, 4.18 GB.
- **2026-11-17, about 21:40 UTC: every test-result artifact deleted with owner authorisation** ("we don't need test results, delete them along with the recommended").
  - From the r2 inventory, these were deleted:
    - CANDIDATE: 20 artifacts, 2,615 MB;
    - the `qa-*` OWNER rows: 10 artifacts, 1,028 MB;
    - the `qa-*` KEEP rows: 16 artifacts, 423 MB. This includes PR #16's proof; its green checks and run logs remain on the PR.
  - **46 artifacts, about 4.07 GB, in total.**
  - Left: the 8 art-review artifacts (Prologue art lab plus M1), **112 MB**, under the 500 MB allowance. Uploads resume after GitHub recalculates usage (every 6–12 hours).
  - No workflow run or log was deleted.

### Current inventory (r2, 2026-11-17 20:30 UTC: 54 artifacts, 4.18 GB)

| Class | Artifacts | Size | Meaning |
|---|---|---|---|
| **KEEP** | 16 | 0.42 GB | PR #16 head `7592eff` (`qa-browsers` 14337793160 at 302 MB, `qa-content` 14335619929); the latest QA of main `2cb743a` (14140450685, 120 MB); PR #17's tiny validation summaries |
| **CANDIDATE** | 20 | 2.62 GB | **Recommended for deletion; owner authorisation required.** The head evidence of draft PRs #2, #3, #4, #6, #10, #11, #13, #14 and #15, whose code is all contained in PR #16, whose run passed every suite. Also: an earlier re-run attempt at main (120 MB), and PR #17's own visual-review test upload (304 MB; it expires on 2026-11-18 anyway). All can be regenerated by re-running QA on the branch |
| **OWNER** | 18 | 1.14 GB | **Unique evidence.** The only QA of draft PRs #5, #7, #8, #9 and #12, which are not in PR #16 (each 120–229 MB). Also the Prologue art-lab (74 MB) and M1 sprite (39 MB; expires on 2026-12-01) review evidence, from workflows no longer on main. The owner chooses by ID |

**Commands:**

```
node tools/ci/prune-artifacts.js --class CANDIDATE            # dry run: 20 artifacts, 2.62 GB
node tools/ci/prune-artifacts.js --class CANDIDATE --apply    # only after owner authorisation
node tools/ci/prune-artifacts.js --class OWNER --ids <id>,<id> [--apply]
```

**Results:**
- After CANDIDATE: about 1.56 GB is left (KEEP plus OWNER).
- After CANDIDATE and every OWNER row: about **0.42 GB**, under the 0.5 GB allowance.

**Notes:**
- Deleted artifacts cannot be restored. Re-running QA on a commit makes a new one, and under the old workflow the new one is again kept for 90 days.
- GitHub's usage page can take several hours to reflect deletions. Storage already accrued this month is not refunded.

## 6. CYOA-storyboard (public, not counted)

It was inspected, and no change was made.

| Workflow | Artifact | Note |
|---|---|---|
| `pages.yml` | `github-pages` (8, 58 MB) | `upload-pages-artifact` keeps its artifact for 1 day by default |
| `storyboard-review.yml` | `storyboard-timeline-screenshots` (4, 26 MB) | Whole folder, 90 days |
| `prologue-art-lab-review.yml` | `public-prologue-art-review-screenshots` (17, 863 MB) | Whole folder, 90 days. It triggers on pushes to five old feature branches |

If that repository is ever made private, it should get the same treatment.

## 7. Account settings to check by hand (not changed here)

These need the account owner and the GitHub website; the CLI token has no billing scope.
- **Billing → Usage** (`github.com/settings/billing`): Actions storage for the current month, and when the cycle resets. Accrued GB-hours are not refunded by deleting artifacts; deletion only stops further accrual.
- **Billing → Budgets and alerts:** whether Actions / shared storage has a **$0 budget with "stop usage"**.
  - With it, uploads are refused once the allowance is used up; CI stays green under this change, but no artifacts are kept.
  - Without it, overage is billed at about $0.25 per GB-month.
- **Billing → Plan:** Free includes 500 MB of artifact storage; Pro includes 1 GB.
- **Repository → Settings → Actions → General → Artifact and log retention:** currently 90 days. Lowering it would cap every branch's artifacts, including the old `qa.yml` branches, **but it also shortens log retention**, so it is left to the owner.

## 8. Supersedes

docs/93, docs/94, docs/96 and docs/98 say CI keeps screenshots in the `qa-browsers` artifact. From this change on:
- screenshots are in `qa-browsers-failure-screenshots` (failed run) or `qa-browsers-screenshots` (visual review), as described in section 3;
- the JSON results are in `qa-browsers-summary`.

## 9. Actions minutes: draft PRs skip QA

**The owner's billing page, 2026-11-17** (GitHub Free; nothing billable; included limits reset in 14 days):
- **Compute:** $9.02 of $12.00 included is used, about 1,500 of 2,000 minutes. Most of it is CYOA.
- **Actions storage:** 0.5 of 0.5 GB used. This is the month's accumulated usage, so the artifact deletions stop it growing but do not lower it.

**What uses minutes:** one full CYOA QA run takes about 51 minutes (content about 15, browsers about 36). The roughly 500 minutes left cover about 9 runs. Several agent sessions pushing to draft PRs ran it about 26 times a day.

**The change, owner-approved 2026-11-17:**
- Both QA jobs carry `if: github.event_name != 'pull_request' || !github.event.pull_request.draft`.
- `pull_request` also triggers on `ready_for_review`.
- Pushes to a **draft PR** no longer run QA. The jobs show as skipped and cost 0 minutes.

QA still runs:
- when started by hand: Actions → QA → **Run workflow** on the branch (`gh workflow run qa.yml --ref <branch>`), optionally with `visual_review`;
- when a PR is **marked ready for review**, and on every push to a non-draft PR;
- on every push to `main`.

No test changed. Every suite still runs locally for free, as before. The policy check (104 checks) pins these triggers and the exact skip condition.

**Not affected:**
- Git pushes (commits, art, storyboard data): repository storage is separate from Actions.
- The public repositories (CYOA-storyboard, Trans-plant), whose Actions minutes and storage are free. The storyboard's Pages upload succeeded at 21:09 UTC while CYOA's uploads were being refused.
