// CYOA M2 - reception vertical slice: narrative content and starting state.
//
// This file is DATA ONLY. PMO/writers can revise every line, branch and condition here without
// touching presentation code. Its shape is documented in game/README.md ("Content schema") and
// checked by game/qa/validate_route.js, which walks every reachable state and fails on a dead end,
// an unreachable node, an unused choice or a character the pixel fonts cannot draw.
//
// All copy is placeholder writing for owner/PMO review, not locked story canon. The receptionist
// has no final name. The office title is the placeholder from docs/01.
//
// Characters the fonts can draw: A-Z a-z 0-9 space ! " ' ( ) , - . : ; ? [ ]
(function (root) {
  'use strict';

  var CONTENT = {
    schema: 'cyoa-m2-reception-content-v1',
    location: 'reception',
    speaker: 'RECEPTIONIST',
    start: 'opening',

    // The whole of the slice's state. Nothing else is persisted between turns.
    initialState: {
      flags: {
        appointed: false, // reception has made you the Examiner
        blunt: false, // asked for the bathroom curtly in the opening
        approach: '', // 'corrected' | 'cooperated' | 'practical': the first real decision
        disputeFiled: false, // filed a dispute against your own appointment
        tagQuestioned: false, // raised the key tag's impossible return time
        protested: false // made a last protest before the door
      },
      inventory: [],
      // Per item: which of 'inspected', 'read', 'shown', 'used' have happened.
      items: {}
    },

    items: {
      wc_key: {
        name: 'FACILITIES KEY',
        slotArt: 'art/items/bathroom_pass_slot.png',
        inspectArt: null, // art/items/bathroom_pass_inspect.png is owed; a labelled placeholder stands in
        description: [
          { if: { itemNot: ['wc_key', 'read'] }, text: 'A WC KEY ON A WORN LEATHER FOB. A SMALL PAPER TAG IS TIED THROUGH THE RING. IT HAS BEEN FILLED IN.' },
          { text: 'A WC KEY ON A WORN LEATHER FOB. THE TAG READS:\n\nISSUED TO: EXAMINER, OFFICE OF UNVERIFIED CONDITIONS.\nRETURNED: TODAY, 4:52.\nSIGNED: (A SIGNATURE IN WHAT IS PLAINLY YOUR OWN HANDWRITING.)' }
        ],
        // READ is always available while the item is held. It only changes item state.
        read: { effects: { mark: [['wc_key', 'read']] } }
      }
    },

    // FILES shows every entry whose condition holds, in this order: the player's case file.
    files: [
      { if: { notFlag: 'appointed' }, text: 'VISITOR. PURPOSE OF VISIT: TO ASK WHERE THE BATHROOM IS.' },
      { if: { flag: 'appointed' }, text: 'APPOINTMENT: EXAMINER, OFFICE OF UNVERIFIED CONDITIONS. EFFECTIVE: THIS MORNING. APPOINTED BY: RECEPTION.' },
      { if: { flag: 'disputeFiled' }, text: 'DISPUTE AGAINST APPOINTMENT: RECEIVED. REVIEWING OFFICER: THE EXAMINER.' },
      { if: { has: 'wc_key' }, text: 'ISSUED: ONE FACILITIES KEY, EXAMINERS PATTERN. SIGNED FOR.' },
      { if: { flag: 'tagQuestioned' }, text: 'KEY RECORDED AS RETURNED AT 4:52 TODAY. NO DISCREPANCY NOTED.' }
    ],

    // Each node: what the receptionist says on arrival (first matching variant), what entering it
    // changes, the objective it sets, the choices it offers, and what holding up or using an item
    // does here. A node with no `use`/`show` entry for an item leaves that action disabled.
    nodes: {
      opening: {
        objective: 'FIND OUT WHERE THE BATHROOM IS. THAT IS ALL. THAT IS ALL YOU CAME IN FOR.',
        npc: 'GOOD MORNING, AND WELCOME TO RECEPTION. PLEASE STATE YOUR BUSINESS IN ONE SPECIFIC SENTENCE. GENERAL SENTENCES ARE HEARD ON THURSDAYS.',
        choices: [
          { id: 'ask-politely', text: 'WHERE IS THE BATHROOM, PLEASE?', to: 'misassign' },
          { id: 'ask-bluntly', text: 'BATHROOM. QUICKLY, IF POSSIBLE. WHICH WAY?', effects: { set: { blunt: true } }, to: 'misassign' }
        ]
      },

      misassign: {
        effects: { set: { appointed: true } },
        objective: 'FIND THE BATHROOM. YOU HAVE ALSO, APPARENTLY, BEEN APPOINTED.',
        npc: [
          { if: { flag: 'blunt' }, text: 'URGENCY NOTED. [STAMP.] THE FACILITIES ARE NOT A PUBLIC LOCATION. THEIR WHEREABOUTS ARE RELEASED TO PERSONNEL ONLY, AND ONLY PERSONNEL WOULD THINK TO ASK. YOU ASKED. SO: WELCOME, EXAMINER. OFFICE OF UNVERIFIED CONDITIONS. YOU ARE EXPECTED.' },
          { text: 'ONE MOMENT. [STAMP.] THE FACILITIES ARE NOT A PUBLIC LOCATION. THEIR WHEREABOUTS ARE RELEASED TO PERSONNEL ONLY, AND ONLY PERSONNEL WOULD THINK TO ASK. YOU ASKED. SO: WELCOME, EXAMINER. OFFICE OF UNVERIFIED CONDITIONS. YOU ARE EXPECTED.' }
        ],
        // The slice's required three-way decision.
        choices: [
          { id: 'correct', text: 'THERE HAS BEEN A MISTAKE. I AM NOT AN EXAMINER. I AM A MEMBER OF THE PUBLIC WHO NEEDS A BATHROOM.', effects: { set: { approach: 'corrected' } }, to: 'dispute' },
          { id: 'cooperate', text: 'ALL RIGHT. WHAT EXACTLY DOES AN EXAMINER DO?', effects: { set: { approach: 'cooperated' } }, to: 'procedure' },
          { id: 'practical', text: 'EXAMINER, FINE, WHATEVER YOU LIKE. NOW WHERE IS THE BATHROOM?', effects: { set: { approach: 'practical' } }, to: 'facilities' }
        ]
      },

      dispute: {
        npc: 'OF COURSE. YOU WISH TO DISPUTE YOUR APPOINTMENT. DISPUTED APPOINTMENTS ARE REVIEWED BY THE EXAMINER, OFFICE OF UNVERIFIED CONDITIONS. [SHE WAITS FOR YOU TO WORK OUT WHO THAT IS.]',
        choices: [
          { id: 'rule', text: 'THEN, AS EXAMINER, I RULE THAT I AM NOT THE EXAMINER.', to: 'ruling' },
          { id: 'give-up', text: 'FORGET IT. JUST TELL ME WHERE THE BATHROOM IS.', to: 'facilities' }
        ]
      },

      ruling: {
        effects: { set: { disputeFiled: true } },
        objective: 'FIND THE BATHROOM. YOUR DISPUTE AGAINST YOURSELF IS PENDING.',
        npc: 'A RULING MUST BE MADE FROM ROOM FOUR, ON THE PROPER FORM, BY THE EXAMINER. UNTIL THEN YOU REMAIN THE EXAMINER, SO THAT YOU CAN MAKE IT. I HAVE STAMPED YOUR DISPUTE RECEIVED. IT IS ALREADY ON ITS WAY TO YOUR DESK.',
        choices: [
          { id: 'sigh', text: '[SIGH.] AND THE BATHROOM?', to: 'facilities' }
        ]
      },

      procedure: {
        npc: 'EXAMINERS EXAMINE WHATEVER HAS BEEN MARKED UNVERIFIED. AT PRESENT THAT IS ONE CONDITION, ONE CORRIDOR AND, AS OF THIS MORNING, YOU. BUT FIRST, THE STANDARD ISSUE.',
        choices: [
          { id: 'standard-issue', text: 'STANDARD ISSUE?', to: 'issue' },
          { id: 'bathroom-first', text: 'BEFORE ANY OF THAT, COULD I PLEASE USE THE BATHROOM?', to: 'facilities' }
        ]
      },

      facilities: {
        npc: [
          { if: { flag: 'disputeFiled' }, text: 'THE FACILITIES ARE BEHIND THE EXAMINERS DOOR, OVER THERE. IT IS KEPT LOCKED, SO THAT ONLY EXAMINERS USE IT. WHICH, PENDING YOUR RULING, YOU ARE.' },
          { if: { flagIs: ['approach', 'cooperated'] }, text: 'A REASONABLE PRIORITY. THE FACILITIES ARE BEHIND THE EXAMINERS DOOR, OVER THERE. IT IS KEPT LOCKED, SO THAT ONLY EXAMINERS USE IT.' },
          { text: 'THE FACILITIES ARE BEHIND THE EXAMINERS DOOR, OVER THERE. IT IS KEPT LOCKED, SO THAT ONLY EXAMINERS USE IT. EXAMINERS ARE ISSUED A KEY.' }
        ],
        choices: [
          { id: 'ask-key', text: 'THEN PLEASE ISSUE ME THE KEY.', to: 'issue' }
        ]
      },

      issue: {
        effects: { give: ['wc_key'] },
        objective: 'YOU HAVE BEEN ISSUED A KEY. CHECK THE TAG, AS ASKED.',
        npc: 'ONE FACILITIES KEY, EXAMINERS PATTERN. IT OPENS THE CORRIDOR, THE FACILITIES AND ROOM FOUR. PLEASE INSPECT THE TAG AND CONFIRM THAT THE DETAILS ARE IN ORDER.',
        choices: [
          { id: 'confirm-unread', if: { itemNot: ['wc_key', 'read'] }, text: 'I AM SURE THE DETAILS ARE IN ORDER.', to: 'confirm_blind' },
          { id: 'confirm-read', if: { item: ['wc_key', 'read'] }, text: 'THE DETAILS ARE IN ORDER. I THINK.', to: 'confirm_read' },
          { id: 'question-tag', if: { item: ['wc_key', 'read'] }, text: 'THE TAG SAYS I ALREADY RETURNED THIS KEY. TODAY, AT 4:52. IN MY HANDWRITING.', to: 'tag_question' }
        ],
        // Holding the key up to her does the same as asking, once you know what the tag says.
        show: { wc_key: { if: { item: ['wc_key', 'read'] }, say: '[HOLD UP THE TAG.] THIS SAYS I ALREADY RETURNED THE KEY. AT 4:52.', to: 'tag_question' } }
      },

      confirm_blind: {
        npc: 'THANK YOU. NOBODY EVER READS THE TAG. THAT IS HOW WE KNOW IT IS IN ORDER.',
        choices: [
          { id: 'onward-blind', text: 'SO WHERE DOES THE KEY GO?', to: 'send_off' }
        ]
      },

      confirm_read: {
        npc: 'YOU THINK. [SHE WRITES THAT DOWN.] AN EXAMINER WHO ONLY THINKS. THEY WILL LIKE YOU UPSTAIRS.',
        choices: [
          { id: 'onward-read', text: 'SO WHERE DOES THE KEY GO?', to: 'send_off' }
        ]
      },

      tag_question: {
        effects: { set: { tagQuestioned: true }, mark: [['wc_key', 'shown']] },
        npc: 'LET ME SEE. [SHE DOES NOT LOOK.] RETURNED AT 4:52, SIGNED BY THE EXAMINER. YES, THAT ALL APPEARS TO BE IN ORDER. A KEY THAT HAS BEEN RETURNED HAS, BY DEFINITION, BEEN ISSUED. I DO NOT SEE THE DIFFICULTY.',
        choices: [
          { id: 'onward-tag', text: 'I HAVE NEVER SEEN THIS KEY BEFORE IN MY LIFE.', to: 'send_off' }
        ]
      },

      // The later consequence: what she says here depends on the opening decision.
      send_off: {
        objective: 'THE BATHROOM IS BEHIND THE EXAMINERS DOOR. YOU HAVE THE KEY.',
        npc: [
          { if: { flag: 'disputeFiled' }, text: 'THE EXAMINERS DOOR, BEHIND ME. ROOM FOUR IS THE FIRST ON THE LEFT. YOUR DISPUTE IS ALREADY ON THE DESK. IT ARRIVED BEFORE YOU DID. MOST THINGS DO.' },
          { if: { flagIs: ['approach', 'corrected'] }, text: 'THE EXAMINERS DOOR, BEHIND ME. ROOM FOUR IS THE FIRST ON THE LEFT. I HAVE NOTED YOUR OBJECTION ON YOUR FILE, WHERE IT WILL BE EXAMINED. BY YOU.' },
          { if: { flagIs: ['approach', 'cooperated'] }, text: 'THE EXAMINERS DOOR, BEHIND ME. ROOM FOUR IS THE FIRST ON THE LEFT. YOUR PREDECESSOR LEFT EVERYTHING EXACTLY AS IT WAS. SO DID THE ONE BEFORE.' },
          { text: 'THE EXAMINERS DOOR, BEHIND ME. THE FACILITIES ARE THE SECOND DOOR. ROOM FOUR IS THE FIRST. PLEASE DO NOT CONFUSE THEM. THE LAST EXAMINER DID.' }
        ],
        choices: [
          { id: 'unlock', text: 'UNLOCK THE EXAMINERS DOOR WITH THE KEY.', to: 'door', effects: { mark: [['wc_key', 'used']] } },
          { id: 'protest', if: { notFlag: 'protested' }, text: 'ONE LAST TIME: I AM NOT AN EXAMINER.', effects: { set: { protested: true } }, to: 'last_protest' }
        ],
        use: { wc_key: { say: '[UNLOCK THE EXAMINERS DOOR WITH THE KEY.]', to: 'door' } }
      },

      last_protest: {
        npc: [
          { if: { flag: 'disputeFiled' }, text: 'NOTED. I WILL ADD IT TO YOUR DISPUTE, WHICH YOU WILL REVIEW, AND PROBABLY REJECT. YOU SEEMED VERY SURE OF YOURSELF EARLIER.' },
          { text: 'NOTED. I WILL PUT IT WITH THE OTHERS. [SHE OPENS A DRAWER. IT IS FULL.]' }
        ],
        choices: [
          { id: 'to-door', text: 'GO TO THE EXAMINERS DOOR.', to: 'send_off_after' }
        ]
      },

      // Back at the door after a protest: the same two ways through, without the protest.
      send_off_after: {
        npc: 'THE KEY, EXAMINER. THE DOOR WILL NOT OPEN ITSELF. IT HAS BEEN ASKED.',
        choices: [
          { id: 'unlock-after', text: 'UNLOCK THE EXAMINERS DOOR WITH THE KEY.', to: 'door', effects: { mark: [['wc_key', 'used']] } }
        ],
        use: { wc_key: { say: '[UNLOCK THE EXAMINERS DOOR WITH THE KEY.]', to: 'door' } }
      },

      // Closing beat: the running joke lands, and a reason to keep going.
      door: {
        effects: { mark: [['wc_key', 'used']] },
        objective: 'THE FACILITIES ARE CLOSED PENDING EXAMINATION. YOU ARE THE EXAMINER. ROOM FOUR.',
        npc: [
          { if: { flag: 'tagQuestioned' }, text: 'THERE. IT KNOWS YOU. THE FACILITIES ARE CLOSED, I AM AFRAID: PENDING EXAMINATION. ROOM FOUR IS WHERE YOU WOULD START. AND PLEASE RETURN THE KEY WHEN YOU ARE DONE, EXAMINER. ACCORDING TO THE RECORD YOU ALREADY HAVE, SO THERE SHOULD BE NO DELAY.' },
          { text: 'THERE. IT KNOWS YOU. THE FACILITIES ARE CLOSED, I AM AFRAID: PENDING EXAMINATION. ROOM FOUR IS WHERE YOU WOULD START. AND IF ANYONE IN THE CORRIDOR ASKS, YOU HAVE ALWAYS BEEN HERE.' }
        ],
        choices: [
          { id: 'enter-corridor', text: 'STEP THROUGH INTO THE CORRIDOR.', to: 'ending' }
        ]
      },

      ending: {
        end: true,
        objective: 'END OF THE RECEPTION SLICE. ROOM FOUR IS WAITING.',
        npc: '[THE DOOR CLOSES BEHIND YOU. SOMEWHERE AHEAD, IN ROOM FOUR, A TYPEWRITER IS ALREADY TYPING.] END OF THE RECEPTION SLICE.',
        choices: [
          { id: 'restart', text: 'BEGIN AGAIN.', restart: true }
        ]
      }
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = CONTENT;
  else root.CYOA_RECEPTION = CONTENT;
})(this);
