# Plant adoption — foreground pedestal v02

**Generated candidate, owner approval pending.** Revises only Batch 5 asset B.

The existing station is moved forward onto the red rug and enlarged from 32×64 to 40×80 logical pixels (25% per axis). It rises through a shallow floor well with an ivory/aluminum rim and a small coral rug-faced hinged lid. The hatch is contained within the original rug. The same isolated plant/lamp/nozzle/pedestal render is reused; no room or fixture was regenerated.

[Review gallery](index.html) · [Canonical overlay](B-plant-adoption-v02.png) · [Previous/new comparison at native size](comparison-native.png) · [Exact 4× comparison](comparison-4x.png) · [QA](qa.json)

Canvas remains RGBA 314×206, alpha 0/255, invisible RGB zero. All pixels outside the explicit object/hatch mask remain identical to the approved foyer. All 432 PNGs from commit `5d1db9865fba0d51de8839d22f16410fee54bae8`, including the first-pass overlay and every earlier review comparison, remain byte-identical.

`build_revision.py` contains the exact controlled edit recipe: re-rasterize the retained isolated render with nearest-neighbor at (168,114); retain the existing 24-color sprite treatment; draw the rug hatch with hard-edged native pixels; composite only through this binary overlay. No new image generation call was needed. The old Batch 5 builder and original QA continue to describe the preserved first pass; this revision's QA describes v02.

Gameplay PMO: use this overlay in place of first-pass asset B if approved. All adoption selection rules and inventory handover behavior in the parent handoff remain unchanged. The other six Batch 5 candidates are unaffected. No story, engine, registry, public gallery or production integration changes.
