# M1 Canon UI Shell — Owner Final Verification

**Date:** 2026-10-31  
**Status:** RESOLVED — owner-final binary is now committed on the review branch.

## Canonical shell binary
Path:
`/layout-final.png`

Verified properties:
- Dimensions: **1920 × 1080**
- Mode: **RGBA**
- File size: **1,446,598 bytes**
- SHA-256: `813e08848797f628beecc3d45f136a247a36fcedbce6a0bbd63d6e42923233c6`
- Git blob SHA-1: `1849c8ec192cd639dd8550de0dcdda1aa88d2e4f`

The exact owner-final bytes were bridged into GitHub and the created blob SHA matched the expected Git blob identity before the branch tree was updated.

## Alpha verification
- Fully transparent pixels: **1,162,132**
- Fully opaque pixels: **879,691**
- Partially transparent edge pixels: **31,777**
- Main scene aperture: dominant transparent component, approximately x=32..1286, y=44..865
- Portrait aperture: second-largest transparent component, approximately x=1333..1896, y=44..321

The two intended windows are intact. Small transparent and partially transparent regions along shaped frame edges/decorative cutouts are intentional.

## Canon rule
This exact `layout-final.png` is now the immutable M1 shell for sprite-production work on this review branch.

Do not regenerate, rescale, repaint, crop, or reinterpret it. Dynamic UI is layered on top as separate sprites/code-rendered text.

## Locked component bundle
The previous approved component intake bundle is also committed on the review branch at:

`review/m1-ui-shell-v2/CYOA_M1_locked_components_v1.zip`

SHA-256:
`58c71b660f87a83400c80d0e75c2037af67827b00e2f4918cff794500050f302`

Git blob SHA-1:
`f407b21e20dba861f192530f763a7ded6d3746e1`

The sprite-production chat should use these Git-hosted binaries instead of temporary chat-download links.
