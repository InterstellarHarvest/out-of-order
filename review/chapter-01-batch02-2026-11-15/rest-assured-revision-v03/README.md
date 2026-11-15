# Rest Assured v03 — earlier activation candidate

See the [owner-directed v04 default/in-use pair](../rest-assured-pair-v04/index.html). Earlier images are retained below.

Open [index.html](index.html) for initial/activated and original-v01/revised-v03 comparisons at native and exact4×.

The upright circular restraints in v02 were rejected. This candidate returns to the original v01 chair as the positive design reference. Low padded caps close onto cradles at the **forward wrist-rest areas**, with small outer latches and short side links. The wrist channels run along the armrests, not as freestanding camera-facing rings. Backrest reclines slightly farther and the same integrated legrest rises, making the activated posture distinct while retaining the inviting upholstery and original product identity.

One new [generated candidate](candidates/chair-candidate-v03.png), opaque RGB314×206, pending owner approval. [Exact4× PNG](previews/chair-v03-4x.png). No occupant, hands, wrists or other protagonist anatomy.

- [Initial/activated native](previews/initial-activated-native.png) and [4× comparison](previews/initial-activated-4x.png).
- [Original-v01/revised-v03 native](previews/before-after-native.png) and [4× comparison](previews/before-after-4x.png).
- [prompt.json](prompt.json): exact built-in `image_gen.imagegen` prompts and references; [selected source](generation-source/chair-v03b.png).
- [manifest.json](manifest.json): hashes, dimensions, palette, chair export mask and protected intercom region.
- [QA.md](QA.md): preservation/format checks and visual-review limits.

The first v03 source added extra cupholder-like recesses; the refinement removes them. That source is archived, not a second candidate. All v01/v02 and earlier PNGs remain exact. The House intercom is protected pixel-for-pixel. Every pixel outside the chair edit mask stays original; the mask includes small areas revealed by changed chair occlusion. Greenery is untouched, and the existing [clarification proposal](../GREENERY_CLARIFICATION_PROPOSED.md) remains unapplied.

Export uses exact-aspect crop and NEAREST geometry, then non-spatial matching to the original scene's actual colors. It is not a scene-wide redraw or arbitrary palette-cap experiment. Reproduce with Python3/Pillow:

```sh
python3 review/chapter-01-batch02-2026-11-15/rest-assured-revision-v03/build_review.py
```

Same branch `agent/ch01-art-batch02-20261115`; revision baseline `38f0a8fadba941ef5eae3424437baffb67dc5909`. Story, gameplay, production art and approved references remain unchanged. No promotion or public gallery deployment.
