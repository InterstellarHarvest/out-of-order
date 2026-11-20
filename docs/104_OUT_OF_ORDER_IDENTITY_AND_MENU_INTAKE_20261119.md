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
| Game repository | `InterstellarHarvest/out-of-order`, private, default branch `main` (renamed 2026-11-19) |
| Production baseline | `b4e11c9cc6fb44c2b7abd832400ba44401411db2`; GitHub QA succeeded |
| Review branch | `review/out-of-order-menu-intake`, initially created at the production baseline |
| Intended production-art path | `art/ui/main_menu/` |
| Public canonical storyboard | `InterstellarHarvest/CYOA-storyboard`, independent from the private game repository |
| Published Pages path, retained intentionally | `https://interstellarharvest.github.io/CYOA-storyboard/` |

**Recovery completed.** The source reference `7952711b30792c41724505d002b45b95d1e4fc94` is the commit in the **private ChatGPT Sites source repository** for the [approved v06 menu review](https://out-of-order-menu-review-nate.cosmic-jelly-5330.chatgpt.site), not a commit in the GitHub game/storyboard repositories. Its locked painting and 19 v06 sprite files were fetched from that exact checkout. All **20 Git blob SHAs** were already present in the game repository's unattached Git object store; the exact path mapping, PNG dimensions and SHA-256 checksums were recovered and recorded in `art/ui/main_menu/manifest.json`. They are now attached to this review branch without re-encoding. Earlier v02–v05 comparisons and the deterministic baking script remain preserved in the private review Site source. **No menu art was regenerated.**

## Byte-exact art closeout — complete on review branch

1. Recovered the approved v06 source package from the private Site source commit; 20 original PNG Git blobs matched the Source Site tree.
2. Verified PNG headers, dimensions, RGB/RGBA modes and per-file SHA-256 checksums (see `art/ui/main_menu/manifest.json`).
3. Attached the locked 1672×941 background plus 19 v06 sprites to `art/ui/main_menu/`; committed a non-placeholder asset manifest and intake README.
4. Preserved implementation geometry, animation timing and the original source commit for deferred engine work.
5. **Review only. Do not merge** the menu into game `main` or wire it into gameplay without a separate owner gate.

## Repository naming and links — owner confirmed

- **Private game repository:** renamed from `InterstellarHarvest/CYOA` to [`InterstellarHarvest/out-of-order`](https://github.com/InterstellarHarvest/out-of-order) on 2026-11-19. Use the new slug in current links, local remotes and sync configuration. Old GitHub links redirect.
- **Public storyboard repository:** the owner explicitly chose to **keep** `InterstellarHarvest/CYOA-storyboard` and the existing [GitHub Pages address](https://interstellarharvest.github.io/CYOA-storyboard/). Do not rename this repository or move Pages.
- **Visible game title:** *Out of Order* throughout active menus, tabs, README and storyboards. Title-only rollout and the browser-title QA assertion correction are handled separately from this art intake.
- **Compatibility/provenance:** `cyoa-*` schemas, JavaScript globals, persistence keys, original artwork-generation prompts and immutable `sourceRepo` records remain unchanged. These are not the public-facing title.

## Branding rollout verified (2026-11-20)

- Private game repository: [`InterstellarHarvest/out-of-order`](https://github.com/InterstellarHarvest/out-of-order), renamed from `CYOA`. Title/link/test updates merged through [PR #19](https://github.com/InterstellarHarvest/out-of-order/pull/19), production `main` **`9a0ca4a502216ce11b956bac15d0e61750e86904`**. Both pull-request QA jobs (`content`, `browsers`) passed before merge, including the corrected reception-title assertion.
- Public storyboard repository: intentionally remains [`InterstellarHarvest/CYOA-storyboard`](https://github.com/InterstellarHarvest/CYOA-storyboard). Visible title/docs/art-lab updates merged via [PR #11](https://github.com/InterstellarHarvest/CYOA-storyboard/pull/11); shared future-art direction updated via [PR #12](https://github.com/InterstellarHarvest/CYOA-storyboard/pull/12), `main` **`d4bae261c93c0b7cd8617aaf0a1e054526df0c0d`**. Public Pages deployment passed at the unchanged [`CYOA-storyboard` URL](https://interstellarharvest.github.io/CYOA-storyboard/); live viewer and art-lab headings were verified as *Out of Order*.
- **Menu art remains review-only** at `art/ui/main_menu/` on this branch. The game production `main` does not contain that directory. Engine integration, sound, and production-menu startup are deferred.

## Exclusions and safety

No gameplay logic, story canon, Chapter 3 artwork, existing sprite bytes, saved-game data, or production `main` branch is changed by this checkpoint. The approved menu art is newly attached byte-exactly on the review branch. The private game repository was renamed; the public storyboard repository and Pages URL remain deliberately unchanged.
