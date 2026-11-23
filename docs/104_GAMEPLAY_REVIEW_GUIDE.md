# Chapter 3 gameplay review guide (draft PR #22)

For Nate's gameplay review of the Chapter 3 draft. Nothing here publishes, merges or changes production.

## Fast way in: the local review kit

The kit lives outside the repository, at `Experiments & Projects/_review/out-of-order-ch03-review-kit/`. It plays this branch's checkout.

1. Run `sh "/Users/MrDashiki/Experiments & Projects/_review/out-of-order-ch03-review-kit/serve.sh"`.
2. Open http://127.0.0.1:8765/ in Chrome or Firefox.
3. Each button opens the game at one review moment. There are 62 moments, grouped by the checklist below.

Every save comes from a **real** playthrough: real Prologue → House → Chapter 2 → Chapter 3 routes with real dice (`game/qa/ch03_routes.js`), and no invented inventory. The old-save moments are real saves written by game `main` `9a0ca4a` before Chapter 3.

- A button replaces the game's autosave; "New game" starts fresh (`?new`).
- `serve.sh` rebuilds the saves from the checkout each time, so they always match the build you are reviewing.
- Verified 2026-11-22: all 62 moments open on exactly the intended node and inventory, with no console errors.

Playing from the start also works: open `game/index.html` through the same server and pick "New game".

## The checklist

Each item names its kit group (the same number) and what to look for.

1. **Chapter 2 → 3 hand-off.** Use the five "Chapter 2 ending … → Chapter 3" moments.
   - Each Chapter 2 living ending shows exactly **one CONTINUE**.
   - Taking it opens the Pavilion arrival that matches the route:
     - public concourse (`end_public`, `end_customs`);
     - the wrecked Courtesy Conductor (`end_concourse_robot`);
     - the maintenance staircase (`end_maintenance`);
     - the forgotten-station passage (`end_underground_station`).
   - NOTES and inventory carry over.
   - The "fatal ending (hopper)" moment still shows its death popup and BEGIN AGAIN only.
2. **Inventory: six visible slots, never a six-item limit.** Use "Nine items". The game shows six slots.
   - Take CONTINUE.
   - The arrows scroll to items 7–9.
   - Open the 9th (customs antidote) in the inspector.
3. **Facilities Key.** At the attendant's refusal, open the key: SHOW is offered, and the key is still held afterwards.
4. **Family photo.** With the photo held at presenter verification, SHOW is offered, and the photo is returned at the end. Without the photo there is no slot and no SHOW.
5. **Red stapler.** At the record choices, USE is offered only when the stapler is held, and it is used up once. If the stapler was spent in Chapter 2, there is no slot and no USE, and the three choices remain.
6. **Hidden checks.** Only the risk marker shows, never the numbers. The saved seed fixes each roll:
   - stage leap with the House clicker: a raw 3 passes thanks to the +1;
   - the same 3 without the clicker: fails into a safe, surviving fall;
   - restroom dash: one passing seed and one failing seed.
7. **Incidental voices.**
   - "Door wait": take the door response. **VISITOR:** and **RESTROOM SYSTEM:** labels appear in the dialogue box; the attendant's lines have none.
   - Scroll the panel (wheel or arrow keys): a label never sits alone on the bottom line. NOTES uses the same labels.
   - The labels are **provisional: confirm ATTENDANT / PRESENTER / VISITOR / RESTROOM SYSTEM.**
8. **The `%` readouts.** "AUDIENCE PARTICIPATION: 0%" (take "say you need it too") and "AUTHENTIC HUMAN RESPONSE: 100%" both draw a real `%`.
9. **Art.** There is one moment per scene (14) and per conversation pairing (15), each at its first appearance on a real route.
   - Scenes are drawn at 4×; conversation backgrounds and poses are 1:1.
   - **Paper Emergency is v04** (first appears on the paper route).
   - Judge readability at game scale, and whether each pose fits its line.
10. **Endings.** There is one moment one choice before each of the seven endings:
    - `backstage_exit`, `locomotion_fail`, `presenter_help_end`, `paper_problem_end`, `attendant_honest_end`, `door_dash_fail`, `door_reverse_end`.

    Every ending survives, with BEGIN AGAIN only and no death popup. A long ending passage pages with a CONTINUE first.
11. **Saves.**
    - The five old saves load.
    - The two old Chapter 2 ending saves now offer CONTINUE into Chapter 3.
    - Reload in the middle of a Chapter 3 conversation: the scene, the pose and the labelled history come back.
12. **Your decisions.**
    - Confirm or change the four display names (item 7).
    - Chapter 3 keeps BEGIN AGAIN for now. The Chapter 4 narrative expects a `ch3_exit_route` flag that the locked Chapter 3 never sets. Connecting Chapter 3 to 4 is a later milestone and needs a Chapter 3 narrative amendment.

## After the review

Merging is a separate authorization, and so is the integration-status reconciliation (docs/104 sections 8–9). Reconciliation needs the storyboard Pages-staging repair (`docs/104_storyboard_reconciliation_pages_repair.patch`) applied first.
