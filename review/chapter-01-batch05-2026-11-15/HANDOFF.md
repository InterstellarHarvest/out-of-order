# Gameplay PMO handoff — proposed, not integrated

All seven candidates are **generated**, pending owner visual approval. The only canonical outputs are the seven PNGs in `assets/`. Composites in `previews/` demonstrate selection; they are not additional runtime assets. No story, engine, registry or production files have been changed.

## Selection contract

| Asset | Select when | Restore / clear when |
|---|---|---|
| A album removed | Presented view is `album_closeup`, mode `focus`, focus `house_of_tomorrow/portrait_gallery/album` | Closing Focus A or showing a different view restores original gallery v05. All three album illustration pages retain A. |
| B adoption | Chapter 1 `plant_adoption`, actual `G.state.inventory` contains `desk_plant`, and `plant_registered_as_resident` is false | Clear after the existing handover takes the plant, on public exit, and outside this interaction. Never derive ownership from `house_stored_item` or `plant_named` alone. |
| C stored plant | Storage scene; `G.state.flags.house_stored_item === 'desk_plant'` and `house_storage_recovered` false | Clear after recovery or scene change. |
| D stored stapler | Same, exact stored value `red_stapler` | Same. |
| E stored ball | Same, exact stored value `rubber_band_ball` | Same. |
| F stored clicker | Same, exact stored value `timing_clicker` | Same. |
| G RETURNS | Utility-exit scene and registered ending (`exit_service_registered`, `equipment_registered` true) | Clean ending `exit_service_clean` retains neutral original. Clear outside this scene. |

Do not drive A from `family_album_inspected`: that flag persists after closing. The album is examined, never acquired. The inventory effects in the authored story remain the sole authority. Storage retrieval already gives the selected item, sets `house_storage_recovered` true and clears `house_stored_item`. Plant adoption takes the actually held `desk_plant` and sets `plant_registered_as_resident`; no art selector may repeat these effects. The mechanical route flag alone cannot select G because both mechanical endings share it. Preserve the existing Chapter 2 flag carry. The wristband stays narrated.

## Minimum runtime work, for a later approved integration

Current `game/js/story-flow.js` `applyArt(v)` supplies one scene key to `G.setSceneArt` and an independent Focus key. `game/js/stage.js` `setSceneArt` swaps one `sceneArt` image and returns early for an unchanged key. It does not currently expose a scene-state overlay setter. Actual rules store inventory in `G.state.inventory` and flags in `G.state.flags` (`game/js/rules.js`).

After approval, register/preload the selected seven paths through the existing asset lookup and add a small presentation selector evaluated from the presented view and current state after effects. A chooses an alternate base scene key. B–G choose at most one full-canvas overlay in these scenes. Add one scene-overlay image layer and setter in the stage; changing or clearing an overlay must run even when the base scene key did not change. Re-evaluate on scene/node changes, Focus open/close/page changes, back/history restoration and save/load. Use the view actually displayed during history navigation; do not accidentally show an adoption overlay over a different historical room.

Draw order: original RGB base (or A) → selected binary-alpha overlay → existing UI/scene effects, if any. All images share origin (0,0), logical 314×206. Display at exact integer scale, ordinarily 4× with nearest-neighbor. No offsets/cropping/stretching. Storage objects end before y=89; the original drawer lip is already unobscured, so no new foreground-layer architecture is needed. Exact allowed and actual footprints are in `qa.json` and `masks/`; bounding boxes use Pillow's half-open x0,y0,x1,y1 convention.

The three approved album page images are referenced in `reference-hashes.json` and shown with the same A base in the gallery. Current Focus rendering uses a single focus-art key; PMO must associate the approved three illustrations with semantic album pages if not already supported. Do not infer a page from generic text pagination, which can change with layout. This package introduces no unsupported schema fields and implements none of these engine changes.

## Later integration acceptance checks

Open all three album pages, close and reopen: original album returns and remains absent during every page. Exercise adoption with held, stored, never acquired and surrendered plants: only the authored successful interaction may show B. Exercise each stored item and retrieve it: one overlay before, empty after, no duplicate inventory changes. Compare both service endings: RETURNS only in the registered ending. Repeat relevant transitions after back and save/load. These are PMO checks for future implementation, not claims of runtime functionality in this art-only branch.
