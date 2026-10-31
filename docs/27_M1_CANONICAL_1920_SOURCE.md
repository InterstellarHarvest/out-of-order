# M1 Canonical Canvas Update — 1920×1080 RGBA
**Date:** 2026-10-30
**Status:** OWNER-SUPPLIED canonical measurement source.

The owner supplied `layout final(1).png` after normalizing the interface to the production canvas.

## Exact identity
- Canvas: **1920 × 1080**
- Mode: **RGBA**
- SHA-256: `374d83a217c0b9ec1d682ac9b464be9a870bb131384c35300eced9b8a67014b3`
- File size: 2,460,733 bytes
- Fully transparent pixels are present on the outer canvas/background; the file is not flattened onto black.
- The large scene and portrait apertures remain opaque magenta placeholders intentionally. These may become transparent masks in the production shell later.

This PNG supersedes the earlier 1672×941 layout candidate for **all coordinate measurements and extraction planning**. Do not measure the older version.

## Pixel preservation rule
Treat the owner-supplied 1920×1080 PNG as immutable reference art. Measurement overlays, masks, neutralized shell derivatives and extracted sprites must be separate files. Never overwrite/recompress/rescale the canonical source as part of prep work.

## Logical grid
The PMO recommendation remains a **960×540 logical UI art grid displayed at 2× for 1920×1080**, but the current canonical image is a visual/source reference, not proof that every authored detail already lands exactly on a 2× logical pixel grid. Production sprite cleanup should deliberately conform components to the chosen logical grid rather than blindly resampling the master.

Next: create coordinate/measurement metadata and an annotated overlay from this exact source.
