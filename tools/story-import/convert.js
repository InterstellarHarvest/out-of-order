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
//   settings  story/runtime-settings.json       cyoa-runtime-settings-v1: { story, save, cast: { id: { name } }, start?, initialState?, pendingArtBindings? }
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
const SETTINGS_KEYS = ['schema', 'story', 'save', 'cast', 'start', 'initialState', 'pendingArtBindings', 'conditionalArt'];
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
  const art = []; // every image the story uses: { kind, id, path, status, binding? }
  const artPending = [];
  // Pending-integration bindings (docs/104 section 3): game-owned provenance files listed in
  // runtime-settings.pendingArtBindings bind an APPROVED canonical record whose assetPath is still null
  // (production paths stay null on the storyboard until the integration-status reconciliation) to its
  // own suggestedFilename, with the exact approved SHA-256. import.js proves the file bytes.
  const bound = new Map(); // path -> { file, key, sha256, used }
  (input.bindings || []).forEach((b) => {
    const w = 'pending art binding ' + b.file;
    if (!obj(b.json) || b.json.schema !== 'cyoa-art-provenance-v1' || !Array.isArray(b.json.images)) return err(w, 'must be a cyoa-art-provenance-v1 file with images');
    b.json.images.forEach((i, n) => {
      if (!obj(i) || typeof i.key !== 'string' || typeof i.path !== 'string' || !/^[0-9a-f]{64}$/.test(i.sha256 || '')) return err(w, 'image ' + n + ' needs key, path and a 64-hex sha256');
      if (bound.has(i.path)) return err(w, i.path + ' is bound twice');
      bound.set(i.path, { file: b.file, key: i.key, sha256: i.sha256, used: false });
    });
  });
  // The record's CURRENT approved selection is the first SHA-256 its canonical notes name (a superseded
  // selection, e.g. Paper Emergency v03, is only ever named after it, as history).
  const approvedSha = (rec) => { const m = /SHA-256[^0-9a-f]{0,3}([0-9a-f]{64})/.exec(String(rec.notes || '')); return m ? m[1] : null; };
  function artRecord(kind, id, rec, where) {
    if (!obj(rec)) { draft(where, 'no ' + kind + ' artwork record for ' + id + ' (missing required artwork; shown as a DEV PLACEHOLDER)'); return null; }
    let path = rec.assetPath;
    const b = typeof rec.suggestedFilename === 'string' ? bound.get(rec.suggestedFilename) : null;
    if (b && path !== null && path !== undefined) { err(where, kind + ' ' + id + ' already has a canonical assetPath; remove its pending binding (' + b.file + ')'); b.used = true; }
    else if (b) {
      b.used = true;
      if (mode === 'approved') { err(where, kind + ' ' + id + ' is bound pending integration (' + b.file + '); an approved build needs reconciled canonical art'); return null; }
      // A `reused` record (docs/137 C3, game issue #27) names its source's file as its suggestedFilename and the
      // source's approved SHA-256 first in its notes: it shows exactly the source's bound bytes.
      if (rec.status !== 'approved' && rec.status !== 'reused') { err(where, kind + ' ' + id + ' is bound pending integration but its record is "' + rec.status + '" (only an approved or reused, not yet integrated record may be bound)'); return null; }
      if (approvedSha(rec) !== b.sha256) { err(where, kind + ' ' + id + ' binding ' + b.sha256 + ' is not the current approved selection its record names (' + approvedSha(rec) + ')'); return null; }
      path = rec.suggestedFilename;
      art.push({ kind, id, path, status: rec.status, binding: { file: b.file, key: b.key, sha256: b.sha256 } });
      return path;
    }
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
  // Variants ({ if, text }) and conditional runs ({ say | act | desc, if }, game issue #27) both read state.
  function scanText(t) {
    if (Array.isArray(t)) t.forEach((v) => { if (obj(v) && has(v, 'text')) { scanCond(v.if); scanText(v.text); } else if (obj(v) && has(v, 'if')) scanCond(v.if); });
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
  // Incidental voices (docs/104 section 4): `who` of { say, who } runs. One that never leads a dialogue
  // node is imported as a portrait-less cast member: a display name, no portrait.
  const voices = {}; // who id -> first place it speaks
  function scanVoices(t, where) {
    if (!Array.isArray(t)) return;
    t.forEach((v) => {
      if (!obj(v)) return;
      if (has(v, 'say') && typeof v.who === 'string' && v.who !== 'you' && !has(voices, v.who)) voices[v.who] = where;
      if (has(v, 'text')) scanVoices(v.text, where);
    });
  }
  function scanChoiceVoices(c, where) {
    if (!obj(c)) return;
    scanVoices(c.result, where);
    ['pass', 'fail'].forEach((k) => { if (obj(c[k])) scanVoices(c[k].result, where); });
  }
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
      scanVoices(n.text, w);
      (Array.isArray(n.choices) ? n.choices : []).forEach((c) => scanChoiceVoices(c, w));
      ['show', 'use'].forEach((verb) => { if (obj(n[verb])) Object.values(n[verb]).forEach((e) => scanChoiceVoices(e, w)); });
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
    // A voice-only speaker (docs/137 C2, owner-approved 2026-11-24): a portrait record with format
    // 'voice-only' is a deliberate NO-IMAGE decision. The speaker leads its dialogue nodes with no
    // portrait at all: a portrait-less cast member (like an incidental voice) whose nodes the rules
    // present on Narrative B. Exactly one record per speaker, never mixed with portrait art.
    const voiceRecs = speakers[sid].poses.map((pose) => portraitsArt[sid + ':' + pose]).filter((r) => obj(r) && r.format === 'voice-only');
    if (voiceRecs.length) {
      if (speakers[sid].poses.length !== 1 || voiceRecs.length !== 1) {
        err(w, 'a voice-only speaker uses exactly one portrait record (no poses); found ' + speakers[sid].poses.map((x) => sid + ':' + x).join(', '));
        return;
      }
      const vr = voiceRecs[0];
      if (vr.status !== 'approved' || (vr.assetPath !== null && vr.assetPath !== undefined)) err(w, 'a voice-only record is an approved no-image decision (status approved, no assetPath)');
      cast[sid] = { name: obj(castNames[sid]) ? castNames[sid].name : sid.toUpperCase() };
      chapterIds.forEach((chId) => Object.keys(outChapters[chId].nodes).forEach((nid) => {
        const n = outChapters[chId].nodes[nid];
        if (n.mode !== 'dialogue' || n.speaker !== sid) return;
        const ordered = {};
        Object.keys(n).forEach((k) => { if (k !== '_pose' && k !== '_scene') ordered[k] = n[k]; });
        outChapters[chId].nodes[nid] = ordered;
      }));
      info.push(w + ': voice-only (docs/137 C2): leads ' + speakers[sid].scenes.length + ' scene(s) on Narrative B with no portrait');
      return;
    }
    cast[sid] = { name: obj(castNames[sid]) ? castNames[sid].name : sid.toUpperCase(), portrait: sid };
    // An opaque-complete speaker (docs/92 section 1: the House intercom): ONE complete opaque
    // 564x278 image per talking location, chosen by the scene the conversation happens in. No
    // foreground pose and no background layer; layered NPCs below are untouched.
    const completeRecs = speakers[sid].poses.map((pose) => portraitsArt[sid + ':' + pose]).filter((r) => obj(r) && r.format === 'opaque-complete');
    if (completeRecs.length) {
      if (speakers[sid].poses.length !== 1 || completeRecs.length !== 1) {
        err(w, 'an opaque-complete speaker uses exactly one portrait record (it has no poses); found ' + speakers[sid].poses.map((x) => sid + ':' + x).join(', '));
        return;
      }
      const rec = completeRecs[0];
      const views = obj(rec.views) ? rec.views : {};
      const p = { views: {}, view: null };
      speakers[sid].scenes.forEach((scene) => {
        if (!obj(views[scene])) { draft(w, 'no complete view for scene ' + scene + ' (missing required artwork; DEV PLACEHOLDER)'); p.views[scene] = null; return; }
        p.views[scene] = artRecord('portrait-view', sid + '@' + scene, views[scene], w);
      });
      Object.keys(views).forEach((scene) => { if (speakers[sid].scenes.indexOf(scene) === -1) info.push(w + ': complete view for ' + scene + ' is not used by any imported conversation (not imported)'); });
      p.view = Object.keys(p.views).sort()[0];
      chapterIds.forEach((chId) => Object.keys(outChapters[chId].nodes).forEach((nid) => {
        const n = outChapters[chId].nodes[nid];
        if (n.mode !== 'dialogue' || n.speaker !== sid) return;
        const ordered = {};
        Object.keys(n).forEach((k) => {
          if (k === '_pose' || k === '_scene') return;
          ordered[k] = n[k];
          if (k === 'speaker' && n._scene !== p.view) ordered.backdrop = n._scene;
        });
        outChapters[chId].nodes[nid] = ordered;
      }));
      portraits[sid] = p;
      return;
    }
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
  Object.keys(voices).filter((id) => !speakers[id]).forEach((id) => {
    if (!obj(castNames[id]) || typeof castNames[id].name !== 'string') err('voice ' + id + ' (' + voices[id] + ')', 'no display name: add cast.' + id + '.name to story/runtime-settings.json');
    cast[id] = { name: obj(castNames[id]) ? castNames[id].name : id.toUpperCase() };
  });
  Object.keys(castNames).forEach((id) => { if (!speakers[id] && !voices[id]) info.push('cast ' + id + ' does not speak in any imported chapter (not imported)'); });
  // Cast in id order whatever its kind, so the output never depends on authoring order.
  const castSorted = {};
  Object.keys(cast).sort().forEach((id) => { castSorted[id] = cast[id]; });

  // Scenes and focus targets ------------------------------------------------------------------------
  const scenes = {};
  // A text-led scene (docs/137 C1, owner-approved 2026-11-24): a scene record with format 'text-led'
  // is a deliberate NO-IMAGE decision. It is listed, never registered as art: the game keeps the
  // previous scene image on screen while its nodes are presented.
  const textLed = [];
  scenesUsed.forEach((id) => {
    if (!/^[a-z0-9_]+\/[a-z0-9_]+$/.test(id)) return err('scene ' + id, 'id must be location/scene');
    const rec = scenesArt[id];
    if (obj(rec) && rec.format === 'text-led') {
      if (rec.status !== 'approved' || (rec.assetPath !== null && rec.assetPath !== undefined) || rec.states || rec.portraitBackground) err('scene ' + id, 'a text-led record is an approved no-image decision (status approved, no assetPath, states or background)');
      textLed.push(id);
      return;
    }
    scenes[id] = artRecord('scene', id, scenesArt[id], 'scene ' + id);
  });
  // Scene states (docs/92 section 3): an opaque alternate of a scene ('replace') or one transparent
  // overlay on it ('overlay'), chosen by Rules.view from the real state: `at` (nodes), `focus` (the
  // presented close-up) and `if` (an ordinary condition). selection null = installed but bound to
  // no view (reported, file still verified, never emitted).
  const STATE_KEYS = ['id', 'title', 'kind', 'status', 'dimensions', 'layer', 'selection', 'assetPath', 'suggestedFilename', 'prompt', 'notes'];
  const SELECTION_KEYS = ['at', 'focus', 'if'];
  const sceneStates = {};
  const artUnbound = [];
  scenesUsed.forEach((sid) => {
    const list = obj(scenesArt[sid]) ? scenesArt[sid].states : undefined;
    if (list === undefined) return;
    const w = 'scene ' + sid + ' states';
    if (!Array.isArray(list)) return err(w, 'must be a list');
    const ids = [];
    list.forEach((st, i) => {
      const sw = w + '[' + i + ']';
      if (!obj(st)) return err(sw, 'must be an object');
      onlyKeys(sw, st, STATE_KEYS);
      if (typeof st.id !== 'string' || !/^[a-z0-9_]+$/.test(st.id)) return err(sw, 'id must be a lower-case id');
      if (ids.indexOf(st.id) !== -1) return err(sw, 'duplicate state id ' + st.id);
      ids.push(st.id);
      if (st.layer !== 'replace' && st.layer !== 'overlay') return err(sw, 'layer must be replace (an opaque alternate scene) or overlay (one transparent layer on it)');
      if (st.selection === null) {
        const path = st.assetPath;
        if (typeof path !== 'string' || !/^art\/[a-z0-9_./-]+\.png$/.test(path) || /(^|\/)(source|originals|review)\//.test(path)) return err(sw, 'an unbound state still needs a production png under art/');
        artUnbound.push({ kind: 'scene-state', id: sid + '#' + st.id, path, status: st.status || 'not-started' });
        info.push(sw + ': ' + st.id + ' is installed but bound to no authored view (not imported)');
        return;
      }
      if (!obj(st.selection)) return err(sw, 'selection must be an object ({ at?, focus?, if? }) or null');
      onlyKeys(sw + ' selection', st.selection, SELECTION_KEYS);
      if (!Object.keys(st.selection).length) err(sw, 'selection names no node, focus or condition (it would always show)');
      const out = { id: st.id, layer: st.layer, path: artRecord('scene-' + st.layer, sid + '#' + st.id, st, sw) };
      SELECTION_KEYS.forEach((k) => { if (has(st.selection, k)) out[k] = clone(st.selection[k]); });
      scanCond(st.selection.if);
      (sceneStates[sid] = sceneStates[sid] || []).push(out);
    });
  });

  const focusArt = obj(artwork.focus) ? artwork.focus : {};
  const focus = {};
  // A paged close-up (docs/92 section 2): one picture per semantic page of the focus node's text.
  // Page k starts at the paragraph that begins with pages[k].startsWith; the runtime keeps that
  // picture up for as long as that page's text continues.
  const FOCUS_PAGE_KEYS = ['title', 'kind', 'status', 'dimensions', 'startsWith', 'assetPath', 'suggestedFilename', 'prompt', 'notes'];
  function pagedFocus(id, rec, n, where) {
    const paras = typeof n.text === 'string' ? n.text.split('\n').filter((t) => t !== '') : null;
    if (!paras) { err(where, 'a paged focus needs plain text whose paragraphs the pages start'); return null; }
    const starts = [];
    const pages = rec.pages.map((pg, i) => {
      const pw = where + ' focus ' + id + ' page ' + (i + 1);
      if (!obj(pg)) { err(pw, 'must be an object'); return null; }
      onlyKeys(pw, pg, FOCUS_PAGE_KEYS);
      const at = typeof pg.startsWith === 'string' && pg.startsWith ? paras.findIndex((t) => t.indexOf(pg.startsWith) === 0) : -1;
      if (at === -1) err(pw, 'no paragraph of ' + where + ' starts with "' + pg.startsWith + '"');
      else if (i === 0 && at !== 0) err(pw, 'the first page must start at the first paragraph');
      else if (i > 0 && at <= starts[i - 1]) err(pw, 'pages must start in reading order');
      starts.push(at);
      return { path: artRecord('focus', id + ':page:' + (i + 1), pg, pw) };
    });
    if (pages.some((p) => !p) || starts.some((s) => s < 0)) return null;
    pages.forEach((p, i) => { p.paragraphs = (i + 1 < starts.length ? starts[i + 1] : paras.length) - starts[i]; });
    return { pages };
  }
  chapterIds.forEach((chId) => Object.keys(outChapters[chId].nodes).forEach((nid) => {
    const n = outChapters[chId].nodes[nid];
    if (n.mode !== 'focus' || typeof n.focus !== 'string') return;
    const rec = focusArt[n.focus];
    const where = 'node ' + chId + ':' + nid;
    if (obj(rec) && Array.isArray(rec.pages)) {
      const paged = pagedFocus(n.focus, rec, n, where);
      if (has(focus, n.focus) && JSON.stringify(focus[n.focus]) !== JSON.stringify(paged)) err(where, 'every node showing paged focus ' + n.focus + ' must split its text into the same pages');
      focus[n.focus] = paged;
    } else if (!has(focus, n.focus)) focus[n.focus] = artRecord('focus', n.focus, rec, where);
  }));
  Object.keys(scenesArt).forEach((id) => { if (scenesUsed.indexOf(id) === -1) info.push('artwork scene ' + id + ' is not used by any imported chapter (not imported)'); });

  // Initial state: every flag the content tests or sets, declared false unless settings say otherwise.
  const init = obj(settings.initialState) ? clone(settings.initialState) : {};
  const flags = {};
  flagsSeen.slice().sort().forEach((f) => { flags[f] = false; });
  if (obj(init.flags)) Object.keys(init.flags).forEach((f) => { flags[f] = init.flags[f]; });
  const initialState = { flags, inventory: Array.isArray(init.inventory) ? init.inventory : [], items: obj(init.items) ? init.items : {} };

  // Conditional art (game issue #27; public docs/152 section 4): game-owned dispatch of approved preserved
  // references (runtime-settings.conditionalArt, cyoa-conditional-art-v1). Each reference is installed under
  // art/ and proved by its SHA-256 (import.js); a state names the surface it replaces (scene, portrait background
  // or Focus A), the authored nodes and beats. References with no on-screen moment are installed, verified and
  // reported (artUnbound), never emitted. Rules.validateStory proves the rest against the story.
  const artStates = {};
  const story_inspect = {};
  const SURFACE_SIZE = { scene: [314, 206], background: [564, 278], focus: [564, 278] };
  const bgIds = new Set();
  Object.values(portraits).forEach((p) => Object.keys((p && p.backgrounds) || {}).forEach((b) => bgIds.add(b)));
  (input.conditionalArt || []).forEach((f) => {
    const w = 'conditional art ' + f.file, J = f.json;
    if (!obj(J) || J.schema !== 'cyoa-conditional-art-v1' || !Array.isArray(J.references) || !obj(J.states)) return err(w, 'must be a cyoa-conditional-art-v1 file with references and states');
    const refs = {};
    J.references.forEach((r, i) => {
      const rw = w + ' reference ' + (r && r.id || i);
      if (!obj(r) || typeof r.id !== 'string' || !/^[a-z0-9_]+$/.test(r.id)) return err(rw, 'needs a lower-case id');
      if (refs[r.id]) return err(rw, 'duplicate reference id');
      if (!SURFACE_SIZE[r.surface] && r.surface !== 'inspect') return err(rw, 'surface must be scene, background, focus or inspect');
      if (typeof r.path !== 'string' || !/^art\/[a-z0-9_./-]+\.png$/.test(r.path) || /(^|\/)(source|originals|review)\//.test(r.path)) return err(rw, 'path must be a production png under art/');
      if (!/^[0-9a-f]{64}$/.test(r.sha256 || '')) return err(rw, 'needs its approved sha256');
      refs[r.id] = r;
      const kind = r.surface === 'inspect' ? 'inspect-reference' : r.surface + '-reference';
      if (typeof r.unbound === 'string' && r.unbound) { artUnbound.push({ kind, id: r.id, path: r.path, status: 'approved', expect: r.sha256 }); info.push(rw + ': installed, bound to no authored moment (' + r.unbound + ')'); }
      else art.push({ kind, id: r.id, path: r.path, status: 'approved', expect: r.sha256, conditional: f.file });
    });
    const used = {};
    Object.keys(J.states).forEach((sk) => {
      const sw = w + ' ' + sk, m = /^(scene|background|focus):(.+)$/.exec(sk);
      if (!m) return err(sw, 'key must be scene:<id>, background:<id> or focus:<id>');
      if (m[1] === 'scene' && !has(scenes, m[2])) return err(sw, 'scene is not used by this build');
      if (m[1] === 'background' && !bgIds.has(m[2])) return err(sw, 'no portrait of this build has that background');
      if (m[1] === 'focus' && !has(focus, m[2])) return err(sw, 'close-up is not used by this build');
      if (!Array.isArray(J.states[sk])) return err(sw, 'must be a list');
      artStates[sk] = J.states[sk].map((st, i) => {
        const x = sw + '[' + i + ']';
        if (!obj(st)) { err(x, 'must be an object'); return null; }
        onlyKeys(x, st, ['id', 'ref', 'at', 'if', 'beat', 'until', 'after', 'region']);
        const r = refs[st.ref];
        if (!r) { err(x, 'unknown reference ' + st.ref); return null; }
        if (r.unbound) { err(x, 'reference ' + st.ref + ' is declared unbound'); return null; }
        if (r.surface + ':' + r.base !== sk) err(x, 'reference ' + st.ref + ' is art for ' + r.surface + ':' + r.base);
        used[st.ref] = true;
        scanCond(st.if);
        const o = { id: st.id, ref: st.ref, path: r.path, at: clone(st.at) };
        ['if', 'beat', 'until', 'after', 'region'].forEach((k) => { if (has(st, k)) o[k] = clone(st[k]); });
        return o;
      }).filter(Boolean);
    });
    // Presentation-only INSPECT (public docs/145, docs/152 section 5): a Focus A node's approved square image,
    // opened in the inspector window without a rules step. Title and text quote the node itself.
    Object.keys(J.inspect || {}).forEach((nk) => {
      const iw = w + ' inspect ' + nk, v = J.inspect[nk], m = /^([a-z0-9_-]+):([a-z0-9_-]+)$/.exec(nk);
      const node = m && outChapters[m[1]] && outChapters[m[1]].nodes[m[2]];
      if (!node || node.mode !== 'focus') return err(iw, 'must name a Focus A node of this build');
      onlyKeys(iw, v, ['ref', 'label', 'glyph', 'title', 'textRun']);
      const r = refs[v.ref];
      if (!r || r.surface !== 'inspect' || r.unbound) return err(iw, 'needs a bound inspect reference');
      const runs = Array.isArray(node.text) ? node.text : [node.text];
      const run = runs[v.textRun];
      const text = typeof run === 'string' ? run : obj(run) ? (run.desc || run.say || run.act) : null;
      if (typeof text !== 'string' || (obj(run) && has(run, 'if'))) return err(iw, 'textRun must name an unconditional run of the node');
      if (typeof v.title !== 'string' || text.indexOf(v.title) === -1) return err(iw, 'title must quote the node text');
      used[v.ref] = true;
      (story_inspect[nk] = { path: r.path, label: v.label, glyph: v.glyph, title: v.title, text });
    });
    Object.keys(refs).forEach((id) => { if (!refs[id].unbound && !used[id]) err(w, 'reference ' + id + ' is neither shown by a state nor declared unbound (nothing orphaned)'); });
  });

  const nullArt = JSON.stringify({ scenes, portraits, focus, outItems, sceneStates }).indexOf(':null') !== -1;
  const story = {
    schema: STORY_SCHEMA,
    id: settings.story,
    version: 1, // replaced by the content revision (import.js) once the content hash is known
    profile: nullArt ? 'fixture' : 'production',
    save: settings.save,
    start,
    initialState,
    cast: castSorted,
    items: outItems,
    files: [],
    assets: { scenes, portraits, focus },
    chapters: outChapters
  };
  if (Object.keys(sceneStates).length) story.assets.sceneStates = sceneStates;
  if (textLed.length) story.assets.textLedScenes = textLed.slice().sort();
  if (Object.keys(artStates).length) story.assets.artStates = artStates;
  if (Object.keys(story_inspect).length) story.assets.inspectViews = story_inspect;
  if (marksSet.length) story.marks = marksSet.slice().sort();
  if (nullArt) warnings.push('story: some art is missing, so this build uses the fixture profile (labelled DEV PLACEHOLDERS)');
  // Death screens (game issue #27): an approved death screen with no assetPath is bound by the same provenance
  // and drawn by the death-popup pipeline (tools/story-sync/sync.js compiles the runtime module), not by the
  // story: its binding is used when the projected death export names that art and the record proves it.
  const deathArt = [];
  const deathIds = new Set(input.deathArt || []);
  const deathScreens = obj(artwork.deathScreens) ? artwork.deathScreens : {};
  bound.forEach((b, p) => {
    if (b.used || !/^deathScreens:/.test(b.key)) return;
    const id = b.key.slice('deathScreens:'.length), rec = deathScreens[id], w = 'pending art binding ' + b.file;
    if (!deathIds.has(id)) return;
    if (!obj(rec) || rec.status !== 'approved' || (rec.assetPath !== null && rec.assetPath !== undefined)) return err(w, b.key + ' is not an approved death screen pending integration');
    if (rec.suggestedFilename !== p) return err(w, b.key + ' binds ' + p + ' but its record names ' + rec.suggestedFilename);
    if (mode === 'approved') return err(w, b.key + ' is bound pending integration; an approved build needs reconciled canonical art');
    if (approvedSha(rec) !== b.sha256) return err(w, b.key + ' binding ' + b.sha256 + ' is not the current approved selection its record names (' + approvedSha(rec) + ')');
    b.used = true;
    deathArt.push({ kind: 'death-screen', id, path: p, status: rec.status, binding: { file: b.file, key: b.key, sha256: b.sha256 } });
  });
  // Nothing orphaned: every pending binding must bind an image this build actually uses.
  bound.forEach((b, p) => { if (!b.used) err('pending art binding ' + b.file, p + ' (' + b.key + ') is bound but no approved record of this build uses it'); });
  return { ok: !errors.length, errors, warnings, info, draftStops, story, art, artPending, artUnbound, deathArt };
}

module.exports = { convert, STORY_SCHEMA, ARTWORK_SCHEMA, SETTINGS_SCHEMA, DRAFT_STOP_ID, DRAFT_STOP_TEXT, APPROVED_ART };
