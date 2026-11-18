# 101 — Presentation Batches A + B: integration into the PR #2 development stack

**Date:** 2026-11-18.
**Ruling:** the Story Director approved PR #18 for integration into the PR #2 development stack (final review of Batches A and B and of the Chapter 2 death-art synchronization correction). This does **not** authorize merging PR #2 into production `main`.

## What was integrated

| | Ref |
|---|---|
| PR #18 head (reviewed) | `0080d11deda9234cc30959793b0e6a27e7ba70af` |
| PR #2 branch before | `agent/chapter-navigation-ch01` @ `a15b2406370e78112e2142516f219971d4a8ca85` |
| Production `main` (unchanged) | `2cb743a36ae9babfd151c71276604d0f6a883a39` |
| Pinned storyboard | public `InterstellarHarvest/CYOA-storyboard` @ `c086e8a551d9355b3a9f8464e623073ac3e43588` |

**Method:** a fast-forward of `agent/chapter-navigation-ch01` (no merge commit, squash, rebase or force-push). Every reviewed commit keeps its identity:

| Commit | Content |
|---|---|
| `dc2a09f` | Batch A: storyboard `6a8b3da` |
| `4bcb72e` | Batch B art, provenance and pin `ac4b864`; sync fix |
| `0080d11` | Re-pull of `c086e8a` |

This record is the only commit on top.

**Content (public docs/107 §8–9):**
- **Prologue:** `drone_intercepts` spoken beat.
- **Chapter 1:**
  - five spoken cards;
  - `portrait_before_album` beat;
  - House dialogue in the foyer (`orientation_refusal`, `foyer_attempt`), lounge (`comfort_offer`) and dining room (`dinner_arrival`).
- **Chapter 2:** `gardener_promotion` printed-message presentation.
- **Art:** `art/portraits/house/lounge_conversation.png` (`a3d55c565d98fa92a8829100e3f0d255b72ff2963b30dd505be687df3a358bbb`) and `dining_conversation.png` (`33d7ed46c679bfbf9708edf84608cdf256a1eb22a213b55dd57825b9b6ec1f7a`). Provenance: `art/house_of_tomorrow.batch_b.provenance.json`.
- **Synchronization (`tools/story-sync/sync.js`, approved):** a death picture marked `approved` with no production path is pending integration and is projected with no art (the approved empty frame). `integrated` / `reused` art, and any record that names a path, stay strictly validated (path, file, sha256, git blob, 314×206). `qa-sync.js` keeps both tests:
  - approved, pending → no art;
  - integrated without a path → refused.

  **No Chapter 2 death art is integrated here.** That belongs to the Chapter 2 art-integration workflow (public docs/108).
- **Chapter 3:** not consumed (`tools/story-sync/config.json`) and not touched.

## Verification

### Local QA

Run on the exact integrated tree (`0080d11`; this record adds only this file) on 2026-11-18, in Chromium and Firefox. This is **local**, not GitHub CI.

| Suite | Result |
|---|---|
| `validate_story` | 178/178 |
| `validate_route` | 49/49 |
| `validate_ch01_art` (provenance, registry, 4 House views) | 261/261 |
| `validate_ch02_routes` | 157/157 |
| `validate_death_controls` | 45/45 |
| `validate_assets` | 59/59 |
| `run_story_qa` (Prologue + chapters, browser) | 124/124 |
| `run_ch01_routes_qa` | 154/154 |
| `run_ch01_art_qa` | 164/164 |
| `run_ch02_routes_qa` | 346/346 (solo rerun) |
| `run_death_controls_qa`, incl. the Chapter 2 hopper death: own popup, `data-art="pending"`, empty frame, no image | 102/102 |
| `run_end_presentation_qa` | 126/126 |
| `validate_story_import` | 92/92 |
| `tools/story-sync/qa-sync.js` | 28/28 |
| `sync.js verify --online` | OK (`story/` = public `c086e8a`, re-projected) |
| `tools/ci/check-qa-artifacts.js` | 104/104 |

The first `run_ch02_routes_qa` run, under full-suite load, was 339/340: one Firefox scenario hit a 30 s `page.goto` timeout on the local test server (no assertion failed; six checks never ran). The solo rerun passed 346/346.

### Engine and renderer checks

- **Route equivalence** (engine, PR #2 head `a15b240` vs integrated story): 88/88. Node sequence, flags, inventory, checks and offered card ids are identical, so no new branches. The only differences are the intended mode, card-kind and card-text changes. Spoken echoes are unquoted player speech; NPC speech in the transcript is unquoted.
- **Renderer** (Chromium + Firefox): 20/20.
  - `comfort_offer` / `dinner_arrival` resolve `portrait:house:view:house_of_tomorrow/{lounge,dining}` at 564×278, with the main lounge / dining scene still in the scene aperture.
  - The Martin card is spoken (quoted); the action cards stay in action ink.
  - The Martin line is echoed as `speech:you`; the route continues to `martin_bedtime`.
  - No page errors.
- **House view hashes** in the tree:

  | View | SHA-256 |
  |---|---|
  | foyer | `a77eb0a6…781d0` |
  | portrait gallery | `a365560b…66f4d` |
  | lounge | `a3d55c56…358bbb` (owner-approved) |
  | dining | `33d7ed46…ec1f7a` (owner-approved) |

### GitHub CI

The push that integrates this stack starts the `QA` workflow on PR #2 (`pull_request` synchronize; PR #2 is not a draft) on the final tree. PR #18 was not marked ready for review, which would have run the same full workflow (about 51 min) a second time on an identical tree. All earlier PR #18 runs were **skipped** (draft PR). The CI result is reported on PR #2, not here.
