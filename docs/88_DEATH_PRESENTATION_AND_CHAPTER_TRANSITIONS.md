# 88 — Death presentations and chapter transitions

**Project:** The Acceptable Error
**Owner direction recorded:** 2026-11-15
**Status:** Design intent recorded; visual treatment and runtime implementation NOT approved or built.
**Authority:** Owner instructions in the Story & Creative Director conversation. This document does not rewrite existing routes or save logic.

## 1. Unique illustrated death screens — owner decision

Inspired by the death screens in classic King's Quest and Leisure Suit Larry adventures, with the deadpan absurdity of a single-panel Far Side-like cartoon. These are references to a presentation tradition and comic tone, **not authorization to copy particular art or jokes**.

When a player actually dies, present a **large centered overlay spanning the overall 16:9 game composition**, not just the left scene image or NPC conversation rail.

Each unique death presentation contains:
- A **custom aftermath illustration/sprite**, an absurd single-frame visual punchline depicting the particular death's consequences. Do not use one generic skull or repeated image.
- A **brief tailored narrative**, sarcastic, ridiculous, self-deprecating toward the fictional protagonist, and sometimes deliberately stupid. The joke may be bureaucratic or slapstick, but should not attack the real player.
- **Player-controlled replay actions**, such as begin again or return to a checkpoint where truly supported by the save/checkpoint rules.

Every distinct fatal outcome should receive appropriate unique illustration and copy. Distinguish differently caused deaths even where several branches converge on one fatal ending node. The presentation is a **comic coda**, not a horror jumpscare. Maintain the game's low-resolution aesthetic, though overlay image dimensions and degree of pixel detail are not locked.

### Owner's concrete visual references — 2026-11-15

The owner supplied two classic *Space Quest* death-dialog screenshots to sharpen this direction:

1. **Larger center-screen death box:** compact illustrated aftermath at left, unusually sardonic text at right, an optional joke/headline across the top (example's headline: “Don't Trust Guys in Black Spacesuits”), and Restore / Restart / Quit buttons in the same main panel.
2. **Smaller deadpan panel:** comic aftermath art on a simple gray stage, short text beside it, and a separate, narrower row of buttons below; surrounding screen remains visible.

The shared appeal is **absurd visual aftermath plus a short sarcastic or stupid punchline**; not simply a formal “you died” message. The whole 16:9 game should remain the context, with a centered popup large enough to read and see the art. The joke belongs in the situation-specific illustration and copy, not necessarily a title.

**Owner has explicitly NOT decided:**
- Whether the death has a headline at all, or where it goes (if present).
- Whether the art is a square/rectangular fully illustrated inset **or** a transparent cutout sprite against the popup surface.
- Whether the buttons live within the death description box **or** in a physically distinct attached/separate control panel.
- What the buttons say or which checkpoint/replay behavior they provide.

Do not interpret any one reference layout or assistant preference as a locked design. **First design study:** render both illustration formats for the **same Rest Assured fatal scenario** in the actual game UI, comparing clear readability, comic timing, spatial hierarchy, and the visual relationship between scene, death illustration, and buttons. Use original The Acceptable Error artwork and jokes, not copied Sierra imagery. After owner feedback, finalize reusable layout dimensions and button interaction contract before mass-producing death vignettes.

### Owner-locked backdrop and protagonist treatment — 2026-11-15

- **The underlying 16:9 gameplay frame freezes and becomes visibly DIMMER and CHUNKIER-PIXELATED**, as in a vintage SNES-style pixelate transition. The pixels become larger, hard-edged blocks; use nearest-neighbor sampling, NOT blur or a smooth translucent wash alone. Background game context remains recognizable but clearly de-emphasized. This pixel treatment is applied to the background ONLY; preserve crisp modal art/text/buttons.
- **NEVER show the protagonist's face in any death illustration.** Keep it cropped outside the frame, turned away, blocked, or covered; or omit the protagonist entirely. The rule also applies to implied faces in reflections or inset photographs.
- **The aftermath is the subject, not necessarily the corpse or death moment.** An alien that has finished a meal can be funnier than a depicted eating scene; an apparatus proudly displaying its completed work can be funnier than depicting the fatal incident. A death sprite may consist entirely of the surviving cause/environment.
- These are owner-established rules. Pixel block size, darkness percentage, overlay dimension, illustration framing and controls remain for comparative review.

See docs/90_DEATH_SCREEN_REUSABLE_DESIGN_BRIEF.md and docs/91_REST_ASSURED_DEATH_MOCKUP_CODEX_BRIEF.md.

### Interaction details still unresolved

- Whether to dim underlying UI; overlay frame, title, art dimensions and typography.
- Number of controls, exact labels, focus/input behavior and optional confirmations.
- If/when a safe checkpoint can exist, what is restored on retry, and when that option should be displayed. **Checkpoint restart is a requested possible feature, not an implemented promise.**
- Whether the player may inspect NOTES/inventory behind an open death overlay.

The death presentation triggers only on an actual fatal result. Ordinary failed dice rolls with nonfatal consequences, equipment registration, and successful chapter exits are not deaths. No automatic save reset before a player action.

### Chapter 1 first implementation obligation

Chapter 1 currently contains one fatal ending node, exit_chair_fatal (Rest Assured), with **three distinct entry causes** from chair_locked:
1. Failed red-stapler breakout check.
2. Failed unarmed breakout check.
3. Voluntarily accepting the permanent relaxation treatment.

The owner calls for each death to be customized. Preserve the specific fatal cause in the presentation data so the result does not default to generic art/copy merely because all three routes enter exit_chair_fatal. **Three cause-sensitive death vignettes are the design target unless the owner explicitly groups them.** At minimum Rest Assured needs a custom illustrated death presentation.

No death-comic image or popup art has been commissioned/generated for Chapter 1 as of this note.

## 2. Chapter transitions — owner direction (DEFERRED UNTIL LATE PRODUCTION)

**Priority ruling (owner, 2026-11-15):** Defer chapter-title interstitials, pixelation/fade treatments, type-on text and related visual polish until most chapters and other gameplay systems are implemented and working. This is **not a blocker** for Chapter 1–2 artwork integration, Chapter 2/3 story development, route QA or core engine work. For now, preserve reliable transitions and carried state with the existing functional scene/chapter change behavior. Revisit the final presentation near the end of game creation.

**The same reusable audiovisual transition sequence is eventually used between chapters, regardless of which previous-chapter exit triggered it.**

Candidate sequence:
1. The present interface fades, pixelates, or otherwise transitions away.
2. The next chapter's number and title appear, possibly typed on.
3. The next scene and its UI content populate.
4. The transition reverses to reveal that scene.

**Not yet decided:** fade versus pixelate, exact timings, chapter-title art and typography, whether sound plays, how the title types, blank/frame hold, and reduced-motion variant. These are possibilities, **not a finalized transition specification**.

**Crucial gameplay distinction:** a shared transition appearance DOES NOT mean forcing every branch to the same starting state, location or narrative. Preserve inventory, flags, item marks, checks, NOTES, autosave behavior, and the distinct Chapter 2 entry routes and their consequences. The title beat is common; the eventual scene may vary with route.

The title should use chapter number and title data, not be baked into a location-specific image. Do not treat the engine's existing preload/crossfade as proof that the requested chapter-title interstitial exists.

## 3. Responsibility and gates

| Feature | Status | Next owner/PMO gate |
|---|---|---|
| Centered unique death comic and sarcastic aftermath text | Owner direction locked; no new image produced | Death mockup, per-cause art/story copy, owner approval |
| Begin again / checkpoint controls | Intent recorded; checkpoint rules unresolved | Gameplay PMO defines safe resume/reset contract |
| Uniform chapter-title transition | **Deferred until late production**; visual treatment undecided | Revisit after most gameplay is working; preview alternatives then |
| Carry through chapter-specific consequences | Existing engine/story continuity, reaffirmed | Regression QA for every route |

Story Director: compile fatal outcome causes, commission unique art and comic copy, preserve chapter title puns. Art PMO: propose overlay composition after technical sizing. Gameplay PMO: determine death presentation state, checkpoint semantics, transitions, preloading and QA. Owner: creative approval before broad implementation.

**This document records design decisions only. No merge, engine change, death art generation, scene rewrite or deployment is authorized by it.**
