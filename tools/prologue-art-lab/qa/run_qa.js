#!/usr/bin/env node
'use strict';
// From repo root: NODE_PATH="$(npm root -g)" node tools/prologue-art-lab/qa/run_qa.js
const fs=require('fs'), path=require('path'), http=require('http'), pw=require('playwright');
const ROOT=path.resolve(__dirname,'../../..'), LAB=path.join(ROOT,'tools/prologue-art-lab');
const SHOTS=path.join(__dirname,'screenshots'), catalog=JSON.parse(fs.readFileSync(path.join(LAB,'artwork.draft.json')));
const checks=[];
function test(scope,name,ok,detail){checks.push({scope,name,ok:!!ok,detail:detail===undefined?null:detail});const suffix=detail===undefined?'':': '+JSON.stringify(detail).slice(0,250);console.log((ok?'pass ':'FAIL ')+scope+' '+name+(ok?'':suffix));}
function header(p){if(!fs.existsSync(p))return null;const b=fs.readFileSync(p);if(b.length<26||b.toString('ascii',1,4)!=='PNG')return null;return [b.readUInt32BE(16),b.readUInt32BE(20),b[25]];}
function staticQA(){
  const kinds={scene:[314,206,2],background:[564,278,2],pose:[564,278,6],slot:[96,96,6],inspect:[565,451,2]},records=[];
  Object.entries(catalog.scenes).forEach(([id,s])=>{if(s.status==='generated')records.push([id,s.assetPath,'scene']);if(s.portraitBackground&&s.portraitBackground.status==='generated')records.push([id+'/bg',s.portraitBackground.assetPath,'background']);});
  Object.entries(catalog.portraits).forEach(([id,p])=>{if(p.status==='generated')records.push([id,p.assetPath,'pose']);});
  Object.entries(catalog.items).forEach(([id,it])=>{if(it.slot.status==='generated')records.push([id,it.slot.assetPath,'slot']);if(it.inspect.status==='generated')records.push([id,it.inspect.assetPath,'inspect']);});
  test('static','28 draft PNGs',records.length===28,records.length);
  records.forEach(([id,p,k])=>{let got=header(path.join(LAB,'assets',p));test('static',id+' '+k,JSON.stringify(got)===JSON.stringify(kinds[k]),got);});
  const f=fs.readFileSync(path.join(LAB,'stage.html'),'utf8');
  test('static','loads the real approved renderer', ['../../game/game.css','../../game/js/stage.js','../../game/js/flow.js','../../game/js/main.js','../../game/js/rules.js'].every(x=>f.includes(x)));
  test('static','production files do not reference review lab',
    ['game/index.html','game/js/stage.js','game/js/flow.js','game/js/main.js','game/content/reception.js'].every(x=>!fs.readFileSync(path.join(ROOT,x),'utf8').includes('prologue-art-lab')));
}
function serve(){
  const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
  const s=http.createServer((req,res)=>{
    let f=path.resolve(ROOT,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!f.startsWith(ROOT+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(done=>s.listen(0,'127.0.0.1',()=>done(s)));
}
async function browserQA(name,base){
  const browser=await pw[name].launch();
  const page=await browser.newPage({viewport:{width:2500,height:1350},deviceScaleFactor:1});
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  try{
    await page.goto(base+'/tools/prologue-art-lab/index.html');
    await page.waitForFunction(()=>!!document.body.dataset.labReady,null,{timeout:50000});
    const ready=await page.evaluate(()=>document.body.dataset.labReady);
    test(name,'lab loaded',ready==='true',await page.locator('#status').textContent());
    if(ready!=='true')return;
    await page.locator('#oneToOne').click();
    const change=(fn,value)=>page.evaluate(a=>window.PROLOGUE_LAB[a.fn](a.value),{fn,value});
    const state=()=>page.evaluate(()=>window.PROLOGUE_LAB.state());
    const details=()=>page.evaluate(()=>{
      const g=document.getElementById('gameFrame').contentWindow.CYOA_GAME;
      const inspect=document.getElementById('gameFrame').contentDocument.getElementById('inspectImage');
      return {scene:g.els.sceneArt.src,portrait:g.els.portraitNpc.src,bg:g.els.portraitBackground.src,
        label:g.els.scene.getAttribute('aria-label'),
        slots:g.els.slots.filter(s=>s.node.style.display!=='none').map(s=>s.node.dataset.item),
        inspect:inspect?[inspect.naturalWidth,inspect.naturalHeight]:null,
        round2:[g.TUNING.notice.fadeInMs,g.TUNING.notice.fadeOutMs,g.TUNING.notice.durationMs,g.TUNING.overlay.notesPanel]};
    });
    const shot=async id=>{ const box=await page.locator('#stageWrap').boundingBox(); if(!box)throw new Error('No stage preview'); await page.screenshot({path:path.join(SHOTS,name+'_'+id+'.png'),clip:box,animations:'disabled'}); };
    const m=await page.evaluate(()=>window.PROLOGUE_ART);
    test(name,'catalog 8 scenes, 4 portrait options, 10 items',m.scenes.length===8&&m.portraits.length===4&&m.items.length===10);
    const initial=await details();
    test(name,'Round 2 timing and NOTES intact',JSON.stringify(initial.round2)==='[500,220,3600,2]',initial.round2);
    for(const s of m.scenes){
      await change('setScene',s.id);
      // Image source swaps can take one frame to finish decoding in Chromium.
      await page.evaluate(async ()=>{const el=document.getElementById('gameFrame').contentWindow.CYOA_GAME.els.sceneArt;await el.decode();});
      const st=await state(),d=await details();
      test(name,'scene '+s.id,JSON.stringify(st.sceneNatural)==='[314,206]'&&JSON.stringify(st.sceneDisplayed)==='[1256,824]'&&d.label===s.title);
      if(['workplace/applause_station','workplace/corridor','street/outside_workplace','exposition/entrance','exposition/reception'].includes(s.id))
        await shot('scene_'+s.id.replace(/\//g,'_'));
    }
    // Capture portraits with their own paired scene, not the final scene in the sweep.
    for(const id of ['drone-closed','drone-paper','receptionist']){
      await change('setScene',id==='receptionist'?'exposition/reception':'workplace/corridor');
      await change('setPortrait',id);
      await page.waitForFunction(()=>{ const g=document.getElementById('gameFrame').contentWindow.CYOA_GAME; return g.els.portraitNpc.naturalWidth===564&&g.els.portraitNpc.naturalHeight===278; },null,{timeout:6000});
      const st=await state();
      test(name,'portrait '+id,JSON.stringify(st.portraitNatural)==='[564,278]',st.portraitNatural);
      if(id!=='receptionist')await shot('pose_'+id);
    }
    await change('setScene','workplace/corridor');await change('setPortrait','drone-closed');
    const d1=await details();await change('setPortrait','drone-paper');const d2=await details();
    test(name,'shared drone portrait background',d1.bg===d2.bg&&d1.portrait!==d2.portrait);
    await change('setSlotCount',6);
    const six=await details();
    test(name,'original M2 six-slot comparison remains available',six.slots.length===6,six.slots);
    await change('setSlotCount',7);
    await change('setInventoryStart',0);const first=await details();
    test(name,'first seven approved slots',first.slots.length===7&&first.slots.every(Boolean),first.slots);
    await shot('inventory_first');
    await change('setInventoryStart',3);const last=await details();
    test(name,'scroll to final seven',last.slots.length===7&&last.slots[6]==='wc_key',last.slots);
    await shot('inventory_last');
    for(const item of m.items){
      await change('openItem',item.id);const d=await details();
      test(name,'inspector '+item.id,JSON.stringify(d.inspect)==='[565,451]',d.inspect);
      if(['termination_notice','property_claim_ticket','effects_box_full','effects_box_empty','wc_key'].includes(item.id))
        await shot('inspect_'+item.id);
    }
    await change('closeItem',undefined);await change('setScene','exposition/reception');await change('setPortrait','auto');
    const recv=await details();
    test(name,'approved reception comparison',recv.scene.includes('reception_scene.png')&&recv.portrait.includes('receptionist_idle.png'));
    await shot('approved_reception');
    test(name,'no browser errors',errors.length===0,errors);
  }finally{await browser.close();}
}
(async()=>{
  fs.mkdirSync(SHOTS,{recursive:true});staticQA();
  const s=await serve();
  try{
    const url='http://127.0.0.1:'+s.address().port;
    for(const name of (process.env.QA_BROWSERS||'chromium,firefox').split(',')){
      try{await browserQA(name.trim(),url);}catch(e){test(name.trim(),'suite completion',false,e && e.stack || String(e));}
    }
  }finally{
    await new Promise(done=>s.close(done));
    const report={schema:'cyoa-prologue-art-lab-qa-v1',total:checks.length,
      passed:checks.filter(c=>c.ok).length,failed:checks.filter(c=>!c.ok).length,checks};
    fs.writeFileSync(path.join(__dirname,'qa_results.json'),JSON.stringify(report,null,2)+'\n');
    console.log('Prologue lab: '+report.passed+'/'+report.total);
    if(report.failed)process.exitCode=1;
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
