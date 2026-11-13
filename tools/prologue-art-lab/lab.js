// Controls only. The iframe loads the real M2 game and lab-stage driver.
(function () {
  'use strict';
  var M = window.PROLOGUE_ART;
  var frame = document.getElementById('gameFrame');
  var api = (window.PROLOGUE_LAB = {});
  var ready = false;
  var fit = true;
  var $ = function (id) { return document.getElementById(id); };
  var sceneSelect = $('scene');
  var portraitSelect = $('portrait');
  var itemSelect = $('item');
  var status = $('status');

  function addOptions(select, rows) {
    rows.forEach(function (r) {
      var option = document.createElement('option');
      option.value = r.id;
      option.textContent = r.title + (r.status === 'generated' ? ' [DRAFT]' : r.status === 'reused' ? ' [M2]' : '');
      select.appendChild(option);
    });
  }
  addOptions(sceneSelect, M.scenes);
  addOptions(portraitSelect, [{ id: 'auto', title: 'Auto (match scene)' }].concat(M.portraits));
  addOptions(itemSelect, M.items);
  sceneSelect.value = 'workplace/applause_station';
  portraitSelect.value = 'auto';
  itemSelect.value = M.items[0].id;

  function stage() {
    if (!ready) throw new Error('Stage is not ready yet.');
    return frame.contentWindow.PROLOGUE_STAGE;
  }
  function label(row) { return row && row.title || ''; }
  function onState(s) {
    var scene = M.scenes.filter(function (r) { return r.id === s.scene; })[0];
    $('sceneLabel').textContent = label(scene);
    $('inventoryStart').value = String(s.inventoryStart);
    $('invLabel').textContent = 'Showing slots ' + (s.inventoryStart + 1) + '–' + Math.min(s.inventoryStart + 7, s.inventory.length) +
      ' of ' + s.inventory.length + ' items, using the approved seven-slot strip and built-in arrows.';
    var p = M.portraits.filter(function (r) { return r.id === s.activePortrait; })[0];
    $('pairing').textContent = s.matched ? 'Portrait pairing matches this scene.' :
      ('Composition comparison only: ' + label(p) + ' is not authored for ' + label(scene) + '.');
    $('previewStatus').textContent = s.inspector ? 'Inspector: ' + s.inspector : 'Review only — no production changes';
  }
  function run(method) {
    if (!ready) return;
    try {
      var args = Array.prototype.slice.call(arguments, 1);
      var result = stage()[method].apply(null, args);
      onState(result);
      status.textContent = 'Ready · 7 generated scenes · 2 drone poses · 9 draft items · approved reception';
    } catch (e) {
      status.textContent = 'Review action failed: ' + (e.message || e);
      document.body.dataset.error = 'true';
      console.error(e);
    }
  }
  api.setScene = function (id) {
    sceneSelect.value = id;
    run('setScene', id);
  };
  api.setPortrait = function (id) {
    portraitSelect.value = id;
    run('setPortrait', id);
  };
  api.openItem = function (id) {
    itemSelect.value = id;
    run('openInspector', id);
  };
  api.closeItem = function () { run('closeInspector'); };
  api.setInventoryStart = function (n) { run('setInventoryStart', n); };
  api.setLayers = function (v) { run('setLayers', v); };
  api.ready = function () { return ready; };
  api.state = function () { return stage().status(); };

  sceneSelect.addEventListener('change', function () { run('setScene', sceneSelect.value); });
  portraitSelect.addEventListener('change', function () { run('setPortrait', portraitSelect.value); });
  $('jumpReception').addEventListener('click', function () {
    api.setScene('exposition/reception');
    api.setPortrait('auto');
  });
  function layers() {
    run('setLayers', {
      background: $('showBg').checked,
      foreground: $('showPose').checked,
      dx: Number($('offsetX').value),
      dy: Number($('offsetY').value)
    });
  }
  ['showBg', 'showPose', 'offsetX', 'offsetY'].forEach(function (id) {
    $(id).addEventListener('change', layers);
  });
  $('resetOffset').addEventListener('click', function () {
    $('offsetX').value = '0';
    $('offsetY').value = '0';
    layers();
  });
  $('inventoryStart').addEventListener('input', function () {
    run('setInventoryStart', Number($('inventoryStart').value));
  });
  $('invPrev').addEventListener('click', function () { run('setInventoryStart', Number($('inventoryStart').value) - 1); });
  $('invNext').addEventListener('click', function () { run('setInventoryStart', Number($('inventoryStart').value) + 1); });
  itemSelect.addEventListener('change', function () { api.openItem(itemSelect.value); });
  $('openItem').addEventListener('click', function () { api.openItem(itemSelect.value); });
  $('closeItem').addEventListener('click', api.closeItem);
  $('openNotes').addEventListener('click', function () { run('toggleOverlay', 'notes'); });
  $('openFiles').addEventListener('click', function () { run('toggleOverlay', 'files'); });

  function resize() {
    var pane = $('stageViewport');
    var scale = fit ? Math.min((pane.clientWidth - 26) / 1920, (pane.clientHeight - 26) / 1080, 1) : 1;
    scale = Math.max(.1, scale);
    $('stageWrap').style.width = (1920 * scale) + 'px';
    $('stageWrap').style.height = (1080 * scale) + 'px';
    frame.style.transform = 'scale(' + scale + ')';
    $('fitView').setAttribute('aria-pressed', fit ? 'true' : 'false');
    $('oneToOne').setAttribute('aria-pressed', fit ? 'false' : 'true');
  }
  $('fitView').addEventListener('click', function () { fit = true; resize(); });
  $('oneToOne').addEventListener('click', function () { fit = false; resize(); });
  window.addEventListener('resize', resize);
  resize();

  (function poll(start) {
    var win = frame.contentWindow;
    var driver = win && win.PROLOGUE_STAGE;
    if (driver && driver.ready) {
      ready = true;
      document.body.dataset.labReady = 'true';
      status.textContent = 'Ready · 7 generated scenes · 2 drone poses · 9 draft items · approved reception';
      onState(driver.status());
      return;
    }
    if (driver && driver.error) {
      document.body.dataset.labReady = 'error';
      document.body.dataset.error = 'true';
      status.textContent = 'Stage failed: ' + driver.error;
      return;
    }
    if (Date.now() - start > 40000) {
      document.body.dataset.labReady = 'error';
      document.body.dataset.error = 'true';
      status.textContent = 'Stage preload timed out. Serve from repository root and inspect the console.';
      return;
    }
    setTimeout(function () { poll(start); }, 70);
  })(Date.now());
})();
