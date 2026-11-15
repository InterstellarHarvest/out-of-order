// Storyboard export -> cyoa-story-v2 runtime content (docs/84).
//
// Pure: no file system, no clock. tools/story-import/import.js reads the files and writes the
// result; the QA suite calls convert() directly on fixtures. The same inputs always give the same
// story, byte for byte (keys are emitted in a fixed order).
//
// Inputs (all parsed JSON, exactly as exported/authored):
//   manifest  story/storyboard-manifest.json   { chapters: [{ id, title, file, status }], items, artwork, layout }
//   chapters  { <id>: chapter JSON }            { title, start, scene, nodes: { id: NODE } }
//   items     story/items.draft.json            { <id>: { name, description, read?, inspect?, slotArt?, inspectArt? } }
//   artwork   story/artwork.draft.json          cyoa-storyboard-artwork-v1: { scenes, portraits, items, focus }
//   settings  story/runtime-settings.json       cyoa-runtime-settings-v1: { story, save, cast: { id: { name } }, start?, initialState? }
//
// What is NOT read: storyboard-layout.json (box positions in the authoring tool are not gameplay),
// art prompts, notes and suggested filenames. The artwork registry is the ONE authority for art
// paths; an item's own slotArt / inspectArt may only repeat it (or be null).
//
// opts.mode: 'preview' (drafts allowed: an unfinished node becomes an explicit DRAFT STOP, missing
// art becomes a labelled DEV PLACEHOLDER) or 'approved' (both are errors).
'use strict';

const STORY_SCHEMA = 'cyoa-story-v2';
const ARTWORK_SCHEMA = 'cyoa-storyboard-artwork-v1';
const SETTINGS_SCHEMA = 'cyoa-runtime-settings-v1';
const DRAFT_STOP_ID = 'draft_stop_begin_again';
const DRAFT_STOP_TEXT = 'DRAFT ENDS HERE. BEGIN AGAIN.';

// The authored fields each level may carry, in the order they are emitted. Anything else is an
// error: an export is never silently trimmed.
const MANIFEST_KEYS = ['chapters', 'items', 'artwork', 'layout', 'start'];
const MANIFEST_CHAPTER_KEYS = ['id', 'title', 'file', 'status'];
const CHAPTER_KEYS = ['title', 'start', 'scene', 'nodes'];
const NODE_KEYS = ['mode', 'scene', 'speaker', 'pose', 'focus', 'scenePickup', 'objective', 'effects', 'text', 'choices', 'show', 'use', 'contextAction', 'end'];
const CHOICE_KEYS = ['id', 'kind', 'text', 'say', 'if', 'effects', 'once', 'result', 'check', 'pass', 'fail', 'to', 'back', 'chapter', 'restart'];
const ENTRY_KEYS = ['kind', 'say', 'if', 'effects', 'once', 'result', 'check', 'pass', 'fail', 'to', 'back', 'chapter'];
const ITEM_KEYS = ['name', 'description', 'read', 'inspect', 'slotArt', 'inspectArt'];
const SETTINGS_KEYS = ['schema', 'story', 'save', 'cast', 'start', 'initialState'];
// Authoring-only node annotations: reported, never imported.
const AUTHORING_ONLY = ['notes', 'comment', 'position', 'layout'];
// Artwork statuses (artwork.statusValues). Only these count as approved production art.
const APPROVED_ART = ['approved', 'integrated', 'reused'];

function has(o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); }
function obj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

function convert(input, opts) {
  const mode = (opts && opts.mode) || 'preview';
  if (mode !== 'preview' && mode !== 'approved') throw new Error('mode must be preview or approved');
  const errors = [];
  const warnings = [];
  const info = [];
  const draftStops = [];
  const err = (where, msg) => errors.push(where + ': ' + msg);
  const warn = (where, msg) => warnings.push(where + ': ' + msg);
  // In approved mode every draft allowance is an error.
  const draft = (where, msg) => (mode === 'approved' ? err(where, msg) : warn(where, msg));
  const onlyKeys = (where, v, keys, ignorable) => {
    Object.keys(v).forEach((k) => {
      if (keys.indexOf(k) !== -1) return;
      if (ignorable && ignorable.indexOf(k) !== -1) { info.push(where + ': authoring-only field ' + k + ' not imported'); return; }
      err(where, 'unsupported field "' + k + '" (the importer never drops fields silently; see docs/84 section 3)');
    });
  };

  const { manifest, chapters, items, artwork, settings } = input;
  if (!obj(manifest)) return fail('manifest: missing or not an object');
  if (!obj(settings)) return fail('runtime-settings: missing or not an object');
  if (!obj(artwork)) return fail('artwork: missing or not an object');
  if (!obj(items)) return fail('items: missing or not an object');
  function fail(msg) { errors.push(msg); return { ok: false, errors, warnings, info, draftStops, story: null, art: [], artPending: [] }; }

  onlyKeys('manifest', manifest, MANIFEST_KEYS);
  onlyKeys('runtime-settings', settings, SETTINGS_KEYS);
  if (settings.schema !== SETTINGS_SCHEMA) err('runtime-settings', 'schema must be ' + SETTINGS_SCHEMA);
  if (artwork.schema !== ARTWORK_SCHEMA) err('artwork', 'schema must be ' + ARTWORK_SCHEMA + ' (got ' + artwork.schema + ')');
  if (typeof settings.story !== 'string' || !/^[a-z0-9_-]+$/.test(settings.story)) err('runtime-settings', 'story must be a lower-case id');
  if (typeof settings.save !== 'boolean') err('runtime-settings', 'save must be true or false');
  const castNames = obj(settings.cast) ? settings.cast : {};

  // Chapters, in manifest order ---------------------------------------------------------------
  const list = Array.isArray(manifest.chapters) ? manifest.chapters : [];
  if (!list.length) err('manifest', 'lists no chapters');
  const chapterIds = [];
  list.forEach((c, i) => {
    const w = 'manifest.chapters[' + i + ']';
    if (!obj(c)) return err(w, 'must be an object');
    onlyKeys(w, c, MANIFEST_CHAPTER_KEYS);
    if (typeof c.id !== 'string' || !/^[a-z0-9_-]+$/.test(c.id)) return err(w, 'id must be a lower-case id');
    if (chapterIds.indexOf(c.id) !== -1) return err(w, 'duplicate chapter id ' + c.id);
    if (!obj(chapters[c.id])) return err(w, 'chapter file ' + c.file + ' is missing or not an object');
    // An approved build is a creative sign-off: every chapter in it must be marked approved in the
    // storyboard itself. A preview plays drafts (and says so on screen, docs/84 section 4.1).
    if (mode === 'approved' && c.status !== 'approved') err(w, 'chapter ' + c.id + ' is marked "' + c.status + '" in the manifest; an approved build needs every chapter marked "approved" in the storyboard first');
    chapterIds.push(c.id);
  });
  const start = has(manifest, 'start') ? manifest.start : has(settings, 'start') ? settings.start : chapterIds[0];
  if (start !== undefined && chapterIds.indexOf(start) === -1) err('manifest', 'start chapter ' + start + ' is not listed');

  // Art lookups (the registry is the one authority) --------------------------------------------
  const art = []; // every image the story uses: { kind, id, path, status }
  const artPending = [];
  function artRecord(kind, id, rec, where) {
    if (!obj(rec)) { draft(where, 'no ' + kind + ' artwork record for ' + id + ' (missing required artwork; shown as a DEV PLACEHOLDER)'); return null; }
    const path = rec.assetPath;
    if (path === null || path === undefined) { draft(where, kind + ' ' + id + ' has no assetPath yet (missing required artwork; DEV PLACEHOLDER)'); return null; }
    if (typeof path !== 'string' || !/^art\/[a-z0-9_./-]+\.png$/.test(path)) { err(where, kind + ' ' + id + ' assetPath must be a png under art/ (got ' + path + ')'); return null; }
    if (/(^|\/)(source|originals|review)\//.test(path)) { err(where, kind + ' ' + id + ' may not use source/, originals/ or review/ art: ' + path); return null; }
    const status = rec.status || 'not-started';
    art.push({ kind, id, path, status });
    // Unapproved art is reported (artPending), never an error: art approval is the owner's own
    // gate, separate from content approval, and a content build never changes an art status.
    if (APPROVED_ART.indexOf(status) === -1) artPending.push(kind + ' ' + id + ' (' + status + '): ' + path);
    return path;
  }
  const scenesUsed = [];
  function useScene(id, where) {
    if (typeof id !== 'string') return err(where, 'scene must be a location/scene id');
    if (scenesUsed.indexOf(id) === -1) scenesUsed.push(id);
  }

  // Nodes ------------------------------------------------------------------------------------
  const flagsSeen = [];
  const flag = (f) => { if (typeof f === 'string' && flagsSeen.indexOf(f) === -1) flagsSeen.push(f); };
  const ENGINE_MARKS = ['inspected', 'read', 'shown', 'used'];
  const marksSet = [];
  const marksTested = {};
  function scanCond(c) {
    if (!obj(c)) return;
    ['item', 'itemNot'].forEach((k) => { if (Array.isArray(c[k]) && typeof c[k][1] === 'string') marksTested[c[k][1]] = true; });
    if (has(c, 'flag')) flag(c.flag);
    if (has(c, 'notFlag')) flag(c.notFlag);
    if (has(c, 'flagIs') && Array.isArray(c.flagIs)) flag(c.flagIs[0]);
  }
  function scanEffects(fx) {
    (Array.isArray(fx) ? fx : fx ? [fx] : []).forEach((e) => {
      if (!obj(e)) return;
      scanCond(e.if);
      if (obj(e.set)) Object.keys(e.set).forEach(flag);
      if (Array.isArray(e.mark)) e.mark.forEach((m) => { if (Array.isArray(m) && typeof m[1] === 'string' && ENGINE_MARKS.indexOf(m[1]) === -1 && marksSet.indexOf(m[1]) === -1) marksSet.push(m[1]); });
    });
  }
  function scanText(t) {
    if (Array.isArray(t)) t.forEach((v) => { if (obj(v) && has(v, 'text')) { scanCond(v.if); scanText(v.text); } });
  }
  function scanChoice(c) {
    if (!obj(c)) return;
    scanCond(c.if);
    scanEffects(c.effects);
    scanText(c.result);
    ['pass', 'fail'].forEach((k) => { if (obj(c[k])) { scanEffects(c[k].effects); scanText(c[k].result); } });
    if (obj(c.check) && Array.isArray(c.check.mods)) c.check.mods.forEach((m) => obj(m) && scanCond(m.if));
  }

  const speakers = {}; // cast id -> { poses: [ids in use order], scenes: [scene ids it speaks in] }
  const outChapters = {};
  chapterIds.forEach((chId) => {
    const ch = chapters[chId];
    const cw = 'chapter ' + chId;
    onlyKeys(cw, ch, CHAPTER_KEYS);
    if (!obj(ch.nodes)) return err(cw, 'needs nodes {}');
    useScene(ch.scene, cw);
    const nodes = {};
    Object.keys(ch.nodes).forEach((id) => {
      const n = ch.nodes[id];
      const w = 'node ' + chId + ':' + id;
      if (!/^[a-z0-9_-]+$/.test(id)) err(w, 'node id must be a lower-case id');
      if (!obj(n)) return err(w, 'must be an object');
      onlyKeys(w, n, NODE_KEYS, AUTHORING_ONLY);
      const out = {};
      NODE_KEYS.forEach((k) => { if (has(n, k)) out[k] = clone(n[k]); });
      if (n.scene !== undefined) useScene(n.scene, w);
      const scene = n.scene || ch.scene;
      if (n.mode === 'dialogue' && typeof n.speaker === 'string') {
        const sp = (speakers[n.speaker] = speakers[n.speaker] || { poses: [], scenes: [] });
        const pose = n.pose === undefined ? 'default' : n.pose;
        if (sp.poses.indexOf(pose) === -1) sp.poses.push(pose);
        if (sp.scenes.indexOf(scene) === -1) sp.scenes.push(scene);
        delete out.pose; // re-emitted below once the registry is known
        out._pose = pose;
        out._scene = scene;
      }
      scanCond(n.if);
      scanEffects(n.effects);
      scanText(n.text);
      scanText(n.objective);
      (Array.isArray(n.choices) ? n.choices : []).forEach((c, i) => {
        if (obj(c)) onlyKeys(w + ' choice ' + (c.id || '#' + i), c, CHOICE_KEYS);
        scanChoice(c);
      });
      ['show', 'use'].forEach((verb) => {
        if (!obj(n[verb])) return;
        Object.keys(n[verb]).forEach((item) => {
          if (obj(n[verb][item])) onlyKeys(w + ' ' + verb + ' ' + item, n[verb][item], ENTRY_KEYS);
          scanChoice(n[verb][item]);
        });
      });
      // An unfinished node (no cards, not an ending): an explicit development state, never a
      // silent gap. Preview builds end there with one clearly labelled system card.
      if (Array.isArray(n.choices) && !n.choices.length && !n.end) {
        draftStops.push(chId + ':' + id);
        draft(w, 'has no choices and is not an ending (an unfinished chapter handoff)' + (mode === 'preview' ? ': preview ends here with "' + DRAFT_STOP_TEXT + '"' : ''));
        if (mode === 'preview') {
          out.end = true;
          out.choices = [{ id: DRAFT_STOP_ID, kind: 'system', text: DRAFT_STOP_TEXT, restart: true }];
        }
      }
      nodes[id] = out;
    });
    outChapters[chId] = { title: ch.title, start: ch.start, scene: ch.scene, nodes };
  });

  // Items -------------------------------------------------------------------------------------
  const outItems = {};
  const artItems = obj(artwork.items) ? artwork.items : {};
  Object.keys(items).forEach((id) => {
    const it = items[id];
    const w = 'item ' + id;
    if (!/^[a-z0-9_]+$/.test(id)) err(w, 'item id must be a lower-case id');
    if (!obj(it)) return err(w, 'must be an object');
    onlyKeys(w, it, ITEM_KEYS);
    const rec = artItems[id] || {};
    const slot = artRecord('item-slot', id, rec.slot, w);
    const insp = artRecord('item-inspect', id, rec.inspect, w);
    [['slotArt', slot, rec.slot], ['inspectArt', insp, rec.inspect]].forEach(([k, path, r]) => {
      const own = it[k];
      const registry = obj(r) ? r.assetPath : undefined;
      if (own !== undefined && own !== null && own !== registry) err(w, k + ' "' + own + '" disagrees with the artwork registry ("' + registry + '"); the registry is the one authority');
    });
    const out = { name: it.name, slotArt: slot, inspectArt: insp, description: clone(it.description) };
    if (has(it, 'read')) out.read = clone(it.read);
    if (has(it, 'inspect')) out.inspect = clone(it.inspect);
    scanText(it.description);
    if (obj(it.read)) scanEffects(it.read.effects);
    if (obj(it.inspect)) scanEffects(it.inspect.effects);
    if (Array.isArray(it.description)) it.description.forEach((v) => obj(v) && scanCond(v.if));
    outItems[id] = out;
  });
  // Custom item marks: declared by the effects that set them. A mark a condition tests that nothing
  // sets (and the engine never sets) is almost certainly a typo.
  Object.keys(marksTested).forEach((m) => {
    if (ENGINE_MARKS.indexOf(m) === -1 && marksSet.indexOf(m) === -1) err('marks', 'item mark "' + m + '" is tested but no effect ever sets it');
  });
  Object.keys(artItems).forEach((id) => { if (!has(items, id)) info.push('artwork item ' + id + ' has no item record (not imported)'); });

  // Portraits and cast --------------------------------------------------------------------------
  const scenesArt = obj(artwork.scenes) ? artwork.scenes : {};
  const portraitsArt = obj(artwork.portraits) ? artwork.portraits : {};
  const portraits = {};
  const cast = {};
  Object.keys(speakers).sort().forEach((sid) => {
    const w = 'speaker ' + sid;
    if (!obj(castNames[sid]) || typeof castNames[sid].name !== 'string') err(w, 'no display name: add cast.' + sid + '.name to story/runtime-settings.json');
    cast[sid] = { name: obj(castNames[sid]) ? castNames[sid].name : sid.toUpperCase(), portrait: sid };
    const p = { backgrounds: {}, poses: {}, background: null, pose: null };
    // Poses: '<speaker>:<pose>' records; a record with layers supplies its foreground (and background).
    const layered = {};
    speakers[sid].poses.forEach((pose) => {
      const rec = portraitsArt[sid + ':' + pose];
      if (!obj(rec)) { draft(w, 'no portrait record ' + sid + ':' + pose + ' (missing required artwork; DEV PLACEHOLDER)'); p.poses[pose] = null; return; }
      if (Array.isArray(rec.layers)) {
        const fg = rec.layers.filter((l) => l && l.role === 'foreground')[0];
        const bg = rec.layers.filter((l) => l && l.role === 'background')[0];
        p.poses[pose] = artRecord('portrait-pose', sid + ':' + pose, fg && { assetPath: fg.path, status: rec.status }, w);
        if (bg) layered[pose] = { assetPath: bg.path, status: rec.status };
      } else {
        p.poses[pose] = artRecord('portrait-pose', sid + ':' + pose, rec, w);
      }
    });
    // Defaults never depend on authoring order: 'default' if authored, else the first id
    // alphabetically (any node that differs names its own pose / backdrop).
    p.pose = has(p.poses, 'default') ? 'default' : speakers[sid].poses.slice().sort()[0];
    // Backgrounds: the opaque 564x278 portrait background paired with the scene the conversation
    // happens in (scenes[<scene>].portraitBackground), keyed by that scene id.
    const bgFor = (scene, pose) => {
      if (has(p.backgrounds, scene)) return scene;
      const sc = scenesArt[scene];
      if (obj(sc) && obj(sc.portraitBackground)) { p.backgrounds[scene] = artRecord('portrait-background', scene, sc.portraitBackground, w); return scene; }
      const rec = portraitsArt[sid + ':' + pose];
      const via = obj(rec) && rec.portraitBackgroundScene;
      if (via && obj(scenesArt[via]) && obj(scenesArt[via].portraitBackground)) {
        if (!has(p.backgrounds, via)) p.backgrounds[via] = artRecord('portrait-background', via, scenesArt[via].portraitBackground, w);
        return via;
      }
      if (layered[pose]) {
        if (!has(p.backgrounds, scene)) p.backgrounds[scene] = artRecord('portrait-background', scene, layered[pose], w);
        return scene;
      }
      draft(w, 'no portrait background for scene ' + scene + ' (missing required artwork; DEV PLACEHOLDER)');
      p.backgrounds[scene] = null;
      return scene;
    };
    // Emit each node's pose / backdrop now the registry is known.
    const bgs = [];
    chapterIds.forEach((chId) => Object.keys(outChapters[chId].nodes).forEach((nid) => {
      const n = outChapters[chId].nodes[nid];
      if (n.mode !== 'dialogue' || n.speaker !== sid) return;
      const bg = bgFor(n._scene, n._pose);
      if (bgs.indexOf(bg) === -1) bgs.push(bg);
    }));
    p.background = bgs.sort()[0];
    chapterIds.forEach((chId) => Object.keys(outChapters[chId].nodes).forEach((nid) => {
      const n = outChapters[chId].nodes[nid];
      if (n.mode !== 'dialogue' || n.speaker !== sid) return;
      const bg = bgFor(n._scene, n._pose);
      const ordered = {};
      Object.keys(n).forEach((k) => {
        if (k === '_pose' || k === '_scene') return;
        ordered[k] = n[k];
        if (k === 'speaker') {
          if (n._pose !== p.pose) ordered.pose = n._pose;
          if (bg !== p.background) ordered.backdrop = bg;
        }
      });
      outChapters[chId].nodes[nid] = ordered;
    }));
    portraits[sid] = p;
  });
  Object.keys(castNames).forEach((id) => { if (!speakers[id]) info.push('cast ' + id + ' does not speak in any imported chapter (not imported)'); });

  // Scenes and focus targets ------------------------------------------------------------------------
  const scenes = {};
  scenesUsed.forEach((id) => {
    if (!/^[a-z0-9_]+\/[a-z0-9_]+$/.test(id)) return err('scene ' + id, 'id must be location/scene');
    scenes[id] = artRecord('scene', id, scenesArt[id], 'scene ' + id);
  });
  const focusArt = obj(artwork.focus) ? artwork.focus : {};
  const focus = {};
  chapterIds.forEach((chId) => Object.keys(outChapters[chId].nodes).forEach((nid) => {
    const n = outChapters[chId].nodes[nid];
    if (n.mode === 'focus' && typeof n.focus === 'string' && !has(focus, n.focus)) focus[n.focus] = artRecord('focus', n.focus, focusArt[n.focus], 'node ' + chId + ':' + nid);
  }));
  Object.keys(scenesArt).forEach((id) => { if (scenesUsed.indexOf(id) === -1) info.push('artwork scene ' + id + ' is not used by any imported chapter (not imported)'); });

  // Initial state: every flag the content tests or sets, declared false unless settings say otherwise.
  const init = obj(settings.initialState) ? clone(settings.initialState) : {};
  const flags = {};
  flagsSeen.slice().sort().forEach((f) => { flags[f] = false; });
  if (obj(init.flags)) Object.keys(init.flags).forEach((f) => { flags[f] = init.flags[f]; });
  const initialState = { flags, inventory: Array.isArray(init.inventory) ? init.inventory : [], items: obj(init.items) ? init.items : {} };

  const nullArt = JSON.stringify({ scenes, portraits, focus, outItems }).indexOf(':null') !== -1;
  const story = {
    schema: STORY_SCHEMA,
    id: settings.story,
    version: 1, // replaced by the content revision (import.js) once the content hash is known
    profile: nullArt ? 'fixture' : 'production',
    save: settings.save,
    start,
    initialState,
    cast,
    items: outItems,
    files: [],
    assets: { scenes, portraits, focus },
    chapters: outChapters
  };
  if (marksSet.length) story.marks = marksSet.slice().sort();
  if (nullArt) warnings.push('story: some art is missing, so this build uses the fixture profile (labelled DEV PLACEHOLDERS)');
  return { ok: !errors.length, errors, warnings, info, draftStops, story, art, artPending };
}

module.exports = { convert, STORY_SCHEMA, ARTWORK_SCHEMA, SETTINGS_SCHEMA, DRAFT_STOP_ID, DRAFT_STOP_TEXT, APPROVED_ART };
