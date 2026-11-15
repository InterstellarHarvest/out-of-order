#!/usr/bin/env node
// Browser acceptance of the actual imported House of Tomorrow (both engines).
// Uses real Prologue routes to produce item-bearing saves, then plays Chapter 1
// through the production UI. No invented inventory, story mutations or dice odds.
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const os = require('os');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const Rules = require('../js/rules.js');
const story = require('../content/story.generated.js').story;
let pw;
try { pw = createRequire(__filename)('playwright'); }
catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const out = path.join(__dirname, 'ch01_route_screenshots');
fs.mkdirSync(out, {recursive:true});
const results = [];
function check(browser,caseName,name,ok,detail) {
  results.push({browser,caseName,name,ok:!!ok});
  if (!ok) console.error('FAIL ['+browser+' / '+caseName+'] '+name,JSON.stringify(detail).slice(0,700));
}
function assert(ok,msg){ if(!ok) throw new Error(msg); }
function shot(page,name) {return page.screenshot({path:path.join(out,name+'.png')});}
function checkStoryRoute(state,ids) {
  let s=state;
  for(const id of ids){
    const view=Rules.view(story,s);
    assert(view.cards.some(c=>c.id===id),'node '+s.chapter+':'+s.node+' lacks '+id);
    s=Rules.step(story,s,{choice:id}).state;
  }
  return s;
}
const START=['head_to_restroom','drone_show_form','sign_notice','signed_move_on','go_to_exit','take_box_and_leave'];
const TO_EXPO=['enter_exposition','pass_turnstile'];
const AFTER_RECEPTION=['speak_to_receptionist','ask_for_restroom','wait_for_assistance','accept_for_directions',
  'move_on_practical','leave_reception','continue_to_chapter_01'];
function fromActualPrologue(item,seed){
  let s=checkStoryRoute(Rules.begin(story,{seed:String(seed)}).state,START);
  s=Rules.step(story,s,{item:'effects_box_full',verb:'inspect'}).state;
  s=checkStoryRoute(s,TO_EXPO);
  if(item){
    s=checkStoryRoute(s,['keep_one',item==='desk_plant'?'keep_plant':'keep_stapler','continue_to_reception_kept_one']);
  }else s=checkStoryRoute(s,['deposit_all','continue_to_reception_stored']);
  s=checkStoryRoute(s,AFTER_RECEPTION);
  assert(s.chapter==='chapter-01' && s.node==='house_arrival','Chapter 1 handoff failed');
  assert(s.inventory.includes('expo_examiner_badge') && s.inventory.includes('wc_key'),'Missing original Prologue items');
  assert(!!s.flags.termination_status,'Missing Prologue termination flag');
  assert(!!s.transcript.length,'Missing cross-chapter NOTES');
  assert(!!s.inventory.includes(item||'property_claim_ticket') || !item,'Expected retained item missing');
  return s;
}
const ENTRY=['enter_show_home','hear_house_greeting'];
const PLANT=ENTRY.concat(['permit_housekeeping','ask_for_bathroom_after_storage','recover_belongings_now',
  'take_back_house_item','return_from_cabinet','refuse_everything','ask_to_leave_house',
  'name_plant_and_leave','give_named_plant_to_house']);
const NO_PLANT=ENTRY.concat(['permit_housekeeping','ask_for_bathroom_after_storage',
  'refuse_everything','ask_to_leave_house']);
const MARTIN=NO_PLANT.concat(['no_plant_first_foyer','go_to_mandatory_dinner',
  'reply_for_martin','look_around_martin_room','trace_martin_map','climb_through_service_hatch']);
const ALBUM=NO_PLANT.concat(['no_plant_first_foyer','go_to_mandatory_dinner',
  'interrupt_family_dinner','after_dinner_no_plant','attend_photo_session',
  'inspect_album','close_album','confront_house_about_album','let_house_change_subject',
  'use_bathroom_at_last','accept_completed_demonstration','leave_during_reset']);
const STAPLER=ENTRY.concat(['permit_housekeeping','ask_for_bathroom_after_storage',
  'recover_belongings_now','take_back_house_item','return_from_cabinet',
  'consider_rest_assured','enter_rest_assured']);
const UNARMED=ENTRY.concat(['permit_housekeeping','ask_for_bathroom_after_storage',
  'consider_rest_assured','enter_rest_assured']);
function chairSteps(verb,follow) {
  const base=(verb==='stapler_breakout'?STAPLER:UNARMED).concat([verb]);
  return follow==='death'?base:base.concat(['go_direct_service_exit','force_service_release']);
}
const specs=[
  {name:'named_plant_exit',item:'desk_plant',path:PLANT,finish:'exit_named_plant',route:'plant'},
  {name:'martin_wardrobe',item:null,path:MARTIN,finish:'exit_martin',route:'martin'},
  {name:'album_optional_bathroom',item:null,path:ALBUM,finish:'exit_showroom_reset',route:'showroom_reset',album:true},
  {name:'stapler_pass_clean',item:'red_stapler',path:chairSteps('stapler_breakout','service'),finish:'exit_service_clean',route:'mechanical',chair:'house_chair_stapler',chairPass:true,releasePass:true},
  {name:'stapler_pass_registered',item:'red_stapler',path:chairSteps('stapler_breakout','service'),finish:'exit_service_registered',route:'mechanical',chair:'house_chair_stapler',chairPass:true,releasePass:false},
  {name:'stapler_fail_death',item:'red_stapler',path:chairSteps('stapler_breakout','death'),finish:'exit_chair_fatal',chair:'house_chair_stapler',chairPass:false},
  {name:'unarmed_pass_clean',item:null,path:chairSteps('physical_chair_breakout','service'),finish:'exit_service_clean',route:'mechanical',chair:'house_chair_unarmed',chairPass:true,releasePass:true},
  {name:'unarmed_pass_registered',item:null,path:chairSteps('physical_chair_breakout','service'),finish:'exit_service_registered',route:'mechanical',chair:'house_chair_unarmed',chairPass:true,releasePass:false},
  {name:'unarmed_fail_death',item:null,path:chairSteps('physical_chair_breakout','death'),finish:'exit_chair_fatal',chair:'house_chair_unarmed',chairPass:false}
];
function chooseSeed(spec){
  for(let seed=1;seed<=1500;seed++){
    const from=fromActualPrologue(spec.item,seed);
    let s;
    try { s=checkStoryRoute(from,spec.path); }
    catch(e){
      // A failed chair check correctly removes the downstream success-route card.
      // Such a seed is not eligible for a success scenario; try the next fixed seed.
      if (spec.chair && /lacks go_direct_service_exit/.test(e.message)) continue;
      throw new Error(spec.name+': '+e.message);
    }
    if(s.node!==spec.finish) continue;
    if(spec.chair && (!s.checks[spec.chair] || s.checks[spec.chair].ok!==spec.chairPass)) continue;
    if(spec.releasePass!==undefined && (!s.checks.house_service_release_mishap
       || s.checks.house_service_release_mishap.ok!==spec.releasePass)) continue;
    return {seed,from,endState:s,save:Rules.serialize(story,from,{presented:from.transcript.length})};
  }
  throw new Error('Unable to find fixed die seed for '+spec.name);
}
const seeded=specs.map(s=>({...s,...chooseSeed(s)}));
async function settle(page) {
  for(let i=0;i<35;i++){
    await page.waitForFunction(()=>{
      const p=document.body.dataset.phase;
      if(p==='typing') window.CYOA_GAME.flow.skip();
      return p==='choosing';
    },null,{timeout:25000,polling:40});
    const cont=await page.evaluate(()=>window.CYOA_GAME.ui.cards.length===1
      && window.CYOA_GAME.ui.cards[0].id==='__continue');
    if(!cont)return;
    await page.evaluate(()=>window.CYOA_GAME.flow.choose(0));
  }
  throw new Error('Presentation continuation never ended');
}
async function take(page,id) {
  await settle(page);
  const idx=await page.evaluate(x=>window.CYOA_GAME.ui.cards.findIndex(c=>c.id===x),id);
  if(idx<0)throw new Error('No card '+id+' at '+await page.evaluate(()=>document.body.dataset.node));
  await page.evaluate(i=>window.CYOA_GAME.flow.choose(i),idx);
  await settle(page);
}
function serve(){
  const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.png':'image/png'};
  const server=http.createServer((req,res)=>{
    const file=path.normalize(path.join(ROOT,decodeURIComponent(req.url.split('?')[0])));
    if(!file.startsWith(ROOT)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404).end();return;}
    res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r=>server.listen(0,'127.0.0.1',()=>r(server)));
}
async function run(browserName,base){
  const browser=await pw[browserName].launch();
  const context=await browser.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
  for(const spec of seeded){
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(String(e)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    try{
      // Set a real Prologue-derived save under the correct origin, with no heavy art
      // navigation to abort. Then use the actual game renderer and flow.
      await page.goto(base+'/story/storyboard-manifest.json');
      await page.evaluate(raw=>localStorage.setItem('cyoa-save:the-acceptable-error',raw),spec.save);
      await page.goto(base+'/game/index.html');
      await page.waitForFunction(()=>document.body.dataset.ready==='true',null,{timeout:30000});
      await settle(page);
      const entered=await page.evaluate(()=>JSON.parse(JSON.stringify(window.CYOA_GAME.state)));
      check(browserName,spec.name,'real Prologue item, classification and NOTES survive save/entry',
        entered.chapter==='chapter-01' && entered.node==='house_arrival'
        && entered.flags.termination_status===spec.from.flags.termination_status
        && JSON.stringify(entered.inventory)===JSON.stringify(spec.from.inventory)
        && JSON.stringify(entered.transcript)===JSON.stringify(spec.from.transcript),
        {node:entered.node,inventory:entered.inventory,flags:entered.flags});
      if(!spec.item){
        // The game must not conjure up a named plant for someone who deposited everything.
        const snapshot=checkStoryRoute(spec.from,NO_PLANT);
        check(browserName,spec.name,'absent plant suppresses named-plant exit in real rules',
          !Rules.view(story,snapshot).cards.some(c=>c.id==='name_plant_and_leave'));
      }
      let sawFocus=false,sawDialogue=false,sawNarrative=false;
      let sawStoredStapler=false,sawRecoveredStapler=false;
      for(const choice of spec.path){
        await settle(page);
        const before=await page.evaluate(()=>({
          node:document.body.dataset.node,mode:document.body.dataset.mode,
          inv:window.CYOA_GAME.state.inventory.slice(),
          cards:window.CYOA_GAME.ui.cards.map(c=>c.id),
          flags:JSON.parse(JSON.stringify(window.CYOA_GAME.state.flags))
        }));
        if(before.mode==='focus')sawFocus=true;
        if(before.mode==='dialogue')sawDialogue=true;
        if(before.mode==='narrative')sawNarrative=true;
        if(spec.item==='red_stapler' && choice==='recover_belongings_now')sawStoredStapler=!before.inv.includes('red_stapler');
        if(spec.item==='red_stapler' && choice==='consider_rest_assured')sawRecoveredStapler=before.inv.includes('red_stapler');
        if(spec.name==='named_plant_exit' && choice==='name_plant_and_leave'){
          check(browserName,spec.name,'named plant choice requires actual held plant',before.inv.includes('desk_plant') && before.cards.includes(choice));
        }
        await take(page,choice);
      }
      const actual=await page.evaluate(()=>JSON.parse(JSON.stringify(window.CYOA_GAME.state)));
      check(browserName,spec.name,'production UI reaches expected authored exit',
        actual.node===spec.finish && actual.chapter==='chapter-01',{node:actual.node,want:spec.finish});
      check(browserName,spec.name,'all inventory, callback flags, check outcomes match independent rules walk',
        JSON.stringify(actual.inventory)===JSON.stringify(spec.endState.inventory)
        && JSON.stringify(actual.flags)===JSON.stringify(spec.endState.flags)
        && JSON.stringify(actual.checks)===JSON.stringify(spec.endState.checks),
        {actual:{inv:actual.inventory,flags:actual.flags,checks:actual.checks},
          expected:{inv:spec.endState.inventory,flags:spec.endState.flags,checks:spec.endState.checks}});
      check(browserName,spec.name,'prologue NOTES retained through real play',
        actual.transcript.length>spec.from.transcript.length
        && JSON.stringify(actual.transcript.slice(0,spec.from.transcript.length))===JSON.stringify(spec.from.transcript));
      // Surviving exits hand off to Chapter 2 with one CONTINUE card; the chair death stays terminal.
      check(browserName,spec.name,'route flag and final card match outcome (Chapter 2 hand-off, or BEGIN AGAIN on death)',
        (spec.route?actual.flags.house_exit_route===spec.route:!actual.flags.house_exit_route)
        && (await page.evaluate(fatal=>{const c=window.CYOA_GAME.ui.cards;return c.length===1&&(fatal
          ? c[0].kind==='system'&&c[0].id==='restart_chair_death'
          : c[0].kind==='continue'&&/^continue_to_chapter_02_/.test(c[0].id));},!spec.route))===true,
        {route:actual.flags.house_exit_route,cards:await page.evaluate(()=>window.CYOA_GAME.ui.cards.map(c=>c.id+':'+c.kind))});
      if(spec.name==='named_plant_exit')check(browserName,spec.name,
        'plant was actually removed and registered resident',
        !actual.inventory.includes('desk_plant') && actual.flags.plant_registered_as_resident===true);
      if(spec.chair){
        check(browserName,spec.name,'chair outcome resolved exactly once',
          actual.checks[spec.chair]?.ok===spec.chairPass
          && Object.keys(actual.checks).filter(x=>x===spec.chair).length===1);
        if(spec.releasePass!==undefined)
          check(browserName,spec.name,'release registration is distinct from clean exit',
            actual.checks.house_service_release_mishap?.ok===spec.releasePass
            && (actual.flags.equipment_registered===true)===!spec.releasePass);
        if(spec.item==='red_stapler'){
          check(browserName,spec.name,'confiscated stapler can be recovered for chair',
            sawStoredStapler && sawRecoveredStapler
            && actual.inventory.includes('red_stapler'));
        }
      }
      if(spec.album){
        const photo=story.items.family_portrait_photo;
        const portraitNode=story.chapters['chapter-01'].nodes.portrait_print;
        check(browserName,spec.name,'optional album Focus A and House dialogue surfaces both played',
          sawFocus && sawDialogue && sawNarrative && actual.flags.family_album_inspected===true);
        check(browserName,spec.name,'album yields a carried photo and fake bathroom callback',
          actual.inventory.includes('family_portrait_photo') && actual.flags.fake_bathroom_discovered===true);
        check(browserName,spec.name,'text/photo brief excludes protagonist identity beyond legs and shoes',
          /ONLY YOUR SHOES AND LOWER LEGS/.test(photo.description)
          && /only your shoes and the lower parts of your legs/i.test(portraitNode.text));
        // No artwork image exists yet; visual crop requires the later art production gate.
      }
      await shot(page,browserName+'_'+spec.name);
      check(browserName,spec.name,'no browser or console errors',errors.length===0,errors);
    }catch(e){check(browserName,spec.name,'scenario completed',false,e.stack||String(e));}
    await page.close();
  }
  await context.close();
  await browser.close();
}
(async()=>{
  const server=await serve(),base='http://127.0.0.1:'+server.address().port;
  try{for(const b of ['chromium','firefox'])await run(b,base);}
  finally{server.close();}
  const failed=results.filter(x=>!x.ok);
  console.log('House Chapter 1 playable route QA '+(results.length-failed.length)+'/'+results.length+' passed');
  if(failed.length)process.exitCode=1;
})().catch(e=>{console.error(e.stack||String(e));process.exitCode=1;});
