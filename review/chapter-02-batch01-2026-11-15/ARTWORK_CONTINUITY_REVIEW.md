# Biology Park Batch 1 — observed artwork continuity review

Reviewed the final five-scene native contact sheet, the native Groundskeeper composite, standalone opaque portrait background, transparent-foreground checkerboard preview, and the 4× Jungle Junction preview. These are generated review candidates, not approved production assets. Technical figures below come from [qa.json](qa.json); export details are in [README.md](README.md), exact paints in [palette.json](palette.json), and narrative grounding in [STORY_CONTINUITY.md](STORY_CONTINUITY.md).

## Scene sequence

A establishes a mostly intact public office: three teal restroom doors with facilities pictograms, a broad closure stripe and posted notices, gray tiled floor, filing cabinets, a service desk and chair, square teal framing, fluorescent ceiling panels and greenhouse glazing. Small vines at the glazing and ceiling edge begin the intrusion without turning the office into a jungle. No people appear. Its quiet broad surfaces provide a useful low-density starting point.

B repeats recognizable Bureau features: restroom doors and stripe on the left, filing cabinets, ceiling panels, gray floor and foreground desk. The machine occupies the broken glazed architectural opening to the right, leaving rubble, plants, forms and hoses in the office. This reads as the same location after invasion rather than a separate workshop. The Groundskeeper's broad roller/seedling feeder, tracked body, angular soil hopper, hose runs, planting appendages and rectangular speaker/inspection module establish a recurring industrial identity. Its asymmetric mechanisms avoid a humanoid silhouette; the display and grille are functional equipment rather than eyes and a mouth.

C opens the scale into a large ribbed greenhouse entrance. The BIOLOGY PARK marquee is a clear major sign; the turnstile, dedicated reader pedestal, paired administrative piers and encroaching foliage communicate an official threshold. Teal structure, gray machinery and pale enamel continue the Bureau's material family. It has a public institutional function distinct from the office.

D is recognizably the less respectable service route: a low open inspection hatch at lower left, trailing corrugated hose, metal grating, prominent pipework and valve, maintenance panels and a narrow passage toward greenhouse growth. The utilitarian scale and fixtures contrast clearly with C's substantial public gate. It does not paint a stapler into the feeder or otherwise force the successful-jam route onto every use of this scene.

E supplies the chapter's strongest geographic anchor. A giant ribbed glass enclosure and one large suspended circular artificial sun make the indoor controlled environment unmistakable. A raised administrative office/control structure with a climbing walkway sits left, a pedestrian exhibit boardwalk proceeds into foliage at center, and a sheltered tram platform, vehicle and rails occupy the right. These three routes can be recognized from their physical forms even when small sign lettering cannot be read. Layered biological greens dominate while glazing, pipework, rails, handrails and structure remain visible.

The current candidate convention for future batches is therefore **tower left / exhibits center / tram right** in this junction view, under one artificial sun. This is screen-space art staging, not a new compass bearing or change to Chapter 2 routes.

## Portrait pairing

F is a separately composed closer office-side view: the restroom door and sink/WC symbol remain at left, a tilted filing cabinet sits beside the broken opening, and the same teal structure, fluorescent lights, tiled floor and greenhouse foliage establish the setting. The machine is absent from F. The framing is tighter and more detailed than B rather than an enlarged copy of the world scene.

G preserves B's key identity: horizontal rectangular inspection/speaking module, vertical speaker grille, emitted paperwork with a red stamp, seedling-filled feeder above a broad roller, soil hopper and gardening emblem, tracked base, hoses and mechanical planting appendages. The composite gives those mechanisms most of the frame while retaining enough of the Bureau to establish viewpoint. Lighting and gray/teal materials fit the background. The foreground intentionally reaches the right and bottom canvas edges; it is a tight conversation crop, not a complete machine turnaround.

The checkerboard inspection shows genuine transparent space around the machine rather than an opaque environment rectangle. Final G has 69,909 fully transparent pixels and 86,883 opaque pixels (55.41% coverage), with alpha values only 0/255 and zero hidden RGB. The generated source alpha remains preserved unchanged; the final export samples it with NEAREST and thresholds at 128 to remove fractional fringes and near-opaque interior coverage. F and G share the same origin and can be independently drawn or replaced. Future poses must preserve the module/feeder/hopper relationships and this background perspective.

## Palette, density and limitations

The common 64-paint export palette combines 48 learned material colors with 16 reserved signal, soil, leaf and light paints, without dithering. The reserved reds keep closure stripes, the service valve/handle and the Groundskeeper's red detail distinct; greens remain biological against gray machinery and teal glazing. This colder institutional setting is visibly separate from Chapter 1's warm domestic showroom palette.

The technical checks report exact contracts for all seven files and exact nearest-neighbor 4× previews. They also verify 491 tracked baseline PNG/story/game files remain byte-identical. These checks establish export correctness and preservation, not automatic visual approval.

D and E are visibly denser than A: grating, pipes, greenhouse ribs, foliage tips and layered leaves produce fine one-pixel transitions. The measured isolated-four-neighbor fractions are A 10.92%, B 16.23%, C 14.75%, D 17.57% and E 19.64%. Some of these are purposeful plant/glazing detail, but D/E do carry a busier texture than the quiet Bureau and the requested broad-cluster ideal. Future batches should preserve clear foreground silhouettes and simplify repeated foliage/grating patterns where possible. Do not add further noise merely to match these numbers.

Small generated lettering is imperfect. Several notices and the junction direction labels contain compressed or malformed characters; the specimen-route wording includes a missing letter. The large BIOLOGY PARK title and the physical route silhouettes work better than the small prose. These candidates must not be treated as delivering fully legible exact narrative notice text. The full closure wording remains in the authoritative story. A later typography cleanup, if requested, should use short accurately drawn native-grid labels or deliberate nonletter marks; it must preserve the original generation and should not change routes.

The overall progression is coherent: functional office, same office invaded by polite landscaping machinery, two distinct entry architectures, then an immense engineered jungle. The main limitations for owner review are the fine detail density in D/E and imperfect small signage. No narrative, runtime or production-art changes are implied by this review.
