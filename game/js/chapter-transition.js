// FORM 27B-6 / REGISTER OF PROGRESS: the owner-selected chapter transition (game issue #27, game docs/107).
//
// PORTED from the approved implementation source, review/chapter-transitions-lab-v01
// tools/chapter-transitions-lab/print/print.js (archive commit ae63c2c, README "Locked tuning defaults").
// The artwork (art/ui/chapter_transition/*.png, byte-exact), the layering, the motion math, the phase
// timing, the 5x7 bitmap face, the scribble paths and the selected options are the lab's own: background
// "Scene art -> Next scene", treatment "Blur, dim, cross-dissolve", exit "Reverse feed + fade", printer lip
// "Thick on bottom", paperY -5, feedDepth 5. Every change for the engine is marked ADAPTED below and
// listed in docs/107 for the owner's approval:
//   - the lab's 1024-wide preview becomes the 1920x1080 stage: absolute pixel offsets tuned at 1024 wide
//     scale by stage width / 1024 (the lab already scales paperY / feedDepth that way);
//   - backdrops: the outgoing frame is the game's real frame, frozen (G.captureStage); the incoming one is
//     the next chapter's real first frame, frozen the same way; Menu -> Prologue uses the approved menu
//     painting, exactly as the lab's review backdrop;
//   - rows come from the canonical chapter titles of the chapters actually encountered (owner ruling
//     2026-11-26: a trailing [..] storyboard note is not printed; characters the face lacks, e.g. the comma,
//     are omitted);
//   - a fifth or later chapter is typed on an exact second copy of the sheet joined below the first
//     (owner ruling 2026-11-26), with the lab's box geometry repeated per sheet;
//   - the lab's two-line title layout is chosen when the title does not fit the one-line box (the lab
//     used a 30-character rule that matched its demo titles; same result for them);
//   - the review chrome (scenario/tuning controls, matte labels, test marks, status text) is not ported;
//   - Skip (Space, Enter, Escape, click) completes it at once; completion is idempotent.
// Presentation only: it never steps the rules, saves or changes game state. The flow decides when it plays.
(function () {
  'use strict';
  var G = window.CYOA_GAME;
  var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
  var ease = function (v) { return 1 - Math.pow(1 - clamp(v), 3); };
  var lerp = function (a, b, p) { return a + (b - a) * p; };
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Measured against the alpha-isolated 1024x1536 paper sprite (lab).
  var art = { width: 1024, height: 1536, top: [394, 565, 735, 906], rowHeight: 124 };
  var BOXES = art.top.length;
  var steps = ['prep', 'slot', 'feed', 'strike', 'strikePause', 'advance', 'type', 'hold', 'exit'];
  // README "Locked tuning defaults" (9.68 s for a non-new-game handoff).
  var defaultDurations = { prep: 0.18, slot: 0.70, feed: 0.70, strike: 0.60, strikePause: 0.75, advance: 1.20, type: 1.20, hold: 2.85, exit: 1.50 };
  var paperTuning = { paperY: -5, feedDepth: 5 };
  var PAPER = 'art/ui/chapter_transition/form-27b6-blank-v01.png';
  var PRINTER = 'art/ui/chapter_transition/printer-slot-v01.png';
  var MENU = 'art/ui/main_menu/entrance_plaza.png';

  // Authored 5x7 bitmap glyphs (lab, verbatim).
  var glyphSource = {
    A: '01110/10001/10001/11111/10001/10001/10001', B: '11110/10001/10001/11110/10001/10001/11110',
    C: '01111/10000/10000/10000/10000/10000/01111', D: '11110/10001/10001/10001/10001/10001/11110',
    E: '11111/10000/10000/11110/10000/10000/11111', F: '11111/10000/10000/11110/10000/10000/10000',
    G: '01111/10000/10000/10111/10001/10001/01111', H: '10001/10001/10001/11111/10001/10001/10001',
    I: '11111/00100/00100/00100/00100/00100/11111', J: '00111/00010/00010/00010/10010/10010/01100',
    K: '10001/10010/10100/11000/10100/10010/10001', L: '10000/10000/10000/10000/10000/10000/11111',
    M: '10001/11011/10101/10101/10001/10001/10001', N: '10001/11001/10101/10011/10001/10001/10001',
    O: '01110/10001/10001/10001/10001/10001/01110', P: '11110/10001/10001/11110/10000/10000/10000',
    Q: '01110/10001/10001/10001/10101/10010/01101', R: '11110/10001/10001/11110/10100/10010/10001',
    S: '01111/10000/10000/01110/00001/00001/11110', T: '11111/00100/00100/00100/00100/00100/00100',
    U: '10001/10001/10001/10001/10001/10001/01110', V: '10001/10001/10001/10001/10001/01010/00100',
    W: '10001/10001/10001/10101/10101/10101/01010', X: '10001/10001/01010/00100/01010/10001/10001',
    Y: '10001/10001/01010/00100/00100/00100/00100', Z: '11111/00001/00010/00100/01000/10000/11111',
    0: '01110/10001/10011/10101/11001/10001/01110', 1: '00100/01100/00100/00100/00100/00100/01110',
    2: '01110/10001/00001/00010/00100/01000/11111', 3: '11110/00001/00001/01110/00001/00001/11110',
    4: '00010/00110/01010/10010/11111/00010/00010', 5: '11111/10000/10000/11110/00001/00001/11110',
    6: '01110/10000/10000/11110/10001/10001/01110', 7: '11111/00001/00010/00100/01000/01000/01000',
    8: '01110/10001/10001/01110/10001/10001/01110', 9: '01110/10001/10001/01111/00001/00001/01110',
    "'": '10/10/01/00/00/00/00', '-': '00000/00000/00000/11111/00000/00000/00000',
    '—': '0000000/0000000/0000000/1111111/0000000/0000000/0000000', '?': '01110/10001/00001/00010/00100/00000/00100'
  };
  var glyphs = {};
  Object.keys(glyphSource).forEach(function (k) { glyphs[k] = glyphSource[k].split('/'); });
  function advanceFor(ch) { if (ch === ' ') return 3; return (glyphs[ch] || glyphs['?'])[0].length + 1; }
  function bitmapTextWidth(v) { return Array.from(v).reduce(function (s, ch) { return s + advanceFor(ch); }, 0); }

  // ADAPTED: canonical titles. Owner rulings 2026-11-26: a trailing [..] note is a storyboard annotation,
  // not title text; a character the face cannot draw is omitted (the comma), never invented.
  function printable(title) {
    var t = String(title).replace(/\s*\[[^\]]*\]\s*$/, '').toUpperCase();
    return Array.from(t).filter(function (ch) { return ch === ' ' || !!glyphs[ch]; }).join('').replace(/ {2,}/g, ' ').trim();
  }
  // ADAPTED: the lab's layout switch (title.length > 30) as the measurement it stood for.
  function isLong(title) { return bitmapTextWidth(title) > 103 - 2; }

  function random(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function strokePath(itemIndex, pass, long) {
    var rng = random(419 + itemIndex * 127 + pass * 1319);
    var line = long ? Math.floor(pass / 2) : 0;
    var overdraw = pass % 2;
    var baseline = long ? (line === 0 ? 28 : 71) : 51;
    var origin = baseline + (overdraw ? 6 : -4);
    var pts = [];
    for (var x = 4; x < 645; x += 15) {
      var tilt = (overdraw ? -5 : 5) * x / 645;
      pts.push([x, origin + tilt + (rng() - 0.5) * 17]);
    }
    pts.push([645, origin + (overdraw ? -5 : 5) + (rng() - 0.5) * 10]);
    return 'M ' + pts.map(function (p) { return p.map(function (n) { return n.toFixed(1); }).join(' '); }).join(' L ');
  }
  function pixelCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.setAttribute('aria-hidden', 'true');
    return c;
  }
  function makeBitmapLayout(canvas, fullText, maxLines) {
    var ctx = canvas.getContext('2d');
    var words = fullText.toUpperCase().split(/\s+/);
    var lines = [''];
    words.forEach(function (word) {
      var last = lines.length - 1;
      var candidate = lines[last] ? lines[last] + ' ' + word : word;
      if (lines[last] && bitmapTextWidth(candidate) > canvas.width - 2) lines.push(word);
      else lines[last] = candidate;
    });
    if (lines.length > maxLines || lines.some(function (l) { return bitmapTextWidth(l) > canvas.width - 2; })) console.warn('Printer title exceeds its pixel grid:', fullText);
    return { canvas: canvas, ctx: ctx, lines: lines, lineHeight: 9 };
  }
  function stampBitmap(layout, visibleChars, showCursor) {
    var ctx = layout.ctx, canvas = layout.canvas, lines = layout.lines, lineHeight = layout.lineHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#34312f';
    var remaining = visibleChars, caretX = 1, caretY = 0;
    var firstY = Math.floor((canvas.height - (lines.length - 1) * lineHeight - 7) / 2);
    lines.forEach(function (line, i) {
      var count = Math.min(line.length, Math.max(0, remaining));
      var piece = line.slice(0, count);
      var y = firstY + i * lineHeight;
      var x = 1;
      Array.from(piece).forEach(function (ch) {
        var pattern = glyphs[ch];
        if (pattern) pattern.forEach(function (bits, cy) { for (var cx = 0; cx < bits.length; cx++) if (bits[cx] === '1') ctx.fillRect(x + cx, y + cy, 1, 1); });
        x += advanceFor(ch);
      });
      if (remaining >= 0 && remaining <= line.length) { caretX = x + 1; caretY = y; }
      remaining -= line.length + 1;
    });
    if (showCursor) ctx.fillRect(Math.min(canvas.width - 2, caretX), caretY, 1, 7);
  }

  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  var cur = null; // the transition on show

  // play({ rows: [{ number, title }], scenario, from: canvas | 'menu', next: () => Promise<canvas>, onDone })
  //   rows      every encountered chapter in arrival order, the incoming one last (index = scenario)
  //   scenario  0 = Menu -> Prologue (no cross-out, pause or box advance), else the incoming row's index
  function play(opts) {
    if (cur) cur.finish(true);
    var stageEl = document.getElementById('stage');
    var root = el('div', 'print-transition stage');
    root.id = 'printTransition';
    root.tabIndex = 0;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-label', 'Register of progress. Press Space, Enter or Escape to skip.');
    var scenario = opts.scenario;
    var rowsData = opts.rows.map(function (r) { var t = printable(r.title); return { number: r.number, title: t, long: isLong(t) }; });
    var durations = Object.assign({}, defaultDurations);
    var plan = (function () {
      var time = 0, points = {};
      steps.forEach(function (key) {
        var d = (scenario === 0 && (key === 'strike' || key === 'strikePause' || key === 'advance')) ? 0 : durations[key];
        points[key] = { start: time, end: time + d, duration: d };
        time += d;
      });
      return { points: points, total: time };
    })();
    var part = function (t, key) { var it = plan.points[key]; return it.duration === 0 ? 1 : clamp((t - it.start) / it.duration); };

    // Layers, in the lab's order: old matte (1), next matte (2), black veil (3), printer (5), paper (6),
    // printer front lip (7).
    var oldMatte = el('div', 'matte matte-old');
    var oldScene = el('div', 'background-scene scene-current');
    if (opts.from === 'menu') oldScene.classList.add('scene-menu');
    else if (opts.from) { oldScene.appendChild(opts.from); opts.from.className = 'frame'; }
    oldMatte.appendChild(oldScene);
    var nextMatte = el('div', 'matte matte-next');
    var nextScene = el('div', 'background-scene scene-future');
    nextMatte.appendChild(nextScene);
    var veil = el('div', 'black-veil');
    var viewport = el('div', 'paper-viewport');
    var sheet = el('div', 'paper-sheet');
    // ADAPTED: one sheet holds four boxes; a fifth or later chapter is on an exact second copy below.
    var sheets = Math.max(1, Math.ceil(rowsData.length / BOXES));
    var sheetEls = [];
    for (var si = 0; si < sheets; si++) {
      var sh = el('div', 'paper-page');
      var img = el('img', 'paper-art');
      img.src = G.url(PAPER); img.alt = '';
      var entries = el('div', 'paper-entries');
      sh.appendChild(img); sh.appendChild(entries);
      sheet.appendChild(sh);
      sheetEls.push(entries);
    }
    sheet.style.aspectRatio = '2 / ' + (3 * sheets);
    viewport.appendChild(sheet);
    function printerEl() { var p = el('div', 'printer flipped'); var i = el('img'); i.src = G.url(PRINTER); i.alt = ''; p.appendChild(i); return p; }
    var printer = printerEl();
    var front = el('div', 'printer-front-overlay');
    var frontPrinter = printerEl();
    front.appendChild(frontPrinter);
    [oldMatte, nextMatte, veil, viewport, printer, front].forEach(function (x) { x.setAttribute('aria-hidden', x === viewport ? 'false' : 'true'); root.appendChild(x); });
    root.classList.add('scenic');

    var rows = rowsData.map(function (item, i) {
      var row = el('div', 'paper-entry' + (item.long ? ' long' : ''));
      row.style.top = (art.top[i % BOXES] / art.height * 100).toFixed(5) + '%';
      var no = el('span', 'paper-no');
      var title = el('span', 'paper-title');
      var noCanvas = pixelCanvas(15, 11);
      var titleCanvas = pixelCanvas(item.long ? 148 : 103, item.long ? 23 : 11);
      var noLabel = el('span', 'visually-hidden'), titleLabel = el('span', 'visually-hidden');
      no.appendChild(noCanvas); no.appendChild(noLabel); title.appendChild(titleCanvas); title.appendChild(titleLabel);
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'paper-scribble'); svg.setAttribute('viewBox', '0 0 650 100'); svg.setAttribute('aria-hidden', 'true');
      var strokes = [];
      for (var pass = 0; pass < (item.long ? 4 : 2); pass++) {
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', strokePath(i, pass, item.long));
        svg.appendChild(path); strokes.push(path);
      }
      row.appendChild(no); row.appendChild(title); row.appendChild(svg);
      sheetEls[Math.floor(i / BOXES)].appendChild(row);
      return { noLabel: noLabel, titleLabel: titleLabel, noArt: makeBitmapLayout(noCanvas, item.number, 1), titleArt: makeBitmapLayout(titleCanvas, item.title, item.long ? 2 : 1), strokes: strokes };
    });
    stageEl.appendChild(root);
    var lengths = rows.map(function (row) { return row.strokes.map(function (p) { var len = p.getTotalLength(); p.style.strokeDasharray = String(len); return len; }); });

    function positionFor(index, w, mouthY, k) {
      var paperWidth = w * 0.59;
      var sheetHeight = paperWidth * art.height / art.width;
      var page = Math.floor(index / BOXES), box = index % BOXES;
      var rowCenter = (page * art.height + art.top[box] + art.rowHeight / 2) / art.height * sheetHeight;
      var rowHeight = art.rowHeight / art.height * sheetHeight;
      return mouthY - rowHeight / 2 - 7 * k - rowCenter;
    }
    function drawInk(t) {
      var typed = part(t, 'type');
      var crossed = part(t, 'strike');
      rows.forEach(function (row, i) {
        var item = rowsData[i];
        var count = 0;
        if (i < scenario) count = item.title.length + 3;
        else if (i === scenario && t >= plan.points.type.start) count = Math.floor((item.title.length + 3) * typed);
        var numberText = count >= 2 ? item.number : count === 1 ? item.number[0] : '';
        var titleCount = Math.max(0, count - 3);
        row.noLabel.textContent = numberText; row.titleLabel.textContent = item.title.slice(0, titleCount);
        stampBitmap(row.noArt, numberText.length);
        stampBitmap(row.titleArt, titleCount, i === scenario && typed > 0 && typed < 1);
        var inkProgress = i < scenario - 1 ? 1 : i === scenario - 1 ? crossed : 0;
        row.strokes.forEach(function (p, pass) {
          var start = pass / (row.strokes.length - 1) * 0.38;
          var amount = clamp((inkProgress - start) / (1 - start));
          p.style.strokeDashoffset = String(lengths[i][pass] * (1 - (reduced ? (amount >= 1 ? 1 : 0) : amount)));
        });
      });
    }
    function drawBackdrop(t, k) {
      oldMatte.style.backgroundColor = '#233a3c';
      nextMatte.style.backgroundColor = '#2e4c55';
      var incoming = clamp(t / (plan.points.feed.end || 1));
      var leaving = part(t, 'exit');
      var nextVisible = t < plan.points.exit.start ? 0 : ease(leaving);
      nextMatte.style.opacity = String(nextVisible);
      oldMatte.style.filter = 'blur(' + (incoming * 3.5 * (1 - leaving) * k).toFixed(2) + 'px)';
      nextMatte.style.filter = 'blur(' + ((1 - leaving) * 2.1 * k).toFixed(2) + 'px)';
      var v = (t < plan.points.exit.start ? incoming : 1 - leaving) * 0.65; // treatment: dim
      veil.style.opacity = String(v);
    }
    var elapsed = 0, last = 0, frame = null, done = false, nextReady = null, nextLoaded = false;
    function render() {
      var t = Math.max(0, Math.min(elapsed / 1000, plan.total));
      var w = 1920, h = 1080; // ADAPTED: the stage's own logical size (its fit-to-window transform scales it)
      var k = w / 1024; // ADAPTED: lab pixel constants were tuned on a 1024-wide frame
      var slotRestY = h * 0.925;
      var mouthY = slotRestY + 17 * k;
      var frontLipStart = 33 * k; // lip: lower (thick on bottom)
      var paperY = paperTuning.paperY * w / 1024;
      var priorTop = positionFor(scenario ? scenario - 1 : 0, w, mouthY, k) + paperY;
      var newTop = positionFor(scenario, w, mouthY, k) + paperY;
      var entrance = mouthY + 15 * k + paperY;
      var p = plan.points;
      var slotIn = reduced ? Number(part(t, 'slot') >= 1) : ease(part(t, 'slot'));
      var exitP = t >= p.exit.start ? (reduced ? Number(part(t, 'exit') >= 1) : ease(part(t, 'exit'))) : 0;
      var slowDrift = Math.min(58 * k, h * 0.105) * exitP; // exit: retract
      var slotY = lerp(h + 65 * k, slotRestY, slotIn) + slowDrift;
      var exitAlpha = t >= p.exit.start ? 1 - exitP : 1;
      printer.style.top = slotY.toFixed(2) + 'px';
      printer.style.opacity = String(t <= 0 || part(t, 'slot') < 0.02 ? 0 : exitAlpha);
      frontPrinter.style.top = printer.style.top;
      frontPrinter.style.opacity = printer.style.opacity;
      front.style.clipPath = 'inset(' + (slotY + frontLipStart).toFixed(2) + 'px 0 0)';
      var feedDepth = paperTuning.feedDepth * w / 1024;
      viewport.style.height = (mouthY + feedDepth + slowDrift).toFixed(2) + 'px';
      var top = entrance;
      if (t >= p.feed.start) top = lerp(entrance, priorTop, reduced ? Number(part(t, 'feed') >= 1) : ease(part(t, 'feed')));
      if (t >= p.advance.start) top = lerp(priorTop, newTop, reduced ? Number(part(t, 'advance') >= 1) : ease(part(t, 'advance')));
      var alpha = 1;
      if (t >= p.exit.start) { top = lerp(newTop, entrance, exitP) + slowDrift; alpha = exitAlpha; }
      sheet.style.top = top.toFixed(2) + 'px';
      sheet.style.opacity = String(t < p.feed.start ? 0 : alpha);
      drawInk(t);
      drawBackdrop(t, k);
      root.dataset.phase = phaseName(t);
    }
    function phaseName(t) {
      if (t <= 0) return 'before';
      var p = plan.points;
      for (var i = 0; i < steps.length; i++) if (t < p[steps[i]].end) return steps[i];
      return 'complete';
    }
    // The next chapter's first frame is frozen while the paper holds (it is decoded and laid out under the
    // overlay, so it is ready before the exit begins).
    function wantNext() {
      if (nextReady || !opts.next) return;
      nextReady = Promise.resolve(opts.next(root)).then(function (canvas) {
        if (canvas) { canvas.className = 'frame'; nextScene.appendChild(canvas); }
        nextLoaded = true;
      }, function (err) { nextLoaded = true; console.error(err); });
    }
    function tick(now) {
      if (done) return;
      if (!last) last = now;
      elapsed += now - last; last = now;
      var t = elapsed / 1000;
      if (t >= plan.points.feed.end) wantNext();
      // The exit cannot begin until the incoming frame is ready (it is normally ready seconds earlier).
      if (t >= plan.points.exit.start && opts.next && !nextLoaded) elapsed = plan.points.exit.start * 1000;
      if (elapsed >= plan.total * 1000) { elapsed = plan.total * 1000; render(); finish(false); return; }
      render();
      frame = requestAnimationFrame(tick);
    }
    function finish(skipped) {
      if (done) return;
      done = true;
      if (frame !== null) cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey, true);
      var end = function () {
        if (root.parentNode) root.parentNode.removeChild(root);
        cur = null;
        if (opts.onDone) opts.onDone({ skipped: !!skipped });
      };
      wantNext();
      // Skip or completion: the incoming frame must be laid out before the overlay goes (idempotent).
      (nextReady || Promise.resolve()).then(end, end);
    }
    function onKey(e) {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(true); }
      else if (e.key !== 'Tab') { e.stopPropagation(); }
    }
    root.addEventListener('pointerdown', function (e) { e.preventDefault(); finish(true); });
    document.addEventListener('keydown', onKey, true);
    cur = { finish: finish, root: root, plan: plan, scenario: scenario, rows: rowsData };
    render();
    root.focus({ preventScroll: true });
    frame = requestAnimationFrame(tick);
    return cur;
  }

  G.chapterTransition = {
    play: play,
    isOpen: function () { return !!cur; },
    skip: function () { if (cur) cur.finish(true); },
    // QA: the plan and rows on show (read-only).
    current: function () { return cur ? { scenario: cur.scenario, total: cur.plan.total, rows: cur.rows.map(function (r) { return { number: r.number, title: r.title, long: r.long }; }), phase: cur.root.dataset.phase } : null; },
    printable: printable,
    durations: defaultDurations,
    images: [PAPER, PRINTER, MENU]
  };
})();
