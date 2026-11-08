# The Acceptable Error — Gameplay & Narrative Presentation Study v0.1

**Status:** PMO proposal for owner review; owner clarification added 2026-11-07. Not an approved production contract.
**Scope:** Story/gameplay/narrative architecture beyond the M2 reception vertical slice.
**Boundary:** No changes to reception implementation, art, UI assets, layout lab, or production engine. Existing M2 authority remains in docs/47.

## Owner clarification and recovered earlier story direction (2026-11-07)

The owner reaffirmed the original central premise: an ordinary person **simply needs to use the bathroom**. After a couple of unrelated opening incidents, they approach a complex for directions. Their request becomes a mistaken bureaucratic appointment. Each mundane attempt to complete the errand produces more procedural steps, which the surrounding world treats as routine. The protagonist never seems to reach the bathroom. This is the comic story spine, not merely a receptionist anecdote.

The intended escalation is **mundane need → ridiculous administrative detour → widening absurd world and assignments → accumulating contradictions → disturbing consequences and deeper mystery → uneasy decisions**. Humor and wonder can survive the later unsettling turns; not every oddity is a clue. Earlier story ideas remain in [00 Creative Brief](00_CREATIVE_BRIEF.md), [01 World and Story](01_WORLD_AND_STORY.md), [04 Idea Archive](04_IDEA_ARCHIVE.md), and [05 Decisions/Open Questions](05_DECISIONS_AND_OPEN_QUESTIONS.md). These notes did not lock a complete chapter-by-chapter plot.

Illustrative story threads (NOT canon chapter sequence): a public exhibit filing a complaint, a specimen whose history predates its enclosure, records apparently describing future events, and a department concealing an unusual authority. Meridian and the early character names are proposals. **The Exchange** is a favored mystery hypothesis—transport may actually exchange objects for equivalents elsewhere, potentially affecting identity, memories and records—but it is not the final locked explanation.

**Mechanics correction:** House of Danger-style **dice/check resolution is intended to be a recurring part of play for uncertain attempted actions**, not a rare exception. Choices can give items; those items open later attempts/options and/or improve the odds of success, but should not guarantee success merely because they are owned. The roll occurs behind the scenes. Player-facing percentages, qualitative odds, visible roll results and precise formulas are still to be explored. Ordinary decisions without uncertain execution need not roll automatically. Exact check frequency, dice mathematics and difficulty model are not locked.

## Executive recommendation

The fundamental unit of play should be an **incident**, not an NPC conversation:

**Illustrated scene → observation and motivation → consequential choice → resolution → persistent state → revised objective when warranted → next incident.**

The game remains a **choice-first CYOA with occasional contextual micro-interactions**. It is neither a point-and-click walking adventure nor a continuous dialogue simulator. The strong House of Danger foundation (story, choices, items, checks, branches) survives under richer presentation.

## Decision register

### LOCKED FROM EXISTING DIRECTION
- CYOA identity; House of Danger is a structural influence, not a card-game UI mandate.
- The mundane bathroom errand is the central comic starting motivation. Bureaucratic misassignment grows into the deeper story; do not replace it with a generic investigator premise.
- Uncertain attempted actions use behind-the-scenes dice/checks, with acquired items able to unlock attempts or influence odds without automatically succeeding. Exact mathematics and visible feedback are open.
- The reception vertical slice is only one incident type.
- The player is the completely wrong person, trapped in routine institutional absurdity.
- The overall mystery is slow-burn. Do not establish the actual nature of the technology as canon yet.
- Preserve the existing shell geometry and established scene/portrait art hierarchy.

### LIKELY — recommended for owner approval
- Choice-first navigation, illustrations normally non-clickable.
- First-person, largely past-tense narration with restrained humor.
- One flexible right-column **focus container**, not separate rigid layouts for every scene type.
- One visible Current Objective, driven by story progression.
- Braided/foldback branching: paths may reconverge; persistent state does not reset.
- State based chiefly on knowledge, inventory, history, institutional classification and consequences.
- Chapter transitions based on brief bureaucratic case-file title beats, optionally extended with illustrated panels.

### EXPERIMENTAL
- Occasional observation-only micro-interactions/hotspots invoked from a choice.
- Timed decisions in genuinely urgent incidents only.
- Dice/check mathematics and presentation (whether to show percentages, qualitative odds or hidden odds; how bonuses and outcome bands work).
- Special chapter-specific mechanics; optional post-chapter branch visualization.

### REJECTED FOR NOW (retain rationale)
- Full point-and-click navigation: shifts emphasis toward pixel hunting and broadens asset/code cost.
- Default hotspots on every scene: creates a constant expectation to inspect every pixel.
- A numerical RPG skill sheet: undermines the wrong-person premise and adds needless systems.
- Visible relationship meters: pushes optimization instead of natural choices.
- A traditional many-task quest log: conflicts with the single compelling Current Objective.
- A Detroit-scale independent branch tree: exponential content production is not feasible.
- Forced NPC portraits or filler close-ups in scenes without relevant focus.
- Automatic rolls for choices with no uncertain execution, or arbitrary time limits while reading: they add noise rather than agency. (Recurring dice checks for risky actions remain intended.)

## 1. Minute-to-minute gameplay grammar

An **incident** is one consequential playable situation. Suggested fields:
- **Establish:** location/illustrated scene, initial focus, opening narration.
- **Pressure:** what demands a decision? Includes urgency, curiosity, contradictory rules, obligation, or risk.
- **Choices:** usually 2–5 options with differing intent, cost, information or consequence, not merely differently worded acknowledgments.
- **Outcome:** distinct immediate feedback (including productive failure).
- **Mutation:** knowledge, item, condition, record, relationship, route or objective state changes.
- **Next:** branch, revisit, gather or advance.

An incident can be a discussion, entrance decision, document examination, hazard, observation, equipment use, attempted withdrawal or realization. **NPC scenes are one subtype, not the template.**

## 2. House of Danger translation

| Tabletop grammar | Digital realization |
| --- | --- |
| Story card | Illustrated incident and concise narration |
| Choice card | Authored contextual decision |
| Item card | Item, document, credential or evidence with narrative permissions |
| Check/dice | Recurring behind-the-scenes rolls for uncertain actions; items may grant access or shift odds, not automatic success |
| Branch card | Short route, altered state or major outcome |
| Story sequence | Chapter-level incident spine |

**Risky item use should normally remain a check, not an automatic solution.** Items can enable an attempt, improve a roll or mitigate failure. **Failure should normally create a new complication**, not an immediate dead end. A failed lock attempt might damage a badge, attract an official, reroute the player or expose new information.

## 3. Environmental interaction recommendation

**Choice-first A+ model:** The scene illustration is normally not interactive; options control travel, inspection, use, investigation and decisions. A deliberate authored choice like “Examine the machine” may temporarily present a localized inspection interface. It must be explicit and exceptional. Do not implement walking, inventory-combination freeplay or a global hover-to-find-hotspots convention by default.

## 4. Non-NPC scenes and the right column

Keep the existing right column structurally fixed, but treat it as a **focus container** with orthogonal roles:

**Visual focus:** CHARACTER, DETAIL, ARTIFACT, EVENT, SYMBOLIC, NONE.

**Text register:** SPOKEN, NARRATION, THOUGHT, DOCUMENT, SYSTEM.

Examples: receptionist = Character + Spoken; corridor = Detail + Narration; form = Artifact + Document; moving machine = Event + Narration; private realization = Symbolic/None + Thought. Choices live beneath whichever focus is active.

A higher-detail visual must contribute information not already apparent in the coarse main scene. **Never commission filler art simply to fill the portrait frame.** A scene-first/no-secondary-image state must be supported. This is a semantic content rule, not authorization to redesign the current shell.

## 5. Narration

**Proposed default: first-person, mostly past tense.** It supports dry retrospective institutional humor and the implied question of how the protagonist knows or recounts events.

Narration should define perception and personality, **not dictate emotions or choices**:
- Prefer “The machine had six emergency-stop buttons. Five had been painted over.”
- Avoid “I was terrified,” except when deliberately earned/selected.

Keep prose lean. Choices express player intention and values. NPC speech, internal thoughts, found documents and institutional announcements should remain distinguishable text registers.

## 6. Current Objective

**One visible objective**, not a conventional quest log. It describes the protagonist's active perceived goal. The engine may retain hidden chapter drives, suspicions, obligations and optional opportunities.

Objective updates should be significant and occasional, not one per incident. Suggested progression: FIND A WASHROOM → REPORT TO PERSONNEL → GET OUT OF PERSONNEL → FIND OUT WHAT I AGREED TO.

The brief's subtle pixel/materialization transition is appropriate on *changes* only. Institutional reclassification can force an objective change the protagonist never intended: humor expressed by mechanics.

## 7. Chapters

Chapters should represent **dramatic problems or reversals**, not merely locations. Initial test target: approximately 30–60 minutes on a blind playthrough, subject to actual pacing tests.

A chapter typically has opening incident; several development incidents; a meaningful fork or opportunity cost; changed state; climax/reversal; new information; and an altered objective. Chapter identity usually remains stable across branches, though rare substantial choices may skip/replace a chapter or change an interlude/title.

Titles should be dry, witty and sometimes alliterative or punning. No example chapter titles are canon.

## 8. Chapter transition study

1. **Case file / dossier:** strong thematic identity; low cost; risks repetition.
2. **Illustrated comic panels:** supports connective action and offscreen travel; higher art burden.
3. **Establishing illustration + title:** elegant, reusable; less uniquely institutional.
4. **Machine/database record:** could express increasingly unreliable official reality; risks generic retro-computer presentation.
5. **Preferred hybrid:** brief physical case-file title beat for every chapter; 1–3 illustrated panels *only when the intervening story benefits*. Two production tiers (economical title / story transition) avoid needing full cutscenes.

These are proposals to test, not production instructions.

## 9. Branching architecture

Use **braided/foldback branching**: forks can yield distinct immediate scenes/routes, then gather into a shared incident. Gathering does not erase state.

Suggested branch tiers:
- T0 VOICE: immediate wording only.
- T1 LOCAL: alternate local consequence, quick gather.
- T2 PERSISTENT: inventory, knowledge, record or relationship condition recalled later.
- T3 ROUTE: several distinct incidents, then known convergence.
- T4 MAJOR OUTCOME: rare changed chapter ending or game ending.

Most choices should be T0–T2. Initial budget: perhaps one substantial T3 fork per chapter. T4 reserved for major structural moments.

**Branch-debt gate:** Any route extending beyond its incident needs a named convergence, replacement chapter or ending before approval. Track what must later acknowledge each persistent consequence. Avoid claiming every flavor choice is major.

Suggested narrative state categories:
- **knowledge:** what the player has actually learned;
- **inventory:** owned/used/lost items, documentary proof or credentials;
- **history:** consequential actions and admissions;
- **institutional record:** what authorities *believe* about the protagonist;
- **relationships:** remembered conduct, not necessarily numerical affection;
- **conditions:** temporary harm, suspicion, time/opportunity cost;
- **route:** current incident/chapter context and visited paths.

Institutional record is the promising signature mechanic: the bureaucracy's assertions about the protagonist become actionable permissions, restrictions and misclassifications, even when plainly wrong.

## 10. Mechanics beyond dialogue

**Core candidates:**
- Knowledge-gated choices: learning a mechanism changes what can be attempted.
- Inventory as story authority: badge/clipboard/form grants entry, plausibility or leverage rather than crafting recipes.
- Institutional record: false official identity evolves through signatures, mistaken credentials, omissions and classifications.
- Route/opportunity decisions: following one lead can mean missing another.
- Consequential checks: recurring behind-the-scenes dice resolution of uncertain attempted actions; items and knowledge can open options or improve odds, and failed rolls create narrative complications.
- History and character memory: later scenes recognize what occurred.

**Occasional only:** limited-time investigation; timed crisis choice; close inspection; contradictions between documents; chapter-specific procedure/puzzle; hidden temporary danger/pressure. Never add a mechanic only because another RPG has one.

## 11. Worked non-NPC incident — THE ANNEX (non-canon)

**Scene:** An oppressive concrete annex across a service road, with public door, service ramp and side entrance. No NPC present.

**Visible objective:** REPORT TO RECORDS.

**Focus:** Higher-detail close-up of contradictory signs: “AUTHORIZED PERSONNEL”; taped across it “ALL PERSONNEL USE PUBLIC ENTRANCE”; below “PUBLIC ENTRANCE CLOSED TO PERSONNEL.”

**First-person narration:**

> I had been sent to Records. Nobody had explained what Records recorded.
>
> The annex had three entrances. Each one had a sign explaining why I should use one of the others.
>
> A camera above the public entrance was pointed directly at the wall. For the first time that afternoon, something about the building seemed properly maintained.

**Choices and consequences:**
1. **ENTER THROUGH THE PUBLIC DOOR.** Scanner logs the badge; set `records_entry=public` and `badge_scanned_records=true`. Fast route.
2. **TAKE THE SERVICE RAMP.** May require temporary badge; set `records_entry=service`, `knows_freight_network=true`. Freight network can matter later.
3. **WATCH THE BUILDING FIRST.** Costs an opportunity. Focus shifts to camera and pneumatic-tube junction; set `noticed_tube_surveillance=true`. Return to choice menu.
4. **FOLLOW THE HANDWRITTEN SIGN.** Side door locked; discover partial Form 27-C; gain document, set `has_form_27c=true`. Return to choices.
5. **LEAVE.** A shuttle interprets the badge as employee transfer to Records; choose to refuse or board. On boarding, set `attempted_to_leave=true`, `institution_believes_transfer_accepted=true`, arrive by employee entrance.

**Gather:** A shared Records interior scene is reached from viable entries. It checks `records_entry`, `has_form_27c`, `noticed_tube_surveillance`, `attempted_to_leave`, `knows_freight_network`, providing different narration/choices with reusable art.

**Design point:** The player's attempted refusal becoming proof of voluntary participation is a mechanical consequence of the absurd setting, not just a joke in narration.

## 12. Useful design precedents (lessons, not asset or structure copying)

| Game | Problem solved / method | Borrow | Avoid |
| --- | --- | --- | --- |
| House of Danger | Tangible story/decision/item/check grammar | Simple core loop | Literal cards/dice as presentation mandate |
| Sorcery! | Rich gamebook with travel, inventory and systemic choices | CYOA can contain actual gameplay | Unrelated combat/spell economy |
| 80 Days | Story choices shaped by routes/resources | Opportunity and route decisions | Mandatory travel-economic simulation |
| Roadwarden | Illustrated narrative with exploration, inventory and state | Adventure depth without walking | Survival systems unless fiction earns them |
| Citizen Sleeper | Motivations and limited opportunities drive stories | Goal framing and occasional clocks | Per-turn dice economy |
| Pentiment | Incomplete investigation matters when time is scarce | Unavoidable opportunity cost sometimes | Every chapter becoming investigation |
| Detroit: Become Human | Visible chapter-scale consequences | Major routes plus remembered past | Exponential cinematic scale |
| Scarlet Hollow | Hidden relationship/trait reactivity | Unscored, state-aware dialogue | Combinatorial builds |
| Slay the Princess | Deep branching possible with constrained stage | Spend branch budget selectively | Force a loop structure |
| Telltale games | Urgency occasionally forces decisions | Timed choice in crises | Timer on normal reading |

Selected references for later research verification:
- https://www.inklestudios.com/sorcery/
- https://www.inklestudios.com/80days/
- https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md
- https://store.steampowered.com/app/1155970/Roadwarden/
- https://store.steampowered.com/app/1578650/Citizen_Sleeper/
- https://www.quanticdream.com/en/detroit-become-human/
- https://store.steampowered.com/app/1609230/Scarlet_Hollow/

## 13. Smallest useful validation prototype

Separate from the active M2 reception work. Prototype **one 10–15 minute non-NPC sequence** with:
1. opening scene, narrator and DETAIL focus;
2. 3–5 choices with meaningful different outcomes;
3. one item-gated risky action resolved with a behind-the-scenes roll, testing a useful but non-guaranteed advantage;
4. one knowledge gate;
5. one short branch/gather;
6. one later shared scene that remembers earlier choices;
7. one objective change.

Avoid building a new layout, generic hotspot engine, chapter cutscene or full story before validating this grammar.

### Review questions for owner
- Does **incident** correctly describe the intended unit of play?
- Is first-person retrospective narration the right voice?
- Should institutional record become the major signature mechanic?
- How much branch visibility/replay support, if any, feels appropriate?
- Does the non-NPC focus container preserve the desired storytelling composition?

**Nothing in this study authorizes code changes or establishes final story canon.**
