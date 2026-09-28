// Focused browser integration of the production M6 handler and memory viewer.
// This is a component-level CG check, not a four-route world walkthrough.
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';
const out=process.argv[2]||'qa-results/identity-m6-cg';
await mkdir(out,{recursive:true});
const html=`<!doctype html><meta charset="utf-8"><title>M6 production CG integration</title>
<style>body{margin:0;background:#141d19;color:#eee;font:18px sans-serif}#memory-modal{display:none;padding:16px;box-sizing:border-box;max-width:1000px;margin:auto}#memory-modal.active{display:block}canvas{display:block;width:100%;height:auto}p{line-height:1.6}button{padding:8px;margin:4px}#memory-title{font-size:24px}</style>
<button id="start-li">Start LI</button><button id="start-zhou">Start ZHOU</button>
<div id="memory-modal"><h1 id="memory-title"></h1><span id="memory-mode"></span><p id="memory-source"></p><canvas id="memory-frame" width="1280" height="720"></canvas><span id="memory-stamp"></span><h2 id="memory-frame-title"></h2><p id="memory-caption"></p><p id="memory-narration"></p><span id="memory-indicator"></span><button id="btn-memory-prev">Previous</button><button id="btn-memory-next">Next</button><button id="close">Close</button></div>
<script type="module">
import {UIManager} from '/src/ui/UIManager.js';
import {IdentityRouteDirector} from '/src/story/IdentityRouteDirector.js';
import {getIdentityRouteScene} from '/src/story/IdentityRouteScenes.js';
window.__drawn=new Set();const original=CanvasRenderingContext2D.prototype.fillText;
CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__drawn.add(String(text));return original.call(this,text,...args);};
function start(identity){
  window.__drawn=new Set();
  const ui=Object.create(UIManager.prototype);
  ui.memoryModal=document.getElementById('memory-modal');ui.memoryFrameCanvas=document.getElementById('memory-frame');
  ui.showDialogue=(lines,done)=>{window.__dialogue=lines;done();};
  const director=Object.create(IdentityRouteDirector.prototype);
  Object.assign(director,{step:'M6',beatIndex:1,busy:false,manager:{currentIdentity:identity,runSave:{runEnded:false}},beats:getIdentityRouteScene('M6',identity),uiManager:ui,controller:{enabled:true},gameState:{flags:{},getFlag(key){return this.flags[key];},setFlag(key,value){this.flags[key]=value;}},bindingFor:()=>({}),completeBeat(){this.completed=(this.completed||0)+1;this.beatIndex++;this.controller.enabled=true;}});
  window.__cg={ui,director};
  document.getElementById('btn-memory-prev').onclick=()=>ui.stepMemory(-1);
  document.getElementById('btn-memory-next').onclick=()=>ui.stepMemory(1);
  document.getElementById('close').onclick=()=>ui.closeMemorySequence(false);
  director.inspect();
}
document.getElementById('start-li').onclick=()=>start('LI');document.getElementById('start-zhou').onclick=()=>start('ZHOU');window.__ready=true;
</script>`;
const server=await createServer({root:fileURLToPath(new URL('..',import.meta.url)),server:{host:'127.0.0.1',port:4186,strictPort:true},plugins:[{name:'m6-cg-test-document',configureServer(server){server.middlewares.use('/__m6-cg-test',(_,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);});}}]});
await server.listen();
const browser=await chromium.launch({headless:true});
const report={kind:'FOCUSED_PRODUCTION_HANDLER_AND_VIEWER',checks:[],errors:[]};
const forbidden=/李承禮|周啟文|張守恆|陳柏勳|守恆|[李周張陳]醫師|MED-|THE ORDER|THE WARNING|ZHANG|ZHOU|CHEN/;
try{
  for(const width of [1280,390])for(const identity of ['LI','ZHOU']){
    const page=await browser.newPage({viewport:{width,height:width===390?844:1000}});
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
    await page.goto('http://127.0.0.1:4186/__m6-cg-test');
    await page.waitForFunction(()=>window.__ready===true);
    await page.locator(`#start-${identity.toLowerCase()}`).click();
    await page.waitForFunction(()=>!!window.__cg.ui.memorySequence);
    const id=await page.evaluate(()=>window.__cg.ui.memorySequence.id);
    assert.equal(id,identity==='LI'?'LI_6F_ORDER_MEMORY':'ZHOU_6F_WARNING_MEMORY');
    for(let index=0;index<6;index++){
      await page.waitForFunction(index=>window.__cg.ui.memoryFrameIndex===index,index,{timeout:10000});
      assert.equal(await page.evaluate(()=>window.__cg.director.controller.enabled),false);
      assert.doesNotMatch(await page.locator('#memory-modal').innerText(),forbidden);
      assert.doesNotMatch(await page.evaluate(()=>[...window.__drawn].join('\n')),forbidden);
      await page.waitForTimeout(300);
      if(width===1280||index===0||index===5)await page.screenshot({path:`${out}/${identity}-${width}-frame-${index+1}.png`,fullPage:true});
      if(width===390&&index<5)await page.locator('#btn-memory-next').click();
    }
    if(width===1280)await page.waitForFunction(()=>window.__cg.director.completed===1,{},{timeout:12000});
    else await page.locator('#close').click();
    assert.equal(await page.evaluate(()=>window.__cg.director.completed),1);
    assert.equal(await page.evaluate(()=>window.__cg.director.controller.enabled),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(await page.evaluate(()=>window.__cg.director.gameState.flags),{[`${identity}_M6_MEMORY_SEEN`]:true});
    report.checks.push({identity,width,frames:6,verdict:'PASS',closure:width===1280?'automatic':'manual'});
    await page.close();
  }
  assert.deepEqual(report.errors,[]);
  report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await browser.close();await server.close();await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
