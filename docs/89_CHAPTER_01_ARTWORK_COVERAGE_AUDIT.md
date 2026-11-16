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
2. **Chapter-title transition design: NOT PRODUCED.** Reusable fade/pixelate/title beat remains undecided and unimplemented as the owner requested it.
3. **House portraits: IMAGES EXIST, RUNTIME CONTRACT MISSING.** Story/import catalog still assumes a shared transparent foreground over independent backgrounds; owner approved two complete opaque views selected by speaking room. Implement narrow exception without breaking layered human NPCs.
4. **Family album: ALL THREE IMAGES EXIST, PAGINATION SUPPORT MISSING.** The storyboard has one Focus A ID and one registered art image; it must display three semantic illustrations in sync with prose and continuation.
5. **Rest Assured state art: IMAGES EXIST, BINDING UNDECIDED.** Both default and in-use close-state images exist; chair scene after restraint should use the active image. The lounge scene already shows the inviting chair; decide whether the extra default close-state needs any distinct runtime node.
6. **Optional dynamic environmental overlays: NOT GENERATED, NOT REQUIRED IN THE BASE STORYBOARD.** Housekeeping drawer baseline is empty and item-neutral; separate overlays for the actual stored item (plant/stapler/clicker/rubber-band ball) are proposed only. Sorting-machine RETURNS display in equipment-registered outcome is another proposed variant. Do not claim these are complete or mechanically required.
7. **Owner approval, asset paths and playable QA: PENDING.** All review candidates remain marked generated. No approved Chapter 1 production asset paths/hashes are committed to the importer. Game content regeneration and actual browser/route/scene testing are still needed.

## 4. Related story alignment

Draft PR #7 (https://github.com/InterstellarHarvest/CYOA/pull/7) records the owner-directed crop of the misframed photograph and the misleading unmarked single entrance door. The physical gallery printer and album have been restored in the selected wide gallery art, so its narration can continue to refer to them. These changes are not presumed merged into this audit branch.

## 5. Recommended next handoff (not an owner decision)

- Owner checks final review composites, selects final versions.
- Gameplay PMO integrates all candidate visuals into production asset paths, plus complete House speaker exception and three Focus A pages, and decides chair state treatment.
- Run importer, image validation, scene/portrait/focus/item playback tests, Chapter 1 routes, chapter 1→2 state carryover and browser regression.
- Separately commission and approve the new death screen and chapter transition presentation. Do not reopen the 14 environment scenes without an actual visual or continuity defect.

**Bottom line: Original Chapter 1 scene/portrait/album/photo requests are illustrated as review candidates, but Chapter 1 art production is not finished as a playable release, and the newly requested death and transition visuals are still missing.**
