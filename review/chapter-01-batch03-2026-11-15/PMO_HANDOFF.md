# Gameplay PMO handoff — proposals only

No runtime or story changes are implemented in this package. No candidate is approved or promoted. The private review manifest must not be consumed as a new runtime schema.

## Album order and existing limitation

The authored `album_closeup` node uses the single focus ID `house_of_tomorrow/portrait_gallery/album`. The catalog contains one record with one `assetPath`. The three proposed visual pages for that same focus inspection are:

| Order | Review asset | Narrative segment | Mounted prints |
|---|---|---|---|
| 1 | C — `candidates/album-page-01-v02.png` | Ordinary smiles, Martin grows, adults age. | Four, upper-left → upper-right → lower-left → lower-right. |
| 2 | D — `candidates/album-page-02-v01.png` | Older family, increasing fear, exhausted final portrait. | Three, upper-left → upper-right → lower-center. |
| 3 | E — `candidates/album-page-03-v01.png` | Seated skeletons → fewer remains → four empty chairs; House keeps celebrating. | Four, upper-left → upper-right → lower-left → lower-right. |

Verified source behavior at the baseline:

- `tools/story-import/convert.js:327–331` imports a single focus art record per authored focus ID.
- `game/js/story-flow.js:148–155` applies one `G.artKey.focus(v.focus)` when the view is set.
- `game/js/stage.js:157` defines the focus art class as564×278 at1×; its registry and `setPortraitArt` at366–376 select/swap one focus image.
- Focus **text** already paginates: `story-flow.js:279–281` appends to `G.surfaces.appendA`; `afterFocusPage` at296–298 tests `hasMoreA`; `takeContinue` at308–315 calls `nextPageA`. This source calls the focus text surface A. The old catalog note's “Narrative B pagination” should not be used as an implementation assumption.
- The current text pager does not select C/D/E images. Text wrapping and continuation count do not guarantee exactly three semantic pages.

Minimal proposed PMO work after creative approval: retain the existing authored focus ID, route, return action and inspected flag; provide one reviewed ordered group of three approved images in the catalog/import path; preload them through normal asset handling; select the appropriate image alongside the ordinary/fear/remains semantic text segments. Reset to the first image on entering inspection and keep later wrapped text pages on the correct semantic image. A/B text surface naming, continue/back behavior, repeat inspection and font/layout variations must be checked before integration. The closing immaculate-room paragraph belongs with page3. Do not assume that simply counting existing continue clicks will align pictures and prose.

This is a behavior proposal, not an invented JSON field or new supported schema. No new story nodes, flags, choices, rule steps or save-state semantics are prescribed. PMO should decide the smallest compatible catalog/renderer representation and return it for review.

## Complete House conversation exception

B is a **single opaque RGB564×278** gallery conversation image. It is independently authored at portrait detail and cropped to the approved v05 close-camera scale. The intercom is the same flush ivory model, with woven grille, discreet sensor, tiny green indicator and recessed thumbwheel. No separate transparent foreground exists or is needed for this House installation.

The current `house:idle` record still says transparent RGBA foreground over a scene-specific opaque background; the gallery scene's `portraitBackground` repeats that old layering. Do not stack B beneath that legacy House foreground, reuse the foyer wall for gallery dialogue or globally change other NPC conventions. PMO must reconcile the existing House complete-image exception with these stale registry and layer expectations, select the gallery-specific complete image when the House speaks here, and preserve the approved foyerv05 complete portrait and other layered NPCs. No engine architecture changes are made by this artwork pass. Animation is not requested.

## Other unapplied catalog changes

A would eventually replace the gallery placeholder only after owner approval. F/G would eventually fill `family_portrait_photo.slot` and `.inspect`, retaining exact96×96 true-alpha and565×451 opaque contracts and the latest quarter-fourth-chair/feet composition. The single album record needs the approved presentation support above. All seven review records stay `generated`, `ownerApproved:false`, `assetPath:null`; no paths or status values in `story/artwork.draft.json` were edited because story/catalog changes are outside this assignment.

The visible printer/album omission remains a Story Director staging decision in `STORY_ART_REPORT.md`. Do not resolve it by silently changing prose or inventing an unseen notice/fixture during integration.
