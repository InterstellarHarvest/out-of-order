# 104 — Chapter 3 gameplay integration (The People's Pavilion, approved reboot)

**Date:** 2026-11-20; recovered and completed 2026-11-22 (section 10); artwork integration-status reconciliation prepared 2026-11-23 (section 11).

**Authorization:**
- Nate, "Out of Order — Chapter 3 Gameplay Integration" (2026-11-20): prepare Chapter 3 on a separate review branch; do not merge into `main` until separately authorized.
- Owner, 2026-11-22: recover the work into tested draft PRs only; no merge, deployment, production-status change or Chapter 4 integration.
- Nate, 2026-11-23: all 29 Chapter 3 production images approved; complete the canonical artwork reconciliation as draft PRs (section 11). Chapter 3 → Chapter 4 connectivity is handled when Chapter 4 integrates.

**Branch:** `agent/ch03-gameplay-integration-20261122`, from game `main` `9a0ca4a502216ce11b956bac15d0e61750e86904`. It supersedes the never-committed `agent/ch03-gameplay-integration-20261120` worktree (section 10).

**Storyboard:** source `main` `fde5708e0043972feeae0309e8a1d1836e756dae` (merged in on 2026-11-22; first recovered against `622ad87`). Pinned revision `3ff759e44feaf4b37e61fd705ef23b97e621e723` on the public branch `integration/ch03-gameplay-20261122` (draft PR InterstellarHarvest/CYOA-storyboard#19; section 2). Storyboard `main` is unchanged.

**Not changed:**
- No dialogue, choice, outcome, ending, check or item of the approved narrative.
- No image regenerated, re-encoded, resized or sharpened. No Prologue to Chapter 2 artwork changed.
- No main-menu asset (`review/out-of-order-menu-intake` untouched). No historical Chapter 3 gallery file.
- No approval record on storyboard `main`. No artwork marked `integrated`, and no production `assetPath` assigned on the storyboard (until the reconciliation, section 11).
- No Chapter 4 work: Chapter 4 is published narrative-only and is not consumed (section 2). `ch3_exit_route` is not implemented.

## 1. Narrative source and mapping

| | Value |
|---|---|
| Approved narrative | `story/chapters/chapter-03.reboot-candidate.json`, blob `857ffdf1bc9432cf4bbbfd7819f5f430a06d9036` (SHA-256 `36ae178d…0253`), locked by public docs/111. Unchanged on storyboard `main` `622ad87` |
| Not used | `chapter-03.reboot-review-layout.json` (the 34-node review-only *layout*) and the archived 62-node `chapter-03.draft.json` (preserved byte for byte, with its archive copy) |
| Shape | 34 nodes (20 dialogue, 14 Narrative B), 28 authored route variants, 7 surviving endings, 2 hidden d6 checks, 3 inherited-item actions |
| Transformation | None. `sync.js` projects the file unchanged; the lock records the source SHA-256 above; the importer emits it with only its usual pose/backdrop normalisation. `validate_ch03.js` compares every node field. |

Presentation rules carried as authored:
- second-person present tense; Narrative B for non-NPC passages;
- attendant and presenter conversations in dialogue mode with portraits;
- CONTINUE beats;
- spoken cards (quoted by the renderer) vs action cards (action ink);
- hidden d6 checks with the standard risk marker only;
- no repeated question banks.

Chapter 3 has no Focus A node, so Focus A is not used.

**Outcome rules held.** Every surviving route leaves the Pavilion without using the restroom; the Original stays an unexplained record datum. All 7 endings are surviving: BEGIN AGAIN, no death popup, no death art, no Chapter 4 link (docs/111).

**Chapter 4 dependency, recorded only.** The published Chapter 4 narrative routes its start on a flag `ch3_exit_route`, which the locked Chapter 3 never sets. That handoff belongs to the Chapter 4 milestone (as the Chapter 2 → 3 handoff belonged to this one) and needs a Chapter 3 narrative amendment by Nate. It is not implemented here.

## 2. Storyboard integration branch (public `integration/ch03-gameplay-20261122`, draft PR #19)

A fresh branch from storyboard `main` `622ad87`, holding one normal merge (`df253f6`) of the 2026-11-20 integration history (`a2ce2d9` data, `a4bda10` tests). The superseded `integration/ch03-gameplay-20261120` is left untouched.

On 2026-11-22 storyboard `main` moved to `fde5708`, registering ten approved Chapter 4 artworks (PR #20 Batch 1, PR #21 B2-01). It was merged in normally as `3ff759e`, with no conflicts; `main`'s only `qa-smoke` change (the record count +10) auto-merged. Every artwork file is byte-identical to `fde5708`. Main's B2-01 verifier passes 361 checks once only this branch's 4 intended story files are exempted; that is 365 minus those 4. The Batch 1 verifier is point-in-time and fails on `main` itself, because B2-01 added five more selections after it.

Against `main`, the branch changes 9 files:
- **Manifest.** `chapter-03` reads the approved reboot file, as `draft` (previously the archived legacy file, `archived`). Chapter 4's entry stays as published ("narrative approved · artwork pending · not in game").
- **Chapter 2.** The five living endings (`end_concourse_robot`, `end_public`, `end_customs`, `end_maintenance`, `end_underground_station`) each have one `CONTINUE` card: `continue_to_chapter_03_<node>` → `chapter: chapter-03`.
  - This replaces the draft BEGIN AGAIN bridge, exactly as the Chapter 1 exits hand off to Chapter 2.
  - Text, effects and entry groups are unchanged. The five fatal endings are unchanged.
- **Death export.** The 3 legacy Chapter 3 popups drop out (the active Chapter 3 has no fatal ending). The 6 Prologue–Chapter 2 entries are unchanged, and narrative-only Chapter 4 is skipped by the public exporter.
- **Layout.** `chapter-03` takes the approved reboot timeline (viewer only). Chapter 4's timeline is unchanged.
- **QA.** `qa-smoke`, `qa-timeline`, `qa-legacy-render`, `qa-ch3-reboot-candidate` and `qa-ch3-artwork-briefs` assert the activation.

**Artwork is byte-identical to `main`.** `story/artwork.draft.json`, `story/artwork-preview.json` and `assets/selected/` are unchanged:
- All 29 Chapter 3 records are `approved` with `assetPath: null`.
- Paper Emergency is Nate's v04 (`93a48082…`), with its v03 history intact.
- The 2026-11-20 commit `a2ce2d9` had assigned production paths: 29 `assetPath` values, 29 notes lines and 29 preview moves. Those 87 changes were deliberately not taken in the merge (owner direction: production paths stay null until the integration-status reconciliation). The game binds the art itself (section 3).

**Conflicts, resolved individually:**
- manifest: union;
- layout: union, verified structurally;
- `qa-smoke.mjs`: three hunks, each a union of the Chapter 4 and Chapter 3 assertions;
- `artwork.draft.json` / `artwork-preview.json`: `main`, for the reason above.

**Verification at `df253f6`, repeated at `3ff759e`:**
- **Static:** check-canon, qa-sync, the supersession guard, qa-smoke, `export --check` (6), qa-static, qa-ch3-reboot-candidate, qa-ch3-artwork-briefs, qa-legacy-render.
- **Browsers (Chromium + Firefox):** qa-browser 26/26, qa-timeline 136/136, qa-artwork-preview 60/60, art lab pages-site 70/70, art lab browser 106/106.
- **Complete Pages build** (emulated from `pages.yml` at the commit, with the four pinned galleries really checked out, including Batch A/B/C/D staging): 8/8 run steps, as on `main`.
  - The built site differs from `main` only in the 4 intended story files; the gallery receipts differ only in the build SHA.

The game consumes it with `node tools/story-sync/sync.js pull --rev 3ff759e44feaf4b37e61fd705ef23b97e621e723` (first `df253f6`). The re-pin adds only the ten Chapter 4 art records, which are not consumed. The content hash is unchanged (`8045c71dcbf1`), the chapter files are unchanged, and the art is unchanged.
- The lock consumes `prologue-00`, `chapter-01`, `chapter-02` and `chapter-03`.
- `chapter-04` and its two items are recorded as published but not consumed.
- No Chapter 4 death entry is projected.

## 3. Artwork (29 images)

Approved selections, byte-exact from each registered selection blob (`git show <commit>:<path>` in the public storyboard). Each one was verified against the approved SHA-256 and the canonical preview on storyboard `main` `622ad87`.

Pinned in `art/pavilion_reboot.provenance.json` (admitted to the M2 static art guard).
- **Scenes:** 314×206, opaque.
- **Backgrounds:** 564×278, opaque.
- **Poses:** separate 564×278 RGBA layers with binary alpha (0/255), composited over the scene's own closer background at the established portrait offset.
- **A04/A05:** the current v04 continuity replacements (`7bf1f42`). The superseded bytes are asserted absent.
- **Paper Emergency:** Nate's v04, approved 2026-11-22 (storyboard PR #18, `main` `622ad87`). The superseded v03 (`ac0f7c44…`, blob `a3d8673c`) is recorded under `supersedes`, asserted absent, and was never committed on this branch.

**Pending-integration binding (superseded 2026-11-23: dropped at the reconciliation, section 11; the mechanism and its refusals remain tested for later chapters).** Until then the storyboard kept every one of the 29 records `approved` with `assetPath: null` until the separate integration-status reconciliation. The game binds them itself:
- `story/runtime-settings.json` (game-owned) lists `pendingArtBindings: ["art/pavilion_reboot.provenance.json"]`.
- The importer (`convert.js`) binds a record to its own `suggestedFilename` only when all of these hold:
  - the record is `approved` (not generated, not integrated);
  - its canonical `assetPath` is null;
  - the bound SHA-256 equals the **first** SHA-256 its canonical notes name. That is the current selection; a superseded selection such as Paper Emergency v03 is only ever named after it, as history.
- `import.js` proves the file bytes against the bound SHA-256. The binding files are build sources, so editing one makes the committed build STALE.
- Refused:
  - a binding for a record that already has a canonical `assetPath` (drop it at reconciliation);
  - an unused binding;
  - any binding in an approved (`--promote`) build.
- `sync.js report` keys bound images to their records, so `sync.js publish` can register them at reconciliation.

| Record | Production path (= suggestedFilename) | SHA-256 | Source (commit:file) |
|---|---|---|---|
| `scenes:pavilion_reboot/arrival` | `art/scenes/pavilion_reboot/arrival.png` | `37d0b189fda18ad6659b0fae1f214145acd4ec67595c5e5a520917d6a7cbd478` | `7337e5e`:`CH3-B01-arrival-v03.png` |
| `scenes:pavilion_reboot/backstage` | `art/scenes/pavilion_reboot/backstage.png` | `aa90896023a59454887e9b3bd5b1745cb8b95a5d9737829119abddd9176f4889` | `e65f42c`:`CH3-D05-backstage-v03.png` |
| `scenes:pavilion_reboot/courtesy_stage` | `art/scenes/pavilion_reboot/courtesy_stage.png` | `0b413a7b9a669365f114fda8765a242fc3ce00fc9c1ea3bd535c7a2b3d1cdb98` | `e65f42c`:`CH3-D08-courtesy-stage-v01.png` |
| `scenes:pavilion_reboot/exit_vestibule` | `art/scenes/pavilion_reboot/exit_vestibule.png` | `cc2d2ce27e1e2cbf609fcae2210d3c46c57b749e8850be2219ad6de7f7f807c8` | `e65f42c`:`CH3-D07-exit-vestibule-v01.png` |
| `scenes:pavilion_reboot/exterior_exit` | `art/scenes/pavilion_reboot/exterior_exit.png` | `76b3232f685fd392f981f0c846382e3ddccd61ed94d44e09ea1bc5cf032c3e8a` | `e65f42c`:`CH3-D06-exterior-exit-v01.png` |
| `scenes:pavilion_reboot/human_verification_stage` | `art/scenes/pavilion_reboot/human_verification_stage.png` | `8df7e5dd2fffb17449fd43f4d9e7df167d75347efc53b0bde1771fd6d8d001ca` | `7bf1f42`:`CH3-A04-verification-continuity-v04.png` |
| `scenes:pavilion_reboot/locomotion_stage` | `art/scenes/pavilion_reboot/locomotion_stage.png` | `be99d790754951bcbcd1c26b94a94ff4e84280f5385735951b0f024b322e13c5` | `7bf1f42`:`CH3-C03-locomotion-v04.png` |
| `scenes:pavilion_reboot/paper_emergency` | `art/scenes/pavilion_reboot/paper_emergency.png` | `93a48082124600b1afeb45e5ea54856bf253e858e55111295e9d9c26919bc978` | `d1600a3`:`CH3-B06-paper-emergency-local-v04.png` (blob `261474c4`) |
| `scenes:pavilion_reboot/record_printer` | `art/scenes/pavilion_reboot/record_printer.png` | `1f80f8f17359c07fd24c74741be72bfa6ad941da67bb1622931e3b429bb0a722` | `7337e5e`:`CH3-B02-record-printer-v03.png` |
| `scenes:pavilion_reboot/record_scanner` | `art/scenes/pavilion_reboot/record_scanner.png` | `4afe7d0b1898c1e29443d45aba20614b14951bbf91c40e9508a62dc607fcd1b3` | `7337e5e`:`CH3-B04-record-scanner-v03.png` |
| `scenes:pavilion_reboot/restroom_entrance` | `art/scenes/pavilion_reboot/restroom_entrance.png` | `117dd9d00b6c9d32b4b153f71aaf51c2546ade70b803d45a748728f8d1a1f8b4` | `a87155b`:`CH3-A01-restroom-v09.png` |
| `scenes:pavilion_reboot/service_exit` | `art/scenes/pavilion_reboot/service_exit.png` | `4a736b2d7b5fd7dea50fe9d93fe36e7465674ce0b8e38e7f2d6517fca73df392` | `e65f42c`:`CH3-D01-service-exit-v01.png` |
| `scenes:pavilion_reboot/surprise_stage` | `art/scenes/pavilion_reboot/surprise_stage.png` | `8a85f438b734930985140851d38d2d691c8326e71d1aae7891e37b453a03412d` | `7bf1f42`:`CH3-C04-surprise-v04.png` |
| `scenes:pavilion_reboot/urgency_stage` | `art/scenes/pavilion_reboot/urgency_stage.png` | `368134fe2363134d3b63e7a7eae3a7b71b393a9d59484c4b3c456296239a7d2c` | `7bf1f42`:`CH3-C01-urgency-v04.png` |
| `scenes:pavilion_reboot/courtesy_stage#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/courtesy_stage.png` | `b0786ebd4147c6b0e6441838c725751a794db04fa9bcce4341aa1a3a7f1e7623` | `e65f42c`:`CH3-D09-courtesy-stage-bg-v02.png` |
| `scenes:pavilion_reboot/human_verification_stage#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/human_verification_stage.png` | `d09e2a7cf13c6382cd8d726a8852f32cfe359651f4c6c9538f4f7825d41844ef` | `7bf1f42`:`CH3-A05-verification-bg-continuity-v04.png` |
| `scenes:pavilion_reboot/record_printer#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/record_printer.png` | `46e79ce63fb0bda0af2695393a92c9c7ae064edddedbab0e0f4a5f6e9ad01473` | `7337e5e`:`CH3-B03-record-printer-bg-v03.png` |
| `scenes:pavilion_reboot/record_scanner#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/record_scanner.png` | `9099383613c587c3e2e10bcc33d839f75d2aaf685f20de7e47acc21e04c877ea` | `7337e5e`:`CH3-B05-record-scanner-bg-v03.png` |
| `scenes:pavilion_reboot/restroom_entrance#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/restroom_entrance.png` | `e4967d1f0e4bc2497fb0ce6e59891d1a25a2e1854b8bf395515cd8d0cc4b5260` | `a87155b`:`CH3-A02-restroom-bg-v04.png` |
| `scenes:pavilion_reboot/service_exit#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/service_exit.png` | `241bfb8e817cf7c42508c218c188a1ac2706bad2e5f577484ce10a359b9a88e9` | `e65f42c`:`CH3-D02-service-exit-bg-v02.png` |
| `scenes:pavilion_reboot/surprise_stage#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/surprise_stage.png` | `90f29651222b62bca461c0c33f09092290b374fd0cf10094c40267202515e255` | `7bf1f42`:`CH3-C05-surprise-bg-v04.png` |
| `scenes:pavilion_reboot/urgency_stage#portraitBackground` | `art/portraits/pavilion_reboot/backgrounds/urgency_stage.png` | `7d89b7d7c2ee22e6b324076ce988b3e5520e84be5b4068e79fe8d759ab529714` | `7bf1f42`:`CH3-C02-urgency-bg-v04.png` |
| `portraits:pavilion_attendant:alarmed` | `art/portraits/pavilion_reboot/pavilion_attendant/alarmed.png` | `51c2556b865ede1a997977c66e4f79cc1c0b271334a35aba36ef73555d40a43f` | `5e0449b`:`CH3-B07-attendant-alarmed-v02.png` |
| `portraits:pavilion_attendant:idle` | `art/portraits/pavilion_reboot/pavilion_attendant/idle.png` | `28fdf5523454ea2ccdb397bd4d7006fc1fb8f04109046b7646361692422c3ef2` | `a87155b`:`CH3-A03-attendant-idle-v04.png` |
| `portraits:pavilion_attendant:quiet` | `art/portraits/pavilion_reboot/pavilion_attendant/quiet.png` | `7f00208a3a96628f18fd23f079913dcb706e0e220db081d4cb438107f15bdf90` | `e65f42c`:`CH3-D03-attendant-quiet-v02.png` |
| `portraits:pavilion_presenter:alarmed` | `art/portraits/pavilion_reboot/pavilion_presenter/alarmed.png` | `4bc10c1b0ceb997d0ae51831f4368a60d35b74a59f8c1e24f1772553d638b887` | `5e0449b`:`CH3-C07-presenter-alarmed-v02.png` |
| `portraits:pavilion_presenter:excited` | `art/portraits/pavilion_reboot/pavilion_presenter/excited.png` | `d5aafddc9792a9e294b5f8793cef4d3c629354911a732a64a4976e1ed9acdd95` | `5e0449b`:`CH3-C06-presenter-excited-v02.png` |
| `portraits:pavilion_presenter:idle` | `art/portraits/pavilion_reboot/pavilion_presenter/idle.png` | `da33e42a723c8f1a5fe82a2ecaa5cd1e22281caa3ee4abc26db8e81569cd6784` | `a87155b`:`CH3-A06-presenter-idle-v04.png` |
| `portraits:pavilion_presenter:relieved` | `art/portraits/pavilion_reboot/pavilion_presenter/relieved.png` | `29a349c7bcdfe32d2885709dc91977beb7e3869d2461913cfd89afdacebbda9b` | `e65f42c`:`CH3-D04-presenter-relieved-v01.png` |

The service-exit background is one canonical record shared by both speakers (docs/111: "shared by every attendee/presenter pose used at this scene"). The runtime registers it once per speaker. `validate_assets.js` EF-A1 allows exactly that shape: one file, the same scene id, background keys of different speakers. A negative control proves that a background reused across *different* scenes is still refused.

**Accepted limitation, not resolved:** the original native-grid authorship of the Chapter 3 pixel art is **not proven**. These are source-derived grid transfers with localized native-pixel corrections (public docs/103, Chapter 3 addenda). The owner accepted this as an unresolved limitation. It is recorded in the provenance file and asserted by `validate_ch03.js`. This integration neither resolves nor re-verifies it.

## 4. Engine: incidental voices (shared schema, no Chapter 3 workaround)

Chapter 3 is the first content with `{ say, who }` runs by someone other than the portrait speaker: the door-holding **visitor** and the **restroom system** machine voice (12 lines). docs/109 asks for "the incidental visitor voiced as another speaker" inside the attendant's conversation, not a script in Narrative B.

Before this change:
- the importer dropped portrait-less cast;
- the validator required every cast member to have a portrait;
- the dialogue box and NOTES would have attributed those lines to the attendant or presenter.

Changes, generic to the schema:
- **`convert.js`:** a `who` that never leads a dialogue node becomes a portrait-less cast member `{ name }`. It needs `cast.<id>.name` in `story/runtime-settings.json`. Cast is emitted in id order, unchanged for existing content.
- **`rules.js`:** a cast member without a portrait is an incidental voice. It may speak in `say` runs but never lead a dialogue node; the validator rejects that.
- **`story-flow.js` / `stage.js`:**
  - An incidental voice's line gets its `NAME:` label in the existing Labels face, with the normal speaker gap.
  - NOTES uses the same label.
  - **The label is never stranded** (2026-11-22). The dialogue panel scrolls by line. `linesFrom` never ends a view on an incidental-voice label while its words follow; the label moves down with them. Before this rule, every one of the four voice passages could strand a label, and `record_scanner` did so in its very first settled view.
  - Portrait speakers are never labelled, and only incidental-voice labels carry `voice`, so no Prologue–Chapter 2 rendering changes (no earlier chapter has a `who` run).
  - `#speechText` exposes `data-view` (visible lines) beside `data-lines` and `data-scroll`.
- **Display names (game-owned `runtime-settings.json`; provisional, for Nate's gameplay review):** `pavilion_attendant` ATTENDANT, `pavilion_presenter` PRESENTER, `visitor` VISITOR, `restroom_system` RESTROOM SYSTEM.

## 5. The `%` glyph (owner decision, 2026-11-20)

Two approved readouts contain `%`: "AUDIENCE PARTICIPATION: 0%" and "AUTHENTIC HUMAN RESPONSE: 100%". No game font could draw it, so the importer refused the build. Rewording was ruled out, and the owner chose to add the glyph.

- **Font atlases.** `bake_fonts.py` appends `%` (`EXTRA_CHARS`) to the three TTF-baked faces (Jersey 15, Press Start 2P, Tiny5), each from its own OFL source.
  - Verified: today's bake reproduces the committed atlases pixel for pixel.
  - With `%`, only the new glyph's cell changes (re-verified 2026-11-22: each atlas's pixel difference is confined to the new cell). All 76 existing glyphs, metrics, line heights and atlas sizes are identical.
  - `fonts.json`, `lab_data.js` (fonts entry only), `snapshot_assets.js` (3 atlas entries) and `glyph-ink.js` (3 `%` entries) are updated. An unrelated, pre-existing drift between `placement.default.json` and `lab_data.js` was deliberately left alone.
- **Locked face unchanged.** It draws choice cards, the player's own lines and item names; it has no source font and still has no `%`.
- **Charset check.** `Rules.validateStory` charset is now role-aware (`{ locked, text }`): narration, NPC speech and directions in node text and results may use what every baked face draws. Everything else keeps the locked set, as before.
  - Mutants prove that `%` on a card or in the player's action is still refused.
  - A plain-array charset behaves exactly as before.

## 6. Gameplay systems

| System | How Chapter 3 uses it | Verified by |
|---|---|---|
| Chapter transition | 5 Chapter 2 living endings → CONTINUE → `pavilion_arrival`. The whole state crosses; the chapter entry is a CHECKPOINT | `validate_ch03` transition/routes; `run_ch03_qa` (the game itself takes each CONTINUE) |
| Arrival variants | 4 `flagIs` variants (tram crash, public concourse, service, underground). The unconditional fallback is unreachable on real play (allowed importer warning) | routes: each entry group's variant |
| Inventory carry-over | No new items. `wc_key` (every real route), `family_portrait_photo` (5 Chapter 2 routes), `red_stapler` (2), `timing_clicker` (kept House clicker). Contamination, credentials and exit-route flags persist; Chapter 3 changes no earlier flag | routes (32), browser tour |
| Six visible slots | **Never a capacity.** The engine's exhaustive walk reaches Chapter 3 with up to **9** items (25 917 Chapter 3 states hold 7 or more). `ch03_routes.js` `FULL_PACK` is one real playthrough (no dice) entering Chapter 3 with nine | `validate_ch03` items (9 cross whole, all inspectable, SHOW key + photo still work); `run_ch03_qa` `inventory_9` (six visible, arrows scroll to items 4–9, the 9th opens in the inspector, reload, the route still works) |
| SHOW / USE | SHOW key (kept), SHOW photo (returned), USE stapler (consumed once). Only while held; never otherwise | items group, browser inspector path, missing-item scenario |
| Dice | Leap d6≥4, +1 only while the clicker is held (raw 3 passes with it, fails after Chapter 2 spends it). Dash d6≥4, unmodified. Hidden: risk marker only | checks group; both outcomes of both checks on real seeds |
| Dialogue ↔ narration | 20 dialogue / 14 Narrative B nodes; incidental voices labelled, labels never stranded | presentation group; browser `voices` (+ reload) and `voice_labels` (every scroll position of all 4 voice passages) |
| NOTES / FILES | NOTES carries the whole playthrough with speaker labels. No new case file | browser voices (NOTES) |
| Endings | 7 surviving endings: BEGIN AGAIN → new playthrough. No death popup, no RETRY / CHECKPOINT on screen. A long ending passage pages with a presentation CONTINUE first | endings group; browser tour + restart; `run_story_qa` |
| Saves | Real saves written by game `main` 9a0ca4a (Prologue, Chapter 1, Chapter 2 mid, two Chapter 2 living endings) migrate. Old ending saves now offer CONTINUE into Chapter 3. Chapter 3 saves restore exactly | saves group; browser reload |

## 7. QA

New suites:
- **`game/qa/validate_ch03.js`** (content job; 451 checks): intake, registry (the binding), narrative, bindings, 32 real routes, coverage, endings, transition, presentation, saves, scope, the 9-item inventory.
  - Mutation-tested (2026-11-20) with 9 defects: a changed PNG byte, superseded A04 bytes, a rewritten line, a Chapter 2 ending left as BEGIN AGAIN, an unconsumed stapler, a lost clicker modifier, a mislabelled voice, an incompatible old save. Each fails a named check.
- **`game/qa/run_ch03_qa.js`** (browser job, step `ch03`; Chromium + Firefox): tour (every scene at 4× and every conversation pair 1:1, pixel-compared), voices, glyph, restart, missing items, `inventory_9`, `voice_labels`.
  - Mutant: removing the label rule fails all four voice passages.
- **`game/qa/ch03_routes.js`:** the shared real-route catalogue (28 authored variants + 4 inherited-item routes + `FULL_PACK`; real Prologue → House → Chapter 2 → Chapter 3, real dice by seed).
- **`validate_story_import` `pending-binding`** (11 checks): see section 3.
- **`tools/story-sync/qa-sync.js` 10b:** the actual narrative-only Chapter 4. The fixture `tools/story-sync/qa-fixtures/chapter-04.wip.json` is byte-exact from storyboard `622ad87`, blob `a0e1ad47`.
  - It checks the death-export re-derivation, status, and the refusal to consume Chapter 4.
  - A mutant without the port reproduces the original refusal.

Updated, deliberately, for the integrated state:
- `validate_story_import` (4 chapters; Chapter 3 art approved-only pending reconciliation; Chapter 3 approval guard);
- `validate_ch02_routes` and `run_ch02_routes_qa` (living endings continue into Chapter 3);
- `run_story_qa` (the customs ending enters Chapter 3; BEGIN AGAIN proved at a Chapter 3 ending, paging through its presentation CONTINUE first);
- `validate_ch02_art` (scope);
- `validate_death_controls` (content hash re-pinned 0bb7124ab2f6 → 8045c71dcbf1, an intentional canon pull; unchanged by the 2026-11-22 re-pin);
- `validate_assets` (EF-A1 shared background + control);
- `qa-sync.js` (Chapter 3 consumed; a Chapter 4 stub keeps the not-consumed path tested);
- CI artifact index and policy (120 checks).

Results: see the PR description for the full local run of every `qa.yml` step (2026-11-22).

## 8. Open items and reconciliation

1. **Nate's gameplay review** of this branch (checklist in the PR description).
2. **Display names** (section 4): provisional until that review.
3. **Reconciliation** (prepared 2026-11-23 as draft PRs, section 11; merging needs Nate's authorization):
   1. Storyboard: apply the Pages-staging repair (section 9) to the integration branch.
   2. Storyboard: assign the 29 production paths (`assetPath = suggestedFilename`, as Chapter 2's step A).
   3. Game: drop `pendingArtBindings` (the importer refuses a binding once a record has a canonical path) and re-pin.
   4. Run `sync.js publish --storyboard <worktree>`: the 29 become `integrated`, with this build's provenance and `story/game-integration.json`.
   5. Storyboard: `git rm` the 29 superseded `assets/selected/pending-integration/` preview copies (`register-art` writes the production-path copies but leaves the old ones, which check-canon refuses).
   6. Run check-canon and the complete Pages emulation.
   7. Merge the storyboard (one Pages deploy), then re-pin and merge the game.
   - Done on the reconciliation branches (section 11). Step 5 happened in step 2: `register-art` moved each preview to its production path, so no stale copy was ever written.
4. **Timing.** `validate_story_import` takes about 16–17 minutes locally. Every build walks about 262k reachable states with Chapter 3, against 164 nodes before.
5. The viewer legend's "preview handoff (not gameplay)" mode is now unused by any chapter (storyboard, cosmetic).
6. **Chapter 3 → 4** (`ch3_exit_route`): Nate, 2026-11-23: handled when Chapter 4 integrates. Until then the seven Chapter 3 endings keep BEGIN AGAIN (section 11.6).

## 9. Reconciliation: the storyboard Pages-staging issue and its repair (applied 2026-11-23, section 11)

**Issue.** The storyboard's Pages build stages the pinned Chapter 3 review galleries, and `pages.yml` runs those steps only on `main`; PR CI does not.

Two of its guards assume the Chapter 3 art is never integrated:
- `tools/sync/stage-ch3-batch04-review.mjs` (Batch D, 9 records): asserts `status === 'approved'`, `assetPath === null`, and that each preview's `source` is the approved selection.
- `tools/sync/ch3-reference-supersession.mjs` (Paper Emergency v03 → v04): asserts `approved` with a null path.

In addition, `tools/storyboard/qa-smoke.mjs` hard-codes that integrated Biology Park previews cite `InterstellarHarvest/CYOA`. That is the game repository's old name: `sync.js publish` re-registers every image the build uses, so all 115 previously integrated previews then cite `InterstellarHarvest/out-of-order`.

Consequence: the first Pages deploy after reconciliation would fail at `qa-smoke` and then at Batch D staging.

**Rehearsal (scratch only, never pushed).** On `df253f6` (the repair patch also applies cleanly to `3ff759e`) the reconciliation of section 8 was run with the real tools:
- the 29 paths assigned;
- `register-art --batch` with this branch's real `sync.js report` (game `e9cc65a`, 144 images);
- the 29 stale `pending-integration/` copies removed.

check-canon passes (140 integrated). The complete Pages emulation then fails at `qa-smoke` and, after that, at Batch D (`registered approval is never lowered to generated`); `qa-ch3-reference-supersession` also fails.

**Repair** (`docs/104_storyboard_reconciliation_pages_repair.patch`, SHA-256 `f25dacbbb51325f56de36d708c2b1625186b2f02e057b2572bf924a62539a0c8`; 4 storyboard files, +44 −12). It is hash-preserving: no image, preview or record byte changes, and integration is admitted only with proof of the same bytes.
1. `qa-smoke.mjs`: an integrated preview may cite either name of the game repository (renamed 2026-11-19).
2. `ch3-reference-supersession.mjs`: Paper Emergency passes either while `approved` with no production path, or when all of these hold:
   - it is `integrated` at exactly its `suggestedFilename`;
   - `story/game-integration.json` shows a game build used exactly v04 (`93a48082…`) at that path.

   Everything else still fails. `qa-ch3-reference-supersession.mjs` builds both states explicitly and adds 6 refusals: approved with a path, no report, v03 bytes, a different game path, and a path other than `suggestedFilename`, plus the existing notes rule. 17 checks.
3. `stage-ch3-batch04-review.mjs`: each Batch D record passes as before, or when all of these hold:
   - it is `integrated` at exactly its `suggestedFilename`;
   - the game integration report used exactly its approved SHA-256 there;
   - its preview cites that game build at `assets/selected/<assetPath>`.

   The receipts (`deployment-provenance.json`, `selection.html`) then state the integration instead of "not integrated".

**Proof (rehearsal):**
- Reconciled state + repair: complete Pages build 8/8, Batch D "9/9 byte-exact; 22 strict + 1 recorded later replacement".
- Pre-reconciliation state (`df253f6`) + repair: 8/8, and the built site is identical to `df253f6`'s except for build SHAs, so the repair changes nothing until reconciliation.
- Negative: a reconciled Batch D record whose game report names other bytes, or whose `assetPath` is not its `suggestedFilename`, is refused.

## 10. Recovery record (2026-11-22)

The 2026-11-20 session left 74 uncommitted entries in `_worktrees/out-of-order-ch03-gameplay` (base `9a0ca4a`), and its final QA run was interrupted. That worktree is untouched. Full local recovery copies:
- the ref `refs/preserve/ch03-gameplay-wip-20261122` = `58362d9` (local only: it includes ignored QA output);
- `_backups/out-of-order-ch03-gameplay-wip-2026-11-22.tgz`.

**Audit findings that this branch resolves:**
- Paper Emergency was v03; it is now v04.
- The storyboard pin `a4bda10` was 50 commits behind and conflicted with `main` in 5 files. It became `df253f6`, and then `3ff759e` after `main` moved (section 2).
- The game's `sync.js` could not consume any storyboard revision carrying the real Chapter 4. It now ports `development.notForGameplay` and refuses to consume such a chapter.
- `run_story_qa` had failed 84/88 (the Chapter 3 ending's presentation CONTINUE); the check is fixed.
- Incidental-voice labels could be stranded; the rule is fixed and tested.
- The six visible slots were never exercised beyond six items; now 9.

**Commits:**
1. The 2026-11-20 source exactly as left (74 paths, byte-identical), without run output and without the v03 PNG.
2. The sync port.
3. The pending binding.
4. The re-pin and v04.
5. The QA additions.
6. This record.

Screenshots and `*_results.json` run output are not committed.

**Remote CI.** No GitHub Actions run validates this draft:
- The account's included Actions minutes were exhausted while the repository was private.
- The owner wants no paid usage, so the one manual run (45095798209) was cancelled after its content job passed.
- The repository is now public (free minutes), but QA still skips draft PRs.

The complete local run of every `qa.yml` step is the evidence (PR description).

## 11. Integration-status reconciliation and production closeout (2026-11-23)

**Owner decision (Nate, 2026-11-23):** all 29 Chapter 3 production images are approved; complete the canonical artwork reconciliation. No artwork is generated or modified. Prepared as draft PRs only: no merge, deployment or milestone close without Nate's final authorization.

**Starting state (verified before writing anything):**
- Game `main` `3a8e07a` (PR #22 merged), pinned to storyboard `main` `0e83a6e`.
- Storyboard `main` `ac2916c`, with Chapter 4 B2-02 to B2-06 registered after `0e83a6e`.
- Exactly 29 Chapter 3 records, all `approved`, all `assetPath: null`. Each `suggestedFilename` equals its game path. Each record's first named SHA-256 equals the installed bytes (29/29). Paper Emergency names v04 `93a48082…` first and v03 `ac0f7c44…` after it, as history.

### 11.1 Storyboard branch `integration/ch03-art-reconciliation-20261123` (from `main` `ac2916c`)

| Commit | What |
|---|---|
| `25a376a` | Pages-staging repair (section 9), reconciled with `ac2916c`. The patch applied cleanly; the Batch D and Paper Emergency changes are written as one shared rule, `tools/sync/ch3-integration-state.mjs` (below). New `qa-ch3-integration-state.mjs` in PR CI. |
| `c785fb7` | Step A: the 29 `assetPath = suggestedFilename`, status still `approved`. `register-art` re-registered each preview with its own approval source, so it moved to `assets/selected/<assetPath>` (29 byte-identical renames). |
| `9c3d504` | Step 4, written by the game's `sync.js publish` (nothing hand-edited): the 29 become `integrated`. `story/game-integration.json` names game build `abaf917`, and the 144 previews of the images that build uses cite it. |
| `f0f8514` | Viewer QA: the integrated House arrival preview cites the renamed game repository (exact source line); the 29 list together under Integrated. |
| `c52437f` | Normal merge of storyboard `main` `b56f91e` (Chapter 4 B2-07, five approved records), no conflicts. Verified field by field: the 238 other records and the 47 untouched previews are exactly `main`'s; the 29 records and 144 reconciled previews are this branch's. Main's point-in-time `verify-ch4-b207-selection.py` passes 365 checks once only the reconciliation's own changes are exempted. |
| `04e6d9a` | Normal merge of storyboard `main` `96e3c2a` (Chapter 4 B2-08, six approved records), no conflicts. The 244 other records and 53 untouched previews are exactly `main`'s; the 29 records and 144 reconciled previews are this branch's. `verify-ch4-b208-selection.py` passes 405 checks with the same exemptions. |

**The shared rule.** An approved Chapter 3 selection passes in exactly two states:
- **Approved, before integration.** No production path, and the preview cites the approved selection.
- **Integrated, after reconciliation.** All of these hold:
  - it is at exactly its `suggestedFilename`;
  - `story/game-integration.json` names `InterstellarHarvest/out-of-order` and a full commit;
  - the report lists the key once, at that path, with exactly the approved SHA-256;
  - the preview is at `assets/selected/<assetPath>` and cites that build at that path.

Batch D staging (9 records) and the Paper Emergency v03 → v04 supersession apply it. Everything else is refused:
- statuses below `approved`, or `approved` with a path;
- no report, or a report with another schema, another repository or a short commit;
- a record listed twice or missing from the report;
- other bytes, another path, or a path other than `suggestedFilename`;
- a preview that still cites the approved selection or another build.

Tests (Chromium + Firefox where browsers apply):
- `qa-ch3-integration-state` 52 checks: both states on real records, 22 refusals per record, and the repository's 29 in one state, byte-exact.
- `qa-ch3-reference-supersession` 23 checks: both Paper Emergency states, 12 refusals.
- `qa-artwork-preview` 62 checks.

**Unchanged:** the immutable gallery checks, the 23 approved-source references, the v03 history copy, every hash, and `pages.yml` (Pages still deploys from `main` only).

### 11.2 Game branch `agent/ch03-art-reconciliation-20261123` (from `main` `3a8e07a`)

| Commit | What |
|---|---|
| `abaf917` | Re-pin storyboard `c785fb7` (step A). `pendingArtBindings` removed; rebuilt with the importer. Content hash `8045c71dcbf1` unchanged; the only build change is that the 29 art entries lose `binding` (same paths, same bytes). **This is the build published as integrated.** Chapter 3 in the browser 248/248 on it before publishing. |
| `0ac87d8` | Re-pin storyboard `f0f8514`. The build changes exactly 29 art statuses `approved` → `integrated`; content hash unchanged. QA pins the integrated state. Closeout record (this section). |

| `4512b13` | The story-import baseline art census pins the integrated Pavilion images (found by the first complete local run). |
| `4be91fa` | Re-pin storyboard `c52437f` (B2-07 merge): the projection adds only the five unconsumed Chapter 4 B2-07 records; content hash and every art entry identical. |
| this commit | Re-pin storyboard `04e6d9a` (B2-08 merge): adds only the six unconsumed B2-08 records; content hash and every art entry identical. |

QA changed deliberately, without loosening anything:
- **`validate_ch03` registry:** each record is `integrated` at exactly its production path, with the approved SHA-256 named first, built from that path, with no binding.
- **`validate_story_import`:**
  - 8 build sources (the provenance file is no longer one);
  - art status: 132 integrated, none approved-only, none generated;
  - the pending-binding mechanism stays. Every refusal is kept and tested on a rebuilt pre-reconciliation copy. New checks: the real build has no binding, and re-adding it to the reconciled registry is refused.

### 11.3 The 29 records

All 29 changed `approved` (`assetPath: null`) → `approved` (production path, `c785fb7`) → `integrated` (`9c3d504`). The production path is the `suggestedFilename` and the game file, and the SHA-256 is unchanged throughout (table in section 3; every hash re-verified on both branches).

Each record keeps its complete approval history, its approved-source notes and its accepted native-grid authorship limitation. The Paper Emergency v03 history copy (`docs/artwork-history/chapter-03/pre-v04-paper-emergency-2026-11-22/`) is preserved with its original hash.

### 11.4 Integration report (`story/game-integration.json`)

- **Game:** `InterstellarHarvest/out-of-order` `abaf9177ab79cadf0f0e9d665a48b93fccd79543`, branch `agent/ch03-art-reconciliation-20261123`.
- **Storyboard:** revision `c785fb7878ed81735941186f911f0866a90e1b48`.
- **Build:** channel preview, content `8045c71dcbf1…`, chapters Prologue to Chapter 3.
- **Images:** 144, the 115 earlier Prologue to Chapter 2 images plus the 29.

The 115 earlier previews keep their bytes and paths, and now cite this build under the game's current name.

### 11.5 Merge order (each step needs Nate's authorization)

1. **Game PR #23 (CI policy).** Merge it first: game `main`'s `qa.yml` lacks the partial-clone checkout, so the Chapter 2 art check fails 0/50 in Actions without it.
2. **Storyboard reconciliation PR.** Merge with a **normal merge commit, not a squash**: `story/game-integration.json` cites storyboard `c785fb7` and game `abaf917`, which must stay reachable. One Pages deploy follows from `main`.
3. **Game.** If storyboard `main` moved again, merge it into the storyboard PR first (normal merge), as `c52437f` did. Then re-pin the storyboard merge commit (`sync.js pull --rev <merge>`). The projection should differ only in the lock revision, plus any Chapter 4 records published meanwhile (not consumed). Run the content QA, then merge this PR with a **normal merge commit** (`abaf917` must stay reachable).

### 11.6 Deferred: Chapter 3 → Chapter 4

The seven Chapter 3 endings keep BEGIN AGAIN, unchanged. Chapter 4's narrative expects `ch3_exit_route`, which the locked Chapter 3 never sets. Connecting them belongs to the Chapter 4 gameplay integration milestone (Nate, 2026-11-23). Nothing here adds the flag or a transition, and no main-menu or chapter-transition asset is integrated.

### 11.7 Limitations

- Original native-grid authorship of the Chapter 3 pixel art stays **not proven**: an accepted, unresolved limitation (section 3).
- The display names ATTENDANT / PRESENTER / VISITOR / RESTROOM SYSTEM are unchanged and still await Nate's visual sign-off.
