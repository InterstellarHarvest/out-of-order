# 89 — Chapter 1 artwork coverage audit

**Date:** 2026-11-15
**Scope:** Chapter 1 — House of Tomorrow. Audited 36 authored nodes / 14 distinct scene IDs against the source artwork catalog and private art review branch.
**Art branch inspected:** agent/ch01-art-batch04-20261115 at a4a5c012ef32cd08e78c05914e742f9049a58f74.
**Status:** Generated review candidates exist; production integration/owner promotion remains pending.

## Executive finding

**All 14 required Chapter 1 main scenes have generated PNG candidates**, including the revised single-door arrival, closed foyer, and open public exit. The two location-specific complete House intercom portraits, all three album illustrations, and both family-photo item images also exist.

That is **21 required still-image candidate outputs**: 14 scenes + 2 complete speaker views + 3 album pages + 2 photograph item images. An extra default Rest Assured close-state is also available, or **22** if that additional optional variant is counted. These counts exclude superseded revisions, previous Prologue/common UI artwork, and the newly requested death/transition presentation art.

**No Chapter 1 production artwork entry has been promoted:** scene, House portrait, album focus and new family photograph still show not-started / null assetPath in the source catalog. Existing candidates are on the isolated review branch, not in the production asset bindings.

## 1. Fourteen scene IDs and latest selected candidates

All paths are relative to the repository root on the art branch named above.

| Story scene ID (suffix after house_of_tomorrow/) | Selected candidate PNG |
|---|---|
| arrival | review/chapter-01-batch04-2026-11-15/arrival-correction-v03/arrival-v03.png |
| foyer | review/chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/foyer-single-door-v03.png |
| lounge | review/chapter-01-batch02-2026-11-15/candidates/lounge-candidate-v01.png |
| storage | review/chapter-01-batch04-2026-11-15/candidates/storage-v02.png |
| dining | review/chapter-01-speaker-revision-2026-11-15/candidates/dining-v04.png |
| public_exit | review/chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/public-exit-single-door-v01.png |
| bedroom | review/chapter-01-batch02-2026-11-15/candidates/bedroom-candidate-v01.png |
| passage | review/chapter-01-batch02-2026-11-15/candidates/passage-candidate-v01.png |
| service_hatch | review/chapter-01-batch04-2026-11-15/candidates/service-hatch-v01.png |
| chair | review/chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-in-use-v04.png |
| maintenance | review/chapter-01-batch04-2026-11-15/candidates/maintenance-v01.png |
| utility_exit | review/chapter-01-batch04-2026-11-15/candidates/utility-exit-v01.png |
| portrait_gallery | review/chapter-01-batch03-2026-11-15/wide-speaker-position-v05/gallery-v05.png |
| bathroom | review/chapter-01-first-pass-2026-11-15/candidates/bathroom.png |

All 14 are native 314×206 opaque pixel-art candidates, intended for 4× nearest-neighbor presentation.

## 2. Other storyboard art: candidate files present

| Feature | Selected candidate PNG |
|---|---|
| Complete opaque House speaker conversation — foyer, 564×278 | review/chapter-01-speaker-revision-2026-11-15/candidates/foyer-conversation-v05.png |
| Complete opaque House speaker conversation — gallery, 564×278 | review/chapter-01-batch03-2026-11-15/printer-album-restoration-v04/candidates/gallery-conversation-v03.png |
| Album Focus A page 1, normal years, 564×278 | review/chapter-01-batch03-2026-11-15/candidates/album-page-01-v02.png |
| Album Focus A page 2, fear/exhaustion, 564×278 | review/chapter-01-batch03-2026-11-15/candidates/album-page-02-v01.png |
| Album Focus A page 3, remains/absence, 564×278 | review/chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/album-page-03-v04.png |
| Family photograph inventory slot, 96×96 real-alpha | review/chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/photo-slot-v03.png |
| Family photograph inspector, 565×451 | review/chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/photo-inspector-v04.png |
| EXTRA optional Rest Assured default chair close-state, 314×206 | review/chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-default-v04.png |

**Pre-existing item art:** carried Prologue items (desk plant, red stapler, rubber-band ball, timing clicker, Examiner badge and other earlier inventory) already have generated/reused slot/inspector asset paths in the catalog. Their Chapter 1 use does not require duplicate inventory sprites.

## 3. Missing or integration-incomplete beyond the original storyboard art list

1. **New customized death illustration(s): MISSING.** See docs/88_DEATH_PRESENTATION_AND_CHAPTER_TRANSITIONS.md. Chapter 1 has one fatal ending node (exit_chair_fatal), reached from three distinct causes (failed stapler, failed unarmed attempt, voluntary submission). The new overlay must receive custom artwork/copy; three cause variants are the target unless owner rules otherwise.
2. **Chapter-title transition design: DEFERRED.** Owner directed that the uniform chapter-title interstitial and fade/pixelation polish wait until most gameplay is complete; functional chapter navigation and state preservation remain current priorities.
3. **House portraits: IMAGES EXIST, RUNTIME CONTRACT MISSING.** Story/import catalog still assumes a shared transparent foreground over independent backgrounds; owner approved two complete opaque views selected by speaking room. Implement narrow exception without breaking layered human NPCs.
4. **Family album: ALL THREE IMAGES EXIST, PAGINATION SUPPORT MISSING.** The storyboard has one Focus A ID and one registered art image; it must display three semantic illustrations in sync with prose and continuation.
5. **Rest Assured state art: IMAGES EXIST, BINDING UNDECIDED.** Both default and in-use close-state images exist; chair scene after restraint should use the active image. The lounge scene already shows the inviting chair; decide whether the extra default close-state needs any distinct runtime node.
6. **Interactive environmental variants: SEVEN CANDIDATES NOW GENERATED, RUNTIME INTEGRATION PENDING.** Batch 5 created an album-removed alternative and six binary-alpha overlays (adoption pedestal, four actual stored objects and RETURNS display). These are presentation enhancements, not new story items or mandatory scene IDs. See section 6. Do not claim live scene-state support is complete.
7. **Owner approval, asset paths and playable QA: PENDING.** All review candidates remain marked generated. No approved Chapter 1 production asset paths/hashes are committed to the importer. Game content regeneration and actual browser/route/scene testing are still needed.

## 4. Related story alignment

Draft PR #7 (https://github.com/InterstellarHarvest/CYOA/pull/7) records the owner-directed crop of the misframed photograph and the misleading unmarked single entrance door. The physical gallery printer and album have been restored in the selected wide gallery art, so its narration can continue to refer to them. These changes are not presumed merged into this audit branch.

## 5. Recommended next handoff (not an owner decision)

- Owner checks final review composites, selects final versions.
- Gameplay PMO integrates all candidate visuals into production asset paths, plus complete House speaker exception and three Focus A pages, and decides chair state treatment.
- Run importer, image validation, scene/portrait/focus/item playback tests, Chapter 1 routes, chapter 1→2 state carryover and browser regression.
- Separately commission and approve the custom death screens. Defer chapter-transition visual polish until late production as the owner directed. Do not reopen the 14 environment scenes without an actual visual or continuity defect.

**Bottom line: Original Chapter 1 scene/portrait/album/photo requests are illustrated as review candidates, but Chapter 1 art production is not finished as a playable release, and the new death visual treatment is still missing; chapter-title animation is deliberately deferred.**

## 6. Update — Batch 5 interactive scene-state artwork (2026-11-15)

**Art branch:** `agent/ch01-art-batch05-interactive-states` at `cf575552fc729b952d99d25bea56dbc81b40619d` (includes superseded first-pass Batch 5 candidates).
**Review directory:** `review/chapter-01-batch05-2026-11-15/`.

Seven new state-specific candidates now exist in the art branch (all `314×206` in the parent scene coordinate system):

| Candidate | File under Batch 5 review directory | Presentation selector |
|---|---|---|
| A — album absent | `assets/A-album-removed.png` (opaque RGB) | While `album_closeup` Focus A is visibly open; restore gallery-v05 when closed |
| B — adopted named plant (foreground v02) | `pedestal-foreground-v02/B-plant-adoption-v02.png` (transparent RGBA) | Only in `plant_adoption` with actual held desk plant before authored handover; 25% larger, emerging through rug-covered foreground hatch |
| C — stored desk plant | `assets/C-stored-plant.png` (transparent RGBA) | Drawer scene and `house_stored_item == desk_plant`, not yet recovered |
| D — stored stapler | `assets/D-stored-stapler.png` (transparent RGBA) | Drawer scene and `house_stored_item == red_stapler`, not yet recovered |
| E — stored band ball | `assets/E-stored-band-ball.png` (transparent RGBA) | Drawer scene and `house_stored_item == rubber_band_ball`, not yet recovered |
| F — stored clicker | `assets/F-stored-clicker.png` (transparent RGBA) | Drawer scene and `house_stored_item == timing_clicker`, not yet recovered |
| G — RETURNS sign | `assets/G-returns-display.png` (transparent RGBA) | Equipment corridor, registered ending only; not all mechanical exits |

**Review finding — foreground v02 inspected:** Story Director visually recommends accepting **all seven** Batch 5 candidates, including the revised B (25% larger, closer to the viewer, emerging through a hatch in the red rug), subject to owner production sign-off. The earlier B remains archived at `assets/B-plant-adoption.png` and is **superseded**; only `pedestal-foreground-v02/B-plant-adoption-v02.png` is the selected B for eventual integration. The exact new artifact's report is `pedestal-foreground-v02/README.md` and `pedestal-foreground-v02/qa.json` (RGBA 314×206, 40×80 station, alpha 0/255, zero outside-mask changes, exact 4×). No gameplay art bindings were changed.

**Reported QA:** All seven masks show no changes outside allowed pixel areas; every overlay has alpha either 0 or 255 and zero hidden RGB; all 359 prior tracked PNGs are preserved byte-identically. Exact source hashes, imagegen prompts and independent verification are in `qa.json`, `HANDOFF.md` and `verify_review.py`. This is artifact/gallery QA only, **not playable-game or runtime QA**.

**Integration:** A substitutes the main-scene image only while album Focus A is shown. B–G are mutually selected overlays with base scene maintained. The current stage only supports a single base-scene key, so Gameplay PMO must add a small scene-state selection/overlay facility, preserving base 314×206 origin and exact nearest-neighbor presentation. Re-evaluate after effects, node changes, Focus A entry/exit, historical view navigation, save/load, and returns from inventory inspection. The album's three Focus images still need explicit semantic page binding; generic text wrapping must not drive image selection. Never repeat an inventory `give`/`take` merely because an overlay appears.

**Scope:** seven art assets only, not a new chapter or extra inventory; original 21 required still images plus optional chair state remain. There are now **29 selected review candidates total including these seven additions** (21 originals + 1 extra chair view + 7 interactive variants). All remain isolated; no content, importer, engine, production or deployment has changed.
