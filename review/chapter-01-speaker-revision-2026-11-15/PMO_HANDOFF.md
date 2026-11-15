# Gameplay PMO — House speaker portrait exception

**Owner direction: accepted as the production brief, not visual approval of these candidates.** Registry/runtime proposal only; nothing below has been applied to story JSON, importer output, engine code or production artwork.

## Artwork contract

The House is a fixed architectural installation. Its conversation artwork is now **one complete opaque 564×278 image per speaking location**, including the actual intercom, its flush mounting and surrounding room. No separate House foreground/background pair is commissioned. The foyer view in this package is generated, pending visual approval. The portrait-gallery view remains not-started; do not show a foyer wall behind dialogue taking place in the gallery.

The fixed ivory bezel has a recessed grille faceplate that can tilt slightly within its frame. There is no post, stalk, stand or visible support underneath. This supports the authored turning/tilting descriptions without changing prose. This pass supplies a static idle image; later light/pivot variation, if approved, must use alternate complete views, without moving the wall independently.

Reception and all other layered NPC portrait contracts remain unchanged. The House's optimistic domestic palette/design also remains distinct from reception.

## Reviewable registry proposal

`artwork-registry.proposed.jsonpatch` is an **unapplied RFC6902 proposal** against the registry at commit `3a763b52c1d60027549542d47381f4fbba412117`. It describes authoring intent, not an engine-supported migration:

- Replace `portraits["house:idle"]` with a House-specific `presentation: "complete-opaque"` record and scene-specific complete views. The foyer is generated, with a review `candidatePath`; the gallery is not-started. Every production `assetPath` remains null.
- Retire the House-only `scenes["house_of_tomorrow/foyer"].portraitBackground` and `scenes["house_of_tomorrow/portrait_gallery"].portraitBackground` requirements. Existing historical PNGs remain archived; removing a catalog requirement does not delete the old files.
- Remove the House's obsolete `foregroundFormat: "transparent-rgba-png"` and `portraitBackgroundScene` fallback by replacing that record. Add a House-only exception to the registry's generic layering prose during adoption; do not weaken other NPC requirements.
- `presentation`, `viewSelection`, `sceneViews`, `imageFormat` and the `portrait-complete` review kind below are **proposed metadata**, not claims that the current converter recognizes them. PMO should settle the smallest supported schema/adapter change before adoption. Do not apply this patch alone to the playable branch.

The earlier 20-record Chapter1 plan would become **19 records**: 14 main scenes, 2 complete House views, 1 multipage album record and 2 photo-item records. The shared transparent speaker record is no longer a separate image requirement. With foyer/dining/bathroom and foyer conversation authored as review candidates, 15 records remain deferred. This pass generates only the three replacements requested here.

## Current runtime findings

Inspected actual source on this isolated branch:

| Component | Current behavior | Consequence for PMO |
|---|---|---|
| `tools/story-import/convert.js:257`–`292` | Builds `backgrounds` and `poses`; reads each `house:<pose>` as foreground art, chooses a scene background or `portraitBackgroundScene` fallback. | New presentation metadata is not handled. Removing backgrounds or changing `foregroundFormat` alone does not implement this exception. |
| `game/js/rules.js:1467`–`1474` | Requires `backgrounds`, `poses`, registered default background and registered default pose; only those keys are allowed in the runtime portrait record. | A new authoring record cannot simply be copied into generated runtime assets. Schema/adapter validation must agree on a supported complete-view representation. |
| `game/js/stage.js:203`–`216` | Chapter preloading collects both default background and default pose, plus explicit overrides. | Ensure one complete image is requested for the House; no missing foreground key, duplicate request or DEV placeholder layer. |
| `game/js/story-flow.js:148`–`155` | `applyArt` unconditionally sends both background and pose keys for dialogue. | PMO needs a deliberate House-specific adapter path, with location selection, rather than disguising the image as an animated foreground. |
| `game/js/stage.js:365`–`381` | `setPortraitArt`/`swapLayer` can remove a layer when its key is absent, and can display a single image. | The low-level renderer already has useful primitives. This is primarily a registry/import/selection compatibility issue; it does not justify a broad engine redesign. |
| `tools/story-import/import.js:128`–`146` | Checks existence, PNG dimensions and hashes for registered art; this path does not validate visible alpha semantics. | Passing size checks would not prove correct complete-image handling. PMO should verify opaque RGB and correct layer selection explicitly. |

An opaque image could physically cover a background if inserted in the old pose slot, but that would preserve the wrong contract, carry foreground tuning/animation semantics and leave redundant backdrop requirements. **No such workaround is implemented here.** PMO owns the eventual narrow compatibility solution.

## Adoption checks for a later approved integration

1. Select the correct complete view from the dialogue's actual scene; `welcome_home` is foyer, `portrait_before_album` is portrait gallery. Keep story text, routes, choices, dice and item logic unchanged.
2. Load/display the complete view exactly once at 564×278, 1:1, with no foreground offset, parallax, alpha expectation or independent sprite motion applied to the wall.
3. Clear stale layers when moving between House, other NPC portraits, album Focus A and narrative mode. Keep reception's normal independent layers working.
4. Keep an explicit missing-art state for the deferred gallery view. Do not silently reuse foyer architecture or invent a new gallery candidate.
5. Test actual imported dialogue views, mode transitions, asset preloading and production validation after schema agreement and owner artwork approval. This review package does not claim those engine tests have run.
