# Biology Park — visual direction for future batches

Working art direction, grounded in the pinned Chapter 2 sources documented in [STORY_CONTINUITY.md](STORY_CONTINUITY.md), now supplemented by observed Batch 1 candidates. This sheet distinguishes narrative requirements from art staging conventions. It is not owner approval of generated candidates. See [ARTWORK_CONTINUITY_REVIEW.md](ARTWORK_CONTINUITY_REVIEW.md) for observed strengths and limitations.

## The visual premise

An immense controlled botanical exposition has outgrown its boundaries while its government machines continue approving the growth. Keep a legible engineered exhibition beneath the foliage: institutional glazing, substantial structural bays, enclosed artificial climate, aluminum/enamel machines, concrete maintenance spaces and mundane mechanical access control. Growth looks biological and sometimes purposeful. The humor comes from a polite working system continuing the wrong task.

Progression for Batch 1: a mostly functional sealed facilities office → the same office invaded by a landscape machine → either the formal credential gate or a cramped service aperture → the immense jungle junction. Escalate the proportion of greenery and scale of enclosure as the sequence advances. Retain clear paths and large readable machinery silhouettes at native resolution.

## Palette and material proposal

These are color-role anchors for generation and later continuity, not a mandatory indexed palette or a claim about measured output colors. Candidate QA should report actual colors separately and retain source images before any controlled color processing.

| Role | Proposed anchors | Use |
|---|---|---|
| Structural darks | `#26363B`, `#43575D` | Beam undersides, machinery cavities, restrained outlines. Avoid pure-black expanses that turn the Park into a horror ruin. |
| Industrial body | `#7E969C`, `#B6C1BD` | Steel-gray enamel, aluminum, pipes and service fixtures. Broad planes with a few hard shade steps. |
| Institutional pale | `#D9DDCF`, `#ECEBDD` | Concrete light planes, signs, molded panels; cooler and less buttery than the House. |
| Exposition teal | `#416E68`, `#688E81` | Structural posts, glazing mullions and controlled access hardware, subordinate to actual plant greens. |
| Biological greens | `#284D38`, `#4B7046`, `#789457`, `#A9B778` | Dark understory through broad leaf highlights. Distinguish leaf masses with shape/value instead of noisy texture. |
| Signals | restrained amber `#D1B55F`, muted red `#A7634D` | Limited closure warnings, mechanical indicators and safety fixtures. Never a warm domestic dominant. |

Glass should show straight mullions, deliberate hard reflections and visible depth into a climate enclosure. Plants are not camouflage for missing architecture. Soil belongs in bins/beds or credible intrusions; no universal mud texture. Enamel panels, plastic housings and aluminum tracks carry a few useful seams/fasteners without decorative rivet noise.

## Current Batch 1 export and continuity anchors

The current generated candidates establish a cold gray/teal institutional shell, pale signage and biological leaf greens. Their actual shared palette uses **64 paints: 48 jointly learned material colors plus 16 reserved signal/soil/leaf/light paints**, without dithering. The role anchors above remain design guidance; [palette.json](palette.json) is the exact export palette. The first palette-processing pass remains preserved. [README.md](README.md) documents reproducible normalization and [qa.json](qa.json) records measurements.

The observed junction establishes **elevated tower and climbing walkway left, pedestrian exhibits center, sheltered tram platform/vehicle/rails right**, under one manufactured overhead sun inside the giant ribbed greenhouse. Future batches should quote this screen-space arrangement when referring back to this viewpoint. It does not establish compass bearings or change routes.

The Groundskeeper's current identity anchors are its rectangular horizontal inspection/speaker module with vertical grille, paperwork outlet, seedling tray above a broad heavy roller feeder, soil hopper with gardening emblem, tracked base, hoses and mechanical planting appendages. The portrait is a closer office-side view retaining the left restroom door, tilted filing cabinet and broken glazed opening. Match this actual arrangement for future poses rather than inventing a second machine.

Final foreground G uses nearest-neighbor sampling of the generated alpha followed by a threshold at 128 to obtain binary 0/255 coverage, with zero RGB outside the silhouette. The untouched generated alpha remains in the raw source. The final tight crop intentionally reaches the right/bottom canvas edges. Preserve raw files when preparing later variants.

Small generated labels are imperfect, and D/E contain more fine glazing/foliage/grating detail than A's broad office surfaces. These are disclosed review limitations, not a future target for higher density. Navigation should continue to rely on architecture, clear silhouettes and pictograms; refine short labels only through separately preserved revisions.

## Location grammar

The Bureau has modular wall bays, sealed restroom leaves, facilities/sink pictograms, closure notices, administrative cabinets, institutional glazing and early root cracks. Its office shell should still feel serviceable. Give B and the portrait pair recognizable pieces of that same shell, not a second government office with unrelated fixtures.

Formal entrance: ample institutional threshold, greenhouse glazing, credential hardware and turnstile. Service entry: lower, narrower, practical inspection access, pipes, cable/panel runs, grate or concrete passage. Both belong to one complex but their functions should be unmistakable. Do not reuse a ceremonial gate for the escape hatch.

Junction: preserve a coherent three-way read. One route visibly aims toward elevated administrative offices/control tower, one is a pedestrian exhibit boardwalk, and one reaches or follows an identifiable tram route/platform. One unmistakable overhead artificial sun/illumination assembly and the greenhouse structure remain visible. A proposed screen-space placement may establish these relationships, but no compass bearing or surveyed floor plan is narrative canon. Record the actual accepted candidate's layout before later environments quote it.

The tower's initial state remains orderly. Spore inundation is a later conditional event; broad collapse, flames or a ruined tower would contradict its first scene. Exhibition placards, path rails, irrigation fixtures and tram infrastructure can unify future scenes without copying the same composition.

## Groundskeeper identity and layered portrait

Lock the approved candidate's asymmetrical arrangement of three recognizable systems before recurring work: a heavy seed/seedling feeder, soil/seed storage body, and distinct speaker/inspection module. Keep these relationships consistent in B and G even though the portrait is closer and more detailed. Hoses and planting mechanisms read as landscape equipment, not humanoid arms/legs. No paired eyes, mouth, face, mascot body or threat posture. Politeness is expressed through orderly mechanisms and bureaucratic equipment.

F is an independently generated tighter view of B's office breach with matching camera direction, material and light. It contains the environment without the machine. G uses the same 564×278 canvas origin and is genuinely transparent outside the machine. Its speaking/inspection module and feeder must fit the portrait composition. Keep independent background/foreground assets so another pose or module animation can be substituted without repainting the office. A composite is review evidence, not a third runtime portrait asset.

Record crop/normalization transforms and any alpha processing. Never create F by enlarging B, or G by retaining an opaque scene rectangle. Preserve native alpha from the built-in workflow and inspect edge halos on light and dark review backdrops.

## Pixel and signage contracts

Main scenes are exactly 314×206 opaque pixels. Review at native size and exact nearest-neighbor 4× (1256×824); no smoothing or browser fractional scaling. Favor broad clusters, stepped silhouettes, flat colors and purposeful highlights. Avoid dither fields, scattered single-pixel speckle and faux-pixel antialiasing. A restrained palette is a visual objective; a blind cap is not a substitute for checking shape readability.

Portrait background and foreground are exactly 564×278, with independently authored finer detail. Foreground is transparent RGBA. Additional 4× portrait previews are diagnostic only; normal portrait presentation remains 1× according to the existing project contract.

At native size, reserve readable words for one or two short focal signs. Prefer CLOSED, a short facility label, simple arrows or genuine pictograms over long generated sentences. Distant notices and stamped forms should use nonletter bars/stamps. Keep important narrative notices in the story unless a larger independently authored view can carry them clearly. Do not bake UI frames, captions, navigation controls or watermarks into image assets.

## Future-batch continuity checks

For every new Park scene, identify its connection to a named Chapter 2 route and a recognizable material/structural family. Check whether it is a neutral reusable location or a conditional state. Do not bake player inventory, credentials, infection, a jammed stapler, spore-inundated tower or acquired-item absence into a neutral scene without explicit separate state variants.

Maintain the junction's established artificial sun, greenhouse scale, tower silhouette and tram vocabulary. Reuse the Groundskeeper's actual accepted module/feeder arrangement for recurring portraits. The later reserve tram's molded concierge face belongs to that specific character; it never transfers to the Groundskeeper or ordinary service machines.

Technical acceptance should include exact dimensions/modes, transparency coverage and edges, nearest-neighbor preview verification, palette measurements, visual native-scale inspection, source SHA256 hashes, exact prompts, reference images, processing script and a private review gallery. Visual review should state observed strengths and material limitations rather than asserting quality from numerical checks alone. Preserve every generation and superseded version. Production integration, story changes, merge and deployment remain outside this batch.
