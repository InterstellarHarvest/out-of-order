# CYOA Parallel Creative Track — Decision Plan v0.1

**Date:** 2026-11-07  
**Status:** Proposal for owner review; independent of the M2 reception UI/sprite implementation.  
**Repo branch:** `docs/story-gameplay-study-v01`  
**Parent research:** [55 Gameplay / Narrative Presentation Study](55_GAMEPLAY_NARRATIVE_PRESENTATION_STUDY_V01.md)  
**Working premise:** Ordinary person seeks a bathroom, is assigned a ridiculous official role through routine bureaucratic mistake, and gradually uncovers unsettling inconsistencies in a strange retro-future.

## Why this parallel track exists

The M2 reception vertical slice and visual tuning work are already underway under their own PMO/Claude workflow. This track is **not** authorized to change `tools/layout-lab`, `art/`, M2 narrative fixtures, HTML/CSS, or the live reception runtime. Its output is the **design, test evidence, and story-state contracts** that a future implementation can consume once the owner is satisfied.

The shared boundary: M2 owns the **current interface and reception implementation**. This track owns **what choices, uncertainty, items, branching and chapter-scale consequences should mean**. No changes cross the boundary without explicit owner coordination.

## The core question

Can this feel like a House of Danger descendant with Detroit-like branch consequence **while staying an authored, choice-first CYOA**?

Expected player experience:
- Mundane reason to proceed: find a bathroom.
- An escalating fictional system that treats extra steps as obvious and ordinary.
- Choices that cause divergent events, rather than interchangeable responses.
- Useful discovered items; items unlock options or change odds, **not automatic success**.
- Uncertain attempts resolved by hidden dice.
- Some different chapters/events/endings across playthroughs, not merely cosmetic dialogue changes.
- One coherent mystery behind some (not all) anomalies.
- Humor and oddities persist as the story darkens.

## What Detroit offers (selective, not literal)

**Take:**
1. **Chapter-level consequence visibility**: a scene/chapter may end in several materially different ways.
2. **Delayed payoff**: an earlier action can turn a later scene on/off or change the available solution.
3. **Meaningful missing content**: some scenes exist only on certain routes; that makes replay worthwhile.
4. **Branch review**: after chapter completion, a flow map could show the route taken and hints that alternatives exist.
5. **Distinct route texture**: choosing how to approach an issue changes who, where, what and stakes, not just tone.

**Do not take by default:**
- Multiple fixed playable protagonists; that weakens our deliberately unexceptional single protagonist.
- Quick-time events and cinematic movement as mandatory mechanics.
- Exponentially growing bespoke sequences.
- Revealing future plot secrets via a full unlocked branch map on first playthrough.
- A moral-good-versus-evil score system.

References:
- Quantic Dream narrative-production discussion: https://blog.quanticdream.com/from-an-idea-to-a-game/
- Game Informer discussion of Detroit's flowcharts and consequence: https://gameinformer.com/games/detroit_become_human/b/playstation4/archive/2018/04/23/two-hours-of-hands-on-with-detroit-become-human
- inkle's documented branch-and-gather writing model: https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md
- House of Danger creator/publisher summary: https://www.zmangames.com/game/choose-your-own-adventure-house-of-danger/
- House of Danger rulebook: https://cdn.svc.asmodee.net/production-zman/uploads/2024/10/cyoa_instructions.pdf

## Proposed branching rule: braid with **earned divergence**

The previous study emphasized convergence to avoid exponential cost. **Correction:** convergence is a budgeting tool, not a default guarantee. A route should persist as long as its difference produces compelling content.

Branch classes (test these; don't lock production counts yet):

| Class | Span | Example | Production consequence |
| --- | --- | --- | --- |
| Incident variant | Minutes | Bluff succeeds or creates a complication | Shared scene, variant lines and state |
| Incident detour | 1–3 incidents | Unlocked service passage instead of public entrance | One small side scene |
| Chapter route | Several incidents | Investigate in public offices versus beneath the facility | Separate illustrated locations, different discoveries |
| Chapter exit | Following chapter(s) react | Temporary credentials vs suspicious transfer record | Alternate starting state and opportunities |
| Structural divergence | Major later pivot | An ally is available, a location inaccessible, or a planned operation occurs differently | Limited fully distinct sequence or ending |

The target is **a deliberate mixture**. If every fork recombines in one paragraph, the game feels fake. If every fork stays separate forever, content creation explodes. A chapter can support *at least one* substantive route divergence as a test target, not a locked quota.

**Branch-debt rule:** each extended branch must declare its expected payoff, production assets, and when/if it rejoins another branch. **No orphan paths.**

## Dice/check design direction (not formula lock)

The owner clarified that checks are an important recurring component for uncertain actions. A choice expresses intent; when an attempt is uncertain, the game resolves a hidden roll. Inventory/knowledge/conditions may:
- make an otherwise unavailable attempt legal;
- improve the chance of success;
- change consequences of success or failure;
- remove or add risk;
- sometimes enable a *reliable* non-check alternative when fiction logically warrants it.

Do not roll for selecting a hallway, reading a sign, or choosing to cooperate unless the act itself has uncertain execution. Do not randomize facts about the underlying mystery. Avoid a **check on every click** merely to appear game-like.

Two models merit head-to-head paper testing:
- **Model D6** — a single six-sided die, danger target, and situational item bonus; honors House of Danger's simple check DNA. Visible odds become 16.7% steps. A natural 1 can be automatic failure (candidate).
- **Model D100** — d100 behind scenes, transparent or hidden numerical percentage; more granular odds and easier dynamic modifiers, but risks turning narrative decisions into min-max arithmetic.

For each model test: base chance, item bonus, knowledge bonus, failure consequences, retry policy, whether odds should be shown, whether the player sees the result, and how repeated failure is handled. **Do not conflate the decision to roll with success; useful inventory should not erase uncertainty.**

### Suggested risk presentation experiments
- A: no number, qualitative risk (“Doubtful”, “Fair”, “Favorable”);
- B: exact chance on the choice (“65% chance”);
- C: chance revealed only when the player examines their preparation;
- D: no odds before selection, but the success/failure roll visibly resolves after.

Test player confidence and surprise. Do not implement all modes into production.

## Parallel milestones and gates

| Gate | This track produces | Owner decision | Interface / Claude M2 dependency |
| --- | --- | --- | --- |
| P0 — Archive recovery | Recovered bathroom arc, world hypotheses, House of Danger mechanics intent | Confirmed in conversation | None — COMPLETE |
| P1 — Branch/risk grammar | This plan; sample branching graph; two dice models; design QA criteria | Select preferred branch depth and check presentation | None — IN PROGRESS |
| P2 — Written test encounter | Standalone 10–15 minute post-reception, non-NPC CYOA scene with item, checks, outcomes | Is it actually fun and readable? | None |
| P3 — Headless paper playtest | 6–12 seeded trial routes with branch/state audit and balance notes | Approve/adjust rules | None; may use isolated scripts if needed |
| P4 — Macro story spine | Flexible 3–5 dramatic phases, provisional chapter opportunities and route-specific reveals; recovered sketches preserved | Approve sequence for outlining, **not final mystery truth** | None |
| P5 — Implementation handoff | Structured narrative state/check spec, acceptance cases, content-schema recommendations | Explicit authorization to integrate later | Coordinate with other PMO; do not preempt |

Do not invent a new M2/M3 numbering: these are **P0–P5 parallel creative gates**, not implementation milestones.

## Source-of-truth and continuity rules

- Every meaningful owner decision goes in a dated document or amendment with **LOCKED / LIKELY / EXPERIMENTAL / REJECTED** status and why.
- Keep alternate proposals rather than erasing them.
- Do not replace `docs/01_WORLD_AND_STORY.md` or other historical source notes with new plot claims.
- Use the existing numbered `docs/` convention and a **docs-only branch** until reviewed.
- Capture what was tested, seeds/results where relevant, and what remains uncertain.
- After a working session, summarize the current choice, commit, and next concrete action.
- No change to `main`, M2 files, or active lab without a separate explicit implementation authorization.

## Owner choice before moving to bigger artifacts

The recommended next action is **B (balanced)**, but none is canon by default:

**A — Branches first:** build two contrasting chapter graphs and compare payoff vs production cost, postponing detailed dice mathematics.

**B — Balanced proof (recommended):** one tightly authored **non-NPC** post-reception scenario with a meaningful branch, acquired item, two check modes and a delayed callback; paper-play first. Reference design in [57 Branching & Dice Test Encounter](57_BRANCHING_DICE_PAPER_TEST_V01.md).

**C — Story shape first:** map the earlier bathroom → absurd bureaucracy → deeper mystery dramatic spine and provisional chapters, preserving multiple possible underlying truths. No mechanics implementation.

The other PMO's M2 work continues independently in all three options.
