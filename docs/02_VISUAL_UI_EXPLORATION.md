# Visual direction and interface alternatives
Status: references and proposals only — no layout, resolution, art pipeline, or engine lock.

## Era and feeling
Visual source of inspiration: **the future as imagined in the 1960s**, with the enormous optimism and heavy institutional absurdity associated with Terry Gilliam's *Brazil*. Bright public pavilions, cheerful signage, curved plastic and glass, mechanical controls, exhausted civic spaces, elaborate bureaucracy, and a growing contradiction between the marketing and lived reality.

Do not interpret Brazil as 'everything gray and miserable'. Earlier chapters can be colorful, expansive, inviting, even funny. The increasingly disturbing mood may arise from context, staging, changed behavior, or a repeated location seen differently—not merely darkening the palette.

## Pixel-art direction
- Upgrade from the more 8-bit-looking Space Sprout Sleuth and Hunger, Harvest, & History aesthetic toward rich **SNES / late 16-bit / early 32-bit-inspired** pixel art.
- Draw at low logical resolution, present at clean integer multiples, no blurred or AI-smoothed outlines.
- Bright, relatively simple and curated palettes. More detail in backgrounds and character portraits is welcome, but avoid unreadable noise.
- Clear separation between scenic graphics, dialogue presentation, and inventory/document interfaces.
- Candidate logical canvas sizes (320x200, 320x240, and 384x216) are **testing ideas only**; choose based on composition, portrait scale, aspect ratio, and readability.
- Optional: layered parallax, small ambient animation, inset detailed portraits, purposeful dramatic scene changes, not universal cinematic effects.

## King's Quest VI reference — prominent
A composed game scene is the primary visual attraction. During interaction, a separately framed **more detailed pixel portrait of the speaking NPC** appears. Background characters or the setting can retain a lower density than the portrait without violating the pixel aesthetic. Think a portrait in a dedicated inset frame, not necessarily a full visual-novel bust overlay that obscures the scene. Scene frame, border treatment, typography, controls and portrait placement require visual exploration.

**Important separation:** NPC scene sprites and NPC speaking portraits can coexist. Whether the **player character** is a visible walkable sprite is completely unresolved. Possibilities include:
1. First-person/semi-first-person illustrated gamebook scenes, no protagonist sprite.
2. Third-person scenes where the protagonist appears sparingly, mostly during action.
3. Classic adventure-style walkaround protagonist.
Avoid making the experience dependent on walking a sprite around before that gameplay choice is decided.

## Interface sketch directions (all open)
A. **Framed scenic window** plus compact dialogue/choices below and an inset speaking portrait to one side.
B. **Scene-first fullscreen** with an ornamental slide-in portrait frame and context-sensitive choices; minimize permanent HUD.
C. **Illustrated chapter panels**, rich stills with modest animation and separate character interaction close-ups.
These are design alternatives to mock up; not three modes to ship.

## Objects, documents, 'cards'
Physical cards inspired the discussion through the board game *House of Danger*. In a digital adventure, important things may be represented as inventory objects, dossiers, clipped papers, identification badges, photographs, tickets, testimony, documents, specimen labels or journal entries. Rich item illustrations and occasional collectible-card framing may be aesthetically satisfying. **Do not default to deck-building, card battles, drawing a hand, or card combat UI.**

## Character visual experimentation
NPCs could be visually recognizable in lower-res scenes and more emotionally nuanced in separate framed portraits. The protagonist might be unnamed, only represented indirectly, or customizable. Avoid a premature requirement for protagonist portraits, overworld walking cycles, or the same screen density as NPC portraits.

## Reference guardrails
References include King's Quest VI (framing and speaking portraits), SSS/HHH (true logical-grid pixels/integer upscale), Brazil (retro-future satire), Jurassic Park (pulp discovery/spectacle), and selected 16/32-bit adventure art. Treat these as *design influences*, not permission to reproduce protected imagery, characters, interface assets, or scripts.

## Next visual work, only after requested
Several clickable or static concept comparisons showing: bright public-space scene; framed NPC portrait and conversation; inventory/document presentation; same location under later, more unsettling story context. Test readability and composition before technical decisions.
