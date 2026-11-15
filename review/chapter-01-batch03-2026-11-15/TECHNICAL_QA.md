# Technical QA

Seven generated candidates; creative approval pending.

| ID | Asset | Dimensions | Mode | Unique colors |
|---|---|---|---|---|
| A | Gallery | 314×206 | RGB | 178 |
| B | Gallery conversation | 564×278 | RGB | 191 |
| C | Album 1 — ordinary years | 564×278 | RGB | 760 |
| D | Album 2 — fear and exhaustion | 564×278 | RGB | 746 |
| E | Album 3 — remains and absence | 564×278 | RGB | 731 |
| F | Current photograph — slot | 96×96 | RGBA | 165 |
| G | Current photograph — inspection | 565×451 | RGB | 602 |

All dimensions and PNG modes asserted from final files. F has real binary alpha, transparent margins and zero RGB under transparent pixels. A4× is exactly1256×824 NEAREST. All source/final SHA256 hashes and exact crop/normalization records are in technical-qa.json and manifest.json. Larger built-in source canvases are preserved; these are normalized exports, not a claim that the generator emitted native canvases. All geometry sampling is NEAREST, with nonspatial frequency-first substitution to nearby existing colors (scene radius18, others12), no spatial blur/dithering or arbitrary fixed palette count. B is cropped from its independent generated portrait source to match v05 close camera scale; it is not an enlarged world crop.

Verified 312 baseline files byte-for-byte against ae7ae2bfe7821f87ebc5dca686829592b7c27f49, including 261 existing PNGs and all tracked story/game/importer files. No baseline image or code changed. No gameplay tests needed for this review-only package. Browser automation was not run. Static HTTP/link validation is recorded in delivery-verification.json when completed.

Visual inspection covers chair count and row, ceiling hatch/crooked camera, intercom mounting/model, family aging and simple pixel faces, eleven historical prints, camera absence in all photographs, final empty chairs, partial fourth chair and feet-only identity crop. This is a production check, not owner approval.
