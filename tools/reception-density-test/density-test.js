// Reception density test (docs/55): the selected scene and portrait exports in the canonical shell
// at exact integer scale. Geometry and the shell path come from the layout lab's committed bundle
// (tools/layout-lab/data/lab_data.js), the same source the reception slice reads; nothing is
// copied from notes. Review tool only: no gameplay, no dialogue, no production-route code.
(function () {
  'use strict';

  var DATA = window.M1_LAB_DATA;
  var ROOT = '../../';
  var SCENE = {
    id: 'scene',
    src: 'art/scenes/conference_hall/reception/density_test/reception_scene_314x206.png',
    logical: [314, 206],
    scale: 4
  };
  var BACKGROUND = {
    id: 'portraitBackground',
    src: 'art/portraits/receptionist/density_test/reception_background_282x139.png',
    logical: [282, 139],
    scale: 2
  };
  var NPC = {
    id: 'portraitNpc',
    src: 'art/portraits/receptionist/density_test/receptionist_282x139.png',
    logical: [282, 139],
    scale: 2
  };
  var LAYERS = [SCENE, BACKGROUND, NPC];

  var params = new URLSearchParams(location.search);
  if (params.has('shot')) document.body.classList.add('shot');

  var regions = DATA.measured.regions;
  var sceneRect = regions.sceneAperture.rect;
  var portraitRect = regions.portraitAperture.rect;
  var shellPath = DATA.placementDefault.shell.path;

  function $(id) {
    return document.getElementById(id);
  }
  function place(node, r) {
    node.style.left = r[0] + 'px';
    node.style.top = r[1] + 'px';
    node.style.width = r[2] + 'px';
    node.style.height = r[3] + 'px';
  }
  function load(img, src) {
    return new Promise(function (resolve, reject) {
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('could not load ' + src)); };
      img.src = ROOT + src;
    });
  }

  place($('sceneAperture'), sceneRect);
  place($('portraitAperture'), portraitRect);

  // NPC layer toggle: visibility only, so the layer keeps its place and size.
  var npcOn = params.get('npc') !== 'off';
  var problems = null; // set once the art has loaded
  function setNpc(on) {
    npcOn = on;
    $('portraitNpc').classList.toggle('off', !on);
    $('npcToggle').textContent = 'NPC: ' + (on ? 'ON' : 'OFF');
    $('npcToggle').setAttribute('aria-pressed', on ? 'true' : 'false');
    document.body.dataset.npc = on ? 'on' : 'off';
    if (problems) readout(problems);
  }
  setNpc(npcOn);
  $('npcToggle').addEventListener('click', function () { setNpc(!npcOn); });
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey && !e.altKey) setNpc(!npcOn);
  });

  function readout(list) {
    var dpr = window.devicePixelRatio;
    var lines = [
      'REVIEW ONLY - densities are not locked (docs/55).',
      '',
      'SCENE     ' + SCENE.logical.join('x') + ' logical  x' + SCENE.scale + ' nearest  = ' +
        SCENE.display.join('x') + ' display  in aperture ' + sceneRect[2] + 'x' + sceneRect[3] + ' at (' + sceneRect[0] + ',' + sceneRect[1] + ')' +
        '  -> clips ' + (SCENE.display[0] - sceneRect[2]) + ' px right, ' + (SCENE.display[1] - sceneRect[3]) + ' px bottom',
      'PORTRAIT  ' + BACKGROUND.logical.join('x') + ' logical  x' + BACKGROUND.scale + ' nearest  = ' +
        BACKGROUND.display.join('x') + ' display  in aperture ' + portraitRect[2] + 'x' + portraitRect[3] + ' at (' + portraitRect[0] + ',' + portraitRect[1] + ')',
      'LAYERS    portrait background -> rear/mid FX (none) -> receptionist NPC (' + (npcOn ? 'ON' : 'OFF') + ') -> foreground FX (none) -> shell/frame',
      'SHELL     ' + shellPath + '  (unchanged; lab bundle sha256 ' + DATA.placementDefault.shell.sha256.slice(0, 12) + '...)',
      'DEVICE    devicePixelRatio ' + dpr + (Number.isInteger(dpr) ? '  (integer: exact)' : '  NOT AN INTEGER - set browser zoom to 100% for an exact view')
    ];
    var el = $('readout');
    el.textContent = lines.join('\n');
    if (list.length || !Number.isInteger(dpr)) {
      var warn = document.createElement('div');
      warn.className = 'warn';
      warn.textContent = list.concat(Number.isInteger(dpr) ? [] : ['Display is not at an integer device scale.']).join('\n');
      el.appendChild(warn);
    }
  }

  var shell = $('shell');
  Promise.all(LAYERS.map(function (L) { return load($(L.id), L.src); }).concat([load(shell, shellPath)]))
    .then(function () {
      var found = [];
      LAYERS.forEach(function (L) {
        var img = $(L.id);
        if (img.naturalWidth !== L.logical[0] || img.naturalHeight !== L.logical[1]) {
          found.push(L.src + ' is ' + img.naturalWidth + 'x' + img.naturalHeight + ', expected ' + L.logical.join('x'));
        }
        // Whole-number scale of the file's own pixels; never resized to fit the aperture.
        L.display = [img.naturalWidth * L.scale, img.naturalHeight * L.scale];
        img.width = L.display[0];
        img.height = L.display[1];
      });
      problems = found;
      readout(problems);
      window.addEventListener('resize', function () { readout(problems); });
      window.DENSITY_TEST = {
        scene: SCENE, background: BACKGROUND, npc: NPC,
        sceneRect: sceneRect, portraitRect: portraitRect, shellPath: shellPath,
        problems: problems, setNpc: setNpc
      };
      document.body.dataset.ready = problems.length ? 'error' : 'true';
    }, function (err) {
      $('readout').textContent = err.message;
      document.body.dataset.ready = 'error';
    });
})();
