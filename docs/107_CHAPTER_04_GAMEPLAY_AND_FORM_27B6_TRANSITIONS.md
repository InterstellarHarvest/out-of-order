# 107 — Chapter 4 gameplay integration and the Form 27B-6 chapter transitions (game issue #27)

**Date:** 2026-11-26.
**Authorization:** Nate, game issue #27: implement Chapter 4 and the owner-selected Form 27B-6 / REGISTER OF PROGRESS transitions on a review branch. **Not authorized:** merge or deploy. This is the review package.

**Branches:**
- Game `agent/ch04-gameplay-form27b6-integration`, from `main` `c7a2d3dc7e19b8d574deedec0e5b4b7098daa9a1`.
- Storyboard `integration/ch04-gameplay-20261126`, from `main` `7618d8110e3963f9d037f4e0030b11c79f86eff5`. This follows the Chapter 3 precedent (public draft PR #19).
- The game pins storyboard `0aa53dd148955ac98a1be5c9ed9c84fb0fa332dc` (story content as of `8bb4993`; `0aa53dd` adds only docs/154). Merge order when authorized: storyboard PR, re-pin the game to its merge commit, then the game PR. Use normal merge commits.

**Nate's rulings during the work (2026-11-26):**
1. Canon dead end at `hotel_seashell_first_attempt`: add one unconditional `shell_first_leave` card, "PUT THE SEASHELLS DOWN AND LEAVE." → `hotel_bridal_lavatory_park_exit`.
2. The approved paper has four boxes: Chapter 3 → 4 uses an exact second copy of the sheet joined below the first.
3. The printer's face has no comma: omit it (SOMETHING OLD SOMETHING SOLD).
4. Prologue title "The Last Good Day [working title]": strip the trailing [ … ] note.
5. The transition lab branch is the implementation source. Reuse its art, logic, layering and timing, and list every deviation for approval (section 6).

**Nate's review-gate rulings (2026-11-26).** He accepted the implementation direction for continued review. **This is not authorization to merge or deploy.**
1. **Form 27B-6:** all six deviations in section 6 are accepted. The approved printer art, timing, animation, typography and layering are kept; no visual redesign.
2. **Main menu:** full menu integration stays deferred. The approved menu stays on its own review branch (`review/out-of-order-menu-intake`). Menu → Prologue keeps playing over the approved menu painting whenever a new game starts. Nothing of the menu system is merged under issue #27.
3. **Display names:** the 21 Chapter 4 names in section 4 are accepted exactly as listed.
4. **Unreachable art:** the four never-shown images stay, with their fingerprints and provenance. No invented routes, narrative changes or forced visual states. Section 4.1 records the check that their unreachability follows from the authored routes.
5. **Locked choices:** greyed REQUIRES / NOT IN INVENTORY cards are deferred to a separate gameplay/UI task. Current visibility behavior stays. The requirement is recorded in section 9.
6. **Gate:** both PRs stay draft. Merge only after Nate's merge approval, in the order above.

## 1. Storyboard integration branch (public)

Every change below is a minimal text edit. Formatting elsewhere is byte-identical.

| Change | Why |
|---|---|
| Chapter 3: each of the 7 endings' BEGIN AGAIN becomes one `CONTINUE` → `chapter-04` with `effects: {set: {ch3_exit_route: <ending id>}}` | The `ch3_exit_route` hand-off (docs/126 §6.1, docs/152 addendum), one-to-one with Chapter 4's seven arrival variants. Narration unchanged. Same shape as the Chapter 2 → 3 precedent. |
| Chapter 4: `development.notForGameplay` → `false`; manifest status → `draft` | docs/152 §7B.6. |
| Chapter 4: the 3 park exits get the standard surviving-ending `BEGIN AGAIN` | They had no card. This is the Chapter 3 endings' own pre-hand-off presentation, used until Chapter 5 exists. |
| `ch4_careful_ring_retrieval`: `certain: true` | It reaches 100% with both authored mods (need 4, +1 +2). Odds unchanged; the risk marker stays (docs/152 §7A). |
| `shell_first_leave` card | Ruling 1. |
| 4 docs/137 C3 reuse keys registered `reused` (`wedding_entry`, `refreshment_table` → CH4-05; `bridal_corridor` → CH4-B2-19; `freight_lift` → CH4-NEW-03) | docs/152 §7B.1. Done through `register-art.mjs`; no new art. |
| Death exporter: `subtitle` optional | The four approved Chapter 4 popups are a title and a narrative only. Nothing is invented. The six earlier entries are byte-identical. |
| `check-canon`: `notForGameplay` must be stated explicitly (false once consumed) | Needed to lift it. |
| QA pins (qa-smoke, qa-sync, qa-ch3-reboot-candidate, qa-browser, qa-timeline) | Intended changes only. |

Storyboard QA passes locally: check-canon, qa-sync 23, qa-smoke, death export, qa-static, both Chapter 3 suites, browser 26/26, timeline 136/136, artwork preview 64/64, art-lab Pages site 70/70, art-lab browser 106/106.

Pre-existing: `qa-ch3-artwork-briefs` fails on untouched `7618d81` too. It is not in CI.

## 2. Engine and importer

- **WP-1.** Focus ids may be `location/target` as well as `location/scene/target`. The canonical ids are unchanged.
- **WP-2.** A text run may carry its own `if`. It is evaluated at the step that shows it, and the kept runs are written to the transcript. So NOTES, saves and resume replay exactly what was shown.
  - The route walk proves every conditional run shows in some reachable state.
  - A run that can never show is allowed (reported) only when it is the exact complement of a sibling run that does show. This is the existing fallback rule. Chapter 4 has one: `hotel_seashell_instructions` run 3 ("THAT DOES NOT HELP ME.") cannot occur, because the room is only reachable after provisional registration.
- **WP-3.** The four popups come through the canonical death export.
  - Their approved aftermath art is bound pending integration through the game's own provenance (`deathScreens:` keys; `sync.js`). The binding holds only at the record's approved SHA-256 and the installed bytes.
  - The popup omits an absent subtitle.
- **Focus A action echo.** An action's authored `say` on a Focus A node is echoed on the Focus A surface: the `red_stapler` USE at `hotel_collection_ring_focus`.
- **Conditional art** (section 4) and the **presentation-only INSPECT** (section 5).
- **Typography.** Chapter 4 prose uses `—`, `’` and `è`, which the approved faces lack.
  - `game/js/glyph-fallback.js` draws `-`, `'` and `e` instead, as the death popups already did for dashes.
  - The stored text keeps its characters.
  - The importer accepts a character only if it is drawable or has a fallback.
- **Route walk.** Unchanged in what it proves: the existing full-key vs live-key equivalence suite also covers the split walk. Three changes make it tractable:
  - live inventory and live marks: an item or mark is part of the state key only while something ahead can read it;
  - presentation-aware liveness: description and FILES conditions count only where their inputs can still change, and coverage is recorded for every state before merging;
  - per-chapter key maps.
  - Before, Chapter 4 entered from 5,760 projections and the walk ran out of memory. Now it is 64 projections, and the whole five-chapter walk takes **74,914 states in about 26 s and 420 MB**.

## 3. Chapter 3 → 4 and the Temporary Staff Pass

- All 7 Chapter 3 endings enter Chapter 4 at `hotel_entry_dispatch`. They keep inventory, item marks, flags and checks, record `ch3_exit_route`, and are offered exactly their own arrival variant. `validate_ch03` checks this on every catalogued route.
- The pass is granted only at `unauthorized_presenter`. The four appointment routes gain exactly it.
- Its art: slot `art/items/pavilion/pavilion_temporary_staff_pass_slot.png` (96×96 RGBA, `662ecb2c…b59b5`) and inspect `…_inspect.png` (565×451 RGB, `527e17af…e41`), both byte-exact.
- From `presenter_help_end` and `backstage_exit`, the pass's three Chapter 4 cards and five downstream nodes are reachable (walk and review starts). The three cards: SHOW on the pass at `hotel_auction_chair_lot31`, and the pass-gated actions `collection_show_staff_pass` and `boiler_show_staff_pass`. Re-checked at the review gate: the rules engine offers all three on both pass routes and none on the other five endings.

## 4. Art

- **63 primaries + 2 staff-pass views** are byte-exact copies of their registered blobs. Each equals the preview SHA-256, the first SHA-256 in its approval notes, and the immutable review-source blob.
  - Breakdown: 16 scenes, 23 portraits, 8 closer backgrounds, 8 Focus A, 4 item views, 4 fatal aftermaths.
  - They are bound pending integration through `art/grand_bellevue.provenance.json` and the staff-pass provenance. Storyboard records stay `approved` with `assetPath` null until the reconciliation (`sync.js publish`).
- **The 4 reuse keys** resolve to their sources' files.
- **21 cast names** were added to `story/runtime-settings.json`. **Accepted by Nate as listed (2026-11-26):**

  | Key | Name | Key | Name |
  |---|---|---|---|
  | hotel_auctioneer | AUCTIONEER | hotel_auction_clerk | AUCTION CLERK |
  | hotel_bride | BRIDE | hotel_groom | GROOM |
  | hotel_plumber | PLUMBER | hotel_plumber_assistant | EDDIE |
  | hotel_porter | PORTER | hotel_second_porter | SECOND PORTER |
  | hotel_salvage_foreman | SALVAGE FOREMAN | hotel_salvage_clerk | SALVAGE CLERK |
  | hotel_service_foreman | SERVICE FOREMAN | hotel_commodore_bixby | COMMODORE BIXBY |
  | hotel_boiler_engineer | BOILER ENGINEER | hotel_wedding_organizer | WEDDING ORGANIZER |
  | hotel_wedding_assistant | WEDDING ASSISTANT | hotel_wedding_guest | WEDDING GUEST |
  | hotel_attendant | ATTENDANT | hotel_lift_voice | FREIGHT LIFT |
  | bridal_door_ai | BRIDAL DOOR | bathroom_ai | BATHROOM AI |
  | autofit_system | AUTOFIT | | |

### 4.1 Conditional art (docs/152 §4)

The **28 conditional references** are byte-exact under `art/**/states/` (provenance: `art/grand_bellevue.conditional-art.json`). The table in that file says when each shows: the authored node(s), the real state, and the authored **text beat**, meaning the words that begin the paragraph or run where the state starts.

How it works:
- A state appears when those words are typed, never earlier. In the browser it appears within one 50–60 ms sample of the first words, in both browsers.
- A reload or replay presents it at the same words.
- The validator proves each beat's opening is unique in its node.
- Within a surface, states are taken in priority order; the master image is the default.

| Reference(s) | Shown | Notes |
|---|---|---|
| lobby doors removed | every lobby node once "A workman carries away the first restroom door." (`hotel_auctioneer_arrival`) has been presented in the playthrough | docs/151: on the sale's beat and every later lobby visit. Routes that never see the sale keep the master. |
| lot61 open | `hotel_lot61_pod_auction` from "Two porters wheel out…"; `hotel_lot61_pod_declined`; `hotel_lot61_pod_escaped` before the folding; `fatal_lot61_folded` | "During the demonstration" (docs/151). *Interpretation:* the escape and fatal nodes are the continuing demonstration. |
| lot61 packed | `hotel_lot61_pod_escaped` from "Behind you, the booth folds inward" | Only after the folding finishes; never from the entry flag. |
| restroom active leak (main + close) | `hotel_restroom_plumber` from "A violent jet of water erupts"; `hotel_wheel_buyer_lead`. The main image is also held at the start of `hotel_wheel_return` and `hotel_key_master_cabinet` until their containment beat. | *Extension:* the main image in the buyer-lead node, where docs/150 lists the close camera, so both apertures agree. |
| restroom contained | `hotel_wheel_return` from "One turn. A second."; `hotel_key_master_cabinet` from "Inside is a single large red lever."; `hotel_valve_braced`; `hotel_stall_lot_claimed` before the lift | Braced and contained share it (docs/150). *Carry-over* into the stall node until the lift. |
| restroom flood onset | `hotel_valve_flood` | The image predates the basket beat. |
| restroom stall lifting | `hotel_stall_lot_claimed` from "Something shifts overhead."; `hotel_stall_crane_success`; `hotel_stall_porter_protest` | *Extension:* the porter-protest main scene ("now halfway through the ceiling"). Its close background stays the approved CH4-B2-03 (docs/151). |
| staff lavatory cleared (scene + close) | `hotel_staff_lavatory_move_boxes` from "She begins removing boxes."; held in `…_temporary_use_permit` | |
| staff lavatory permit (scene + close) | `…_temporary_use_permit` from "She places her clipboard on the toilet seat." | The image shows the clipboard on the seat. |
| boiler relieved / inspection hold / staff access (scene + close) | from "He unlocks the passage." / "He hangs a DO NOT OPERATE tag" / "He opens the maintenance gate." in their nodes | |
| threshold (NEW-18) wheel mounted / removed / rubber-band fender | `hotel_commodore_bixby`; `hotel_bixby_emergency` from "He pulls the wheel free"; `hotel_bixby_trade` from "He hands you the brass wheel" | |
| threshold water emerging | from "Water creeps out from beneath the ballroom door" and in the next two Bixby nodes | **Combinable** (docs/142). Only its exact difference rectangle (0,221 99×42, disjoint from the wheel and fender areas) is drawn over the current wheel state. Every pixel shown is an approved image's. |
| public corridor flood | `hotel_flooded_public_corridor` | The dry master is the default. |
| chair seam open (Focus A) | `hotel_chair_ring_focus` when `ch4_chair_seam_open` | The seam was opened and narrated in the previous node. |
| collection ring slipped (Focus A) | `hotel_collection_ring_focus` when `ch4_ring_slipped_inside_chair` | Narrated earlier, in `hotel_ring_slips`. |

**Installed but never shown.** These are verified bytes with no on-screen moment in the authored routes:
- **B2-25 recovered.** Its nodes are porter conversations, and the close-up cannot be re-entered once the ring is taken.
- **NEW-07 provisional, Focus A and square INSPECT.** Assessment D1: the authorization is set only after the door can no longer be reached.
- **NEW-08 manual slack.** `hotel_bridal_gown_motor` is a Narrative B node with no Focus A aperture, and an open lining must never persist.
- B2-24 open at `hotel_chair_stapler_stealth` (narrative) has the same limitation; it does show at the Focus node.

**Review-gate check (2026-11-26, Nate ruling 4).** Each image is retained unshown. No choice or interaction is missing:
- **NEW-07 provisional (Focus A and INSPECT).** `ch4_provisional_bride_registered` is set only in `hotel_bridal_autofit_survived`. Its only card continues to `hotel_seashell_room`. From there only 9 nodes can be reached even with every condition ignored, and none is a bridal-room node. docs/145 itself asks to preserve the art "for the corresponding later authorization condition" without authoring a new state transition. All five door choices and INSPECT are present.
- **B2-25 recovered.** `hotel_collection_ring_focus` has one entry, `collection_inspect_chair_ring`, guarded by `notFlag ch4_wedding_ring_retrieved`. It cannot be reached from `hotel_collection_ring_in_pocket` even with every condition ignored. The two recovery nodes docs/152 §4 names are authored `mode: dialogue` (porter portrait).
- **NEW-08 manual slack.** docs/152 §4 places it inside `hotel_bridal_gown_motor`, "before the lining is replaced". That node is authored `mode: narrative` and ends "You carefully replace the lining." The close-up can be revisited afterwards, but the lining is closed again and docs/152 says "Never persist an open-lining state", so the master image is correct there.
- **One discrepancy, recorded but not acted on:** for B2-25 recovered and NEW-08, docs/152 §4 maps a Focus A image to a node whose authored mode has no Focus A window. Showing them would need either a node-mode change on the storyboard (a canon change) or a new engine surface for a Focus image inside a dialogue or narrative node. Neither is in scope, and ruling 4 keeps both unshown.

## 5. Bridal-door INSPECT (docs/145, docs/152 §5)

- `hotel_bridal_door_focus` offers INSPECT, using the approved magnifier glyph, in the first utility slot.
- It opens the approved locked square image, 565×451 at 1:1, in the inspector window.
- Its title and text quote the node itself: "BRIDAL PRIVACY SYSTEM" and the node's first paragraph. No new prose.
- Opening and closing never call `Rules.step`, save, or change any state. X or Escape returns to the same Focus A node and cards.
- The browser suite asserts the state, the save and the cards are byte-identical before and after.

## 6. Form 27B-6 / REGISTER OF PROGRESS

- **Port.** `game/js/chapter-transition.js` and its CSS in `game.css` port `print.js` and `print.css` from `review/chapter-transitions-lab-v01` (archive `ae63c2c`).
  - The selected options: scene treatment "Blur, dim, cross-dissolve", exit "Reverse feed + fade", lip "Thick on bottom", paperY −5, feedDepth 5.
  - The nine-phase timing defaults are unchanged: 9.68 s; 7.13 s for Menu → Prologue.
  - The 5×7 glyphs, scribble paths and layering are unchanged.
  - The PNGs are byte-exact: `form-27b6-blank-v01.png` `3c1c2df4…`, `printer-slot-v01.png` `7ee55842…`, menu painting `22083a03…`.
- **When it plays.** Only on a genuine chapter event: after a committed CONTINUE into another chapter, once the outgoing text was read. Menu → Prologue plays on a new game.
  - **Never** after BEGIN AGAIN, on RETRY or CHECKPOINT, on load or resume, or on fatal endings.
  - The incoming chapter is preloaded and laid out under the overlay.
  - Skip: Space, Enter, Escape or a pointer press. Completion is idempotent.
  - Reduced motion follows the lab (`prefers-reduced-motion`).
  - A reload mid-transition lands in the new chapter without replay, because the step was already committed once.
- **Rows.** Only the encountered chapters, from canonical titles and numbers. Rulings 3 and 4 apply.

**Deviations from the approved lab (all six accepted by Nate, 2026-11-26):**
1. **Stage.** The lab's 1024-wide preview became the 1920×1080 stage. The lab's absolute pixel offsets scale by stage width / 1024, as it already scaled paperY and feedDepth.
2. **Backdrops.** The outgoing and incoming backdrops are the game's real frames, frozen (`G.captureStage`), instead of the lab's review painting and schematic next scene. For Menu → Prologue the outgoing backdrop is the approved menu painting itself, which is the lab's own default.
3. **Fifth box.** The fifth and later rows (Chapter 4 onward) sit on an exact second copy of the sheet below the first (ruling 2).
4. **Two-line titles.** The lab's two-line layout is chosen when a title does not fit its one-line box, instead of the lab's ">30 characters" rule. The result is identical for the lab's demo titles. "SOMETHING OLD SOMETHING SOLD" is 28 characters but too wide for one line.
5. **Review chrome not ported.** Scenario and tuning controls, matte labels, test marks and the status text.
6. **Skip has no visible button.** No approved art exists for one. Keys and a pointer press work, and the overlay announces them to assistive technology.

**Main menu.** The game has no main menu: its engine integration is deferred on `review/out-of-order-menu-intake`. Full menu integration (buttons, CONTINUE / NEW GAME, settings, credits) is a separate scope.
- The smallest solution, implemented for review: Menu → Prologue plays when a **new game** begins (no autosave, or `?new`), over the approved painting, after the new game is set up and saved.
- **Ruling (Nate, 2026-11-26):** keep this. Full menu integration stays deferred and separate from issue #27.

**Side-by-side evidence.** At matched moments of Prologue → Chapter 1, the in-game printer and the lab render the same printer, paper, ink and typing. The only difference is the backdrop (deviation 2).

## 7. QA (local; no paid CI)

| Suite | Result |
|---|---|
| `import.js --verify`, `sync.js verify`, `glyph-ink --verify` | OK |
| `validate_story` (178, incl. liveKeys / chapterSplit equivalence on every fixture and mutant) | 178/178 |
| `validate_story_import` | 107/107 (see the PR for the final run) |
| `validate_ch03` | 453/453 |
| `validate_ch02_art` / `validate_ch02_routes` / `validate_ch01_art` | 326/326, 157/157, 261/261 |
| `validate_death_controls` / `validate_presentation_capabilities` / `validate_assets` | 45/45, 33/33, 60/60 |
| `validate_route` (v1, v2), `qa-sync` | 49/49, 49/49, 33/33 |
| **`run_ch04_qa`** (new; Chromium + Firefox) | **42/42**: printer, skip ×2, reload, new game, reduced motion, 1920×1080 scale, CHECKPOINT, INSPECT ×2, beats ×3, four fatal popups |
| Existing browser suites | see the PR |

Pins moved deliberately, each with a reason in the test:
- four → five chapters and the counts;
- the Chapter 3 narrative lock `857ffdf` → `36a72dc` (staff pass + hand-off);
- the staff-pass item and the four appointment routes;
- the death-controls content hash `8045c71dcbf1` → `f36c40e5e9f1`;
- qa-sync's unconsumed-stub fixture → Chapter 5;
- EF-A1's second named exception: the docs/137 C3 reuse scene keys.

## 8. Reviewing

1. Serve the repository root: `python3 -m http.server`.
2. Open `/tools/review/index.html`. This is development only and is not part of the game.
3. Each button loads a **real playthrough** standing one decision before:
   - a chapter boundary (Prologue, Chapter 1, Chapter 2, all 7 Chapter 3 endings, two holding the staff pass);
   - or a Chapter 4 moment (bridal door, Bixby, Lot 61, restroom burst);
   - or each of the four deaths, from a playthrough where that roll is fatal.
4. `NEW GAME` (`/game/index.html?new`) shows Menu → Prologue. `?noprinter` compares without the printer.
5. Regenerate the starts after any content change with `node tools/review/build-review-starts.js`.

## 9. Known limitations and open items

- **Display names** and the **main-menu boundary** were ruled on by Nate (see the top of this document).
- **Three references and the provisional INSPECT image** never show. They are retained by ruling, and the check is in section 4.1.
- **OUTSTANDING REQUIREMENT: locked cards (deferred by Nate, 2026-11-26, to a separate gameplay/UI task).**
  - The docs/123 enginePresentationRequirement says to show unavailable item cards and exhausted cards as locked, labelled REQUIRES / NOT IN INVENTORY.
  - It is **not implemented**, because it changes the approved card UI in every chapter.
  - Issue #27 keeps the current behavior: unavailable choices stay hidden, as in Chapters 1–3.
  - Any future task must cover all chapters and needs its own approval of the locked-card look.
- **Main menu:** full engine integration is deferred. The approved menu stays on `review/out-of-order-menu-intake`.
- **Reconciliation.** After merge, `sync.js publish` raises the Chapter 4 records to `integrated` and the bindings can be dropped. Same as Chapter 3.

## 10. Final review checklist (merge-approval gate, 2026-11-26)

Re-checked on the pushed head after Nate's review-gate rulings. Since commit `31d00da`, only this document has changed.

| Requirement | Status | Evidence |
|---|---|---|
| Both PRs preserved as drafts, neither merged | ✅ | game #28, storyboard #46 (draft) |
| No public game build deployed | ✅ | nothing deployed; review is local only |
| Printer assets intact | ✅ | `form-27b6-blank-v01.png` `3c1c2df4…`, `printer-slot-v01.png` `7ee55842…`, menu painting `22083a03…` = lab branch `ae63c2c` blobs |
| Printer behavior intact | ✅ | `run_ch04_qa` 42/42 (Chromium + Firefox); review page crossed Ch3 → 4 with one print, Escape skip |
| Chapter 4 art and narrative preserved | ✅ | `import.js --verify` OK (content `f36c40e5e9f1`); `sync.js verify --online` OK @ `0aa53dd` |
| Chapter 3 → 4 bridge | ✅ | `validate_ch03` 453/453 (all 7 endings: CONTINUE → `hotel_entry_dispatch`, state kept, `ch3_exit_route` set) |
| Temporary Staff Pass | ✅ | granted only at the appointment; its three Chapter 4 cards on both pass routes and on no other (section 3) |
| Local QA evidence retained | ✅ | section 7 and the PR; screenshots under `game/qa/*_screenshots/` (not committed) |
| `/tools/review/index.html` | ✅ | 19 starts load; pass and no-pass starts reach Chapter 4 in Chromium with no page errors |

**Unresolved, by ruling (no action under issue #27):**
- Locked REQUIRES / NOT IN INVENTORY cards: separate gameplay/UI task (section 9).
- Main-menu engine integration: separate task (section 6).
- Four approved images stay unshown. The art-map / node-mode discrepancy for B2-25 recovered and NEW-08 is recorded in section 4.1.
- Known pre-existing failures, untouched: the M2 Firefox reception-fixture flake (docs/105 baseline) and the storyboard's `qa-ch3-artwork-briefs` (fails on `7618d81`, not in CI).

**After merge approval, in this order:** merge storyboard #46 (normal merge) → re-pin the game to the resulting storyboard `main` commit (`sync.js pull --rev <sha>`, then `import.js --verify` and `sync.js verify --online`) → merge game #28 (normal merge) → `sync.js publish` reconciliation.
