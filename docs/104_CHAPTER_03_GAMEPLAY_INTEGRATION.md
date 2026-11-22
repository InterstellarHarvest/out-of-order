# 104 — Chapter 3 gameplay integration (The People's Pavilion, approved reboot)

**Date:** 2026-11-20. **Authorization:** Nate, "Out of Order — Chapter 3 Gameplay Integration": prepare Chapter 3 on a separate review branch; do not merge into `main` until separately authorized.

**Branch:** `agent/ch03-gameplay-integration-20261120`, from game `main` `9a0ca4a502216ce11b956bac15d0e61750e86904`.

**Storyboard:** source `main` `43fe258c3a668f02a5296cb12d8f74679a3434dc`. Pinned integration revision `a4bda1075ba207eb21dc0ae6c3f788c0c17ef774` on the public branch `integration/ch03-gameplay-20261120` (section 2). Storyboard `main` is unchanged.

**Not changed:**
- No dialogue, choice, outcome, ending, check or item of the approved narrative.
- No image regenerated, re-encoded, resized or sharpened. No Prologue to Chapter 2 artwork changed.
- No main-menu asset (`review/out-of-order-menu-intake` untouched). No historical Chapter 3 gallery file.
- No approval record on storyboard `main`. No artwork marked `integrated`.
- No Chapter 4 work.

## 1. Narrative source and mapping

| | Value |
|---|---|
| Approved narrative | `story/chapters/chapter-03.reboot-candidate.json`, blob `857ffdf1bc9432cf4bbbfd7819f5f430a06d9036` (SHA-256 `36ae178d…0253`), locked by public docs/111 |
| Not used | `chapter-03.reboot-review-layout.json` (the 34-node review-only *layout*) and the archived 62-node `chapter-03.draft.json` (preserved byte for byte, with its archive copy) |
| Shape | 34 nodes (20 dialogue, 14 Narrative B), 28 authored route variants, 7 surviving endings, 2 hidden d6 checks, 3 inherited-item actions |
| Transformation | none. `sync.js` projects the file unchanged; the lock records the source SHA-256 above; the importer emits it with only its usual pose/backdrop normalisation. `validate_ch03.js` compares every node field. |

Presentation rules carried as authored: second-person present tense; Narrative B for non-NPC passages; attendant and presenter conversations in dialogue mode with portraits; CONTINUE beats; spoken cards (quoted by the renderer) vs action cards (action ink); hidden d6 checks with the standard risk marker only; no repeated question banks. Chapter 3 has no Focus A node, so Focus A is not used.

**Outcome rules held.** Every surviving route leaves the Pavilion without using the restroom; the Original stays an unexplained record datum. All 7 endings are surviving: BEGIN AGAIN, no death popup, no death art, no Chapter 4 link (docs/111).

## 2. Storyboard integration branch (public `integration/ch03-gameplay-20261120`)

This is the established step-A pattern (Chapter 2 storyboard commit `0e9dc25`; Chapter 1 to Chapter 2 hand-offs). It is pushed so the game's pin resolves online, and it is **not** merged into storyboard `main`.

**`a2ce2d9` (data):**
- **Manifest.** `chapter-03` now reads the approved reboot file, as `draft`. Previously it was the archived legacy file, `archived`.
- **Chapter 2.** The five living endings (`end_concourse_robot`, `end_public`, `end_customs`, `end_maintenance`, `end_underground_station`) now have one `CONTINUE` card: `continue_to_chapter_03_<node>` → `chapter: chapter-03`.
  - This replaces the draft BEGIN AGAIN bridge, exactly as the Chapter 1 exits hand off to Chapter 2.
  - Text, effects and entry groups are unchanged. The node notes themselves anticipated this ("Existing end:true and restart behavior remain for gameplay until future integration").
  - The five fatal endings are unchanged.
- **Art.** The 29 approved Chapter 3 records get their own proposed production `assetPath` (= their `suggestedFilename`), with an appended GAMEPLAY PMO line.
  - **Status stays `approved`**; approvals, hashes and provenance are unchanged.
  - Preview copies move from `pending-integration/` to the production paths, with identical bytes.
- **Death export** regenerated. The 3 legacy Chapter 3 popups drop out, because the active Chapter 3 has no fatal ending. The 6 Prologue–Chapter 2 entries are unchanged.
- **Layout.** `chapter-03` takes the approved reboot timeline (viewer only).

**`a4bda10` (tests only):** the storyboard suites now assert this deliberate activation.
- The legacy 62-node render snapshot is still checked, against the preserved legacy file.
- All storyboard CI suites pass: check-canon, qa-sync 22, qa-smoke, export, art-lab static, qa-browser 24, qa-timeline 136, qa-artwork-preview 60, art-lab pages 70 + browser 106, Chapter 3 candidate and briefs.

The game consumes it with `tools/story-sync/config.json` + `chapter-03` (owner authorization), then `sync.js pull --rev a4bda10…`.

## 3. Artwork (29 images)

Approved selections, byte-exact from each registered selection blob (`git show <commit>:<path>` in the public storyboard). Each one was verified against the approved SHA-256, the canonical preview and the docs/103 / 113 / 119 / 122 ledgers, both before and after copying.

Pinned in `art/pavilion_reboot.provenance.json` (admitted to the M2 static art guard).
- **Scenes:** 314×206.
- **Backgrounds:** 564×278, opaque.
- **Poses:** separate 564×278 RGBA layers with binary alpha (0/255), composited over the scene's own closer background at the established portrait offset.
- **A04/A05:** the current v04 continuity replacements (`7bf1f42`). The superseded v07/v04 bytes are asserted absent.

| Record | Production path | SHA-256 | Source (commit:file) |
|---|---|---|---|
| `scenes:pavilion_reboot/arrival` | `art/scenes/pavilion_reboot/arrival.png` | `37d0b189fda18ad6659b0fae1f214145acd4ec67595c5e5a520917d6a7cbd478` | `7337e5e`:`CH3-B01-arrival-v03.png` |
| `scenes:pavilion_reboot/backstage` | `art/scenes/pavilion_reboot/backstage.png` | `aa90896023a59454887e9b3bd5b1745cb8b95a5d9737829119abddd9176f4889` | `e65f42c`:`CH3-D05-backstage-v03.png` |
| `scenes:pavilion_reboot/courtesy_stage` | `art/scenes/pavilion_reboot/courtesy_stage.png` | `0b413a7b9a669365f114fda8765a242fc3ce00fc9c1ea3bd535c7a2b3d1cdb98` | `e65f42c`:`CH3-D08-courtesy-stage-v01.png` |
| `scenes:pavilion_reboot/exit_vestibule` | `art/scenes/pavilion_reboot/exit_vestibule.png` | `cc2d2ce27e1e2cbf609fcae2210d3c46c57b749e8850be2219ad6de7f7f807c8` | `e65f42c`:`CH3-D07-exit-vestibule-v01.png` |
| `scenes:pavilion_reboot/exterior_exit` | `art/scenes/pavilion_reboot/exterior_exit.png` | `76b3232f685fd392f981f0c846382e3ddccd61ed94d44e09ea1bc5cf032c3e8a` | `e65f42c`:`CH3-D06-exterior-exit-v01.png` |
| `scenes:pavilion_reboot/human_verification_stage` | `art/scenes/pavilion_reboot/human_verification_stage.png` | `8df7e5dd2fffb17449fd43f4d9e7df167d75347efc53b0bde1771fd6d8d001ca` | `7bf1f42`:`CH3-A04-verification-continuity-v04.png` |
| `scenes:pavilion_reboot/locomotion_stage` | `art/scenes/pavilion_reboot/locomotion_stage.png` | `be99d790754951bcbcd1c26b94a94ff4e84280f5385735951b0f024b322e13c5` | `7bf1f42`:`CH3-C03-locomotion-v04.png` |
| `scenes:pavilion_reboot/paper_emergency` | `art/scenes/pavilion_reboot/paper_emergency.png` | `ac0f7c44d267dd54897507ae3b8b02959a5b76f4fcd9d0418b77b8fdb777ba7e` | `7337e5e`:`CH3-B06-paper-emergency-v03.png` |
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

The service-exit background is one canonical record shared by both speakers (docs/111: "shared by every attendee/presenter pose used at this scene"). The runtime registers it once per speaker. `validate_assets.js` EF-A1 now allows exactly that shape: one file, the same scene id, background keys of different speakers. A new negative control proves that a background reused across *different* scenes is still refused.

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
  - Portrait speakers are never labelled, so no Prologue–Chapter 2 rendering changes (no earlier chapter has a `who` run).
- **Display names (game-owned `runtime-settings.json`, for Nate to confirm):** `pavilion_attendant` ATTENDANT, `pavilion_presenter` PRESENTER, `visitor` VISITOR, `restroom_system` RESTROOM SYSTEM.

## 5. The `%` glyph (owner decision, 2026-11-20)

Two approved readouts contain `%`: "AUDIENCE PARTICIPATION: 0%" and "AUTHENTIC HUMAN RESPONSE: 100%". No game font could draw it, so the importer refused the build. Rewording was ruled out, and the owner chose to add the glyph.

- **Font atlases.** `bake_fonts.py` appends `%` (`EXTRA_CHARS`) to the three TTF-baked faces (Jersey 15, Press Start 2P, Tiny5), each from its own OFL source.
  - Verified: today's bake reproduces the committed atlases pixel for pixel.
  - With `%`, only the new glyph's cell changes. All 76 existing glyphs, metrics, line heights and atlas sizes are identical.
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
| SHOW / USE | SHOW key (kept), SHOW photo (returned), USE stapler (consumed once). Only while held; never otherwise | items group, browser inspector path, missing-item scenario |
| Dice | Leap d6≥4, +1 only while the clicker is held (raw 3 passes with it, fails after Chapter 2 spends it). Dash d6≥4, unmodified. Hidden: risk marker only | checks group; both outcomes of both checks on real seeds |
| Dialogue ↔ narration | 20 dialogue / 14 Narrative B nodes; incidental voices labelled | presentation group; browser voices + reload |
| NOTES / FILES | NOTES carries the whole playthrough with speaker labels. No new case file | browser voices (NOTES) |
| Endings | 7 surviving endings: BEGIN AGAIN → new playthrough. No death popup, no RETRY / CHECKPOINT on screen | endings group; browser tour + restart |
| Saves | Real saves written by game `main` 9a0ca4a (Prologue, Chapter 1, Chapter 2 mid, two Chapter 2 living endings) migrate. Old ending saves now offer CONTINUE into Chapter 3. Chapter 3 saves restore exactly | saves group; browser reload |

## 7. QA

New suites:
- **`game/qa/validate_ch03.js`** (content job): intake, registry, narrative, bindings, 32 real routes, coverage, endings, transition, presentation, saves, scope. Mutation-tested with 9 defects: a changed PNG byte, superseded A04 bytes, a rewritten line, a Chapter 2 ending left as BEGIN AGAIN, an unconsumed stapler, a lost clicker modifier, a mislabelled voice, an incompatible old save. Each fails a named check.
- **`game/qa/run_ch03_qa.js`** (browser job, step `ch03`): Chromium + Firefox.
- **`game/qa/ch03_routes.js`:** the shared real-route catalogue (28 authored variants + 4 inherited-item routes; real Prologue → House → Chapter 2 → Chapter 3, real dice by seed).

Updated, deliberately, for the integrated state:
- `validate_story_import` (4 chapters; Chapter 3 art approved-only pending reconciliation; Chapter 3 approval guard);
- `validate_ch02_routes` and `run_ch02_routes_qa` (living endings continue into Chapter 3);
- `run_story_qa` (the customs ending enters Chapter 3; BEGIN AGAIN proved at a Chapter 3 ending);
- `validate_ch02_art` (scope);
- `validate_death_controls` (content hash re-pinned 0bb7124ab2f6 → 8045c71dcbf1, an intentional canon pull);
- `validate_assets` (EF-A1 shared background + control);
- `qa-sync.js` (Chapter 3 consumed; a Chapter 4 stub keeps the not-consumed path tested);
- CI artifact index and policy (120 checks).

Results: see the PR description for the full local run of every `qa.yml` step.

## 8. Open items and reconciliation

1. **Nate's gameplay review** of this branch.
2. **Display names** (section 4).
3. **Reconciliation, after approval and a separate merge authorization:**
   - `sync.js publish --storyboard <public worktree>` registers the 29 images as `integrated` with this build's provenance.
   - Merge the storyboard integration branch into public `main` (one Pages deploy).
   - Re-pin the game.
   - Until then the 29 records stay `approved`, and `validate_story_import` asserts exactly that.
4. **Timing.** `validate_story_import` now takes about 16 minutes locally. Every build walks about 262k reachable states with Chapter 3, against 164 nodes before.
5. The viewer legend's "preview handoff (not gameplay)" mode is now unused by any chapter (storyboard, cosmetic).
