# First-batch review checks

Status: **generated candidates; owner visual approval pending**. Technical validity does not confer visual approval.

## Export contract

Five candidate entries only: foyer/dining/bathroom are 314×206 opaque RGB; the independently composed portrait wall is 564×278 opaque RGB; the speaker is 564×278 RGBA with binary 0/255 alpha, transparent margins and zero hidden RGB. The portrait composite is a derived preview, not an extra catalog asset. Main-scene 4× previews are exactly 1256×824 and pixel-identical to nearest-neighbor enlargement.

Imagegen returned 1549/1550×1015 scene sources and 1786×881 portrait sources. They are preserved. Scene exports use a minimal centered exact-aspect crop and NEAREST reduction. Non-spatial color cleanup maps each RGB color to an existing frequent source color within RGB distance 24 (12 for the finer portrait layers), without moving/averaging pixels or imposing a fixed palette count. Final visible RGB color counts: foyer 99, dining 88, bathroom 97, wall background 294, foreground 153. The manifest records actual transforms, dimensions and hashes. This is normalized generated art, not a claim that the generator returned native-size canvases.

Foreground export removes isolated alpha flecks, crops to the connected speaker, reduces once with premultiplied-alpha Lanczos, hardens alpha and places the unit above the drawer on the final transparent canvas. No wall/environment is painted into that layer. The background was generated independently using the foyer as a physical-reference image; it is not a main-scene crop or enlargement.

## Visual inspection

Inspected all three scenes at native size and exact 4×; compared the three-room contact sheet, independent wall background, transparent speaker and composited portrait. The House uses inviting ivory/blond/aqua/coral domestic surfaces and thin aluminum trim, with no reception columns or institutional gray room design. The circular fabric grille, jewel lamp and silver dial identify the repeated period speaker. Dining has four chairs/four settings, with no people; the bathroom's rear plumbing remains hidden. Foyer storage is closed, without an exposed arm or player belongings. Bright daylight and showroom order avoid haunted-house staging.

These are review candidates. The owner should assess pixel-cluster economy, small highlight/foliage texture, room staging and speaker scale alongside creative approval. Native clues are intentionally small; narration carries the folded note's words. Windows/courtyard views are documented staging proposals, not approved geography.

## Bounded technical verification

**32 technical checks passed.** [qa-results.json](qa-results.json) records dimension/mode/hash checks, source preservation, per-pixel scene geometry/color-distance bounds, exact 4× previews, binary/clean foreground alpha, layer composite equivalence, approved reception hash, branch scope, deferred count, local gallery references and HTTP loads.

Gallery JavaScript was separately executed with Node VM: both layer controls hide/show independently, and the explicit `[hidden]` CSS rule is present. A full rendered-browser test was not run because browser automation is unavailable in this environment. The HTML uses ordinary local images and no network dependencies; all linked files and image responses were checked. Production gameplay tests were not rerun because there are no gameplay, story, importer or production-art changes.

Approved reception SHA-256 remains `fb010301d2df0c06d0cedaff6e35e60661e18764c9e5d9ed755ad78b0ac5fd53`. Source artwork registry, story, item definitions and `game/content/story.generated.js` remain unchanged. No owner approval, production integration, public storyboard update, site deployment or Chapter 2 generation is part of this package.
