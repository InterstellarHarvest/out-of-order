// Reception density test (docs/55): the selected scene and portrait exports in the canonical shell
// at exact integer scale. Geometry and the shell path come from the layout lab's committed bundle
// (tools/layout-lab/data/lab_data.js), the same source the reception slice reads; nothing is
// copied from notes. Review tool only: no gameplay, no dialogue, no production-route code.
(function () {
  'use strict';

  var DATA = window.M1_LAB_DATA;
  var ROOT = '../../';
  // Scene variants, all 314x206 shown at 4x (docs/55 sections 11, 13, 14). A, B and C come from one
  // raw source: A = BOX (+256), B = NEAREST, C = B's exact pixels with a non-spatial colour merge.
  // v2 is the first test, kept for history.
  var SCENE_DIR = 'art/scenes/conference_hall/reception/density_test/';
  var SCENES = {
    a: { label: 'A - BOX', src: SCENE_DIR + 'reception_scene_02_box_314x206.png',
      from: 'reception_world_scene_density_test_02_raw, BOX + 256-colour cleanup' },
    b: { label: 'B - NEAREST', src: SCENE_DIR + 'reception_scene_02_nearest_314x206.png',
      from: 'reception_world_scene_density_test_02_raw, NEAREST only, no colour cleanup' },
    c: { label: 'C - NEAREST + colour merge', src: SCENE_DIR + 'reception_scene_02_nearest_clean_314x206.png',
      from: 'scene B pixels, per-colour CIEDE2000 <= 2.0 merge, no spatial step' },
    v2: { label: 'v2 - BOX', src: SCENE_DIR + 'reception_scene_314x206.png',
      from: 'reception_world_scene_v2_raw (first test), BOX + 256-colour cleanup' }
  };
  var params = new URLSearchParams(location.search);
  var sceneKey = SCENES[params.get('scene')] ? params.get('scene') : 'c';
  var SCENE_CYCLE = ['a', 'b', 'c'];
  // Portrait NPC candidates (282x139 RGBA, 2x). 03 NEAREST is the active candidate; 01 is evidence.
  var NPC_DIR = 'art/portraits/receptionist/density_test/';
  var PORTRAITS = {
    '03': { label: '03 - NEAREST', src: NPC_DIR + 'receptionist_03_nearest_282x139.png',
      from: 'receptionist_portrait_density_test_03_raw, NEAREST, binary alpha, no colour cleanup' },
    '01': { label: '01 - BOX', src: NPC_DIR + 'receptionist_282x139.png',
      from: 'receptionist_portrait_v1_raw (first test), BOX + 256-colour cleanup' }
  };
  var portraitKey = PORTRAITS[params.get('portrait')] ? params.get('portrait') : '03';
  var PORTRAIT_CYCLE = ['03', '01'];
  var SCENE = {
    id: 'scene',
    src: SCENES[sceneKey].src,
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
    src: PORTRAITS[portraitKey].src,
    logical: [282, 139],
    scale: 2
  };
  var LAYERS = [SCENE, BACKGROUND, NPC];

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
  // Scene switch: every variant is 314x206, so the 4x display size never changes.
  Object.keys(SCENES).forEach(function (k) { new Image().src = ROOT + SCENES[k].src; });
  Object.keys(PORTRAITS).forEach(function (k) { new Image().src = ROOT + PORTRAITS[k].src; });
  function setPortrait(key) {
    portraitKey = key;
    NPC.src = PORTRAITS[key].src;
    $('portraitNpc').src = ROOT + PORTRAITS[key].src;
    $('portraitToggle').textContent = 'Portrait: ' + PORTRAITS[key].label;
    document.body.dataset.portrait = key;
    if (problems) readout(problems);
  }
  $('portraitToggle').addEventListener('click', function () {
    setPortrait(PORTRAIT_CYCLE[(PORTRAIT_CYCLE.indexOf(portraitKey) + 1) % PORTRAIT_CYCLE.length]);
  });
  $('portraitToggle').textContent = 'Portrait: ' + PORTRAITS[portraitKey].label;
  document.body.dataset.portrait = portraitKey;
  function setScene(key) {
    sceneKey = key;
    SCENE.src = SCENES[key].src;
    $('scene').src = ROOT + SCENES[key].src;
    Object.keys(SCENES).forEach(function (k) {
      $('scene_' + k).setAttribute('aria-pressed', k === key ? 'true' : 'false');
    });
    document.body.dataset.scene = key;
    if (problems) readout(problems);
  }
  Object.keys(SCENES).forEach(function (k) {
    $('scene_' + k).addEventListener('click', function () { setScene(k); });
  });
  document.body.dataset.scene = sceneKey;
  Object.keys(SCENES).forEach(function (k) {
    $('scene_' + k).setAttribute('aria-pressed', k === sceneKey ? 'true' : 'false');
  });
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === 'n') setNpc(!npcOn);
    if (k === 'a' || k === 'b' || k === 'c') setScene(k);
    if (k === 'v') setScene('v2');
    if (k === 's') setScene(SCENE_CYCLE[(SCENE_CYCLE.indexOf(sceneKey) + 1) % SCENE_CYCLE.length]);
    if (k === 'p') setPortrait(PORTRAIT_CYCLE[(PORTRAIT_CYCLE.indexOf(portraitKey) + 1) % PORTRAIT_CYCLE.length]);
  });

  function readout(list) {
    var dpr = window.devicePixelRatio;
    var lines = [
      'REVIEW ONLY - densities are not locked (docs/55).',
      '',
      'SCENE     ' + SCENES[sceneKey].label + ' (' + SCENES[sceneKey].from + ')',
      '          ' + SCENE.logical.join('x') + ' logical  x' + SCENE.scale + ' nearest  = ' +
        SCENE.display.join('x') + ' display  in aperture ' + sceneRect[2] + 'x' + sceneRect[3] + ' at (' + sceneRect[0] + ',' + sceneRect[1] + ')' +
        '  -> clips ' + (SCENE.display[0] - sceneRect[2]) + ' px right, ' + (SCENE.display[1] - sceneRect[3]) + ' px bottom',
      'PORTRAIT  ' + BACKGROUND.logical.join('x') + ' logical  x' + BACKGROUND.scale + ' nearest  = ' +
        BACKGROUND.display.join('x') + ' display  in aperture ' + portraitRect[2] + 'x' + portraitRect[3] + ' at (' + portraitRect[0] + ',' + portraitRect[1] + ')',
      'NPC       ' + PORTRAITS[portraitKey].label + ' (' + PORTRAITS[portraitKey].from + ')',
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
        problems: problems, setNpc: setNpc, setScene: setScene, scenes: SCENES, setPortrait: setPortrait, portraits: PORTRAITS
      };
      document.body.dataset.ready = problems.length ? 'error' : 'true';
    }, function (err) {
      $('readout').textContent = err.message;
      document.body.dataset.ready = 'error';
    });
})();
