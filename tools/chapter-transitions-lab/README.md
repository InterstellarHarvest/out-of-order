# Out of Order — Chapter Transition Lab (review 01)

This is an **isolated, visual-only study** of three chapter-transition concepts:

- **A — Administrative File:** a dossier arrives and receives a mechanical stamp.
- **B — Mechanical Shutters:** institutional shutters cover the scene, a title plate lights up, and the mechanism retracts.
- **C — Hybrid:** shutters close around a processing window, a file is stamped, and the next scene is released.

The page offers four chapter boundaries, playback/replay, phase durations, speed, reduced motion, a title-frame hold, skip, and final-frame inspection. Default mechanical timing is 0.4 s cover + 0.4 s action + 1.3 s title hold + 0.4 s reveal = **2.5 seconds**.

## Isolation and canonical content

- No production game files, story routes, saves, UI sprites, or main-menu originals are edited.
- The dist/menu directory contains byte-for-byte copies of approved **v06 visual artwork** from the original main-menu review Site, source commit 7952711b30792c41724505d002b45b95d1e4fc94. Its HTML is a *review copy*: only the review toolbar layout and a small postMessage hook for the existing NEW GAME confirmation are changed. This has no connection to actual game saves.
- The other chapter scenes are **schematic, CSS-drawn stand-ins**, labeled as such. They are not canonical gameplay visuals or content.
- Chapter metadata comes from the 2026-11-20 game main and public Chapter 3 storyboard. Prologue title “The Last Good Day” is explicitly marked as a **working title**. Chapter 3 currently exists in the storyboard but is not consumed by the game's main canon lock.
- “CASE OPENED” for New Game and “TRANSFER RECORDED” for ordinary chapters are **provisional UI copy**. They do not assert any narrative outcome.
- The source is self-contained static HTML/CSS/JS; no remote dependencies.

## Approved asset provenance

| Asset | Original source | Dimensions | SHA-256 |
|---|---|---|---|
| dist/menu/entrance-plaza-locked.png | main-menu review dist/entrance-plaza-locked.png | 1672×941 | 22083a038ed87ab9eb0155fba6648cec67699936402dc8b4b399b8aa5b48623d |
| dist/menu/sprites/v06/*.png | main-menu review dist/sprites/v06/*.png | varies, manifest-defined | unchanged from source |

For the original 19 sprite dimensions and SHA-256 records, see the immutable intake manifest on review/out-of-order-menu-intake at art/ui/main_menu/manifest.json. The Site copy is not the approval source of truth.

## Engine investigation (game repository)

Observed in InterstellarHarvest/out-of-order main at 9a0ca4a502216ce11b956bac15d0e61750e86904:

1. The imported story runs through game/js/story-flow.js, which serializes state after Rules.step. A chapter/scene/mode event enters transition(first); next-chapter art is preloaded, the outgoing view fades, applyView(view()) runs, then it fades in. This is an appropriate presentation hook **after** the last authored result has been read.
2. Fresh-game F.start filters opening chapter, scene, and mode events and presents the first chapter directly. The future menu-to-Prologue transition must be launched by the approved menu integration layer, not by modifying the current fresh-start branch prematurely.
3. The save cursor and state are written together; a committed choice may already have updated state before its visual events have run. Integration must not commit the step a second time, and save restoration should enter directly at the saved state rather than replay a full introduction.
4. RETRY/CHECKPOINT already have a separate F.restore path using fade and Rules.resume, while fatal results enter the existing ending presentation. Do not route fatal ends through the standard chapter transition.
5. Chapter 3 is explicitly under notConsumed in story/canon.lock.json. Do not wire the lab's Chapter 3 presentation into the game before that chapter is imported and approved for integration.
6. game/js/main.js fits a 1920×1080 stage and exposes G.preloadChapter. Future transition layers should share this stage scaling, not replace gameplay UI or bake dynamic titles into raster art.

## Proposed narrow integration after concept approval

1. Confirm the menu's New Game callback is ready to transfer control to gameplay. Preserve existing-save confirmation; begin transition only after selection is finalized.
2. Add a reusable presentation controller driven by chapter metadata and an idempotent completion callback. Keep it outside Rules.step and story JSON.
3. For a normal chapter boundary, start only once the last narrative result and required CONTINUE have completed; preload the receiving chapter before the reveal.
4. Preserve inventory, flags, dice, NOTES, cursor and save semantics. Avoid writing a second game-state step from animation completion.
5. For loading a save, use direct restore; for death, RETRY remains short, CHECKPOINT may later receive a reduced introduction only with approval, EXIT eventually uses the main menu.
6. Add QA for every boundary, multiple routes, rapid activation, skip, reduced motion, keyboard and pointer, viewport scaling and save/load compatibility.

## Review state

**Prototype / owner decision pending.** None of the three is approved for integration. No gameplay merge is authorized by this project. Compare A/B/C at 2.5 seconds, then try shorter repeated-play timings before choosing.

My current recommendation is **C, the Hybrid**: shutters offer a clear handover from one scene to another, while the file/stamp supplies the game's distinctive bureaucratic identity. A is calmer and visually restrained; B is quickest to understand and simplest to implement.

## Owner review build

Private Site: https://out-of-order-transitions-nate.cosmic-jelly-5330.chatgpt.site
Site source commit: 5e49f4aca44957988c446d2d7f56861aec031860

This game-repository review branch mirrors only the lab's authored HTML/CSS/JS for evaluation and future integration; the approved v06 menu PNGs remain intact on review/out-of-order-menu-intake, and the deployable preview source (including intact copies of those PNGs) is in the private Site repository. This branch intentionally is not a standalone production game build.
