# The Acceptable Error — Chapter 1 Story Director handoff

**Deliverable:** `chapter-01.draft.json` — House of Tomorrow, a narrative/playable **DRAFT**. Do not treat prose, dice odds, item consumption or art as creatively approved canon. Original Prologue remains untouched.

## What to integrate

1. In the private PR #2 worktree, replace only `story/chapters/chapter-01.draft.json` with this file. Keep the prologue's existing 29 nodes and `reception_hallway` → `chapter-01` transition intact.
2. Merge `chapter-01.items-additions.json` into `story/items.draft.json` (new item `family_portrait_photo`). **Do not replace the shared items file.**
3. Merge the `scenes`, `portraits`, `focus` and `items` entries from `chapter-01.catalog-additions.reference.json` into `story/artwork.draft.json`. Replace/remove the obsolete `house_of_tomorrow/opening` placeholder record. All Chapter 1 art remains `not-started` and `assetPath: null`; preview placeholders are acceptable, approval is not.
4. Add `cast.house.name = "HOUSE OF TOMORROW"` to `story/runtime-settings.json` (private runtime setting). Portrait id is `house:idle` with paired foyer and portrait-gallery backgrounds; preserve transparent foreground layer separation.
5. Run `node tools/story-import/import.js --check`, then the importer to regenerate `game/content/story.generated.js`; run the existing route, content, game browser, storyboard, art, prologue regression and autosave QA. Do not merge or promote until the actual importer and engine confirm compatibility.
6. Synchronize the separate Chapter 1 JSON and corresponding *public-safe* item/art references into the public storyboard branch after private integration. Keep manifest status `draft`; no story art has been generated or approved.

## Chapter structure

- Initial entry: facilities pictogram leads into wrong exhibit; badge enrolls visitor as demonstration participant, **not family member**.
- Housekeeping: polite offer or refusal; the house eventually stores **one actually held item**, with a reachable retrieval cabinet. Stored objects are removed from inventory and only restored on retrieval.
- Comfort choices: refreshments / Rest Assured chair / refuse both. Chair has subtle loose upholstery stuffing warning; hidden d6 stapler/unarmed escape, otherwise terminal Rest Assured death. On survival, chair crashes into a maintenance wall, reveals monitoring records and emergency exit; emergency release always opens, hidden d6 may additionally classify the player as equipment.
- Refusal: family dinner or foyer. At foyer, the **only immediate successful exit** is giving the house an *actually held* desk plant with a name. Lacking/withholding the plant routes to absent-family dinner; after dinner it routes to portrait, never loops.
- Dinner: answer for empty Martin chair → immediate bedtime → Martin bedroom → clue behind wardrobe → service corridor early exit. Or inspect empty place settings for family trace; or leave for foyer.
- Portrait: crooked camera photographs three empty chairs, with only lower legs/feet of unseen protagonist. Give `family_portrait_photo`. Optional separate Focus A album shows family aging, frightened/helpless, skeletons, empty. Confrontation yields house's cheerful noncomprehension; no threat-response diagnostic.
- Fake bathroom: magnificent recorded flush despite no plumbing. House deems demonstration completed; showroom reset suspends occupancy rule and opens public exit. No sanitation machine.
- Chapter terminal states: `exit_named_plant`, `exit_martin`, `exit_service_clean`, `exit_service_registered`, `exit_showroom_reset`; plus fatal chair ending. The end nodes currently contain a `BEGIN AGAIN` restart card because **Chapter 2 JSON does not yet exist**; when Chapter 2 is authored, replace those terminal cards with appropriate Chapter 2 transition destinations, preserving state and distinct entry locations. Do not conflate House endings with a new-game restart.

## Callback audit and gaps (mandatory for PMO review)

- Carried Prologue status: `termination_status` has an opening text variation, items and marks persist; `desk_plant`, `red_stapler`, and other actual held inventory are checked. `property_record`, `appointment_disputed`, `wc_key`, `property_claim_ticket`, `examiner_duties_known`, `key_discrepancy_raised`, `retained_item`, and `reception_origin` must be audited for deliberate Chapter 2 callback, same-chapter payoff, or retirement—not mechanically echoed for no reason.
- New states with payoffs: `housekeeping_refused` affects confiscation, `house_stored_item` plus inventory controls retrieval, `dinner_seen` prevents dinner loops, `family_album_inspected` unlocks confrontation, `plant_registered_as_resident` records gift/removal, and `equipment_registered` records the service-door mishap.
- Forward obligations: `house_exit_route` controls the **different Chapter 2 start locations**; `family_portrait_photo` is an item that should be recognized by later Exposition systems; `equipment_registered` should produce consequential equipment-routing behavior; `plant_registered_as_resident` may receive future correspondence. `fake_bathroom_discovered`, `chair_survived`, `family_trace_seen`, `family_records_seen`, `martin_escape_clue_found`, and `martin_hidden_route_discovered` require either scheduled downstream payoff or explicit retirement after their immediate use.
- **Undecided creative item rule:** the successful stapler chair breakout currently leaves stapler held and marks survival; decide whether to consume it only with owner approval. The 3/6 stapler and 1/6 unarmed chair odds, and 4/6 clean service-release roll, are temporary balance choices.
- Prologue handoff uses an Examiner badge; House portrait requires separate foreground and tighter background; the album family photographs are the ONLY family images and must remain separate from vacant main scene.
- Some connective dialogue and room placement are the Story Director's **draft provisional material** where earlier discussions locked only the higher-level direction; review these during the creative gate.

## Local verification (not engine QA)

- Authored 36 nodes and 57 choices; 14 scene ids, 1 focus id; 6 terminal outcomes including one death.
- `chapter-01.route-audit.py` simulates the authored conditions/effects and both d6 results against six starting-inventory scenarios; all 36 nodes were reachable, with no missing destinations or simulated dead ends.
- Local tests do **not** run the repository importer, full validator, browser, or image loading; those remain Gameplay PMO tasks.