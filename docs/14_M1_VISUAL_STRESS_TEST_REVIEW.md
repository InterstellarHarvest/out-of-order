# M1 — Visual stress-test review package (awaiting owner notes)

**Status:** Visual concepts produced; **no layout or art locks added**.
**After:** [M1 Interaction Decisions 01](13_M1_INTERACTION_DECISIONS_01.md).

Three image-led studies were generated during the review:
1. **Single-screen lobby** showing approximate 16:9 shell, 70/30 scene and rail, full-width NPC portrait, four visible narrative responses with a vertical mechanical choice-control slot, three utility buttons, inventory page arrows, short objective and a decorative mechanical end-cap.
2. **UI and material comparison sheet** with standard dialogue, 8-choice overflow, enlarged object inspection and candidate common-shell material skins across civic/spacecraft/field environments.
3. **Four-state comparison sheet** with standard dialogue, longer dialogue list, item close-up and document inspection, plus detailed inventory/scroll/frame component studies.

## Observations
- Across the concepts, a **vertically constant scroller channel** adjacent to the choice list is visually viable; a finalized prototype must check that text never shifts when activated.
- Seven visible inventory icons **plus fixed paging arrows** is a credible first study, but not locked; assess at actual desktop size with crisp logical pixels.
- Enlarged badge, key and note views in the **right rail** preserve the illustrated scene and support distinct sprite-resolution tiers.
- **Only the first image is a full-screen mockup**; the other two are deliberately comparative *design sheets* and must not be mistaken for finished 16:9 screen exports.
- The generated image textures still display some painterly/blended detail; **none is true pixel-perfect production art**. Geometry and legibility require engineering validation.
- Some generated studies show four visible choices rather than the three-target scroll budget. The *visible choice count* remains open, while **unlimited meaningful conversation options and a permanently reserved custom-scroll footprint are owner-selected**.
- The material examples risk feeling generic 'weathered steampunk' rather than specifically 1960s retro-futurism and Gilliam's bureaucratic absurdity. The next art pass should distinguish those and remove unnecessary signage/ornaments.

## Owner review criteria
1. Does an always-reserved mechanical scroll track feel unobtrusive when only 2–3 choices exist?
2. Should the *normal* right rail reveal three or four reply rows before requiring scrolling?
3. Are **seven slots + left/right page rockers** large enough to read at normal screen size? If not, prefer six larger slots over a larger inventory region.
4. Does the right-rail object close-up feel useful without hiding the setting?
5. Which physical elements are worth preserving in a *default* shared frame, and which are distracting?
6. Does the finer portrait/frame art feel complementary rather than jarringly more detailed than the scene?

## Locked owner constraints to keep
English text only; full 16:9; no top banner; ~70/30 scene/story rail; framed large portrait; flexible-depth dialogue with a custom scroll control whose width is always reserved; three utility buttons directly beneath choices; wide paged inventory, reactive dryly funny objective, and **decorative material only** in the far-right footer. Same common frame in ordinary rooms; rare cosmetically different frame only for genuinely different setting types. Scene/portrait/item/frame pixel densities can differ intentionally but must use deliberately crisp, nonblurred grids.

**Next gate:** owner comments on this visual test. Then revise the chosen physical scroll and inventory architecture and seek a **specific M1 visual lock**. No game implementation started.
