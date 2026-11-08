# The Acceptable Error — Story & Gameplay PMO Status

**Last updated:** 2026-11-07  
**PMO scope:** Gameplay grammar, narrative systems, dice/odds, item utility, branching, world and chapter/story arc.  
**Independent implementation:** M2 reception UI/sprite lab belongs to the other PMO and Claude. Do not touch it here.  
**Documentation branch:** `docs/story-gameplay-study-v01` (unmerged; proposals stay reviewable).  

## Start here after context loss

1. [00 Creative Brief](00_CREATIVE_BRIEF.md) — original intent and tone, not final canon.
2. [01 World and Story Laboratory](01_WORLD_AND_STORY.md) — original bathroom errand, misassignment, mystery alternatives and provisional cast.
3. [04 Idea Archive](04_IDEA_ARCHIVE.md) — prior optional story beats, abandoned avenues and hypotheses.
4. [55 Gameplay & Narrative Presentation Study](55_GAMEPLAY_NARRATIVE_PRESENTATION_STUDY_V01.md) — draft incident grammar and semantic right column.
5. [56 Parallel Creative Track Plan](56_PARALLEL_CREATIVE_TRACK_PLAN_V01.md) — Detroit/House of Danger comparison, ownership boundaries, staged creative gates.
6. [57 Branching & Dice Paper Test](57_BRANCHING_DICE_PAPER_TEST_V01.md) — explicit non-NPC mini-story graph, optional items, check alternatives, branch QA.

## Owner-confirmed foundation

- Single ordinary “completely wrong person”; asks for a bathroom, is accidentally assigned a job by a normal-seeming bureaucracy. May keep not getting to the bathroom as a running joke.
- Alternate Brazil-like retro-futuristic institutional world, where surreal procedures are ordinary and generally unchallenged.
- Absurd/hilarious mundane beginnings expand into distinct adventures and unsettling deeper mystery.
- House of Danger-type CYOA choices, items and chance-resolution of uncertain attempted actions are core gameplay DNA.
- Acquired items can grant opportunities or shift hidden-roll odds, but need not guarantee success.
- The right-column reception mode is not the whole game; environmental/non-NPC choices matter.
- Original mystery theory (“The Exchange”) and possible city “Meridian” are proposals, not canon.
- The other PMO/Claude are finishing M2 reception UI/runtime. This PMO works **in parallel**, not on the lab or reception implementation.
- Owner wants proactive continuation: give options, recommend one, provide Claude/Codex task when local work is better, and preserve key decisions/changes in GitHub.

## Proposed; NOT owner-locked

- Narrative **incident** as the central gameplay unit; choice-first navigation.
- Semantic right-column focus modes rather than separate redesigned shell.
- First-person mostly past-tense narrator.
- Three branch spans: incident divergence, chapter-route divergence, story-level consequences. Do not force everything to gather immediately.
- Optional chapter-end branch-path visualization (Detroit inspired).
- d6 with item modifiers versus d100 percentages; UI for showing odds undecided.
- One post-reception “Washroom Access” proof encounter (57); not actual canon or M2 content.
- Suggested next action: isolated text-only local playtester or paper test, then evaluate mechanics.

## Rejected/deferred at this time

- Generic point-and-click walkaround and mandatory scene hotspots.
- Replacing the bathroom premise with a conventional expert investigator plot.
- All-branch-ever-expanding Detroit-scale asset production.
- Unmotivated random rolls on ordinary non-risk narrative decisions.
- Every optional item automatically solving a challenge.
- Character stats and generic RPG systems without demonstrated necessity.
- Committing new gameplay implementation into M2 branch without coordination.

## Active work sequence

- [x] Recover initial narrative archive and owner mechanics intent.
- [x] Make parallel-creative-track charter, ownership boundary and Detroit study (`docs/56`).
- [x] Make three-route sample branch and two candidate dice systems (`docs/57`).
- [ ] **Owner choice:** branches-first (A), balanced text-playtest (B, recommended), or story-spine-first (C).
- [ ] If B: have Claude create isolated **offline narrative branch lab** in separate worktree with deterministic seeds, no art or production game coupling; user may elect to have this PMO review its logs. Alternatively PMO runs paper test without code.
- [ ] Review failed and successful item-assisted routes, chapter divergence, and later state callbacks; record owner rulings.
- [ ] Only then expand to preliminary larger story spine, source-of-truth world rules, or implementation handoff.

## Handoff caution

This file is a status pointer, not a replacement for original decisions or a production authorization. State changes to gameplay canon require owner agreement; append dated rulings and retain rejected proposals. Leave `main`, `tools/layout-lab`, current M2 content/state fixtures, and art untouched until separate approval.
