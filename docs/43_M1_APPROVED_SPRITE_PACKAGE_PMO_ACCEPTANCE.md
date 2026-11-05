# CYOA M1 — PMO Acceptance: Approved Sprite Package v1

**Date:** 2026-11-01  
**Review target:** `agent/m1-approved-spritesheet-toggle-demo` @ `dfafe1f1166f4fb0c7aed028f786e92328f46cc7`  
**Verdict:** **ACCEPT / LOCK THE PACKAGING OUTPUTS**, pending only implementation-phase geometry reconciliation.  
**Authority:** Owner explicitly approved the V5 appearance in the preceding sprite-production review; this ruling accepts Claude's packaging and background-toggle gallery. No game runtime or production shell integration is approved here.

## Scope accepted

- Exactly 29 atlas sprites, 1676×1163 RGBA, single transparent atlas.
- Twelve previously locked choice cards (four text heights × A/B/C), one locked 96×96 inventory slot, all 13 owner-approved V5 source-cutout control sprites, and three preserved bitmap-font atlas images.
- `review/m1-ui-shell-v2/approved_sprite_package/v1/m1_approved_sprite_sheet.png` plus coordinate manifest and copies of source sprites.
- `review_sprite_sheet.html` with atlas/individual views, five independently selectable backgrounds (**checkerboard, dark, black, white, magenta**), 1×–4× native/integer zoom, per-card overrides, metadata and copy-to-clipboard.
- `sheet_review_checker.png`, `sheet_review_dark.png` for convenient reference.
- Deterministic build and verification scripts `build_package.py`, `qa_package.py`; recorded **223/223 PASS**.
- The browser test report from Claude states 144 Chromium/Firefox pixel captures within one channel value of reference, and four intentional QA-tampering failures. PMO inspected committed manifests and PNG preview, but did not independently rerun those browser tests.

## Source identity / preservation

Git comparison against `c92c78428be7e81e2aa3a14f17c2b1ab24dd72f1` found no edits to the original shell or locked ZIP. Verified source shell Git blob remains `1849c8ec192cd639dd8550de0dcdda1aa88d2e4f`. The original locked ZIP, 12 choices, inventory slot and V5 cutouts were not overwritten, rescaled or recolored in the atlas.

The merge was assembled by fast-forwarding the exact V5 source branch, preserving its provenance before adding the package files. Rejected V2 and historical control art are not packed.

## Important status distinctions

- The V5 **appearance** was explicitly approved by the owner. No further general artwork generation is needed.
- `APPROVED_PACKAGE` means the *published review atlas and gallery are accepted as an artifact*. Do not interpret it as authorization for automatic production runtime integration.
- The individual V5 source entries in `design/m1_sprite_manifest.json` still carry `CANDIDATE` from the original review. That is intentional provenance; do not silently rewrite historical status or overwrite the locked component contract. If a subsequent explicit asset-status migration is needed, record an additive owner approval ruling and exact SHA IDs rather than obscuring history.
- The `locked_pixel_font_atlas.png` (364×78) was included to meet the packaging inventory but is a **legacy reference only**. Its glyph map does not match the usable 512×50 dark/light atlases; never select the legacy base font for dynamic UI rendering.
- No CI ran for this feature branch. The reported QA and browser tests were run locally and on a fresh clone.

## Deferred implementation / geometry issues

The preexisting `design/ui_locked_component_contract_v1.json` still describes original-control boxes (inventory arrow 56×112; utility button 144×128), while actual approved V5 sprite canvases are 83×128 and 243×205; scrollbar pieces are 40px wide while older lab assumptions include 26px. **Do not assume either set fits without placement-lab measurement.**

Next Claude Code task must be a separate **non-production pixel-placement and interaction lab**:
1. Base on this package branch (or merge its exact approved source package into a dedicated developer-tools branch).
2. Load original immutable `layout-final.png` at 1920×1080.
3. Measure the actual footer, arrow apertures, action bay, and choice scrollbar track; do not silently scale V5 source PNGs or repaint the shell. Use owner-reviewable numeric positioning and candidate display scales if required.
4. Keep dynamic text separate, and move utility labels with pressed faces. Verify choices (1–4 lines × A/B/C, 12px gaps), inventory seven-slot default and six-slot comparison, UP/DOWN arrow travel, scrollbar end caps/middle repeat and overflow/no-overflow states, title/body text placement and speech overflow independence.
5. Export stable placement JSON and review screenshots. Store any proposed updates to the control-geometry contract as a **separate additive version** for owner approval; do not mutate the earlier locked contract yet.
6. No gameplay integration, merger to `main`, or production rollout before owner approves placement and geometry.

## PMO closure

**M1 packaging and sprite-gallery deliverable is CLOSED / ACCEPTED.** Retain the original source binaries and all versioned historical candidate folders. Current blocker to runtime is **fit and geometry verification**, not sprite art.
