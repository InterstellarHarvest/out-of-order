# Public storyboard synchronization — completed

- Generation source: `InterstellarHarvest/CYOA-storyboard@25921b9bb0e263c017a804c57e9069c172f6b3b4`.
- Artwork baseline: `InterstellarHarvest/CYOA@24434cb96d48fcb2cebe1f9814fcb35dd9ab1271`.
- Pushed candidate-source commit: `InterstellarHarvest/CYOA@34094799ca7dc96eb0c81db504b8ded2272816f1`, branch `agent/ch02-art-batch02-biopark-routes`.
- Canonical publication base: `10663faa305b9a453f58cdec25c2a621fcd3c561`. Concurrent Chapter3 source edits were retained; Chapter2 inputs remained identical to the generation source.
- Published public main commit: [`a1dc9a2ef5730a31d62ad6f60244acfab6c40db5`](https://github.com/InterstellarHarvest/CYOA-storyboard/commit/a1dc9a2ef5730a31d62ad6f60244acfab6c40db5).

The seven Batch2 scene records moved from `not-started` to `generated`. Each retains its authored brief and null production `assetPath`, and records exact candidate source repository, branch, full commit, path and SHA256 in its existing notes field. No candidate was approved, integrated, reused or copied into the public selected-art collection. All older selected records, preview hashes and the selected-art ledger are unchanged.

## Validation and narrowly scoped QA maintenance

All passed before publication:

- `node tools/sync/check-canon.mjs`
- `node tools/storyboard/qa-smoke.mjs`
- `node tools/storyboard/export-death-presentations.mjs --check`
- `node tools/prologue-art-lab/qa/qa-static.mjs`
- `node tools/sync/qa-sync.mjs` —22 regression/registration guards

The old smoke test asserted that zero generated candidates existed. It now recognizes the seven genuine unselected candidates, verifies null production paths and full source provenance, and retains the existing selected/integrated/reused assertions.

A separate stale Chapter3 legacy-render fixture already failed on unmodified public main `10663faa305b9a453f58cdec25c2a621fcd3c561`. That failure was reproduced in an isolated detached baseline checkout. Only the derived snapshot was refreshed using that untouched baseline renderer; no Chapter3 narrative, artwork, viewer or layout source was edited. The canonical commit changes only `story/artwork.draft.json`, `tools/storyboard/qa-smoke.mjs` and its derived `qa-fixtures/legacy-render-snapshot.json`. All other tracked canonical files remain byte-identical to the publication baseline. See [canonical-validation.json](canonical-validation.json).

## Pages and live verification

[Publish CYOA Storyboard workflow](https://github.com/InterstellarHarvest/CYOA-storyboard/actions/runs/44104890292) completed **successfully** for `a1dc9a2ef5730a31d62ad6f60244acfab6c40db5`. The live public catalog was fetched after deployment and matches the committed canonical data, including all seven generated records. Its SHA256 is `90e3e4ea64bf9541f335c2d2cee2d6663fea164c68e7cc0d00888ef3813211ff`. The exact fetched JSON is preserved under `sources/publication/`.

Open the [public storyboard](https://interstellarharvest.github.io/CYOA-storyboard/tools/storyboard/) to inspect updated statuses and source notes. The private candidate pixels are reviewed in this package's gallery; unselected images were not published as selected previews.

[remaining-queue.current.json](remaining-queue.current.json) enumerates all36 still-not-started Chapter2 image records directly from that published catalog. It matches the original source-derived queue after the seven new candidates are removed, including every nested portrait and item slot/inspection pair. No Chapter3 art was started.

This handoff receipt is a later documentation commit on the artwork branch. Canonical provenance intentionally pins the earlier immutable candidate-source commit `34094799ca7dc96eb0c81db504b8ded2272816f1`; the PNG bytes remain identical.
