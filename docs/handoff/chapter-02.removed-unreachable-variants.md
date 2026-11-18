# Chapter 2 — removed unreachable text variants (2026-11-15)

**PMO ruling (2026-11-15): APPROVED.** Owner-approved content-reachability correction. No route, choice or flag was added.

The three-chapter importer reported two authored text variants that no player can see:

- `chapter-02:tower_arrival` variant 0
- `chapter-02:tower_archive` variant 0

Both were conditioned on `{ "flag": "office_spore_inundation" }`. That flag is set only in `spore_garden` (choice `vent_spores_into_offices`). The only route into `tower_arrival` (and from there to `tower_archive`) is `park_junction`, which comes **before** the Spore Garden; no node reachable after venting leads back to it. This matches ledger Q48: when no route returns to the tower, the plume seen from the garden is the payoff.

The contaminated tower is still reachable, and still shown, through `tower_late_entry` (translator-sabotage window), which keeps its own `office_spore_inundation` variant. The visible plume in `garden_vented` is unchanged. Each of the two nodes kept its existing unconditional text, so the change is invisible to players.

## Removed prose (verbatim, for possible future use)

`tower_arrival`, `if: { flag: office_spore_inundation }`:

> The Environmental Control Tower is coughing pale spores through every grille. Green tendrils burst from the vents, knotting keyboards and drawing cupboards shut. It is the same plume you deliberately sent here from the garden.

`tower_archive`, `if: { flag: office_spore_inundation }`:

> You pry a filing drawer out of the root-laced console. Early expansion requests carry human signatures. Later requests were approved by delegated Environmental Management machinery. Every request originated with Botanical Specimen 001. The growing office is apparently another completed application.

To restore them, the Story Director first needs to author a route that reaches `tower_arrival` after `vent_spores_into_offices`. Otherwise the importer will reject them again.

## Re-validation after removal

`node tools/story-import/import.js --check`: VALID (preview). 3 chapters, 164 nodes, 247 choices, 165,527 reachable states, 11 endings reached, 31 dice checks. 0 errors. The only warnings are the two pre-existing allowed unreachable fallbacks: `chapter-02:end_maintenance` variant 6 and `termination_notice[2]`.
