# The Acceptable Error — The Exposition of Everything: Opening & Story Engine v0.1

**Date:** 2026-11-07  
**Status:** Owner-directed premise and opening beats, plus clearly marked PMO proposals; **not a finalized script or complete plot**.  
**Branch:** `docs/story-gameplay-study-v01`  
**Reference:** [59 Story Spine Laboratory 01](59_STORY_SPINE_LAB_01.md)  
**Implementation boundary:** This is preproduction narrative work. Do not change the current M2 reception vertical slice, UI/sprite lab, or art/code. The full-game pre-reception prologue is outside the current reception-demo scope.

## 1. Owner direction / the selected story framework

**The Exposition of Everything** is the preferred **primary adventure setting and story generator**, superseding the earlier recommendation to make an “unwanted inspection” procedure the main activity.

Why:
- A vast exposition may contain dramatically different purpose-built **rooms, exhibit buildings, whole floors, pavilions and environments**. It is natural for radically different places to exist side by side; each has different rules and visual style.
- Those spaces can satirize social ideas or use affectionate, original allegories of books and films, without lifting copyrighted characters or scenes. Exhibits can grow increasingly absurd and weird.
- A CYOA is predominantly **forward-moving**. The protagonist is not ordinarily returning to every former location or dialogue tree. Prior pages are behind them unless the story itself deliberately returns them there.
- The protagonist is an ordinary person pushed onward by institutions and circumstances despite wanting something mundane. Their broad predicament isn't negotiable simply because a choice card appears.
- The narrative may begin with a bathroom need but can eventually all but forget it, with **rare** callbacks. Do not force constant bathroom jokes or a bodily urgency meter.
- We need first to brainstorm the **actual storylines and exhibit adventures**; only after those are exciting should we map branching logic, check odds, playtests or implementation.

### Key narrative sentence

**The protagonist makes decisions, but the surrounding world keeps deciding what problem they have to face next.** Their choice determines approach, possessions, discoveries, allies and consequences, not whether the game premise happens.

An unavoidable **macro event** (layoff, forced departure, entry into exposition, initial mistaken appointment) is compatible with meaningful choices if the player can affect **how** they reach it and what state carries forward. Repeated fake binary choices where both cards instantly produce identical text are weak; present a real reaction or a single continuation where suitable.

## 2. Owner's opening beats — preserve these specifically

The opening takes place **before** the current M2 reception demo. The protagonist is not already the assigned inspector. They are an ordinary recently-dismissed worker, about to learn they're fired.

1. **Absurd employer / absurd job.** The person has worked for an institution or company doing something ridiculous and mundane. They are not incompetent and the dismissal is **not their fault**. Exact role/company is not decided.
2. **Mass layoff triggered by paperwork accident.** A fly drops into or otherwise interferes with a printer, corrupting the employee number/list and causing the protagonist to become one of **500,000** layoffs/dismissals. The reference is an absurd bureaucratic mechanical error (owner noted *Brazil* and *The Fifth Element* as tonal inspirations), not literal borrowed film characters or scenes.
3. **Game starts as protagonist chooses to go to the bathroom.** On the way, a person, robot, pneumatic-tube messenger or apparatus intercepts them with instantaneous termination and orders them to the nearest exit to collect personal effects. Precise delivery mechanism remains open.
4. **Trying the office bathroom doesn't work.** The access has already been revoked or the restroom locked. The player can respond/try alternatives, but the **opening always results in their dismissal and leaving the building**, with believable consequences and no deus-ex-machina denial of every choice.
5. **Box of office possessions outside.** A box of assorted, odd, mostly ordinary office stuff sits at the exit. This can teach inventory, item selection and inspection. The owner floated trying to leave it, but being unable to leave behind **one humorous yet sentimental possession**; the player may end up carrying the box or the selected object. Owner has not specified which object.
6. **Inspect box as container.** Candidate inspection interaction: extract multiple items and auto-add them to inventory; after emptying it, the box's icon changes to show that it is empty. This is an **art/interface suggestion**, not permission to modify the production inspection engine. Consider seven visible inventory slots when budgeting the beat; avoid filling more than the interface can hold without a tested interaction.
7. **Brief abundance, then losing it.** The player temporarily thinks they have acquired lots of useful possessions. On attempting entry to the institution that starts the main game (the Exposition), an absurd admission rule **removes most of their collected items**, leaving a nearly empty inventory. Preserve at least a meaningful item, keepsake, slip, or consequence; owner explicitly wants the contrast.
8. **The Exposition is nearby and conveniently offers public facilities.** After losing their job, the protagonist walks down the street still trying to find a bathroom. The Exposition is plausibly near their old workplace and seems the practical next option.
9. **Reception then leads into main story.** The established M2 vertical slice begins when the protagonist asks the Exposition receptionist about the bathroom and is inadvertently assigned an absurd authority/obligation. This first scene is already being built by another PMO. Our prologue must eventually hand into it cleanly, but **no edits or new requirements to M2 at this stage**.

### Opening cause/effect sketch (proposal, not script)

`WORKPLACE → BATHROOM ATTEMPT → TERMINATION MESSAGE → ACCESS REVOKED → EXIT + BOX → STREET → EXPO ENTRY INTAKE / ITEM LOSS → EXPO RECEPTION → UNWANTED APPOINTMENT`

The opening might be 5–15 minutes, **not a locked duration**. Avoid elaborate branching during the mandatory prologue: enough variation to convey agency, but keep the storytelling pace strong.

## 3. PMO creative proposals for the still-open pieces

These are **options to react to**, not owner decisions.

### A. What was the protagonist's ridiculous but ordinary job?

**A1 — Applause Timing Technician.** Responsible for verifying the correct duration and emotional intensity of prerecorded applause for corporate demonstrations. The company cares about the perfect audience reaction, regardless of audience.

**A2 — Reassurance Quality Inspector.** Checks whether automated public announcements are adequately comforting. Their own dismissal message is “We are delighted to inform you your continued employment is no longer necessary.”

**A3 — Queue Continuity Auditor.** Ensures queues never completely vanish even when the destination, service or office does. Their work can be socially useful in an absurdly distorted system.

No special training from these positions should make them uniquely suited to solving the world mystery. **The protagonist remains the wrong person.** A good job provides one laugh, a human work history and a few believable box items—not an RPG class.

### B. The fly / number accident

Use the owner's printer-fly setup as a foundational event; exact mechanism needs story logic. A possible authentic bureaucratic chain:
- Employee numbers feed a printing/master roster.
- A fly or piece of debris causes an incorrect composite mark in the employee row or classification field.
- The automation treats the printed document as more authoritative than the source record, assigning the protagonist to the huge dismissal batch.
- The decision is already irrevocable under local corporate procedure before any person checks.

Do not explain why these systems exist with a secret villain; institutional habit and false precision suffice at first. If the fly is shown visually, it can be a small opening visual joke rather than a copied iconic composition.

### C. Box contents — potential comedic and emotional inventory

Candidates:
- Employee identification badge (immediately deactivated).
- A “Five Years of Adequate Participation” award or small useless plaque.
- An everyday tool (binder clip, stapler, desk magnifier, novelty ruler) that might prove unexpectedly useful later.
- A misprinted corporate instruction booklet or partially filled transfer form.
- A chipped mug with a handwritten message from a decent former colleague; a joke on the front can coexist with honest sentiment.
- A tiny decorative object given by someone meaningful: sentimental value without inventing a spouse/child/family history.
- The cardboard box itself (may remain as an empty container if that creates future story utility).

**Design constraint:** Do not lock the sentimental item's identity or invent personal family history before owner choice. The humor should not erase the sadness of an unfair layoff.

### D. How entry strips the inventory

Plausible institutionally normal pretexts:
- **Outside-object quarantine:** The Exposition must certify that exhibits contain only approved equipment, so all personal items must enter a secure property counter.
- **Unclaimed-property conversion:** The gate identifies the box as belonging to the institution, not the person, and transfers it to a lost-property conveyor.
- **Demonstration contamination policy:** Everything entering a scientific pavilion must be inventoried; most objects are confiscated or scheduled for reclaim at a separate exit.

**Additional callback seed: “Museum of Formerly Owned Property.”** Confiscated possessions might be catalogued as artifacts of yesterday and appear much later behind glass in an exhibit. The protagonist's pathetic plaque, mug or stapler could suddenly be treated as culturally significant. This makes early item loss a *story promise* with possible payoff rather than a pure tutorial reset. Not locked.

**Narrative fairness:** This is an intentional early comic reversal, but do not teach that inventory is pointless. Prefer a record/claim ticket, one retained keepsake, or a future possibility of retrieval. Multiple possible reactions can determine which thing survives, where confiscated objects end up, and whether a later route can reclaim one. The owner specifically wants most items gone; the exact quantity is open.

### E. How the player gets drawn through the Exposition

**Recommended structural engine:** The complex has its own visitor routing, scheduled demonstrations, one-way transit systems, escalators, safety protocols and incompatible exit rules. The player's newly mistaken authority opens doors into exhibits ordinary visitors would never reach. As the story progresses, trying to go outside often exposes another unforeseen institutional obligation.

Unavoidable travel needs **causality**: one-way exhibit tours, genuine emergencies, transport schedules, lost access cards, employee-status mistakes, evacuation, loyalty to a character, or curiosity. Avoid making every door arbitrarily lock just to force the script.

## 4. What the Exposition uniquely permits

This setting supports large contrasts by design rather than demanding one consistent wallpaper in every room.

| Exhibit seed | Different world / atmosphere | Possible comedic or unsettling premise |
| --- | --- | --- |
| **The Weather You Deserve** | Vast artificial indoor seaside and storm hall | Visitors purchase their own forecast; storms are administered as customer-service corrections |
| **Tomorrow's Model Neighborhood** | Cheerful immaculate suburban street under a dome | An automated suburb produces model residents more efficiently than it houses real ones |
| **The Pavilion of Public Leisure** | Immense resort with formal waiting areas | Leisure is measured and scheduled so tightly that no one has time to enjoy it |
| **The Preservation Gallery** | Jungle, wetlands, brilliant artificial biomes | A living specimen has records older than the building preserving it |
| **The Emergency Experience** | Disaster-training theater, giant moving set | A real emergency is mistaken for a scheduled audience participation exercise |
| **The Transport Miracle** | Grand station, cargo lifts and moving platforms | Everything arrives on schedule, but some returned belongings are subtly wrong |
| **House of Domestic Convenience** | 1960s imaginary home that operates autonomously | Machines simplify chores by assigning new human responsibilities to visitors |
| **The Museum of Yesterday's Tomorrow** | Dark, beautiful science history exhibit | Old discarded theories seem to explain current observations better than the official description |

These are **candidate adventures, not approved chapters**, and only some should bear the main mystery. A pavilion might be a comedy sketch with choices, a survival problem, a human drama, a visual puzzle, or a disquieting scientific demonstration. Parodies should be original and allegorical; avoid recreating recognizable sequences from specific films/books.

## 5. Narrative structure: progressive separation from the bathroom

**Phase 0 — The ordinary world (but not normal by our standards):** Work, dismissal, box, street, apparent public restroom.

**Phase 1 — Administrative accident:** Exposition reception misassigns the protagonist, who mainly wants to finish an ordinary errand.

**Phase 2 — Public spectacle:** The player is funneled through divergent pavilions. Each presents distinctive story problems, characters, outcomes and occasional collectibles. Bureaucracy creates forward motion; the player shapes what happens locally.

**Phase 3 — Beyond public demonstrations:** Exhibits don't entirely match their explanatory materials. Maintenance, service areas, hidden operational realities and human consequences begin appearing. The protagonist is still not a conventional investigator.

**Phase 4 — A real consequence:** Something the player does, says or signs affects another person or a working system. Simply leaving may still be possible under some circumstances, but now carries moral or practical cost.

**Phase 5 — Uneasy decision(s):** The wrong person's accumulated access or accident grants influence over a consequential event. Choices should be made with incomplete information, not a solved scientific quiz.

These are **dramatic phases, not a locked chapter count or scene order**. The later mystery mechanism and climax are open.

### Bathroom callback guidance

Frequent bathroom jokes will become repetitive and trivialize danger. Early bathroom motivation is strong; then allow it to fade into the protagonist's larger predicaments. A very occasional sign, deceptive doorway or momentary reflection can be funnier than constant reminders. Do not decide the final bathroom payoff yet.

## 6. Forward-only CYOA vs agency

The owner intends **mostly one-way narrative progression**:
- Choices commit a route; the past is remembered.
- No standard free-return/backtracking interface where players endlessly traverse previous rooms.
- The Exposition's architecture and operations support closed transitions.
- Some return encounters can happen as an authored event with a new meaning, rather than as a free movement command.
- Death/failure handling, retry mechanics and rewind affordances remain separate later design decisions.

**PMO caution:** “A normal person has no choice but to keep going” is the comedic predicament, not permission to render all decisions inert. The player should control *responses and meaningful consequences* inside a broadly inevitable crisis. Failure and preparation can lead to alternative events even when the final plot still goes forward.

## 7. What we should develop next — STORY, not mechanics

**Recommended next brainstorming session:** Design **three possible first post-reception Expo encounters**, each different in genre and location, and choose the one that best launches a larger story. Do not yet assign dice targets or engine nodes.

Three candidate first adventures:
1. **Tomorrow's Home** — an ultra-convenient model apartment whose automated systems refuse to let the protagonist finish any mundane task.
2. **The Emergency Experience** — the protagonist is unwillingly enrolled in an evacuation demonstration and must make a real decision when a real emergency occurs.
3. **The Transport Miracle** — a guided visit to a modern marvel moves the protagonist somewhere genuinely unexpected, leading away from the exposition foyer.

Then decide who the protagonist first helps/hurts, what they learn about the society, what reason they have to continue, and which later exhibit might recontextualize that event.

### Creative questions to ask owner

- Which absurd **former job** has the right balance of comedy and humanity?
- Is the sentimental item from the box a personal relationship, an everyday object or a deliberately ridiculous memento?
- Should Expo entry take almost everything before reception, or should confiscation be part of the post-reception orientation? (Opening direction favors before; M2 scope remains separate.)
- Is the Exposition a **temporary fair**, a perpetual world's fair, a giant city-scale demonstration complex, or something more extraordinary?
- Which kind of exhibit should the first chapter send the player into: mundane domestic satire, spectacle/action, or unsettling scientific strangeness?

## PMO statuses

**OWNER DIRECTION:** Exposition of Everything selected over inspection-as-main-task; varied exhibit environments; mostly forward CYOA; pre-reception layoff/box/street/confiscation; routine situations push the protagonist onward; rare later bathroom callbacks.

**LIKELY:** Fixed opening funnel with variable consequences; an Expo visitor-control apparatus generating forward momentum; first post-reception adventure defines the experience.

**EXPERIMENTAL:** Employer job, keepsake, fly-printer mechanism specifics, box inspector states, property confiscation logic, exact Expo geography and exhibit roster.

**DEFERRED:** Chapter graph, dice formula, production item sprites, full script, mystery solution and ending(s). The current M2 reception implementation is not modified.

**REJECTED AS PRIMARY STORY FRAME:** An episodic office-to-office inspector procedural; a single primarily bureaucratic dialogue game; a conventional chosen-one investigator plot.
