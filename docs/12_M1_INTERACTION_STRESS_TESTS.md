# M1 — Interaction stress tests and pixel-density hierarchy
Status: earlier UI design tests, preserved as history. The four follow-up interaction choices were settled in [M1 Interaction Decisions 01](13_M1_INTERACTION_DECISIONS_01.md). No game implementation.
Date: 2026-10-29. Baseline: [partial layout lock](11_M1_PARTIAL_LAYOUT_LOCK.md).

## Goal
Resolve real-world behavior **before** freezing the layout: more inventory items than fit, 8+ nuanced dialogue choices, item inspection and return, and different physical pixel densities for scene/portrait/frame. Owner permits neutral blank placeholders for scene and portrait to prioritize frame tests.

## Evidence from Trans-plant
The current Trans-plant title/menu uses a detailed 1536x1024 painted master of an observation deck with live HTML buttons/text mapped onto two terminal screens; a universal foreground overlay permits four swappable exterior views. The title's high-fidelity art is distinct from the regular game's lower-resolution pixel UI. Its inventory icons are explicitly rendered crisply. This validates **purposeful detail hierarchies**, not automatically using painted art in CYOA.
Sources in InterstellarHarvest/Trans-plant: docs/RULINGS.md (rulings 111, 113, 114), resources/sprites/interface/menu/, resources/demo-title.html, resources/screen-inventory.css.

## Unchanged geometry — binding to every new mockup
- Entire screen 16:9, **no top title/header band**, just thin ornamental frame trim.
- Upper 90% of height: **70% left illustration/scene**, **30% right contextual story rail**. Approximate 4:3 illustration within left region.
- Bottom 10% of height: **wide inventory on left (~48% total width)**, **contextual short current objective (~27%)**, **pure decorative frame end-cap on right (~25%)**. End-cap MUST NOT be an information block or location thumbnail.
- Right rail: **wide, substantial NPC portrait** when speaking; dialogue; stacked narrative choices; **three smaller utility buttons directly BELOW the choices**. Portrait/scenery stay fixed when rail contents change.
- **English-only text**. Film *Brazil* is aesthetic inspiration; it is not permission to generate Portuguese signage.
- Reusable sprite-built physical frame with lightly irrational machinery/repairs; no NPC/place-specific plaques built into common trim.

## Inventory — test proposal, not a limit
**Try seven visible slots** (test 6, 7, 8 if icon size dictates); object count may exceed visible slots. Put **left/right mechanical arrow rockers** at fixed outer ends of the strip; stay visually recessed/inactive when not needed. At 8+ items, page in banks of seven, with a quiet label such as '1–7 of 12' / '8–12 of 12'. These should be visually recognizable as paging controls, not new inventory slots. Item icon highlights selection, focus and newly acquired state. No deck building, no hand of cards, no arbitrary carrying cap implied.

Test 2 items, 7 items and 12 items; select item on second page. Compare labels 'Inventory', 'Possessions' and 'Belongings'; do not prematurely lock 'Personal Effects'.

## Dialogue — don't inherit Fallout 3's forced four-options layout
Usually 1–4 choices, occasionally 6–10+ where the situation genuinely offers them; never manufacture good/evil/dumb spokes. **Keep the portrait and dialogue stable. Only the choice region scrolls.** First test approximately **three visible answer rows**, an unmistakable up/down **recessed rocker or track** and a position marker (e.g. 'Choices 1–3 of 8') when there are more. Normal 2–3 choice scenes should not show fake filler buttons. Long choices wrap. Keyboard focus, scroll wheel inside choices, touch gestures, and accessible arrow controls should all be plausible. Preserve the current choice scroll position while inspecting an item.

NPC speech can advance in short legible text beats rather than shrinking the portrait or enlarging the rail. There should be no fixed **number of choices**, only a **number of visible choice rows**.

## Inventory click — default to contextual right-rail inspection
Selecting an item highlights its slot and **temporarily replaces the rail content**, not the large illustrated scene. Right rail then shows enlarged item sprite/paper, title, readable description and only contextually meaningful actions ('Read', 'Use', 'Show', 'Return'). Other utility buttons retain their physical locations, though labels can change by mode. Stage and global footer remain stationary. Return/Back or Esc or selecting the same inventory item again closes inspection; picking a different inventory item replaces the detail view. After closing, restore dialogue text and precisely the prior choice-list scroll position. A rare story-specific closeup may deserve full-stage treatment later, but is not default item UX.

Test an ordinary tool, a long appointment slip, an item on inventory page two, a context-sensitive Use action, and closing back to a dialogue with 8 responses.

## Three different artwork pixel grids (study, not production spec)
1. **SCENE:** slightly coarser 16-bit-inspired background and small on-scene characters. Some background signage may be suggestive rather than literally readable at that distance.
2. **NPC PORTRAIT:** independently drawn close-up, potentially **twice the logical detail per width** for facial expression, clothing, and hints of the environment behind the character. Do not merely blow up a tiny sprite. Sometimes a small background gag becomes readable in the close-up; avoid hiding progression-critical evidence in inaccessible pixels.
3. **FRAME + CONTROLS + TEXT + ITEMS:** sharper, with density similar to portrait (or an intermediate option), but still pixel-authored rather than smooth vector cleanliness; slightly asymmetric engineering, repairs, mismatched panels, improper fitting. It should not seem from another visual genre.

**Integer-scale example only:** On a 1920×1080 target, the 320×180 base composition would scale by 6x, while a 640×360 higher-detail frame/portrait layer could scale by 3x. Both are hard pixel sizes and share the same physical bounds. At 2560×1440 they could use 8x and 4x respectively. For arbitrary browser window sizes, scaling and letterboxing behavior still requires later study. Do NOT lock exact raster sizes from this example.

Compare same-density vs portrait-doubled vs portrait+frame-doubled. UI text must remain readable independently of scenic pixel density.

## Stress-test mockup set
- **A — Normal:** 3 medium dialogue responses, 2 occupied inventory slots, detailed placeholder portrait, full 16:9 shell.
- **B — Many choices:** 8 varied-length replies, 7 inventory items, visible choice paging/scroll rocker, stable large portrait.
- **C — Inspect item:** 12 inventory objects, second bank shown, large item description in the right rail, explicit Return/Back.
- **D — Long document:** an item with several paragraphs, clear internal text scroll and restored previous mode on close.
- **E — Density comparison:** same A composition with coarser scene and higher-detail portrait/frame, checked for sharpness and cohesion.

Every mockup uses the identical outer frame geometry and English placeholder labels so differences are informative. No generic modal over the scene, no location thumbnail, no top banner, no point-and-click verb bar.

## What remains open until the owner can compare
- 6 vs 7 vs 8 visible slots and choice scroll style.
- Whether inspection fits in the rail when text is unusually long.
- Portrait/frame pixel-density ratio and visual material family.
- Whether frame skin changes for major environments, and how far.
- Exact runtime pixel sizes, keyboard bindings, and inventory capacity / sorting rules.

**Next deliverable:** static placeholder-driven stress-test compositions, then (only if useful) a click-through *design mockup*, not a production gameplay engine.
