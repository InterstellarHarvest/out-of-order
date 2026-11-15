# Speaker-revision verification

Status: **generated; owner visual approval pending**.

Camera update v05: independently generated closer 564×278 opaque portrait with roughly twice the previous linear speaker size. The full bezel and wall attachment remain visible, with finer grille/control detail. No room scene was changed; the v04 portrait and comparison sheets remain exact. See `portrait-closeup-v05.qa.json` for camera-update checks; the 34-check report below describes the earlier speaker redesign. Technical checks do not confer visual approval or runtime integration.

## Artwork inspection

Reviewed the foyer and dining candidates at native 314×206, at exact 4×, and as before/after speaker crops. Both show the same nearly flush vertical ivory intercom, rectangular dark cloth grille, discreet sensor, small indicator and recessed period control. The room units are small, with bare wall below rather than any post/stand. The close-up shows the same model within a fixed wall bezel and recessed faceplate seam, with room context dominating the frame.

The conversation candidate is a single opaque 564×278 RGB image. It contains actual wall mounting and surrounding architecture, not a separate character sprite. It was independently generated using the existing foyer wall/room references, not upscaled from the scene. No animation or new transparent foreground exists in this package.

## Preservation and export

Imagegen authored the speaker replacements and restored wall. Room exports use NEAREST geometry, local warm-wall tone alignment and nearest existing scene colors within the documented speaker/support rectangles. The original native PNG supplies every pixel elsewhere. Bounds are `[189,47,244,95]` for foyer and `[84,44,108,72]` for dining, right/bottom exclusive. Source/normalization/provenance are in `manifest.json`.

Verified zero pixel changes outside those regions. The unchanged scene portions include architecture, door/window geometry, lighting, furniture, all four dining places/chairs and the child's wardrobe-arrow napkin. Original candidate PNGs, the old portrait layers/composite and bathroom remain byte-identical to baseline. Approved M2 reception retains its pinned SHA-256 `fb010301d2df0c06d0cedaff6e35e60661e18764c9e5d9ed755ad78b0ac5fd53`.

The portrait uses an exact-aspect reduction of the independent source to 564×278, with non-spatial color cleanup and no fixed palette cap. The scene patches retain their existing source palette. Exported sizes, modes, hashes, color counts and generator-source sizes are recorded rather than claiming the tool returned native-size files directly.

## Bounded checks

**Initial ee50bfe revision: 34 technical checks passed; all 20 previous PNGs are byte-identical and all 25 gallery file references load over local HTTP.**

[qa-results.json](qa-results.json) records dimensions/opaque modes, hashes, region-only changes, original-file preservation, 4× nearest previews, candidate count, proposal shape and local gallery references/loading. The registry JSONPatch is tested only against an in-memory copy; the source file is never modified. It deliberately needs PMO support before adoption.

The gallery is static offline HTML with no JavaScript or external dependencies. Full rendered-browser QA and gameplay regression are not claimed: browser automation is unavailable, and gameplay/importer/story files are unchanged. PMO's later integration checks are listed separately in `PMO_HANDOFF.md`.
