# Shared chair-state pair v04 — bounded QA

Status: **two generated candidates, owner review pending**. The user endorsed the visibly reclined pose during work; this does not promote the native exports or production integration.

## Latest user direction

Use the supplied original chair as the common composition. Default: remove the two restraint assemblies, turn off the chair indicator, bring the back a little more upright and lower the footrest a little. In use: restore the original restraints and retain the visibly reclined back/raised footrest. No new components or component resizing. The picked tuft must appear in both.

Both candidate PNGs are opaque RGB314×206 with exact4× NEAREST1256×824 previews. No scaling transform is applied to individual components during export. Imagegen supplies pose changes to the back/footrest; original pixels protect fixed parts. Visual inspection compares component identity, contours and proportions; it is not a claim to recover physical3D dimensions automatically from a raster image.

## Pixel preservation

Both candidates begin with the same original314×206 PNG. The generated local pose areas are normalized with exact-aspect crop and NEAREST, using the original scene's actual colors without dithering or a new palette-count target. Export masks restrict changes to back/footrest geometry, default restraint removal and the default chair lamp. The original seat, visible base and fixed armrest elements are retained, including occlusion-aware base protection.

The tuft rectangle `[68,116,82,132]` is copied from the original into **both** states. The approved wall intercom rectangle `[153,0,189,43]` remains exact. In-use original cuff/armrest/linkage polygons are restored pixel-for-pixel, ensuring the supplied restraints are used. The default's round lamp is dark; the in-use lamp and printed infinity mark retain original pixels. No lights on the wall intercom are switched off.

Reviewed native and exact4× previews, pose distinction, restraint removal/restoration, lamp state and visible tuft in both. **33 technical checks passed. Both tuft regions and the in-use original restraint regions are pixel-identical to the original. All 67 earlier PNGs remain byte-identical.**

[qa-results.json](qa-results.json) records dimensions/mode, hashes, exact previews/comparison content, original tuft equality, original in-use restraint equality, indicator contrast, prior-PNG preservation, unchanged source story/generated gameplay and gallery file checks. Renderer/browser and gameplay regression are not claimed for this static review artifact.

Source images are preserved, including intermediate generations; final masks protect the original room against unrelated changes in those sources. All earlier PNGs and the original shared source remain available. Neither state is owner-approved production art; no source registry or gameplay state binding has been changed.
