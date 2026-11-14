# Updating the story from the storyboard

The game reads its story from `game/content/story.generated.js`. Never edit that file. It is
built from the storyboard JSON in `story/` by one command. Engine code, UI and art are not
touched when the story changes.

## After you change or export storyboard JSON

1. **Put the files in `story/`.** Overwrite them, keeping the same names:
   - `story/chapters/<chapter>.json` (for example `prologue-00.draft.json`)
   - `story/items.draft.json`
   - `story/artwork.draft.json`
   - `story/storyboard-manifest.json`, if you added, removed or renamed a chapter

   `story/storyboard-layout.json` holds box positions only. The game never reads it.

2. **Check the files.** This writes nothing:

   ```
   node tools/story-import/import.js --check
   ```

   The command ends with `RESULT: VALID` or `RESULT: INVALID`. An invalid result lists every
   problem with its chapter, node and choice, for example `leads to missing node ...`,
   `unknown item ...` or `art file missing: ...`. Fix them in the JSON and run it again.

3. **Build the playable preview:**

   ```
   node tools/story-import/import.js
   ```

4. **Play it.** Open `game/index.html` in Chrome or Firefox. Double-clicking the file is fine.
   - Add `?new` to the end of the address to start over instead of continuing your save.
   - `game/index.html?story=reception` opens the original M2 reception slice.

5. **Keep it.** Commit `story/` and `game/content/story.generated.js` together.
   `node tools/story-import/import.js --verify` reports `STALE` if they no longer match.

## When the story is approved

```
node tools/story-import/import.js --promote
```

`--promote` builds the approved version. It refuses to build when a node has no choices yet
(shown as "DRAFT ENDS HERE" in previews) or when required art is missing. It also refuses when
files outside `story/` have changed, so a content commit carries content only. It prints the Git
commands for a review branch and commits nothing itself.

Artwork that is not approved yet is listed but does not block the build: art approval is a
separate decision, recorded as `status` in `artwork.draft.json`. `--verbose` lists that art.

## Undo a story change

The story is ordinary Git history. To go back to an earlier version, restore both parts from
that commit:

```
git checkout <commit> -- story game/content/story.generated.js
```

To undo one content commit, use `git revert <commit>`. A save made on content that no longer
fits is never loaded: the game starts fresh and keeps the old save aside (docs/84 section 6).

The full contract is in [docs/84](../../docs/84_STORY_IMPORT_AND_CONTENT_PIPELINE.md).
