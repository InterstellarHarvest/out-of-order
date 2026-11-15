# Rest Assured — owner-directed default / in-use pair v04

Open [index.html](index.html) or the [native comparison](previews/default-in-use-native.png). Both states use the owner's selected original close chair composition, not different room cameras.

| State | Native314×206 | Exact4× |
|---|---|---|
| Default | [chair-default-v04.png](candidates/chair-default-v04.png) | [1256×824 PNG](previews/default-4x.png) |
| In use | [chair-in-use-v04.png](candidates/chair-in-use-v04.png) | [1256×824 PNG](previews/in-use-4x.png) |

Default removes both original restraint assemblies and their locking links, keeps the normal silver adjustment discs, switches off the chair's round green indicator, makes the back slightly more upright and lowers the existing footrest a little. The wall intercom stays on and unchanged; the printed infinity mark remains.

In use retains the **exact original restraint and armrest pixels**, with the same chair's back visibly reclined and integrated footrest raised. The user said the reclined pose was looking good; its pose is retained in this paired export. No new restraint design, forward plinth, extra cushion, slot, cupholder, body part or mechanism is introduced. The chair base and seat are kept from the original wherever visible rather than rescaled.

**The original picked tuft is present in BOTH states, copied pixel-for-pixel from the selected original.** Component scale/camera are not changed in export. The moved backrest/footrest are independently generated pose edits using the same parts as reference; their projected shapes naturally differ with angle. Armrests, seat and original restraints are protected rather than redesigned. Full visual approval of the native pair remains pending.

- [prompts.json](prompts.json): exact built-in `image_gen.imagegen` prompts, including the user's later tuft, clear-recline, default-light and default-pose steering.
- [manifest.json](manifest.json): sources, hashes, dimensions, palettes, local edit masks and protected regions.
- [QA.md](QA.md): preservation, tuft, original-restraint, indicator and geometry checks.
- [Side-by-side4× comparison](previews/default-in-use-4x.png).

Source versions are preserved under `generation-source/`. The first unused source omitted the tuft; it is not the final candidate. Final exports explicitly retain the original tuft. Initial pose/base refinements also remain archived. No previous PNG is overwritten.

Reproduce with Python3/Pillow:

```sh
python3 review/chapter-01-batch02-2026-11-15/rest-assured-pair-v04/build_review.py
```

Branch `agent/ch01-art-batch02-20261115`; baseline `ef63bdbcfab0dfaa9d09800f4443cb5c944f8427`. These are generated review candidates only. No story JSON, gameplay, production asset paths or engine changes. Final scene/state binding is not implemented. The existing greenery clarification remains a proposal and no greenery is redrawn. No public deployment or next batch.
