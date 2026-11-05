// Sample content for the lab. Every string here is placeholder text, not game writing.
window.M1_LAB_SAMPLES = {
  items: ['FORM', 'KEY', 'BADGE', 'PEN', 'STAMP', 'MEMO', 'CLIP', 'MAP', 'COIN', 'TAG', 'FILE', 'CARD'],

  // `lines` is the expected wrapped line count; QA fails if the bitmap wrap disagrees.
  choiceTexts: {
    1: ['WAIT TO BE ASSIGNED.', 'SAY NOTHING AT ALL.', 'STEP BACK FROM THE DESK.'],
    2: [
      'ASK WHERE THE NEAREST WASHROOM IS LOCATED, PLEASE.',
      'REQUEST A PROVISIONAL DESIGNATION FROM THE FRONT DESK.',
      'PRETEND YOU ARE ALREADY EMPLOYED IN THIS DEPARTMENT.'
    ],
    3: [
      'CHALLENGE THE BASIS OF THE ENTIRE CLASSIFICATION PROCEDURE AND ASK TO SEE THE ORIGINAL FORM.',
      'EXPLAIN THAT YOU ARRIVED BY MISTAKE AND THAT THE MISTAKE WAS NOT, STRICTLY, YOUR OWN.',
      'OFFER TO COMPLETE THE FORM FOR THE PERSON WHO IS EXPECTING YOU TO COMPLETE THE FORM.'
    ],
    4: [
      'DECLINE THE DESIGNATION, CITING A REGULATION YOU HAVE NOT READ, AND WAIT TO SEE WHETHER ANYONE AT THE DESK HAS READ IT EITHER.',
      'ASK WHICH OFFICE ISSUES THE FORM REQUIRED TO REQUEST THE FORM THAT LETS YOU ASK WHERE THE WASHROOM MIGHT BE FOUND.',
      'PLACE A SMALL RUSTED KEY ON THE COUNTER WITHOUT EXPLANATION, THEN STAND VERY STILL AND SEE HOW LONG THE SILENCE CAN LAST.'
    ]
  },

  choiceSets: {
    'three-two-line': { label: 'Default: three 2-line (no overflow)', cards: [[2, 0], [2, 1], [2, 2]] },
    'one-line': { label: 'Two 1-line (short list)', cards: [[1, 0], [1, 1]] },
    'mixed-overflow': { label: 'Mixed 1-4 lines (overflow)', cards: [[1, 0], [2, 0], [3, 0], [4, 0]] },
    'long-list': { label: 'Long list, 8 cards (overflow)', cards: [[2, 0], [1, 0], [3, 0], [2, 1], [4, 0], [1, 1], [3, 1], [2, 2]] },
    'all-sprites': {
      label: 'All 12 card sprites',
      cards: [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2], [4, 0], [4, 1], [4, 2]]
    }
  },

  speech: {
    short: {
      label: 'Short (no overflow)',
      text: 'PLEASE TAKE A NUMBER. YOUR CASE WILL BE REVIEWED IN THE ORDER IT WAS MISPLACED.'
    },
    turn: {
      label: 'Your line + NPC reply',
      player: 'ASK WHERE THE NEAREST WASHROOM IS LOCATED, PLEASE.',
      text: 'THE WASHROOM HAS BEEN LOCATED. WHERE IT WAS LOCATED IS A MATTER FOR THE THIRD FLOOR.'
    },
    long: {
      label: 'Long (overflow)',
      text: 'PLEASE BE ADVISED THAT ACCESS TO THE NEAREST WASHROOM REQUIRES A PROVISIONAL DEPARTMENTAL DESIGNATION. DESIGNATIONS ARE ISSUED ON THE THIRD FLOOR, WHICH IS CLOSED FOR REDESIGNATION. IF YOU BELIEVE YOU HAVE RECEIVED THIS NOTICE IN ERROR, YOU MAY FILE A NOTICE OF ERROR, WHICH WILL BE REVIEWED BY THE OFFICE THAT ISSUED THE ORIGINAL NOTICE. THAT OFFICE HAS ASKED ME TO REMIND YOU THAT IT DOES NOT EXIST. THANK YOU FOR YOUR PATIENCE, WHICH HAS BEEN NOTED, AND WILL BE RETURNED TO YOU IN DUE COURSE.'
    }
  },

  // The NPC's answer after Choice sends, typed below the player's line.
  npcAnswer: 'NOTED. PLEASE TAKE A SEAT UNTIL YOUR NAME IS CALLED, OR MISPRONOUNCED.'
};
