# CYOA M2 — Reception Vertical Slice Charter

**Date:** 2026-11-05  
**Owner authorization:** YES — bounded M2 implementation authorized.  
**Baseline:** `main` at `a30fc5a` before this charter.  
**Working title:** *The Acceptable Error* (still provisional).

## 1. M2 purpose

Build the smallest genuinely playable slice that proves the M1 interface becomes an engaging game.

M2 is **not** a new UI-design milestone and **not** an engine-selection exercise. Start from the existing HTML/JS layout-lab behaviors and approved M1 assets. Change architecture only when the slice exposes a concrete need.

The slice is set entirely in the **reception area of the institutional complex**.

The protagonist arrives for the mundane reason already favored in the story notes: after earlier unrelated events that are not shown in this slice, they enter only to ask where the bathroom is. The receptionist's bureaucratic response turns that request into an inappropriate official assignment.

The running joke may continue, but M2 must not turn bathroom access into a timer, survival meter or repetitive gag system.

## 2. What the slice must prove

A new player should be able to launch the slice without reading project documents and understand:

1. who is speaking;
2. how to read/skip dialogue;
3. how and when choices arrive;
4. that a selected choice is the protagonist's spoken line;
5. how inventory and the three action controls work;
6. how to inspect/use at least one item or document;
7. that choices can change what happens next;
8. that this world is funny, bureaucratically wrong and slightly unsettling;
9. that there is a reason to want to continue.

M2 succeeds when the interaction feels like a game rather than a UI demonstration.

## 3. Narrative scope

### Required
- One location: reception / conference-complex lobby.
- One primary NPC: the receptionist. A final name is not required to implement the slice.
- Opening situation: ask for the bathroom.
- Bureaucratic misassignment into an official role or obligation.
- At least one point where the player may:
  - try to correct the mistake;
  - cooperate / follow procedure;
  - pursue the original bathroom request or another immediate practical concern.
- At least one later consequence must differ based on an earlier choice or item state.
- One useful item/document interaction.
- A closing beat that creates curiosity or obligation beyond reception.

### Tone
Begin with comic inconvenience. By the end, introduce one modest inconsistency, implication or consequence that feels genuinely odd or uneasy.

Do **not** explain the Exchange or lock the underlying mystery in this slice. The slice may contain suggestive world detail, but it must remain compatible with multiple later truth models.

### Not required
- prior scenes;
- additional locations;
- walking/avatar navigation;
- combat;
- dice/check systems;
- save system unless implementation proves it essential to this short slice;
- a final game title;
- final receptionist name;
- final Exchange rules.

## 4. Interaction contract

M2 inherits `docs/45_M1_OWNER_DIRECTION_INTERACTION_AND_DIALOGUE_FLOW.md`.

The core turn is:

1. NPC line types out.
2. Short beat.
3. Choices slide in.
4. Player selects a choice.
5. Other cards leave; selected dialogue card sends.
6. Player line appears immediately in the dialogue history using the Choices face.
7. Short beat.
8. NPC reply types below it using the Dialogue face.
9. Next choices appear only after the reply finishes.

Required behavior:
- click/tap dialogue to complete current typewriter line;
- ignore choice input while cards animate;
- keyboard focus moves to the first available choice;
- each new choice set starts at the top;
- dialogue history remains scrollable;
- choices and NPC speech overflow remain independent;
- single-action continuations still use a choice card;
- transcript access belongs in NOTES or FILES;
- hover never changes button/card border, outline, fill, glow or brightness;
- utility hover may show a separate tooltip;
- choice cards are dialogue lines, not push-buttons.

## 5. Existing M1 assets are authoritative

Use the assets already on `main`:
- canonical shell and approved UI package in `art/ui/`;
- chosen action glyphs in `art/actions/`;
- current font selections;
- `art/items/bathroom_pass_slot.png`.

Do not redraw M1 interface art as part of M2.

The layout lab's current defaults are the **working geometry**, not a newly frozen contract. M2 may consume those values. Do not rewrite `design/ui_locked_component_contract_v1.json` merely to make it agree with the lab while the owner is still tuning positions.

When the owner explicitly says the lab layout is final, export a new geometry contract as a separate, versioned update.

## 6. New art policy for M2

M2 requires new visual content eventually, but coding authorization is **not blanket authorization to invent final art**.

Expected new art:
- one reception scene;
- one receptionist portrait / speaking portrait set as needed;
- bathroom-pass inspect art if that item is used as the first inspector proof;
- item-inspector right-column overlay and close-button UP/DOWN art when inspection is implemented;
- tooltip box style when tooltip visual treatment is reviewed.

Art should be commissioned/reviewed in small functional batches. Do not produce all future game art together.

Until owner-approved production art exists, the code may use clearly labeled temporary placeholders that do not masquerade as canon.

## 7. Technical direction

For M2, continue with the web stack proven by the M1 layout lab.

Do not choose Godot or build a new engine before the existing stack fails a concrete requirement.

Implementation should:
- preserve crisp pixel rendering and integer-authored placement;
- separate narrative/content data from UI behavior;
- avoid hard-coding the entire slice into DOM event handlers;
- make branch/state transitions inspectable and testable;
- reuse/refactor proven lab behavior rather than duplicating it blindly;
- retain the layout lab as a developer tool rather than turning it into the shipped game page.

A minimal content/state schema is authorized if needed for the slice. Do not build a general-purpose narrative engine.

## 8. State the slice should prove

Keep state minimal. Candidate state categories:
- dialogue node / current turn;
- early choice consequences;
- inventory ownership;
- whether an item/document has been inspected/used/shown;
- a small number of reception-specific flags;
- transcript/history.

Do not add character stats, currencies, skills, global reputation or generalized quest systems without a demonstrated slice need.

## 9. First item proof

Prefer the existing bathroom-pass slot art as the first inventory proof if the authored reception scene makes that narratively sensible.

If used:
- it must have an `_inspect` asset before item inspection is called production-ready;
- inspection uses the M1 right-rail inspector behavior;
- action buttons change contextually only where meaningful;
- the item should affect at least one later choice, action or response rather than exist only as decoration.

If the story pass demonstrates a different item is materially better, the bathroom pass is not mandatory.

## 10. QA gates

Before M2 is called complete:

### Interaction
- dialogue typewriter and skip;
- full send-turn sequence;
- rapid-click/input-lock regression;
- keyboard navigation/focus;
- choice overflow and reset-to-top;
- dialogue scroll-back;
- inventory one-item movement with weight;
- action glyph/tooltips as implemented;
- item inspection open/close and contextual actions if included;
- transcript access.

### Branching
- every authored choice route reaches an intentional continuation/end;
- no dead nodes;
- inventory/flag-dependent choices behave correctly;
- replay can demonstrate at least one materially different consequence.

### Visual
- shell and approved M1 art remain byte-identical;
- scene and portrait do not bleed into frame areas;
- alpha remains correct;
- pixel rendering stays crisp;
- no forbidden hover highlighting.

### Browsers
At minimum run Chromium and Firefox, maintaining the M1 practice unless a browser-specific blocker is documented.

## 11. M2 deliverables

- playable reception slice;
- content/state data separate enough to inspect and revise;
- automated branch/state validation appropriate to its size;
- browser interaction QA;
- owner-review screenshots / short evidence captures as useful;
- documentation of the exact implemented route graph and state variables;
- list of placeholders vs owner-approved production art;
- no unexplained changes to the M1 shell/package.

## 12. Explicit exclusions

M2 does not authorize:
- full-game production;
- additional locations merely to make the slice feel larger;
- final story/mystery lock;
- generalized engine/framework work;
- engine migration;
- full save/load architecture unless needed by the slice;
- large accessibility/settings systems beyond preserving keyboard usability and current reduced-motion expectations;
- production quantities of NPCs, scenes or items.

## 13. PMO implementation sequence

1. Reconcile stale M1 interaction docs. **Done with this charter commit.**
2. Create a dedicated M2 implementation branch/worktree from current `main`.
3. Extract the reusable dialogue/choice/inventory behavior from the lab without breaking the lab.
4. Define a tiny reception content/state schema and a route fixture using placeholder copy/art where necessary.
5. Make the complete turn loop playable end-to-end.
6. Add the first item/state consequence.
7. Add/commission owner-reviewed reception art in functional batches.
8. Run branch and browser QA.
9. Owner playtest.
10. Only after the slice feels good decide whether the next milestone is mystery-rule/story work, technical hardening, or more production.

## 14. M2 exit question

**Would someone unfamiliar with the project play this reception sequence, understand what to do, enjoy the absurdity, notice the unease, and want to continue?**

If not, revise the slice before expanding scope.
