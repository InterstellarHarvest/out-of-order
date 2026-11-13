// REVIEW LAB ONLY. Display selectors drive the REAL M2 renderer, not a re-created shell.
// Narrative-state writes here are disposable preview fixtures inside this isolated iframe.
(function () {
  'use strict';
  var G = window.CYOA_GAME;
  var M = window.PROLOGUE_ART;
  var api = (window.PROLOGUE_STAGE = {});
  var state = {
    scene: 'workplace/applause_station',
    portrait: 'auto',
    item: null,
    background: true,
    foreground: true,
    dx: 0,
    dy: 0
  };
  var ids = M.items.map(function (item) { return item.id; });
  var lookup = function (arr, id) {
    return arr.filter(function (row) { return row.id === id; })[0] || null;
  };
  function image(key) {
    var v = G.image(key);
    if (!v || !v.complete || !v.naturalWidth) throw new Error('Missing decoded art: ' + key);
    return v;
  }
  function pairedPortrait(sceneId) {
    if (sceneId === 'workplace/corridor') return 'drone-closed';
    if (sceneId === 'exposition/reception') return 'receptionist';
    return 'none';
  }
  function activePortrait() {
    return state.portrait === 'auto' ? pairedPortrait(state.scene) : state.portrait;
  }
  function applyScene() {
    var scene = lookup(M.scenes, state.scene);
    if (!scene) throw new Error('Unknown review scene: ' + state.scene);
    var src = image('prologue:scene:' + scene.id);
    // Keep the production image element, aperture and approved nearest-neighbour 4x size.
    G.els.sceneArt.src = src.src;
    G.els.sceneArt.width = 314 * 4;
    G.els.sceneArt.height = 206 * 4;
    G.els.scene.setAttribute('aria-label', scene.title);
  }
  function applyPortrait() {
    var id = activePortrait();
    var bg = G.els.portraitBackground;
    var fg = G.els.portraitNpc;
    if (id === 'none') {
      bg.style.visibility = 'hidden';
      fg.style.visibility = 'hidden';
      G.els.portrait.setAttribute('aria-label', 'No character portrait in this review scene');
      return;
    }
    var p = lookup(M.portraits, id);
    if (!p) throw new Error('Unknown portrait: ' + id);
    var background = image('prologue:bg:' + id);
    var foreground = image('prologue:pose:' + id);
    bg.src = background.src;
    fg.src = foreground.src;
    var offset = G.TUNING.portrait;
    // The approved receptionist retains its tuned offsets. The separately authored
    // corridor and drone use their own matching 0,0 canvas origins by default.
    var rx = p.type === 'reception' ? offset.backgroundX : 0;
    var ry = p.type === 'reception' ? offset.backgroundY : 0;
    var fx = p.type === 'reception' ? offset.npcX : 0;
    var fy = p.type === 'reception' ? offset.npcY : 0;
    bg.style.left = rx + 'px';
    bg.style.top = ry + 'px';
    fg.style.left = (fx + state.dx) + 'px';
    fg.style.top = (fy + state.dy) + 'px';
    bg.style.visibility = state.background ? 'visible' : 'hidden';
    fg.style.visibility = state.foreground ? 'visible' : 'hidden';
    G.els.portrait.setAttribute('aria-label', p.title);
  }
  function refresh() {
    applyScene();
    applyPortrait();
    G.renderAll();
  }

  api.setScene = function (id) {
    if (!lookup(M.scenes, id)) throw new Error('Unknown scene ' + id);
    state.scene = id;
    if (G.ui.inspector) api.closeInspector();
    refresh();
    return api.status();
  };
  api.setPortrait = function (id) {
    if (id !== 'auto' && !lookup(M.portraits, id)) throw new Error('Unknown portrait ' + id);
    state.portrait = id;
    applyPortrait();
    return api.status();
  };
  api.setLayers = function (options) {
    if (typeof options.background === 'boolean') state.background = options.background;
    if (typeof options.foreground === 'boolean') state.foreground = options.foreground;
    if (Number.isInteger(options.dx) && Math.abs(options.dx) <= 40) state.dx = options.dx;
    if (Number.isInteger(options.dy) && Math.abs(options.dy) <= 40) state.dy = options.dy;
    applyPortrait();
    return api.status();
  };
  api.setInventoryStart = function (start) {
    var n = Math.max(0, ids.length - G.layout.inventory.slotCount);
    G.ui.inv.slide = null;
    G.ui.inv.start = Math.max(0, Math.min(n, Math.round(start)));
    G.renderInventory();
    return api.status();
  };
  api.openInspector = function (id) {
    if (!lookup(M.items, id)) throw new Error('Unknown item ' + id);
    // The same production G.renderInspector / G.renderUtility path as clicking a real slot.
    // Direct presentation state avoids travelling through a non-canonical narrative route.
    state.item = id;
    G.ui.selected = id;
    G.ui.inspector = { id: id, scroll: 0, height: 0 };
    G.ui.overlay = null;
    G.renderAll();
    return api.status();
  };
  api.closeInspector = function () {
    state.item = null;
    G.ui.inspector = null;
    G.renderAll();
    return api.status();
  };
  api.toggleOverlay = function (kind) {
    if (kind !== 'notes' && kind !== 'files' && kind !== null) throw new Error('Unknown overlay');
    if (G.ui.inspector) api.closeInspector();
    G.ui.overlay = kind === G.ui.overlay ? null : kind;
    G.ui.overlayScroll = 0;
    G.renderOverlay();
    return api.status();
  };
  api.status = function () {
    return {
      ready: !!api.ready,
      scene: state.scene,
      portrait: state.portrait,
      activePortrait: activePortrait(),
      inspector: G.ui.inspector ? G.ui.inspector.id : null,
      inventory: G.state.inventory.slice(),
      inventoryStart: G.ui.inv.start,
      visibleSlots: G.layout.inventory.slotCount,
      sceneNatural: [G.els.sceneArt.naturalWidth, G.els.sceneArt.naturalHeight],
      sceneDisplayed: [G.els.sceneArt.width, G.els.sceneArt.height],
      portraitNatural: activePortrait() === 'none' ? null : [G.els.portraitNpc.naturalWidth, G.els.portraitNpc.naturalHeight],
      matched: activePortrait() === 'none' || (lookup(M.portraits, activePortrait()) || {}).scene === state.scene
    };
  };

  function until(test, label, timeout) {
    return new Promise(function (resolve, reject) {
      var start = performance.now();
      function check() {
        if (test()) return resolve();
        if (performance.now() - start > timeout) return reject(new Error('Prologue lab timed out: ' + label));
        requestAnimationFrame(check);
      }
      check();
    });
  }
  (async function boot() {
    try {
      await until(function () { return document.body.dataset.ready === 'true' || document.body.dataset.ready === 'error'; }, 'production images', 30000);
      if (document.body.dataset.ready === 'error') throw new Error(document.body.dataset.error || 'game asset preload');
      // Let the REAL production flow reach its stable choosing state, then leave its story
      // untouched except for disposable inventory fixtures. No fake scene progression.
      if (G.flow.phase === 'typing') G.flow.skip();
      await until(function () { return G.flow.phase === 'choosing' && !G.ui.motion; }, 'stable production stage', 12000);
      G.state.inventory = ids.slice();
      G.flow.syncInventory();
      G.clearNotices();
      G.ui.inv.start = 0;
      G.ui.inv.slide = null;
      G.ui.inspector = null;
      G.ui.overlay = null;
      refresh();
      api.ready = true;
      document.body.dataset.labReady = 'true';
    } catch (e) {
      api.error = String(e.message || e);
      document.body.dataset.labReady = 'error';
      document.body.dataset.labError = api.error;
      console.error(e);
    }
  })();
})();
