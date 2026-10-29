# M1 — Classic UI references and proposed rules for Concept C
**Status:** comparative design research and a recommended visual test, **not a final UI lock**.  
**Date:** 2026-10-29. The owner favors **Concept C (contextual rail)** with **Concept B's larger detailed NPC portrait**.

## Historical precedent: borrow the solutions, not the game mechanics

### Fallout 1 / Fallout 2 — a conversation has its own composition
The extended-dialogue screen emphasizes a large, expressive talking-head portrait (for selected NPCs), with NPC speech below and the player's possible replies below that. Dialogue-specific actions such as review or barter are separate. Some replies depend on previous actions/skills/knowledge. The focus is the *character and decision*, not moving a character around the map. The game often shifts into a dedicated conversation presentation rather than simply appending a few lines over the regular world.

**Use:** a sizable framed NPC portrait, hierarchy speaker -> statement -> clearly distinguished replies; choices vary with knowledge. Portrait detail can exceed the scenic NPC pixel density.

**Avoid:** taking over the entire screen with retro-console chrome; assuming every incidental passerby needs an expensive speaking portrait; copying Fallout's exact interface.

Sources: original Fallout manual (extended dialogue): https://cdn.cloudflare.steamstatic.com/steam/apps/38400/manuals/Fallout_manual_English.pdf?t=1572025441 ; Fallout 2 manual extended dialogue: https://www.manualshelf.com/manual/games-pc/fallout-2/user-guide-english/page-66.html

### King's Quest VI — art first, framed speaker when relevant
In its Windows CD release, higher-detail framed speaking portraits appeared atop its lower-resolution illustrated environments; the typical scenic view could be uncluttered. A top icon toolbar served walk/look/use/talk and similar cursor actions.

**Use:** warm, characterful decorative portrait framing; strong illustrated compositions; contextual presentation rather than permanently tiled buttons.

**Avoid:** defaulting to click-to-walk, pixel hunting, a permanent action icon bar or reusing copyrighted art/interface elements.

Sources: https://sierrachest.com/index.php?a=games&fld=general&id=6 ; https://strategywiki.org/wiki/King%27s_Quest_VI%3A_Heir_Today%2C_Gone_Tomorrow/Controls

### Maniac Mansion — persistent verbs and inventory clarify an open-ended action grammar
A visual scene sits above permanent command words and inventory; players construct verb/noun actions. This solves a *point-and-click manipulation* problem, at the cost of a large persistent UI.

**Use:** stable locations for interaction and visible affordances.

**Avoid:** the underlying permanent verb grammar. Our primary activity is choosing a narrative action, not finding the correct parser combination.

Source: original manual https://tyderion.com/scumm/maniac/Maniac_Manual.pdf

### The Secret of Monkey Island / Monkey Island 2 — change interface when in conversation
The traditional SCUMM presentation permanently showed movement/action verbs and inventory below the scenic view during exploratory play. During dialogue, the player selected context-specific lines at the lower screen; the conversational choice mode replaced the normal verb workflow.

**Use:** one UI region with *distinct activity modes*, so available actions are relevant to the present story beat. Constrain the number of visible actions rather than dumping every system into the screen.

**Avoid:** a large full-time action grid, a classic adventure-game cursor grammar and a permanent deck/inventory hand.

Source: original Monkey Island 2 manual https://www.lemonamiga.com/doc/monkey-island-2-lechucks-revenge/1101

## Proposed synthesis: C+ / The Responsive Story Rail, large-portrait variant
**The owner has selected C over A/B as the direction for exploration, with the larger detailed NPC portrait characteristic of B. This section is our suggested first visual test, NOT a final layout approval.**

### Screen geometry and spatial budget
- **16:9 outer composition**; keep the main **scene roughly 4:3** even though the whole window is wide.
- As a visual test, split ~**70% scene / 30% rail**, with the scene fitted to ~4:3 within its region and small surrounding trim. This is *proportional* guidance, not a fixed resolution.
- Why not demand full-height 4:3 art? On an exact 16:9 frame, full-height 4:3 image consumes exactly **75% of the width**; that leaves only 25% for the rail. A modestly inset scene can free ~30% width for readable dialogue and substantial portraits without cropping the art.
- **Scene stays spatially anchored** at all times: no resize, pan or rearrangement when conversation, choices, journal or inventory arrives.
- The panel is a coherent physical-looking surface (period scientific-office materials), not a solid blank rectangle waiting for controls.

### Proposed stable hierarchy, by interaction mode

| Mode | Portrait | Rail contents | Primary action |
|---|---|---|---|
| **Narration** | No portrait | Location name/short narrative; subtle period graphic, small continue affordance | Continue |
| **Conversation** | Large detailed framed portrait at top; face has room for expression | Named speaker; 1–3 short readable lines of dialogue; 2–4 clearly spaced replies | Choose a response |
| **Decision** | May disappear or be smaller only if no one is speaking (do **not** shrink during the same conversation) | Brief stakes and 2–4 actions | Choose an action |
| **Document** | Replaced by enlarged ticket/report/item illustration | Clear document text/meaning and a back action | Read / use / return |
| **Suspense or reveal (optional)** | None or a contextual close-up | One dramatic line or no choices at all | Continue / a choice when appropriate |

A large portrait is **not a permanent empty placeholder**: when no one is talking, narration or illustrated document layout uses that space instead. The *rail's frame and scene stay fixed*, while individual mode-specific contents differ.

### Reading and control rules to test in mockups
1. **Visual priority:** scenic picture first, NPC portrait second, player choices third, minor utilities last. The currently required action should always be obvious.
2. **Big NPC portrait:** give the portrait a substantial share of the rail's top half during speaking. Do not reduce it to an app-style avatar. Use a separate pixel-density budget for portrait art (same crisp pixels, more logical detail).
3. **Primary choices:** 2–4 prominent, full-width options; **three** is the expected regular case for the test. Long labels wrap. We don't require every scene to offer three choices and we don't invent meaningless choices to fill space.
4. **Secondary actions:** 'Inspect slip', 'Notes' etc. are compact, visibly interactive and conventionally placed. They must not look like competing primary choices. No persistent deck, skill/action strip or verb grid.
5. **Text budget:** prioritize concise writing, but do not force unnatural one-line dialogue. Longer speech can advance in deliberate text beats or use a clearly labeled scroll area; the reader must not lose context. Test one lengthy reply and one lengthy NPC speech.
6. **No vanishing essential actions:** save/settings/journal entry must be discoverable using pointer, keyboard and touch; 'hidden UI' is not license for hover-only navigation.
7. **Narration isn't an empty rail:** a short location label, narrative line(s), purposeful illustration/period paper treatment and Continue can inhabit the same region, without fake gauges or filler readouts.
8. **No bloating when busy:** don't show evidence summary + character portrait + 5 choices + inventory + map + meters in one state. Nonurgent material appears in its own view.
9. **No scene object hunting required:** narrative choices govern progress, with occasional specifically signposted object/document use where warranted.
10. **No protagonist sprite implied:** first visual study may omit it; this is a test, not an irreversible choice.
11. **No forced countdown:** the story's tension need not be conveyed through timed UI while the user is reading. Time pressure, if ever used, is a later design choice.
12. **Readable artwork/UI relationship:** background art uses true pixel grid + integer scale. The UI can use a careful contrasting text scale so story paragraphs remain readable, especially with a narrow rail; compare typographic treatments rather than assuming one shared pixel size.

### ASCII test composition: dialogue with large portrait
```text
┌──────────────────────────── 16:9 ─────────────────────────────────┐
│ ┌────────────────────────────────┐ ┌─────────────────────────────┐ │
│ │                                │ │ ┌─────────────────────────┐ │ │
│ │                                │ │ │   LARGE FRAMED NPC      │ │ │
│ │  RECEPTION LOBBY               │ │ │   PORTRAIT IN PIXELS    │ │ │
│ │  SCENE NEAR 4:3               │ │ └─────────────────────────┘ │ │
│ │                                │ │ MISS VOSS                   │ │
│ │  static framing; no protagonist│ │ “Your appointment is in     │ │
│ │  walkaround required           │ │  excellent order.”          │ │
│ │                                │ │                             │ │
│ │                                │ │ [ That's not my name.      ] │ │
│ │                                │ │ [ What appointment?        ] │ │
│ │                                │ │ [ Where's the restroom?    ] │ │
│ │                                │ │                             │ │
│ └────────────────────────────────┘ │ Inspect slip · Notes        │ │
│                                    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```
The next mockups should show a **larger portrait than the original Concept C written sketch**, not just a little avatar. Exact balance, margins and type size remain open for visual review.

## How to stress-test the proposed design
The same scene must be represented in **at least three states**:
1. **Quiet reception:** one narrative beat and Continue; no speaking portrait; rail feels purposefully composed rather than vacant.
2. **Receptionist exchange:** portrait at full intended size, enough dialogue and three primary choices; none clipped or lost.
3. **Appointment slip inspected:** a detailed document illustration replaces the portrait and controls without cropping/shifting the scene; easy return to conversation.

For the visual review, consider one **alternate dramatic portrait treatment** in which the character face temporarily enlarges/reframes **within the rail** at a major revelation, without introducing a completely new full-screen mode. Evaluate against the normal version; don't implement automatically.

## Decisions and risks to review after visuals
- Is 30% rail enough width for meaningful prose? Would a bottom strip or temporary overlay be preferable for longer text?
- Is the portrait convincingly prominent, or still too small? Does its top placement feel good?
- Does the inactive rail look like purposeful story presentation, or like dead UI space?
- Should certain special moments allow temporary full-stage art, or would that hurt consistency?
- How do we handle multiple speaking characters, lengthy text and more than four viable choices?
- Does the panel itself feel like an actual 1960s-future civic apparatus without overwhelming the bright scene?

## Direction summary
**Owner preference:** Responsive Story Rail (C), larger illustrated NPC portrait from B.  
**Suggested UI rule:** keep the **scene and panel geometry stable**, change the panel's **activity mode**, and use **predictable visual hierarchy**.  
**Next milestone action:** after the owner weighs this design, make *original, same-scene pixel-art visual mockups* for quiet/dialogue/document states. **No implementation code** is implied.
