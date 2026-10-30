# Decision register and open questions
Updated 2026-10-29. This file deliberately separates intent from authority.

## A. Explicit owner preferences (preserve)
| Area | Current preference | Interpretation |
| --- | --- | --- |
| Project identity | CYOA repository; *The Acceptable Error* working title | Both names may change |
| Experience | Retro, branching, interactive pulp adventure | CYOA is not necessarily a simple digital gamebook |
| Emotional arc | Absurd/funny → increasingly disturbing, also strange and unpredictable | Include human warmth and occasional wonder |
| World | Alternate 1960s vision of a future in which oddities are normal | Brazil-like bureaucratic atmosphere |
| Protagonist | Completely wrong, average person thrust into story through coincidence or bureaucratic nonsense | Avoid chosen-one or covert specialist retcon |
| Mystery format | Strange world with one underlying mystery | Allow unrelated anomalies |
| Mystery theme | Technology works, but humanity misunderstands what it does | Competent scientific investigation is valuable |
| Mechanism currently preferred | The Exchange | Leading proposal; not yet canon |
| Art | True low-resolution, integer-scaled, bright chunky 16–32-bit-inspired pixels | More detail than SSS/HHH |
| NPC dialogue UI | King's Quest VI-like scene with an inset, framed, more detailed speaker portrait | Layout specifics to explore |
| On-screen protagonist | Skeptical about a visible protagonist sprite | **Undecided**, not a ban |
| 'Cards' | Physical board-game reference for items/checks, not default digital card battler | Inventory format open |
| Initial motive | Earlier incidents lead the ordinary protagonist to enter the institution solely to find the bathroom | Receptionist's bureaucratic misassignment begins the larger story |
| Running joke | Continually interrupted before reaching a bathroom | Promising comic motif; frequency/payoff not locked |
| Presentation | 16:9 outer screen, 4:3-ish main illustrated area with useful space for UI | Layout concept exploration |
| Choices | Hybrid: clear prominent main choices; subtler secondary actions | Exact styling undecided |
| Interaction focus | True CYOA / branching illustrated story; not predominantly classic point-and-click | Secondary inspection or interaction may exist |
| Design process | Written A/B/C concepts first, owner notes, then original visual mockups | No implementation authorization |
| M1 concept preference | **Concept C contextual rail** + **Concept B's larger detailed speaking portrait** | Owner's favored composite, not final visual lock |
| UI design goal | Preventing both vacant and overloaded states via consistent structure | Mode/space budgeting still to be evaluated in mockups |
| M1 variant feedback | Variant 2 is the strongest for inventive absurdist future **scene** details | Scene preference, not whole-screen approval |
| M1 portrait feedback | Variant 3's portrait fills the window width, unlike the others' extra add-ons | Prefer large full-width portrait |
| Reusable UI | Avoid permanent frame ornaments specific to one location or speaking NPC | Prefer a general/reusable frame architecture |
| Location-specific frame themes | Possibly vary sprite-built UI skin between major environments (e.g. spacecraft) | Owner suggestion under consideration, **not locked** |
| Layout partial lock | 16:9; no top header; 70% scene region / 30% contextual story rail; global bottom strip | For next concept art; sizing reference, not runtime pixels |
| Conversation hierarchy | Full-width large NPC portrait, readable dialogue, story choices, **three utility buttons directly underneath** | Fixed location, variable content |
| Global bottom strip | Wide inventory left, compact contextual objective center-right, decorative frame end-cap far-right | No thumbnail/location information in end-cap |
| Language | **English only** in all mockup dialogue, signs, labels and documents | Brazil = Gilliam film aesthetic, not Portuguese |
| UI off-ness | Frames and buttons visibly slightly irrational and physically reworked, not sleek or perfectly symmetrical | Real controls remain readable and predictable |
| Development planning | A flexible pathway through first release, with reviewable major milestones | Approved to **plan**, not authorization to implement |

## B. Favored proposals, NOT decisions
- A city such as Meridian grew from a grand scientific exposition.
- An office incorrectly assigns the protagonist examiner credentials.
- A transport network actually exchanges equivalents from elsewhere.
- Miss Voss, Dr. Rook, Marta Bell, Director Havel and Penny Vale as supporting character sketches.
- Braided branching story, repeated places with changed significance, and action-risk checks.
- Candidate UI scenes: framed background, NPC portrait inset, compact contextual choices.
- The [living roadmap](06_LIVING_ROADMAP.md) proposes M1 as the next milestone: compare scene layouts, portraits and viewpoint using a tiny vignette. This sequence is **advice** and can change.

## C. High-priority unresolved creative questions
1. **What is an Exchange?** What exactly counts as equivalent? Where are counterpart objects? What happens to originals? What constraints are knowable?
2. **What does the player do minute-to-minute?** Read and select, inspect a scene, manipulate inventory, move in world, or some combination?
3. **How is the player depicted?** No sprite / occasional sprite / always-visible avatar / portrait only?
4. **What is the art composition?** Portrait frame location, dialogue area, UI density, palette studies, scene aspect ratio, accessibility.
5. **How does risk work?** Dice or other checks, how frequently, when failure branches, and whether chances are visible.
6. **How does inventory work?** Objects and documents without importing card-game/deck tropes.
7. **How wide is the adventure?** Single exposition city, outlying settlements, orbital facilities, or other destinations?
8. **What makes the Exchange mystery fair?** A stable internal explanation, planted clues, and satisfying but not omniscient reveals.
9. **What role does comedy play late in the game?** Unsettling without becoming uniformly bleak.
10. **What is the playable point-of-view and narrator voice?** Blank-slate protagonist vs lightly characterized viewpoint.
11. **What does the title mean?** 'The Acceptable Error' is evocative but provisional.
12. **What is the proof of fun?** A scene, branching vignette, portrait interaction, or mystery situation—after creative selection.

## M1 behavioral tests to resolve before the final art lock (2026-10-29)
The owner wants to test inventory item count and paging arrows, Fallout 1/2-style deep dialogue response lists rather than a forced cap of three, in-place item inspection and closing/restoring conversation, and a scene/portrait/frame pixel-density hierarchy informed by Trans-plant's higher-detail painted menu. Those are **open**; the proposed test is 7 visible slots, 3 visible choice rows with scrolling for more, right-rail item details, and higher density portrait/frame sprites. See [M1 interaction stress tests](12_M1_INTERACTION_STRESS_TESTS.md).

## M1 interaction owner decisions — 2026-10-30
The owner selected **scrollable dialogue with a styled mechanical controller and permanently reserved controller width** (no layout shift), **higher-detail item closeups within the right rail**, **satirical/context-responsive objectives**, and **one default reusable frame with visual alternatives only for radically different settings** such as a spacecraft—not individual rooms. See [M1 Interaction Decisions 01](13_M1_INTERACTION_DECISIONS_01.md). These supersede tentative behavior options in the M1 stress-test document; inventory slot count and exact detail densities remain open.

## D. Explicitly deferred
Formal design bible, story canon, world map, technical architecture, engine, art pipeline, scene production, implementation, deadlines, production QA. **A provisional milestone roadmap is now authorized and documented; actual production remains deferred.**

## E. Process for later changes
Record an owner decision in this table only when explicitly stated or clearly agreed. Mark new assistant pitches as proposals, not locked decisions. If a favored premise is displaced, move its rationale to the idea archive. Every draft may be revised; preserve the historical conceptual record.

The owner has directed a **partial layout lock** in [M1 Layout v0.3](11_M1_PARTIAL_LAYOUT_LOCK.md): 16:9, no top information banner, original ~70/30 scene/rail split, full-width portrait, story choices with three utility buttons beneath, and a bottom strip of wide inventory + contextual objective + **purely decorative** frame end-cap. All visible mockup text must be **English**. Preserve slightly absurdist hardware and world architecture. Only visual style and fine fit remain to be tested; no production authorization.
