// The polish lab's value controls, shared by the production tunables (lab.js) and the Narrative
// Study (narrative-study-panel.js). One widget per kind of value (owner, 2026-11-08: not every value
// is a slider):
//   nudge  - a pixel position, size or count: a slider to drag and watch live, plus [-] [box] [+]
//            for exact whole steps (Shift: 10 at a time);
//   slider - a wide range felt by eye, such as a timing: a slider with an exact box beside it;
//   radio  - one of a few named choices, all visible at once;
//   select - one of many named choices, in a dropdown;
//   check  - on / off (values 0 / 1).
// The reference value (production, or the study default) is shown on every row; a row's own reset
// appears only when the row is changed.
(function () {
  'use strict';

  function el(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function kindOf(t) {
    if (t.control) return t.control;
    if (t.options) return Object.keys(t.options).length >= 4 ? 'select' : 'radio';
    return t.unit === 'ms' || t.unit === 'cps' ? 'slider' : 'nudge';
  }
  // Option values in the registry's own order (an object's integer keys would sort ascending).
  function optionKeys(t) { return t.order || Object.keys(t.options).map(Number); }
  var uid = 0;

  // t: the registry entry. o: { min, max, ref, refName, attr, onSet(v), onReset() }.
  // Returns { row, kind, render(value, changed) }.
  function build(parent, t, o) {
    var kind = kindOf(t);
    var id = 'ctl-' + (++uid);
    var row = el('div', 'row ctl-' + kind, parent);
    row.dataset[o.attr] = t.key;
    row.dataset.control = kind;
    var parts = { row: row };
    var refText = function (v) {
      if (kind === 'check') return o.refName + ' ' + (v ? 'on' : 'off');
      return o.refName + ' ' + v;
    };

    if (kind === 'check') {
      var cl = el('label', 'lbl', row);
      parts.check = el('input', '', cl);
      parts.check.type = 'checkbox';
      el('span', '', cl, ' ' + t.label);
      parts.check.addEventListener('change', function () { o.onSet(parts.check.checked ? 1 : 0); });
    } else {
      var lab = el('label', 'lbl', row, t.label);
      if (kind !== 'radio') lab.htmlFor = id;
    }
    row.querySelector('.lbl').title = t.key + (t.src ? '  <-  ' + t.src : '');
    if (kind !== 'radio' && kind !== 'select') {
      parts.ref = el('span', 'prod', row, refText(o.ref));
      parts.ref.title = o.refName === 'prod' ? 'Production value' + (t.src ? ' (' + t.src + ')' : '') : 'Study default (not a production value)';
    }

    if (kind === 'nudge' || kind === 'slider') {
      var box = el('span', 'numbox', row);
      if (kind === 'nudge') {
        parts.minus = el('button', 'step minus', box, '-');
        parts.minus.type = 'button';
        parts.minus.title = 'Down 1 (Shift: 10)';
      }
      parts.input = el('input', 'num', box);
      parts.input.id = id;
      parts.input.type = 'number';
      parts.input.step = '1';
      parts.input.min = o.min;
      parts.input.max = o.max;
      parts.input.title = 'Range ' + o.min + '..' + o.max;
      if (kind === 'nudge') {
        parts.plus = el('button', 'step plus', box, '+');
        parts.plus.type = 'button';
        parts.plus.title = 'Up 1 (Shift: 10)';
        var nudge = function (d) { return function (e) { o.onSet(o.value() + d * (e.shiftKey ? 10 : 1)); }; };
        parts.minus.addEventListener('click', nudge(-1));
        parts.plus.addEventListener('click', nudge(1));
      }
      parts.unit = el('span', 'unit', row, t.unit || '');
      parts.input.addEventListener('change', function () { o.onSet(parts.input.value); });
    }

    if (kind === 'select') {
      parts.select = el('select', 'pick', row);
      parts.select.id = id;
      optionKeys(t).forEach(function (k) {
        var opt = el('option', '', parts.select, t.options[k] + (k === o.ref ? '  (' + o.refName + ')' : ''));
        opt.value = String(k);
      });
      parts.select.addEventListener('change', function () { o.onSet(Number(parts.select.value)); });
    }

    parts.reset = el('button', 'small reset', row, 'reset');
    parts.reset.type = 'button';
    parts.reset.title = 'Back to the ' + (o.refName === 'prod' ? 'production value' : 'study default');
    parts.reset.addEventListener('click', o.onReset);

    if (kind === 'slider' || kind === 'nudge') {
      el('span', 'break', row); // the slider and its reset take the second line
      parts.slider = el('input', 'slider', row);
      parts.slider.type = 'range';
      parts.slider.min = o.min;
      parts.slider.max = o.max;
      parts.slider.step = '1';
      parts.slider.setAttribute('aria-label', t.label + ' slider');
      parts.slider.addEventListener('input', function () { o.onSet(parts.slider.value); });
    }

    if (kind === 'radio') {
      var group = el('div', 'opts', row);
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', t.label);
      parts.radios = {};
      optionKeys(t).forEach(function (k) {
        var l = el('label', 'opt', group);
        var r = el('input', '', l);
        r.type = 'radio';
        r.name = id;
        r.value = String(k);
        if (t.swatches) el('span', 'swatch', l).style.background = t.swatches[k];
        el('span', '', l, t.options[k]);
        if (k === o.ref) el('span', 'ref-tag', l, o.refName);
        r.addEventListener('change', function () { if (r.checked) o.onSet(k); });
        parts.radios[k] = r;
      });
    }

    function render(v, changed) {
      row.classList.toggle('changed', !!changed);
      row.dataset.value = v;
      parts.reset.style.visibility = changed ? 'visible' : 'hidden';
      if (parts.input && document.activeElement !== parts.input) parts.input.value = v;
      if (parts.slider) parts.slider.value = v;
      if (parts.check) parts.check.checked = !!v;
      if (parts.select) parts.select.value = String(v);
      if (parts.radios) Object.keys(parts.radios).forEach(function (k) { parts.radios[k].checked = Number(k) === v; });
      if (parts.unit && t.unit === 'cps') parts.unit.textContent = v > 0 ? 'cps (' + Math.round(1000 / v) + ' ms/char)' : 'cps (all at once)';
    }
    return { row: row, kind: kind, parts: parts, render: render };
  }

  window.LAB_CONTROLS = { build: build, kindOf: kindOf };
})();
