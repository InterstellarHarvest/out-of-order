# Chapter 2 Batch 1 — source and continuity brief

This is an artwork proposal grounded in the pinned playable story. Generated images require a separate visual review; this brief does not assert that an image has passed review.

Artwork worktree baseline: `cf575552fc729b952d99d25bea56dbc81b40619d` (`agent/ch01-art-batch05-interactive-states`). Authoritative narrative/catalog: `e98602f7992908a750672006f556b8efc15d686f` (`agent/scene-pickup-inspector-20261115`). The three files below were read with `git show` at that exact commit. They must not be copied over the worktree's older narrative files or merged into this art-only branch.

| Pinned source | SHA256 of exact git blob bytes |
|---|---|
| `story/chapters/chapter-02.draft.json` | `a415ae13537d6c8d13204100c803ab1850d249412bc8fa6fc6d2a2282a935923` |
| `story/artwork.draft.json` | `21103c5b0115c698d41475603ae4d91f984a17642e4f8275352aedeab4c36fd1` |
| `story/items.draft.json` | `b18be0d8ba2f62a25b5684f4f81d8847791849c8342b3ffab2cdfa40454fc067` |

## Narrative sequence

All Chapter 1 exits converge on the Public Conveniences Bureau. The plant/public route follows conveniences signs; Martin's route reaches the rear; the equipment route carries the household-property wristband; the reset route seeks to appeal the House's declaration that bathroom needs are fulfilled. These are arrival text variants for one Bureau scene, not four buildings. No player body, carried item, wristband or adopted desk plant needs to be permanently painted into it.

`bureau_arrival` → `bureau_emergency` → `gardener_arrival` → `gardener_choices` establishes the five scenes' common physical setting. A machine enters the government office; the story does not move to an unrelated workshop for its conversation.

| Asset / registry identity | Source-grounded staging and constraints |
|---|---|
| A — `biology_park/conveniences_bureau` | Every restroom door is sealed by emergency order. The room remains a recognizable public office with filing cabinets and facilities pictography. `bureau_emergency` specifies fine green roots splitting the wall around a sink pictogram, miniature jungle beyond the windows, and cabinets beginning to move. The notice reads “FACILITIES SUSPENDED PENDING HABITAT EXPANSION REVIEW.” Use a short readable closure cue and graphic notice marks if the full sentence cannot fit cleanly at 314×206. Do not fill the office with mature forest yet. |
| B — `biology_park/groundskeeper` | The enormous nonhumanoid machine pushes through the wall, trailing irrigation hoses and stamped forms. It presents a soil bin, feeder full of seedlings, small inspection window and planting arms that measure the room. Its speaker/inspection module and seed feeder are identity anchors. The machine announces additional growing area and politely requests clear desks; it does not understand an emergency. Its display reports 178 percent habitat compliance and HUMAN OFFICE BOUNDARIES EXCEEDED. Do not draw these as tiny unreadable prose, eyes or a face. |
| C — `biology_park/formal_entrance` | `gardener_promotion` issues a pale green Acting Director credential from EMERGENCY MANAGEMENT; `formal_park_entry` is the locked administrative entrance recognizing it. A mechanical turnstile salutes with one arm. Compose a substantial institutional greenhouse threshold with credential reader and encroaching plants. Keep the station usable without baking in player hands or an acquired badge. |
| D — `biology_park/service_entry` | In `gardener_jam_success` the red stapler jams the feeder, the machine unfolds an inspection hatch and the player escapes through machinery to service access beside the Park. `sorter_escape` also uses this scene after reaching a high inspection hatch and crawlspace. A neutral maintenance passage/hatch scene supports both; a permanent stapler, feeder damage or sorting-conveyor death machinery would overfit one route. Include pipes, panels, fixtures and biological intrusions. |
| E — `biology_park/jungle_junction` | `park_junction` explicitly establishes an immense artificial sun, elevated offices beyond the canopy, encroached boardwalks, flowering footpath exhibits and an operating automated Nature Tram. Three choices lead to the Environmental Control Tower, exhibits on foot or tram. The view must distinguish those three approaches visually while retaining unmistakable greenhouse infrastructure. `garden_after` reuses this registry scene, so its neutral anchor view should not imply a one-time arrival state. |
| F — groundskeeper scene `portraitBackground` | Independently authored opaque 564×278 closer office-invasion viewpoint, with matching architecture/light and no machine baked into the background. The source catalog explicitly calls for a tight matching POV, not another wide corridor or a resized main scene. |
| G — `groundskeeper:idle` | Transparent 564×278 foreground. The pinned catalog explicitly requests a tight view of the speaker/inspection module and seed feeder. The machine is nonhumanoid, austere and industrial; actual clear alpha outside the sprite, no opaque backdrop. Match B's mechanism identities and F's perspective so future poses can share F. |

The performance-review route passes through a maintenance aperture directly to `park_junction`. It does not require a new route or story edit. The successful hopper route reaches an irrigation trench and then the junction; its planting-hopper scene belongs to a later batch. The failed feeder-jam route first uses `biology_park/sorting_conveyor`, also outside this batch.

## Downstream continuity to reserve

The Environmental Control Tower begins tidy with unoccupied desks, sign-off stamps and excellent approval capacity. Later spore ventilation can push a visible green plume through a glass duct into the tower and cause leaves at its windows. Keep the junction tower recognizable and reserve this state change for a later variant. The tower is an administrative structure, not a fortress.

The pedestrian route leads through pale spore-releasing blooms, a dead ventilation fan and damaged maintenance catwalk, then moving trees on concealed tracks or an irrigation grading route. A central flower eventually connects through heavy cables to physiological sensors and punched-paper translation equipment. These are functioning botanical exhibits and bureaucracy; Batch 1 need not reveal the central flower's whole narrative in advance.

The Nature Tram is an automated public tour, with taped containment reassurances, molded passenger seats and later pale motile plants boarding. Later branches include a reserve siding and a distinct reserve tram with an inactive recessed molded-plastic concierge face. That later character is not permission to give the Groundskeeper a face. Reserve tram, abandoned station, concourse crash and Lower Irrigation Services are separate future locations.

## Established style and boundaries

The pinned catalog supplies 1960s industrial gray/slate/cream/teal bureaucratic futurism, clean flat pixel clusters and economical colors. Exposition continuity uses straight lintels, square muted-teal posts, gray panels, matte tiled floors, cream service furniture, teal glazing mullions and compact rectangular lights. Use these as family resemblance, not a requirement that every room be another reception.

Chapter 1's later House direction deliberately establishes warm ivory, blond veneer, pale aqua and coral domestic showroom colors. Biology Park returns to colder institutional steel/concrete/glass with biological greens; it should not become a warm House interior with plants added. Preserve Chapter 1 production art and every earlier generated source.

No people, humanoid robot stand-ins, cartoon faces, steampunk/brass, decorative gears, fantasy towers, modern touchscreens, heavy grime, ruin aesthetic, noisy dithering or UI framing. Human pictograms remain flat signs rather than occupants. The five main scenes are opaque 314×206 PNGs with exact 4× nearest-neighbor previews; portrait layers are independently authored at 564×278, background opaque and foreground RGBA.

This assignment authorizes new art-only candidates, review artifacts, commit and branch push. It excludes narrative/registry edits, gameplay or inventory changes, production promotion, merge and deployment. Candidate metadata should keep status `generated` and runtime `assetPath` null.
