# M1 — Partial layout lock, rev 0.3
**Project:** *The Acceptable Error* (working title)  
**Date:** 2026-10-29  
**Status:** **OWNER-DIRECTED PARTIAL LAYOUT LOCK FOR VISUAL STUDIES ONLY**. Geometry / zone purposes now stable for subsequent art variants. Fine sizes, palette, graphics and engineering not locked. No implementation authorization.

## Corrections from the latest review
1. **English only.** All visible mockup text, signage, dialogue, labels, buttons, documents, and control names must be **English** unless the owner specifically requests another language. *Brazil* means the **1985 Terry Gilliam film**, an aesthetic of absurd institutional futurism, **not** the country or the Portuguese language. Previous generated art misinterpreted this.
2. **No ornamental top banner.** A thin sprite-built perimeter trim may surround the composition, but **no top title bar, logo plaque, location name header, project-title strip or information ribbon** above the scene. It redundantly steals vertical space.
3. **The main illustrated scene retains priority and the established left/right balance.** Later images inadvertently widened the right rail. Return to approximately **70% left / 30% right** in the main content area.
4. **Exactly three small utility buttons beneath the story choices** in the right rail (example functions: Examine, Notes, Journal). They belong **below the choice stack**, not in the global bottom strip.
5. **Global bottom strip:** **wide inventory / possessions** on the left, **compact current objective** in remaining middle-right area, and **purely decorative material / frame character** at far right. The last segment is **NOT a thumbnail, location illustration, minimap, photograph, status text, advertisement, or information module**.
6. **Persistent UI architecture must be reusable.** Speaker portrait fills its window width; no per-NPC signs or plaques baked into shared framing. Optional major-environment skin swaps are possible but unapproved.
7. **Every world and UI object gets a little 'why was it designed like that?' character.** Not just cleanliness or grime: weirdly redundant brackets, repairs, mismatched panels, impractical fittings, administrative workarounds. Readability and actual controls remain clear.

## Canonical review coordinate sketch (REFERENCE PROPORTIONS, not a runtime resolution requirement)
Use 1600 x 900 **as the drawing board** for a 16:9 mockup, only to make the proportions unambiguous.

- Outer frame occupies the image; no extra illustration border or annotation margins outside the viewport.
- **Top row:** x=0..1599, y=0..809 (**90% of height**).
  - **Left scene/framed region:** x=0..1119 (**70% of total width**).
  - **Right story rail:** x=1120..1599 (**30% of total width**).
  - Within the 1120x810 left region, the **actual scene can be 1080x810, exactly 4:3**; the remaining ~40px is construction/frame/moulding, not extra content or a mini-toolbar. The scene MUST stay visibly prominent; no forced letterboxing. Treat these as drawing proportions, not final sprite coordinates.
- **Bottom row / common strip:** y=810..899 (**10% of height**, full 1600 width).
  - **Inventory / Possessions:** x=0..767 (**48% of total width**). Multiple item slots, larger than in the widened-rail mockups; no mandatory cards-in-hand trope.
  - **Current Objective:** x=768..1199 (**27% of total width**). One contextual, spoiler-safe short sentence when useful; don't cram a quest log or progress meter here. When no objective is suitable, slot remains aesthetically intentional without inventing tasks.
  - **Decorative end-cap:** x=1200..1599 (**25% of total width**). Sprite-built design continuation of frame: e.g., oddly placed reinforced seam, battered enamel plate, sprung hinge, ceramic insulator, brass rivet strip, patched access housing. **No location thumbnail or any informational content.**
  
**If dimensions need tuning for actual type/portrait legibility, adjust inset thickness / paragraph spacing before altering the 70/30 region split.** Do not silently grow the right rail to fit a portrait.

## Right rail layout: reusable within 30%
- **Top: full-width framed speaker portrait** occupying a strong visible presence (~34–37% of top-row height, trial budget). No side plaques, little bits attached in the portrait window, or embedded location-specific branding.
- **Next: speech/narration area** (~18–21%): speaker name and short dialogue, readable English, able to advance text in beats if lengthy.
- **Next: up to three prominent stacked story choice buttons** (~31–34%): chunky, tactile, clear labeling; other counts allowed by the narrative, but three is the design test. Do not increase interface height for additional decorative flourishes.
- **Bottom of rail: three compact consistent utilities** (~8–10%). Quiet vs primary choices; no fifth mini-panel squeezed beside them.
- Padding/gaps consume the remainder; sizing percentages are guide rails for visual experiments, not final pixel measurements.
- **Mode behavior:** Conversation (portrait+dialogue+choices), Narration (contextual story text and Continue with purposeful panel treatment), Document (document illustration+text+Return) all occupy **the same rail bounds**, with scene and global footer anchored in exactly the same position. The rail may change contents, but geometry must not jump.
- In **Document mode**, utility controls can change labels as needed, but preserve their physical locations. Do not cover scene with a giant sheet unless deliberately tested later.

## Framing character (not polished generic application UI)
- Visual reference: **Terry Gilliam's film *Brazil*** in the institutional design logic—absurd, overengineered, historically accumulated, internally self-justifying—combined with vibrant 1960s-imagined future.
- Manufacture the UI from **authored pixel sprites** (corners, edges, plates, recesses, bolts, paper retainers, unusually shaped housings) rather than flat CSS-looking rounded-corner cards.
- Universal shell first; room-dependent details belong mainly to the **scene itself**, not permanent shared UI. Later test optional environmental frame skins without moving any controls.
- Physical eccentricity is **localized and intentional**, e.g. one reworked lower-right end-cap with an unnecessary inspection hinge; not several redundant mystery widgets.
- Keep a consistent low logical pixel grid and crisp integer scaling for production. Generated mockups are inspiration, not verified pixel-perfect source art.

## What previous mockups got wrong
- Multiple decorative top title/logo bars reduced scene space.
- Some variants expanded the right rail beyond intended width.
- Utility buttons drifted into the global bottom strip or changed placement.
- A **location thumbnail** occupied the far-right bottom decorative segment. This was a misinterpretation: **it must be material ornament ONLY**.
- Portuguese signage and dialogue appeared because *Brazil* was interpreted as the country rather than the film. Correct this in all future mockups.
- Overly smooth, grand and symmetrical hardware ignored the owner preference for slightly irrational features.

## Next visual-art pass and gate
Render **one complete 16:9 mockup** first in **conversation mode**, using the above exact spatial plan with English text, a wide detailed NPC portrait, three large story choices, three smaller under-choices utilities, wide inventory, optional current objective and **only a decorative frame end-cap** at lower right.

Then, reusing the *identical scene/rail/footer geometry*, compare 2–3 **genuinely different** visual material/engineering styles—e.g. mid-century civic hardware with absurd maintenance patches; ad hoc retro spacecraft console; old field station with jury-rigged components—without treating them as different gameplay layouts. No deck-building game, cursor-verb UI or generic location-portrait mini-card. Need owner review of **look and feel**, not the foundational geometry again.

## Open, by choice
- Exact runtime resolution, final margins, portrait draw density, typography, inventory name (possibly **Possessions / Inventory / Belongings**, not 'Personal Effects' by fiat).
- Whether the universal frame gets location-specific skins by chapter (not locked).
- Full voice/script/canonical character art; title of fictional institute and signage content.
- Whether the player character appears anywhere; currently omitted in these mockups for clarity.

**Approval line:** owner has directed enough layout details to hold the structure steady in concept art. This is a partial lock; production UI code and assets are not authorized.

## Behavior update — 2026-10-30
The owner chose an in-world **choice-list scrollbar with reserved width even when inactive**, independently authored **detailed item closeups in the right rail**, **responsive/satirical objective text**, and a **single default frame with optional major-setting skins only**. These are documented in [M1 Interaction Decisions 01](13_M1_INTERACTION_DECISIONS_01.md); the 70/30, 10% footer, no-top-banner and utility-button geometry remain unchanged.
