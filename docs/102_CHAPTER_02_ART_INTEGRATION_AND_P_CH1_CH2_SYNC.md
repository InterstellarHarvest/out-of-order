# 102 — Chapter 2 art integration and the final Prologue / Chapter 1 / Chapter 2 synchronisation

**Date:** 2026-11-18.

**Work order:** Gameplay PMO, "Final Prologue / Ch1 / Ch2 synchronization". Chapter 3 is out of scope.

**Branch:** `agent/ch02-art-integration-20261118`, from PR #2 `90a0285`. It merges into PR #2 by fast-forward.

**Authorities:**
- public `docs/108` (Chapter 2 artwork completion: owner and Art Director approval of 2026-11-17, approval commit `1ce7e79`);
- public `docs/105` (the canonical sync pipeline);
- docs/97–99 and docs/101 here.

**Not changed:**
- No story text, choice, condition, check or death-popup wording.
- No engine or runtime file.
- No image generated, re-selected or re-encoded.
- No Chapter 3 content consumed or edited.
- PR #2 is not merged, and no other PR is closed.

## 1. Starting point (re-verified)

| | Value |
|---|---|
| Public storyboard `main` | `c086e8a` |
| Game PR #2 | `90a0285`, open |
| Game pin (`story/canon.lock.json`) | `c086e8a`; consumes `prologue-00`, `chapter-01`, `chapter-02` |
| Not consumed | `chapter-03`, its 17 items and its 3 death entries |
| Approved but unintegrated art | 51 records: the 50 Chapter 2 records of docs/108, plus the unbound Chapter 1 chair state |
| Importer | 45 DEV PLACEHOLDERs, all in Chapter 2. The 5 death images were empty frames |

## 2. Story parity (runtime vs canonical storyboard)

Independently of `sync.js`, each consumed chapter of public `c086e8a` was compared with the game's `story/` after removing only the contract's storyboard-only fields (`story/sync-contract.json`):
- node: `notes`, `comment`, `position`, `layout`, `storyboardNextChapter`, `deathPopup`, `endingArt`;
- choice: `notes`, `displayGroup`, `missingReason`.

| Chapter | Nodes | Result |
|---|---|---|
| Prologue | 29 | identical |
| Chapter 1 | 36 | identical |
| Chapter 2 | 99 | identical |

That covers 164 nodes, 247 choices, 28 dice checks and 24 dialogue nodes, together with every condition, flag, item effect and chapter transition.
- `items.draft.json` equals canon except for the 17 Chapter 3 items, which the lock lists as not consumed.
- The death export differs only in the five Chapter 2 art fields (section 4).

`sync.js verify --online` re-projects the pin byte for byte, and `import.js --verify` proves the runtime module is the deterministic build of `story/`.

## 3. Chapter 2 art integration (50 images)

**Source:** each image's registered selection in this repository (`git show <commit>:<path>`, across 9 immutable review commits). Each was required to match:
- the canonical `artwork-preview.json` SHA-256;
- the public preview copy, byte for byte;
- its native contract size and alpha.

No 2× or 4× review PNG was used. Each is copied byte-exact and pinned in `art/biology_park.provenance.json` by path, SHA-256, git blob and source.

| Kind | Count | Production path |
|---|---|---|
| Scene, 314×206 | 28 | `art/scenes/biology_park/<id>.png` |
| Conversation background, 564×278 | 2 | `art/portraits/groundskeeper/groundskeeper_background.png`, `art/portraits/courtesy_conductor/concourse_crash_background.png` |
| Conversation pose, 564×278, transparent | 2 | `art/portraits/groundskeeper/groundskeeper_idle.png`, `art/portraits/courtesy_conductor/courtesy_conductor_talking.png` |
| Focus A, 564×278 | 3 | `art/focus/biology_park/{aid_box_open,decontamination_kit_open,exposure_dispenser_open}.png` |
| Item slot, 96×96, and inspect, 565×451 | 10 | `art/items/<id>_{slot,inspect}.png` for the three antidotes, the certified seed canister and the acting director badge |
| Death screen, 314×206, drawn at 2× | 5 | `art/deaths/{classified_as_compost,new_arrival,personal_growth,reclassified,site_improvement}.png` |

**Round trip (public docs/105):**
1. **Storyboard `0e9dc25`:** the 50 production `assetPath`s, plus `selectedSource` for the five deaths (the same shape as Rest Assured). Statuses stay `approved`. The 50 preview copies move to their production paths with unchanged bytes, and the death export is regenerated.
2. **The game pulls `0e9dc25` and rebuilds.** No DEV PLACEHOLDER remains, and the build leaves the fixture profile.
3. **This build is published** (`sync.js publish`). The images it uses become `integrated`, and the integration report records the exact hashes.
4. **The game re-pins the resulting public revision** (section 7).

## 4. Death popups

All six records are byte-identical in title, subtitle, body, `popupStatus` and `readyForGameplay` before and after; only the five Chapter 2 art fields changed. Each Chapter 2 death opens its own image, native 314×206 drawn at exactly 2×, pixel-compared in Chromium and Firefox, with RETRY and CHECKPOINT available and EXIT unavailable. PERSONAL GROWTH is shared by the spore and thorn routes, as authored.

**Story Director approval of the popup copy:** none is recorded in the canonical storyboard. All six still read `approved-art-copy-draft` (Rest Assured) or `existing-ending-popup-copy-draft` (Chapter 2), with `readyForGameplay: false`. Nothing was marked approved here. Art status and copy status remain separate fields.

## 5. Open items (what prevents 100% visible agreement)

1. **The Focus A close-ups are covered while a kit is open.** The three approved 564×278 kit close-ups are bound, and decoded as the Focus A layer. But on a `scenePickup` node, the 565×451 Scene Pickup inspector (docs/87) opens over the portrait aperture and shows its labelled DEV PLACEHOLDER ("… OPEN WALL KIT - ART NOT YET APPROVED"). No approved art exists for that window; public docs/108 item 5 calls it a separate contract. The player therefore does not see these three images. This is an owner decision:
   - either the inspector shows the approved Focus A image;
   - or new 565×451 pickup art is commissioned.

   No engine change was made here. `run_ch02_art_qa.js` asserts the current behaviour, so any change is deliberate.
2. **Death-popup copy approval** by the Story Director (section 4).
3. **The Chapter 1 chair state** `default_unrestrained` stays `approved`, not integrated: no authored view uses it (docs/93).
4. **EXIT** waits for the main menu.

## 6. QA

- **New `game/qa/validate_ch02_art.js`** (content job; 326 checks):
  - intake, byte-exact against each source blob;
  - registry;
  - bindings: no placeholder among Chapter 2's keys and items;
  - every state of all 57 real Chapter 2 routes (982 states);
  - each fatal route ends on its own image;
  - all 50 images shown on at least one real route;
  - Chapter 3 not consumed.

  Mutation-tested: a changed PNG byte, a missing death art path, an item, a Focus or a pose reverting to a placeholder, a scene bound to another scene's file, and a dropped provenance entry each fail it.
- **New `game/qa/run_ch02_art_qa.js`** (browsers job, step `ch02_art`; Chromium + Firefox): 218 checks in the last local run:
  - at every settled step on the tour routes, the DOM art equals `Rules.view`;
  - the first appearance of each scene and each conversation pair is pixel-compared with its source;
  - every death popup is pixel-compared at 2×, with its controls;
  - the kit Focus A is bound (and covered, as in section 5);
  - each item's slot and inspect art is checked.
- **Updated:**
  - `validate_story_import.js`: art counts, plus an approved-build guard with a Biology Park control;
  - `validate_death_controls.js`: the content hash re-pinned to this build;
  - the M2 static art guard admits `art/biology_park.provenance.json`;
  - the CI artifact index and policy (now 112 checks).
- **Storyboard (public):** `check-canon`, `qa-sync` 22, `qa-smoke`, `qa-browser` 24, `qa-timeline` 112, `qa-artwork-preview` 48 and the export check pass. Tests that pinned "approved means no production path" now accept exactly the path assigned at integration, or `integrated`.

## 7. Pins and evidence

Completed after publishing; see the PR #2 comment for the final SHAs, the CI run and the acceptance matrix.
