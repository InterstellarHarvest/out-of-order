# One physical entrance — closed foyer / open public exit

[Review the three views](index.html) · [Native comparison](comparisons/arrival-foyer-public-exit-native.png) · [Exact4× comparison](comparisons/arrival-foyer-public-exit-4x.png).

Exactly **two corrected scene candidates** are produced, both generated pending owner approval:

- [Foyer — closed single door](candidates/foyer-single-door-v03.png),314×206 opaque RGB; [exact4×1256×824](previews/foyer-single-door-v03-4x.png).
- [Public exit — same door open](candidates/public-exit-single-door-v01.png),314×206 opaque RGB; [exact4×1256×824](previews/public-exit-single-door-v01-4x.png).

Canonical [arrivalv03](../arrival-correction-v03/arrival-v03.png) remains byte-for-byte unchanged. It defines one ordinary solid ivory leaf, no entrance glazing/title, thin metal frame and period lever. From outside, three hinges are on viewer-right and the lever is on viewer-left. Both interior views reverse that physical handedness: hinges on viewer-left, lever on viewer-right/free edge. The public-exit leaf opens outward into the institutional corridor, not into the foyer.

The new opening uses the right portion of the old double opening. Right jamb and badge scanner remain in place; the left portion is filled with matching flush ivory wall and skirting. There is no vestibule, connector room or additional doorway. Speaker/model, storage drawer/cupboards, original plants and furniture, warm light/floor and architectural layout remain in the established composition. The open view shows the same gray/teal, artificially lit, frosted-panel corridor as arrival; it does not lead directly outdoors. The pictogram stays on the approach-corridor side only. House fixed side windows and lounge garden view are separate from the now solid entrance leaf.

The open image supports both named-plant and showroom-reset routes without a new donated plant, resident pedestal, protagonist or route-specific message. All separate service exits are preserved. This correction supersedes the prior arrival note that treated the door correspondence as unresolved: the three specified views now describe one doorway, not separate thresholds.

The closed/open outer frame edges measure the same native columns82 and147. Existing story wording that sometimes says “doors” is not edited in this artwork-only pass; no new connector or story geography is introduced.

## Preservation and scope

Every earlier image file, source render, hash and candidate version remains available; no prior PNG is overwritten. The first two closed-door attempts are archived under `generation-source/`; the selected closed state is derived from the open candidate to retain its existing jambs/frame. Other environments are not regenerated. In particular, the storage scene's incidental old entrance-edge crop is left as previous reference art under the explicit two-scene scope; no third scene is silently altered. Story JSON, engine/importer code, production assets/bindings and public Art Lab remain unchanged.

Built-in **`image_gen.imagegen`** performed the edits. [Exact prompts and hashed references](prompts.json), larger original sources under `generation-source/`, [candidate/comparison provenance and hashes](manifest.json), and [QA](QA.md) are included. The world exports use the established exact-aspect NEAREST and nonspatial radius18 color normalization. This documents larger source normalization, not a claim that the generator directly emitted314×206. The native comparison contains three314×206 images; the4008×984 comparison is exactly4× NEAREST of the whole native sheet, including captions, with each scene1256×824.

Private branch `agent/ch01-art-batch04-20261115`, verified baseline `f867fee7b0f104dae0978d98311b95d2759e8f92`. [Static-gallery checks](gallery-verification.json) record dimensions/hashes/links; browser automation was not run. Rebuild only this review with `python3 review/chapter-01-batch04-2026-11-15/door-continuity-v01/build_review.py`. The final remote-verified commit SHA is reported in the owner handoff.
