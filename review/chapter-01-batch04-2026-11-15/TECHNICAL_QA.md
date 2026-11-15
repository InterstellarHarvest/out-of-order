# Batch4 technical QA

Six generated candidates, creative approval pending.

| ID | Asset | Size | Mode | Unique colors |
|---|---|---|---|---|
| A | House arrival | 314×206 | RGB | 140 |
| B | Housekeeping storage | 314×206 | RGB | 144 |
| C | Maintenance breach | 314×206 | RGB | 219 |
| D | Equipment-service exit | 314×206 | RGB | 63 |
| E | Low service-hatch exit | 314×206 | RGB | 33 |
| F | Public exit | 314×206 | RGB | 217 |

Six native dimensions/modes asserted. All4× previews are exactly1256×824 and match NEAREST pixel replication. Full contact sheet contains exactly14 distinct registry scene IDs, with eight prior environments and six new candidates; the extra chair default is not counted as another scene. All314 previously tracked PNGs and tracked story/game/importer files match the verified baseline byte-for-byte. Approved reception and gallery conversation hashes are separately asserted. Source/export/preview hashes, crops, color normalization and reference provenance are recorded in manifest.json, prompts.json and technical-qa.json.

Built-in imagegen emits larger deliberately pixel-like source canvases; these original renders are preserved. Final scene geometry uses exact-aspect crop and NEAREST only, followed by nonspatial frequency-first substitution to nearby existing RGB colors (radius18). No averaging, dithering or fixed palette-count target is used. This is a documented normalization workflow, not a claim that imagegen emitted314×206 directly.

Visual checks cover door/window/handle/scanner identity, empty padded drawer and approved intercom, accepted chair model and mechanical damage, maintenance monitor/release/clamp, reverse heavy-door face, neutral sorting screen, low hatch proportions/handedness, public threshold/open leaves, no people/player/items baked into baseline, native title legibility and route separation. State art is proposed only, not implemented. Browser automation was not run; static-gallery validation is recorded separately in gallery-verification.json. No gameplay tests are needed for this review-only folder.
