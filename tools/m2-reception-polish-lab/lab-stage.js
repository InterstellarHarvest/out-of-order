// Lab-only helpers inside a stage frame (docs/62), loaded after game/js/main.js.
//
// Representative states are reached by driving the PRODUCTION flow through its real choices and item
// actions (G.flow.begin / choose / toggleInspect / utility), with the turn timings briefly set to
// near zero so a state loads in about a second; the frame's own values are restored before the state
// is shown. Nothing writes narrative state directly, and nothing here is persisted.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var TUN = window.POLISH_TUNABLES;
  var LAB = (window.LAB_STAGE = {});
  var loading = false; // a state is being reached (fast timings in force)
  var queued = null; // values that arrived while loading, applied once it ends
  var lastToggles = null;
  var applied = 0;

  // Freeze: route the game's clocks through one switchable time source. The flow's frame loop uses
  // requestAnimationFrame timestamps; everything else uses performance.now().
  var realNow = performance.now.bind(performance);
  var realRaf = window.requestAnimationFrame.bind(window);
  var offset = 0;
  var frozenAt = null;
  performance.now = function () { return frozenAt !== null ? frozenAt : realNow() - offset; };
  window.requestAnimationFrame = function (cb) { return realRaf(function () { cb(performance.now()); }); };
  LAB.freeze = function (on) {
    if (on && frozenAt === null) frozenAt = performance.now();
    if (!on && frozenAt !== null) { offset = realNow() - frozenAt; frozenAt = null; }
    document.body.dataset.labFrozen = on ? 'true' : 'false';
  };

  function frame() { return new Promise(function (res) { realRaf(function () { res(); }); }); }
  async function until(test, label, ms) {
    var t0 = realNow();
    while (!test()) {
      if (realNow() - t0 > (ms || 8000)) throw new Error('lab state timed out waiting for ' + label + ' (phase ' + G.flow.phase + ')');
      await frame();
    }
  }
  LAB.ready = function () { return until(function () { return document.body.dataset.ready === 'true'; }, 'ready', 15000); };

  // Fast-forward: near-zero turn timings while a state is being reached, then the frame's own values.
  var FAST_KEYS = [
    [G.TUNING.timing, 'beforeChoicesMs', 0], [G.TUNING.timing, 'cardStaggerMs', 0],
    [G.layout.choices.feedback, 'awayMs', 1], [G.layout.choices.feedback.send, 'delayMs', 0],
    [G.layout.choices.feedback.send, 'durationMs', 1], [G.layout.choices.feedback.send, 'beatMs', 0],
    [G.layout.speech.text, 'charsPerSecond', 1e6], [G.layout.inventory.motion, 'durationMs', 1]
  ];
  async function fast(fn) {
    var saved = FAST_KEYS.map(function (k) { return k[0][k[1]]; });
    FAST_KEYS.forEach(function (k) { k[0][k[1]] = k[2]; });
    try {
      await fn();
    } finally {
      FAST_KEYS.forEach(function (k, i) { k[0][k[1]] = saved[i]; });
    }
  }

  var phase = function () { return G.flow.phase; };
  async function settle() { await until(function () { return phase() === 'choosing' && !G.ui.motion; }, 'choosing'); }
  async function choose(id) {
    await settle();
    var i = G.ui.cards.findIndex(function (c) { return c.id === id; });
    if (i < 0) throw new Error('choice not offered: ' + id + ' at ' + G.state.node);
    G.flow.choose(i);
    await until(function () { return phase() !== 'choosing'; }, 'send');
    await settle();
  }
  async function path(ids) { for (var i = 0; i < ids.length; i++) await choose(ids[i]); }
  async function inspectKey() { await settle(); G.flow.toggleInspect('wc_key'); }
  async function readTagAndQuestion() {
    await inspectKey();
    G.flow.utility('read');
    G.flow.closeInspector();
    await settle();
    await choose('question-tag');
  }

  var TO_KEY = ['ask-politely', 'practical', 'ask-key'];
  var LONG = ['ask-politely', 'correct', 'rule', 'sigh'];

  // Lab-only sample cards (display only): text fitted to exactly n wrapped lines in the Choices face.
  function sampleText(n, seed) {
    var words = ('LAB SAMPLE ' + seed + ': PLEASE STATE YOUR BUSINESS IN ONE SPECIFIC SENTENCE SO THAT THE FORM CAN BE FILED, '
      + 'STAMPED, RETURNED, QUERIED AND FILED AGAIN BEFORE THE OFFICE CLOSES FOR LUNCH ON A THURSDAY AFTERNOON').split(' ');
    var width = G.layout.choices.text.maxWidth;
    var best = words[0];
    for (var k = 1; k <= words.length; k++) {
      var t = words.slice(0, k).join(' ');
      var lines = G.text.wrap(t, width, 'choices').length;
      if (lines === n) best = t;
      if (lines > n) break;
    }
    return best;
  }
  function showSamples(spec) {
    G.flow.phase = 'lab-sample'; // display only: the flow will not take these cards
    document.body.dataset.phase = 'lab-sample';
    G.setChoices(spec.map(function (n, i) { return { id: 'lab-sample-' + i, text: sampleText(n, i + 1) }; }));
    G.ui.thumbOn = true;
    G.renderChoices(performance.now());
  }

  var STATES = {
    opening: { label: '1. Opening', run: async function () {} },
    'three-choices': { label: '2. Three choices (main decision)', run: async function () { await path(['ask-politely']); } },
    'long-history': { label: '3. Long dialogue / history', run: async function () { await path(LONG); } },
    'item-received': { label: '4. Item received (FACILITIES KEY slip)', run: async function () { await path(TO_KEY); }, after: function () { LAB.showNotice(); } },
    'inspector-before-read': { label: '5. Inspector - before READ', run: async function () { await path(TO_KEY); await inspectKey(); } },
    'inspector-after-read': { label: '6. Inspector - after READ', run: async function () { await path(TO_KEY); await inspectKey(); G.flow.utility('read'); } },
    notes: { label: '7. NOTES', run: async function () { await path(LONG.concat(['ask-key'])); await readTagAndQuestion(); G.flow.utility('notes'); } },
    files: { label: '8. FILES (with the 4:52 record)', run: async function () { await path(LONG.concat(['ask-key'])); await readTagAndQuestion(); G.flow.utility('files'); } },
    'tooltip-enabled': { label: '9. Tooltip - INSPECT enabled', run: async function () { await path(TO_KEY); }, after: function () { G.showTooltip(0); } },
    'tooltip-disabled': { label: '10. Tooltip - INSPECT disabled (reason)', run: async function () {}, after: function () { G.showTooltip(0); } },
    'tooltip-read': { label: '10a. Tooltip - inspector READ', run: async function () { await path(TO_KEY); await inspectKey(); }, after: function () { G.showTooltip(0); } },
    'tooltip-show': { label: '10b. Tooltip - inspector SHOW unavailable', run: async function () { await path(TO_KEY); await inspectKey(); }, after: function () { G.showTooltip(1); } },
    ending: { label: '11. Ending', run: async function () { await path(TO_KEY.concat(['confirm-unread', 'onward-blind', 'unlock', 'enter-corridor'])); } },
    'choices-1-2-3': { label: 'Sample: 1-, 2- and 3-line cards', run: async function () {}, after: function () { showSamples([1, 2, 3]); } },
    'choices-three-2': { label: 'Sample: three 2-line cards', run: async function () {}, after: function () { showSamples([2, 2, 2]); } }
  };
  LAB.STATES = Object.keys(STATES).map(function (k) { return { id: k, label: STATES[k].label }; });

  LAB.loadState = async function (id) {
    var s = STATES[id] || STATES.opening;
    await LAB.ready();
    var wasFrozen = frozenAt !== null;
    LAB.freeze(false);
    G.hideTooltip();
    loading = true;
    try {
      await fast(async function () {
        G.flow.begin();
        await settle();
        await s.run();
        await settle();
      });
    } finally {
      loading = false;
    }
    if (queued) {
      var q = queued;
      queued = null;
      TUN.writeAll(G, q);
      window.LAB_FRAME.applied = q;
      G.rebuildStage();
    }
    // A slip granted on the way here would long since have gone in real play: clear it, except in
    // the item-received state, which shows a fresh one.
    G.clearNotices();
    // States are shown at rest without keyboard focus, so both frames match whichever one has the
    // window's focus; the tooltip states show their tooltip explicitly.
    if (document.activeElement && document.activeElement !== document.body && document.activeElement.blur) document.activeElement.blur();
    G.hideTooltip();
    G.renderAll();
    if (s.after) s.after();
    document.body.dataset.labState = id;
    if (wasFrozen) LAB.freeze(true);
    return id;
  };

  // Live values (lab frame only): writes a full values map into G.TUNING / G.layout and rebuilds the
  // production stage in place where it stands (G.rebuildStage, js/stage.js), so a slider shows at
  // once with no reload. Returns 'live', 'queued' (a state is loading; applied when it ends),
  // 'reload' (the frame must reload) or 'invalid'.
  LAB.applyValues = function (all) {
    if (!window.LAB_FRAME || window.LAB_FRAME.mode !== 'lab') return 'invalid';
    var full = {};
    TUN.LIST.forEach(function (t) { full[t.key] = t.key in all ? all[t.key] : window.LAB_FRAME.production[t.key]; });
    if (!TUN.validate(full, window.LAB_FRAME.production).ok) return 'invalid';
    if (loading || document.body.dataset.ready !== 'true' || !G.rebuildStage) { queued = full; return 'queued'; }
    TUN.writeAll(G, full);
    window.LAB_FRAME.applied = full;
    var notes = G.OVERLAY_ART[G.overlayPanelKey('notes')];
    if (!G.image(notes.image)) return 'reload';
    G.rebuildStage();
    if (lastToggles) LAB.setToggles(lastToggles);
    document.body.dataset.labApplied = String(++applied);
    return 'live';
  };

  // The production FACILITIES KEY slip, without touching story state.
  LAB.showNotice = function () {
    G.clearNotices();
    G.notifyItem('wc_key');
  };
  LAB.finishTyping = function () { G.flow.skip(); };

  // Close X held UP or DOWN for inspection ('auto' = normal behaviour).
  LAB.holdClose = function (mode) {
    if (mode === 'down') G.ui.pressed['inspect-close'] = true;
    else delete G.ui.pressed['inspect-close'];
    if (G.renderInspector) G.renderInspector();
  };

  // Visibility and bounds aids (lab only; never part of exported values).
  var style = document.createElement('style');
  style.id = 'labToggles';
  document.head.appendChild(style);
  var boundsLayer = null;
  LAB.setToggles = function (t) {
    lastToggles = t;
    var css = [];
    if (t.hideShell) css.push('#shell { visibility: hidden !important; }');
    if (t.hideScene) css.push('#sceneArt { visibility: hidden !important; }');
    if (t.hideBackground) css.push('#portraitBackground { visibility: hidden !important; }');
    if (t.hideNpc) css.push('#portraitNpc { visibility: hidden !important; }');
    if (t.hideRearFx) css.push('#portraitRearFx { visibility: hidden !important; }');
    if (t.hideFrontFx) css.push('#portraitFrontFx { visibility: hidden !important; }');
    style.textContent = css.join('\n');
    var stage = document.getElementById('stage');
    if ((!boundsLayer || !boundsLayer.isConnected) && stage) { // a live rebuild replaces the stage's children
      boundsLayer = document.createElement('div');
      boundsLayer.id = 'labBounds';
      boundsLayer.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;z-index:2147483647';
      stage.appendChild(boundsLayer);
    }
    if (!boundsLayer) return;
    boundsLayer.textContent = '';
    var R = G.measured.regions;
    var L = G.layout;
    var boxes = [];
    if (t.boundsScene) boxes.push([R.sceneAperture.rect, '#ff2d55', 'scene aperture']);
    if (t.boundsPortrait) boxes.push([R.portraitAperture.rect, '#ffcc00', 'portrait aperture']);
    if (t.boundsChoices) {
      var vp = L.choices.viewport;
      boxes.push([[vp.x, vp.y, vp.width, vp.height], '#34c759', 'choice viewport']);
      var tr = L.scrollbar.track;
      boxes.push([[tr.x, tr.y, tr.width, tr.height], '#5ac8fa', 'scrollbar track']);
    }
    if (t.boundsInventory) {
      var w = document.getElementById('invWindow');
      if (w) boxes.push([[parseInt(w.style.left), parseInt(w.style.top), parseInt(w.style.width), parseInt(w.style.height)], '#af52de', 'inventory window']);
      ['inv-left', 'inv-right'].forEach(function (id) {
        var a = document.getElementById(id);
        if (a) boxes.push([[parseInt(a.style.left), parseInt(a.style.top), parseInt(a.style.width), parseInt(a.style.height)], '#af52de', id]);
      });
    }
    if (t.boundsUtility) L.utility.buttons.forEach(function (b, i) { boxes.push([[b.x, b.y, b.displayWidth, b.displayHeight], '#ff9500', 'util-' + i]); });
    boxes.forEach(function (b) {
      var d = document.createElement('div');
      d.className = 'lab-bound';
      d.title = b[2];
      d.style.cssText = 'position:absolute;box-sizing:border-box;border:1px solid ' + b[1] + ';left:' + b[0][0] + 'px;top:' + b[0][1] + 'px;width:' + b[0][2] + 'px;height:' + b[0][3] + 'px';
      boundsLayer.appendChild(d);
    });
  };

  // Pointer position in stage pixels and the element under it, reported to the lab page.
  document.addEventListener('mousemove', function (e) {
    var p = window.parent && window.parent.POLISH_LAB;
    if (!p || !p.stageInfo) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    while (el && el.closest && el.closest('#labBounds')) el = null;
    var desc = el ? (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '')) : '';
    var r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    p.stageInfo({ x: Math.floor(e.clientX), y: Math.floor(e.clientY), el: desc, rect: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null });
  });
})();
