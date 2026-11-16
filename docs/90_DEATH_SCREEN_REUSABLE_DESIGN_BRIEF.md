# 90 — Death-screen reusable design brief

**Project:** The Acceptable Error
**Recorded:** 2026-11-15
**Status:** Design direction locked where specified; compositional options deliberately remain undecided. Do not implement or generate production images without review.

## Purpose and tonal target

A custom illustrated aftermath for **each distinct death** in the spirit of the classic Sierra adventure death boxes (*King's Quest*, *Leisure Suit Larry*, *Space Quest*) and the deadpan visual surprise of an absurd single-panel newspaper cartoon. This is an influence on composition and humor, **not** a brief to reproduce a copyrighted screenshot, character, caption or joke.

The laugh should usually come from the **aftermath and the House/world's oblivious satisfaction**, supported by one to three terse, sarcastic sentences. The narrator may ridicule the protagonist's circumstances, misplaced confidence and institutional absurdity; do not insult the human player. Aim for a clear immediate punchline, not a long explanatory paragraph or generic “GAME OVER.”

## Owner-locked visual and content rules

1. **Whole-screen pause, centered death popup.** Freeze the moment of death behind the popup in the game's actual 16:9 layout, including scene and right rail. The popup occupies the center of the whole composition, not the left scene alone.
2. **Background DIMMED and CHUNKY-PIXELATED.** Make the frozen game behind the popup significantly darker and visibly lower-resolution / larger-block, evocative of an SNES pixelation effect. Use nearest-neighbor downsampling/upscaling and hard square pixels. No blur and no soft filtering. The exact block size and dim percentage remain adjustable for review.
3. **Crisp readable foreground.** The popup artwork and text remain sharp at their own pixel scale, without the background's additional coarsening; protect text readability and accessible contrast.
4. **NEVER depict the protagonist's face.** Crop it, obscure it, turn the figure away, cover it fully, or omit the figure. The prohibition includes reflections, photographs and silhouettes that reveal facial features.
5. **Aftermath-first comic framing.** The illustration may depict a surviving alien, smug machine, empty furniture or bureaucratic consequences **without showing the protagonist at all**. A partial faceless body is acceptable only where it strengthens the gag.
6. **Death-specific art and prose.** Distinct fatal causes should have recognizable individual punchlines and illustrations; avoid reusing one scene and changing only a caption.
7. **Game visual family.** 1960s retro-futurist world colors, purposeful pixel clusters, simple silhouettes, a little retro mechanical awkwardness. No gothic horror, gratuitous gore, generic glowing red skulls, steampunk brass or dense dithering.
8. **Nonfatal failures are not death screens.** Checks that still permit escape, chapter exits and administrative complications remain in ordinary gameplay.

## Intentionally open design decisions

- **Illustration framing:** self-contained square/rectangular comic illustration in a box, versus a transparent cutout aftermath sprite interacting with the modal surface.
- **Buttons:** contained within the text/image box, versus a distinct button strip beneath it.
- **Headline:** optional joke title across the top, or no title at all (owner is uncertain about titled deaths).
- **Controls:** labels, count, command meanings, whether restore/checkpoint is truly available, keyboard/focus behavior and when to reset state.
- **Layout parameters:** popup overall width/height, art-to-copy ratio, panel frame, pixel block size, dim amount, animation/easing and reduced-motion alternative.

Do **not** lock these by accident in a mockup. For a fair test, hold death story/art concept/background constant while comparing the alternative presentations.

## Suggested semantic data for later engine planning (NOT a schema decision)

A fatal event should retain a stable cause ID, its aftermath art reference, prose and optional title. Do not assume one ending node implies one fatal cause. The UI must not clear the save/inventory/NOTES until a selected action legitimately calls for it. “Return to checkpoint” is not to be displayed as a functional action unless safe checkpoint semantics are actually implemented.

## First chapter's fatal cases

The Rest Assured chair has one shared fatal node, exit_chair_fatal, reached by **three causes**: failed stapler breakout, failed bare-handed breakout, voluntary permanent treatment. The first mockup study uses **voluntary permanent treatment** to compare visual formats only. Later, author independent cause-aware illustrations/prose for failed stapler and failed unarmed escape (unless owner subsequently chooses to group them). Chapter transitions are a separate late-production task and are not part of death-screen work.

## Review standard

Owner judges whether the joke lands, art reads at 1920×1080, foreground clearly separates from the dim chunky game context, the face remains unseen, and both framing and button-placement choices are genuinely comparable. A prototype is NOT an approval to implement death save/restart behavior or to mass-produce art.
