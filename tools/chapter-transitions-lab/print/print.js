/* Independent art/motion study. Never reads or writes game progress. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const clamp=v=>Math.max(0,Math.min(1,v));
  const ease=v=>1-Math.pow(1-clamp(v),3);
  const lerp=(a,b,p)=>a+(b-a)*p;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chapters=[
    {number:'00',title:'The Last Good Day'},
    {number:'01',title:'House of Tomorrow'},
    {number:'02',title:'Biology Park - Your Nature Is Required'},
    {number:'03',title:"The People's Pavilion — All Persons Accounted For"}
  ];
  // Measured against the alpha-isolated 1024×1536 paper sprite.
  const art={width:1024,height:1536,top:[394,565,735,906],rowHeight:124};
  const steps=['prep','slot','feed','strike','strikePause','advance','type','hold','exit'];
  const legacySteps=['prep','slot','feed','strike','advance','type','hold','exit'];
  const defaultDurations={prep:.18,slot:.70,feed:.70,strike:.60,strikePause:.75,advance:1.20,type:1.20,hold:2.85,exit:1.50};
  const durations={...defaultDurations};
  const defaultPaper={paperY:-5,feedDepth:5};
  const paperTuning={...defaultPaper};
  const stage=$('stage'),sheet=$('paperSheet'),printer=$('printer'),frontPrinter=$('printerFrontCopy');
  const rows=[];
  let scenario=1,mode='idle',elapsed=0,frame=null,last=0;
  let plan=makePlan();

  function makePlan(){
    let time=0;
    const points={};
    for(const key of steps){
      const duration=(scenario===0&&(key==='strike'||key==='strikePause'||key==='advance'))?0:durations[key];
      points[key]={start:time,end:time+duration,duration};
      time+=duration;
    }
    return {points,total:time};
  }
  function part(t,key){
    const item=plan.points[key];
    return item.duration===0?1:clamp((t-item.start)/item.duration);
  }
  function random(seed){
    let s=seed>>>0;
    return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/4294967296;};
  }
  function strokePath(itemIndex,pass){
    const rng=random(419+itemIndex*127+pass*1319);
    const wraps=chapters[itemIndex].title.length>30;
    const line=wraps?Math.floor(pass/2):0;
    const overdraw=pass%2;
    const baseline=wraps?(line===0?28:71):51;
    const origin=baseline+(overdraw?6:-4);
    const pts=[];
    for(let x=4;x<645;x+=15){
      const tilt=(overdraw?-5:5)*x/645;
      const y=origin+tilt+(rng()-.5)*17;
      pts.push([x,y]);
    }
    pts.push([645,origin+(overdraw?-5:5)+(rng()-.5)*10]);
    return 'M '+pts.map(p=>p.map(n=>n.toFixed(1)).join(' ')).join(' L ');
  }
  // Authored 5x7 bitmap glyphs: hard square cells without browser font rasterization
  // or alpha-threshold damage to their counters, joins, and individual strokes.
  const glyphSource={
    A:'01110/10001/10001/11111/10001/10001/10001',
    B:'11110/10001/10001/11110/10001/10001/11110',
    C:'01111/10000/10000/10000/10000/10000/01111',
    D:'11110/10001/10001/10001/10001/10001/11110',
    E:'11111/10000/10000/11110/10000/10000/11111',
    F:'11111/10000/10000/11110/10000/10000/10000',
    G:'01111/10000/10000/10111/10001/10001/01111',
    H:'10001/10001/10001/11111/10001/10001/10001',
    I:'11111/00100/00100/00100/00100/00100/11111',
    J:'00111/00010/00010/00010/10010/10010/01100',
    K:'10001/10010/10100/11000/10100/10010/10001',
    L:'10000/10000/10000/10000/10000/10000/11111',
    M:'10001/11011/10101/10101/10001/10001/10001',
    N:'10001/11001/10101/10011/10001/10001/10001',
    O:'01110/10001/10001/10001/10001/10001/01110',
    P:'11110/10001/10001/11110/10000/10000/10000',
    Q:'01110/10001/10001/10001/10101/10010/01101',
    R:'11110/10001/10001/11110/10100/10010/10001',
    S:'01111/10000/10000/01110/00001/00001/11110',
    T:'11111/00100/00100/00100/00100/00100/00100',
    U:'10001/10001/10001/10001/10001/10001/01110',
    V:'10001/10001/10001/10001/10001/01010/00100',
    W:'10001/10001/10001/10101/10101/10101/01010',
    X:'10001/10001/01010/00100/01010/10001/10001',
    Y:'10001/10001/01010/00100/00100/00100/00100',
    Z:'11111/00001/00010/00100/01000/10000/11111',
    0:'01110/10001/10011/10101/11001/10001/01110',
    1:'00100/01100/00100/00100/00100/00100/01110',
    2:'01110/10001/00001/00010/00100/01000/11111',
    3:'11110/00001/00001/01110/00001/00001/11110',
    4:'00010/00110/01010/10010/11111/00010/00010',
    5:'11111/10000/10000/11110/00001/00001/11110',
    6:'01110/10000/10000/11110/10001/10001/01110',
    7:'11111/00001/00010/00100/01000/01000/01000',
    8:'01110/10001/10001/01110/10001/10001/01110',
    9:'01110/10001/10001/01111/00001/00001/01110',
    "'":'10/10/01/00/00/00/00',
    '-':'00000/00000/00000/11111/00000/00000/00000',
    '—':'0000000/0000000/0000000/1111111/0000000/0000000/0000000',
    '?':'01110/10001/00001/00010/00100/00000/00100'
  };
  const glyphs=Object.fromEntries(Object.entries(glyphSource).map(([key,value])=>[key,value.split('/')]));
  function advanceFor(character){
    if(character===' ')return 3;
    return (glyphs[character]||glyphs['?'])[0].length+1;
  }
  function bitmapTextWidth(value){
    return Array.from(value).reduce((sum,character)=>sum+advanceFor(character),0);
  }
  // Draw at one-bit logical resolution and CSS-scale with nearest neighbor.
  function pixelCanvas(width,height){
    const canvas=document.createElement('canvas');
    canvas.width=width;canvas.height=height;
    canvas.setAttribute('aria-hidden','true');
    return canvas;
  }
  function makeBitmapLayout(canvas,fullText,maxLines){
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    const words=fullText.toUpperCase().split(/\s+/);
    const lines=[''];
    for(const word of words){
      const last=lines.length-1;
      const candidate=lines[last]?lines[last]+' '+word:word;
      if(lines[last]&&bitmapTextWidth(candidate)>canvas.width-2)lines.push(word);
      else lines[last]=candidate;
    }
    if(lines.length>maxLines||lines.some(line=>bitmapTextWidth(line)>canvas.width-2)){
      console.warn('Printer title exceeds its pixel grid:',fullText);
    }
    return {canvas,ctx,lines,lineHeight:9};
  }
  function stampBitmap(layout,visibleChars,showCursor=false){
    const {canvas,ctx,lines,lineHeight}=layout;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#34312f';
    let remaining=visibleChars,caretX=1,caretY=0;
    const firstY=Math.floor((canvas.height-(lines.length-1)*lineHeight-7)/2);
    lines.forEach((line,i)=>{
      const count=Math.min(line.length,Math.max(0,remaining));
      const piece=line.slice(0,count);
      const y=firstY+i*lineHeight;
      let x=1;
      for(const character of piece){
        const pattern=glyphs[character];
        if(pattern){
          pattern.forEach((bits,cy)=>{
            for(let cx=0;cx<bits.length;cx++)if(bits[cx]==='1')ctx.fillRect(x+cx,y+cy,1,1);
          });
        }
        x+=advanceFor(character);
      }
      if(remaining>=0&&remaining<=line.length){caretX=x+1;caretY=y;}
      remaining-=line.length+1;
    });
    if(showCursor)ctx.fillRect(Math.min(canvas.width-2,caretX),caretY,1,7);
  }
  function makeRow(item,i){
    const row=document.createElement('div');
    row.className='paper-entry';
    if(item.title.length>30)row.classList.add('long');
    row.style.top=(art.top[i]/art.height*100).toFixed(5)+'%';
    const no=document.createElement('span');no.className='paper-no';
    const title=document.createElement('span');title.className='paper-title';
    const noCanvas=pixelCanvas(15,11);
    const titleCanvas=pixelCanvas(item.title.length>30?148:103,item.title.length>30?23:11);
    const noLabel=document.createElement('span');noLabel.className='visually-hidden';
    const titleLabel=document.createElement('span');titleLabel.className='visually-hidden';
    no.append(noCanvas,noLabel);title.append(titleCanvas,titleLabel);
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','paper-scribble');svg.setAttribute('viewBox','0 0 650 100');svg.setAttribute('aria-hidden','true');
    const strokes=[];
    for(let pass=0;pass<(item.title.length>30?4:2);pass++){
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',strokePath(i,pass));
      svg.append(path);strokes.push(path);
    }
    row.append(no,title,svg);
    $('paperEntries').append(row);
    return {noLabel,titleLabel,noArt:makeBitmapLayout(noCanvas,item.number,1),titleArt:makeBitmapLayout(titleCanvas,item.title,item.title.length>30?2:1),strokes};
  }
  chapters.forEach((item,i)=>rows.push(makeRow(item,i)));
  // Stroke lengths are computed from real DOM paths, making the reveal stable at any frame.
  const lengths=rows.map(row=>row.strokes.map(path=>{
    const len=path.getTotalLength();path.style.strokeDasharray=String(len);return len;
  }));

  function positionFor(index,w,mouthY){
    const paperWidth=w*.59;
    const sheetHeight=paperWidth*art.height/art.width;
    const rowCenter=(art.top[index]+art.rowHeight/2)/art.height*sheetHeight;
    const rowHeight=art.rowHeight/art.height*sheetHeight;
    // The active box sits immediately above the feed opening; no future blank box peeks out.
    return mouthY-rowHeight/2-7-rowCenter;
  }
  function phaseLabel(t){
    if(t<=0)return ['BEFORE TRANSITION','The slot will rise before the printer feeds any paper.'];
    const p=plan.points;
    if(t<p.slot.end)return ['SLOT RISING','The printer mouth slides up from below the frame.'];
    if(t<p.feed.end)return ['PAPER FEEDING','Existing printed boxes emerge from the slot.'];
    if(t<p.strike.end&&scenario>0)return ['CROSSING OUT','Heavy irregular ink strokes close the outgoing chapter.'];
    if(t<p.strikePause.end&&scenario>0)return ['INK SETTLING','The crossed-out chapter rests before the next box scroll.'];
    if(t<p.advance.end&&scenario>0)return ['ADVANCING','The paper advances to the next preprinted empty box.'];
    if(t<p.type.end)return ['TYPING ENTRY','The new chapter number and title are typed inside their existing box.'];
    if(t<p.hold.end)return ['ENTRY RECORDED','The completed chapter entry rests in the reading position.'];
    if(t<p.exit.end)return ['PAPER EXITING','The page reverses quickly while the printer descends slowly; both fade together.'];
    return ['NEXT CHAPTER','The next scene has replaced the previous one.'];
  }
  function drawInk(t){
    const typed=part(t,'type');
    const crossed=part(t,'strike');
    rows.forEach((row,i)=>{
      let count=0;
      if(i<scenario)count=chapters[i].title.length+3;
      else if(i===scenario&&t>=plan.points.type.start)count=Math.floor((chapters[i].title.length+3)*typed);
      const item=chapters[i];
      const numberText=count>=2?item.number:count===1?item.number[0]:'';
      const titleCount=Math.max(0,count-3);
      const titleText=item.title.slice(0,titleCount);
      row.noLabel.textContent=numberText;row.titleLabel.textContent=titleText;
      stampBitmap(row.noArt,numberText.length);
      stampBitmap(row.titleArt,titleCount,i===scenario&&typed>0&&typed<1);
      const inkProgress=i<scenario-1?1:i===scenario-1?crossed:0;
      row.strokes.forEach((path,pass)=>{
        const start=pass/(row.strokes.length-1)*.38;
        const amount=clamp((inkProgress-start)/(1-start));
        path.style.strokeDashoffset=String(lengths[i][pass]*(1-(reduced?(amount>=1?1:0):amount)));
      });
    });
  }
  function drawBackdrop(t){
    const base=$('background').value;
    const magenta='#a100a5',black='#000000';
    stage.classList.toggle('scenic',base==='scene');
    $('oldMatte').style.backgroundColor=base==='scene'?'#233a3c':base==='black'?black:magenta;
    $('nextMatte').style.backgroundColor=base==='scene'?'#2e4c55':base==='black'?magenta:black;
    const incoming=clamp(t/(plan.points.feed.end||1));
    const leaving=part(t,'exit');
    const treatment=$('backdrop').value;
    const nextVisible=t<plan.points.exit.start?0:ease(leaving);
    $('nextMatte').style.opacity=String(nextVisible);
    $('oldMatte').style.filter=`blur(${(incoming*3.5*(1-leaving)).toFixed(2)}px)`;
    $('nextMatte').style.filter=`blur(${((1-leaving)*2.1).toFixed(2)}px)`;
    const veil=(t<plan.points.exit.start?incoming:1-leaving)*(treatment==='blackout'?1:.65);
    $('blackVeil').style.opacity=String(veil);
  }
  function render(){
    const t=Math.max(0,Math.min(elapsed/1000,plan.total));
    const w=stage.clientWidth,h=stage.clientHeight;
    // Seat the sprite's bottommost opaque pixels below the 16:9 crop.
    const slotRestY=h*.925;
    const flipped=$('slotLip').value==='lower';
    // Both orientations share a feed seam; only the front-lip masking changes when flipped.
    const mouthY=slotRestY+17;
    const frontLipStart=flipped?33:28;
    const paperY=paperTuning.paperY*w/1024;
    const priorTop=positionFor(scenario?scenario-1:0,w,mouthY)+paperY;
    const newTop=positionFor(scenario,w,mouthY)+paperY;
    const entrance=mouthY+15+paperY;
    const p=plan.points;
    const slotIn=reduced?Number(part(t,'slot')>=1):ease(part(t,'slot'));
    const exitP=t>=p.exit.start?(reduced?Number(part(t,'exit')>=1):ease(part(t,'exit'))):0;
    const isRetracting=$('exitMode').value==='retract';
    const slowDrift=isRetracting?Math.min(58,h*.105)*exitP:0;
    const slotY=lerp(h+65,slotRestY,slotIn)+slowDrift;
    const exitAlpha=t>=p.exit.start?1-exitP:1;
    for(const image of [printer,frontPrinter])image.classList.toggle('flipped',flipped);
    printer.style.top=slotY.toFixed(2)+'px';
    printer.style.opacity=String(t<=0||part(t,'slot')<.02?0:exitAlpha);
    frontPrinter.style.top=printer.style.top;
    frontPrinter.style.opacity=printer.style.opacity;
    // Duplicate only the LOWER metal/slit pixels in front of the sheet, in either flip state.
    $('printerFront').style.clipPath=`inset(${(slotY+frontLipStart).toFixed(2)}px 0 0)`;
    // Continue the sheet through the black throat and underneath the foreground lip.
    const feedDepth=paperTuning.feedDepth*w/1024;
    $('paperViewport').style.height=(mouthY+feedDepth+slowDrift).toFixed(2)+'px';
    let top=entrance;
    if(t>=p.feed.start)top=lerp(entrance,priorTop,reduced?Number(part(t,'feed')>=1):ease(part(t,'feed')));
    if(t>=p.advance.start)top=lerp(priorTop,newTop,reduced?Number(part(t,'advance')>=1):ease(part(t,'advance')));
    let alpha=1;
    if(t>=p.exit.start){
      switch($('exitMode').value){
        case 'dissolve':top=newTop;break;
        case 'eject':top=lerp(newTop,-w*.59*1.5-12,exitP);break;
        default:top=lerp(newTop,entrance,exitP)+slowDrift;
      }
      alpha=exitAlpha;
    }
    sheet.style.top=top.toFixed(2)+'px';
    sheet.style.opacity=String(t<p.feed.start?0:alpha);
    drawInk(t);drawBackdrop(t);
    const [title,note]=phaseLabel(t);
    $('phaseLabel').textContent=title;
    $('stageStatus').textContent=mode==='paused'?'REVIEW HOLD':title;
    $('explain').textContent=note;
    $('timeLabel').textContent=t.toFixed(2)+' s';
    $('scrub').value=String(Math.round(t/plan.total*1000));
    $('play').textContent=mode==='playing'?'PAUSE':mode==='paused'?'RESUME':mode==='idle'?'PLAY':t>=plan.total?'REPLAY':'PLAY';
  }
  function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;last=0;}
  function reset(){stop();mode='idle';elapsed=0;render();}
  function setScenario(value){scenario=Number(value);plan=makePlan();reset();}
  function tick(now){
    if(mode!=='playing')return;
    if(!last)last=now;
    elapsed+=now-last;last=now;
    if(elapsed>=plan.total*1000){stop();elapsed=plan.total*1000;mode='complete';render();return;}
    render();frame=requestAnimationFrame(tick);
  }
  function play(){
    if(mode==='playing'){stop();mode='paused';render();return;}
    if(mode==='idle'||mode==='complete')elapsed=0;
    mode='playing';last=0;frame=requestAnimationFrame(tick);stage.focus({preventScroll:true});render();
  }
  function hold(){stop();mode='paused';elapsed=(plan.points.hold.start+plan.points.hold.duration*.45)*1000;render();}
  function phaseAnchor(){
    const t=Math.min(elapsed/1000,plan.total);
    const key=steps.find(name=>t<plan.points[name].end)||'exit';
    return {key,fraction:part(t,key)};
  }
  function pauseToTune(){
    if(mode==='playing'){stop();mode='paused';}
  }
  function clampedInputValue(input,value){
    const n=Number(value);
    if(!Number.isFinite(n))return Number(input.defaultValue);
    return Math.max(Number(input.min),Math.min(Number(input.max),n));
  }
  function tunePackage(){
    return {
      v:2,d:steps.map(key=>Number(durations[key].toFixed(2))),
      y:paperTuning.paperY,depth:paperTuning.feedDepth,
      chapter:scenario,background:$('background').value,treatment:$('backdrop').value,
      exit:$('exitMode').value,lip:$('slotLip').value
    };
  }
  function writeTuningLink(){
    const fragment=encodeURIComponent(JSON.stringify(tunePackage()));
    window.history.replaceState(null,'',window.location.pathname+window.location.search+'#tune='+fragment);
    $('tuneShare').value=window.location.href;
  }
  function restoreTuningLink(){
    let packed;
    try{packed=JSON.parse(new URLSearchParams(window.location.hash.slice(1)).get('tune')||'null');}
    catch{return;}
    if(!packed||(packed.v!==1&&packed.v!==2))return;
    const encodedSteps=packed.v===1?legacySteps:steps;
    if(Array.isArray(packed.d)&&packed.d.length===encodedSteps.length){
      encodedSteps.forEach((key,i)=>{
        const input=document.querySelector('[data-duration="'+key+'"]');
        durations[key]=clampedInputValue(input,packed.d[i]);
      });
    }
    for(const [prop,name] of [['paperY','y'],['feedDepth','depth']]){
      if(Object.hasOwn(packed,name))paperTuning[prop]=clampedInputValue($(prop),packed[name]);
    }
    for(const [id,name] of [['background','background'],['backdrop','treatment'],['exitMode','exit'],['slotLip','lip']]){
      const select=$(id);
      if(Array.from(select.options).some(option=>option.value===packed[name]))select.value=packed[name];
    }
    if([0,1,2,3].includes(packed.chapter)){
      scenario=packed.chapter;
      $('scenario').value=String(scenario);
    }
    plan=makePlan();
  }
  function refreshTuningControls(){
    for(const input of document.querySelectorAll('[data-duration]')){
      const value=durations[input.dataset.duration];
      input.value=String(value);
      $(input.id+'Value').textContent=value.toFixed(2)+' s';
    }
    for(const input of document.querySelectorAll('[data-paper-tune]')){
      const value=paperTuning[input.dataset.paperTune];
      input.value=String(value);
      $(input.id+'Value').textContent=(value>0&&input.id==='paperY'?'+':'')+value+' px';
    }
    $('tuneTotal').textContent=plan.total.toFixed(2)+' s';
    $('tuneShare').value=window.location.href;
  }
  function changeDuration(input){
    const anchor=phaseAnchor();
    const wasComplete=mode==='complete';
    pauseToTune();
    durations[input.dataset.duration]=clampedInputValue(input,input.value);
    plan=makePlan();
    if(wasComplete)elapsed=plan.total*1000;
    else if(mode!=='idle')elapsed=(plan.points[anchor.key].start+anchor.fraction*plan.points[anchor.key].duration)*1000;
    refreshTuningControls();render();writeTuningLink();
  }
  function changePaper(input){
    pauseToTune();
    paperTuning[input.dataset.paperTune]=clampedInputValue(input,input.value);
    refreshTuningControls();render();writeTuningLink();
  }
  function resetTuning(){
    Object.assign(durations,defaultDurations);
    Object.assign(paperTuning,defaultPaper);
    plan=makePlan();reset();refreshTuningControls();writeTuningLink();
    $('tuneMessage').textContent='Default timing and paper alignment restored.';
  }
  async function copyTuningLink(){
    writeTuningLink();
    const field=$('tuneShare');
    try{
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(field.value);
      $('tuneMessage').textContent='Copied! Paste this link into our chat when ready.';
    }catch{
      field.focus();field.select();
      $('tuneMessage').textContent='Link selected. Copy it with Ctrl/Cmd+C.';
    }
  }
  $('play').addEventListener('click',play);
  $('hold').addEventListener('click',hold);
  $('reset').addEventListener('click',reset);
  $('scenario').addEventListener('change',e=>{setScenario(e.target.value);refreshTuningControls();writeTuningLink();});
  for(const id of ['background','backdrop','exitMode','slotLip'])$(id).addEventListener('change',()=>{render();writeTuningLink();});
  for(const input of document.querySelectorAll('[data-duration]'))input.addEventListener('input',()=>changeDuration(input));
  for(const input of document.querySelectorAll('[data-paper-tune]'))input.addEventListener('input',()=>changePaper(input));
  $('resetTune').addEventListener('click',resetTuning);
  $('copyTune').addEventListener('click',copyTuningLink);
  $('tuneShare').addEventListener('focus',e=>e.target.select());
  $('scrub').addEventListener('input',e=>{
    stop();mode='paused';elapsed=Number(e.target.value)/1000*plan.total*1000;render();
  });
  stage.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();play();}});
  window.addEventListener('resize',render);
  restoreTuningLink();refreshTuningControls();reset();
})();
