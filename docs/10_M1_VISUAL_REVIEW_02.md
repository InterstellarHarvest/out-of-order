# M1 Visual Review 02 — separate the winning scene from the winning UI
**Review date:** 2026-10-29. **Status:** owner preferences and suggested next design experiment, NOT UI lock.

## What the owner said about the stylistic variants
1. **Variant 3's portrait is the only one filling the available portrait width.** That is preferred. The other variants introduced little add-on plaques, tabs, strips or badges around the portrait, often tied to the featured receptionist or reception facility.
2. **Variant 2 has the most distinctive absurdist retro-futuristic world detail.** Its environment is more compelling than the relatively polished, monumental lobby treatments of the other variants.
3. The owner is concerned that a rail designed for a *specific room or NPC* will be difficult to reuse across a much bigger story.
4. The owner suggested a possible alternative: **change the frame's look between major locations** (for example, an off-world spaceship could have a different frame). That is **a candidate**, not a decision.

## Synthesis — recommended design direction
- **Scene/world character:** lean toward Variant 2: inherited infrastructure, peculiar procedures, practical clutter, mildly irrational layouts, institutional edits built over earlier decisions. Seek *Brazil*-like logic and imaginative differences, not merely more posters, scattered papers or added grime.
- **Portrait presentation:** borrow Variant 3's **full-width, large portrait window**, preserving strong facial presence and avoiding add-on strips that steal portrait space.
- **Frame architecture:** design a **reusable modular 16:9 shell** containing a ~4:3 scene and a contextual story rail. Its mechanics, portrait/window dimensions, dialogue region, primary/secondary button positions and touch/keyboard controls must remain consistent between scenes.
- **Visual skins (to test):** modular sprite pieces could allow changes in *materials, typography, trim and decorative motifs* for major locations/acts (civic bureau, spacecraft, field site) without rebuilding interaction design or forcing a new user-learning curve.
- **Neutral core:** avoid putting a specific NPC's name, the institute's logo or a restroom sign *into permanent shared UI frame art*. Speaker labels, official document names, and location-specific motifs are **content layers or swappable inserts**.
- **No card battler or point-and-click verbs.** Keep branching narrative and contextual inspections front and center.
- **Production pixel rule:** this visual review does not excuse semi-painterly detail; future *production* art should use intentionally consistent, lower-resolution 16-to-early-32-bit pixel-density rules.

## Why 'environment-themed UI' needs restraint
The interface is what guides the *player*, not merely an object sitting in every fictional room. A location-by-location frame change could be distracting, expensive and implausible if every chapter invents new button mechanics. Safer candidate: **a standard family of frames** with limited changeable pieces, or a frame that feels like the player's standard-issue dossier/portable terminal and can take environmental accents.

This is a hypothesis worth testing rather than deciding from descriptions.

## Next proposed visual experiment (same core layout; new scene context)
**A — Universal shell:** neutral, worn civic/administrative frame with a full-width portrait of a non-reception NPC. Put the second variant's more inventive lived-in weirdness into the **scene**. This proves the UI survives a character and location change.

**B — Environmental variant:** same exact structure and control positions, but with a spacecraft/infrastructure theme using **different frame sprites** (painted steel, gasketed inspection aperture, punched-metal switches and labeled plates). Different scene and portrait. No custom button rearrangement, overlays or excessive UI labels.

For a fair test, compare them on reuse, personality, 16:9 composition, portrait prominence, reading clarity and whether the themed version genuinely improves atmosphere. Note that switching both scene and skin makes direct evaluation of only frame styling harder; optionally include a neutral shell and themed shell over the *same* spacecraft scene to isolate the frame comparison.

## Questions to leave open
- Should the player experience a consistent 'personal device' UI or an omnipresent editorial game frame?
- If themes change, when? Chapter/major environment/transport mode, not every room/NPC by default.
- Should frame hardware itself subtly accumulate revisions as story progresses?
- Is Variant 2's scene compelling because of procedural oddity, worn material, density, asymmetry or the composition? Test which.
- Is there enough space at 30% rail width for full portrait AND readable dialogue? Test with honest sample text rather than a decorative stub.

## Important distinction
**Selected owner feedback:** Variant 2 for scene-world oddness; Variant 3 for wide portrait; concern about location/NPC-specific static decorations. **Recommended next prototype:** stable reusable frame with potential interchangeable location themes. No final art lock or implementation approval.
