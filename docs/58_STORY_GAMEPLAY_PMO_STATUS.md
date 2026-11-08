# The Acceptable Error — Story & Gameplay PMO Status

**Last updated:** 2026-11-07 (story-first revision)  
**PMO scope:** Gameplay grammar, narrative systems, dice/odds, item utility, branching, world and chapter/story arc.  
**Independent implementation:** M2 reception UI/sprite lab belongs to the other PMO and Claude. Do not touch it here.  
**Documentation branch:** `docs/story-gameplay-study-v01` (unmerged; proposals stay reviewable).  

## Start here after context loss

1. [00 Creative Brief](00_CREATIVE_BRIEF.md) — original intent and tone, not final canon.
2. [01 World and Story Laboratory](01_WORLD_AND_STORY.md) — original bathroom errand, misassignment, mystery alternatives and provisional cast.
3. [04 Idea Archive](04_IDEA_ARCHIVE.md) — prior optional story beats, abandoned avenues and hypotheses.
4. [55 Gameplay & Narrative Presentation Study](55_GAMEPLAY_NARRATIVE_PRESENTATION_STUDY_V01.md) — draft incident grammar and semantic right column.
5. [56 Parallel Creative Track Plan](56_PARALLEL_CREATIVE_TRACK_PLAN_V01.md) — Detroit/House of Danger comparison, ownership boundaries, staged creative gates.
6. [57 Branching & Dice Paper Test](57_BRANCHING_DICE_PAPER_TEST_V01.md) — historical mechanics idea; ON HOLD until story material exists.
7. [59 Story Spine Laboratory 01](59_STORY_SPINE_LAB_01.md) — earlier story-pitch comparison; ranking superseded by owner Expo direction.
8. [60 The Exposition of Everything — Opening & Story Engine](60_EXPOSITION_OPENING_AND_STORY_ENGINE_V01.md) — detailed owner opening and Expo adventure framework.
9. [61 House of Tomorrow Story Laboratory](61_HOUSE_OF_TOMORROW_STORY_LAB_V01.md) — **CURRENT CREATIVE WORK**: first post-reception exhibit concept, scenes, characters, escalating automated-home absurdity, and proposed transition.

## Most recent owner story direction (2026-11-07)

- **The Exposition of Everything** is the preferred adventure engine: intentionally very different exhibit rooms, floors and buildings, allowing humorous book/film allegories and strange environments. Earlier inspector-procedural direction is no longer the lead.
- Narrative generally moves forward like a CYOA rather than looping back through an explorable hub. Normal-person attempts to return to mundane objectives are continually redirected by circumstances and rules; decisions should still matter within that predicament.
- **Pre-reception full-game opening:** ridiculous employer and job, fly/printer-caused accidental inclusion among 500,000 laid off, fired while heading to office bathroom, access revoked, forced exit, personal-effects box outside. The player may inspect and collect assorted office items; one funny but sentimental thing is hard to abandon. Expo-entry policy then takes most accumulated possessions; the player seeks the nearby Expo bathroom and reaches reception.
- The bathroom is essential at the beginning but should become a **rare callback later**, not a constant gag or timer.
- Brainstorm **stories and specific adventures first**. Mechanic and branching tests remain on hold until there is narrative worth branching.
- Everything else in current work remains on a docs-only review branch; no changes to other PMO's M2 implementation.

## Latest current request (2026-11-07)

- Owner selected **House of Tomorrow** for conceptual development as the first post-reception Expo adventure (not necessarily locked as the final playable first chapter).
- PMO created doc 61, proposing a rotating model home, domestic-labor paradox, environmental incident sequence, one or two human characters, and a dramatic relocation into Transport Miracle. These details are proposals, not owner-approved.
- Next creative checkpoint: owner evaluates whether this has the right degree of wildness and character, then we revise before selecting its plot beats. Keep branch/dice testing on hold and M2 untouched.

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
- Previous suggestion of an isolated text-only local playtester is superseded by owner's story-first sequencing. Brainstorm the actual stories before building branching tests.

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
- [x] **Owner sequencing decision:** story-first (C) before mechanical branch testing.
- [x] Start story laboratory / candidate story engines in doc 59.
- [x] Owner selected the Expo as primary story generator and provided pre-reception sequence (doc 60).
- [x] Draft first post-reception candidate House of Tomorrow in doc 61, including a reason the house keeps moving protagonist forward.
- [ ] Review/revise House of Tomorrow with owner (tone, originality, incidents, characters and next-pavilion transition).
- [ ] Resolve open creative details of the former job, memorable keepsake, first exhibit, and how many different exhibit worlds the larger plot can sustain.
- [ ] Develop story-spine beats, relevant supporting characters, a few memorable episodes and possible difficult outcomes without locking the mystery too early.
- [ ] **Later**, after concrete scenes exist, evaluate House of Danger item/dice checks and Detroit-style chapter divergence. No Claude branch lab yet.
- [ ] Review failed and successful item-assisted routes, chapter divergence, and later state callbacks; record owner rulings.
- [ ] Only then expand to preliminary larger story spine, source-of-truth world rules, or implementation handoff.

## Handoff caution

This file is a status pointer, not a replacement for original decisions or a production authorization. State changes to gameplay canon require owner agreement; append dated rulings and retain rejected proposals. Leave `main`, `tools/layout-lab`, current M2 content/state fixtures, and art untouched until separate approval.
