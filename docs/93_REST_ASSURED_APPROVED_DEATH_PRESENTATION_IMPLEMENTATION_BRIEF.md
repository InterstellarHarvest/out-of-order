# 93 — Rest Assured death screen: owner-approved visual implementation brief

**Project:** The Acceptable Error / `InterstellarHarvest/CYOA`
**Recorded:** 2026-11-15
**Owner approval:** **VISUAL DESIGN LOCKED** for the voluntary Rest Assured death. **Button labels and behavior NOT approved.** This document authorizes a concrete **private implementation/review work order**, not a production merge.
**Reference study branch:** `agent/rest-assured-death-study-20261115`
**Pinned study commit:** `000f096d7699b8205affd783332a8d2aa446bf93`
**Playable base:** use the latest verified private three-chapter playable PR / active Chapter 1 artwork integration branch; inspect existing branches/PRs and record the actual starting SHA before work. Do not assume this design branch contains the latest playable code.
**Existing design context:** docs 88, 90 and completed historical study 91.

## 1. Approved reference assets — immutable, no regeneration

Use the **exact** approved image from the pinned study commit and verify file hash before using it:

| Purpose | Pinned path under `review/death-screen-layout-study-2026-11-15/` | SHA-256 |
|---|---|---|
| High-resolution source (original, 1548×1016) | `approved-default/original.png` | `163a9a4174dfb3608e49fce99624db051e38b43c1a47370ec95ba96adef80b67` |
| Approved nearest-neighbor native export (314×206) | `approved-default/native-314x206.png` | `7f469efa40548568af5dfe3c11602b9c6293282d9574caa5f36fc37113e72d9c` |
| Exact approved complete mockup at 1920×1080 | `approved-default/A1-1920x1080.png` | `f38c8031b896d365bab060c2d3e073ff70f4bc5c4029b71a654b639e11d5b07d` |
| Design and QA manifest | `approved-default/approval.json` | Read from pinned source; confirms geometry and provenance |

Use the byte-identical native export as runtime artwork or reproduce only the **already-approved deterministic nearest-neighbor resize** from the original when technically necessary. **Never regenerate or touch up the image.** Copy only the required approved production image; keep original evidence and screenshot in review and provenance, not gameplay asset folders.

**Visual content lock:** reclined Rest Assured chair; customer fully covered by sheet, no visible face or arms; *larger brown shoes with toes tipped upward and both bottom soles facing viewer*. Preserve original picked upholstery tuft, green success indicator, chair mechanics, complete pedestal. No placard. All resting-shoe, arm-exposed, upright and placard candidates are superseded.

## 2. Exact A1 layout at canonical 1920×1080

- **Modal envelope**: x=**280**, y=**135**, width=**1360**, height=**640**. Horizontally centered on 1920 display.
- **Vertical anchoring**: center y=**455**, matching the main game scene window center (`scene_rect = [32,44,1255,822]`); do **not** center to y=540 screen midpoint. Review lab achieved this with **−85px offset** from its original y=220 position; production should use the actual final coordinates, not double-apply an offset.
- **Composition**: A1 single framed illustrated tableau, narration to its right, independent heading above. No transparent cutout mode, no second detached footer, no alternate layout for this death.
- **Title**: **`PERMANENTLY SATISFIED.`** visible, separately rendered by UI/text, never baked into the art. Match approved screenshot's bitmap font, placement and hierarchy.
- **Illustration**: approved native `314×206` shown at exact 2× = **628×412**. Foreground sampling stays nearest-neighbor, no blur.
- **Body copy** (PROVISIONAL, not art-baked): `You have achieved permanent relaxation. The House is delighted to report that its newest customer has stopped complaining.` Maintain readable layout and typography. The owner has not locked final text.
- **Control geometry**: three visually integrated button footprints under a separator, shifted **12 display pixels up** relative to the initial A1 study. Each button *including its shadow* has **24 display pixels of clear space above and below** (relative to separator / inner lower border). Use the exact approved `A1-1920x1080.png` as a pixel geometry reference. Keep button positions and visible footprint, but DO NOT treat temporary labels as accepted names.
- **Responsive behavior**: compose at 1920×1080 reference coordinates, then scale entire approved layout uniformly to actual game viewport / current shell scale; never independently recenter on the physical viewport or stretch artwork nonuniformly. Preserve integer-nearest art treatment where applicable. Compare back to canonical output at 1920×1080.

## 3. Frozen, dark chunky SNES-style backdrop

- Capture **the entire actually rendered game interface** at the instant the fatal outcome is reached (scene, right portrait/narrative/choices, inventory, lower utility areas and frame). This must be the *real game*, not a baked design-composite image in production.
- Freeze its **visible last real frame** while the fatal overlay is open. Do not allow background type-on, interaction, card motion, route navigation, or UI clicks to continue behind the popup.
- **Pixelate ONLY the frozen background** into **10×10 display-pixel blocks** using nearest-neighbor / sample-at-block-center reduction, then scale hard-edged (no smoothing, antialiasing, blur or dithering).
- Multiply each backdrop channel by **0.35**, giving **65% darkening**. Do not confuse with a 65%-opacity black panel over unpixelated art. Sample consistency and foreground sharpness must be QA'd.
- Draw the death popup, independently sharp, *after* the pixelated/dimmed backdrop.
- Lab capture's imported chair art was a **documented design composite** because the playable branch had a placeholder. Actual implementation must use real integrated scene art (Chapter 1 integration may be in parallel). The study screenshot is a comparison reference, NOT a production runtime background texture.
- Handle resize/reflow and tab visibility without exposing a stale unpixelated active background. Reduced-motion preference should keep the required final static dim pixel treatment; entrance/exit animation is not part of this acceptance scope.

## 4. Scope of fatal trigger and future cause IDs

Current authoring uses Chapter 1 `chair_locked` with three choices and one common `exit_chair_fatal` node. The approved image and provisional copy refer **only to voluntary surrender**, reached via `accept_permanent_rest` → `exit_chair_fatal`.

The other fatal entry paths are:
- `stapler_breakout` failing its d6 check → `exit_chair_fatal`.
- `physical_chair_breakout` failing its d6 check → `exit_chair_fatal`.

**Do not incorrectly display the approved voluntary illustration as the generic death for both failures.** Preserve/observe the actual choice ID and check outcome (cause-sensitive event/presentation metadata) instead of inferring the cause from the common end node. The existing dice/check probabilities, item retention and route consequences MUST stay intact. Do not add a second dice/inventory engine.

The first visual implementation proof may activate the new overlay **only** for the voluntary cause. Leave the existing engine's ordinary fatal presentation intact for the two unillustrated causes until their own art/copy are approved; preserve a deterministic test fixture for each. Architecturally allow future cause-specific presentation entries without hard-coding Chapter 1 into the generic stage.

## 5. Button semantics — BLOCKER FOR PRODUCTION, NOT FOR VISUAL STUDY

**Three button footprints and positions are approved.** The words `RETRY` / `BEGIN AGAIN` / `EXIT` were **placeholder mockup labels only**. The owner has approved neither the final wording nor the behavior, especially checkpoint availability.

The existing fatal story node currently has a **functional authored** `BEGIN AGAIN` system choice (`restart:true`). That is not permission to assign *any* of the three new buttons to restart, restore, checkpoint, abandon, quit, or delete saved progress.

For the private visual implementation branch:
- Keep existing fatal/restart semantics working in the ordinary gameplay path when the new popup is disabled.
- Put the A1 visual in a **feature-gated developer/review proof**; sample buttons may be drawn, but must be labeled explicitly as preview controls and not represented to testers as active save operations.
- Do **not** silently ship inert player-facing controls in a playable release, or redirect a click to unrelated behavior.
- Before enabling the overlay in ordinary play, Gameplay PMO must supply a separate **button/checkpoint/save contract** for owner ruling. It should document retry target (if any), state restoration, seed/check re-roll policy, saves/autosave clearing, BEGIN AGAIN semantics, exit/quit behavior, and whether any button is conditionally disabled or replaced.

No text/choice mutation, save schema change or live button rewiring is approved by this design brief.

## 6. Implementation plan (for Claude/Gameplay PMO)

1. Read the **actual pinned** `approval.json`, original, native export, full A1 screenshot and lab README. Inspect the current stage, story flow, rules, rendering, save pipeline and selected Chapter 1 artwork integration work; record accurate branch head SHAs.
2. Create a **new isolated worktree and review branch** based on the current playable integration baseline, leaving active PR branches, original design-study sources, `main` and all local owner files untouched.
3. Copy only **approved native artwork** (not older art generations or a whole `review/` directory) to a stable production candidate path under `art/` in that isolated branch. Verify SHA-256 byte equality.
4. Build a reusable *visual* death-overlay component at topmost shell layer, with independent title, framed art, prose and three slots, all anchored to exact A1 canonical coordinates. Keep drawing of buttons separate from meaning/action dispatch. Use the actual engine's bitmap fonts or verified equivalents from the study; avoid hand-drawn fake text.
5. Capture the current real gameplay screen on the feature-gated voluntary fatal event and produce a frozen dark/pixelated backdrop using hard nearest-neighbor 10px blocks. No backdrop import from review images.
6. Connect **only** the voluntary cause in review mode, without modifying its dice/check/item effects or auto-restart; leave other fatal causes on existing path and ensure the overlay does not trigger there.
7. Produce a **private playable review route / test fixture**, canonical 1920×1080 screenshot, browser QA and optional shorter viewport proof. Show accurate controls-as-previews without pretending they restore/quit.
8. Report implementation code and art SHA, actual 1920×1080 pixel matches/differences, UI layering, keyboard/focus handling, restart compatibility, no face exposure, and all QA totals. Open a **draft PR** against the current playable branch and stop.

## 7. Acceptance and negative controls

| Test | Expected result |
|---|---|
| Exact image provenance | Copied image SHA256 matches pinned `native-314x206.png`; original remains archived and unchanged |
| Canonical layout | Popup at `(280,135)`, size `1360×640`; reference center y=455 and exact 2× art |
| Title and text | Title separately rendered; narrative independent from art; heading literally `PERMANENTLY SATISFIED.` |
| Controls | Exactly three slots inside main popup; shadows included in 24px top/bottom clearances; sample wording clearly unapproved |
| Frozen background | Current real shell frame remains static; entire 1920×1080 dimmed 65% with 10px hard squares; popup NOT dimmed/pixelated |
| No face/other art drift | Approved sheet, toes-up both visible soles, picked tuft, indicator, hardware and pedestal exactly preserved |
| Voluntary cause | `accept_permanent_rest` triggers gated preview once, no extra item/check effect |
| Stapler failure / unarmed failure | Do NOT show approved voluntary aftermath for either, keep original fatal route functional |
| Nonfatal negative controls | Successful chair escape, equipment registration, Chapter 2 exits and all unrelated endings do not trigger Rest Assured image |
| Back/restore/resize | No background interaction, input leak, duplicate overlay, visual flash, unwanted save change or stale/fuzzy cached image |
| Existing engine contract | Ordinary `BEGIN AGAIN` continues to work with feature off; no new checkpoint claims and no changed seed logic |
| Regression | Prologue / reception fixture / House / Chapter 2 and normal inventory/Notes/Fokus state QA remain green against baseline |

Run existing importer, rules, route, asset and Chromium/Firefox tests plus a **new focused visual regression** for coordinate, pixelation, button-shadow spacing and cause selection. Clearly report known baseline failures, if any, rather than claiming full green.

## 8. Exit criteria and deferred work

The outcome of this assignment is a **private, reviewable visual integration branch**, not completed death-screen gameplay. Deliver a draft PR, screenshots/QA, exact asset/path hashes, and the **separate proposed button+save/checkpoint contract** for owner decision. Do not merge, deploy, change chapter transitions, generate other death artwork, or mark non-voluntary death illustrations complete.

**Stop for the next owner gate** before enabling the death popup as the ordinary production death route.
