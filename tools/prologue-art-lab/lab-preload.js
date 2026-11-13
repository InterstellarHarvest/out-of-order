// REVIEW LAB ONLY. Extend the real M2 loader; never patch production files or approved art.
(function () {
  'use strict';
  var G = window.CYOA_GAME;
  var M = window.PROLOGUE_ART;
  if (!G || !G.content || !M || M.schema !== 'prologue-art-review-manifest-v1') {
    throw new Error('Prologue lab requires the approved M2 game and draft manifest.');
  }
  function path(p, status) {
    return status === 'generated' ? M.reviewOnlyPrefix + p : p;
  }
  // In the iframe only, register draft item definitions before main.js enumerates artwork.
  // These are display-only descriptions; they do not touch the production story or rules.
  M.items.forEach(function (item) {
    if (item.status !== 'generated') return;
    G.content.items[item.id] = {
      name: item.id.replace(/_/g, ' ').toUpperCase(),
      slotArt: path(item.slot, item.status),
      inspectArt: path(item.inspect, item.status),
      description: 'DRAFT PROLOGUE ART. VISUAL REVIEW ONLY. NO GAMEPLAY STATE IS IMPLIED.'
    };
  });

  // Owner asked to review seven slots. This M2 snapshot still defaults to six;
  // enable its EXISTING seven-slot layout only in the isolated preview frame.
  G.layout.inventory.slotCount = 7;

  var original = G.loadImages;
  G.loadImages = function (extra) {
    var review = [];
    M.scenes.forEach(function (scene) {
      review.push({
        name: 'prologue:scene:' + scene.id,
        url: G.url(path(scene.path, scene.status))
      });
    });
    M.portraits.forEach(function (portrait) {
      if (portrait.type === 'none') return;
      var status = portrait.type === 'drone' ? 'generated' : 'reused';
      review.push({
        name: 'prologue:bg:' + portrait.id,
        url: G.url(path(portrait.background, status))
      });
      review.push({
        name: 'prologue:pose:' + portrait.id,
        url: G.url(path(portrait.foreground, status))
      });
    });
    return original.call(G, (extra || []).concat(review));
  };
})();
