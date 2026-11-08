// The polish lab page (docs/62). Two stage frames run the PRODUCTION game: one untouched
// (?mode=production), one with the lab's values (?mode=lab). PRODUCTION / LAB flips between them
// instantly. Production defaults are read from the production frame at runtime; nothing here copies
// a production number. Lab values persist in this page's localStorage only; the game never reads it.
// The lab's own UI (folded sections, scroll positions, state, view, preview mode, aids) persists
// separately under STORE_UI: it is never exported and RESET never touches it (docs/64).
(function () {
  'use strict';

  var TUN = window.POLISH_TUNABLES;
  var STORE = 'cyoa-m2-reception-polish-lab-v1'; // tunable values: { schema, changes }
  var STORE_UI = 'cyoa-m2-reception-polish-lab-ui-v1'; // devtool UI state only
  var $ = function (id) { return document.getElementById(id); };

  var prod = null; // production values, read from the production frame
  var changes = {}; // only the values that differ from production
  var ownerDefaults = null; // the OWNER_DEFAULTS id this lab has already added (once per id)
  var view = 'lab';
  var stateId = 'opening';
  var fit = true;
  var frozen = false;
  var toggles = { hideShell: false, hideScene: false, hideBackground: false, hideNpc: false, hideRearFx: false, hideFrontFx: false,
    boundsScene: false, boundsPortrait: false, boundsChoices: false, boundsInventory: false, boundsUtility: false, boundsClose: false, coords: true,
    boundsNarration: false };
  var folded = {}; // section id -> true when collapsed
  var scrolls = { side: 0, stageX: 0, stageY: 0 };
  var frames = {};
  var labN = 0;
  var reloadTimer = null;
  var pending = null; // resolves once a scheduled lab-frame reload has loaded its state
  var pendingResolve = null;
  var frameReady = { production: null, lab: null };

  // Storage --------------------------------------------------------------------------------------
  function readUi(s) {
    if (!s) return;
    if (typeof s.state === 'string') stateId = s.state;
    if (s.view === 'production' || s.view === 'lab') view = s.view;
    if (typeof s.fit === 'boolean') fit = s.fit;
    if (s.toggles) Object.keys(toggles).forEach(function (k) { if (typeof s.toggles[k] === 'boolean') toggles[k] = s.toggles[k]; });
    if (s.folded && typeof s.folded === 'object') Object.keys(s.folded).forEach(function (k) { if (s.folded[k] === true) folded[k] = true; });
    if (s.scrolls) Object.keys(scrolls).forEach(function (k) { if (Number.isFinite(s.scrolls[k])) scrolls[k] = s.scrolls[k]; });
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (s && s.changes && typeof s.changes === 'object') changes = s.changes;
      if (s && typeof s.ownerDefaults === 'string') ownerDefaults = s.ownerDefaults;
      readUi(s); // UI fields an older lab kept beside the values
    } catch (e) { /* unreadable storage: start from production */ }
    try {
      readUi(JSON.parse(localStorage.getItem(STORE_UI) || 'null'));
    } catch (e) { /* unreadable: default UI */ }
  }
  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify({ schema: TUN.SCHEMA, changes: changes, ownerDefaults: ownerDefaults }));
    } catch (e) { /* storage blocked: the lab still works for this session */ }
  }
  function saveUi() {
    try {
      localStorage.setItem(STORE_UI, JSON.stringify({ schema: 'cyoa-m2-reception-polish-lab-ui-v1', state: stateId, view: view, fit: fit, toggles: toggles, folded: folded, scrolls: scrolls }));
    } catch (e) { /* storage blocked */ }
  }

  // Values ---------------------------------------------------------------------------------------
  function valueOf(key) { return key in changes ? changes[key] : prod[key]; }
  function allValues() { var o = {}; TUN.LIST.forEach(function (t) { o[t.key] = valueOf(t.key); }); return o; }
  function setValue(key, v, quiet) {
    var t = TUN.byKey[key];
    var b = TUN.bounds(t, prod);
    v = Math.round(Number(v));
    if (!Number.isFinite(v)) return;
    v = Math.min(b[1], Math.max(b[0], v));
    // The slip's fades must fit inside its total lifecycle (docs/62 §12): a fade is clamped to what
    // the duration leaves, and the duration to at least both fades. Import rejects such a set instead.
    if (key === 'notice.fadeInMs') v = Math.min(v, valueOf('notice.durationMs') - valueOf('notice.fadeOutMs'));
    if (key === 'notice.fadeOutMs') v = Math.min(v, valueOf('notice.durationMs') - valueOf('notice.fadeInMs'));
    if (key === 'notice.durationMs') v = Math.max(v, valueOf('notice.fadeInMs') + valueOf('notice.fadeOutMs'));
    if (v === prod[key]) delete changes[key];
    else changes[key] = v;
    save();
    renderRow(key);
    renderSummary();
    if (!quiet) applyLab();
  }
  function resetField(key) { setValue(key, prod[key]); }
  function resetSection(sec) {
    TUN.LIST.filter(function (t) { return t.s === sec; }).forEach(function (t) { delete changes[t.key]; renderRow(t.key); });
    save(); renderSummary(); applyLab();
  }
  function resetAll() {
    changes = {};
    TUN.LIST.forEach(function (t) { renderRow(t.key); });
    save(); renderSummary(); applyLab();
  }

  // Export / import -------------------------------------------------------------------------------
  function ordered(map) { var o = {}; TUN.LIST.forEach(function (t) { if (t.key in map) o[t.key] = map[t.key]; }); return o; }
  function exportChanges() { return JSON.stringify({ schema: TUN.SCHEMA, baseSha: TUN.BASE_SHA, changes: ordered(changes) }, null, 2); }
  function exportAll() { return JSON.stringify({ schema: TUN.SCHEMA, baseSha: TUN.BASE_SHA, values: allValues() }, null, 2); }
  function importJSON(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, errors: ['not valid JSON: ' + e.message] }; }
    if (!data || typeof data !== 'object') return { ok: false, errors: ['expected an object'] };
    if (data.schema !== undefined && data.schema !== TUN.SCHEMA) return { ok: false, errors: ['schema must be ' + TUN.SCHEMA + ' (got ' + data.schema + ')'] };
    var extra = Object.keys(data).filter(function (k) { return ['schema', 'baseSha', 'changes', 'values'].indexOf(k) === -1; });
    if (extra.length) return { ok: false, errors: ['unknown top-level fields: ' + extra.join(', ')] };
    var map = data.changes || data.values;
    if (!map) return { ok: false, errors: ['expected "changes" or "values"'] };
    var check = TUN.validate(map, prod);
    if (!check.ok) return check;
    changes = {};
    Object.keys(map).forEach(function (k) { if (map[k] !== prod[k]) changes[k] = map[k]; });
    save();
    TUN.LIST.forEach(function (t) { renderRow(t.key); });
    renderSummary();
    applyLab();
    return { ok: true, errors: [], changed: Object.keys(changes).length };
  }
  function copy(text, note) {
    $('ioText').value = text;
    var done = function (ok) { $('ioStatus').textContent = ok ? note + ' copied to the clipboard (also shown below).' : note + ' shown below: select and copy it.'; };
    try {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { $('ioText').select(); done(false); });
    } catch (e) { $('ioText').select(); done(false); }
  }

  // Frames ---------------------------------------------------------------------------------------
  function frameWin(mode) { return frames[mode].contentWindow; }
  function whenLoaded(mode) {
    return new Promise(function (res, rej) {
      var f = frames[mode];
      var t0 = Date.now();
      (function poll() {
        try {
          var w = f.contentWindow;
          if (w && w.LAB_STAGE && w.document.body && w.document.body.dataset.ready === 'true') return res(w);
          if (w && w.document.body && w.document.body.dataset.ready === 'error') return rej(new Error(w.document.body.dataset.error || 'stage failed'));
        } catch (e) { /* not loaded yet */ }
        if (Date.now() - t0 > 20000) return rej(new Error(mode + ' stage did not load'));
        setTimeout(poll, 50);
      })();
    });
  }
  async function prepare(mode) {
    var w = await whenLoaded(mode);
    await w.LAB_STAGE.loadState(stateId);
    w.LAB_STAGE.setToggles(toggles);
    w.LAB_STAGE.freeze(frozen);
    return w;
  }
  function loadFrame(mode) {
    var f = frames[mode];
    // Wait for the NEW document's load event first: until then contentWindow is still the old,
    // already-ready page, which is about to be torn down.
    var loaded = new Promise(function (res) {
      f.addEventListener('load', function onLoad() { f.removeEventListener('load', onLoad); res(); });
    });
    f.src = 'stage.html?mode=' + mode + (mode === 'lab' ? '&n=' + (++labN) : '');
    frameReady[mode] = loaded.then(function () { return prepare(mode); });
    frameReady[mode].then(function () { renderStatus(); }, function (e) { $('status').textContent = 'Stage error: ' + e.message; });
    return frameReady[mode];
  }
  // Live: once per animation frame at most, the lab frame rebuilds its stage in place with the
  // current values (LAB_STAGE.applyValues). Only if it cannot (it is mid-navigation) does the lab
  // frame reload instead.
  var live = null;
  function applyLab() {
    if (live) return live;
    live = new Promise(function (res) {
      requestAnimationFrame(function () {
        live = null;
        var r = 'reload';
        try {
          var w = frameWin('lab');
          if (w && w.LAB_STAGE && w.LAB_STAGE.applyValues) r = w.LAB_STAGE.applyValues(allValues());
        } catch (e) { r = 'reload'; }
        if (r === 'reload') {
          scheduleLabReload();
          pending.then(res);
        } else {
          if (r === 'invalid') $('status').textContent = 'Lab values rejected by the stage frame';
          res(r);
        }
      });
    });
    return live;
  }
  function scheduleLabReload() {
    clearTimeout(reloadTimer);
    $('status').textContent = 'Applying lab values...';
    if (!pending) pending = new Promise(function (res) { pendingResolve = res; });
    reloadTimer = setTimeout(function () {
      var done = pendingResolve;
      pending = null;
      pendingResolve = null;
      loadFrame('lab').then(done, done);
    }, 250);
  }
  function both(fn) { ['production', 'lab'].forEach(function (m) { try { var w = frameWin(m); if (w && w.LAB_STAGE) fn(w.LAB_STAGE); } catch (e) { /* loading */ } }); }
  async function setState(id) {
    stateId = id;
    saveUi();
    if ($('stateSelect').value !== id) $('stateSelect').value = id;
    $('status').textContent = 'Loading state...';
    await Promise.all(['production', 'lab'].map(async function (m) {
      await frameReady[m];
      var w = frameWin(m);
      await w.LAB_STAGE.loadState(id);
      w.LAB_STAGE.setToggles(toggles);
    }));
    renderStatus();
    window.NARRATIVE_LAB.onState(id);
  }
  function setView(v) {
    view = v;
    saveUi();
    // Both frames stay rendered (a hidden frame is throttled by some browsers, which would slow its
    // clock and its state loads); the flip only changes which one is on top.
    frames.production.style.zIndex = v === 'production' ? '2' : '1';
    frames.lab.style.zIndex = v === 'lab' ? '2' : '1';
    frames.production.setAttribute('aria-hidden', v === 'production' ? 'false' : 'true');
    frames.lab.setAttribute('aria-hidden', v === 'lab' ? 'false' : 'true');
    $('viewProduction').classList.toggle('on', v === 'production');
    $('viewLab').classList.toggle('on', v === 'lab');
    $('stageWrap').dataset.view = v;
    renderStatus();
  }
  function applyFit() {
    var wrap = $('stageWrap');
    var box = $('stageArea');
    var s = fit ? Math.min(1, (box.clientWidth - 2) / 1920, (box.clientHeight - 2) / 1080) : 1;
    wrap.style.transform = s === 1 ? '' : 'scale(' + s + ')';
    wrap.parentNode.style.width = Math.floor(1920 * s) + 'px';
    wrap.parentNode.style.height = Math.floor(1080 * s) + 'px';
    $('fitExact').classList.toggle('on', !fit);
    $('fitWindow').classList.toggle('on', fit);
    $('fitExact').setAttribute('aria-pressed', String(!fit));
    $('fitWindow').setAttribute('aria-pressed', String(fit));
    $('fitNote').textContent = s === 1 ? 'Exact 1:1 pixels.' : 'Scaled preview (' + Math.round(s * 100) + '%). Switch to 1:1 to judge pixels.';
  }

  // UI -------------------------------------------------------------------------------------------
  var rows = {};
  function el(tag, cls, parent, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; if (parent) parent.appendChild(n); return n; }

  function buildControls() {
    var side = $('controls');
    side.textContent = '';
    TUN.SECTIONS.forEach(function (sec) {
      var box = el('section', 'sec', side);
      box.id = 'sec-' + sec.id;
      box.dataset.fold = 'sec-' + sec.id;
      var head = el('div', 'sec-head fold-head', box);
      var fb = el('button', 'fold', el('h3', '', head), sec.title);
      fb.type = 'button';
      var count = el('span', 'sec-count', head);
      count.id = 'count-' + sec.id;
      var rs = el('button', 'small', head, 'Reset section');
      rs.type = 'button';
      rs.dataset.section = sec.id;
      rs.addEventListener('click', function () { resetSection(sec.id); });
      TUN.LIST.filter(function (t) { return t.s === sec.id; }).forEach(function (t) {
        var b = TUN.bounds(t, prod);
        rows[t.key] = window.LAB_CONTROLS.build(box, t, { min: b[0], max: b[1], ref: prod[t.key], refName: 'prod', attr: 'key',
          value: function () { return valueOf(t.key); }, onSet: function (v) { setValue(t.key, v); }, onReset: function () { resetField(t.key); } });
        renderRow(t.key);
      });
    });
  }
  function renderRow(key) {
    if (rows[key]) rows[key].render(valueOf(key), key in changes);
  }
  function renderSummary() {
    var n = Object.keys(changes).length;
    $('summary').textContent = n ? n + ' value' + (n === 1 ? '' : 's') + ' changed from production' : 'All values = production';
    $('summary').classList.toggle('changed', n > 0);
    TUN.SECTIONS.forEach(function (sec) {
      var c = TUN.LIST.filter(function (t) { return t.s === sec.id && t.key in changes; }).length;
      var node = $('count-' + sec.id);
      if (node) node.textContent = c ? c + ' changed' : '';
      var box = $('sec-' + sec.id);
      if (box) box.classList.toggle('changed', c > 0);
    });
  }
  function isPreview(id) {
    try { return frameWin('production').LAB_STAGE.STATES.some(function (s) { return s.id === id && s.preview; }); } catch (e) { return false; }
  }
  function renderStatus() {
    var name = isPreview(stateId) ? (view === 'lab' ? 'LAB + STUDY' : 'STUDY DEFAULT') : view.toUpperCase();
    $('status').textContent = 'Showing ' + name + ' values - state: ' + stateId + (isPreview(stateId) ? ' (Narrative Study preview, experimental)' : '') + (frozen ? ' - FROZEN' : '');
  }
  function buildLocked(w) {
    var G = w.CYOA_GAME;
    var R = G.measured.regions;
    var L = G.layout;
    var ch = L.choices;
    var list = [
      ['Canonical shell', 'art/ui/shell/layout-final.png, ' + (L.shell.sha256 || '').slice(0, 12) + '..., unchanged pixels'],
      ['Stage', '1920 x 1080'],
      ['Scene aperture', R.sceneAperture.rect.join(', ') + ' (x, y, w, h)'],
      ['Scene density', '314 x 206 logical at exactly 4x = 1256 x 824, clipped by the aperture'],
      ['Portrait aperture', R.portraitAperture.rect.join(', ')],
      ['Portrait density', '564 x 278 at 1x; layers background -> rear FX -> NPC -> front FX -> shell'],
      ['Art', 'approved scene, portrait background, receptionist_idle, inspector frame, FACILITIES KEY, NOTES and FILES panels, item slip, action sprites: production files only'],
      ['Choice cards', 'width ' + ch.cardWidth + '; heights 1-4 lines ' + [1, 2, 3, 4].map(function (n) { return ch.cardHeights[n]; }).join(' / ')],
      ['Scrollbar', 'width ' + L.scrollbar.track.width + ' px reserved; no arrows'],
      ['Inventory', L.inventory.slotCount + ' slots on show, ' + L.inventory.slotSize.join(' x ') + ' slot art; arrow art settled'],
      ['Utility buttons', L.utility.buttons.length + ' buttons, ' + L.utility.buttons[0].displayWidth + ' x ' + L.utility.buttons[0].displayHeight + '; sprites, glyphs, no-hover rule'],
      ['Inspector', 'frame + item overlay; inspect art 565 x 451; X = one static 44 x 44 sprite (inspect_close.png), position tunable'],
      ['NOTES / FILES', 'each its own 1255 x 822 panel at 1x (FILES: files_panel.png), scene only, no scrollbar'],
      ['Item slip', '560 x 116 art at 1x, generic for any item']
    ];
    var box = $('locked');
    box.textContent = '';
    list.forEach(function (l) { var d = el('div', 'lock', box); el('b', '', d, l[0] + ': '); el('span', '', d, l[1]); });
  }

  function buildToolbar() {
    var sel = $('stateSelect');
    // The reception states, then the Narrative Study's experimental preview states in their own group.
    var groups = {};
    frameWin('production').LAB_STAGE.STATES.forEach(function (s) {
      var g = s.group || 'M2 reception (the production game)';
      if (!groups[g]) { groups[g] = el('optgroup', '', sel); groups[g].label = g; }
      var o = el('option', '', groups[g], s.label);
      o.value = s.id;
    });
    sel.value = stateId;
    sel.addEventListener('change', function () { setState(sel.value); });
    $('viewProduction').addEventListener('click', function () { setView('production'); });
    $('viewLab').addEventListener('click', function () { setView('lab'); });
    $('resetAll').addEventListener('click', function () { if (Object.keys(changes).length) resetAll(); });
    $('fitExact').addEventListener('click', function () { fit = false; saveUi(); applyFit(); });
    $('fitWindow').addEventListener('click', function () { fit = true; saveUi(); applyFit(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-trigger]'), function (b) {
      b.addEventListener('click', function () { trigger(b.dataset.trigger); });
    });
    $('finishTyping').addEventListener('click', function () { both(function (s) { s.finishTyping(); }); });
    $('freeze').addEventListener('click', function () { frozen = !frozen; both(function (s) { s.freeze(frozen); }); $('freeze').setAttribute('aria-pressed', String(frozen)); renderStatus(); });
    $('copyChanges').addEventListener('click', function () { copy(exportChanges(), 'Changes JSON'); });
    $('copyAll').addEventListener('click', function () { copy(exportAll(), 'All values JSON'); });
    $('importBtn').addEventListener('click', function () {
      var r = importJSON($('ioText').value);
      $('ioStatus').textContent = r.ok ? 'Imported: ' + r.changed + ' value(s) differ from production.' : 'Import rejected:\n' + r.errors.join('\n');
      $('ioStatus').classList.toggle('error', !r.ok);
    });
    var tg = $('toggles');
    [['hideShell', 'Hide shell'], ['hideScene', 'Hide scene art'], ['hideBackground', 'Hide portrait background'], ['hideNpc', 'Hide receptionist'],
      ['hideRearFx', 'Hide rear FX'], ['hideFrontFx', 'Hide front FX'], ['boundsScene', 'Scene aperture bounds'], ['boundsPortrait', 'Portrait bounds'],
      ['boundsChoices', 'Choice + scrollbar bounds'], ['boundsInventory', 'Inventory bounds'], ['boundsUtility', 'Utility-button bounds'],
      ['boundsClose', 'Show X hitbox (inspector)'], ['coords', 'Show coordinates'],
      ['boundsNarration', 'Narration / description box (Narrative Study)']].forEach(function (p) {
      var l = el('label', 'tg', tg);
      var c = el('input', '', l);
      c.type = 'checkbox';
      c.id = 'tg-' + p[0];
      c.checked = toggles[p[0]];
      el('span', '', l, ' ' + p[1]);
      c.addEventListener('change', function () { toggles[p[0]] = c.checked; saveUi(); both(function (s) { s.setToggles(toggles); }); $('coords').hidden = !toggles.coords; });
    });
    $('coords').hidden = !toggles.coords;
    document.addEventListener('keydown', function (e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'p' || e.key === 'P') setView('production');
      else if (e.key === 'l' || e.key === 'L') setView('lab');
      else if (e.key === ' ') { e.preventDefault(); setView(view === 'lab' ? 'production' : 'lab'); }
    });
  }

  // Collapsible sections and remembered scroll positions (UI state, STORE_UI) ---------------------
  function setFolded(box, on) {
    var id = box.dataset.fold;
    box.classList.toggle('folded', on);
    var b = box.querySelector('.fold-head .fold');
    if (b) b.setAttribute('aria-expanded', on ? 'false' : 'true');
    if (on) folded[id] = true;
    else delete folded[id];
  }
  function initFolds() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-fold]'), function (box) {
      setFolded(box, !!folded[box.dataset.fold]);
      var b = box.querySelector('.fold-head .fold');
      b.addEventListener('click', function () { setFolded(box, !box.classList.contains('folded')); saveUi(); });
    });
  }
  function initScrolls() {
    var side = $('side');
    var area = $('stageArea');
    side.scrollTop = scrolls.side;
    area.scrollLeft = scrolls.stageX;
    area.scrollTop = scrolls.stageY;
    var t = null;
    var keep = function () {
      clearTimeout(t);
      t = setTimeout(function () { scrolls.side = side.scrollTop; scrolls.stageX = area.scrollLeft; scrolls.stageY = area.scrollTop; saveUi(); }, 150);
    };
    side.addEventListener('scroll', keep);
    area.addEventListener('scroll', keep);
  }

  // TRIGGER EVENTS: the LAB frame only (the PRODUCTION frame is the untouched comparison), shown
  // in the LAB view. No value, export or file changes.
  async function trigger(kind) {
    if (view !== 'lab') setView('lab');
    var r;
    try {
      await frameReady.lab;
      r = await frameWin('lab').LAB_STAGE.trigger(kind);
    } catch (e) { r = 'failed: ' + e.message; }
    $('triggerStatus').textContent = r === 'ok' ? kind + ': replayed' : kind + ': ' + r;
    return r;
  }

  // Public (also used by the lab's own QA) ----------------------------------------------------------
  window.POLISH_LAB = {
    labValues: function () { return Object.assign({}, changes); },
    stageInfo: function (i) {
      if (!toggles.coords) return;
      $('coords').textContent = 'x ' + i.x + '  y ' + i.y + (i.el ? '   ' + i.el + (i.rect ? ' [' + i.rect.join(', ') + ']' : '') : '');
    },
    production: function () { return Object.assign({}, prod); },
    changes: function () { return Object.assign({}, changes); },
    values: allValues,
    setValue: setValue, resetField: resetField, resetSection: resetSection, resetAll: resetAll,
    exportChanges: exportChanges, exportAll: exportAll, importJSON: importJSON,
    setView: setView, setState: setState, trigger: trigger,
    uiState: function () { return JSON.parse(JSON.stringify({ state: stateId, view: view, fit: fit, toggles: toggles, folded: folded, scrolls: scrolls })); },
    ready: function () {
      return (live || Promise.resolve()).then(function () { return pending || null; })
        .then(function () { return Promise.all([frameReady.production, frameReady.lab]); });
    },
    frame: function (mode) { return frames[mode]; }
  };

  // Boot -----------------------------------------------------------------------------------------
  async function boot() {
    load();
    frames.production = $('frameProduction');
    frames.lab = $('frameLab');
    loadFrame('production');
    await whenLoaded('production');
    // A remembered state that no longer exists falls back to the opening.
    if (!frameWin('production').LAB_STAGE.STATES.some(function (st) { return st.id === stateId; })) stateId = 'opening';
    prod = frameWin('production').LAB_FRAME.production;
    var check = TUN.validate(changes, prod);
    if (!check.ok) {
      $('ioStatus').textContent = 'Saved lab values were invalid and were dropped:\n' + check.errors.join('\n');
      changes = {};
      save();
    }
    // The owner's lab defaults, added once (TUN.OWNER_DEFAULTS); they override an older saved value.
    if (ownerDefaults !== TUN.OWNER_DEFAULTS.id) {
      var od = TUN.OWNER_DEFAULTS.values;
      if (TUN.validate(od, prod).ok) Object.keys(od).forEach(function (k) { if (od[k] === prod[k]) delete changes[k]; else changes[k] = od[k]; });
      ownerDefaults = TUN.OWNER_DEFAULTS.id;
      save();
    }
    loadFrame('lab');
    buildControls();
    buildLocked(frameWin('production'));
    buildToolbar();
    renderSummary();
    window.NARRATIVE_LAB.init({ frameWin: frameWin, view: function () { return view; }, isPreview: isPreview, stateId: function () { return stateId; }, setState: setState });
    initFolds();
    setView(view);
    window.NARRATIVE_LAB.onState(stateId);
    applyFit();
    initScrolls();
    window.addEventListener('resize', applyFit);
    await window.POLISH_LAB.ready();
    document.body.dataset.labReady = 'true';
  }
  boot().catch(function (e) { $('status').textContent = 'Lab failed to start: ' + e.message; document.body.dataset.labReady = 'error'; });
})();
