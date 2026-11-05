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
        G.renderInventory();
      }
    };
  }

  var items = Object.keys(G.content.items)
    .filter(function (id) { return G.content.items[id].slotArt; })
    .map(function (id) { return { name: 'item:' + id, url: G.url(G.content.items[id].slotArt) }; });

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
