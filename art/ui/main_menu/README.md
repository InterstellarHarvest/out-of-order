# Out of Order — approved main-menu art intake

This folder is the **approved v06 Exposition Entrance Plaza** menu artwork, staged on `review/out-of-order-menu-intake`. The owner approved the design on 2026-11-19. **No gameplay engine integration is included or authorized here.**

- `entrance_plaza.png`: the locked 1672×941 RGB painting, byte-exact from the private review Site's `dist/entrance-plaza-locked.png`.
- `sprites/`: 19 transparent v06 PNGs. Baked button lettering states, full-frame fluorescent states, and bitmap letterforms. Do not regenerate, repaint, downsample, or replace them during intake.
- `manifest.json`: exact SHA-256 and Git blob SHA for every PNG, image dimensions, source paths, plate/display positioning, and startup timing.

Source-of-truth: private [Out of Order menu review Site](https://out-of-order-menu-review-nate.cosmic-jelly-5330.chatgpt.site), source commit `7952711b30792c41724505d002b45b95d1e4fc94`. Its source repository preserves `tools/bake_menu_sprites.py`, `dist/index.html`, and earlier v02–v05 comparisons. The code is a prototype reference, **not** a drop-in production menu. The screen's glyph bitmap is used by that prototype instead of CSS font text.

Engine integration, real saves, SETTINGS persistence, EXIT routing, credits wiring, and sound remain deferred. The simulation checkbox and replay toolbar from the Site must not enter the game.
