# M1 — Detail and control comparison 01
**Date:** 2026-10-30 · **Status:** design-only visual study, owner review pending. Not a new gameplay implementation, final art approval, or technical lock.

## Purpose
With the core 16:9 C+ layout and interaction rules held constant, compare three independent remaining dimensions:
1. **Visible inventory count:** six wide / seven balanced / eight compact slots.
2. **Scrollable dialogue hardware:** angled rocker / thumbwheel-like control / elevator slider, each in a **permanently reserved 32px-wide column** (reference 1600x900 mockup scale, not runtime contract).
3. **Detail density:** coarse scenic drawing with (A) similarly coarse portrait, (B) richer independently drawn portrait, or (C) richer portrait and more finely detailed frame edging.

Additional controls allow 3 or 8 conversation choices, 2/7/12 items, inventory page changes, and changing the right rail to item inspection without moving the scenic region. Mockups deliberately use primitive hand-authored pixel placeholders so control geometry can be judged separately from scenic artwork.

## Exact fixed geometry in lab
1600x900 drawing board; top 810px has left scene 1120px and right rail 480px; lower 90px contains wide inventory (~768px), short objective (~432px), and **decorative end-cap only** (~400px). No top information banner. Full-width speaking portrait. Three small utilities below story choices. English-only strings.

## Portable lab
A **v3 offline HTML lab and ZIP** plus three comparison-sheet PNGs were delivered as conversation attachments on 2026-10-30. The HTML is a visual prototype, not part of the production source tree. Its files have **not** been committed to this repository; this document preserves its behavior and review criteria independently of that attachment.

## Test result
A headless Chromium session loaded the exact self-contained HTML contents and checked the following with no JavaScript page errors:
- Inventory switches between six, seven and eight visible slots.
- Eight responses are authored and retained in the choice list.
- A twelve-item inventory can page to the second bank, select an object, display it in the right rail and Return to dialogue.
- The scene/right rail/footer remain fixed; the first choice had **identical horizontal x and width** in the 3- and 8-choice cases (observed x=1156.47, width=289.09 in the test viewport).
- Dialogue scrolling to 260px before item inspection restored to 260px afterward.
- Three scroll visual styles and three portrait/frame detail styles were selectable.
- The ZIP structure was checked and JavaScript syntax passed.

Testing caveat: Chromium blocked navigation to a local `file://` URI in this sandbox (`ERR_BLOCKED_BY_ADMINISTRATOR`). Browser tests instead used `page.set_content` with the **same exact self-contained HTML**, which rendered and exercised correctly. Local double-click launch on the owner's computer is expected but not independently verified here.

## Observations and provisional recommendation
- **Seven visible slots** is the first preference for balancing item recognizability and available slots, but the owner should inspect six and eight at normal display size. Seven is **not locked**.
- Favor **clearly recognizable physical scrolling controls**, with permanent reserved horizontal space; whether rocker, wheel, or slider wins is open. A scrollbar must not be mistaken for a browser widget.
- Favor **coarser scene art with more expressive portrait and sharp frame art**, inspired by Trans-plant's intentional different menu-versus-game art density. These test portraits are primitive geometric studies and do not establish production sprite art quality.
- One reusable default frame remains the direction. Distinct skins, if any, only for radically different setting categories, not room-to-room.
- Do not overfill rail/dialogue and inventory with unnecessary per-room flavor or status widgets. The bottom-right is exclusively *material character*, not a thumbnail/quest area.

## Still requiring owner art/design judgment
1. Six, seven, or eight visible item slots?
2. Which scroll mechanism feels most legible and natural in a fictional 1960s-future manufactured interface?
3. Does the portrait-only or portrait+frame detail upgrade feel better against the coarse main scene?
4. Are any of the controls visually too slick, cramped, fussy or modern?

When reviewed, lock these M1 details and test a final **production-style art language** at a consistent grid rather than moving to full game systems. Preserve older rejected approaches in the design archive.
