**Latest continuity correction:** [one physical single door — arrival / closed foyer / open public exit](door-continuity-v01/index.html). Two replacement scenes only; canonical arrival and separate service exits are unchanged. [Arrival-only correction](arrival-correction-v03/index.html) and original Batch4 package below are preserved snapshots.

# Chapter1 Batch4 — final six environments

[Open private review gallery](index.html). All six assets remain **generated, awaiting owner visual review**. Branch `agent/ch01-art-batch04-20261115`, isolated from remotely verified baseline `8607ed729c1af2258ae178e2fdf68ce7a6bc8d0a`. Final commit/push SHA is reported in the owner handoff.

| ID | Registry scene | Native candidate | Exact4× |
|---|---|---|---|
| A | `house_of_tomorrow/arrival` | [arrival-v02.png](candidates/arrival-v02.png) | [1256×824](previews/arrival-v02-4x.png) |
| B | `house_of_tomorrow/storage` | [storage-v02.png](candidates/storage-v02.png) | [1256×824](previews/storage-v02-4x.png) |
| C | `house_of_tomorrow/maintenance` | [maintenance-v01.png](candidates/maintenance-v01.png) | [1256×824](previews/maintenance-v01-4x.png) |
| D | `house_of_tomorrow/utility_exit` | [utility-exit-v01.png](candidates/utility-exit-v01.png) | [1256×824](previews/utility-exit-v01-4x.png) |
| E | `house_of_tomorrow/service_hatch` | [service-hatch-v01.png](candidates/service-hatch-v01.png) | [1256×824](previews/service-hatch-v01-4x.png) |
| F | `house_of_tomorrow/public_exit` | [public-exit-v01.png](candidates/public-exit-v01.png) | [1256×824](previews/public-exit-v01-4x.png) |

[Fourteen-scene Chapter1 contact sheet](previews/chapter-01-fourteen-scene-contact.png) includes eight preserved scenes and these six new environments, with no duplicate chair states counted as rooms. The gallery contains every native scene, exact4× previews, arrival/foyer, storage/foyer, maintenance/Rest Assured, passage/hatch, public-versus-service exits, and maintenance-door reverse-view comparisons.

Read [art direction](ART_DIRECTION.md), [story/route continuity report](CONTINUITY_AND_STORY_REPORT.md), [unapplied state proposals](STATE_VARIANTS.md), [technical QA](TECHNICAL_QA.md), [machine-readable QA](technical-qa.json), [manifest/hashes/provenance](manifest.json), and [exact prompts/hashed references](prompts.json).

Production uses **built-in `image_gen.imagegen`**, one request per scene or revision. Every larger original render remains under `generation-source/`, including superseded first arrival and storage versions. Native opaque RGB314×206 exports use exact-aspect NEAREST normalization and conservative nonspatial color merging under docs/54, never averaging or a fixed palette cap. Each4× file is an exact1256×824 nearest-neighbor replication. The gallery is static/local and private to this branch; browser automation is not claimed.

The storage pad is item-neutral, the sorting screen has no permanent RETURNS state, and the public exit has no donated plant baked in. State variants are proposals only; no engine layer support, story changes or extra items are implemented. All previous PNGs, source JSON, importer/game code, approved reception and approved gallery conversation remain byte-for-byte unchanged. No production registry promotion, public deployment, merge or Chapter2 art.

Rebuild with Python3/Pillow: `python3 review/chapter-01-batch04-2026-11-15/build_review.py` from repository root. Exact file formats, previous-art preservation and static-gallery validation are recorded in the QA files; creative approval remains pending.
