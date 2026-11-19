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

Prior-session evidence reported **19 menu sprite blobs uploaded** into the private game's Git object store, but they were **not attached to a commit/tree** when that session ended. Their exact blob SHA/path mapping is not currently recoverable from the review branch. The prior-session source reference `7952711b30792c41724505d002b45b95d1e4fc94` is not a reachable commit in the accessible project repositories. Do **not** attach guessed blobs or use the earlier generated concept image as a substitute for the approved master. The menu asset intake remains **incomplete**, not failed or approved for gameplay.

## Required byte-exact art closeout

1. Recover the approved final menu master/sprites or the prior-session source package and its exact per-file names/SHAs.
2. Verify dimensions, PNG decodability, hashes, transparency and visual identity against the final owner review.
3. Place the approved runtime art in `art/ui/main_menu/`, with provenance and a complete non-placeholder asset manifest. Keep editable/original sources outside Git if they are excluded by the project's master-art rule.
4. Confirm that every expected menu file is reachable in the review branch and that the branch differs from `main` only in scoped intake and identity records.
5. Present that branch for review. **Do not merge** the menu into `main` or integrate it with the engine without a separate owner gate.

## Coordinated naming migration (pending)

The intended repository slugs are `out-of-order` for the private game and `out-of-order-storyboard` for the public authoring/Pages repository, subject to final URL checks at migration time. A rename of the private repository **does not** rename the public storyboard repository or automatically fix GitHub Pages site paths.

Before moving URLs, audit and update the live cross-references in:
- game: `README.md`, `game/README.md`, `game/index.html`, the game-visible fallback title in `game/js/surfaces.js`, `tools/story-sync/config.json`, `tools/story-sync/sync.js`, `tools/storyboard/README.md`;
- storyboard: `README.md`, root `index.html`, `tools/storyboard/index.html` (including fatal-ending overline), Pages workflow title, sync tooling and any current authoring prompts;
- canonical export/config ownership: `story/canon.lock.json`, `story/game-integration.json`, death-presentation exports, and approved-art ledgers **only as the generating/validation contract allows**.

Historic `sourceRepo` values and immutable art provenance must continue to identify the original repository and commit. Changing those by global search/replace could invalidate canonical checks. The public site must be deployed at its new path and tested (root redirect, storyboard, art lab, selected-art previews, direct Chapter 3 review links) **before** updating user-facing links or declaring migration complete. Preserve a reliable notice/redirect for old Pages bookmarks if feasible.

## Exclusions and safety

No gameplay logic, story canon, Chapter 3 artwork, approved sprite bytes, saved-game data, or production `main` branch is changed by this checkpoint. GitHub repository names and Pages URLs remain unchanged until the coordinated migration is ready.
