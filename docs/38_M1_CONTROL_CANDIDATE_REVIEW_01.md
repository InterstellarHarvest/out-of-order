# CYOA M1 — Candidate Control Art Review 01

**Branch:** `review/m1-ui-shell-v2`  
**State:** ART CANDIDATE — NOT OWNER-APPROVED, NOT GAME RUNTIME  
**Current published review commit:** `7b0b296cc42ac42131d477a15ebe6e42145c7050`

## Source / reference
- Exact owner-final immutable `/layout-final.png`, SHA-256 `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6`.
- Original approved `CYOA_M1_locked_components_v1.zip`, SHA-256 `58c71b660f87a83400c80d0e75c2037af67827b00e2f4918cff794500050f302`.
- Exact approved 12 choice-card variants, 96x96 inventory slot and dark/light bitmap atlas.

## What changed — REVIEW ONLY
Generated reproducibly at the 960×540 logical pixel grid, integer scaled 2×:
- `inv_left_up.png`, `inv_left_down.png`, `inv_right_up.png`, `inv_right_down.png`: separate rivet-free directional buttons in 56×112 RGBA.
- `utility_[1-3]_{up,down}.png`: 144×128 siblings with varied tiny mixed fasteners and NO baked labels.
- `choice_scroll_top.png`, `choice_scroll_middle.png`, `choice_scroll_bottom.png`: three 26px-wide cap/tile pieces for the fixed shell track.
- Three assembled full-frame 1920×1080 **review** screenshots, using the canonical PNG and original approved choice/slot/atlas sprites:
  `assembly_candidate_up.png`, `assembly_candidate_down.png`, `assembly_candidate_overflow.png`.
- Side-by-side `press_study.png` for tactile idle versus recessed states.

These files and their generator sources are isolated under `review/m1-ui-shell-v2/candidate_art/`. They were committed by a GitHub Actions workflow without changing original assets.

## Deliberately preserved
- Original `layout-final.png`: **unchanged**; verified exact blob `1849c8ec192cd639dd8550de0dcdda1aa88d2e4f` after publication.
- All 12 A/B/C choice sprites and their exact SHA-256 identities.
- Inventory slot, seven-slot geometry, 6px gaps, 102px pitch.
- Objective plate and speech panel in shell; narrative wording remains code-rendered only.
- All source glyph shapes from the approved atlas; no browser-native font substituted in review composites.

## QA
- Owner-final source and ZIP passed exact SHA-256 and shell alpha counts.
- 16/16 locked component hashes passed in original intake preflight.
- 13/13 new pieces passed required geometry and binary alpha checks (0 or 255).
- All 3 candidate assembly images are exactly 1920×1080.
- A byte-for-byte comparison of the generated candidate PNGs from GitHub Actions versus the local review versions passed for all files.
- Source shell blob remained unchanged after Git publishes.

## Art QA / rejected
- Rejected previous arrow and generic utility button prototypes as production choices; they remain only in the original locked intake bundle as historical comparison.
- The initial newly authored control study was revised to add restrained edge wear/small manufacturing marks before publishing the candidate.
- No new hover sprites or pressed recolor/highlight variants were created.
- Did not promote anything into gameplay; screenshots are static assembly studies, not working interaction QA.

## Outstanding concerns / owner decisions
1. **Button language:** New grey-blue/green controls are more understated and less ornate than the shell. Confirm whether this contrast is intentional and desirable, or whether more micro-detail is required.
2. **Physical press:** Review `press_study.png`. Entire faces use the same material and canvas; highlight/shadow relief changes from raised to inset. Confirm that pressed reads like mechanical travel, not simply selection or recoloring.
3. **Hardware:** Three utilities have tiny mismatched fasteners; judge whether each is distinct enough on inspection without distracting in play.
4. **Scrollbar:** Confirm tan/gold tile density in both the full-track and proportional shorter thumb. Geometry is working in the static proof; interactive scrollbar QA remains.
5. **Text:** Exact locked bitmap glyphs are used in screenshots. Interactive typewriter, click-to-complete, dynamic choice wrapping, speech overflow detection and final focus behavior must still be exercised in the browser lab.

**Owner approval scope:** only the candidate arrows, candidate utility controls, and candidate scrollbar art and UP/DOWN tactile read. No approval of revised shell, choice-card redraw, or gameplay integration is being sought.

## Git / provenance
- [Candidate art and full 1920×1080 screens](https://github.com/InterstellarHarvest/out-of-order/tree/review/m1-ui-shell-v2/review/m1-ui-shell-v2/candidate_art)
- [Press study](https://github.com/InterstellarHarvest/out-of-order/blob/review/m1-ui-shell-v2/review/m1-ui-shell-v2/candidate_art/press_study.png)
- [Candidate generation QA](https://github.com/InterstellarHarvest/out-of-order/actions/runs/41261318711)
- [Baseline owner-original sprite preflight](https://github.com/InterstellarHarvest/out-of-order/actions/runs/41260703240)

## Self-rejected stress-proof correction
The initial five-choice static test unintentionally displayed the NPC speech overflow indicator when only the **choice** list overflowed. That violates the independence of the two scroll systems. The indicator was removed from this choice-only scenario without changing any sprite or shell, and full-size screenshots were regenerated. Corrected GitHub Actions run: [41261420797](https://github.com/InterstellarHarvest/out-of-order/actions/runs/41261420797). Last candidate PNG commit: `7b0b296c`. Exact shell blob remains `1849c8ec192c...`.
