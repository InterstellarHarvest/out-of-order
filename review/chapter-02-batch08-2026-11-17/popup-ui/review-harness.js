/* Review data adapter only. No production engine, controls or canonical text changes. */
(function(){
'use strict';
var G=window.CYOA_GAME,current=null,sequence=0,frames={},data=window.BATCH8_REVIEW_DATA;
G.flow={restoreAvailable:function(){return false;},restore:function(){throw Error('No gameplay state in art review');}};
G.captureStage=function(){
 var c=document.createElement('canvas');c.width=1920;c.height=1080;c.dataset.capture='approved-scene-review-standin';
 var ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#25363b';ctx.fillRect(0,0,1920,1080);
 ctx.drawImage(G.image('review-background:'+current),332,128,1256,824);return c;
};
window.showBatch8=function(letter){
 var entry=data.filter(function(e){return e.letter===letter;})[0];if(!entry)throw Error(letter);
 G.endPresentation.close('review-next');current=letter;
 G.endPresentation.reached({end:entry.id},'art-review:'+letter+':'+(++sequence));return document.getElementById('endPresentation');
};
function flatten(root){
 var c=document.createElement('canvas');c.width=1920;c.height=1080;var ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 function walk(node,x,y){
  if(node.hidden)return;x+=parseFloat(node.style.left)||0;y+=parseFloat(node.style.top)||0;
  if(node.tagName==='CANVAS'||node.tagName==='IMG')ctx.drawImage(node,x,y,parseFloat(node.style.width)||node.width,parseFloat(node.style.height)||node.height);
  Array.from(node.children).forEach(function(n){walk(n,x,y);});
 }
 Array.from(root.children).forEach(function(n){walk(n,0,0);});return c;
}
function prove(letter,root,c){
 var entry=data.filter(function(e){return e.letter===letter;})[0],art=document.getElementById('endArt');
 var expected=document.createElement('canvas');expected.width=628;expected.height=412;var ec=expected.getContext('2d');ec.imageSmoothingEnabled=false;ec.drawImage(G.image('end:'+entry.id),0,0,628,412);
 var a=c.getContext('2d').getImageData(312,205,628,412).data,b=ec.getImageData(0,0,628,412).data,diff=0;
 for(var i=0;i<a.length;i++)if(a[i]!==b[i])diff++;
 return {letter:letter,artNative:[art.naturalWidth,art.naturalHeight],artDisplay:[art.width,art.height],artPosition:[parseFloat(art.style.left),parseFloat(art.style.top)],imageRendering:getComputedStyle(art).imageRendering,changedArtChannelsAgainstExact2x:diff,titleExact:document.getElementById('endTitle').dataset.text===entry.title,subtitleExact:document.getElementById('endSubtitle').dataset.text.replace(/\s+/g,' ')===entry.subtitle,bodyExact:document.getElementById('endBody').dataset.text.replace(/\s+/g,' ')===entry.body.join(' ').replace(/\s+/g,' '),controls:Array.from(root.querySelectorAll('button')).map(function(n){return n.dataset.label;}),textOverflow:root.dataset.textOverflow,backdropBlock:document.getElementById('endBackdrop').dataset.block,backdropMultiply:document.getElementById('endBackdrop').dataset.multiply};
}
var list=G.endPresentation.bootImages();
['labels','dialogue'].forEach(function(role){var f=G.text.face(role);list.push({name:'font:'+f.id,url:G.url(f.atlas)});});
data.forEach(function(e){list.push({name:'review-background:'+e.letter,url:e.background});});
G.decodeImages(list).then(function(){
 var reports=[],snapshots={};data.forEach(function(e){var root=window.showBatch8(e.letter),c=flatten(root);reports.push(prove(e.letter,root,c));snapshots[e.letter]=c.toDataURL('image/png').split(',')[1];});
 var passed=reports.every(function(r){return r.artNative.join()==='314,206'&&r.artDisplay.join()==='628,412'&&r.artPosition.join()==='312,205'&&r.changedArtChannelsAgainstExact2x===0&&r.titleExact&&r.subtitleExact&&r.bodyExact&&r.controls.join()==='RETRY,CHECKPOINT,EXIT'&&r.textOverflow==='false'&&r.backdropBlock==='10'&&r.backdropMultiply==='0.35';});
 var result=document.createElement('pre');result.id='popup-qa-result';result.hidden=true;result.textContent=JSON.stringify({passed:passed,reports:reports,snapshots:snapshots,reviewOnlyCandidateBindings:true,productionStateUntouched:true});document.body.append(result);
 window.showBatch8(new URLSearchParams(location.search).get('art')||'A');document.body.dataset.popupReady='true';
}).catch(function(e){var out=document.createElement('pre');out.id='popup-qa-error';out.textContent=e.stack;document.body.append(out);});
})();
