# 106. Presentation capabilities: text-led scenes (C1) and voice-led dialogue (C2)

**Authority:** Nate approved both on 2026-11-24 (storyboard PR #31, docs/137 §8 and §14). He asked for them as a separate, reviewable engine PR that preserves dialogue, narration, speaker labels, CONTINUE behaviour and existing gameplay rules.

**Scope:**
- Generic engine and importer capabilities, plus their QA.
- No content changes: `story/`, the generated story, art, saves and every Prologue–Chapter 3 output are unchanged (§5).
- Chapter 4 is still `notForGameplay`. Importing it is a later integration task (§6).

## 1. The canonical signals (storyboard, docs/137)

Both are owner-approved **no-image** records in `story/artwork.draft.json`. The storyboard's `check-canon` rejects any image, path, preview or nested art on them.

| Record | Meaning |
|---|---|
| scene record `format: "text-led"` | The scene has no image of its own. The previous scene image stays on screen. |
| portrait record `format: "voice-only"` | The speaker has no portrait. It leads dialogue on Narrative B, its lines labelled by name. |

Chapter 4 uses three text-led scenes (arrival, forecourt, courtyard: 5 nodes) and six voice-only speakers (door AI, bathroom AI, lift voice, salvage clerk, wedding guest, attendant: 15 nodes).

## 2. Import (`tools/story-import/convert.js`)

**Text-led scene.**
- It is listed in `story.assets.textLedScenes` (sorted) and never registered as scene art, so it produces no DEV PLACEHOLDER.
- The record must be `approved`, with no assetPath, states or closer background.

**Voice-only speaker.**
- It becomes a portrait-less cast member `{ name }`, the same shape as a docs/104 §4 incidental voice. Its dialogue nodes carry no pose or backdrop.
- Exactly one record per speaker. It must be `approved` with no assetPath, and it is never mixed with portrait poses.
- Cast names still come from the game-owned `runtime-settings.json`.

## 3. Rules (`game/js/rules.js`)

**Presentation only.** The new helpers are `voiceLed`, `surfaceOf`, `textLed` and `heldScene`. `surfaceOf` and `heldScene` are exported.

- **C2.** A dialogue node whose speaker has no portrait is written to, and shown on, the **narrative** surface (Narrative B):
  - its arrival text, results arriving there, the spoken/action **echo** (still emitted: it is a dialogue rule) and OBSERVE thoughts;
  - `view.mode` is `narrative`, `view.portrait` is `null`, `view.speaker` is kept, and `view.voiceLed` is `true`;
  - `mode` events and `resume` compare surfaces, so narration → voice-led stays on B with no fade, and voice-led → portrait dialogue fades back to the dialogue box.
- **Every rule still reads the node's own `mode`:** echo eligibility, `returnTo` / `back`, SHOW targets, OBSERVE availability, checks, effects and destinations.
- **C1.** On a text-led scene, `view.sceneHeld` is the latest earlier **transcript** entry's scene that has an image. The transcript is saved, so a reload holds exactly what play held. Scene history windows still change per scene.
- **Validator:**
  - a portrait-less speaker may lead a dialogue node, but never with a pose or backdrop;
  - `textLedScenes` must be a list of valid, unique, used ids that are not also scene art;
  - the story may not open on a text-led scene (there would be nothing to hold).

## 4. Presentation

- `story-flow.js`:
  - a held scene leaves the scene layer exactly as it is: the same image, state and overlay;
  - only a cold load draws the held scene's own image, with its key preloaded via the new `G.preloadKeys` (`main.js`), since it may belong to the previous chapter;
  - entering a text-led scene fades the other layers but never the scene layer;
  - an echo whose surface is `narrative` is appended on B, like any B text, with the same CONTINUE groups.
- `surfaces.js` `G.narrationText`: speech by a cast member without a portrait reads `NAME: "line"` on B, in NOTES and in Focus A. Portrait speakers and the player are never labelled there, so narration without such voices reads exactly as before. **No Prologue–Chapter 3 line changes**: the 12 existing incidental-voice lines are all in dialogue nodes, where the docs/104 dialogue-box label rule is untouched.
- `stage.js`: `chapterArtKeys` skips text-led scenes and voice-led portraits, and the opening art treats a voice-led first node like narration.

## 5. QA

| Suite | Result |
|---|---|
| `game/qa/validate_presentation_capabilities.js` (new, content job) | **33/33**: import, validator, surfaces, held scene, echo on B, resume, 10 mutants. The **gameplay-unchanged proof**: every route × 6 seeds reaches byte-identical rules state, rule events and transcript words as a control story where the voice has a portrait. |
| `game/qa/run_presentation_qa.js` (new, browser job `presentation`, Chromium + Firefox) | **28/28**: the held image is unchanged and never faded (also on the text-led ending and after a reload); voice-led on B with no portrait and `DOOR AI: "…"` labels; echo on B; back to the dialogue box with the portrait; the docs/104 in-dialogue label is unchanged; no page errors. |
| Full local gate after merging game main 7c06f52 (PR #23 CI + PR #24 Chapter 3 art), `node tools/ci/run-local-qa.js full` | Every content and browser step **PASS**: story import 105, Chapter 3 453 / browser 248, Chapter 2 routes 157 / browser 346, Chapter 1 art 261 / browser 164, story browser 128, death controls 45 / 102, assets 60 / 98, CI artifact policy 142, polish lab 143, layout lab (known-failures gate PASS), C1/C2 33 + 28. The **only** failing step is M2 reception Firefox 521/528: the same 7 checks, name for name, that fail on untouched main (environmental baseline). |

Real Chapter 4 (storyboard `ce504af`, read-only): the importer yields 15 voice-led nodes and 3 text-led scenes (5 nodes), with **zero** placeholders for those keys.

## 6. Chapter 4 integration findings (not changed here)

**Update 2026-11-24 (Nate):**
- Finding 1 is **resolved in canon** (storyboard PR #31 docs/139: 97 audited player lines, who `visitor` → `you`). A local check in Chromium and Firefox confirms the corrected lines render in the player's Choices face and under **YOU:** in NOTES, while Chapter 3's NPC `visitor` keeps its **VISITOR:** label.
- Findings 2–4 are **deferred** to the Chapter 4 integration work package (storyboard docs/140). They are deliberately out of scope here.

Seen while importing real Chapter 4 read-only. They are for the later Chapter 4 gameplay integration:

1. **`who: "visitor"`.** Chapter 4 uses it for **the player's own lines** (96 of 97 are all caps). Chapter 3 uses `visitor` as an NPC labelled VISITOR. Without a canon fix (Chapter 4 `visitor` → `you`, wording unchanged; needs Nate), the player's lines would be labelled "VISITOR:".
2. **Focus keys.** The three new Focus A keys (`grand_bellevue/bridal_privacy_panel`, `…/autofit_gown`, `…/three_seashells`) have two segments, but the engine requires `location/scene/target`.
3. **Per-run `if`.** 17 text runs use per-run `if`, which the engine does not support yet.
4. **Other gaps:**
   - `deathPopup` / `endingArt` node fields are not yet routed through the death-presentation export;
   - three park exits have no card;
   - one Red Stapler USE `say` echo is on a Focus node;
   - one ring check can become 100% without being marked `certain`.
