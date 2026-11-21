/* Out of Order transition comparison study. It does not import or mutate game state. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = n => Math.max(0, Math.min(1, n));
  const mix = (a,b,t) => a+(b-a)*clamp(t);
  const pct = n => (n*100).toFixed(3)+'%';
  const secs = n => n.toFixed(2)+' s';
  const SCENARIOS = {
    menu: {from:'menu',to:'applause',number:'PROLOGUE',short:'00',title:'The Last Good Day',note:'Current working title',stamp:'CASE OPENED',line:'YOUR ASSIGNMENT HAS BEEN FILED'},
    p1: {from:'applause',to:'house',number:'CHAPTER 01',short:'01',title:'House of Tomorrow',note:'Canonical chapter title',stamp:'TRANSFER RECORDED',line:'CONTINUATION AUTHORIZED'},
    c12: {from:'house',to:'biology',number:'CHAPTER 02',short:'02',title:'Biology Park - Your Nature Is Required',note:'Canonical chapter title',stamp:'TRANSFER RECORDED',line:'CONTINUATION AUTHORIZED'},
    c23: {from:'biology',to:'pavilion',number:'CHAPTER 03',short:'03',title:"The People's Pavilion — All Persons Accounted For",note:'Approved storyboard; not yet in game main',stamp:'TRANSFER RECORDED',line:'CONTINUATION AUTHORIZED'}
  };
  const SCENES = {
    applause:{chapter:'PROLOGUE',name:'ASSIGNMENT STATION',portrait:'APPLAUSE CONTROL',narration:'The applause lasts exactly six seconds. Another flawless assignment.',objective:'FIND THE BATHROOM.'},
    house:{chapter:'CHAPTER 01',name:'HOUSE OF TOMORROW',portrait:'HOME CONTROL',narration:'The demonstration is designed to anticipate everything except your question.',objective:'FIND A FUNCTIONING BATHROOM.'},
    biology:{chapter:'CHAPTER 02',name:'BIOLOGY PARK',portrait:'CONVENIENCES BUREAU',narration:'Every public convenience has been closed for a more convenient public.',objective:'FIND AN OPERATING BATHROOM.'},
    pavilion:{chapter:'CHAPTER 03',name:"PEOPLE'S PAVILION",portrait:'REGISTRATION CONTROL',narration:'Your visit has been recorded as completed. You are still standing here.',objective:'LEAVE THE PAVILION.'}
  };
  const CONCEPTS = {
    a:{heading:'A / ADMINISTRATIVE FILE',description:'A dossier slides into the department’s transfer machinery. A physical stamp makes the transfer official; the file is taken away as the new scene arrives.'},
    b:{heading:'B / MECHANICAL SHUTTERS',description:'Two heavy institutional shutters cover the old view. The illuminated center plate presents the chapter; the doors retract to release the next scene.'},
    c:{heading:'C / HYBRID PROCESSING',description:'The shutters seal first, exposing a records-processing window. A filed card enters, receives its stamp, and is drawn away before the shutters release.'}
  };
  const theatre=$('theatre');
  let concept='a', scenario='menu', mode='idle', elapsed=0, raf=null, lastTime=0;
  let forcedReduce=false;
  const systemReduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function motionReduced(){return forcedReduce||systemReduced;}
  function config(){
    if(motionReduced())return {cover:.18,process:.08,hold:1.05,reveal:.18,speed:1};
    return {
      cover:Number($('cover').value),process:Number($('process').value),
      hold:Number($('hold').value),reveal:Number($('reveal').value),
      speed:Number($('speed').value)
    };
  }
  function duration(c){return c.cover+c.process+c.hold+c.reveal;}
  function endTime(c){return (c.cover+c.process+c.hold)*1000;}
  function setStage(which){
    if(which==='menu'){
      $('sceneMenu').classList.remove('hidden');
      $('sceneGame').classList.add('hidden');
    } else {
      $('sceneMenu').classList.add('hidden');
      $('sceneGame').classList.remove('hidden');
      const scene=SCENES[which];
      if(!scene)return;
      $('gameLandscape').className='game-landscape landscape-'+which;
      $('gameSceneName').textContent=scene.name;
      $('gamePortraitLabel').textContent=scene.portrait;
      $('gameNarration').textContent=scene.narration;
      $('gameChapterLabel').textContent=scene.chapter;
      document.querySelector('.game-bottomline strong').textContent=scene.objective;
    }
  }
  function setScenario(next){
    scenario=next;
    const s=SCENARIOS[scenario];
    $('ticketNumber').textContent=s.number;
    $('ticketTitle').textContent=s.title;
    $('ticketNote').textContent=s.note;
    $('fileChapterNumber').textContent=s.short;
    $('fileChapterTitle').textContent=s.title;
    $('fileSubline').textContent=s.line;
    $('plateChapterNumber').textContent=s.short;
    $('plateChapterTitle').textContent=s.title;
    $('plateClearance').textContent=s.stamp;
    $('stampInk').textContent=s.stamp;
    $('reducedCode').textContent=s.number;
    $('reducedHeading').textContent=s.title;
    document.querySelector('.theatre-foot span:last-child').textContent=next==='menu'?'MENU: CLICK NEW GAME TO TRIGGER':'SCHEMATIC GAME SCENES / NO GAMEPLAY';
    reset();
  }
  function setConcept(next){
    concept=next;
    document.querySelectorAll('.concept-tab').forEach(tab=>{
      const yes=tab.dataset.concept===next;
      tab.classList.toggle('selected',yes);
      tab.setAttribute('aria-selected',String(yes));
      tab.tabIndex=yes?0:-1;
    });
    theatre.classList.remove('concept-a','concept-b','concept-c');
    theatre.classList.add('concept-'+next);
    const notes=CONCEPTS[next];
    $('conceptNotes').replaceChildren();
    const heading=document.createElement('span');
    heading.className='notes-heading';
    heading.textContent=notes.heading;
    const paragraph=document.createElement('p');
    paragraph.textContent=notes.description;
    $('conceptNotes').append(heading,paragraph);
    reset();
  }
  function writeButton(){
    const playing=mode==='playing';
    $('playButton').querySelector('span').textContent=mode==='paused'?'RESUME RELEASE':playing?'REPLAY TRANSITION':'PLAY TRANSITION';
    $('skipButton').disabled=!(playing||mode==='paused')||elapsed<endTime(config())-config().hold*1000+config().process*450;
  }
  function setFrame(ms){
    const c=config(),t=clamp(ms/(duration(c)*1000))*duration(c);
    const cover=clamp(t/c.cover);
    const proc=clamp((t-c.cover)/c.process);
    const reveal=clamp((t-c.cover-c.process-c.hold)/c.reveal);
    const titleVisible=t>=c.cover+c.process*.55;
    const enoughToSwap=t>=c.cover+c.process+c.hold;
    setStage(enoughToSwap?SCENARIOS[scenario].to:SCENARIOS[scenario].from);
    theatre.dataset.phase=t<=0?'ready':t<c.cover?'cover':t<c.cover+c.process?'process':t<c.cover+c.process+c.hold?'title':t<duration(c)?'release':'done';
    const dim=$('sceneDim');
    dim.style.opacity=String(clamp(cover*.78*(1-reveal)));
    const shutter=$('shutterSystem'),housing=$('processingHousing'),rig=$('fileRig'),plate=$('titlePlate'),reduced=$('reducedTitle');
    shutter.style.opacity='0'; housing.style.opacity='0'; rig.style.opacity='0'; plate.style.opacity='0'; reduced.style.opacity='0';
    $('stampInk').style.opacity='0';
    $('shutterSystem').querySelector('.shutter-seam').style.opacity='0';
    const l=shutter.querySelector('.shutter.left'),r=shutter.querySelector('.shutter.right');
    l.style.transform='translateX(-101%)';
    r.style.transform='translateX(101%)';
    rig.style.transform='';
    $('fileCard').style.transform='translateY(130%)';
    $('stampMachine').style.transform='translateY(0)';
    const visibleProgress=Math.max(0,Math.min(cover,1-reveal));
    if(motionReduced()){
      reduced.style.opacity=String(clamp((t-c.cover*.5)/(.5*c.cover+.03))*(1-clamp(reveal*2)));
      dim.style.opacity=String(clamp(cover*.96*(1-reveal)));
    }else if(concept==='a'){
      rig.style.opacity=String(clamp(cover*2)*(1-clamp(reveal*1.5)));
      $('fileCard').style.transform='translateY('+pct((1-cover)*130-reveal*145)+')';
      const hit=proc<.6?Math.sin(proc/.6*Math.PI)*.7:Math.sin((proc-.6)/.4*Math.PI)*.8;
      $('stampMachine').style.transform='translateY('+pct(hit*97)+')';
      $('stampInk').style.opacity=String(proc>.56?clamp((proc-.56)*5)*(1-reveal):0);
    }else{
      shutter.style.opacity='1';
      const shutterP=visibleProgress;
      l.style.transform='translateX('+pct(-101+101*shutterP)+')';
      r.style.transform='translateX('+pct(101-101*shutterP)+')';
      shutter.querySelector('.shutter-seam').style.opacity=String(cover>.99?1-reveal:0);
      if(concept==='b'){
        plate.style.opacity=String(clamp((proc-.30)*3)*(1-clamp(reveal*1.9)));
      } else {
        housing.style.opacity=String(clamp((cover-.65)*3)*(1-clamp(reveal*1.5)));
        rig.style.opacity=String(clamp(proc*4)*(1-clamp(reveal*1.4)));
        $('fileCard').style.transform='translateY('+pct((1-clamp(proc*2.4))*140-reveal*145)+')';
        const hit=proc<.5?0:Math.sin((proc-.5)*2*Math.PI)*.9;
        $('stampMachine').style.transform='translateY('+pct(hit*85)+')';
        $('stampInk').style.opacity=String(proc>.76?clamp((proc-.76)*5)*(1-reveal):0);
      }
    }
    $('trackFill').style.width=pct(clamp(t/duration(c)));
    $('stageState').textContent=theatre.dataset.phase.toUpperCase()+' / '+(enoughToSwap?'INCOMING':'OUTGOING')+' VIEW';
    $('animationStatus').textContent=mode==='paused'?'TITLE HOLD / PAUSED':t>=duration(c)?'TRANSFER COMPLETE':t===0?'AWAITING ACTIVATION':titleVisible?'PROCESSING / '+SCENARIOS[scenario].short:'PROCESSING / COVERING';
    writeButton();
  }
  function stop(){if(raf!==null){cancelAnimationFrame(raf);raf=null;}lastTime=0;}
  function reset(){
    stop();mode='idle';elapsed=0;
    setFrame(0);
    $('animationStatus').textContent='AWAITING ACTIVATION';
    $('stageState').textContent='READY / OUTGOING VIEW';
    writeButton();
  }
  function finish(){
    stop();mode='complete';elapsed=duration(config())*1000;
    setFrame(elapsed);writeButton();
  }
  function inspect(){
    stop();mode='paused';
    const c=config();elapsed=(c.cover+c.process+c.hold*.5)*1000;
    setFrame(elapsed);
    $('animationStatus').textContent='TITLE HOLD / PAUSED';
    writeButton();
  }
  function tick(now){
    if(mode!=='playing')return;
    if(!lastTime)lastTime=now;
    elapsed+=(now-lastTime)*config().speed;
    lastTime=now;
    const c=config(), pauseAt=(c.cover+c.process+c.hold*.5)*1000;
    if($('pauseTitle').checked && !theatre.dataset.titlePauseDone && elapsed>=pauseAt){
      elapsed=pauseAt; mode='paused';theatre.dataset.titlePauseDone='yes';stop();setFrame(elapsed);return;
    }
    if(elapsed>=duration(c)*1000){finish();return;}
    setFrame(elapsed);
    raf=requestAnimationFrame(tick);
  }
  function play(){
    if(mode==='paused'){
      mode='playing';lastTime=0;raf=requestAnimationFrame(tick);writeButton();
      theatre.focus({preventScroll:true});return;
    }
    reset();
    delete theatre.dataset.titlePauseDone;
    mode='playing';raf=requestAnimationFrame(tick);writeButton();
    theatre.focus({preventScroll:true});
  }
  function updateTiming(){
    for(const id of ['speed','cover','process','hold','reveal']){
      const value=Number($(id).value);
      $(id+'Value').textContent=id==='speed'?value.toFixed(2)+'×':secs(value);
    }
    const c=config();
    $('totalDuration').textContent=secs(duration(c)/c.speed);
    if(mode==='idle'||mode==='complete')setFrame(mode==='idle'?0:duration(c)*1000);
    else if(mode==='paused')setFrame(elapsed);
  }
  document.querySelectorAll('.concept-tab').forEach(tab=>tab.addEventListener('click',()=>setConcept(tab.dataset.concept)));
  document.querySelector('.concept-tabs').addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
    e.preventDefault();
    const keys=['a','b','c'];
    const idx=(keys.indexOf(concept)+(e.key==='ArrowRight'?1:2))%3;
    setConcept(keys[idx]);$('tab-'+keys[idx]).focus();
  });
  $('scenario').addEventListener('change',e=>setScenario(e.target.value));
  for(const id of ['speed','cover','process','hold','reveal'])$(id).addEventListener('input',updateTiming);
  $('reduced').addEventListener('change',e=>{forcedReduce=e.target.checked;reset();updateTiming();});
  $('playButton').addEventListener('click',play);
  $('skipButton').addEventListener('click',()=>{if(!$('skipButton').disabled)finish();});
  $('resetButton').addEventListener('click',reset);
  $('titleButton').addEventListener('click',inspect);
  $('finalButton').addEventListener('click',finish);
  window.addEventListener('keydown',e=>{
    if(!['Enter',' '].includes(e.key)||e.repeat||e.altKey||e.ctrlKey||e.metaKey)return;
    const tag=document.activeElement?.tagName;
    if(['BUTTON','INPUT','SELECT','TEXTAREA','IFRAME'].includes(tag))return;
    if(mode!=='playing'&&mode!=='paused')return;
    if(!$('skipButton').disabled){e.preventDefault();finish();}
  });
  window.addEventListener('message',e=>{
    if(e.origin!==location.origin||e.source!==$('approvedMenu').contentWindow)return;
    if(e.data?.source!=='out-of-order-approved-menu-preview'||e.data.kind!=='new')return;
    $('scenario').value='menu';
    setScenario('menu');
    play();
  });
  function syncMenuSave(){
    try{
      const cb=$('approvedMenu').contentDocument?.getElementById('saveToggle');
      if(cb){cb.checked=$('hasSave').checked;cb.dispatchEvent(new Event('change',{bubbles:true}));}
    }catch(e){/* preview still works without iframe DOM access */}
  }
  $('hasSave').addEventListener('change',syncMenuSave);
  $('approvedMenu').addEventListener('load',syncMenuSave);
  // The entire lab is presentational. Original scene/story gameplay never runs here.
  setConcept('a');
  setScenario('menu');
  updateTiming();
})();
