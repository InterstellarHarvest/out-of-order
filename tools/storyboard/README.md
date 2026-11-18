# Storyboard viewer: retired here (docs/97)

The storyboard viewer and its QA live only in the canonical public repository:

- Site: https://interstellarharvest.github.io/CYOA-storyboard/tools/storyboard/
- Source: https://github.com/InterstellarHarvest/CYOA-storyboard/tree/main/tools/storyboard

This repository kept a 2026-11-14 copy (docs/85). That copy could export story JSON, which made it a second place where canon could be edited. It also pinned pre-ruling art statuses, so it broke on every canonical pull. It was removed on 2026-11-16.

`story/` here is a generated projection of a pinned public revision. Never edit it in this repository: `node tools/story-sync/sync.js verify` fails on any hand edit. To change the story or art records, edit the public storyboard, then pull a new pinned revision.

The last copy is still available: `git show 0f42e50:tools/storyboard/index.html`.
