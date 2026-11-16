# 91 — Codex production brief: Rest Assured death-screen layout study

**Repository:** InterstellarHarvest/CYOA
**Purpose:** Produce a SMALL PRIVATE, NON-PRODUCTION design study for the reusable death-screen presentation using ONE Chapter 1 Rest Assured fatal scenario. Generate actual original artwork / static visual proof, not just a written plan.
**Read first:** docs/88_DEATH_PRESENTATION_AND_CHAPTER_TRANSITIONS.md, docs/90_DEATH_SCREEN_REUSABLE_DESIGN_BRIEF.md, current game's 1920×1080 shell/production UI contract, and the Chapter 1 death nodes.

> **Historical study brief:** The first study is complete. The owner has since approved the A1 framed layout with integrated button slots, title on, 10px background pixelation, 65% darkness, x=280/y=135 at 1920×1080, and exact toes-up sole-visible art. Do NOT reuse this brief to regenerate artwork or infer that layout alternatives remain open for this death. The next stage is `docs/93_REST_ASSURED_APPROVED_DEATH_PRESENTATION_IMPLEMENTATION_BRIEF.md`. Button text and actions are still undecided.

## 1. Starting reference and scope

Use a new isolated art-review branch/worktree from a verified available private branch; do not touch anyone else's current art/content branch. Start with the already created chair-in-use illustration:

review/chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-in-use-v04.png

Its room palette, hardware, chair geometry, picked upholstery tuft, restraints, recline and the warm domestic House styling are visual continuity anchors. Also inspect Chapter 1's chair_warning, chair_locked and exit_chair_fatal narrative in story/chapters/chapter-01.draft.json.

The **same scene and same death gag** must appear in every mockup option. Do not produce three different cause-specific stories at this stage. Do not modify the existing chair scene or UI shell.

## 2. Chosen first death for a fair comparison

**Cause:** player selects STOP STRUGGLING AND ACCEPT THE FULL TREATMENT (voluntary surrender to permanent Rest Assured comfort).

**Original illustrative concept:** The House has presented the occupied Rest Assured chair as a finished domestic product. The person is wholly concealed beneath an absurdly tidy tucked-in cover, or reduced to faceless shoes extending from under it; the House's small green indicator glows with institutional pride. A small, readable period placard could say SATISFIED CUSTOMER or PERMANENT COMFORT if the artwork scale permits, but avoid fake unreadable microtype. The image should suggest a completely inappropriate congratulatory demonstration, not a horror corpse portrait. No visible face, reflections or identifiable facial details. If an even clearer non-body aftermath gag is found while drawing, include it as a separately named exploratory candidate; do not quietly change the common test image between layout variants.

**Working copy (provisional, same in all layouts):**
“You have achieved permanent relaxation. The House is delighted to report that its newest customer has stopped complaining.”

This is a placeholder for the first visual test, not final story copy. Keep it short and readable. Do not include a mandatory death headline in the default view.

## 3. Required 2×2 presentation matrix

Present the same original aftermath illustration, same prose, same background, same effective overall popup size and comparable text widths, with two independent choices:

- **Illustration mode A — framed comic inset:** a self-contained rectangular or square illustrated scene mounted inside the death box.
- **Illustration mode B — transparent cutout:** same chair/aftermath motif isolated as a transparent RGBA sprite on the popup's background, without a separate rectangular vignette.
- **Control layout 1 — integrated:** sample buttons in the principal box's bottom band.
- **Control layout 2 — separate:** the same buttons and labels in a narrower attached or detached panel underneath.

Provide ALL FOUR combinations: A1, A2, B1, B2. Start with NO headline. Include an independent optional-headline toggle in the lab, e.g. “PERMANENTLY SATISFIED,” but do not lock any title style or place that heading permanently in the art. The same material should be compared across all four so the decision is about layout.

**Button labels:** use clearly marked design placeholders such as RETRY / BEGIN AGAIN / EXIT across all four comparisons. They need not function as gameplay commands. No checkpoint mechanism may be implied to exist. The review lab's layout switches must work; the sample death-screen actions must NOT delete a save, navigate a live game, or pretend that resume/checkpoint logic is implemented.

## 4. Backdrop treatment — owner-locked

Use an actual capture of the CURRENT The Acceptable Error UI at a Chapter 1 chair-death-like moment, with approved outer shell, scene, portrait/choices area and footer at 1920×1080. If the local art worktree does not have a runnable game or the scene is still a placeholder, obtain a real shell screenshot from the playable branch and place the existing chair art into the left scene region in a clearly labelled **design composite**. Never fake an unrelated new game UI.

Freeze the entire 1920×1080 composition behind the popup. Apply visible blocky nearest-neighbor pixelation, then darken it. **NO blur or bilinear smoothing.** Do not apply pixelation/dimming to the modal itself. A modest range of block sizes (for example 6, 10 and 14 display pixels) and dim strengths (for example 45%, 55% and 65% darkening) can be explored; these are review presets, NOT final values. Make sure a viewer can still recognize the room and UI beneath.

Test without animation first. This is about final appearance, not a full-screen fade or chapter-transition effect. Avoid flashy glitches and static noise.

## 5. Visual and layout guardrails

- Original low-res pixel art; strong readable silhouette; compact pixel clusters. Keep House ivory, aqua, coral and light aluminum without steampunk/gothic decoration.
- A large centered popup over the whole game, properly balanced against a 16:9 shell. Do not constrain it to the main-scene left pane.
- Crisp foreground pixel text; preserve reading order and readable spacing between illustration, narrative and controls. No tiny fake lettering.
- Absolutely no protagonist face or face-like reflection. The art may omit the protagonist entirely.
- Do not copy the user's example Space Quest images or their exact captions/UI sprites.
- Preserve existing art review files and production asset hashes. Don't modify story JSON, existing assets, engine, gameplay renderer, input handling, or game saving.

## 6. Concrete deliverables

Under a new private review folder, e.g. review/death-screen-layout-study-2026-11-15/, create:

1. **One original framed-scene illustration** for the selected Rest Assured gag, with source and native pixel-grid export.
2. **One transparent sprite/cutout version** preserving the same narrative visual gag; record its native dimensions, palette and binary-alpha validation.
3. **Four 1920×1080 full-screen comparison screenshots** (A1, A2, B1, B2) in the actual game shell with the owner-locked background treatment.
4. **A local static comparison lab** (HTML/JS, no game/runtime writes) that switches art mode, button placement, headline on/off, background block size and background darkness. Default to no headline. Every visible control in the lab must perform its claimed review function.
5. **A side-by-side contact sheet** at native and useful preview size; include close inspection of foreground pixels.
6. **README, design notes, exact image-generation prompts, original sources, selected hashes, dimension/alpha/difference checks, and provenance**; report the exact game shell capture/base used and whether any compositing was required.

Run local preview/gallery QA for broken links, 1920×1080 frame dimensions, hard-edged nearest-neighbor backdrop, clean unaffected source files, correct variant matrix, functional layout switches, and absence of the face. Browser QA where available; record accurately rather than claiming tests not performed.

## 7. Scope and handoff

Do NOT implement death triggers, schema changes, restarts, checkpoint saves, new Chapter 2 art, chapter-title transitions, or the other two Rest Assured fatal causes. Don't merge, deploy or promote art. Preserve existing worktree branches and all source/review versions. Commit and push an isolated private review branch; report the review URL/path and full commit SHA.

**Owner review questions:** framed vs cutout? Integrated vs separate controls? Title or no title? Is the pixelated darkness the right amount? Does the image communicate a funny fatal aftermath at first glance? Only after these decisions should the remaining customized death images be commissioned.
