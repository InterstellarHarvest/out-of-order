// Presentation capabilities fixture (storyboard docs/137 C1/C2), shared by
// validate_presentation_capabilities.js (Node) and run_presentation_qa.js (browsers).
'use strict';
const fs = require('fs');
const path = require('path');

// The storyboard-format fixture (docs/84 inputs) ---------------------------------------------------
function fixture() {
  const chapter = {
    title: 'Capabilities fixture', start: 'open', scene: 'loc/hall',
    nodes: {
      open: { mode: 'narrative', scene: 'loc/hall', text: 'You stand in a hall with a picture of a hall.',
        choices: [{ id: 'go', kind: 'continue', text: 'CONTINUE', to: 'path' }] },
      path: { mode: 'narrative', scene: 'loc/path', text: 'You walk along a path you never see.',
        choices: [{ id: 'on', kind: 'continue', text: 'CONTINUE', to: 'door' }] },
      door: { mode: 'dialogue', scene: 'loc/room', speaker: 'door_ai', pose: 'neutral',
        text: [{ desc: 'A panel lights up.' }, { say: 'State your business.', who: 'door_ai' }],
        choices: [
          { id: 'ask', kind: 'spoken', text: 'PLEASE OPEN.', effects: { set: { asked: true } }, to: 'door2' },
          { id: 'shove', kind: 'action', text: 'SHOVE THE DOOR.', check: { id: 'shove_roll', sides: 6, need: 4 }, pass: { to: 'door2', effects: { set: { shoved: true } } }, fail: { to: 'door2' } }
        ] },
      door2: { mode: 'dialogue', scene: 'loc/room', speaker: 'door_ai', pose: 'neutral',
        text: [{ say: 'Request logged.', who: 'door_ai' }, { say: 'THANKS.', who: 'you' }],
        choices: [{ id: 'clerk', kind: 'continue', text: 'CONTINUE', to: 'clerk' }] },
      clerk: { mode: 'dialogue', scene: 'loc/room', speaker: 'clerk', pose: 'plain',
        text: ['Can I help?', { say: 'Next, please.', who: 'door_ai' }],
        choices: [{ id: 'leave', kind: 'action', text: 'LEAVE.', to: 'exit' }] },
      exit: { mode: 'narrative', scene: 'loc/path', text: 'You leave along the same unseen path.', end: true,
        choices: [{ id: 'again', kind: 'system', text: 'BEGIN AGAIN', restart: true }] }
    }
  };
  const artwork = {
    schema: 'cyoa-storyboard-artwork-v1', statusValues: ['not-started', 'prompted', 'generated', 'approved', 'integrated', 'reused'],
    scenes: {
      'loc/hall': { kind: 'scene', status: 'approved', assetPath: null },
      'loc/path': { kind: 'scene', status: 'approved', format: 'text-led', assetPath: null, suggestedFilename: null },
      'loc/room': { kind: 'scene', status: 'approved', assetPath: null, portraitBackground: { kind: 'portrait-background', status: 'approved', assetPath: null } }
    },
    portraits: {
      'door_ai:neutral': { kind: 'portrait', status: 'approved', format: 'voice-only', assetPath: null, suggestedFilename: null },
      'clerk:plain': { kind: 'portrait', status: 'approved', assetPath: null, portraitBackgroundScene: 'loc/room' }
    },
    items: {}, focus: {}, deathScreens: {}
  };
  return {
    manifest: { chapters: [{ id: 'cap', title: 'Capabilities fixture', file: 'cap.json', status: 'approved' }] },
    chapters: { cap: chapter },
    items: {},
    artwork,
    settings: { schema: 'cyoa-runtime-settings-v1', story: 'capabilities', save: false, cast: { door_ai: { name: 'DOOR AI' }, clerk: { name: 'CLERK' } } },
    bindings: []
  };
}
// The control: the same story, but the door AI has an ordinary (placeholder) portrait and the path a scene image.
function control() {
  const f = fixture();
  f.artwork.portraits['door_ai:neutral'] = { kind: 'portrait', status: 'approved', assetPath: null, portraitBackgroundScene: 'loc/room' };
  f.artwork.scenes['loc/path'] = { kind: 'scene', status: 'approved', assetPath: null };
  return f;
}

// The fixture as a storyboard folder (docs/84 layout) for tools/story-import build({ from }).
function writeFolder(dir, f) {
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  const w = (rel, v) => fs.writeFileSync(path.join(dir, rel), JSON.stringify(v, null, 2));
  w('storyboard-manifest.json', { chapters: f.manifest.chapters.map((c) => Object.assign({}, c, { file: 'chapters/' + c.file })), items: 'items.json', artwork: 'artwork.json', layout: 'storyboard-layout.json' });
  Object.keys(f.chapters).forEach((id) => w('chapters/' + f.manifest.chapters.filter((c) => c.id === id)[0].file, f.chapters[id]));
  w('items.json', f.items);
  w('artwork.json', f.artwork);
  w('runtime-settings.json', Object.assign({}, f.settings, { save: true }));
  w('storyboard-layout.json', {});
  return dir;
}

module.exports = { fixture, control, writeFolder };
