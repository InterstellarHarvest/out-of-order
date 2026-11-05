# CYOA M1 — PMO Placement Lab Review 01

**Date:** 2026-11-01  
**Reviewed head:** `222e7814c5306e0bf2a7704aa6ee01412213fb1f`  
**Branch:** `agent/m1-pixel-placement-lab`  
**Decision:** **ACCEPT THE PLACEMENT LAB AS A DEVELOPER REVIEW TOOL; DO NOT APPROVE PROPOSED GEOMETRY AS CANON YET.**

## Evidence inspected
- Git comparison against `ca049418ccdf4607acc99fe421de80da4c2bd7f5`: 27 added files, zero modified files. Original shell, locked ZIP, V5 sprites, accepted package, v1 geometry contract remain unmodified.
- `FIT_AND_SCALE_NOTES.md`, measured shell regions, proposed geometry v2, QA results.
- Full-resolution Git screenshots: `01_default_seven_slots_fit.png`, `05_six_slots_native_arrows.png`, `07_native_utility_and_thumb_overflow.png`, `08_utility_half_scale_alternative.png`, `02_pressed_notes_right_arrow_and_card.png`.
- Claimed **336/336** Chromium/Firefox QA passes, 9 fault injections correctly failing; report inspected, tests not independently rerun by PMO.

## PMO assessment / recommendations (not owner locks)

1. **Seven inventory slots:** RECOMMENDED default. This preserves the prior seven-slot lock and is more useful in the same fixed bay. Six slots at 96×96 leaves more breathing room and permits native arrows, but it loses one visible item; the six-slot mode was only ever a comparison, not a newly approved replacement. Seven at 52×80 arrows looks coherent in the real shell; obtain owner confirmation before editing locked geometry.
2. **Arrow presentation:** RECOMMEND 52×80 display for seven slots, without rewriting the V5 PNGs. The six-slot native arrows are visually heavier. Keep the V5 owner-approved art untouched. Do not silently change the left arrow's approved mirrored press pixels; document `(-2,+3)` left vs `(+2,+3)` right as known asymmetry for review.
3. **Utility button geometry:** Native 243×205 is visibly impossible. RECOMMEND **135×114** as stronger bay-filling default versus 122×103, which leaves more surrounding negative space. But 0.5556 nearest-neighbor thinning of tiny rim details must be judged at 1:1 by the owner. Alternative 0.5 remains in the lab. The screenshot `07` demonstrates why native is rejected.
4. **Choice scrollbar:** RECOMMEND 20px, 0.5 display width, fixed 10px caps and repeated middle in the measured 23px channel. Full-size 40px demonstrably obscures the dark rails. Requires owner visual signoff on caps and channel inset.
5. **Choice cards:** Keep original sprites at 548px native width and 80/108/136/164px heights; 12px gaps. The three 108px cards need 348px vs measured 338px panel but fit in 355px unobstructed vertical band. Their slight frame overhang seems consistent with the intentionally hybrid UI; do **not** crop or resize merely to fit 338px. Check the exact 3px/+3px pressed overflow at panel edges in live review.
6. **Objective:** The `CURRENT OBJECTIVE` plate appears centered and description has adequate left padding in the tested screenshot. No art change.
7. **Button press:** Lab swaps to recessed DOWN sprite; code-rendered text moves +2,+2. Verify owner perceives physical travel in motion before finalizing. Do not create a third art state or recolor.
8. **NPC speech indicator:** Existing code-drawn placeholder is appropriate for a small dark rounded rectangle, because the static source has no rivets around the speech gutter. No new sprite is necessary unless the owner requests it.
9. **Font:** Use matching 512×50 locked dark/light atlas and JSON; exclude the mismatched 364×78 legacy font in runtime.
10. **Six-slot growth:** Owner earlier asked to test six slots that might be slightly larger; present six unchanged 96px slots as a count comparison only. Enlarging a source sprite requires explicit art/scale decision, not a silent override.

## Review gate

**Approved:** lab tooling, traceability, measured regions as evidence, integer-coordinate placement/export design, and technical test report as supplied.

**Not yet approved:** number of slots; final control display scales; proposed v2 geometry JSON; production runtime integration; any modifications to original shell or packaged artwork.

**Next owner choice:** retain **seven** 96px slots with **52×80** visually reduced arrows (recommended), or switch to **six** 96px slots with **native 83×128** arrows. After that, owner should inspect 135×114 vs 122×103 utilities and confirm 20px choice thumb. Keep the lab branch unmerged and make no runtime changes until owner signs off.

## PMO closeout

**Tooling PASS / GEOMETRY REVIEW OPEN.** The blockers are display fit and owner preferences, not need for new sprite art.
