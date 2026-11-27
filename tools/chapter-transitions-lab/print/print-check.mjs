import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('print.html');
const css=read('print.css');
const js=read('print.js');
for(const name of ['scenario','background','backdrop','exitMode','slotLip','play','hold','reset','scrub','paperSheet','printer','printerFront','printerFrontCopy','paperEntries','tunePanel','paperY','feedDepth','tuneTotal','resetTune','copyTune','tuneShare']){
  assert.match(html,new RegExp(`id="${name}"`),`missing ${name}`);
}
for(const key of ['prep','slot','feed','strike','strikePause','advance','type','hold','exit']){
  assert.match(html,new RegExp('data-duration="'+key+'"'),'missing timing slider '+key);
}
assert.match(html,/Pause after scribble/,'post-crossout pause must be adjustable');
for(const text of ['Register of Progress','Reverse feed + fade','Still paper + dissolve','Feed upward + fade','Black → Magenta','Magenta → Black','Thick on top','Thick on bottom']){
  assert.ok(html.includes(text),`missing UI copy ${text}`);
}
for(const title of ['The Last Good Day','House of Tomorrow','Biology Park - Your Nature Is Required',"The People's Pavilion — All Persons Accounted For"]){
  assert.ok(js.includes(title),`missing canonical title ${title}`);
}
assert.match(js,/chapters\.forEach\(\(item,i\)=>rows\.push\(makeRow\(item,i\)\)\)/,'entries should be constructed before playback');
assert.match(js,/const inkProgress=/,'completed/previous-row strike logic missing');
assert.match(js,/const steps=\['prep','slot','feed','strike','strikePause','advance'/,'post-scribble pause must precede the paper scroll');
assert.match(js,/if\(t<p\.strikePause\.end&&scenario>0\)/,'the post-scribble pause needs a distinct hold phase');
assert.match(js,/key==='strikePause'/,'new-game prologue must skip the post-scribble pause');
assert.match(js,/strokeDashoffset/,'scribble should draw progressively');
assert.match(js,/for\(let x=4;x<645;x\+=15\)/,'scribble must cover the entire text column');
assert.match(js,/item\.title\.length>30\?4:2/,'two-line titles need ink passes over both lines');
assert.match(css,/stroke-width:14/,'cross-out should be strong enough to obscure typed text');
assert.match(js,/\.title\.slice\(0,titleCount\)/,'typewriter entry must be progressive');
assert.match(css,/\.paper-viewport\{[^}]*overflow:hidden/,'printer mouth must clip paper');
assert.match(css,/\.paper-viewport\{[^}]*z-index:6/,'paper must overlap the printer upper lip');
assert.match(css,/\.printer\{[^}]*z-index:5/,'printer must sit behind the feeding sheet');
assert.match(js,/const slotRestY=h\*\.925/,'printer bottom should be cropped offscreen');
assert.match(js,/const mouthY=slotRestY\+17/,'paper must align to the slot seam in both orientations');
assert.match(js,/style\.clipPath=/,'lower printer lip must hide paper viewport cutoff');
assert.match(js,/const frontLipStart=flipped\?33:28/,'bottom-heavy slot must cover paper only at its foreground lip');
assert.match(js,/const feedDepth=paperTuning\.feedDepth\*w\/1024/,'sheet must extend into the slot throat');
assert.match(js,/paperTuning\.paperY\*w\/1024/,'paper vertical offset must be independently adjustable');
assert.match(js,/const anchor=phaseAnchor\(\)/,'changing phase timing should preserve its playback position');
assert.match(js,/function restoreTuningLink\(/,'shared tuning URLs must restore slider values');
assert.match(js,/const encodedSteps=packed\.v===1\?legacySteps:steps/,'older eight-phase tuning URLs must remain compatible');
assert.match(js,/v:2,d:steps\.map/,'new tuning links must encode the additional phase');
assert.match(js,/function writeTuningLink\(/,'tuned values must be shareable');
assert.match(js,/navigator\.clipboard\?\.writeText/,'copying settings must be wired to the clipboard');
assert.match(js,/mouthY\+feedDepth\+slowDrift/,'paper extension must follow slow exit descent');
assert.match(js,/return mouthY-rowHeight\/2-7-rowCenter/,'only active box may remain above slot');
assert.match(js,/const slowDrift=isRetracting\?Math\.min\(58,h\*\.105\)\*exitP:0/,'slow slot descent missing during reverse feed');
assert.match(js,/alpha=exitAlpha/,'paper and printer must fade at equal rate');
assert.match(js,/function stampBitmap\(/,'entries must be drawn as low-resolution bitmap type');
assert.match(js,/const glyphSource=\{/,'printer lettering must use authored bitmap glyph shapes');
assert.match(js,/ctx\.fillRect\(x\+cx,y\+cy,1,1\)/,'bitmap font cells must be drawn as solid square pixels');
assert.match(css,/\.paper-entry canvas\{[^}]*image-rendering:pixelated/,'bitmap glyphs must scale nearest-neighbor');
assert.match(js,/const defaultDurations=\{prep:\.18,slot:\.70/,'Nate selected 0.70-second slot rise');
assert.match(js,/const defaultPaper=\{paperY:-5,feedDepth:5\}/,'Nate selected -5px paper alignment and 5px insertion');
assert.match(js,/strike:\.60,strikePause:\.75,advance:1\.20,type:1\.20,hold:2\.85,exit:1\.50/,'Nate selected latest timing values with a 0.75s post-scribble pause');
assert.match(html,/id="tuneTotal">9\.68 s/,'displayed total should reflect the selected timing defaults');
assert.match(html,/<option value="scene" selected>/,'scene-art test must be the default backdrop');
assert.match(html,/<option value="lower" selected>/,'thick-on-bottom must be default');
assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(js),'study must not touch persistent game state or network');
for(const sprite of ['form-27b6-blank-v01.png','printer-slot-v01.png']){
  const binary=fs.readFileSync(path.join(root,'art/print',sprite));
  assert.equal(binary.subarray(1,4).toString('ascii'),'PNG',`${sprite} must be PNG`);
  assert.equal(binary[25],6,`${sprite} must be RGBA with alpha channel`);
  assert.ok(binary.length>25000,`${sprite} looks like a placeholder`);
}
console.log('Printer study checks passed: preprinted boxes, typed entry gate, irregular ink, exit/backdrop controls, RGBA sprites and isolated state.');
