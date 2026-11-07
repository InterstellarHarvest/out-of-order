// Boot: load every image the slice draws, build the stage, fit it to the window, start the flow.
(function () {
  'use strict';

  var G = window.CYOA_GAME;
  var scale = 1;

  G.viewScale = function () {
    return scale;
  };

  // The 1920x1080 stage, scaled down to fit the window (never up), centred.
  function fit() {
    var frame = document.getElementById('stageFrame');
    var stage = document.getElementById('stage');
    scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080, 1);
    stage.style.transform = scale === 1 ? '' : 'scale(' + scale + ')';
    frame.style.width = Math.floor(1920 * scale) + 'px';
    frame.style.height = Math.floor(1080 * scale) + 'px';
  }

  // QA only (?qa in the URL): read-only access to state, and items to overflow the inventory.
  function qaHooks() {
    if (!/[?&]qa\b/.test(location.search)) return;
    G.debug = {
      addItems: function (n) {
        for (var i = 1; i <= n; i++) {
          var id = 'qa_item_' + i;
          G.content.items[id] = { name: 'QA ' + i, slotArt: null, description: 'QA OVERFLOW ITEM ' + i + '. NOT PART OF THE SLICE.' };
          if (G.state.inventory.indexOf(id) === -1) G.state.inventory.push(id);
        }
        G.flow.syncInventory();
        G.renderAll();
      }
    };
  }

  var items = Object.keys(G.content.items)
    .filter(function (id) { return G.content.items[id].slotArt; })
    .map(function (id) { return { name: 'item:' + id, url: G.url(G.content.items[id].slotArt) }; });

  // The reception scene and the layered receptionist portrait (js/stage.js): decoded before the
  // stage is built, so ready never comes with art still to appear.
  Object.keys(G.RECEPTION_ART).forEach(function (id) {
    items.push({ name: G.RECEPTION_ART[id].image, url: G.url(G.RECEPTION_ART[id].path) });
  });

  // Approved item inspect art (an item's own `inspectArt`, if any) and the inspector's X up/down
  // sprites (js/stage.js), decoded before ready like everything else.
  Object.keys(G.content.items)
    .filter(function (id) { return G.content.items[id].inspectArt; })
    .forEach(function (id) { items.push({ name: G.inspectImageName(id), url: G.url(G.content.items[id].inspectArt) }); });
  Object.keys(G.INSPECTOR_ART).forEach(function (k) {
    items.push({ name: G.INSPECTOR_ART[k].image, url: G.url(G.INSPECTOR_ART[k].path) });
  });

  // Glyphs are also drawn to canvas for their inactive treatment, so they are decoded up front.
  ['inspect', 'notes', 'files', 'read', 'use', 'show_badge'].forEach(function (g) {
    items.push({ name: 'glyph:' + g, url: G.glyphUrl(g) });
  });

  G.loadImages(items).then(function () {
    G.buildStage();
    fit();
    window.addEventListener('resize', fit);
    qaHooks();
    G.flow.start();
    document.body.dataset.ready = 'true';
  }, function (err) {
    document.body.dataset.ready = 'error';
    document.body.dataset.error = err.message;
    throw err;
  });
})();
