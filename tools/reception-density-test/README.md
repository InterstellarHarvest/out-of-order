# Reception density test (review tool)

A developer-only page for docs/55: it shows the selected reception scene at **314×206 logical × 4**
and the receptionist portrait at **282×139 logical × 2**, as separate layers, inside the canonical
1920×1080 shell. It is not the game, adds no gameplay or dialogue, and does not approve any art or lock
either density.

## Open it

Serve the repository root and open the page at 100% browser zoom:

```sh
python3 -c "import http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; h.test(HandlerClass=h.SimpleHTTPRequestHandler, ServerClass=h.ThreadingHTTPServer, port=8137, bind='127.0.0.1')"
```

<http://127.0.0.1:8137/tools/reception-density-test/index.html>

Opening `index.html` directly from disk also works.

- The stage is drawn 1:1 at 1920×1080 and is never fit-scaled. A smaller window scrolls.
- **Scene** buttons (below the stage) or the keys **A** / **B** / **V** switch the scene in the identical shell:
  **A** = scene 02 reduced with BOX (+256-colour cleanup), **B** = the same source reduced with NEAREST only (the default),
  **v2** = the first scene test. All are 314×206 at exactly 4×. `?scene=a|b|v2` picks one on load (docs/55 section 13).
- **NPC: ON/OFF** (below the stage) or the **N** key hides or shows the receptionist layer only.
- The readout below the stage lists logical and display sizes and warns if browser zoom makes the
  device pixel ratio fractional.
- `?shot` hides the readout (proof screenshots). `?npc=off` starts with the NPC hidden.

## Layers (draw order)

1. Scene (A, B or v2; `reception_scene_02_box_314x206.png`, `reception_scene_02_nearest_314x206.png`, `reception_scene_314x206.png` in `art/scenes/conference_hall/reception/density_test/`), at 4× = 1256×824 from the
   scene aperture's top-left (32,44). The aperture is 1255×822, so 1 px on the right and 2 px at the bottom are clipped.
2. Portrait background, `art/portraits/receptionist/density_test/reception_background_282x139.png`, at 2× = 564×278.
3. Rear/mid FX: an empty slot (no FX in this test).
4. Receptionist, `art/portraits/receptionist/density_test/receptionist_282x139.png` (RGBA, alpha 0/255), at 2×.
5. Foreground FX: an empty slot.
6. The canonical shell `art/ui/shell/layout-final.png`, unchanged, over everything.

Aperture rectangles and the shell path come from `tools/layout-lab/data/lab_data.js`, the same bundle the
reception slice reads.

## Rebuild the exports

The raw sources are local only, in `source/reception_density/` (git-ignored, never committed):
`reception_world_scene_v2_raw.png`, `reception_world_scene_density_test_02_raw.png`, `reception_background_v2_raw.png`,
`receptionist_portrait_v1_raw.png`.

```sh
python3 tools/reception-density-test/normalize.py
```

It rewrites the five exports and `density_test_manifest.json` (method, crop boxes, colour counts, alpha
statistics, error metrics, hashes). The method is described at the top of the script and in docs/55.

## QA

```sh
NODE_PATH="$(npm root -g)" node tools/reception-density-test/qa/run_qa.js
```

Static checks (sizes, RGBA, alpha {0,255}, colour counts, hashes, shell hash, protected paths, ignored
masters, byte-for-byte reproducibility when the sources are present), then Chromium and Firefox at
1920×1080 and devicePixelRatio 1: geometry, integer scale, smoothing off, layer order, the NPC toggle, and
an exact per-pixel comparison of the screen against a nearest-neighbour upscale wherever the shell is
clear. Results go to `qa/qa_results.json`, and the Chromium proofs to `qa/screenshots/`.
