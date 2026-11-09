// CYOA engine v0 - the neutral rules fixture (docs/72 section 6.3, docs/74).
// ENGINE TEST CONTENT, NOT STORY CANON. It is never loaded by the game; game/qa/validate_story.js
// uses it to prove the v2 rules. All art is null (fixture profile: labelled DEV PLACEHOLDERs
// once S7 renders it). S7 may promote it to game/content/fixture/story.js.
//
// S1 version: the keypad has no dice yet. Knowing the code opens the door; guessing raises the
// alarm. S2 replaces those two cards with one checked attempt.
(function (root) {
  'use strict';
  var STORY = {
    schema: 'cyoa-story-v2', id: 'engine-fixture', version: 1, profile: 'fixture', save: true, start: 'fx_one',
    initialState: { flags: { askedCode: false, usedCard: false, doorOpened: false, alarm: false }, inventory: [], items: {} },
    cast: { attendant: { name: 'ATTENDANT', portrait: 'attendant' } },
    assets: {
      scenes: { 'fixture/room_a': null, 'fixture/room_b': null, 'fixture/room_c': null },
      portraits: { attendant: { backgrounds: { booth: null }, poses: { idle: null }, background: 'booth', pose: 'idle' } },
      focus: { 'fixture/room_a/keypad': null }
    },
    items: {
      fx_card: { name: 'BLUE CARD', slotArt: null, inspectArt: null,
        description: [
          { if: { itemNot: ['fx_card', 'read'] }, text: 'A BLUE PLASTIC CARD WITH A LINE OF SMALL PRINT ON THE BACK.' },
          { text: 'A BLUE PLASTIC CARD. THE SMALL PRINT READS: DOOR CODE BEGINS WITH 4.' }
        ],
        read: {} }
    },
    files: [
      { text: 'SUBJECT: PRESENT. PURPOSE: UNDER TEST.' },
      { if: { has: 'fx_card' }, text: 'ISSUED: ONE BLUE CARD. NOT SIGNED FOR.' },
      { if: { flag: 'doorOpened' }, text: 'DOOR: OPENED BY CODE.' },
      { if: { flag: 'alarm' }, text: 'DOOR: ALARM RAISED. NO DISCREPANCY NOTED.' }
    ],
    chapters: {
      fx_one: { title: 'FIXTURE ONE', scene: 'fixture/room_a', start: 'wake', nodes: {
        wake: {
          mode: 'narrative', objective: 'LEAVE THE TEST ROOM.',
          text: 'YOU ARE IN A SMALL GREY ROOM WITH ONE DOOR. THE DOOR HAS A KEYPAD.\n'
              + 'A DESK STANDS AGAINST THE WALL. ITS DRAWER IS SHUT.\n'
              + 'BEHIND A GLASS COUNTER, AN ATTENDANT IS FILING CARDS. NOBODY ELSE IS HERE.',
          choices: [
            { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
            { id: 'open-drawer', kind: 'action', text: 'OPEN THE DESK DRAWER', once: true,
              result: 'YOU OPEN THE DRAWER. INSIDE IS A BLUE CARD. YOU TAKE IT.',
              effects: [ { give: ['fx_card'] },
                         { if: { flag: 'askedCode' }, objective: 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' } ] },
            { id: 'go-counter', kind: 'action', text: 'GO TO THE COUNTER', to: 'counter' }
          ]
        },
        keypad: {
          mode: 'focus', focus: 'fixture/room_a/keypad',
          text: 'TWELVE KEYS AND A SMALL RED LAMP. A PLATE UNDER IT SAYS: FOUR DIGITS. ONE TRY. THEN WE TALK.',
          choices: [
            { id: 'enter-code', kind: 'action', text: 'ENTER THE CODE', if: { flag: 'askedCode' }, effects: { set: { doorOpened: true } },
              result: 'THE LAMP TURNS GREEN. THE DOOR CLICKS OPEN.', to: 'corridor' },
            { id: 'guess-code', kind: 'action', text: 'GUESS A CODE', if: { notFlag: 'askedCode' }, effects: { set: { alarm: true } },
              result: 'THE LAMP STAYS RED. SOMEWHERE, A BELL RINGS ONCE.', to: 'side_hatch' },
            { id: 'stop', kind: 'action', text: 'STOP EXAMINING', back: true, result: 'YOU STEP BACK FROM THE KEYPAD.' }
          ]
        },
        counter: {
          mode: 'dialogue', speaker: 'attendant',
          text: [ { desc: 'THE ATTENDANT LOOKS UP FROM THE CARDS.' }, 'YES? THE DOOR, IS IT. EVERYONE WANTS THE DOOR.' ],
          choices: [
            { id: 'ask-code', kind: 'spoken', text: 'HM. WHAT IS THE CODE?', if: { notFlag: 'askedCode' },
              effects: [ { set: { askedCode: true } },
                         { if: { has: 'fx_card' }, objective: 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' } ],
              to: 'counter_code' },
            { id: 'lean', kind: 'action', text: 'LEAN ON THE COUNTER.', once: true,
              result: 'THE ATTENDANT MOVES THE CARDS OUT OF YOUR REACH.' },
            { id: 'leave', kind: 'action', text: 'STEP AWAY FROM THE COUNTER.', back: true,
              result: 'YOU STEP AWAY FROM THE COUNTER.' }
          ]
        },
        counter_code: {
          mode: 'dialogue', speaker: 'attendant',
          text: 'IT STARTS WITH A FOUR. THE REST CHANGES. I WOULD NOT KNOW THE REST. I ONLY WORK HERE.',
          choices: [
            { id: 'thanks', kind: 'spoken', text: 'THANK YOU. I THINK.', back: true, result: 'YOU LEAVE THE COUNTER.' }
          ]
        },
        side_hatch: {
          mode: 'narrative',
          text: 'A PANEL BESIDE THE DOOR SLIDES OPEN ON ITS OWN. BEHIND IT IS A NARROW SERVICE PASSAGE. THE ATTENDANT DOES NOT LOOK UP.',
          choices: [ { id: 'crawl', kind: 'action', text: 'CRAWL THROUGH THE PASSAGE', to: 'corridor' } ]
        },
        corridor: {
          mode: 'narrative', scene: 'fixture/room_b', objective: 'TAKE THE LIFT UP.',
          text: [
            { if: { flag: 'doorOpened' }, text: 'YOU WALK THROUGH THE PROPER DOOR INTO A LONG CORRIDOR. AT THE END IS A LIFT WITH A CARD SLOT.' },
            { text: 'YOU CLIMB OUT INTO A LONG CORRIDOR, DUSTY TO THE ELBOWS. AT THE END IS A LIFT WITH A CARD SLOT.' }
          ],
          choices: [
            { id: 'call-lift', kind: 'action', text: 'PRESS THE LIFT BUTTON', to: 'lift' },
            { id: 'call-out', kind: 'spoken', text: 'HELLO? IS THIS LIFT WORKING?', once: true,
              result: ['YOU CALL OUT,', { say: 'HELLO? IS THIS LIFT WORKING?' }, 'NOBODY ANSWERS. THE LIFT HUMS.'] }
          ],
          use: { fx_card: { result: 'YOU PUSH THE BLUE CARD INTO THE SLOT.', effects: { take: ['fx_card'], set: { usedCard: true } }, to: 'lift' } }
        },
        lift: {
          mode: 'narrative', scene: 'fixture/room_b', // the lift is at the end of the corridor (docs/72's draft omitted this)
          text: [
            { if: { flag: 'usedCard' }, text: 'THE LIFT DOORS OPEN AT ONCE. THE SLOT KEEPS THE CARD. A SIGN INSIDE SAYS: UP ONLY.' },
            { text: 'THE LIFT ARRIVES AFTER A LONG TIME. A SIGN INSIDE SAYS: UP ONLY.' }
          ],
          choices: [ { id: 'go-up', kind: 'action', text: 'STEP INTO THE LIFT', chapter: 'fx_two' } ]
        }
      } },
      fx_two: { title: 'FIXTURE TWO', scene: 'fixture/room_c', start: 'arrive', nodes: {
        arrive: {
          mode: 'narrative', objective: 'END OF THE FIXTURE.',
          text: [
            { if: { flag: 'alarm' }, text: 'THE LIFT OPENS ON A WHITE ROOM. A NOTICE SAYS THAT AN ALARM WAS RAISED ON THE FLOOR BELOW, AND THAT IT HAS BEEN FILED.' },
            { if: { item: ['fx_card', 'read'] }, text: 'THE LIFT OPENS ON A WHITE ROOM. A NOTE ON THE WALL SAYS: THE CODE STARTS WITH A FOUR. YOU KNEW THAT TWICE.' },
            { text: 'THE LIFT OPENS ON A WHITE ROOM. A NOTE ON THE WALL SAYS: THE CODE STARTS WITH A FOUR. THE ATTENDANT, IT SEEMS, WRITES THINGS DOWN.' }
          ],
          choices: [ { id: 'finish', kind: 'continue', to: 'end' } ]
        },
        end: {
          mode: 'narrative', end: true, text: 'END OF THE ENGINE FIXTURE.',
          choices: [ { id: 'restart', kind: 'system', text: 'BEGIN AGAIN.', restart: true } ]
        }
      } }
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = STORY;
  else root.CYOA_ENGINE_FIXTURE = STORY;
})(this);
