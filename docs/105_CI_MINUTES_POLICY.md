# 105 — CI minutes policy: local-first QA, a small automatic CI

**Date:** 2026-11-22.
**Owner direction (Nate):** "we still want anything like what cost minutes to be way reduced, it was a ridiculous cost for what we were doing before". This applies even now the repository is public and its Actions minutes are free.
**Supersedes:** docs/100 section 9 (draft PRs skip QA), which is kept and extended here.

## 1. What it cost

From 1–22 November 2026 this repository used about **1,983 billable minutes**, which exhausted the account's included 2,000.

**By job:**
- QA browser job: 1,353 minutes.
- QA content job: 547 minutes.
- Everything else: under 100 minutes.

The peak was the PR #2–#18 stack: 404, 607, 457 and 263 minutes on 15–18 November.

**One full QA run cost about 70 minutes:**
- **Content job, about 27 minutes.** About 19 of those were the story-import acceptance suite: every case re-walks every reachable state, about 262k with Chapter 3.
- **Browser job, about 45 minutes.** Twelve suites, each in Chromium and Firefox.

The full run happened on every push to a non-draft PR and on every push to `main`.

## 2. The policy (`.github/workflows/qa.yml`, enforced by `tools/ci/check-qa-artifacts.js`)

| What happens | What runs | Expected CI minutes |
|---|---|---|
| Documentation-only change (`docs/**`, `*.md`, `*.tsv`) | nothing (`paths-ignore`) | **0** |
| Push to a draft PR | nothing (unchanged since docs/100) | **0** |
| Non-draft PR push, or push to `main`, not touching the importer | content job, quick | **~5** |
| ... touching the importer or what it imports | quick + the story-import acceptance suite | **~17–25** |
| Actions → QA → Run workflow, scope `quick` | content job, quick | **~5** |
| ... scope `chromium` | everything, browser suites in Chromium only | **~40** |
| ... scope `full` (the old run) | everything, Chromium and Firefox | **~65** |

The old policy charged about 70 minutes for every row except the first two.

**When the story-import suite runs.** `tools/ci/changed-scope.js` compares the change with its base (a PR's base commit, or the previous `main` for a push). The suite runs if anything under these paths changed:
- `tools/story-import/`
- `game/js/rules.js`
- `story/`
- `art/*.provenance.json` (the pending art bindings)
- the font charsets
- the suite itself or its fixtures
- `qa.yml` / `tools/ci/`

If the base can't be resolved, the answer is "run it".

**Browser suites never start automatically.** They run on a manual `chromium` or `full` run, or locally.

**Other changes:**
- `import --check` was dropped from CI. `import --verify` already builds `story/` (the same import and reachability walk) and fails on a build error, so the second walk was pure duplication.
- Every browser suite now honours `QA_BROWSERS=chromium`. Five suites used to read `BROWSERS` and three hard-coded both browsers; `BROWSERS` still works.
- The browser job installs only the browsers its scope uses.

## 3. The primary gate is local and free

```
node tools/ci/run-local-qa.js [content|chromium|full] [--out <dir>] [--restore]
```

**What it does:**
- It reads its step list from `qa.yml` itself (both jobs; CI plumbing skipped), so a local run and CI can never drift apart.
- It writes one log per step and a `SUMMARY.txt`. Paste that summary into the PR as its QA evidence.
- `--restore` afterwards puts back the run output the suites write into the checkout. It touches only paths the artifact index names as QA output.

**Measured 2026-11-22 on this Mac in `chromium` mode: all 29 steps pass.**
- Content job: about 15 minutes, of which the story-import suite took 717 s.
- Chromium browser suites: about 21.5 minutes.
- Both browsers took about 43 minutes in the earlier full run.

**Known local-only difference.** The M2 reception suite's Firefox run fails 7 timing/scroll checks on macOS 12. It fails identically on untouched `main` `9a0ca4a`, so it is environmental. It passes in Chromium.

## 4. A faster story-import suite

`game/qa/validate_story_import.js` builds the story about 60 times, and each build walks every reachable state. Identical builds are now built once per run and handed out as deep copies, so a case can never see another case's mutations. "Identical" means byte-identical sources in the **same folder**, the same mode and the same bindings. The folder is part of the key because a build records its source paths.

The first version keyed only on content and failed one check: `verify accepts output built from the current source`. A fixture in a different temporary folder reused another folder's build. The folder-keyed version passes 105/105.

Measured once: 717 s, against 1,132–1,149 s in the two previous full runs. The suite now also prints how many builds it reused.

## 5. Not changed

- Every test still exists and still runs on a manual `full` run and in `run-local-qa.js full`. No assertion was loosened.
- Artifact retention (docs/100) is unchanged. The policy check now pins the new triggers, conditions and scopes: 123 checks.
- The negative control passes: the previous `qa.yml` fails 5 of the new rules.
- **CYOA-storyboard** (public) is untouched. Its review workflow takes about 2.5 minutes per PR push, and Pages runs only on `main`.
