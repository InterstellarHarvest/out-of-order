# The Acceptable Error — Prologue Artwork Review Lab

**Status: DRAFT FOR OWNER VISUAL REVIEW; no production promotion.**

Isolated branch based on the approved M2 Round 2 presentation at \`312928afbac4aace37c6602e9033574f90849d2b\`. All 28 new PNGs are copies of exact existing Git blobs from \`docs/story-gameplay-study-v01\`, stored exclusively in \`tools/prologue-art-lab/assets/\`. The original \`game/\`, \`art/ui/\`, reception assets and gameplay content are unchanged.

## Open in the browser

From this branch's repository root:

\`\`\`sh
python3 -m http.server 8137 --bind 127.0.0.1
\`\`\`

Then visit **http://127.0.0.1:8137/tools/prologue-art-lab/index.html**.

The controls use the **actual approved M2 renderer and stage elements**: seven prologue main scenes plus approved reception, the termination drone's closed/paper poses over the independent corridor background, nine new inventory icons plus the facilities key in the seven-slot strip, all nine new inspection illustrations plus approved key inspection art, and the approved receptionist scene/portrait for continuity. Portrait layer visibility, pose offsets, inventory start index, and item inspector can be switched without playing the story. The neutral lab-only inventory and descriptions do not represent canon.

Rendering is preserved: 314×206 scene at exactly 4× nearest-neighbor, 564×278 separate portrait layers at 1×, 96×96 icons at 1×, 565×451 inspector art at 1×. No new UI shell or graphics are created.

## QA and screenshot capture

Run this from the local worktree/repository root with Playwright and its Chromium/Firefox browsers installed:

\`\`\`sh
NODE_PATH="$(npm root -g)" node tools/prologue-art-lab/qa/run_qa.js
\`\`\`

The runner checks dimensions, file presence and PNG format for all 28 candidates, validates all stage categories and the approved M2 Round 2 values in Chromium and Firefox, and generates actual stage screenshots in \`tools/prologue-art-lab/qa/screenshots/\`, with a results report at \`tools/prologue-art-lab/qa/qa_results.json\`.

**The scripts were authored remotely; they have not been executed in the owner's local checkout and no passing browser QA or screenshots are claimed yet.** Run the suites before owner review.

Additional M2 regression commands:

\`\`\`sh
node game/qa/validate_route.js
NODE_PATH="$(npm root -g)" node game/qa/run_qa.js
NODE_PATH="$(npm root -g)" node tools/m2-reception-polish-lab/qa/run_qa.js
NODE_PATH="$(npm root -g)" node tools/layout-lab/qa/run_qa.js
\`\`\`

Known M2 baseline: route 49/49; game 525/525; M2 polish lab 143/143; layout lab 1916/1924 (exactly eight existing failures). Require zero new failures.

## Items requiring owner approval

Keep issues visible instead of making unapproved revisions:
1. Termination notice's conflicting signature/review/pending graphics do not reflect its conditional story states.
2. Claim ticket prints FOUR even for a possible three-item property record.
3. Effects box has the unconfirmed protagonist name H. Carter.
4. Termination drone layer alignment against corridor background.
5. Inspector full backgrounds/shadows/object centering inside the M2 art opening.
6. Continuity between office, street, Exposition and approved reception.

See included \`source_art_review.md\` and \`artwork.draft.json\`. Do not update any draft \`status\` to approved/integrated, generate art, merge branches, or rewrite gameplay/story. **Stop for owner visual approval.**

## Files

\`stage.html\` embeds the real M2 stage/CSS, flow and sprites. \`lab-preload.js\` adds draft art to the real loader and temporary iframe-only item definitions. \`stage-driver.js\` switches real scene and portrait elements and calls the actual inspector and inventory renderer. \`index.html\`, \`lab.css\`, \`lab.js\` provide controls. \`qa/run_qa.js\` captures screenshots from the actual M2 stage. No production file imports this lab.
