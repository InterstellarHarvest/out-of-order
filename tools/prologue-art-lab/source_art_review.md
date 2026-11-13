# The Acceptable Error — Prologue Artwork Review
**Date:** 2026-11-13  
**Source:** `docs/story-gameplay-study-v01` (private CYOA)  
**Review status:** CANDIDATE — **PENDING OWNER APPROVAL**, NOT approved / integrated.

## Scope and verification

Reviewed 28 generated records from `story/artwork.draft.json`: 7 authored main scenes, 1 paired corridor portrait background, 2 termination-drone transparent foreground poses, 9 inventory-slot icons and 9 inspection illustrations. The existing 5 `reused` references were not re-approved by this pass.

Visual inspection used `review/prologue_scene_contact_sheet.png` and the 20 direct private-source item/portrait PNGs. All 28 generated PNGs exist on the source branch and had their IHDR dimensions and PNG color types checked directly:

| Kind | Count | Exact size | PNG format |
|---|---:|---|---|
| Main scenes | 7 | 314×206 | RGB opaque (color type 2) |
| Portrait background | 1 | 564×278 | RGB opaque (color type 2) |
| NPC portrait poses | 2 | 564×278 | RGBA (color type 6) |
| Inventory item icons | 9 | 96×96 | RGBA (color type 6) |
| Item inspection illustrations | 9 | 565×451 | RGB opaque (color type 2) |
| **Total** | **28** | | |

Color type confirms RGB/RGBA storage, not that every individual alpha value or in-game compositing result is correct. This was a visual/asset-file review, **not** a browser or in-game integration test.

## Overall visual assessment

**Suitable for owner review without batch-wide regeneration.** Main scenes have a coherent late-mid-century industrial and bureaucratic palette, with deliberately larger pixel clusters than the portrait/detail artwork. The revised drone corridor background is a genuinely closer perspective of the same place; it is no longer just an enlarged copy. The two drone foreground poses maintain the same register and silhouette, with the form/pencil changing as intended. Slot and inspection counterparts generally read as the same objects.

The exterior Exposition views are brighter and more monumental than the workplace interiors. This could be a useful tonal contrast, but the owner should confirm it is deliberate. The inspector illustrations use quiet full backgrounds and shadows: check that they sit comfortably inside the production inspector shell.

## Targeted visual/narrative issues to resolve before approval

1. **Conditional number printed permanently on claim ticket.** `art/items/property_claim_ticket_inspect.png` reads **ARTICLES HELD FOUR**. However `story/items.draft.json` has separate three- and four-article descriptions depending on the `property_record` flag. A single baked-in FOUR illustration can contradict the three-article branch. Recommend a neutral printed field with dynamically rendered count, or two art variants clearly mapped to the state. **Narrative/asset mismatch; needs correction before approval.**

2. **Termination notice combines conflicting state cues.** `art/items/termination_notice_inspect.png` currently shows a completed signature plus both **REVIEWED** and **REVIEW PENDING** stamps. The story describes unsigned, signed and review-requested states; one fixed image should not imply that all occurred. Recommend a neutral base notice with conditional signature/stamp overlays or state-specific variants. **Narrative/asset mismatch; needs correction before approval.**

3. **Possible unapproved protagonist name.** `art/items/effects_box_full_inspect.png` has **H. Carter** handwritten on the box. The item description says only that *your name* is on the side, with no name specified in this draft. Ask owner/Story Director whether that is a deliberate protagonist identity; if not, remove or anonymize the legible name. Avoid canonizing an incidental image-generation detail.

4. **Inspector-in-shell review.** Although all inspection illustrations are exact 565×451 RGB, confirm their colored backgrounds, shadows, and object sizes against the game's actual inspector presentation. Do not judge them solely as standalone PNGs.

5. **Reuse branch reconciliation.** The previously approved reception main scene, receptionist background, receptionist foreground and facilities-key inspect art still reside on the M2 integration branch, not under the story branch asset tree. This is an integration/branch reconciliation task, **not** missing art to regenerate.

## Approval gate

- Keep all 28 new records at `generated`; do **not** mark `approved` or `integrated` in JSON.
- Resolve the numbered story-state mismatches with targeted edits or overlays; no full regeneration requested.
- Owner decides whether the exterior/interior contrast and inspector presentation are approved.
- After those corrections, review final assets in the actual M2 shell before promotion.

## Public storyboard mirror

Public `InterstellarHarvest/CYOA-storyboard` intentionally mirrors **only 28 updated `generated` statuses and their logical `assetPath` values**, not private image files or these internal review notes. The 5 approved/reused catalog statuses are unchanged.
