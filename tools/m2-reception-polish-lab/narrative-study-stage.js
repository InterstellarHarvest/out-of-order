// NARRATIVE STUDY: a lab-only presentation adapter inside a stage frame (docs/64-68), loaded after
// lab-stage.js. EXPERIMENTAL PREVIEW: the production game has no narrative mode, and nothing here is
// part of it. It never writes G.state, never reads browser storage, and never edits game/ files.
//
// It reuses the production stage it runs in: the canonical shell, the bitmap text routines
// (G.text.wrap / draw), the approved choice cards with their production arrive / slide-away / send
// motions (G.setChoices, G.ui.motion), the scrollbar thumb, and the labelled developer placeholder
// (G.placeholders.panel). It adds only:
//   - Narrative B: the review overlay (Candidate 1 or 2, a 1920x1080 RGBA layer over the shell) and
//     one narration canvas on it. The current passage REPLACES the previous one (no history); a long
//     passage is shown as natural-break pages, with a single CONTINUE card until the final page.
//   - Focus A: the normal shell (portrait aperture + speech panel), a runtime-drawn placeholder
//     close-up in the portrait aperture, and the description in the speech panel's text area.
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

  // Fixtures ----------------------------------------------------------------------------------
  // REPRESENTATIVE TEST TEXT ONLY: not story canon, not M2 content. Written in the game's upper-case
  // house style and in the plain ASCII every baked face covers.
  var LONG = {
    1: 'A NOTICE WAS PINNED BESIDE THE DOUBLE DOORS, TYPED ON THE BUILDING\'S OWN FORM. I READ IT BECAUSE THERE WAS NOTHING ELSE TO DO, AND BECAUSE THE FORM HAD BEEN STAMPED THREE TIMES, WHICH IN THIS BUILDING MEANS SOMEBODY EXPECTS IT TO BE READ.\n\n'
      + 'IT SAID THAT FROM TODAY ALL VISITORS ARE TO BE TREATED AS STAFF, AND ALL STAFF AS VISITORS, UNTIL THE MATTER OF WHO IS WHICH HAS BEEN SETTLED BY THE OFFICE CONCERNED. THE OFFICE CONCERNED IS NOT NAMED. A SPACE HAS BEEN LEFT FOR ITS NAME, AND THE SPACE HAS BEEN INITIALLED.\n\n'
      + 'BELOW THAT, IN SMALLER TYPE, IT EXPLAINED THAT ANY PERSON WHO BELIEVES THEY HAVE BEEN MISCLASSIFIED MAY APPLY FOR RECLASSIFICATION AT THE DESK, BETWEEN THE HOURS OF NINE AND NINE FIFTEEN, ON ANY DAY THE DESK IS STAFFED. THE DESK IS STAFFED BY VISITORS, AS OF TODAY.\n\n'
      + 'AT THE VERY BOTTOM SOMEONE HAD ADDED, BY HAND, THAT THE BATHROOM ON THIS FLOOR WAS FOR THE USE OF STAFF ONLY, AND THAT THIS RULE HAD NOT CHANGED. THE HANDWRITING WAS NEAT AND VERY SMALL, AS IF IT WERE EMBARRASSED TO BE THERE AT ALL.',
    2: 'THE NOTICE BESIDE THE DOUBLE DOORS RAN ON WITHOUT A SINGLE BREAK, AS IF WHOEVER TYPED IT WAS AFRAID THAT A PARAGRAPH WOULD BE TAKEN AS PERMISSION TO STOP READING. IT EXPLAINED THAT VISITORS WERE TO BE TREATED AS STAFF AND STAFF AS VISITORS UNTIL THE MATTER WAS SETTLED. IT EXPLAINED THAT THE MATTER WOULD BE SETTLED BY THE OFFICE CONCERNED, WHICH WAS NOT NAMED. IT EXPLAINED THAT A SPACE HAD BEEN LEFT FOR THE NAME AND THAT THE SPACE HAD BEEN INITIALLED, WHICH MADE IT OFFICIAL. IT EXPLAINED THAT ANY PERSON WHO BELIEVED THEY HAD BEEN MISCLASSIFIED MIGHT APPLY AT THE DESK BETWEEN NINE AND NINE FIFTEEN. IT EXPLAINED THAT THE DESK WAS NOW STAFFED BY VISITORS. IT EXPLAINED THAT VISITORS COULD NOT ACCEPT APPLICATIONS. IT EXPLAINED THAT THIS WAS NOT A CONTRADICTION BUT A PROCEDURE. IT EXPLAINED THAT THE PROCEDURE WAS UNDER REVIEW, AND THAT THE REVIEW WAS BEING CONDUCTED BY THE OFFICE CONCERNED. IT ENDED, AT LAST, WITH A REMINDER THAT THE BATHROOM ON THIS FLOOR WAS FOR STAFF ONLY, AND THAT THIS RULE HAD NOT CHANGED.',
    3: null // built below: the announcement, then two more long paragraphs, twice over
  };
  LONG[3] = LONG[1] + '\n\n'
    + 'A SECOND SHEET WAS PINNED UNDER THE FIRST. IT WAS A COPY OF THE FIRST, EXCEPT THAT EVERY INSTANCE OF THE WORD VISITOR HAS BEEN STRUCK THROUGH AND REPLACED WITH THE WORD APPLICANT, AND EVERY INSTANCE OF THE WORD STAFF HAS BEEN CIRCLED, AS IF SOMEBODY MEANT TO COME BACK TO IT LATER AND NEVER DID.\n\n'
    + 'A THIRD SHEET, UNDER THE SECOND, WAS BLANK EXCEPT FOR A STAMP IN THE TOP CORNER THAT READ RECEIVED, AND A SECOND STAMP BESIDE IT THAT READ NOT RECEIVED. BOTH STAMPS WERE DATED TODAY. BOTH WERE SIGNED IN THE SAME HAND, WHICH, I NOTICED WITH SOME DISCOMFORT, LOOKED A GREAT DEAL LIKE MY OWN.';

  var HALL_CHOICES = [
    { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
    { id: 'pull-lever', kind: 'action', text: 'PULL THE LEVER', to: 'lever' },
    { id: 'wait', kind: 'action', text: 'WAIT BY THE DESK', to: 'wait' }
  ];
  var NODES = {
    hall: { mode: 'B', choices: HALL_CHOICES,
      text: 'THE RECEPTIONIST WAS BUSY WITH A FORM AND DID NOT LOOK UP. THE DOUBLE DOORS BESIDE THE DESK STOOD SHUT, WITH A BRASS KEYPAD SET INTO THEIR FRAME. ABOVE IT, A LEVER MARKED CALL ATTENDANT WAITED IN ITS SLOT.' },
    'hall-long': { mode: 'B', choices: HALL_CHOICES,
      text: 'THE RECEPTIONIST HAD GONE BACK TO HER FORMS. SHE FILLED THEM IN WITH THE SLOW CARE OF SOMEONE WHO EXPECTED EACH ONE TO BE READ ALOUD AT HER RETIREMENT, AND SHE DID NOT LOOK UP WHEN I MOVED AWAY FROM THE DESK.\n\n'
        + 'A BRASS KEYPAD WAS SET INTO THE FRAME OF THE DOUBLE DOORS AT CHEST HEIGHT. ITS KEYS WERE WORN FLAT IN THE MIDDLE, WHERE THE SAME FEW NUMBERS HAD BEEN PRESSED FOR YEARS. ABOVE IT, A LEVER MARKED CALL ATTENDANT WAITED IN ITS SLOT, PAINTED THE SAME GREEN AS EVERYTHING ELSE THAT NOBODY WAS MEANT TO TOUCH.\n\n'
        + 'SOMEWHERE IN THE WALL, A PNEUMATIC TUBE THUMPED ONCE AND WENT QUIET.' },
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
    ], text: 'THE KEYS WENT DOWN ONE BY ONE WITH A DRY CLICK. A SLOT UNDER THE PLATE PRINTED A SMALL RECEIPT: ATTEMPT RECORDED. PLEASE WAIT TO BE CONTACTED.' },
    'hall-return': { mode: 'B', choices: HALL_CHOICES,
      text: 'I STEPPED BACK FROM THE DOORS. THE KEYPAD WENT ON GLOWING FAINTLY, AS IF IT HAD MADE A NOTE OF ME. SOMEWHERE BEHIND THE DESK A TUBE THUMPED, ONCE.' },
    'hall-after-try': { mode: 'B', choices: HALL_CHOICES,
      text: 'I STEPPED BACK. THE RECEIPT HUNG FROM ITS SLOT AND CURLED SLOWLY IN THE DRAUGHT FROM THE DOORS. NOBODY CAME TO CONTACT ME.' },
    lever: { mode: 'B', choices: [HALL_CHOICES[0], HALL_CHOICES[2]],
      text: 'THE LEVER WENT DOWN WITH A HEAVY CLUNK AND DID NOT COME BACK UP. NOTHING ELSE HAPPENED. THEN, FAR AWAY, A BELL RANG TWICE.' },
    wait: { mode: 'B', choices: [HALL_CHOICES[0], HALL_CHOICES[1]],
      text: 'I WAITED. THE CLOCK ABOVE THE DESK MOVED ONE MINUTE FORWARD AND THEN SEEMED TO THINK BETTER OF IT.' },
    // Spoken vs action (docs/64): the same approved cards; the difference is semantic and behavioural.
    spoken: { mode: 'B', choices: [
      { id: 'examine-keypad', kind: 'action', text: 'EXAMINE THE KEYPAD', to: 'keypad' },
      { id: 'call-out', kind: 'spoken', text: 'HELLO? IS ANYONE BACK THERE?', to: 'called-out' },
      { id: 'knock', kind: 'action', text: 'KNOCK ON THE DOUBLE DOORS', to: 'knocked' }
    ], text: 'THE LOBBY WAS QUIET. SOMEWHERE BEHIND THE DOUBLE DOORS, A CHAIR SCRAPED ACROSS A TILED FLOOR.' },
    'called-out': { mode: 'B', choices: HALL_CHOICES,
      text: 'I CALLED OUT. MY VOICE CAME BACK OFF THE TILES. THE CHAIR STOPPED SCRAPING, AND DID NOT START AGAIN.' },
    knocked: { mode: 'B', choices: HALL_CHOICES,
      text: 'I KNOCKED TWICE. THE DOORS ABSORBED IT, THE WAY DOORS IN THIS BUILDING ABSORB MOST THINGS.' }
  };
  S.NODES = NODES;
  function passage(id) { return NODES[id].long ? LONG[V('paging.fixture')] : NODES[id].text; }

  // Pagination ----------------------------------------------------------------------------------
  // Pages are arrays of wrapped lines, paragraphs separated by one blank line. A page never starts
  // with a blank line, never holds more lines than `cap`, and no word is lost or reordered.
  // breakAt 1: whole paragraphs; a paragraph that does not fit an empty page flows by sentences.
  //         2: sentences (pages fill further). 3: lines (pages fill completely).
  // A sentence longer than a whole page falls back to lines.
  function sentences(para) {
    return para.match(/[^.!?]+[.!?]+['")]*(\s+|$)|[^.!?]+$/g).map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function paginate(text, role, width, cap, breakAt) {
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
      if (breakAt === 3) {
        if (cur.length && room() <= 0) flush();
        byLines(lines, false);
        return;
      }
      if (breakAt === 1 && lines.length <= cap) {
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
  // A page holds `cap` lines: the box runs from the first line's top to the last line's glyph
  // bottom ((cap - 1) line pitches + the face's own height), never past the safe bottom.
  function boxB() {
    var lh = V('text.lineHeight');
    var faceH = T.lineHeight(faceRole());
    var avail = NS.SAFE_B.bottom - V('text.bottomMargin') - V('text.y');
    var cap = Math.max(1, Math.floor((avail - faceH) / lh) + 1);
    if (V('paging.maxLines') > 0) cap = Math.min(cap, V('paging.maxLines'));
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
  var active = null; // { node, page, pages, mode, taken: [], revealN, revealing, skip, fade }
  var epoch = 0;
  var els = {};
  var showBounds = false;
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

  function choicesFor() {
    var n = NODES[active.node];
    if (active.page < active.pages.length - 1) return [{ id: 'continue', kind: 'continue', text: 'CONTINUE' }];
    return n.choices.map(function (c) {
      var text = c.kind === 'spoken' && V('choices.spokenQuotes') === 2 ? '"' + c.text + '"' : c.text;
      return { id: c.id, kind: c.kind, text: text, to: c.to };
    });
  }
  function repaginate() {
    var b = box(active.mode);
    active.pages = paginate(passage(active.node), b.role, b.width, b.cap, active.mode === 'A' ? 1 : V('paging.breakAt'));
    active.page = Math.min(active.page, active.pages.length - 1);
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
      els.bounds = document.createElement('div');
      els.bounds.id = 'labNarrativeBounds';
      els.bounds.className = 'layer';
      [els.textA, els.textB].forEach(function (c) {
        // A click on the text finishes the reveal (like a click on the dialogue box).
        c.style.pointerEvents = 'auto';
        c.style.cursor = 'pointer';
        c.addEventListener('click', function () { S.skip(); });
      });
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

  function drawText(budget) {
    var b = box(active.mode);
    var canvas = active.mode === 'A' ? els.textA : els.textB;
    var lines = active.pages[active.page];
    var role = b.role;
    T.draw(canvas, lines.map(function (t) { return { text: t, role: role }; }), 'dark', b.lh, b.width, b.height, budget, role);
    canvas.style.left = b.x + 'px';
    canvas.style.top = b.y + 'px';
    canvas.style.width = b.width + 'px';
    canvas.style.height = b.height + 'px';
    var total = lines.join('').length;
    active.revealN = budget === undefined ? total : Math.min(total, budget);
    var d = els.layerB.dataset;
    var info = S.info();
    Object.keys(info).forEach(function (k) { if (typeof info[k] !== 'object') d[k] = String(info[k]); });
    document.body.dataset.narrMode = active.mode;
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
    els.textB.style.display = b ? '' : 'none';
    if (!b || active.fade) drawFocusArt(NODES[active.focusNode || active.node].focus || 'keypad');
    drawText(active.revealing ? active.revealN : undefined);
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
  }

  // Sequences -----------------------------------------------------------------------------------
  async function reveal(ep) {
    var cps = loading() ? 0 : V('timing.revealCps');
    var total = active.pages[active.page].join('').length;
    active.skip = false;
    if (!cps) { active.revealing = false; render(); return; }
    active.revealing = true;
    var t0 = now();
    for (;;) {
      var n = Math.floor(((now() - t0) * cps) / 1000);
      if (active.skip || n >= total) break;
      active.revealN = n;
      render();
      await nextFrame();
      alive(ep);
    }
    active.revealing = false;
    render();
  }
  async function cardsGone(ep) {
    await untilTrue(function () { return !G.ui.motion || G.motionDone(now()); }, ep);
    G.ui.motion = null;
    G.setChoices([]);
  }
  async function showPage(ep) {
    setPhase('lab-narrative');
    await reveal(ep);
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
      active.revealing = true; // the new mode's text waits for the fade
      active.revealN = 0;
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
    active.prevNode = active.node;
    active.node = nodeId;
    active.page = 0;
    active.mode = NODES[nodeId].mode;
    repaginate();
    if (from !== active.mode) {
      // The text of the mode being left is gone before the fade (a fresh passage follows).
      active.revealing = true;
      active.revealN = 0;
      await crossFade(from, active.mode, ep);
    }
    await showPage(ep);
  }

  // Public ---------------------------------------------------------------------------------------
  S.active = function () { return !!active; };
  S.values = function () { return Object.assign({}, vals); };
  S.info = function () {
    if (!active) return { active: false };
    var b = box(active.mode);
    var lines = active.pages[active.page];
    return {
      active: true, mode: active.mode, node: active.node, page: active.page, pages: active.pages.length, capacity: b.cap,
      lines: lines.length, maxInk: Math.max.apply(null, lines.map(function (l) { return T.inkWidth(l, b.role); })), width: b.width,
      box: [b.x, b.y, b.width, b.height].join(','), revealed: !active.revealing, text: lines.join('\n'),
      candidate: V('surface.candidate'), overlay: NS.OVERLAYS[V('surface.candidate')].path,
      kinds: JSON.stringify(choicesFor().map(function (c) { return [c.id, c.kind]; })), taken: JSON.stringify(active.taken)
    };
  };
  S.pagesOf = function (nodeId, mode) {
    var b = box(mode || NODES[nodeId].mode);
    return paginate(passage(nodeId), b.role, b.width, b.cap, (mode || NODES[nodeId].mode) === 'A' ? 1 : V('paging.breakAt'));
  };
  S.passage = passage;

  S.enter = async function (nodeId) {
    S.exit();
    var ep = ++epoch;
    await overlayImg(V('surface.candidate')).ready;
    if (ep !== epoch) return 'superseded';
    active = { node: nodeId, page: 0, mode: NODES[nodeId].mode, taken: [], revealN: 0, revealing: false, fade: null };
    G.hideTooltip();
    G.ui.thumbOn = false;
    G.setChoices([]);
    repaginate();
    render();
    try {
      await showPage(ep);
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

  // Takes a card by id: CONTINUE turns the page; an action or a spoken line goes to its next node.
  // An action leaves with the production slide-away (every card slides out; nothing is "sent"); a
  // spoken line uses the production send. Neither enters the transcript or the dialogue history.
  S.take = async function (id, opts) {
    opts = opts || {};
    if (opts.wait) {
      var t0 = now();
      while (!(active && G.flow.phase === 'choosing' && active.node === opts.node && active.page === opts.page)) {
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
      try { window.parent.NARRATIVE_LAB.echo(frameMode, id, active.node, active.page); } catch (e) { /* lab page gone */ }
    }
    active.taken.push([id, ch.kind]);
    setPhase('lab-narrative');
    G.ui.thumbOn = false;
    var send = ch.kind === 'spoken' || (ch.kind === 'action' && V('choices.actionMotion') === 2);
    G.ui.motion = send ? { kind: 'send', index: i, start: now() } : { kind: 'clear', start: now() };
    G.renderChoices(now());
    try {
      await cardsGone(ep);
      if (ch.kind === 'continue') {
        active.page++;
        await showPage(ep);
      } else {
        await go(ch.to, ep);
      }
    } catch (e) {
      if (e.message !== 'narrative-superseded') throw e;
      return 'superseded';
    }
    return 'ok';
  };
  S.skip = function () { if (active && active.revealing && !active.fade) active.skip = true; };

  // Live values (LAB frame only): re-wrap and re-paginate where the preview stands.
  S.applyValues = function (map) {
    if (frameMode !== 'lab') return 'invalid';
    var check = NS.validate(map);
    if (!check.ok) return 'invalid';
    vals = Object.assign(NS.defaults(), map);
    if (!active) return 'live';
    overlayImg(V('surface.candidate')).ready.then(function () {
      if (!active) return;
      repaginate();
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

  // The lab's hooks: production stage rebuilds drop our layers (put them back); a state load ends
  // the preview; toggles; the reception-only triggers are refused here.
  LAB.on('beforeState', function () { S.exit(); });
  LAB.on('afterRebuild', function () { if (active) render(); });
  LAB.on('toggles', function (t) { showBounds = !!t.boundsNarration; if (active) renderBounds(); });
  LAB.narrativeRefuses = function (kind) {
    if (!active) return null;
    if (kind === 'npc-typing' || kind === 'context-action') return 'not in a Narrative Study state: there is no receptionist conversation on show';
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
    'ns-b-long': { label: 'NB-2. Narrative B: longer narration (one page)', run: async function () { await S.enter('hall-long'); } },
    'ns-b-continue': { label: 'NB-3. Narrative B: overflowing passage, page 1 (CONTINUE only)', run: async function () { await S.enter('announce'); } },
    'ns-b-final': { label: 'NB-4. Narrative B: overflowing passage, final page (choices)', run: async function () {
      await S.enter('announce');
      while (active.page < active.pages.length - 1) await S.take('continue');
    } },
    'ns-a-keypad': { label: 'NA-1. Focus A: keypad close-up (from EXAMINE THE KEYPAD)', run: async function () { await S.enter('hall'); await S.take('examine-keypad'); } },
    'ns-bab': { label: 'NB-5. B -> A -> B interactive (start: hallway in B, click the cards)', run: async function () { await S.enter('hall'); } },
    'ns-b-return': { label: 'NB-6. Narrative B: fresh passage after returning from A', run: async function () { await S.enter('hall'); await S.take('examine-keypad'); await S.take('stop'); } },
    'ns-spoken': { label: 'NB-7. Narrative B: action vs spoken choice comparison', run: async function () { await S.enter('spoken'); } },
    'ns-dialogue': { label: 'REF. Existing reception dialogue (unchanged, for comparison)', reception: true, run: async function (h) { await h.path(['ask-politely']); } }
  });
})();
