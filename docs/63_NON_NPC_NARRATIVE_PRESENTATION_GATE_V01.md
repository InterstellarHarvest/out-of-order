# CYOA — Non-NPC Narrative Presentation Design Gate

> **OWNER DECISION 2026-11-07 / SUPERSEDED STUDY FRAMING:** This original A/B/C comparison is no longer current. [64 — Narrative B-first / Focus A owner rules](64_NON_NPC_MODE_OWNER_RULES_AND_ART_BRIEF.md) supersedes it. B expands the narration panel upward across the portrait area while choices remain; A is an authored close-up reached via a choice from B; C is merged into A. New B overlay art and action-vs-spoken visual semantics are now the outstanding design tests. Keep the older candidates here only as historical options.


**Date:** 2026-11-07
**Status:** PMO design-test charter, not owner-locked and not production code authorization
**Original directive:** The first PMO assignment was to establish the full CYOA gameplay/narrative presentation language beyond NPC dialogue, **not** to write the complete story. The original 12 requested study sections included non-NPC choice scenes, right-column semantics, narration, objectives, chapter transitions, branching, mechanics and one worked non-NPC incident.
**References:** [55 — Gameplay/Narrative Presentation Study](55_GAMEPLAY_NARRATIVE_PRESENTATION_STUDY_V01.md), [62 — House of Tomorrow Owner Revision](62_HOUSE_OF_TOMORROW_OWNER_REVISION_V02.md), M1 canonical shell contract [17](17_M1_CANONICAL_UI_DESIGN_CONTRACT.md).

## Scope correction

Owner's latest question: The reception portrait/dialogue mode cannot be the only screen grammar. What should the existing right-hand portrait and dialogue region **look like and do** during narrative-only scenes with environmental observations and action/choice cards?

This is the next tangible PMO design gate. Preserve Expo/House story work as **conceptual material to test presentation**, but pause further story elaboration until this is addressed. Do **not** alter M2 reception art, dialogue runtime, layout/sprite lab, or approved M1 shell.

## The problem precisely

Current reception experience:
- lower-resolution environment scene at left;
- higher-resolution NPC portrait at right;
- NPC speech and player reply in scrollback;
- choices styled as player-spoken lines with send animation;
- inventory, Current Objective and three utilities at bottom.

Non-NPC scene example:
- left: House of Tomorrow interior (or a corridor, strange building exterior, object/event);
- top right: **no human speaker**;
- right text: narrated observation or protagonist thought, not necessarily dialogue;
- choice cards: **actions** (ENTER, EXAMINE, WAIT, LEAVE), not necessarily spoken sentences;
- downstream result: narration and state change, not a made-up NPC reply.

The 2026-11-07 owner refinement supplies an important *specific* case: the house voice may have a **wall speaker/camera close-up** occupying the existing higher-detail portrait window. This is excellent for a speaking non-human entity but **not** a universal answer to scenes with no speaker, camera, object, or useful focus detail.

## Required design candidates

### Candidate A — Contextual visual focus, fixed shell

Keep shell and all major regions unchanged.

- Portrait aperture can present an authored high-detail close-up (sign, door lock, evidence, machine, speaker/camera, event) rather than a face.
- Narration appears in the existing text region; choice cards represent actions instead of spoken dialogue.
- No visual close-up is mandatory if story cannot justify it. For no-image fallback, design an appropriate neutral/scene-ambience treatment that is not an unrelated decoration.
- The house AI case: wall speaker and camera acts as the subject of dialogue, with subtle non-facial animation.

**Advantages:** respects canon; detailed portrait hierarchy has a narrative purpose; easy to author for key dramatic scenes.
**Risks:** high cost if every quiet passage requires distinct high-resolution close-up; fallback could feel vacant.

### Candidate B — Expanded narration / scene-first mode

Keep decorative shell outer geometry fixed; test a temporary **interior content arrangement** for right rail when no close-up has story value.

- The portrait region becomes additional narrative/observation space or a meaningful typographic/documentary field; choice cards stay in their established lower right area.
- The main left scene receives all illustrative attention.
- Text must not become an intimidating essay or break the current readable type scale.

**Advantages:** no filler art; works for introspection, travel and quiet transitional scenes.
**Risks:** changing content layout may fight the carefully tuned portrait/dialogue contract and could make non-NPC scenes visibly feel like another game.

### Candidate C — Environmental focus as standard, rare no-image state

Treat A as default, with a curated set of reusable detailed motifs (doors/signs/devices/views) and **rare** B-like scene-first passages for thought or transitions. Avoid branching into six completely different bespoke UI skins.

**Advantages:** one underlying semantic system; art variety where valuable, text-first when needed.
**Risks:** requires clear rule for when an image adds information versus when it is filler.

These are **comparison targets**, not an authorization for layout change or a new runtime mode.

## Test scenes (chosen to isolate UI from writing)

Use **the same canonical shell and illustrative placeholder content** across variants; no production art needed.

**T1 — Stranger outside an institutional building (zero NPC):** The main scene shows three entrances. Protagonist narration: “I had come here for a bathroom. The building had three entrances...” Choices: FRONT, SIDE, WATCH, LEAVE. Top-right must show either meaningful door/sign focus or no-image state. Does the player understand these cards are actions, not spoken lines?

**T2 — House of Tomorrow (non-human speaker):** Main scene: showroom interior; right close-up: speaker/camera; narrator/house voice distinct. Choices: OBJECT, ASK, INSPECT, TRY TO LEAVE. Tests whether the portrait semantics can be a non-person without modifying geometry.

**T3 — Quiet transition (no salient detail):** Main scene: surreal empty corridor or exterior transit. Protagonist thought/observations and 2–3 choices. Must look deliberate, not like a missing sprite.

**T4 — Found document/object:** Main scene with a paper or instrument; right close-up or established item inspector. The text register is DOCUMENT or OBSERVATION; choices READ / KEEP / LEAVE may differ from inventory-inspection actions. Do not recreate existing item inspector in parallel.

## Presentation/behavior questions to resolve BEFORE scripting engine implementation

1. **What is the visual focus when there is genuinely no speaker or detail worth drawing?** Blank/ambient panel versus narrative-filled region; side-by-side test.
2. **Narration placement:** Should observational prose use the existing dialogue text area (with typewriter and scrollback) or a distinct narrative presentation? Compare.
3. **Action-card semantics:** A clicked action like “TRY THE SIDE ENTRANCE” should not automatically be recorded as a line the protagonist spoke aloud. Differentiate *spoken choice*, *narrative action*, *observation*, *item use*, and *continuation* as authoring semantics, while preserving consistent control behavior.
4. **Transcript / history:** How is non-dialogue narration shown in NOTES/FILES? It should remain accessible and readable.
5. **Scene/detail resolution:** Detailed focus art can reveal information not visible in coarse background, but should not require unique art for every paragraph.
6. **Footer objective:** Existing Current Objective stays in its established region and should change only for story reasons; no UI reflow for each scene.
7. **Overflow/long narration:** Test 1, 3, 6+ lines and 2–5 choice cards without clipped or unreadable content.
8. **Accessibility and keyboard:** controls remain discoverable; scene art is not a mandatory click target; user can advance/cancel text animations as current game permits.
9. **Motion:** No changes to locked shell; proposed content transition respects reduced motion.
10. **Art budget:** scenes should never need a decorative pseudo-NPC portrait simply to fill space.

## Test deliverable for owner review

A **design-only A/B/C comparison** of the same fixed shell in 2–4 representative scene situations, with semantic labels and notes. Prefer a standalone local/static image arrangement or tiny no-build comparison HTML if it is easier to test vertical composition and text overflow. **Do not use current M1 lab as the testbed** or redesign locked frame. This PMO can author the design specification and request Claude/Codex to produce a *separate* offline comparison for visual inspection, but only once owner chooses to run the test.

### Review gate

The owner should be able to answer:
- When nobody speaks, does the right-hand side feel purposefully designed rather than empty?
- Can I distinguish protagonist narration from spoken dialogue?
- Do action choices behave like CYOA decisions instead of spoken replies?
- Does this fit the existing locked geometry and readable pixel-art scale?
- Does the solution work in environmental, AI speaker, document, and quiet-scene states **without producing whole new UI layouts**?

After owner selects an arrangement, write a **semantic content contract** for later implementation by the other PMO or Claude. The story track should remain independent meanwhile.

## Scope / status

**ORIGINAL MANDATE:** gameplay/narrative presentation study; no NPC-dialogue simulator; House of Danger DNA; non-NPC mode is a major deliverable.
**PROPOSAL:** fixed-shell contextual focus as primary; test expanded narration or empty-focus treatment; action versus spoken choice semantics.
**UNRESOLVED:** no-image fallback, narration typography/history, whether to expand text into portrait aperture, and exact interaction semantics.
**DEFERRED:** rendering/coding changes, new art, rewriting the M2 reception flow, and additional Expo chapter production until this gate is reviewed.
