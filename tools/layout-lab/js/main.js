// Page wiring: view zoom, Clean Review, stage dragging, and the placement JSON controls.
(function () {
  'use strict';

  var lab = window.M1Lab;
  var view = 'fit'; // fit | 1x
  var scale = 1;
  var $ = function (id) { return document.getElementById(id); };

  lab.viewScale = function () {
    return scale;
  };

  function applyView() {
    var box = $('viewport');
    var stage = $('stage');
    var frame = $('stageFrame');
    // Measure with scrollbars out of the way so fit never settles on a size that needs them.
    box.style.overflow = 'hidden';
    var fit = Math.min(box.clientWidth / 1920, box.clientHeight / 1080, 1);
    scale = view === 'fit' ? fit : 1 / (window.devicePixelRatio || 1);
    box.style.overflow = '';
    stage.style.transform = scale === 1 ? '' : 'scale(' + scale + ')';
    frame.style.width = Math.ceil(1920 * scale) + 'px';
    frame.style.height = Math.ceil(1080 * scale) + 'px';
    $('viewFit').setAttribute('aria-pressed', view === 'fit');
    $('view1x').setAttribute('aria-pressed', view === '1x');
    var note = $('viewNote');
    if (scale === 1) {
      note.textContent = 'Stage at 1:1. One shell pixel is one screen pixel at 100% browser zoom.';
    } else if (view === '1x') {
      note.textContent = 'Stage at 1:1 device pixels on this ' + window.devicePixelRatio + 'x display.';
    } else {
      note.textContent = 'Fit view at ' + scale.toFixed(3) + '×. Use 1:1 to judge pixels.';
    }
    lab.renderSelection();
  }

  function setView(next) {
    view = next;
    applyView();
  }

  function setMode(next) {
    lab.mode = next;
    document.body.classList.toggle('position', next === 'position');
    $('modeInteract').setAttribute('aria-pressed', next === 'interact');
    $('modePosition').setAttribute('aria-pressed', next === 'position');
  }

  function setClean(on) {
    document.body.classList.toggle('clean', on);
    $('exitClean').hidden = !on;
    applyView();
  }

  lab.renderSelection = function () {
    var box = $('selection');
    var rect = lab.rectOf(lab.selected);
    var on = !!rect && $('toggleOutline').checked && lab.selected !== 'shell';
    box.hidden = !on;
    if (on) {
      box.style.left = rect[0] + 'px';
      box.style.top = rect[1] + 'px';
      box.style.width = rect[2] + 'px';
      box.style.height = rect[3] + 'px';
      $('selectionTag').textContent = rect[0] + ', ' + rect[1] + '  ' + rect[2] + '×' + rect[3];
      $('selectionTag').style.top = rect[1] < 20 ? '2px' : '-16px';
    }
  };

  // Called after any edit: redraw, refresh the sidebar, keep the session.
  lab.commit = function () {
    lab.normalize();
    lab.renderAll();
    lab.syncSidebar();
    lab.renderSelection();
    lab.renderWarnings();
    lab.updateSaveState();
    lab.save();
  };

  lab.updateSaveState = function () {
    var now = lab.exportJson();
    var node = $('saveState');
    var state = 'unexported';
    if (now === JSON.stringify(lab.ordered(lab.baseline), null, 2) + '\n') state = 'baseline';
    else if (now === lab.lastExport) state = 'exported';
    node.dataset.state = state;
    node.textContent = {
      baseline: 'At the original baseline.',
      exported: 'All changes exported.',
      unexported: 'Changes not exported yet. Autosaved in this browser.'
    }[state];
  };

  // Position mode ---------------------------------------------------------------
  function bindStagePositioning() {
    var stage = $('stage');
    var drag = null;

    stage.addEventListener('pointerdown', function (e) {
      if (lab.mode !== 'position') return;
      var node = e.target.closest('[data-comp]');
      if (!node) return;
      e.preventDefault();
      lab.select(node.dataset.comp);
      $('advancedTools').open = true;
      $('inspectorBox').open = true;
      stage.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, moved: [0, 0] };
    }, true);
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var total = [Math.round((e.clientX - drag.x) / scale), Math.round((e.clientY - drag.y) / scale)];
      var dx = total[0] - drag.moved[0];
      var dy = total[1] - drag.moved[1];
      if (!dx && !dy) return;
      drag.moved = total;
      lab.moveSelected(dx, dy);
    });
    var end = function () { drag = null; };
    stage.addEventListener('pointerup', end);
    stage.addEventListener('pointercancel', end);
  }

  function bindKeys() {
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('clean')) {
        setClean(false);
        return;
      }
      var tag = (e.target.tagName || '').toLowerCase();
      if (lab.mode !== 'position' || tag === 'input' || tag === 'textarea' || tag === 'select') return;
      var steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      var step = steps[e.key];
      if (!step) return;
      e.preventDefault();
      var size = e.shiftKey ? 5 : 1;
      lab.moveSelected(step[0] * size, step[1] * size);
    });
  }

  // Placement JSON ---------------------------------------------------------------
  function status(text, cls) {
    var node = $('jsonStatus');
    node.textContent = text;
    node.className = 'note ' + (cls || '');
  }

  function loadPlacement(next) {
    lab.state = next;
    lab.rt.choiceScroll = 0;
    lab.rt.inventoryStart = 0;
    lab.commit();
    lab.startSpeech();
  }

  lab.importText = function (text) {
    try {
      loadPlacement(lab.parsePlacement(text));
      status('Placement imported.', 'good');
      return true;
    } catch (err) {
      status(err.message, 'bad');
      return false;
    }
  };

  function bindJson() {
    $('copyJson').addEventListener('click', function () {
      var text = lab.exportJson();
      $('jsonBox').value = text;
      if (!navigator.clipboard) {
        status('Clipboard is unavailable here. The JSON is in the box below.');
        return;
      }
      lab.markExported();
      lab.updateSaveState();
      navigator.clipboard.writeText(text).then(
        function () { status('Copied.', 'good'); },
        function () { status('Clipboard was refused. The JSON is in the box below.'); }
      );
    });
    $('downloadJson').addEventListener('click', function () {
      lab.download('m1-ui-placement.json', new Blob([lab.exportJson()], { type: 'application/json' }));
      lab.markExported();
      lab.updateSaveState();
      status('Downloaded m1-ui-placement.json.', 'good');
    });
    $('importJson').addEventListener('click', function () {
      var text = $('jsonBox').value.trim();
      if (text) lab.importText(text);
      else $('importFile').click();
    });
    $('importFile').addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      file.text().then(function (text) {
        lab.importText(text);
        e.target.value = '';
      });
    });
    var beforeReset = null;
    $('resetAll').addEventListener('click', function () {
      beforeReset = lab.exportJson();
      var exported = lab.lastExport;
      lab.clearSaved();
      lab.lastExport = '';
      loadPlacement(lab.clone(lab.baseline));
      lab.clearSaved();
      lab.lastExport = exported;
      $('undoReset').hidden = beforeReset === lab.exportJson();
      status('Back at the baseline placement.', 'good');
    });
    $('undoReset').addEventListener('click', function () {
      loadPlacement(lab.parsePlacement(beforeReset));
      $('undoReset').hidden = true;
      status('Reset undone.', 'good');
    });
    $('saveSnapshot').addEventListener('click', function () {
      status('Saving snapshot...');
      lab.saveSnapshot().then(function (message) {
        status(message, /failed/.test(message) ? 'bad' : 'good');
      });
    });
  }

  function bindToolbar() {
    $('modeInteract').addEventListener('click', function () { setMode('interact'); });
    $('modePosition').addEventListener('click', function () { setMode('position'); });
    $('viewFit').addEventListener('click', function () { setView('fit'); });
    $('view1x').addEventListener('click', function () { setView('1x'); });
    $('cleanReview').addEventListener('click', function () { setClean(true); });
    $('exitClean').addEventListener('click', function () { setClean(false); });
    $('toggleGrid').addEventListener('change', function (e) { $('grid').hidden = !e.target.checked; });
    $('toggleGuides').addEventListener('change', function (e) { $('guides').hidden = !e.target.checked; });
    $('toggleOutline').addEventListener('change', lab.renderSelection);
    $('toggleWarnings').addEventListener('change', lab.renderWarnings);
    $('backdrop').addEventListener('change', function (e) { $('stage').dataset.backdrop = e.target.value; });
    $('tree').addEventListener('click', function (e) {
      var b = e.target.closest('[data-select]');
      if (b) lab.select(b.dataset.select);
    });
    window.addEventListener('resize', applyView);
  }

  lab.setClean = setClean;
  lab.setView = setView;
  lab.setMode = setMode;

  lab.loadSprites().then(function () {
    var restored = lab.restore();
    lab.normalize();
    lab.buildStage();
    lab.buildGuides();
    bindToolbar();
    bindStagePositioning();
    bindKeys();
    bindJson();
    setMode('interact');
    lab.buildTuning();
    lab.buildSidebar();
    lab.onChoiceScroll = lab.renderSelection;
    lab.renderWarnings();
    lab.updateSaveState();
    applyView();
    if (restored) status('Restored your last session. Reset returns to the baseline.');
    document.body.dataset.ready = 'true';
  }).catch(function (err) {
    console.error(err);
    document.body.dataset.ready = 'error';
    $('jsonStatus').textContent = err.message;
  });
})();
