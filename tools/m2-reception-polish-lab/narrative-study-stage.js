// NARRATIVE STUDY: a lab-only presentation adapter inside a stage frame (docs/64-68), loaded after
// lab-stage.js. EXPERIMENTAL PREVIEW: the production game has no narrative mode, and nothing here is
// part of it. It never writes G.state, never reads browser storage, and never edits game/ files.
//
// It reuses the production stage it runs in: the canonical shell, the baked faces and glyph maps
// (G.text), the approved choice cards with their production arrive / slide-away / send motions
// (G.setChoices, G.ui.motion), the dialogue's scroll-thumb style (.speech-indicator) and the labelled
// developer placeholder (G.placeholders.panel). It adds only:
//   - Narrative B: the review overlay (Candidate 1 or 2, a 1920x1080 RGBA layer over the shell) and
//     one narration canvas on it. The narration works like the dialogue box (owner, 2026-11-08): new
//     text types on below what is there and the box scrolls to follow it; once it stops, a thumb
//     shows when there is more than fits, and the wheel scrolls back. A choice's result continues the
//     narration. A long passage still waits for CONTINUE between groups of whole paragraphs.
//     (The earlier study's replacing pages remain selectable for comparison.)
//   - Focus A: the normal shell (portrait aperture + speech panel), a runtime-drawn placeholder
//     close-up in the portrait aperture, and the description in the speech panel's text area.
//   - Talking vs action: candidate ways to tell spoken words from actions, thoughts and narration,
//     applied to the narration and (states NB-8, NB-9) to the real reception dialogue in this frame.
// Choices carry a semantic kind: action | spoken | continue. None is written to the transcript or the
// dialogue history: the result is narrated.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var T = G.text;
  var LAB = window.LAB_STAGE;
  var NS = window.NARRATIVE_STUDY;
  var R = G.measured.regions;
  var frameMode = window.LAB_FRAME && window.LAB_FRAME.mode;
  var S = (window.NARRATIVE_STAGE = {});

  // Values: the PRODUCTION frame always shows the study defaults; the LAB frame starts from the lab
  // page's current narrative-study values (memory, never storage) and then takes them live.
  var vals = NS.defaults();
  if (frameMode === 'lab') {
    try {
      var p = window.parent && window.parent !== window && window.parent.NARRATIVE_LAB ? window.parent.NARRATIVE_LAB.values() : null;
      if (p && NS.validate(p).ok) vals = Object.assign(NS.defaults(), p);
    } catch (e) { /* the lab page is not there: defaults */ }
  }
  function V(k) { return vals[k]; }

  // Talking vs action ---------------------------------------------------------------------------
  // Text is a list of runs, each spoken or not. A word of an unspoken run that takes the second ink
  // is prefixed with MARK, a zero-width glyph added (in this frame only) to every face, so wrapping
  // and widths are the production ones and every wrapped line carries its own inks.
  var MARK = '\u0001';
  var INK1 = '#203037'; // the production dark ink
  ['dialogue', 'choices', 'labels', 'objective'].forEach(function (r) {
    var m = T.face(r).mapping;
    if (!m[MARK]) m[MARK] = { x: 0, y: 0, w: 0, h: 0, advance: 0, bearingX: 0, bearingY: 0 };
  });
  // Fixture markup: {{...}} is spoken.
  function parseRuns(text) {
    var out = [];
    var re = /\{\{([^}]*)\}\}/g;
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), spoken: false });
      out.push({ t: m[1], spoken: true });
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ t: text.slice(last), spoken: false });
    return out;
  }
  // A production dialogue part: [stage directions] are unspoken; a thought is unspoken throughout.
  function dialogueRuns(text, who) {
    if (who === 'thought') return [{ t: text.replace(/^\(|\)$/g, ''), spoken: false, bracket: '()' }];
    var out = [];
    var re = /\[([^\]]*)\]/g;
    var last = 0;
    var m;
    while ((m = re.exec(text))) {
      if (m.index > last) out.push({ t: text.slice(last, m.index), spoken: true });
      out.push({ t: m[1], spoken: false, bracket: '[]' });
      last = re.lastIndex;
    }
    if (last < text.length) out.push({ t: text.slice(last), spoken: true });
    return out;
  }
  // The narration (owner, 2026-11-08): one dark ink throughout; under the owner's rule (style 2)
  // anyone's speech - the player calling out or talking to themselves, or someone else - is in
  // quotation marks, and actions are plain. Style 1 is the game today: nothing is marked.
  function markRuns(runs, style) {
    return runs.map(function (r) {
      var t = r.t.trim();
      if (!t) return '';
      return r.spoken && style === 2 ? '"' + t + '"' : t;
    }).filter(Boolean).join(' ');
  }
  function inked(t) { return t.trim().split(/\s+/).map(function (w) { return MARK + w; }).join(' '); }
  // The dialogue box under the owner's rule: nobody's speech is quoted; the player's actions take the
  // second ink, without brackets; the NPC's stage directions read as plain descriptions in the dark
  // ink; a thought keeps the game's own presentation (owned elsewhere, see the lab README).
  // Choices whose whole line is an action carry no brackets in the content, so the study names them.
  var ACTION_CHOICES = ['unlock', 'unlock-after', 'to-door', 'enter-corridor'];
  var NPC_DESCRIPTIONS = { 'STAMP.': 'SHE STAMPS SOMETHING.' }; // every other direction is a description already
  // A sigh and other vocal sounds are mostly speech, not action (owner, 2026-11-08): a bracketed
  // sound reads as part of what is said, dark and without brackets.
  var SOUNDS = /^(SIGH|AHEM|HM+|HMPH|UGH|HUH|TSK|PSST|SH+|OH|AH|UH|UM|ER|PHEW|GASP|GULP|GROAN|COUGH|YAWN|LAUGH|CHUCKLE|SNORT|SNIFF|HA)[.!?,]*$/;
  function sound(t) { return SOUNDS.test(t.trim()); }
  function actionSays() {
    var out = {};
    var nodes = (G.content && G.content.nodes) || {};
    Object.keys(nodes).forEach(function (n) {
      (nodes[n].choices || []).forEach(function (c) { if (ACTION_CHOICES.indexOf(c.id) !== -1) out[c.text] = c.id; });
    });
    return out;
  }
  function choiceText(id) {
    var nodes = (G.content && G.content.nodes) || {};
    var hit = null;
    Object.keys(nodes).forEach(function (n) { (nodes[n].choices || []).forEach(function (c) { if (c.id === id) hit = c.text; }); });
    return hit;
  }
  function markLine(o) {
    if (o.who === 'thought') return o.text;
    var runs = dialogueRuns(o.text, o.who);
    if (o.who === 'npc') {
      return runs.map(function (r) { var t = r.t.trim(); return r.spoken ? t : (NPC_DESCRIPTIONS[t] || t); }).filter(Boolean).join(' ');
    }
    if (actionSays()[o.text]) return inked(o.text);
    return runs.map(function (r) { var t = r.t.trim(); return !t ? '' : r.spoken || sound(t) ? t : inked(t); }).filter(Boolean).join(' ');
  }
  function plain(t) { return t.split(MARK).join(''); }

  // Draws wrapped lines like G.text.draw (same faces, glyph maps, tops and typewriter budget), with
  // each word in the first ink or, after MARK, the second.
  function paint(canvas, lines, lh, width, height, budget) {
    canvas.width = width;
    canvas.height = height;
    var ctx = canvas.getContext('2d');
    var layers = {};
    var layer = function (k) {
      if (!layers[k]) {
        var c = document.createElement('canvas');
        c.width = width;
        c.height = height;
        layers[k] = c.getContext('2d');
        layers[k].imageSmoothingEnabled = false;
      }
      return layers[k];
    };
    var left = budget === undefined ? Infinity : budget;
    var y = 0;
    lines.forEach(function (line) {
      y += line.gap || 0;
      var face = T.face(line.role);
      var atlas = face.id === 'locked' ? G.image('locked_pixel_font_atlas_dark') : G.image('font:' + face.id);
      var x = 0;
      var two = false;
      var start = true;
      for (var i = 0; i < line.text.length && left > 0; i++, left--) {
        var ch = line.text[i];
        if (ch === ' ') start = true;
        else if (start) { two = ch === MARK; start = false; }
        var g = face.mapping[ch] || face.mapping['?'];
        if (g.w && g.h) layer(two ? 2 : 1).drawImage(atlas, g.x, g.y, g.w, g.h, x + (g.bearingX || 0), y + (g.bearingY || 0), g.w, g.h);
        x += g.advance;
      }
      y += lh;
    });
    ctx.imageSmoothingEnabled = false;
    [1, 2].forEach(function (k) {
      var l = layers[k];
      if (!l) return;
      l.globalCompositeOperation = 'source-in';
      l.fillStyle = k === 1 ? INK1 : NS.INKS[V('marking.ink')];
      l.fillRect(0, 0, width, height);
      ctx.drawImage(l.canvas, 0, 0);
    });
  }
  // The production dialogue box draws through G.text.draw: a line with a second-ink word is painted
  // here instead (only ever in states NB-8 and NB-9); every other call is the production routine, untouched.
  // Action choice cards in the action ink (a toggle, owner 2026-11-08): a card whose whole line is an
  // action - an action choice in NB-8 / NB-9, or an action card in Narrative B / Focus A - is painted
  // here too. The card's text itself (and its accessible name) is never changed.
  var prodDraw = T.draw;
  function actionCard(text) {
    if (V('marking.style') !== 2 || !V('marking.actionCards')) return false;
    if (talk) return !!actionSays()[text];
    return !!active && choicesFor().some(function (c) { return c.kind === 'action' && c.text === text; });
  }
  T.draw = function (canvas, lines, ink, lineHeight, width, height, maxChars, role) {
    var str = function (l) { return typeof l === 'string' ? l : l.text; };
    if (canvas.classList && canvas.classList.contains('card-text') && actionCard(lines.map(str).join(' '))) {
      lines = lines.map(function (l) { return inked(str(l)); });
      return paint(canvas, lines.map(function (l) { return { text: l, role: role }; }), lineHeight, width, height, maxChars);
    }
    var marked = lines.some(function (l) { return str(l).indexOf(MARK) !== -1; });
    if (!marked) return prodDraw.apply(this, arguments);
    paint(canvas, lines.map(function (l) { return typeof l === 'string' ? { text: l, role: role } : l; }), lineHeight, width, height, maxChars);
  };

  // Fixtures ----------------------------------------------------------------------------------
  // REPRESENTATIVE TEST TEXT ONLY: not story canon, not M2 content. Upper case, plain ASCII that every
  // baked face covers, and second person, present tense (owner, 2026-11-08). {{...}} is spoken.
  var NOTICE = [
    'A NOTICE IS PINNED BESIDE THE DOUBLE DOORS, TYPED ON THE BUILDING\'S OWN FORM. YOU READ IT BECAUSE THERE IS NOTHING ELSE TO DO, AND BECAUSE THE FORM HAS BEEN STAMPED THREE TIMES, WHICH IN THIS BUILDING MEANS SOMEBODY EXPECTS IT TO BE READ.',
    'IT SAYS THAT FROM TODAY ALL VISITORS ARE TO BE TREATED AS STAFF, AND ALL STAFF AS VISITORS, UNTIL THE MATTER OF WHO IS WHICH HAS BEEN SETTLED BY THE OFFICE CONCERNED. THE OFFICE CONCERNED IS NOT NAMED. A SPACE HAS BEEN LEFT FOR ITS NAME, AND THE SPACE HAS BEEN INITIALLED.',
    'BELOW THAT, IN SMALLER TYPE, IT EXPLAINS THAT ANY PERSON WHO BELIEVES THEY HAVE BEEN MISCLASSIFIED MAY APPLY FOR RECLASSIFICATION AT THE DESK, BETWEEN NINE AND NINE FIFTEEN, ON ANY DAY THE DESK IS STAFFED. BEHIND YOU, THE RECEPTIONIST SAYS, {{IT IS PERFECTLY CLEAR ONCE YOU HAVE READ IT TWICE.}}',
    'AT THE VERY BOTTOM SOMEONE HAS ADDED, BY HAND, THAT THE BATHROOM ON THIS FLOOR IS FOR THE USE OF STAFF ONLY, AND THAT THIS RULE HAS NOT CHANGED. THE HANDWRITING IS NEAT AND VERY SMALL, AS IF IT WERE EMBARRASSED TO BE THERE AT ALL.'
  ];
  var LONG = {
    1: NOTICE.join('\n\n'),
    2: 'THE NOTICE BESIDE THE DOUBLE DOORS RUNS ON WITHOUT A SINGLE BREAK, AS IF WHOEVER TYPED IT WAS AFRAID THAT A PARAGRAPH WOULD BE TAKEN AS PERMISSION TO STOP READING. IT EXPLAINS THAT VISITORS ARE TO BE TREATED AS STAFF AND STAFF AS VISITORS UNTIL THE MATTER IS SETTLED. IT EXPLAINS THAT THE MATTER WILL BE SETTLED BY THE OFFICE CONCERNED, WHICH IS NOT NAMED. IT EXPLAINS THAT A SPACE HAS BEEN LEFT FOR THE NAME AND THAT THE SPACE HAS BEEN INITIALLED, WHICH MAKES IT OFFICIAL. IT EXPLAINS THAT ANY PERSON WHO BELIEVES THEY HAVE BEEN MISCLASSIFIED MAY APPLY AT THE DESK BETWEEN NINE AND NINE FIFTEEN. IT EXPLAINS THAT THE DESK IS NOW STAFFED BY VISITORS. IT EXPLAINS THAT VISITORS CANNOT ACCEPT APPLICATIONS. IT EXPLAINS THAT THIS IS NOT A CONTRADICTION BUT A PROCEDURE. IT EXPLAINS THAT THE PROCEDURE IS UNDER REVIEW, AND THAT THE REVIEW IS BEING CONDUCTED BY THE OFFICE CONCERNED. IT ENDS, AT LAST, WITH A REMINDER THAT THE BATHROOM ON THIS FLOOR IS FOR STAFF ONLY, AND THAT THIS RULE HAS NOT CHANGED.',
    3: NOTICE.concat([
      'A SECOND SHEET IS PINNED UNDER THE FIRST. IT IS A COPY OF THE FIRST, EXCEPT THAT EVERY INSTANCE OF THE WORD VISITOR HAS BEEN STRUCK THROUGH AND REPLACED WITH THE WORD APPLICANT, AND EVERY INSTANCE OF THE WORD STAFF HAS BEEN CIRCLED, AS IF SOMEBODY MEANT TO COME BACK TO IT LATER AND NEVER DID.',
      'A THIRD SHEET, UNDER THE SECOND, IS BLANK EXCEPT FOR A STAMP IN THE TOP CORNER THAT READS RECEIVED, AND A SECOND STAMP BESIDE IT THAT READS NOT RECEIVED. BOTH STAMPS ARE DATED TODAY. BOTH ARE SIGNED IN THE SAME HAND, WHICH, YOU NOTICE WITH SOME DISCOMFORT, LOOKS A GREAT DEAL LIKE YOUR OWN.'
    ]).join('\n\n')
  };

  var HALL_CHOICES = [
    { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
    { id: 'pull-lever', kind: 'action', text: 'PULL THE LEVER', to: 'lever' },
    { id: 'wait', kind: 'action', text: 'WAIT BY THE DESK', to: 'wait' }
  ];
  var NODES = {
    hall: { mode: 'B', choices: HALL_CHOICES,
      text: 'THE RECEPTIONIST IS BUSY WITH A FORM AND DOES NOT LOOK UP. THE DOUBLE DOORS BESIDE THE DESK STAND SHUT, WITH A BRASS KEYPAD SET INTO THEIR FRAME. ABOVE IT, A LEVER MARKED CALL ATTENDANT WAITS IN ITS SLOT.' },
    'hall-long': { mode: 'B', choices: HALL_CHOICES,
      text: 'THE RECEPTIONIST HAS GONE BACK TO HER FORMS. SHE FILLS THEM IN WITH THE SLOW CARE OF SOMEONE WHO EXPECTS EACH ONE TO BE READ ALOUD AT HER RETIREMENT, AND SHE DOES NOT LOOK UP WHEN YOU MOVE AWAY FROM THE DESK.\n\n'
        + 'A BRASS KEYPAD IS SET INTO THE FRAME OF THE DOUBLE DOORS AT CHEST HEIGHT. ITS KEYS ARE WORN FLAT IN THE MIDDLE, WHERE THE SAME FEW NUMBERS HAVE BEEN PRESSED FOR YEARS. ABOVE IT, A LEVER MARKED CALL ATTENDANT WAITS IN ITS SLOT, PAINTED THE SAME GREEN AS EVERYTHING ELSE THAT NOBODY IS MEANT TO TOUCH.\n\n'
        + 'SOMEWHERE IN THE WALL, A PNEUMATIC TUBE THUMPS ONCE AND GOES QUIET.' },
    announce: { mode: 'B', long: true, choices: [
      { id: 'reclassify', kind: 'action', text: 'APPLY FOR RECLASSIFICATION AT THE DESK', to: 'wait' },
      { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
      { id: 'pull-lever', kind: 'action', text: 'PULL THE LEVER', to: 'lever' }
    ] },
    keypad: { mode: 'A', focus: 'keypad', choices: [
      { id: 'press-keys', kind: 'action', text: 'PRESS THE KEYS AT RANDOM', to: 'keypad-tried' },
      { id: 'stop', kind: 'action', text: 'STOP EXAMINING', to: 'hall-return' }
    ], text: 'A BRASS KEYPAD, TWELVE KEYS, THE NUMBERS WORN SMOOTH. A STAMPED PLATE BELOW IT READS: STAFF ONLY. CODES ARE ISSUED, NOT GUESSED.' },
    'keypad-tried': { mode: 'A', focus: 'keypad', choices: [
      { id: 'stop', kind: 'action', text: 'STOP EXAMINING', to: 'hall-after-try' }
    ], text: 'THE KEYS GO DOWN ONE BY ONE WITH A DRY CLICK. A SLOT UNDER THE PLATE PRINTS A SMALL RECEIPT: ATTEMPT RECORDED. PLEASE WAIT TO BE CONTACTED.' },
    'hall-return': { mode: 'B', choices: HALL_CHOICES,
      text: 'YOU STEP BACK FROM THE DOORS. THE KEYPAD GOES ON GLOWING FAINTLY, AS IF IT HAS MADE A NOTE OF YOU. SOMEWHERE BEHIND THE DESK A TUBE THUMPS, ONCE.' },
    'hall-after-try': { mode: 'B', choices: HALL_CHOICES,
      text: 'YOU STEP BACK. THE RECEIPT HANGS FROM ITS SLOT AND CURLS SLOWLY IN THE DRAUGHT FROM THE DOORS. NOBODY COMES TO CONTACT YOU.' },
    lever: { mode: 'B', choices: [HALL_CHOICES[0], HALL_CHOICES[2]],
      text: 'YOU PULL THE LEVER. IT GOES DOWN WITH A HEAVY CLUNK AND DOES NOT COME BACK UP. NOTHING ELSE HAPPENS. THEN, FAR AWAY, A BELL RINGS TWICE.' },
    wait: { mode: 'B', choices: [HALL_CHOICES[0], HALL_CHOICES[1]],
      text: 'YOU WAIT BY THE DESK. THE CLOCK ABOVE IT MOVES ONE MINUTE FORWARD AND THEN SEEMS TO THINK BETTER OF IT. WITHOUT LOOKING UP, THE RECEPTIONIST SAYS, {{IF YOU ARE WAITING, PLEASE WAIT OVER THERE.}}' },
    // Spoken vs action (docs/64): the same approved cards; the difference is semantic and behavioural.
    spoken: { mode: 'B', choices: [
      { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
      { id: 'call-out', kind: 'spoken', text: 'HELLO? IS ANYONE BACK THERE?', to: 'called-out' },
      { id: 'knock', kind: 'action', text: 'KNOCK ON THE DOUBLE DOORS', to: 'knocked' }
    ], text: 'THE LOBBY IS QUIET. SOMEWHERE BEHIND THE DOUBLE DOORS, A CHAIR SCRAPES ACROSS A TILED FLOOR.' },
    // A spoken line's result tells what you said, as speech, then what happened.
    'called-out': { mode: 'B', choices: HALL_CHOICES,
      text: 'YOU CALL OUT, {{HELLO? IS ANYONE BACK THERE?}} YOUR VOICE COMES BACK OFF THE TILES. THE CHAIR STOPS SCRAPING. A MAN ANSWERS THROUGH THE DOORS, {{NOT FOR VISITORS, THERE ISN\'T.}}' },
    knocked: { mode: 'B', choices: HALL_CHOICES,
      text: 'YOU KNOCK TWICE ON THE DOUBLE DOORS. THEY ABSORB IT, THE WAY DOORS IN THIS BUILDING ABSORB MOST THINGS.' }
  };
  S.NODES = NODES;
  function passage(id) { return NODES[id].long ? LONG[V('paging.fixture')] : NODES[id].text; }
  // Paragraphs of a passage, each a list of runs.
  function paragraphs(id) {
    return passage(id).split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean).map(parseRuns);
  }
  function marked(runs) { return markRuns(runs, V('marking.style')); }
  function markedPassage(id) { return paragraphs(id).map(marked).join('\n\n'); }

  // Pagination (Focus A's description) ----------------------------------------------------------
  // Pages are arrays of wrapped lines, paragraphs separated by one blank line. A page never starts
  // with a blank line, never holds more lines than `cap`, and no word is lost or reordered. Whole
  // paragraphs; a paragraph that does not fit an empty page flows by sentences, and a sentence
  // longer than a whole page falls back to lines.
  function sentences(para) {
    return para.match(/[^.!?]+[.!?]+['")]*(\s+|$)|[^.!?]+$/g).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function paginate(text, role, width, cap) {
    var paras = text.split(/\n\s*\n/).map(function (p) { return p.replace(/\s*\n\s*/g, ' ').trim(); }).filter(Boolean);
    var pages = [];
    var cur = [];
    var wrap = function (t) { return T.wrap(t, width, role); };
    var room = function () { return cap - cur.length - (cur.length ? 1 : 0); };
    var flush = function () { if (cur.length) pages.push(cur); cur = []; };
    var put = function (lines, cont) { // cont: continues the paragraph already at the end of cur
      if (cur.length && !cont) cur.push('');
      cur = cur.concat(lines);
    };
    function byLines(lines, cont) {
      lines.forEach(function (l, i) {
        var r = cap - cur.length - (cur.length && i === 0 && !cont ? 1 : 0);
        if (r <= 0) { flush(); cont = true; }
        if (i === 0) put([l], cont && cur.length > 0); else put([l], true);
      });
    }
    function bySentences(para) {
      var buf = '';
      var cont = false; // whether this paragraph has already started on the current page
      sentences(para).forEach(function (s) {
        var cand = buf ? buf + ' ' + s : s;
        var r = cont ? cap - cur.length : room();
        if (wrap(cand).length <= r) { buf = cand; return; }
        if (buf) { put(wrap(buf), cont); cont = true; }
        buf = '';
        flush();
        cont = false;
        if (wrap(s).length <= cap) buf = s;
        else { byLines(wrap(s), false); cont = true; }
      });
      if (buf) {
        var w = wrap(buf);
        if (w.length > (cont ? cap - cur.length : room())) { flush(); cont = false; }
        put(w, cont);
      }
    }
    paras.forEach(function (para) {
      var lines = wrap(para);
      if (lines.length <= cap) {
        if (lines.length > room()) flush();
        put(lines, false);
        return;
      }
      bySentences(para);
    });
    flush();
    return pages.length ? pages : [['']];
  }
  S.paginate = paginate;

  // Geometry ------------------------------------------------------------------------------------
  function faceRole() { return NS.FONT_ROLE[V('text.font')]; }
  // The box shows `cap` lines: from the first line's top to the last line's glyph bottom
  // ((cap - 1) line pitches + the face's own height), never past the safe bottom.
  function boxB() {
    var lh = V('text.lineHeight');
    var faceH = T.lineHeight(faceRole());
    var avail = NS.SAFE_B.bottom - V('text.bottomMargin') - V('text.y');
    var cap = Math.max(1, Math.floor((avail - faceH) / lh) + 1);
    return { x: V('text.x'), y: V('text.y'), width: V('text.width'), lh: lh, cap: cap, height: (cap - 1) * lh + faceH, role: faceRole() };
  }
  function boxA() {
    var lh = V('focus.lineHeight');
    var faceH = T.lineHeight('dialogue');
    var avail = NS.SAFE_A.bottom - V('focus.y');
    var cap = Math.max(1, Math.floor((avail - faceH) / lh) + 1);
    return { x: V('focus.x'), y: V('focus.y'), width: V('focus.width'), lh: lh, cap: cap, height: (cap - 1) * lh + faceH, role: 'dialogue' };
  }
  function box(mode) { return mode === 'A' ? boxA() : boxB(); }
  // A CONTINUE group holds at most this many lines.
  function groupCap() { var c = boxB().cap; return V('paging.maxLines') > 0 ? Math.min(c, V('paging.maxLines')) : c; }
  // The dialogue's scroll thumb rail (G.layout.speech.indicator: x 1899, 8 wide, inset 6 top /
  // 12 bottom against its 144 px text box), set the same way beside the narration box.
  function railB(b) { var ind = G.layout.speech.indicator; return { x: ind.x, y: b.y + 6, width: ind.width, height: Math.max(12, b.height - 18) }; }

  // Overlay art: one kept <img> per candidate (a new <img> per rebuild makes Firefox report a corrupt
  // image), decoded before a state shows. Review assets under review/, never under the lab folder.
  var overlayImgs = {};
  function overlayImg(c) {
    if (!overlayImgs[c]) {
      var img = new Image();
      img.id = 'labNarrativeOverlay';
      img.className = 'sprite-abs';
      img.alt = '';
      img.draggable = false;
      img.width = 1920;
      img.height = 1080;
      img.setAttribute('aria-hidden', 'true');
      img.style.left = '0px';
      img.style.top = '0px';
      img.src = G.url(NS.OVERLAYS[c].path);
      img.dataset.art = NS.OVERLAYS[c].path;
      overlayImgs[c] = { img: img, ready: img.decode().catch(function () {}) };
    }
    return overlayImgs[c];
  }

  // State ---------------------------------------------------------------------------------------
  // active: { node, mode, prevNode, focusNode, taken: [],
  //   log: [runs, ...], newFrom,          Narrative B, continuous: the paragraphs told so far
  //   beats: [[para index, ...]], beat,   the current passage's CONTINUE groups
  //   pages: [[line]], page,              Focus A's description
  //   scroll, typing, typed, skip, fade }
  var active = null;
  var epoch = 0;
  var els = {};
  var showBounds = false;
  var lastToggles = null;
  function now() { return performance.now(); }
  function loading() { return LAB.loading && LAB.loading(); }
  function setPhase(p) {
    G.flow.phase = p;
    document.body.dataset.phase = p;
    G.renderUtility();
  }
  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { r(); }); }); }
  function alive(ep) { if (ep !== epoch || !active) throw new Error('narrative-superseded'); }
  async function waitMs(ms, ep) {
    if (loading() || ms <= 0) return;
    var t0 = now();
    while (now() - t0 < ms) { await nextFrame(); alive(ep); }
  }
  async function untilTrue(test, ep) { while (!test()) { await nextFrame(); alive(ep); } }

  // The CONTINUE step the passage stands at, and how many there are.
  function step() { return active.mode === 'A' ? active.page : active.beat; }
  function steps() { return active.mode === 'A' ? active.pages.length : active.beats.length; }

  function choicesFor() {
    var n = NODES[active.node];
    if (step() < steps() - 1) return [{ id: 'continue', kind: 'continue', text: 'CONTINUE' }];
    return n.choices.map(function (c) { return { id: c.id, kind: c.kind, text: c.text, to: c.to }; });
  }

  // CONTINUE groups: whole paragraphs, as many as fit one panel together; a paragraph longer than
  // the panel is a group of its own and simply types on and scrolls. No CONTINUE at all: one group.
  function beatsFor(id) {
    var paras = paragraphs(id);
    if (!V('paging.continue')) return [paras.map(function (p, i) { return i; })];
    var b = boxB();
    var cap = groupCap();
    var out = [];
    var cur = [];
    var used = 0;
    paras.forEach(function (runs, i) {
      var n = T.wrap(marked(runs), b.width, b.role).length;
      if (cur.length && used + 1 + n > cap) { out.push(cur); cur = []; used = 0; }
      used += (cur.length ? 1 : 0) + n;
      cur.push(i);
    });
    if (cur.length) out.push(cur);
    return out.length ? out : [[]];
  }
  function pagesOf(id) {
    var b = boxA();
    return paginate(markedPassage(id), b.role, b.width, b.cap);
  }
  function appendBeat() {
    var paras = paragraphs(active.node);
    active.newFrom = active.log.length;
    active.beats[active.beat].forEach(function (i) { active.log.push(paras[i]); });
  }
  // Starts a B passage: its first CONTINUE group is added to the narration.
  function beginB(id) {
    active.beats = beatsFor(id);
    active.beat = 0;
    appendBeat();
  }

  // The lines of a surface: { lines: [{ text, role }], newRow, base (chars before newRow), total }.
  function layout(mode) {
    var b = box(mode);
    var lines = [];
    var newRow = 0;
    if (mode === 'A') {
      (active.pages[active.page] || []).forEach(function (t) { lines.push({ text: t, role: b.role }); });
    } else {
      active.log.forEach(function (runs, i) {
        if (i > 0) lines.push({ text: '', role: b.role });
        if (i === active.newFrom) newRow = lines.length;
        T.wrap(marked(runs), b.width, b.role).forEach(function (t) { lines.push({ text: t, role: b.role }); });
      });
      if (active.newFrom >= active.log.length) newRow = lines.length; // nothing new yet
    }
    var base = 0;
    for (var i = 0; i < newRow; i++) base += lines[i].text.length;
    var total = base;
    for (; i < lines.length; i++) total += lines[i].text.length;
    return { lines: lines, newRow: newRow, base: base, total: total, box: b };
  }
  function maxScroll(L) { return Math.max(0, L.lines.length - L.box.cap); }
  function charsBefore(L, row) { var n = 0; for (var i = 0; i < row; i++) n += L.lines[i].text.length; return n; }
  // While typing, the box follows the newest row (the production dialogue's rule).
  function follow(L) {
    var at = L.base + active.typed;
    var row = 0;
    for (var chars = 0; row < L.lines.length; row++) {
      chars += L.lines[row].text.length;
      if (chars >= at) break;
    }
    var top = active.scroll;
    while (row >= top + L.box.cap) top++;
    active.scroll = Math.min(top, maxScroll(L));
  }
  // Text shown at once (or a click to finish): its first row in view, or the end when it all fits
  // below that row (the production dialogue's finishTyping rule).
  function scrollToNew(L) {
    var max = maxScroll(L);
    active.scroll = L.newRow + L.box.cap > L.lines.length ? max : Math.min(L.newRow, max);
  }

  // Layers --------------------------------------------------------------------------------------
  var style = document.createElement('style');
  style.id = 'labNarrativeStyle';
  document.head.appendChild(style);
  function install() {
    var stage = document.getElementById('stage');
    var shell = document.getElementById('shell');
    // While a narrative state is on show the reception portrait and dialogue box are not.
    style.textContent = '#portrait, #speechText, #speechIndicator { visibility: hidden !important; }';
    if (!els.focusArt) {
      els.focusArt = document.createElement('div');
      els.focusArt.id = 'labFocusArt';
      els.focusArt.className = 'aperture art-aperture';
      els.focusArt.setAttribute('aria-hidden', 'true');
      els.focusCanvas = document.createElement('canvas');
      els.focusCanvas.id = 'labFocusPlaceholder';
      els.focusCanvas.className = 'sprite-abs';
      els.focusArt.appendChild(els.focusCanvas);
      els.layerA = document.createElement('div');
      els.layerA.id = 'labNarrativeA';
      els.layerA.className = 'layer';
      els.textA = document.createElement('canvas');
      els.textA.id = 'labFocusText';
      els.textA.className = 'sprite-abs';
      els.layerA.appendChild(els.textA);
      els.layerB = document.createElement('div');
      els.layerB.id = 'labNarrativeB';
      els.layerB.className = 'layer';
      els.textB = document.createElement('canvas');
      els.textB.id = 'labNarrationText';
      els.textB.className = 'sprite-abs';
      els.layerB.appendChild(els.textB);
      // The dialogue's own thumb style (game.css .speech-indicator), on its own element.
      els.thumb = document.createElement('div');
      els.thumb.id = 'labNarrationThumb';
      els.thumb.className = 'speech-indicator';
      els.layerB.appendChild(els.thumb);
      els.bounds = document.createElement('div');
      els.bounds.id = 'labNarrativeBounds';
      els.bounds.className = 'layer';
      [els.textA, els.textB].forEach(function (c) {
        // A click on the text finishes the typing (like a click on the dialogue box).
        c.style.pointerEvents = 'auto';
        c.style.cursor = 'pointer';
        c.addEventListener('click', function () { S.skip(); });
      });
      // The wheel scrolls the narration back and forth, a line at a time, like the dialogue box.
      els.textB.addEventListener('wheel', function (e) {
        e.preventDefault();
        S.scrollBy(Math.sign(e.deltaY));
      }, { passive: false });
    }
    var r = R.portraitAperture.rect;
    els.focusArt.style.cssText = 'left:' + r[0] + 'px;top:' + r[1] + 'px;width:' + r[2] + 'px;height:' + r[3] + 'px';
    // Order: ... portrait -> Focus A art -> SHELL -> Narrative B overlay + text -> Focus A text ->
    // (production) speech, choices, thumb, footer, tooltip, slip. So the shell frames the close-up,
    // the overlay sits on the shell, and the cards stay above both.
    // (Re)inserted only when a production rebuild (G.rebuildStage) has taken them out.
    if (els.focusArt.parentNode !== stage) stage.insertBefore(els.focusArt, shell);
    if (els.layerB.parentNode !== stage) shell.after(els.layerB);
    if (els.layerA.parentNode !== stage) els.layerB.after(els.layerA);
    if (els.bounds.parentNode !== stage) stage.appendChild(els.bounds);
  }
  function uninstall() {
    style.textContent = '';
    ['focusArt', 'layerA', 'layerB', 'bounds'].forEach(function (k) { if (els[k] && els[k].parentNode) els[k].parentNode.removeChild(els[k]); });
    delete document.body.dataset.narrMode;
  }

  function drawFocusArt(kind) {
    var c = els.focusCanvas;
    if (c.dataset.kind === kind) return;
    var r = R.portraitAperture.rect;
    // The production developer placeholder (hatched, DEV PLACEHOLDER), drawn at runtime: no file.
    G.placeholders.panel(c, r[2], r[3], 'FOCUS A: KEYPAD', ['LAB PLACEHOLDER.', 'NOT GAME ART.']);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // A plain schematic of the object, in the placeholder's greys, so the close-up reads as a keypad.
    var px = 364, py = 54, kw = 40, kh = 30, gap = 6;
    ctx.fillStyle = '#5b6366'; ctx.fillRect(px - 14, py - 40, 3 * kw + 2 * gap + 28, 4 * kh + 3 * gap + 54 + 14);
    ctx.fillStyle = '#2a2f31'; ctx.fillRect(px - 12, py - 38, 3 * kw + 2 * gap + 24, 4 * kh + 3 * gap + 50 + 14);
    ctx.fillStyle = '#1b2022'; ctx.fillRect(px, py - 30, 3 * kw + 2 * gap, 22);
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    keys.forEach(function (k, i) {
      var x = px + (i % 3) * (kw + gap);
      var y = py + Math.floor(i / 3) * (kh + gap);
      ctx.fillStyle = '#7c8588'; ctx.fillRect(x, y, kw, kh);
      ctx.fillStyle = '#4a5154'; ctx.fillRect(x, y + kh - 3, kw, 3);
      if (k === '*' || k === '#') return; // not in every baked face; left blank
      var lc = document.createElement('canvas');
      var s = T.label(lc, k, 'dark', 'labels');
      ctx.drawImage(lc, x + Math.floor((kw - s[0]) / 2), y + Math.floor((kh - 3 - s[1]) / 2) + 2);
    });
    c.dataset.kind = kind;
    c.style.left = '0px';
    c.style.top = '0px';
  }

  // Draws one surface. `typing` applies only to the surface the preview stands on.
  function drawSurface(mode) {
    var L = layout(mode);
    var b = L.box;
    var canvas = mode === 'A' ? els.textA : els.textB;
    var here = active.mode === mode;
    if (mode === 'B' && here) active.scroll = Math.min(active.scroll, maxScroll(L));
    var top = mode === 'B' && here ? active.scroll : 0;
    var shown = L.lines.slice(top, top + b.cap);
    var budget = here && active.typing ? Math.max(0, L.base + active.typed - charsBefore(L, top)) : undefined;
    paint(canvas, shown, b.lh, b.width, b.height, budget);
    canvas.style.left = b.x + 'px';
    canvas.style.top = b.y + 'px';
    canvas.style.width = b.width + 'px';
    canvas.style.height = b.height + 'px';
    if (mode === 'B') {
      // The thumb: shown only when there is more than fits and the typing has stopped.
      var max = here ? maxScroll(L) : 0;
      var rail = railB(b);
      var on = max > 0 && !active.typing && !active.fade;
      els.thumb.classList.toggle('on', on);
      var h = Math.min(rail.height, Math.max(12, Math.round((rail.height * b.cap) / (L.lines.length || 1))));
      var y = rail.y + (max ? Math.round(((rail.height - h) * active.scroll) / max) : 0);
      els.thumb.style.left = rail.x + 'px';
      els.thumb.style.top = y + 'px';
      els.thumb.style.width = rail.width + 'px';
      els.thumb.style.height = h + 'px';
    }
  }

  function render() {
    if (!active) return;
    install();
    var b = active.mode === 'B';
    var ov = overlayImg(V('surface.candidate'));
    if (els.overlay !== ov.img) {
      if (els.overlay && els.overlay.parentNode) els.overlay.parentNode.removeChild(els.overlay);
      els.layerB.insertBefore(ov.img, els.textB);
      els.overlay = ov.img;
    }
    els.layerB.style.display = b || active.fade ? '' : 'none';
    els.layerB.style.opacity = active.fade ? String(active.fade.opacity) : '';
    els.focusArt.style.display = b && !active.fade ? 'none' : '';
    els.layerA.style.display = b ? 'none' : '';
    if (!b || active.fade) drawFocusArt(NODES[active.focusNode || active.node].focus || 'keypad');
    if (b || active.fade) drawSurface('B');
    if (!b) drawSurface('A');
    var d = els.layerB.dataset;
    var info = S.info();
    Object.keys(info).forEach(function (k) { if (typeof info[k] !== 'object') d[k] = String(info[k]); });
    document.body.dataset.narrMode = active.mode;
    renderBounds();
  }
  function renderBounds() {
    els.bounds.textContent = '';
    els.bounds.style.display = showBounds ? '' : 'none';
    if (!showBounds) return;
    var add = function (r, color, title) {
      var d = document.createElement('div');
      d.className = 'lab-bound';
      d.title = title;
      d.style.cssText = 'position:absolute;box-sizing:border-box;pointer-events:none;border:1px solid ' + color + ';left:' + r[0] + 'px;top:' + r[1] + 'px;width:' + r[2] + 'px;height:' + r[3] + 'px';
      els.bounds.appendChild(d);
    };
    var bx = box(active.mode);
    var safe = active.mode === 'A' ? NS.SAFE_A : NS.SAFE_B;
    add([safe.left, safe.top, safe.right - safe.left, safe.bottom - safe.top], '#5ac8fa', 'safe surface');
    add([bx.x, bx.y, bx.width, bx.height], '#ff2d55', 'text box (' + bx.cap + ' lines)');
    if (active.mode === 'B') { var rl = railB(bx); add([rl.x, rl.y, rl.width, rl.height], '#ffcc00', 'scroll thumb rail'); }
  }

  // Sequences -----------------------------------------------------------------------------------
  // Types the newest text on (the production typing speed by default); 0 cps shows it at once.
  async function typeOn(ep) {
    var cps = loading() ? 0 : V('timing.revealCps');
    active.skip = false;
    if (cps > 0) {
      active.typing = true;
      active.typed = 0;
      var t0 = now();
      for (;;) {
        var L = layout(active.mode);
        var need = L.total - L.base;
        active.typed = Math.min(need, Math.floor(((now() - t0) * cps) / 1000));
        if (active.mode === 'B') follow(L);
        render();
        if (active.skip || active.typed >= need) break;
        await nextFrame();
        alive(ep);
      }
    }
    var shownAtOnce = !(cps > 0) || active.skip;
    active.typing = false;
    active.typed = Infinity;
    if (active.mode === 'B' && shownAtOnce) scrollToNew(layout('B'));
    render();
  }
  async function cardsGone(ep) {
    await untilTrue(function () { return !G.ui.motion || G.motionDone(now()); }, ep);
    G.ui.motion = null;
    G.setChoices([]);
  }
  async function showStep(ep) {
    setPhase('lab-narrative');
    await typeOn(ep);
    await waitMs(V('timing.choicesDelayMs'), ep);
    G.setChoices(choicesFor().map(function (c) { return { id: c.id, text: c.text }; }), { kind: 'in', start: now() });
    setPhase('lab-narrative-arriving');
    await untilTrue(function () { return !G.ui.motion || G.motionDone(now()); }, ep);
    G.ui.motion = null;
    G.ui.thumbOn = true;
    setPhase('choosing'); // the only phase in which a card is taken (and the cards can be tabbed to)
    G.renderChoices(now());
  }
  async function crossFade(from, to, ep) {
    var ms = loading() ? 0 : V('timing.transitionMs');
    active.focusNode = to === 'A' ? active.node : active.prevNode;
    if (ms > 0) {
      var t0 = now();
      active.fade = { opacity: from === 'B' ? 1 : 0 };
      for (;;) {
        var u = Math.min(1, (now() - t0) / ms);
        active.fade.opacity = from === 'B' ? 1 - u : u;
        render();
        if (u >= 1) break;
        await nextFrame();
        alive(ep);
      }
    }
    active.fade = null;
    active.focusNode = null;
  }
  async function go(nodeId, ep) {
    var from = active.mode;
    var to = NODES[nodeId].mode;
    active.prevNode = active.node;
    active.node = nodeId;
    active.mode = to;
    if (to === 'A') {
      active.pages = pagesOf(nodeId);
      active.page = 0;
      active.typing = true; // the description waits for the fade
      active.typed = 0;
    }
    if (from !== to) await crossFade(from, to, ep);
    if (to === 'B') beginB(nodeId);
    await showStep(ep);
  }

  // Public ---------------------------------------------------------------------------------------
  S.active = function () { return !!active; };
  S.values = function () { return Object.assign({}, vals); };
  S.info = function () {
    if (!active) return { active: false };
    var L = layout(active.mode);
    var b = L.box;
    var top = active.mode === 'B' ? Math.min(active.scroll, maxScroll(L)) : 0;
    var shown = L.lines.slice(top, top + b.cap).map(function (l) { return plain(l.text); });
    var all = L.lines.map(function (l) { return plain(l.text); });
    return {
      active: true, mode: active.mode, node: active.node, page: step(), pages: steps(), capacity: b.cap, lines: L.lines.length,
      scroll: top, maxScroll: active.mode === 'B' ? maxScroll(L) : 0, thumb: !!(els.thumb && els.thumb.classList.contains('on')),
      maxInk: Math.max.apply(null, [0].concat(L.lines.map(function (l) { return T.inkWidth(plain(l.text), b.role); }))), width: b.width,
      box: [b.x, b.y, b.width, b.height].join(','), revealed: !active.typing, text: shown.join('\n'), all: all.join('\n'),
      candidate: V('surface.candidate'), overlay: NS.OVERLAYS[V('surface.candidate')].path, continueOn: V('paging.continue'), marking: V('marking.style'),
      kinds: JSON.stringify(choicesFor().map(function (c) { return [c.id, c.kind]; })), taken: JSON.stringify(active.taken)
    };
  };
  S.pagesOf = function (nodeId) { return pagesOf(nodeId).map(function (p) { return p.map(plain); }); };
  S.beatsOf = function (nodeId) { return beatsFor(nodeId); };
  S.passage = function (id) { return passage(id).replace(/\{\{|\}\}/g, ''); };
  S.marked = function (text, style) { return plain(markRuns(parseRuns(text), style)); };
  S.scrollBy = function (n) {
    if (!active || active.mode !== 'B' || active.typing) return;
    var L = layout('B');
    active.scroll = Math.max(0, Math.min(maxScroll(L), active.scroll + n));
    render();
  };

  S.enter = async function (nodeId) {
    S.exit();
    var ep = ++epoch;
    await overlayImg(V('surface.candidate')).ready;
    if (ep !== epoch) return 'superseded';
    active = { node: nodeId, mode: NODES[nodeId].mode, taken: [], log: [], newFrom: 0, beats: [[]], beat: 0, pages: [[]], page: 0,
      scroll: 0, typing: false, typed: Infinity, fade: null };
    G.hideTooltip();
    G.ui.thumbOn = false;
    G.setChoices([]);
    if (active.mode === 'A') { active.pages = pagesOf(nodeId); } else beginB(nodeId);
    active.typing = true;
    active.typed = 0;
    render();
    try {
      await showStep(ep);
    } catch (e) {
      if (e.message !== 'narrative-superseded') throw e;
      return 'superseded';
    }
    return 'ok';
  };
  S.exit = function () {
    epoch++;
    if (!active) { uninstall(); return; }
    active = null;
    G.ui.motion = null;
    uninstall();
  };

  // Takes a card by id: CONTINUE adds the next group (or turns the page); an action or a spoken line
  // goes to its next node. An action leaves with the production slide-away (every card slides out;
  // nothing is "sent"); a spoken line uses the production send. Neither enters the transcript or the
  // dialogue history.
  S.take = async function (id, opts) {
    opts = opts || {};
    if (opts.wait) {
      var t0 = now();
      while (!(active && G.flow.phase === 'choosing' && active.node === opts.node && step() === opts.page)) {
        if (now() - t0 > 10000 || !active) return 'not at the same point';
        await nextFrame();
      }
    }
    if (!active || G.flow.phase !== 'choosing') return 'not at rest';
    var list = choicesFor();
    var i = list.findIndex(function (c) { return c.id === id; });
    if (i < 0) return 'not offered: ' + id;
    var ch = list[i];
    var ep = epoch;
    if (opts.user && window.parent && window.parent.NARRATIVE_LAB) {
      try { window.parent.NARRATIVE_LAB.echo(frameMode, id, active.node, step()); } catch (e) { /* lab page gone */ }
    }
    active.taken.push([id, ch.kind]);
    setPhase('lab-narrative');
    G.ui.thumbOn = false;
    var send = ch.kind === 'spoken';
    G.ui.motion = send ? { kind: 'send', index: i, start: now() } : { kind: 'clear', start: now() };
    G.renderChoices(now());
    try {
      await cardsGone(ep);
      if (ch.kind === 'continue') {
        if (active.mode === 'B') { active.beat++; appendBeat(); } else active.page++;
        await showStep(ep);
      } else {
        await go(ch.to, ep);
      }
    } catch (e) {
      if (e.message !== 'narrative-superseded') throw e;
      return 'superseded';
    }
    return 'ok';
  };
  S.skip = function () { if (active && active.typing && !active.fade) active.skip = true; };

  // Live values (LAB frame only): re-wrap where the preview stands; NB-8 / NB-9 re-mark the dialogue.
  S.applyValues = function (map) {
    if (frameMode !== 'lab') return 'invalid';
    var check = NS.validate(map);
    if (!check.ok) return 'invalid';
    var was = vals;
    vals = Object.assign(NS.defaults(), map);
    var marking = ['marking.style', 'marking.ink', 'marking.actionCards'].some(function (k) { return was[k] !== V(k); });
    if (talk && marking) markDialogue();
    if (!active) return 'live';
    if (marking) { G.rebuildStage(); if (lastToggles) LAB.setToggles(lastToggles); } // repaints the cards
    overlayImg(V('surface.candidate')).ready.then(function () {
      if (!active) return;
      if (active.mode === 'A') {
        active.pages = pagesOf(active.node);
        active.page = Math.min(active.page, active.pages.length - 1);
      } else {
        var beats = beatsFor(active.node);
        if (!active.log.length) {
          var paras = paragraphs(active.node);
          active.newFrom = 0;
          active.beat = Math.min(active.beat || 0, beats.length - 1);
          beats.slice(0, active.beat + 1).forEach(function (g) { g.forEach(function (k) { active.log.push(paras[k]); }); });
        }
        active.beats = beats;
        active.beat = Math.min(active.beat, beats.length - 1);
      }
      if (G.flow.phase === 'choosing') {
        var list = choicesFor().map(function (c) { return { id: c.id, text: c.text }; });
        if (list.map(function (c) { return c.text; }).join('|') !== G.ui.cards.map(function (c) { return c.text; }).join('|')) {
          G.setChoices(list);
          G.ui.thumbOn = true;
          G.renderChoices(now());
        }
      }
      render();
      document.body.dataset.narrApplied = String((Number(document.body.dataset.narrApplied) || 0) + 1);
    });
    return 'live';
  };

  // Talking vs action in the reception dialogue (states NB-8, NB-9) -----------------------------
  // The real conversation, through the production flow; each line of the history is re-marked with
  // the current style (style 1 is the production text itself). New lines are marked as they arrive.
  var talk = null; // { origs: [{ text, who }] } while NB-8 or NB-9 is on show
  function markOne(o) { return V('marking.style') === 1 ? o.text : markLine(o); }
  function markDialogue() {
    if (!talk) return;
    var parts = G.ui.speech.parts;
    parts.forEach(function (part, i) { if (talk.origs[i]) part.text = markOne(talk.origs[i]); });
    G.rebuildStage(); // rewraps the history where it stands
    if (lastToggles) LAB.setToggles(lastToggles);
    // Open where the history mixes the most: from the latest line with a stage direction.
    var last = -1;
    talk.origs.forEach(function (o, i) { if (o.who !== 'thought' && (o.text.indexOf('[') !== -1 || actionSays()[o.text])) last = i; });
    if (talk.from !== undefined) last = talk.from(talk.origs);
    var row = G.ui.speech.lines.findIndex(function (l) { return l.part === last; });
    G.setSpeechScroll(row < 0 ? G.speechMaxScroll() : Math.min(row, G.speechMaxScroll()));
    document.body.dataset.talkMarked = String(V('marking.style'));
  }
  var prodAdd = G.addSpeech;
  G.addSpeech = function (text, who) {
    if (!talk) return prodAdd.apply(this, arguments);
    var o = { text: who === 'thought' ? G.thoughtText(text) : text, who: who };
    talk.origs.push(o);
    if (V('marking.style') === 1) return prodAdd.call(this, text, who);
    var keep = G.thoughtText;
    G.thoughtText = function (t) { return t; }; // already marked: no parentheses added
    try { return prodAdd.call(this, markOne(o), who); } finally { G.thoughtText = keep; }
  };
  var prodClear = G.clearSpeech;
  G.clearSpeech = function () {
    if (talk) talk.origs = [];
    return prodClear.apply(this, arguments);
  };
  S.talkInfo = function () {
    return { on: !!talk, style: V('marking.style'), actionChoices: ACTION_CHOICES.filter(function (id) { return choiceText(id) !== null; }),
      parts: G.ui.speech.parts.map(function (p) {
        return { who: p.who, text: plain(p.text), marked: p.text.indexOf(MARK) !== -1, inked: p.text.split(' ').filter(function (w) { return w[0] === MARK; }).map(plain).join(' ') };
      }),
      origs: talk ? talk.origs.map(function (o) { return o.text; }) : [] };
  };

  // The lab's hooks: production stage rebuilds drop our layers (put them back); a state load ends
  // the preview; toggles; the reception-only triggers are refused here.
  LAB.on('beforeState', function () {
    S.exit();
    if (talk) {
      var origs = talk.origs;
      talk = null;
      G.ui.speech.parts.forEach(function (part, i) { if (origs[i]) part.text = origs[i].text; });
      delete document.body.dataset.talkMarked;
    }
  });
  LAB.on('afterRebuild', function () { if (active) render(); });
  LAB.on('toggles', function (t) { lastToggles = t; showBounds = !!t.boundsNarration; if (active) renderBounds(); });
  LAB.narrativeRefuses = function (kind) {
    if (!active && !talk) return null;
    if (kind === 'npc-typing' || kind === 'context-action') {
      return active ? 'not in a Narrative Study state: there is no receptionist conversation on show'
        : 'not in a Narrative Study state: its dialogue is re-marked for the talking vs action study';
    }
    return null;
  };

  // While a preview is on show the reception flow must not take its cards, open the inspector or run
  // a utility action; with no preview the production functions run untouched.
  var prodChoose = G.flow.choose;
  var prodToggle = G.flow.toggleInspect;
  var prodUtility = G.flow.utility;
  G.flow.choose = function (index) {
    if (!active) return prodChoose.apply(this, arguments);
    var card = G.ui.cards[index];
    if (card) S.take(card.id, { user: true });
  };
  G.flow.toggleInspect = function () {
    if (!active) return prodToggle.apply(this, arguments);
  };
  G.flow.utility = function () {
    if (!active) return prodUtility.apply(this, arguments);
  };

  // The study's states, in their own group of the lab's state list. Each is reached through the
  // adapter's own choices (as a player would click them), with the lab's fast timings.
  var N = 'Narrative Study (experimental preview, not the production game)';
  LAB.addStates(N, {
    'ns-b-short': { label: 'NB-1. Narrative B: short narration, three actions', run: async function () { await S.enter('hall'); } },
    'ns-b-long': { label: 'NB-2. Narrative B: longer narration (fits the panel)', run: async function () { await S.enter('hall-long'); } },
    'ns-b-continue': { label: 'NB-3. Narrative B: long passage, first part (CONTINUE only)', run: async function () { await S.enter('announce'); } },
    'ns-b-final': { label: 'NB-4. Narrative B: long passage, all of it (added on, scrolled; choices)', run: async function () {
      await S.enter('announce');
      while (step() < steps() - 1) await S.take('continue');
    } },
    'ns-a-keypad': { label: 'NA-1. Focus A: keypad close-up (from EXAMINE THE KEYPAD)', run: async function () { await S.enter('hall'); await S.take('examine-keypad'); } },
    'ns-bab': { label: 'NB-5. B -> A -> B interactive (start: hallway in B, click the cards)', run: async function () { await S.enter('hall'); } },
    'ns-b-return': { label: 'NB-6. Narrative B: back from A, the narration continues', run: async function () { await S.enter('hall'); await S.take('examine-keypad'); await S.take('stop'); } },
    'ns-spoken': { label: 'NB-7. Narrative B: action vs spoken choice comparison', run: async function () { await S.enter('spoken'); } },
    'ns-talk-dialogue': { label: 'NB-8. Talking vs action in the reception dialogue (real conversation, re-marked)', run: async function (h) {
      talk = { origs: G.ui.speech.parts.map(function (part) { return { text: part.text, who: part.who }; }) };
      markDialogue();
      await h.path(['ask-politely', 'correct', 'rule', 'sigh']);
      await h.settle();
      G.flow.utility('context'); // OBSERVE: the player's thought
      markDialogue();
    } },
    'ns-talk-door': { label: "NB-9. Talking vs action at the door: the player's action choices (GO TO, UNLOCK) and her drawer", run: async function (h) {
      talk = { origs: G.ui.speech.parts.map(function (part) { return { text: part.text, who: part.who }; }) };
      // Open on her drawer line, so the two actions and her replies follow it on screen.
      talk.from = function (origs) { var i = -1; origs.forEach(function (o, k) { if (o.who === 'npc' && o.text.indexOf('[SHE OPENS A DRAWER') !== -1) i = k; }); return i; };
      markDialogue();
      await h.path(['ask-politely', 'cooperate', 'standard-issue', 'confirm-unread', 'onward-blind', 'protest', 'to-door', 'unlock-after']);
      await h.settle();
      markDialogue();
    } },
    'ns-dialogue': { label: 'REF. Existing reception dialogue (unchanged, for comparison)', reception: true, run: async function (h) { await h.path(['ask-politely']); } }
  });
})();
