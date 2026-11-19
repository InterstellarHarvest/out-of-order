# Out of Order — living path to a finished game

## 2026-11-05 milestone-numbering override

The original roadmap below remains useful as historical planning logic, but its milestone numbering is no longer authoritative. M1 has completed the player-experience/UI work. The owner has now authorized **M2 — Reception Vertical Slice**, defined by `docs/47_M2_RECEPTION_VERTICAL_SLICE_CHARTER.md`.

The old table's labels such as “M2 — Mystery logic” and “M5 — Playable vertical slice” should therefore be read as conceptual gates, not current project milestone names. Mystery-truth work is still required before a full story is authored; it is simply not the next numbered implementation milestone.

**Current title:** *Out of Order* (approved 2026-11-19) · **Roadmap version:** 0.1 · **2026-10-29**  
**Purpose:** Give creative decisions an order, prevent uncontrolled scope, and identify what has to be demonstrated before the next commitment. **This is not an implementation order or locked design bible.**

## North star / definition of finished
A complete, original, playable, replayable retro-futurist pulp adventure with:
- A compelling ordinary-person protagonist accidentally caught in an absurd bureaucracy.
- A 1960s-imagined future: optimistic public spectacle, strange everyday technology, comic institutional absurdity, colorful low-resolution integer-scaled art, and increasingly disturbing implications.
- An underlying, internally coherent mystery about technology that *works* but whose actual mechanism is misunderstood. **The Exchange is the leading candidate**, not guaranteed canon.
- A complete beginning, middle, and ending; consequential choices, sensible consequences for failed actions, and at least some differing outcomes or discoveries.
- Legible scene-focused presentation with expressive, detailed framed NPC portraits, with protagonist sprite and collectible-card metaphors *not automatically required*.
- A finished release someone else can play without the author explaining how the game works.

**What finished does NOT mean:** a giant branching RPG, every Meridian neighborhood, a complete simulation, numerous episodes, a hero sprite, or a deck-building game. Finish a cohesive *first adventure* before contemplating a sequel or expandable platform. Precise length and number of scenes are deliberately TBD.

## How to use this plan
- **Sequential in major decisions, overlapping in ideas.** Explore widely but commit only the minimum that unblocks the next proof.
- At each gate, record: hypothesis, evidence/mockup/playtest outcome, selected direction, what stays open, and what moves to the idea archive.
- **Owner approves meaningful creative locks** (look/feel, premise, mechanics, slice, and release). Agents can research, draft, produce alternatives and check work, but should not quietly declare decisions final.
- Each milestone can be repeated or revisited; if a test disproves an assumption, return to the earliest affected milestone.
- Don't write code to compensate for unresolved experience design. Don't write the whole branching script before proving that a small playable segment is fun.
- Maintain distinction: **Chosen** / **Favored** / **Proposed** / **Parked**. The repository is our source of record.
- No calendar dates, durations, staff assignments, engine choices, or fixed content quotas yet. Update those only when they help.

## High-level path

| Gate | Stage | Why it exists | Required evidence before moving on | State |
|---|---|---|---|---|
| **M0** | Concept notebook | Preserve themes, preferences, alternatives and open questions | Brief, world/story notes, visual notes, archive, decisions | **Complete** |
| **M1** | Player experience and visual language | Establish what the player *sees and does*, avoiding premature engine/UI assumptions | Side-by-side screen/layout concepts, one tiny choice vignette, viewpoint decision | **NEXT** |
| **M2** | Mystery logic and adventure spine | Ensure the twist has coherent rules and an emotionally compelling story | Private truth model for leading mystery, protagonist hook, key stakes, broad narrative spine | Proposed |
| **M3** | Rules and paper-playable proof | Validate choices, inventory, checks, consequences and pacing without production overhead | 10–15-minute paper or clickable text vignette; revise based on play | Proposed |
| **M4** | Technical and art feasibility | Choose the smallest engine/tools/pipeline that supports the proven experience | Targeted tech spike, pixel/portrait legibility tests, data format and save concept | Proposed |
| **M5** | Playable vertical slice | Prove the actual game is both fun and visually distinctive | A polished short section with atmosphere, NPC portrait, choice, consequence, item, and meaningful replay or fail-forward route | Proposed |
| **M6** | Full story outline and constrained production scope | Turn a successful slice into an achievable first game | Complete branching spine, first-release content budget, authored scene list, endings and asset inventory | Proposed |
| **M7** | Adventure production in small chapters | Build the whole game with regular playable integration | Each chapter finished, connected, tested and owner-reviewed | Proposed |
| **M8** | Whole-game integration, editing and QA | Make the complete experience coherent, reliable and comprehensible | End-to-end run and branch coverage, narrative continuity, saves, accessibility and regression | Proposed |
| **M9** | Release and closeout | Deliver an actual finished experience rather than an endless prototype | Packaged/published version, instructions, provenance, release verification, retrospective | Proposed |

Stages are **decision gates**, not dates. M2 and M3 may inform each other; art experiments may continue in parallel. M6 is intentionally after M5 so the game is not overscoped based on an untested concept.

## Detailed stage guidance

### M0 — Concept notebook [COMPLETE]
Keep the initial seven docs, working title, owner preferences and idea archive. No need to finalize plot. The roadmap adds a plan, not a requirement to make anything yet.
**Exit:** We have enough shared vision to compare how the adventure might actually play.

### M1 — What does a player experience? [NEXT]
**Question:** Is this fundamentally an illustrated gamebook, a scene-inspection adventure, a classic walkaround adventure, or a hybrid? How does a player know what to click, read, choose, carry, or examine?

**Work:**
1. Select one **ordinary but slightly wrong** scene (e.g., mistaken appointment in a public reception area), with **one NPC** and **one usable document or object**.
2. Explore **2–3 visual layouts** with the *same scene*: (A) composed framed scene + inset detailed speaker portrait and choices, (B) scene-first close-up + occasional portrait panel, (C) a modest hybrid. A walkable protagonist is an **optional comparison**, not a requirement.
3. Write a tiny **3–5-choice interaction vignette** showing an NPC, an object, an absurd obstacle, and one unexpected consequence; do not decide the Exchange's full truth here.
4. Compare readability, scene visibility, pixel density, portrait framing, click targets, dialogue length, choice discoverability, and how inventory/docs might open—without a deck of cards. Test at normal desktop dimensions and an integer-scale presentation where feasible.
5. Decide the **player-viewpoint and dominant interaction model** for a first slice, while archiving alternatives.

**Exit / owner gate:** We can point to a composition and a representative 1–2-minute experience that feels like *this game*, explain why the protagonist is or isn't on screen, and state how item/document inspection works at a conceptual level. No code required.

**Immediate next action:** Review the [written M1 A/B/C screen concepts](07_M1_WRITTEN_SCREEN_CONCEPTS.md). The common vignette is the mistaken restroom inquiry at reception; 16:9 outer canvas with an approximately 4:3 stage, a framed pixel NPC portrait, and hybrid choice presentation. After owner annotations, prepare original *visual* mockups for comparison. The first experiment should be evocative but cheap to revise.

### M2 — Underlying truth and story spine
**Question:** What is the technology *actually doing*, and why does an ordinary nobody end up investigating it?

**Work:** Develop 2–3 constrained versions of the Exchange (or replace it if a stronger idea emerges). Specify an author's truth model: what moves, what's exchanged, source/limit/cost, what instruments observe, what was mistaken, how failures manifest, and which early evidence foreshadows it. Check for contradictions and moral implications. Identify the hook, everyday cast, case sequence possibilities, major reversals, and possible endings **as proposals**, not full scripts. Preserve a mixture of unrelated oddities and genuine human achievement.

**Exit / owner gate:** One coherent, exciting scenario with a playable protagonist motive, cause/effect that can be dramatized, and enough rules to write fair branching scenes. Player needn't learn everything, but authors must know what is actually true.

### M3 — Choices, objects and chance: paper prototype
**Question:** Are decisions engaging even without polished art?

**Work:** Prototype a 10–15-minute branch on paper or minimal clickable text. Include at least one character interaction, one useful acquired object/document, one consequential choice, and possibly one risky check. Contrast pure choice with optional dice/skill resolution. Inspect whether failure creates a new interesting route, rather than a dead end. Limit systemic complexity. Test replays and whether information/objects affect later scenes.

**Exit / owner gate:** Understandable and genuinely engaging branching loop, justified rule set (or deliberate absence of dice), clear state persistence, and no inadvertent deck-building design.

### M4 — Tech choice and production art feasibility
**Question:** What is the smallest, maintainable way to build the experience demonstrated by M1–M3?

**Work:** Briefly compare web/HTML+JS/Canvas and Godot in light of existing project workflows, deployment, pixel scaling, art tools, dialogue portraits, branching content, saves, and platform reach. Run a **bounded technical spike only after authorization**. Prove one scene, portrait transitions, crisp integer scaling, accessibility and a save/load round trip using placeholder assets. Define content schema and branch validation to help writing/QA. Avoid building a general-purpose engine.

**Exit / owner gate:** One toolchain justified by an actual test, reproducible local run, viable art production plan and data structure. No commitment to speculative features.

### M5 — A genuine vertical slice
**Question:** Would someone want to continue playing?

**Work:** Implement a short, contiguous, replayable adventure segment with original scene art, one framed speaking portrait, clear interaction, useful item/document, a consequential branch, one surprising turn, and enough atmosphere to test comedic-to-uneasy transition. Include save/resume if core to chosen structure. The slice should feature production-quality *direction*, not necessarily final production quantities.

**Exit / owner gate:** Someone unfamiliar with the documents can play without help, understand choices, feel curiosity, and want the next scene. If not, revise narrative/gameplay/presentation before multiplying content.

### M6 — Story architecture and first-release scope
**Question:** How do we finish an entire satisfying game instead of promising a sprawling universe?

**Work:** Establish the true causal model and reveal schedule; outline a full beginning, escalation and resolution with choices and at least a few materially different outcomes. Draft a scene graph, dependency/flag rules, character arcs and item/event continuity. Set a modest *first release* scope according to slice production cost: number of hubs, scenes, variants, unique portraits, backgrounds, endings, sound needs and estimated effort. Define locked vs flexible assets. Treat scope as a budget, not an aspirational wish list.

**Exit / owner gate:** A plausible complete game outline and a tractable content budget, with no orphan routes or unresolved must-have system dependencies.

### M7 — Chapter-by-chapter production
**Question:** Does new content preserve quality, pace, tone and agency?

**Work:** Produce scenes, portraits, script, interactions, item logic, sound and transitions in small coherent batches. Each batch ends with an integrated, playable build and review. Keep a scene index and test fixtures for branch states. Reuse systems and art where meaningful; avoid late foundational rewrites. Archive cut ideas for later adventures.

**Exit / owner gate:** Complete beginning-to-end game with all mandatory scenes and endings, no temporary placeholders on critical paths.

### M8 — Full-game testing, revisions and polish
**Question:** Does the game function as a coherent whole for a new player?

**Work:** Complete multiple routes (including low-information/bad-roll paths), inspect contradiction and dead-end risks, verify inventory/flags, saves/resumes, accessibility, input clarity, audio/animation options, legibility, integer-scale presentation, performance, and story pacing. Revise prose, jokes and horror reveal timing. Confirm every ending is reachable and intentional.

**Exit / owner gate:** Stable start-to-finish release candidate, with no progression blockers, acceptable branch coverage, and owner approval.

### M9 — First release and documented closeout
**Question:** Can the intended player get it, start it, finish it and understand the controls?

**Work:** Choose distribution scope (private preview or public release), make original assets and credits/provenance clear, package/deploy appropriately, verify the shipped artifact (not just local dev), document known issues and closeout, and preserve the unused-ideas archive. Any future cases are separate proposals, not hidden release dependencies.

**Exit:** One complete first adventure shipped to its intended audience and preserved in a reproducible state.

## Scope control and explicit non-commitments
- Major re-scope is allowed at any gate. Keep the *first adventure* finite and expandable only after completion.
- Character names, city geography, final mechanism, number of endings, game length, dice, on-screen protagonist, engine, sound approach, and game title remain **open**.
- Do not impose strict dates or quotas before the vertical slice gives real evidence.
- A brainstormed feature has no implementation authority.
- Maintain separate working notes for evidence and owner decisions; document rejected directions in `04_IDEA_ARCHIVE.md`.
- If the art mockup works but interaction is boring, return to M3; if no coherent Exchange logic survives, return to M2; if code/engine blocks visual quality, revisit M4; if the full game balloons, cut in M6/M7 rather than delaying release indefinitely.

## Our current decision

M0 and M1 are complete enough to proceed. **M2 — Reception Vertical Slice is authorized** under `docs/47_M2_RECEPTION_VERTICAL_SLICE_CHARTER.md`.

This authorization is intentionally bounded: build the reception slice on the proven M1 web/lab behavior; do not interpret it as authority for full-game production, a general-purpose engine, or a complete mystery/story lock.

Roadmap maintenance: Update this file when an owner-reviewed milestone changes or closes; put rationale and superseded options into the idea archive. Do not turn conceptual tasks into implementation without explicit authorization.
