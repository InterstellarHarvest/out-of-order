# M1-A — Written screen concepts for the same reception scene
**Status:** Pre-visual design comparison; **not approved UI**, not code, not artwork.  
**Checkpoint:** 2026-10-29. Prepared for owner annotations before creating any visual mockup.

## Recently supplied direction
- Wide **16:9** display, but keep the **illustrated main scene approximately 4:3**; use the additional width deliberately for presentation/UI.
- The experience should lean toward **interactive branching story / true CYOA**, not walkaround, hotspot hunting or a traditional point-and-click adventure.
- **Hybrid choices:** large, readable, tactile buttons for consequential story choices; quieter text/icons for secondary actions such as inspecting a document or viewing a journal. Not a deckbuilder.
- A *King's Quest VI*-like, separately framed **high-detail chunky-pixel NPC speaking portrait** is a signature visual motif. The scene remains richly drawn at coarser logical pixel density.
- The **protagonist may not be visible** at all. Leave that decision open.
- Need **written comparisons first**, user notes next, then original visual mockups and art-direction review. No visual files or implementation requested yet.

## Scene setup shared by all concepts
**Working scene: Institute Reception — A Very Small Request.** The player entered the building after a couple of unrelated travel/errand misadventures, only because they urgently needed a bathroom. The first designs **begin inside reception**; earlier events do not need to appear.

Scenic contents (same for A/B/C): bright teal-and-cream lobby; angled polished terrazzo floor; a tube-mail station whirs; a brass/painted public-directory board; a receptionist behind an oversized mahogany-and-chrome counter; a cheerfully bureaucratic sign: *ALL REQUESTS MUST BE SPECIFIC*; a restroom-direction placard partly obscured by a temporary authorizations notice; a numbered ticket machine; one unsettlingly empty corridor. Visually 1960s future imagined as built, used, and over-maintained—not dystopian grime throughout.

**Sample shared speaking exchange (draft text only):**
> RECEPTIONIST: “You've arrived.”  
> YOU: “I’m just trying to find the restroom.”  
> RECEPTIONIST: “Yes, well, that does complicate your appointment.”  
> YOU: “I don't have an appointment.”  
> RECEPTIONIST: “That's exactly what the previous examiner said.”

Use **one source conversation and choices** to ensure presentation is the variable.

**Primary choices (examples, not locked script):**
1. “I think you've mistaken me for someone else.”
2. “What exactly am I supposed to examine?”
3. “Please. Where is the restroom?”

**Quieter secondary actions:** **Inspect appointment slip** · **Open notes**. These are selected from the UI, not discovered by clicking tiny background objects. A document may enable a new choice later.

**Design target:** show the selected speaker portrait, dialogue, 3 important choices and one optional action without obscuring the essential scene. At minimum, demonstrate calm narration state, conversation state, and choice state.

## Format conventions
All sketches below imply the **same 16:9 outer display**. `[SCENE 4:3-ish]` means an illustrated area designed with a roughly 4:3 composition; the *entire app* is widescreen. Exact dimensions, output resolution, UI pixel density and typography are not locked. `[PORTRAIT]` is separately authored higher-detail pixel art, not a smoothed enlargement of the tiny background sprite. ASCII blocks indicate spatial intent only, not actual art.

---

## CONCEPT A — The Quiet Frame
**Thesis:** A nearly cinematic illustrated story. Most UI only appears when needed; the stage is treated like an illuminated illustration in a mostly silent widescreen shell.

### A1. Resting / narration view
```text
┌─────────────────────────────────────────────── 16:9 ─────────────────────────┐
│                  sparse dark or patterned side gutters                       │
│          ┌───────────────── illustrated 4:3-ish stage ─────────────────┐     │
│          │ BRIGHT RECEPTION LOBBY: directory, counter, tube mail,    │     │
│          │ ticket machine, receptionist, distant corridor             │     │
│          │                                                             │     │
│          │             readable scene with no UI blocking it           │     │
│          └─────────────────────────────────────────────────────────────┘     │
│                A short line of narration, then Continue ▸                    │
└───────────────────────────────────────────────────────────────────────────────┘
```
No permanent HUD, inventory grid or menu bar. One small edge affordance for journal/menu can appear on focus, button press or hover; a visible minimal cue is still necessary for discoverability and keyboard use.

### A2. Speaking / choice state
```text
┌───────────────────────────────────────────────────────────────────────────────┐
│       [stage remains visible in center, but lower edge is partially veiled] │
│                       ┌───────────────┐                                       │
│                       │  RECEPTIONIST │  inset detailed portrait             │
│                       └───────────────┘                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │ RECEPTIONIST  “That does complicate your appointment.”                  │  │
│  │ [ I think you've mistaken me ... ] [ What am I supposed to examine? ]  │  │
│  │ [ Please. Where is the restroom? ]                                       │  │
│  │                   inspect appointment slip · notes                      │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
```
Portrait floats in a period-appropriate hard-edged inset frame; a dialogue shelf slides in only while someone speaks. Primary choices are chunky and visually unmistakable; the secondary actions are discreet text. Can be dramatic but will occlude scenery in dialogue moments.

**Strength:** Most atmosphere and scenic impact. **Risk:** Layout motion, hidden navigation, long choices obstruct image; much of the 16:9 horizontal width is under-used at rest. **Question:** Is the temporary overlay charming or intrusive?

---

## CONCEPT B — The Bureaucrat's Desk
**Thesis:** Unambiguously an illustrated interactive gamebook. A permanent right-hand *official dossier* is the reader/player interface; the 4:3 scene occupies the left two-thirds.

### B1. Resting / conversation view
```text
┌─────────────────────────────────────────────── 16:9 ─────────────────────────┐
│ A VERY SMALL REQUEST                                  CASE 001 / 09:12      │
├──────────────────────────────┬───────────────────────────────────────────────┤
│                              │ ┌──────────────┐   RECEPTIONIST              │
│                              │ │  PORTRAIT    │                             │
│       RECEPTION LOBBY        │ └──────────────┘                             │
│                              │ “That does complicate your appointment.”      │
│        SCENE ~4:3            │                                               │
│                              │ WHAT DO YOU SAY?                              │
│   clear wall sign,           │ [ I think you've mistaken me ... ]            │
│   receptionist,              │ [ What am I supposed to examine? ]            │
│   passageway                 │ [ Please. Where is the restroom? ]            │
│                              │                                               │
│                              │ Inspect appointment slip · Notes             │
├──────────────────────────────┴───────────────────────────────────────────────┤
│              A tiny, quiet footer for optional help/save controls          │
└───────────────────────────────────────────────────────────────────────────────┘
```
The scene never gets covered by dialogue. The right panel is always present, visually styled as a mid-century research administration instrument or dossier: cream paper, teal/ink borders, mechanical stamps—not a modern fantasy card hand. The NPC portrait can occupy the upper portion; narration fills the same text region when nobody speaks. Buttons are always in a stable location.

**Strength:** Readability, access, journal/inventory and clear CYOA identity. **Risk:** Permanent panel may feel too much like a form or web app; less atmospheric screen real estate; 'case number' and omnipresent status could bureaucratize rather than immerse. **Question:** Does the permanently occupied rail help or dilute the scene?

---

## CONCEPT C — The Responsive Story Rail
**Thesis:** The scene stays stable and roughly 4:3 inside a wide display. A **fixed-width side rail changes purpose** at story beats. Unlike B it doesn't permanently show a dense pane of controls; unlike A it doesn't cover the stage.

### C1. Quiet / discovery beat
```text
┌─────────────────────────────────────────────── 16:9 ─────────────────────────┐
│                                                                               │
│ ┌────────────────────────────┐  ┌────────────────────────────────────────┐   │
│ │                            │  │  INSTITUTE RECEPTION                  │   │
│ │                            │  │                                        │   │
│ │       SCENE ~4:3           │  │  You came in for one simple reason.    │   │
│ │                            │  │  The woman at the desk looks up.      │   │
│ │    no permanent sprite     │  │                                        │   │
│ │    or object hotspots      │  │                                        │   │
│ │                            │  │                           Continue ▸  │   │
│ │                            │  │                                        │   │
│ └────────────────────────────┘  │                         Notes (subtle) │   │
│                                 └────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
```
Scenic area doesn't shift or crop when interaction changes. Right rail can be spare or almost empty, with one line of narration and a single clear Continue affordance.

### C2. Conversation beat
```text
┌───────────────────────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────┐  ┌────────────────────────────────────────┐   │
│ │                            │  │ ┌───────────────┐  MISS VOSS          │   │
│ │     RECEPTION LOBBY        │  │ │ NPC PORTRAIT  │                     │   │
│ │                            │  │ └───────────────┘                     │   │
│ │                            │  │ “That does complicate your            │   │
│ │    background always       │  │  appointment.”                         │   │
│ │    unobscured              │  │                                        │   │
│ │                            │  │  WHAT DO YOU SAY?                     │   │
│ │                            │  │ [ Correct the misunderstanding ]      │   │
│ │                            │  │ [ Ask what the job actually is ]      │   │
│ │                            │  │ [ Ask for the restroom again ]        │   │
│ └────────────────────────────┘  │                                        │   │
│                                 │  Inspect slip · Notes                 │   │
│                                 └────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────────┘
```
The side rail has explicit modes: **Narration / Conversation / Decision / Document**. Not every mode occupies all its height. Clicking **Inspect slip** replaces the side content with a zoomed document and a clear **Return to conversation**. Big primary buttons only when a choice must be made; other actions remain small but accessible. No persistent verb bar, deck, health HUD or protagonist sprite.

**Strength:** Best chance of balancing spacious art with readable choice-driven interaction. **Risk:** rail could feel empty in quiet scenes, or too visually similar to B if overfilled; must not resize/move the scene or lose a dialogue's place on mode changes. **Question:** Does the contextual structure feel natural, or artificial?

---

## Shared design assumptions for the three later VISUAL mockups
1. Same opening lobby, perspective, light and color scheme: compare interfaces rather than three different background illustrations.
2. No protagonist sprite in the first comparison, **only as a test condition**. Do not treat its absence as a decision.
3. Make the NPC portrait visibly more detailed than the receptionist's small figure in the scene, but still drawn as chunky pixel art.
4. Hybrid actions: clearly shaped large primary-choice buttons; quiet secondary text buttons with clear hover/focus states.
5. High contrast, readable typography, sizable click/touch targets and non-pixelated paragraphs are *possible* even if illustrative art is at low res. Check legibility before deciding whether UI text needs the exact background pixel grid.
6. Use realistic dialogue length, including how the UI behaves for a longer paragraph, three long choices, and a document opened mid-conversation. The ASCII layouts intentionally simplify text.
7. Don't introduce a cursor-driven puzzle, a roaming player sprite, character stats, permanent cards, battles or clickable scenery to make the first screens seem 'more game-like'.
8. Show one moment of retro-future wonder: a strange tube or mechanism that clearly works, not just a shabby office.

## Compact comparison worksheet
| Criterion | A: Quiet Frame | B: Bureaucrat's Desk | C: Responsive Rail |
|---|---|---|---|
| Scene visibility at rest | Very high | High, within left panel | High, fixed left panel |
| Scene visibility in dialogue | Partly covered | Fully preserved | Fully preserved |
| NPC portrait | Floating contextual inset | Always-visible panel space | Contextual portrait in rail |
| Choice presentation | Temporary lower shelf | Permanent right panel | Right rail changes to choice mode |
| Player emphasis | Illustrated cinema | Explicit digital gamebook | Scene + gamebook hybrid |
| Item / document access | Overlay/modal risk | Natural persistent pane | Rail swaps to document mode |
| Main danger | Hidden UI / occlusion | Clutter / 'web form' feel | Empty / inconsistent rail |
| Current recommendation | Useful extreme | Useful extreme | **Provisional favorite**, not selected |

## What the owner should annotate next
Review A, B, C individually. Especially useful: **(1) what feels closest to the game, (2) what to steal from another version, (3) where a portrait ought to sit, (4) whether the permanent rail is welcome, (5) whether the player should ever be pictured.**

**Next deliverable after notes:** actual side-by-side **original pixel-art visual mockups** of the lobby in all three UI modes, incorporating the owner's feedback. **No engine, gameplay or other implementation** until later roadmap stages.

## Story continuity note (not part of visual mockup scope)
The protagonist's first goal was simply **to use the bathroom**. A couple of prior scenes or incidental events lead them to duck into this institution to ask the receptionist for directions. The receptionist's bureaucratic assumption sets the plot in motion. The player can keep trying, but authorization, interruption, crises and assignments prevent the simple objective; this **may become a running gag**. Preserve the possibility of never actually reaching the bathroom, but keep it sparing so it remains amusing and does not undermine stakes or feel like punishment. Do not assume a literal bladder meter, a bathroom minigame, or bodily-humor emphasis.
