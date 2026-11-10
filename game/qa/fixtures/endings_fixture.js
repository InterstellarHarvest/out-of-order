// CYOA engine v0 - independent endings fixture (S2.1, docs/80 section C, docs/74 section 12).
// ENGINE TEST CONTENT, NOT STORY CANON. Never loaded by the game; game/qa/validate_story.js uses it.
//
// One shared incident (the fire alarm in the hall) leads to two independent chapters that never
// reconverge, each with its own authored ending (owner lock [78]: permanent departures are valid
// endings). An authored ending is a node marked end: true; it is not a fatal outcome, and nothing
// here retries or restores a checkpoint (owner lock [75] is a later contract).
//
// It also carries the S2.1 risk cases: a checked spoken bluff, unchecked spoken and action cards,
// a checked SHOW at the desk and a checked USE at the incident (whose outcomes are themselves the
// two departures). Hidden d6 throughout, the owner-preferred die.
(function (root) {
  'use strict';
  var STORY = {
    schema: 'cyoa-story-v2', id: 'endings-fixture', version: 1, profile: 'fixture', save: true, start: 'ie_shared',
    initialState: { flags: { stamped: false }, inventory: ['ie_pass'], items: {} },
    cast: { clerk: { name: 'CLERK', portrait: 'clerk' } },
    assets: {
      scenes: { 'fixture/hall': null, 'fixture/archive': null, 'fixture/street': null },
      portraits: { clerk: { backgrounds: { desk: null }, poses: { idle: null }, background: 'desk', pose: 'idle' } },
      focus: {}
    },
    items: {
      ie_pass: { name: 'GREY PASS', slotArt: null, inspectArt: null,
        description: [
          { if: { flag: 'stamped' }, text: 'A GREY VISITOR PASS. IT HAS BEEN STAMPED.' },
          { text: 'A GREY VISITOR PASS. THE STAMP BOX IS EMPTY.' }
        ] }
    },
    files: [
      { text: 'VISITOR: ADMITTED TO THE HALL.' },
      { if: { flag: 'stamped' }, text: 'PASS: STAMPED AT THE DESK.' }
    ],
    chapters: {
      ie_shared: { title: 'THE HALL', scene: 'fixture/hall', start: 'hall', nodes: {
        hall: {
          mode: 'narrative', objective: 'GET PAST THE DESK.',
          text: 'A LONG HALL WITH ONE DESK. A CLERK SITS BEHIND IT. A QUEUE OF NOBODY WAITS IN FRONT OF IT.',
          choices: [ { id: 'approach', kind: 'action', text: 'GO TO THE DESK', to: 'desk' } ]
        },
        desk: {
          mode: 'dialogue', speaker: 'clerk',
          text: 'NAME. PURPOSE. PASS. IN THAT ORDER.',
          choices: [
            { id: 'bluff', kind: 'spoken', text: 'I AM EXPECTED UPSTAIRS.',
              check: { id: 'ie_bluff', sides: 6, need: 4 },
              pass: { result: 'THE CLERK STAMPS YOUR PASS WITHOUT LOOKING.', effects: { set: { stamped: true } }, to: 'incident' },
              fail: { result: 'THE CLERK WRITES SOMETHING DOWN.', to: 'incident' } },
            { id: 'ask', kind: 'spoken', text: 'WHERE DOES THIS QUEUE GO?', once: true, result: 'THE CLERK POINTS AT THE QUEUE.' },
            { id: 'wait', kind: 'action', text: 'WAIT TO BE CALLED.', to: 'incident' }
          ],
          show: { ie_pass: { say: 'MY PASS.',
            check: { id: 'ie_show', sides: 6, need: 3 },
            pass: { result: 'THE CLERK STAMPS THE PASS.', effects: { set: { stamped: true } }, to: 'incident' },
            fail: { result: 'THE CLERK HANDS IT BACK, UNSTAMPED.', to: 'incident' } } }
        },
        // The shared incident. Every way out is a permanent departure into one of two chapters.
        incident: {
          mode: 'narrative', objective: 'LEAVE THE HALL.',
          text: [
            { if: { flag: 'stamped' }, text: 'A FIRE BELL RINGS. THE CLERK WAVES YOUR STAMPED PASS TOWARDS TWO DOORS: ARCHIVE, AND STREET.' },
            { text: 'A FIRE BELL RINGS. THE CLERK LEAVES THE DESK. THERE ARE TWO DOORS: ARCHIVE, AND STREET.' }
          ],
          choices: [
            { id: 'follow-clerk', kind: 'action', text: 'FOLLOW THE CLERK DOWN TO THE ARCHIVE', chapter: 'ie_archive' },
            { id: 'take-exit', kind: 'action', text: 'TAKE THE FIRE EXIT TO THE STREET', chapter: 'ie_street' }
          ],
          use: { ie_pass: {
            check: { id: 'ie_gate', sides: 6, need: 4, mods: [ { if: { flag: 'stamped' }, add: 1 } ] },
            pass: { result: 'THE ARCHIVE GATE READS THE PASS AND OPENS.', chapter: 'ie_archive' },
            fail: { result: 'THE ARCHIVE GATE KEEPS THE PASS. THE CROWD CARRIES YOU OUT.', effects: { take: ['ie_pass'] }, chapter: 'ie_street' } } }
        }
      } },
      ie_archive: { title: 'THE ARCHIVE', scene: 'fixture/archive', start: 'stacks', nodes: {
        stacks: {
          mode: 'narrative', objective: 'FIND YOUR FILE.',
          text: 'SHELVES OF FILES GO DOWN FURTHER THAN THE STAIRS DID.',
          choices: [
            { id: 'look-shelf', kind: 'action', text: 'LOOK ALONG THE SHELF', once: true, result: 'EVERY FILE HAS THE SAME NAME ON IT.' },
            { id: 'open-file', kind: 'action', text: 'OPEN THE FILE WITH YOUR NAME', to: 'archive_end' }
          ]
        },
        archive_end: {
          mode: 'narrative', end: true, text: 'THE FILE SAYS YOU NEVER CAME IN. END OF THE ARCHIVE PATH.',
          choices: [ { id: 'restart', kind: 'system', text: 'BEGIN AGAIN.', restart: true } ]
        }
      } },
      ie_street: { title: 'THE STREET', scene: 'fixture/street', start: 'pavement', nodes: {
        pavement: {
          mode: 'narrative', objective: 'GO HOME.',
          text: 'THE STREET IS FULL OF PEOPLE FROM THE HALL. NOBODY IS ALLOWED BACK IN.',
          choices: [ { id: 'walk-home', kind: 'action', text: 'WALK HOME', to: 'street_end' } ]
        },
        street_end: {
          mode: 'narrative', end: true, text: 'YOU GET HOME. THE HALL NEVER WRITES. END OF THE STREET PATH.',
          choices: [ { id: 'restart', kind: 'system', text: 'BEGIN AGAIN.', restart: true } ]
        }
      } }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = STORY;
  else root.CYOA_ENDINGS_FIXTURE = STORY;
})(this);
