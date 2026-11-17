# 100 — CI artifact retention and historical cleanup

**Date:** 2026-11-17.

**Trigger:** GitHub warned that 90% of the InterstellarHarvest account's included Actions storage was used.

**Branch:** `agent/ci-artifact-retention-20261117`, from PR #16's verified head `7592eff`.

**Scope:** infrastructure only.
- No gameplay, narrative, image, engine, deployment or production-branch change.
- No test was removed, disabled or weakened.
- **No existing artifact was deleted.**

## 1. Where the storage goes (2026-11-17)

| Repository | Billed? | Live artifacts | Size |
|---|---|---|---|
| `InterstellarHarvest/CYOA` (private) | **Yes** | 130 | **9.74 GB** |
| `InterstellarHarvest/CYOA-storyboard` (public) | No: GitHub measures the storage allowance for private repositories only | 29 | 0.95 GB |
| Other InterstellarHarvest private repositories (MoonSammy, Science, tender) | — | 0 | 0 |

Of CYOA's 9.74 GB, **9.41 GB** is `qa-browsers`: 54 uploads of 120–318 MB each, kept for the 90-day default.
- The upload took everything in the browser job's folders. That covered about 240 screenshots (about 300 MB) plus the polish lab's script.
- It ran on every run, including the 31 runs cancelled when a newer push replaced them.
- Storage accrues hourly. The plan includes 1 GB-month, so 9.7 GB held for a day uses about 3% of a month's allowance.

`qa-content` (55 uploads, 1.3 MB in total) was already small.

## 2. New policy (`.github/workflows/qa.yml`)

| Artifact | Contents | When | Kept |
|---|---|---|---|
| `qa-content` | Content-job JSON results (unchanged list) | Every run | **7 days** (was 90) |
| `qa-browsers-summary` | Every browser suite's JSON results, plus `ci_artifact_index_browsers.json` | Every run | **7 days** |
| `qa-browsers-screenshots` | The PNGs of the 9 screenshot folders, named files only (`*.png`) | **Failed browser job**, or a **manual visual-review run**; never on cancel | **1 day** |

Every QA step still runs, on every run, with the same commands and conditions. Only what is kept afterwards changed.

**The artifact index** (`tools/ci/qa-artifact-index.js`) runs on every run, so a passing run without screenshots still records exactly what was produced:
- every screenshot, by folder, name, size and SHA-256;
- every results file, with its pass/total;
- whether each file was **rewritten by this run** or is the **committed copy left untouched**. Several results files and four screenshot folders are tracked in git, so an untouched file means its suite did not write it.

The same table appears on the run's summary page.

**Policy check** (`tools/ci/check-qa-artifacts.js`, content job, Node only, 42 checks). It reads the browser suites' own source, so a new suite whose screenshots or results are not uploaded fails CI. It fails when:
- an upload has no retention;
- an upload takes a whole folder;
- the screenshot condition or the retention changes;
- the `visual_review` input is missing or defaults to true;
- the upload lists drift from what the browser suites write.

Mutation-tested: 10 out of 10 deliberate breakages fail it.

`run_ch01_routes_qa.js` writes no results file; its result is in the job log, as before.

## 3. Getting full screenshots for creative or visual approval

1. GitHub: **Actions → QA → Run workflow**, choose the branch, tick **visual_review**, then run.
   Or from a terminal:

   ```
   gh workflow run qa.yml -R InterstellarHarvest/CYOA --ref <branch> -f visual_review=true
   ```

2. When it finishes, download **within 24 hours**:

   ```
   gh run download <run-id> -R InterstellarHarvest/CYOA -n qa-browsers-screenshots
   ```

   Or use the artifact link on the run page.
3. A failed run keeps its screenshots for 24 hours in the same way.
4. Locally, every suite still writes its screenshots to the same folders as before.

The input is read from the branch's own `qa.yml`. A branch without this change ignores it and uploads the old 90-day `qa-browsers`.

## 4. Expected savings

**Per run:**

| Run | Before | After |
|---|---|---|
| Passing (most runs) | about 300 MB × 90 days ≈ 27,000 MB-days | about 0.2 MB × 7 days ≈ **1.4 MB-days** (over 99.99% less) |
| Cancelled by a newer push | about 300 MB × 90 days | about 0.2 MB × 7 days |
| Failed browser job, or visual review | about 300 MB × 90 days | about 300 MB × 1 day = 300 MB-days (99% less) |

**At the 15–16 November pace** (about 26 runs a day, about 4 failures a day):
- Before: about **470 GB** live at steady state, growing for 90 days.
- After: about **30 MB** of summaries, plus about **1.2 GB** of failure screenshots on heavy days, each gone after 24 hours.
- One failed run's screenshots for a day is about 7.2 GB-hours. The 1 GB-month allowance is about 720 GB-hours, so it covers about 100 failed or visual-review runs a month.

The policy only applies to runs from branches that contain this change. Older draft-PR branches keep their old workflow until they are rebased or merged.

## 5. Historical cleanup (owner authorisation required; nothing deleted yet)

**Inventory:** `docs/100_ci_artifact_inventory_20261117.tsv` lists every CYOA artifact on 2026-11-17 with:
- class, ID, name, size, created and expiry dates;
- branch, commit, run and reason.

| Class | Artifacts | Size | Meaning |
|---|---|---|---|
| **KEEP** | 5 | 0.54 GB | PR #16 head `7592eff` (`qa-browsers` 14337793160, `qa-content` 14335619929) and the main / Pages release head `2cb743a` (both attempts). Never deleted by the tool |
| **OWNER** | 36 | 3.33 GB | Latest evidence at the head of each other open draft PR (#2–#15), and the latest M1 sprite and Prologue art-lab review artifacts of each branch. The owner chooses by ID |
| **SAFE** | 89 | 5.86 GB | Intermediate pushes superseded by a later commit on the same branch, earlier re-run attempts, and earlier runs of the same art-review artifact. No PR head, no main, no PR #16 |

The M1 artifacts expire on their own on 2026-12-01. Everything else expires on 2027-02-11 to 2027-02-15.

**The tool, `tools/ci/prune-artifacts.js`:**
- It is a **dry run unless `--apply` is given**.
- KEEP rows can never be deleted.
- OWNER rows need an explicit `--ids` list.
- Before touching a row it re-checks it live: the artifact must still exist with the same name and size, and its commit must not be the head of main, of PR #16 or (for SAFE) of any open PR.

**Steps:**

```
# 1. Dry run: lists exactly what would go (89 artifacts, 5.86 GB on 2026-11-17)
node tools/ci/prune-artifacts.js --class SAFE

# 2. After owner authorisation:
node tools/ci/prune-artifacts.js --class SAFE --apply

# 3. Optional, per owner choice (e.g. evidence of drafts already reviewed):
node tools/ci/prune-artifacts.js --class OWNER --ids <id>,<id>
node tools/ci/prune-artifacts.js --class OWNER --ids <id>,<id> --apply
```

- **After step 2:** about 3.9 GB remains (KEEP plus OWNER). It stops accruing 5.86 GB a day.
- **After step 3, if all OWNER rows are deleted:** about 0.54 GB remains.
- Deleted artifacts cannot be restored. Re-running QA on that commit makes a new one; under the old workflow, a re-run keeps it for 90 days again.
- GitHub's usage page can take several hours to reflect deletions. Storage already accrued this month is not refunded.

## 6. CYOA-storyboard (public, not billed)

It was inspected, and no change was made: public-repository storage does not count against the allowance.

| Workflow | Artifact | Note |
|---|---|---|
| `pages.yml` | `github-pages` (8, 58 MB) | `upload-pages-artifact` already keeps its artifact for 1 day by default |
| `storyboard-review.yml` | `storyboard-timeline-screenshots` (4, 26 MB) | Whole folder, 90 days |
| `prologue-art-lab-review.yml` | `public-prologue-art-review-screenshots` (17, 863 MB) | Whole folder, 90 days. It still triggers on pushes to five old feature branches |

If that repository is ever made private, it should get the same treatment (summary 7 days; screenshots on failure or visual review, 1 day).

## 7. Supersedes

docs/93, docs/94, docs/96 and docs/98 say CI keeps screenshots in the `qa-browsers` artifact. From this change on:
- screenshots are in `qa-browsers-screenshots`, on failure or visual review (section 3);
- the JSON results are in `qa-browsers-summary`.
