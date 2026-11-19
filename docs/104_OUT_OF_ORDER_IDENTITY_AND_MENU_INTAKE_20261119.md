# Out of Order — identity and main-menu intake checkpoint (2026-11-19)

## Owner decisions

- **Official game title:** *Out of Order*. The title is no longer provisional.
- **Retired working title:** *The Acceptable Error*. Keep this string in historical documents, past approvals, provenance, old screenshots and quotations, where changing it would falsify the record.
- **Technical codename:** `CYOA`. Keep existing `cyoa-*` data schemas, persistence keys and filenames until a separate compatible migration is designed. They are technical identifiers, not the visible game title.
- **Main-menu art:** visual composition, title placement and approved background are locked. Do not re-render, repaint, resize, resample or silently replace approved pixels.
- **Engine integration:** explicitly deferred until the end-of-production integration gate. No startup routing, saves, EXIT behavior, settings, credits logic, or menu-to-game state transitions are authorized by this intake.

## Approved main-menu behavior to preserve for later implementation

- CONTINUE and NEW GAME use separate physical controls; their illumination comes online sequentially and deliberately, not instantaneously.
- Kiosk/status text types in a slower typewriter sequence; SETTINGS can flicker into its narrow lower display only after that text finishes.
- Settings perspective and placement follow the owner's final review corrections.
- CREDITS is tucked behind the red-light interaction.
- Subtle startup/flicker animation is part of the lock; sound is deferred.
- The title typography and placement are integrated into the background, not a new floating UI banner.

This is a design record, **not** confirmation that runtime menu code or art assets have been committed.

## Verified repository status at handoff

| Area | Verified status |
| --- | --- |
| Game repository | `InterstellarHarvest/CYOA`, private, default branch `main` |
| Production baseline | `b4e11c9cc6fb44c2b7abd832400ba44401411db2`; GitHub QA succeeded |
| Review branch | `review/out-of-order-menu-intake`, initially created at the production baseline |
| Intended production-art path | `art/ui/main_menu/` |
| Public canonical storyboard | `InterstellarHarvest/CYOA-storyboard`, independent from the private game repository |
| Published Pages path, before renaming | `https://interstellarharvest.github.io/CYOA-storyboard/` |

**Recovery completed.** The source reference `7952711b30792c41724505d002b45b95d1e4fc94` is the commit in the **private ChatGPT Sites source repository** for the [approved v06 menu review](https://out-of-order-menu-review-nate.cosmic-jelly-5330.chatgpt.site), not a commit in the GitHub game/storyboard repositories. Its locked painting and 19 v06 sprite files were fetched from that exact checkout. All **20 Git blob SHAs** were already present in the game repository's unattached Git object store; the exact path mapping, PNG dimensions and SHA-256 checksums were recovered and recorded in `art/ui/main_menu/manifest.json`. They are now attached to this review branch without re-encoding. Earlier v02–v05 comparisons and the deterministic baking script remain preserved in the private review Site source. **No menu art was regenerated.**

## Byte-exact art closeout — complete on review branch

1. Recovered the approved v06 source package from the private Site source commit; 20 original PNG Git blobs matched the Source Site tree.
2. Verified PNG headers, dimensions, RGB/RGBA modes and per-file SHA-256 checksums (see `art/ui/main_menu/manifest.json`).
3. Attached the locked 1672×941 background plus 19 v06 sprites to `art/ui/main_menu/`; committed a non-placeholder asset manifest and intake README.
4. Preserved implementation geometry, animation timing and the original source commit for deferred engine work.
5. **Review only. Do not merge** the menu into game `main` or wire it into gameplay without a separate owner gate.

## Coordinated naming migration (pending)

The intended repository slugs are `out-of-order` for the private game and `out-of-order-storyboard` for the public authoring/Pages repository, subject to final URL checks at migration time. A rename of the private repository **does not** rename the public storyboard repository or automatically fix GitHub Pages site paths.

Before moving URLs, audit and update the live cross-references in:
- game: `README.md`, `game/README.md`, `game/index.html`, the game-visible fallback title in `game/js/surfaces.js`, `tools/story-sync/config.json`, `tools/story-sync/sync.js`, `tools/storyboard/README.md`;
- storyboard: `README.md`, root `index.html`, `tools/storyboard/index.html` (including fatal-ending overline), Pages workflow title, sync tooling and any current authoring prompts;
- canonical export/config ownership: `story/canon.lock.json`, `story/game-integration.json`, death-presentation exports, and approved-art ledgers **only as the generating/validation contract allows**.

Historic `sourceRepo` values and immutable art provenance must continue to identify the original repository and commit. Changing those by global search/replace could invalidate canonical checks. The public site must be deployed at its new path and tested (root redirect, storyboard, art lab, selected-art previews, direct Chapter 3 review links) **before** updating user-facing links or declaring migration complete. Preserve a reliable notice/redirect for old Pages bookmarks if feasible.

## Exclusions and safety

No gameplay logic, story canon, Chapter 3 artwork, existing sprite bytes, saved-game data, or production `main` branch is changed by this checkpoint. The approved menu art is newly attached byte-exactly on the review branch. GitHub repository names and Pages URLs remain unchanged until the coordinated migration is ready.
