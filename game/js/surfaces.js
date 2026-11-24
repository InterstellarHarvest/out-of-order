// Narrative B and Focus A text surfaces for imported stories (docs/84; docs/72 section 3.5; the
// owner's rounds 2-6 grammar, docs/70). The reception never uses this file: its dialogue box is
// js/stage.js's, unchanged. js/story-flow.js decides what is said; this file only draws it.
//
//   Narrative B  the B overlay (art/ui/shell/narrative-overlay.png) over the right column, with the
//                narration on it: second person, one dark ink, anyone's speech in quotation marks.
//                It types at the dialogue's speed, accumulates for the scene, scrolls with the
//                dialogue's own thumb style, and a long passage arrives in CONTINUE groups.
//   Focus A      the close-up in the portrait aperture (js/stage.js G.setPortraitArt) and its
//                description over the speech panel's text area: this visit only, paged.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var T = G.text;
  var TU = G.TUNING;
  var ROLE = 'dialogue'; // the Dialogue face (Jersey 15), as the lab's default
  // Which overlay image, and where narration sits on it, come from its manifest
  // (art/ui/shell/narrative-overlay.manifest.js): replacing the art never touches this file.
  var OVERLAY_ART = window.CYOA_NARRATIVE_OVERLAY;
  var OVERLAY = { image: 'ui:' + OVERLAY_ART.id, path: 'art/ui/shell/' + OVERLAY_ART.image, status: OVERLAY_ART.status };
  G.NARRATIVE_ART = OVERLAY;

  var els = {};
  var B = { paras: [], newFrom: 0, scroll: 0, typing: false, typeStart: 0, revealed: 0 };
  var A = { paras: [], breaks: null, newFrom: 0, page: 0, typing: false, typeStart: 0, revealed: 0 };
  var on = null; // 'narrative' | 'focus' | null

  // A paragraph's runs as narration: speech quoted, everything else plain (docs/70 section 1).
  G.narrationText = function (runs) {
    return runs.map(function (r) { return r.role === 'speech' ? voiceLabel(r) + '"' + r.text + '"' : r.role === 'thought' ? '(' + r.text + ')' : r.text; }).join(' ');
  };
  // Speech by a cast member without a portrait (an incidental or voice-only voice, docs/104 section 4
  // and docs/137 C2) is attributed by name on Narrative B too: NAME: "...". Portrait speakers and the
  // player are never labelled here, so narration without such voices reads exactly as before.
  function voiceLabel(r) {
    var cast = G.story && G.story.cast;
    var c = r.who && r.who !== 'you' && cast ? cast[r.who] : null;
    return c && !c.portrait ? c.name + ': ' : '';
  }

  function box(kind) {
    var t = kind === 'focus' ? TU.focus : TU.narrative;
    var faceH = T.lineHeight(ROLE);
    var avail = t.safeBottom - (t.bottomMargin || 0) - t.y;
    var cap = Math.max(1, Math.floor((avail - faceH) / t.lineHeight) + 1);
    return { x: t.x, y: t.y, width: t.width, lh: t.lineHeight, cap: cap, height: (cap - 1) * t.lineHeight + faceH };
  }
  function cps() {
    return G.layout.speech.text.charsPerSecond;
  }

  function el(tag, id, parent) {
    var n = document.createElement(tag);
    n.id = id;
    if (parent) parent.appendChild(n);
    return n;
  }
  function place(n, x, y, w, h) {
    n.style.left = x + 'px';
    n.style.top = y + 'px';
    n.style.width = w + 'px';
    n.style.height = h + 'px';
  }

  // Built on first use, above the shell (so the overlay sits on the frame) and below the cards.
  function ensure() {
    var stage = document.getElementById('stage');
    var shell = document.getElementById('shell');
    if (els.layerB && els.layerB.parentNode === stage) return;
    els.layerB = el('div', 'narrativeLayer');
    els.layerB.className = 'layer';
    var img = G.image(OVERLAY.image);
    img.id = 'narrativeOverlay';
    img.className = 'sprite-abs';
    img.alt = '';
    img.draggable = false;
    img.setAttribute('aria-hidden', 'true');
    img.width = OVERLAY_ART.width;
    img.height = OVERLAY_ART.height;
    place(img, 0, 0, OVERLAY_ART.width, OVERLAY_ART.height);
    els.layerB.appendChild(img);
    els.textB = el('canvas', 'narrationText', els.layerB);
    els.textB.className = 'sprite-abs';
    els.textB.setAttribute('aria-hidden', 'true');
    els.thumbB = el('div', 'narrationThumb', els.layerB);
    els.thumbB.className = 'speech-indicator';
    els.hitB = el('div', 'narration', els.layerB);
    els.hitB.className = 'hit-area';
    els.hitB.tabIndex = 0;
    els.hitB.setAttribute('role', 'log');
    var b = box('narrative');
    place(els.hitB, b.x, b.y, b.width, b.height);
    els.hitB.addEventListener('click', function () { G.flow.skip(); });
    els.hitB.addEventListener('wheel', function (e) { e.preventDefault(); scrollB(Math.sign(e.deltaY)); }, { passive: false });
    els.hitB.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') scrollB(1);
      else if (e.key === 'ArrowUp') scrollB(-1);
      else if (e.key === 'Enter' || e.key === ' ') G.flow.skip();
      else return;
      e.preventDefault();
    });
    els.layerA = el('div', 'focusLayer');
    els.layerA.className = 'layer';
    els.textA = el('canvas', 'focusText', els.layerA);
    els.textA.className = 'sprite-abs';
    els.textA.setAttribute('aria-hidden', 'true');
    els.hitA = el('div', 'focusDescription', els.layerA);
    els.hitA.className = 'hit-area';
    els.hitA.tabIndex = 0;
    els.hitA.setAttribute('role', 'log');
    var a = box('focus');
    place(els.hitA, a.x, a.y, a.width, a.height);
    els.hitA.addEventListener('click', function () { G.flow.skip(); });
    shell.after(els.layerB);
    els.layerB.after(els.layerA);
  }

  // Lines of a surface: paragraphs wrapped, a blank line between paragraphs.
  // An authored blank line ('\n\n') is an empty paragraph in the transcript: here it is just the
  // paragraph gap, never a second one.
  function solid(texts) {
    return texts.filter(function (t) { return t !== ''; });
  }
  function linesOf(paras, b) {
    var lines = [];
    var starts = [];
    paras.forEach(function (text, i) {
      if (i > 0) lines.push('');
      starts.push(lines.length);
      T.wrap(text, b.width, ROLE).forEach(function (t) { lines.push(t); });
    });
    starts.push(lines.length);
    return { lines: lines, starts: starts };
  }
  function chars(lines, from, to) {
    var n = 0;
    for (var i = from; i < to; i++) n += lines[i].length;
    return n;
  }

  // Narrative B --------------------------------------------------------------------------------
  function layoutB() {
    var b = box('narrative');
    var L = linesOf(B.paras, b);
    var newRow = B.newFrom < B.paras.length ? L.starts[B.newFrom] : L.lines.length;
    return { b: b, lines: L.lines, newRow: newRow, base: chars(L.lines, 0, newRow), total: chars(L.lines, 0, L.lines.length) };
  }
  function maxScrollB(Lb) { return Math.max(0, Lb.lines.length - Lb.b.cap); }
  function scrollB(d) {
    if (B.typing) return;
    var Lb = layoutB();
    B.scroll = Math.max(0, Math.min(maxScrollB(Lb), B.scroll + d));
    renderB();
  }
  function renderB() {
    if (!els.layerB) return;
    var Lb = layoutB();
    var b = Lb.b;
    if (B.typing) {
      // Follow the newest row while typing (the dialogue's rule).
      var row = 0;
      for (var c = 0; row < Lb.lines.length; row++) { c += Lb.lines[row].length; if (c >= B.revealed) break; }
      var top = B.scroll;
      while (row >= top + b.cap) top++;
      B.scroll = Math.min(top, maxScrollB(Lb));
    }
    B.scroll = Math.max(0, Math.min(B.scroll, maxScrollB(Lb)));
    var shown = Lb.lines.slice(B.scroll, B.scroll + b.cap);
    var budget = B.typing ? Math.max(0, B.revealed - chars(Lb.lines, 0, B.scroll)) : undefined;
    T.draw(els.textB, shown.map(function (t) { return { text: t, role: ROLE }; }), 'dark', b.lh, b.width, b.height, budget, ROLE);
    place(els.textB, b.x, b.y, b.width, b.height);
    var ind = G.layout.speech.indicator;
    var rail = { x: ind.x, y: b.y + 6, width: ind.width, height: Math.max(12, b.height - 18) };
    var max = maxScrollB(Lb);
    els.thumbB.classList.toggle('on', max > 0 && !B.typing);
    var h = Math.min(rail.height, Math.max(12, Math.round((rail.height * b.cap) / (Lb.lines.length || 1))));
    place(els.thumbB, rail.x, rail.y + (max ? Math.round(((rail.height - h) * B.scroll) / max) : 0), rail.width, h);
    els.hitB.dataset.paras = B.paras.length;
    els.hitB.dataset.lines = Lb.lines.length;
    els.hitB.dataset.scroll = B.scroll;
    els.hitB.dataset.typing = B.typing ? 'true' : 'false';
    els.hitB.dataset.text = B.paras.join('\n');
    els.hitB.setAttribute('aria-label', B.paras.length ? B.paras[B.paras.length - 1] : 'Narration');
  }

  // The scene's narration so far, all shown (a rebuild after a scene change, a return or a load).
  function setB(texts) {
    ensure();
    texts = solid(texts);
    B = { paras: texts.slice(), newFrom: texts.length, scroll: 0, typing: false, typeStart: 0, revealed: 0 };
    var Lb = layoutB();
    B.scroll = maxScrollB(Lb);
    renderB();
  }
  // New paragraphs, typed on below what is there.
  function appendB(texts) {
    ensure();
    B.newFrom = B.paras.length;
    solid(texts).forEach(function (t) { B.paras.push(t); });
    var Lb = layoutB();
    B.revealed = Lb.base;
    B.typing = Lb.total > Lb.base && cps() > 0;
    B.typeStart = performance.now();
    if (!B.typing) finishB();
    renderB();
  }
  function finishB() {
    var Lb = layoutB();
    B.typing = false;
    B.revealed = Lb.total;
    // Its first new row in view, or the end when it all fits below that row.
    var max = maxScrollB(Lb);
    B.scroll = Lb.newRow + Lb.b.cap > Lb.lines.length ? max : Math.min(Lb.newRow, max);
    renderB();
  }
  // CONTINUE groups for a passage: whole paragraphs, as many as fit the panel together; a paragraph
  // longer than the panel is a group of its own (it types on and scrolls).
  function groupsB(texts) {
    texts = solid(texts);
    var b = box('narrative');
    var out = [];
    var cur = [];
    var used = 0;
    texts.forEach(function (t, i) {
      var n = T.wrap(t, b.width, ROLE).length;
      if (cur.length && used + 1 + n > b.cap) { out.push(cur); cur = []; used = 0; }
      used += (cur.length ? 1 : 0) + n;
      cur.push(i);
    });
    if (cur.length) out.push(cur);
    return out;
  }

  // Focus A ------------------------------------------------------------------------------------
  // A.breaks (a paged close-up, docs/92 section 2): the paragraph indices where each semantic page
  // starts. A text page never spans two semantic pages, so the picture paired with one is never
  // shown beside the next one's text; a semantic page longer than the panel continues on further
  // text pages of its own (`seg` stays the same). Without breaks there is one segment: the
  // paging is exactly as before.
  function pagesA() {
    var b = box('focus');
    var L = linesOf(A.paras, b);
    var pages = [];
    var segs = [[0, L.lines.length]];
    if (A.breaks) {
      var starts = A.breaks.filter(function (p) { return p > 0 && p < A.paras.length; });
      segs = [];
      [0].concat(starts).forEach(function (p, k, all) {
        var from = p === 0 ? 0 : L.starts[p];
        // A segment ends before the blank between its last paragraph and the next segment.
        segs.push([from, k + 1 < all.length ? L.starts[all[k + 1]] - 1 : L.lines.length]);
      });
    }
    segs.forEach(function (sg, seg) {
      for (var i = sg[0]; i < sg[1]; i += b.cap) {
        var p = L.lines.slice(i, Math.min(i + b.cap, sg[1]));
        while (p.length && p[0] === '') p.shift(); // a page never opens on the blank between paragraphs
        pages.push({ from: i, lines: p, seg: seg });
      }
    });
    var newRow = A.newFrom < A.paras.length ? L.starts[A.newFrom] : L.lines.length;
    return { b: b, pages: pages.length ? pages : [{ from: 0, lines: [], seg: 0 }], newRow: newRow };
  }
  function renderA() {
    if (!els.layerA) return;
    var P = pagesA();
    var b = P.b;
    A.page = Math.max(0, Math.min(A.page, P.pages.length - 1));
    var page = P.pages[A.page];
    var budget = A.typing ? Math.max(0, A.revealed) : undefined;
    T.draw(els.textA, page.lines.map(function (t) { return { text: t, role: ROLE }; }), 'dark', b.lh, b.width, b.height, budget, ROLE);
    place(els.textA, b.x, b.y, b.width, b.height);
    els.hitA.dataset.page = A.page;
    els.hitA.dataset.pages = P.pages.length;
    els.hitA.dataset.segment = page.seg;
    els.hitA.dataset.typing = A.typing ? 'true' : 'false';
    els.hitA.dataset.text = A.paras.join('\n');
    els.hitA.setAttribute('aria-label', page.lines.join(' ') || 'Description');
  }
  // breaks: the semantic page starts of a paged close-up (paragraph indices), or null.
  function setA(texts, breaks) {
    ensure();
    texts = solid(texts);
    A = { paras: texts.slice(), breaks: breaks || null, newFrom: texts.length, page: 0, typing: false, typeStart: 0, revealed: 0 };
    var P = pagesA();
    A.page = P.pages.length - 1;
    renderA();
  }
  // New description text: the page where it starts, typed from its first character on that page.
  function appendA(texts) {
    ensure();
    A.newFrom = A.paras.length;
    solid(texts).forEach(function (t) { A.paras.push(t); });
    var P = pagesA();
    var at = 0;
    P.pages.forEach(function (p, i) { if (p.from <= P.newRow) at = i; });
    A.page = at;
    typePageA(P, true);
  }
  function typePageA(P, fromNew) {
    var page = P.pages[A.page];
    // Only the new text types: earlier text on the same page is there at once.
    var before = fromNew ? Math.max(0, P.newRow - page.from) : 0;
    A.base = chars(page.lines, 0, Math.min(before, page.lines.length));
    A.total = chars(page.lines, 0, page.lines.length);
    A.revealed = A.base;
    A.typing = A.total > A.base && cps() > 0;
    A.typeStart = performance.now();
    renderA();
  }
  function hasMoreA() {
    return A.page < pagesA().pages.length - 1;
  }
  function nextPageA() {
    A.page++;
    typePageA(pagesA(), false);
  }
  // The semantic page (0-based) of the text page on show: which picture of a paged close-up goes
  // with it. Always 0 without breaks.
  function segmentA() {
    var P = pagesA();
    return P.pages[Math.max(0, Math.min(A.page, P.pages.length - 1))].seg;
  }

  // Shared -------------------------------------------------------------------------------------
  // Which surface is on show: 'narrative' | 'focus' | null (the dialogue box, js/stage.js).
  function showMode(mode) {
    ensure();
    on = mode;
    els.layerB.style.display = mode === 'narrative' ? '' : 'none';
    els.layerA.style.display = mode === 'focus' ? '' : 'none';
    var speech = document.getElementById('speechText');
    var ind = document.getElementById('speechIndicator');
    speech.style.visibility = mode ? 'hidden' : '';
    ind.style.visibility = mode ? 'hidden' : '';
    document.body.dataset.mode = mode || 'dialogue';
    if (mode === 'narrative') renderB();
    if (mode === 'focus') renderA();
  }
  // Called every frame while the surface on show types. Returns true when it has finished.
  function typeTick(now) {
    var S = on === 'focus' ? A : B;
    if (!S.typing) return true;
    var n = Math.floor(((now - S.typeStart) * cps()) / 1000);
    if (on === 'focus') {
      A.revealed = Math.min(A.total, A.base + n);
      if (A.revealed >= A.total) A.typing = false;
      renderA();
    } else {
      var Lb = layoutB();
      B.revealed = Math.min(Lb.total, Lb.base + n);
      if (B.revealed >= Lb.total) { finishB(); return true; }
      renderB();
    }
    return !S.typing;
  }
  function finish() {
    if (on === 'focus') { A.typing = false; A.revealed = A.total; renderA(); } else finishB();
  }
  function focusTarget() {
    return on === 'focus' ? els.hitA : els.hitB;
  }

  // Draft stamp (docs/84 section 4.1) ---------------------------------------------------------
  // A preview build, or a chapter the storyboard has not marked "approved", says so on screen for
  // as long as it is played, and in the window title. It reads only the build record
  // (CYOA_STORY_BUILD: channel, and each chapter's manifest title and status), so an approved build
  // of approved chapters never shows it and no code changes when that happens. Development-only:
  // not part of the approved layout, never takes input, and sits under every panel and overlay.
  var STAMP = { x: 56, y: 58, padX: 10, padY: 8, gap: 4, role: 'objective', ink: 'light', plate: '#0e1b20' };
  function stampText(s) {
    // The label faces have no dash or dot beyond ASCII: an em dash becomes '-', anything else unknown '?'.
    return String(s).toUpperCase().replace(/[\u2012-\u2015]/g, '-');
  }
  function draftStamp(chapterId) {
    var build = window.CYOA_STORY_BUILD || {};
    var ch = (build.chapters || []).filter(function (c) { return c.id === chapterId; })[0] || { id: chapterId, title: chapterId, status: 'unlisted' };
    var draft = build.channel !== 'approved' || ch.status !== 'approved';
    var stage = document.getElementById('stage');
    var shell = document.getElementById('shell');
    var n = document.getElementById('draftStamp');
    var title = (G.story && G.story.title) || 'Out of Order';
    document.body.dataset.draft = draft ? 'true' : 'false';
    if (!draft) {
      if (n) n.style.display = 'none';
      document.title = title;
      return;
    }
    var lines = ['DRAFT PLAYABLE PREVIEW - NOT APPROVED CANON',
      stampText(ch.id + ': ' + (ch.title || ch.id) + (ch.status === 'approved' ? '' : ' [' + (ch.status || 'unlisted') + ']') + ' - BUILD ' + String(build.contentHash || 'none').slice(0, 8))];
    document.title = title + ' - DRAFT playable preview: ' + (ch.title || ch.id) + ' (not approved canon)';
    if (!n) {
      n = document.createElement('div');
      n.id = 'draftStamp';
      n.className = 'sprite-abs';
      n.setAttribute('role', 'note');
      n.style.background = STAMP.plate;
      // Directly above the scene and portrait art: under NOTES/FILES (#overlay), the shell, the
      // cards, the inspector, the item slip and tooltips.
      stage.insertBefore(n, document.getElementById('overlay') || shell || stage.firstChild);
    }
    if (n.dataset.text === lines.join('\n')) { n.style.display = ''; return; }
    n.textContent = '';
    var lh = T.lineHeight(STAMP.role);
    var w = 0;
    lines.forEach(function (text, i) {
      var cv = document.createElement('canvas');
      cv.className = 'sprite-abs';
      cv.setAttribute('aria-hidden', 'true');
      var size = T.label(cv, text, STAMP.ink, STAMP.role);
      place(cv, STAMP.padX, STAMP.padY + i * (lh + STAMP.gap), size[0], size[1]);
      w = Math.max(w, size[0]);
      n.appendChild(cv);
    });
    place(n, STAMP.x, STAMP.y, w + 2 * STAMP.padX, 2 * STAMP.padY + lines.length * lh + (lines.length - 1) * STAMP.gap);
    n.dataset.text = lines.join('\n');
    n.setAttribute('aria-label', lines.join('. '));
    n.style.display = '';
  }

  G.surfaces = {
    draftStamp: draftStamp,
    box: box,
    show: showMode,
    mode: function () { return on; },
    setB: setB,
    appendB: appendB,
    groupsB: groupsB,
    setA: setA,
    appendA: appendA,
    hasMoreA: hasMoreA,
    nextPageA: nextPageA,
    segmentA: segmentA,
    typeTick: typeTick,
    finish: finish,
    focusTarget: focusTarget,
    info: function () { return { mode: on, b: { paras: B.paras.slice(), scroll: B.scroll, typing: B.typing }, a: { paras: A.paras.slice(), page: A.page, typing: A.typing } }; }
  };
})();
