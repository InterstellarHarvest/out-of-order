// NARRATIVE STUDY panel on the lab page (docs/68). EXPERIMENTAL PREVIEW VALUES, kept apart from the
// production tunables in every way:
//   - their own registry (narrative-study.js), defaults that are the study's starting point, not
//     production values (the production game has no narrative mode);
//   - their own localStorage key (NARRATIVE_STUDY.STORE), never touched by RESET ALL TO PRODUCTION,
//     and RESET NARRATIVE STUDY never touches the production tunables or the lab UI state;
//   - their own export schema (cyoa-m2-narrative-study-v1), never inside COPY CHANGES / COPY ALL.
// The stage frames get the values from memory (NARRATIVE_LAB.values), never from storage.
(function () {
  'use strict';

  var NS = window.NARRATIVE_STUDY;
  var $ = function (id) { return document.getElementById(id); };
  var changes = {};
  var rows = {};
  var api = null; // from lab.js: { frameWin(mode), view(), isPreview(id), stateId() }
  var infoTimer = null;

  function el(tag, cls, parent, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; if (parent) parent.appendChild(n); return n; }

  // Storage -------------------------------------------------------------------------------------
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(NS.STORE) || 'null');
      if (s && s.schema === NS.SCHEMA && s.changes && NS.validate(s.changes).ok) changes = s.changes;
    } catch (e) { /* unreadable: start from the study defaults */ }
  }
  function save() {
    try {
      if (Object.keys(changes).length) localStorage.setItem(NS.STORE, JSON.stringify({ schema: NS.SCHEMA, changes: changes }));
      else localStorage.removeItem(NS.STORE);
    } catch (e) { /* storage blocked: this session only */ }
  }

  // Values --------------------------------------------------------------------------------------
  var DEF = NS.defaults();
  function valueOf(k) { return k in changes ? changes[k] : DEF[k]; }
  function values() { var o = {}; NS.LIST.forEach(function (t) { o[t.key] = valueOf(t.key); }); return o; }
  function setValue(key, v, quiet) {
    var t = NS.byKey[key];
    v = Math.round(Number(v));
    if (!t || !Number.isFinite(v)) return;
    v = NS.constrain(key, Math.min(t.max, Math.max(t.min, v)), valueOf);
    if (v === DEF[key]) delete changes[key];
    else changes[key] = v;
    save();
    renderRow(key);
    renderSummary();
    if (!quiet) apply();
  }
  function reset() {
    changes = {};
    save();
    NS.LIST.forEach(function (t) { renderRow(t.key); });
    renderSummary();
    apply();
  }
  // Live in the LAB frame only; the PRODUCTION frame keeps the study defaults for comparison.
  function apply() {
    try {
      var w = api.frameWin('lab');
      if (w && w.NARRATIVE_STAGE) return w.NARRATIVE_STAGE.applyValues(values());
    } catch (e) { /* the frame is reloading: it reads the values when it boots */ }
    return 'reload';
  }

  // Export / import -----------------------------------------------------------------------------
  function ordered(map) { var o = {}; NS.LIST.forEach(function (t) { if (t.key in map) o[t.key] = map[t.key]; }); return o; }
  var NOTE = 'EXPERIMENTAL Narrative Study preview values (lab only). Not production tunables; not implemented in the game.';
  function exportChanges() { return JSON.stringify({ schema: NS.SCHEMA, note: NOTE, changes: ordered(changes) }, null, 2); }
  function exportAll() { return JSON.stringify({ schema: NS.SCHEMA, note: NOTE, values: values() }, null, 2); }
  function importJSON(text) {
    var data;
    try { data = JSON.parse(text); } catch (e) { return { ok: false, errors: ['not valid JSON: ' + e.message] }; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { ok: false, errors: ['expected an object'] };
    if (data.schema !== NS.SCHEMA) return { ok: false, errors: ['schema must be ' + NS.SCHEMA + ' (got ' + JSON.stringify(data.schema) + '). Production lab exports are imported in Export / import, not here.'] };
    var extra = Object.keys(data).filter(function (k) { return ['schema', 'note', 'changes', 'values'].indexOf(k) === -1; });
    if (extra.length) return { ok: false, errors: ['unknown top-level fields: ' + extra.join(', ')] };
    var map = data.changes || data.values;
    if (!map) return { ok: false, errors: ['expected "changes" or "values"'] };
    var check = NS.validate(map);
    if (!check.ok) return check;
    changes = {};
    Object.keys(map).forEach(function (k) { if (map[k] !== DEF[k]) changes[k] = map[k]; });
    save();
    NS.LIST.forEach(function (t) { renderRow(t.key); });
    renderSummary();
    apply();
    return { ok: true, errors: [], changed: Object.keys(changes).length };
  }
  function copy(text, note) {
    $('narrIo').value = text;
    var done = function (ok) { $('narrIoStatus').textContent = ok ? note + ' copied to the clipboard (also shown below).' : note + ' shown below: select and copy it.'; };
    try { navigator.clipboard.writeText(text).then(function () { done(true); }, function () { $('narrIo').select(); done(false); }); } catch (e) { $('narrIo').select(); done(false); }
  }

  // UI ------------------------------------------------------------------------------------------
  function build() {
    var box = $('narrControls');
    box.textContent = '';
    NS.SECTIONS.forEach(function (sec) {
      var s = el('section', 'sec', box);
      s.id = 'nsec-' + sec.id;
      s.dataset.fold = 'nsec-' + sec.id;
      var head = el('div', 'sec-head fold-head', s);
      var fb = el('button', 'fold', el('h3', '', head), sec.title);
      fb.type = 'button';
      el('span', 'sec-count', head).id = 'ncount-' + sec.id;
      NS.LIST.filter(function (t) { return t.s === sec.id; }).forEach(function (t) {
        var row = el('div', 'row', s);
        row.dataset.nkey = t.key;
        var lab = el('label', 'lbl', row, t.label);
        lab.title = t.key + ' (Narrative Study, experimental)';
        el('span', 'prod', row, 'study ' + DEF[t.key]).title = 'Study default (not a production value)';
        var minus = el('button', 'step', row, '-'); minus.type = 'button';
        var input = el('input', 'num', row);
        input.type = 'number'; input.step = '1'; input.min = t.min; input.max = t.max;
        input.setAttribute('aria-label', t.label);
        var plus = el('button', 'step', row, '+'); plus.type = 'button';
        var unit = el('span', 'unit', row, t.unit || '');
        var rs = el('button', 'small', row, 'reset'); rs.type = 'button';
        var slider = el('input', 'slider', row);
        slider.type = 'range'; slider.min = t.min; slider.max = t.max; slider.step = '1';
        slider.setAttribute('aria-label', t.label + ' slider');
        var hint = el('span', 'hint', row, t.options ? '' : t.min + '..' + t.max);
        minus.addEventListener('click', function () { setValue(t.key, valueOf(t.key) - 1); });
        plus.addEventListener('click', function () { setValue(t.key, valueOf(t.key) + 1); });
        input.addEventListener('change', function () { setValue(t.key, input.value); });
        slider.addEventListener('input', function () { setValue(t.key, slider.value); });
        rs.addEventListener('click', function () { setValue(t.key, DEF[t.key]); });
        rows[t.key] = { row: row, input: input, slider: slider, unit: unit, hint: hint };
        renderRow(t.key);
      });
    });
    $('narrCopyChanges').addEventListener('click', function () { copy(exportChanges(), 'Narrative Study changes JSON'); });
    $('narrCopyAll').addEventListener('click', function () { copy(exportAll(), 'All Narrative Study values JSON'); });
    $('narrImport').addEventListener('click', function () {
      var r = importJSON($('narrIo').value);
      $('narrIoStatus').textContent = r.ok ? 'Imported: ' + r.changed + ' value(s) differ from the study defaults.' : 'Import rejected:\n' + r.errors.join('\n');
      $('narrIoStatus').classList.toggle('error', !r.ok);
    });
    $('narrReset').addEventListener('click', function () { if (Object.keys(changes).length) reset(); });
    $('narrRestart').addEventListener('click', function () { if (api.isPreview(api.stateId())) api.setState(api.stateId()); });
    renderSummary();
  }
  function renderRow(key) {
    var r = rows[key];
    if (!r) return;
    var v = valueOf(key);
    var t = NS.byKey[key];
    if (document.activeElement !== r.input) r.input.value = v;
    r.slider.value = v;
    r.row.classList.toggle('changed', key in changes);
    r.row.dataset.value = v;
    if (t.options) r.unit.textContent = t.options[v];
  }
  function renderSummary() {
    var n = Object.keys(changes).length;
    $('narrSummary').textContent = n ? n + ' study value' + (n === 1 ? '' : 's') + ' changed from the study defaults' : 'All study values = study defaults';
    $('narrSummary').classList.toggle('changed', n > 0);
    NS.SECTIONS.forEach(function (sec) {
      var c = NS.LIST.filter(function (t) { return t.s === sec.id && t.key in changes; }).length;
      var node = $('ncount-' + sec.id);
      if (node) node.textContent = c ? c + ' changed' : '';
      var b = $('nsec-' + sec.id);
      if (b) b.classList.toggle('changed', c > 0);
    });
  }

  // Header: in a preview state the two frames are the study at its DEFAULTS and at the LAB + STUDY
  // values; neither is "the production game", so the buttons say so.
  function onState(id) {
    var preview = api.isPreview(id);
    document.body.dataset.narrativePreview = preview ? 'true' : 'false';
    $('narrBadge').hidden = !preview;
    $('viewProduction').textContent = preview ? 'STUDY DEFAULTS' : 'PRODUCTION';
    $('viewLab').textContent = preview ? 'LAB + STUDY VALUES' : 'LAB';
    $('viewProduction').title = preview ? 'Production tunables + Narrative Study defaults (experimental preview)' : 'The production game, untouched';
    $('viewLab').title = preview ? 'Lab tunables + current Narrative Study values (experimental preview)' : 'The production game with the lab values';
    clearInterval(infoTimer);
    renderInfo();
    if (preview) infoTimer = setInterval(renderInfo, 300);
  }
  function renderInfo() {
    var out = $('narrInfo');
    var w;
    try { w = api.frameWin(api.view()); } catch (e) { w = null; }
    var i = w && w.NARRATIVE_STAGE ? w.NARRATIVE_STAGE.info() : null;
    if (!i || !i.active) { out.textContent = api.isPreview(api.stateId()) ? 'Loading the preview...' : 'No Narrative Study state on show. Pick one in State (group "Narrative Study").'; return; }
    out.textContent = (i.mode === 'B' ? 'Narrative B' : 'Focus A') + ' - ' + i.node + ' - page ' + (i.page + 1) + ' / ' + i.pages + ' - ' + i.lines + ' of ' + i.capacity + ' lines'
      + (i.revealed ? '' : ' - revealing') + '\nchoices: ' + JSON.parse(i.kinds).map(function (k) { return k[0] + ' (' + k[1] + ')'; }).join(', ');
  }

  // A card taken by hand in one frame is taken in the other frame too, once it stands at the same
  // point, so PRODUCTION / LAB flips keep comparing the same moment.
  function echo(fromMode, id, node, page) {
    var other = fromMode === 'lab' ? 'production' : 'lab';
    try {
      var w = api.frameWin(other);
      if (w && w.NARRATIVE_STAGE) w.NARRATIVE_STAGE.take(id, { wait: true, node: node, page: page });
    } catch (e) { /* the other frame is loading */ }
  }
  // Takes a card in BOTH frames (the panel's and QA's way to step the preview).
  function take(id) {
    return Promise.all(['production', 'lab'].map(function (m) {
      try { var w = api.frameWin(m); return w && w.NARRATIVE_STAGE ? w.NARRATIVE_STAGE.take(id) : 'no frame'; } catch (e) { return 'failed'; }
    }));
  }

  window.NARRATIVE_LAB = {
    values: values, changes: function () { return Object.assign({}, changes); }, defaults: function () { return NS.defaults(); },
    setValue: setValue, reset: reset, exportChanges: exportChanges, exportAll: exportAll, importJSON: importJSON,
    echo: echo, take: take, onState: onState,
    init: function (a) { api = a; build(); }
  };
  // Read at once: the LAB frame asks for the values while it boots, before the panel is built.
  load();
})();
