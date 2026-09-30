import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {IdentityManager,IDENTITY_STORAGE_KEY,IDENTITY_PROFILES} from '../src/core/IdentityManager.js';
const out=process.argv[2]||'qa-results/m9/browser';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4201,strictPort:true}});
const base=supplied||'http://127.0.0.1:4201/';
const assets=await readdir('dist/assets'),js=await readFile('dist/assets/'+assets.find(x=>/^index-.*\.js$/.test(x)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={base,method:'Production bundle, persisted M9 checkpoint fixture. Physically supported unobstructed terminal approach, real E keys, radio controls and final submit. World rendering sampled; ending WebGL/clock/audio play naturally for the full first run. Frame data observed after rendering; PNGs taken on a separate paused replay. Not a whole-route walkthrough.',checks:[],errors:[],resources:[],screenshots:[]};
const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
let page;
async function shot(name){await page.screenshot({path:`${out}/${name}.png`,timeout:30000});report.screenshots.push(name+'.png');}
async function start(identity,width=1280){
 if(page)await page.close();page=await browser.newPage({viewport:{width,height:860}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(`${r.status()} ${r.url()}`);});
 const manager=IdentityManager.createForTest(identity);while(manager.currentRouteStep!=='M9')manager.completeRouteStep(manager.currentRouteStep);
 await page.addInitScript(({loop,key,state})=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,state);
  const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===loop){window.__m9WorldFrame=fn;return 0;}return raf(fn);};
 },{loop,key:IDENTITY_STORAGE_KEY,state:JSON.stringify(manager.snapshot())});
 await page.goto(base+'?qa=story',{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
 const hit=await page.evaluate(()=>{
  const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller,o=q.identityRouteDirector.boundTarget?.object;
  if(!o)throw Error('M9 terminal not bound');z.zoneGroup.updateMatrixWorld(true);const center=o.getWorldPosition(c.position.clone()),ray=new c.raycaster.constructor();
  const visible=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;};
  for(const dy of [0,.08,-.08])for(const r of [.85,1.2,1.6,2,2.6])for(let i=0;i<48;i++){
   const a=i*Math.PI/24,x=center.x+r*Math.cos(a),zz=center.z+r*Math.sin(a);c.teleport(x,1.7,zz);
   if(c.checkCollision(x,zz)||c.supportedHeight(x,zz)===null)continue;
   const target=center.clone();target.y+=dy;const delta=target.clone().sub(c.camera.position),distance=delta.length();ray.set(c.camera.position,delta.normalize());ray.far=distance+.01;
   const h=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>=.85)));
   let own=false;for(let p=h?.object;p;p=p.parent)if(p===o||(o.parent!==z.zoneGroup&&p===o.parent))own=true;
   if(h&&!own&&h.distance<distance-.025)continue;
   if(q.lookAt(target.toArray()).current===o.userData.id){c.enabled=true;window.__m9WorldFrame?.();return {eye:c.camera.position.toArray(),target:target.toArray(),id:o.userData.id};}
  }throw Error('No accessible terminal target');
 });
 await page.keyboard.press('KeyE');
 for(let i=0;i<15;i++){if(!await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence))break;await page.keyboard.press('KeyE');}
 await page.locator('#identity-loop-panel.m9-open').waitFor();
 assert.equal(await page.locator('.identity-selection-form input[type=text]').count(),0);
 assert.equal(await page.locator('.identity-selection-form input[type=radio]').count(),8);
 assert.equal(await page.locator('.identity-selection-form input:checked').count(),0);
 assert.equal(await page.locator('.identity-entry-submit').isDisabled(),true);
 return hit;
}
async function choose(name,staff){
 await page.locator(`input[name="m9-name"][value="${name}"]`).check();
 assert.equal(await page.locator('input[name="m9-employee"]:checked').count(),0,'choosing a name must not auto-pair an ID');
 assert.equal(await page.locator('.identity-entry-submit').isDisabled(),true);
 await page.locator(`input[name="m9-employee"][value="${staff}"]`).check();
 assert.equal(await page.locator('.identity-entry-submit').isEnabled(),true);
}
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await save();console.log('M9_PASS',name);}
async function current(){return page.evaluate(()=>window.__storyQA.identityManager.snapshot());}
try{
 for(const [i,id]of ['LI','ZHANG','ZHOU','CHEN'].entries()){
  const width=i===3?390:1280;const hit=await start(id,width);
  await check(`${id}: independent unselected groups, accessible terminal, no typed entry`,async()=>{
   await choose(id,id);await page.evaluate(()=>window.__m9WorldFrame?.());await shot(`${id}-M9-choice-pair-${width}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   return {hit,width,selectedName:IDENTITY_PROFILES[id].name,selectedId:IDENTITY_PROFILES[id].employeeId};
  });
  await check(`${id}: correct pair plays its own full 24-second three-shot CG`,async()=>{
   await page.locator('.identity-entry-submit').click();
   const saved=await current();assert.equal(saved.runSave.m9CommittedChoice,id);assert.equal(saved.runSave.m9CommittedEmployeeChoice,id);assert.deepEqual(saved.metaSave.completedGoodEnds,[id]);
   await page.waitForFunction(()=>window.__storyQA.identityGoodEndingDirector?.status==='playing',{},{timeout:30000});
   assert.equal(await page.locator('#identity-good-ending').getAttribute('data-identity'),id);
   // Observe rendered frames in the browser before finish() disposes the scene.
   // Serial PNG capture is slower than playback on software GPUs; it must not
   // race the 24-second cleanup or alter the natural-playback result.
   await page.evaluate(()=>{
    const d=window.__storyQA.identityGoodEndingDirector,render=d.renderFrame;
    window.__m9NaturalFrames=[];
    d.renderFrame=function(){
     render.call(this);
     const frames=window.__m9NaturalFrames,t=[3,11,19][frames.length];
     if(this.elapsed>=t&&this.set){
      const named=[];this.set.scene.traverse(o=>{if(o.name.startsWith(this.identity+'_'))named.push({name:o.name,p:o.position.toArray(),r:o.rotation.toArray()});});
      frames.push({elapsed:this.elapsed,shot:this.lastShot,camera:this.camera.position.toArray(),title:this.root.querySelector('.ige-caption h1').textContent,named});
     }
    };
   });
   await page.waitForFunction(()=>window.__storyQA.identityGoodEndingDirector?.status==='complete',{},{timeout:45000});
   const frames=await page.evaluate(()=>window.__m9NaturalFrames);
   assert.equal(frames.length,3);
   assert.deepEqual(frames.map(f=>f.shot),[0,1,2]);
   assert.equal(new Set(frames.map(f=>f.title)).size,3);
   assert.notDeepEqual(frames[0].camera,frames[2].camera);
   assert.notDeepEqual(frames[0].named,frames[2].named);
   await page.waitForFunction(()=>window.__storyQA.identityGoodEndingDirector?.status==='complete',{},{timeout:15000});
   assert.equal(await page.locator('#identity-good-ending').count(),0);
   assert.equal(await page.locator('#final-success-modal.active').count(),0,'do not run the generic linear Zhang ending');
   assert.equal(await page.evaluate(()=>window.__storyQA.identityGoodEndingDirector.renderer),null);
   assert.deepEqual(await page.evaluate(id=>window.__storyQA.identityLoopPanel.commit(id,id),id),{ok:false,reason:'ALREADY_COMMITTED'});
   assert.deepEqual(await current(),saved);await shot(`${id}-ending-summary`);
   const frameCount=await page.evaluate(()=>window.__storyQA.identityGoodEndingDirector.frameCount);
   // Capture visual evidence on a separate replay using the real pause control.
   // The full first playback above is neither paused nor fast-forwarded.
   await page.locator('.identity-ending-replay').click();
   await page.waitForFunction(()=>window.__storyQA.identityGoodEndingDirector?.status==='playing',{},{timeout:30000});
   await page.evaluate(()=>{
    const d=window.__storyQA.identityGoodEndingDirector,render=d.renderFrame;
    window.__m9CaptureCount=0;
    d.renderFrame=function(){
     render.call(this);
     if(!this.paused&&this.elapsed>=[3,11,19][window.__m9CaptureCount]){
      window.__m9CaptureCount++;this.root.querySelector('[data-ige-pause]').click();
     }
    };
   });
   const captures=[];
   for(let index=0;index<3;index++){
    await page.waitForFunction(index=>window.__m9CaptureCount===index+1&&window.__storyQA.identityGoodEndingDirector.paused,index,{timeout:20000});
    const state=await page.evaluate(()=>({elapsed:window.__storyQA.identityGoodEndingDirector.elapsed,shot:window.__storyQA.identityGoodEndingDirector.lastShot}));
    assert.equal(state.shot,index);captures.push(state);
    await shot(`${id}-ending-shot-${index+1}`);
    if(index<2)await page.locator('[data-ige-pause]').click();
   }
   await page.locator('[data-ige-skip]').click();assert.deepEqual(await current(),saved);
   return {frames,saved,frameCount,captures,captureMethod:'Separate replay paused by the real pause button; no clock/scene fast-forward'};
  });
  await check(`${id}: finalized reload stays locked, explicit replay pauses and skips safely`,async()=>{
   const saved=await current();await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.__storyQA?.identityManager.runSave.runEnded,{},{timeout:120000});
   await page.locator('.identity-ending-replay').click();await page.waitForFunction(()=>window.__storyQA.identityGoodEndingDirector?.status==='playing',{},{timeout:30000});
   await page.waitForFunction(()=>window.__storyQA.identityGoodEndingDirector.elapsed>1);
   await page.locator('[data-ige-pause]').click();const at=await page.evaluate(()=>window.__storyQA.identityGoodEndingDirector.elapsed);await page.waitForTimeout(300);
   assert.equal(await page.evaluate(()=>window.__storyQA.identityGoodEndingDirector.elapsed),at);
   await page.locator('[data-ige-pause]').click();await page.waitForTimeout(250);
   await page.locator('[data-ige-skip]').click();assert.equal(await page.locator('#identity-good-ending').count(),0);assert.deepEqual(await current(),saved);
   return {pauseAt:at,replayedWithoutAnotherCommit:true};
  });
 }
 for(const id of ['LI','ZHANG','ZHOU','CHEN']){
  const other=['LI','ZHANG','ZHOU','CHEN'].find(x=>x!==id);
  for(const [label,name,staff]of [['correct-name-wrong-id',id,other],['wrong-name-correct-id',other,id],['other-person-matched-pair',other,other]]){
   await start(id);await choose(name,staff);
   await check(`${id}: ${label} is an irreversible bad ending, including reload`,async()=>{
    await page.locator('.identity-entry-submit').click();await page.waitForFunction(()=>window.__storyQA.identityManager.runSave.runEnded);
    const saved=await current();assert.deepEqual(saved.metaSave.completedGoodEnds,[]);
    assert.equal(saved.runSave.m9CommittedChoice,name);assert.equal(saved.runSave.m9CommittedEmployeeChoice,staff);
    assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.committedM9Result.type),'WRONG_MEMORY_BAD_END');
    assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('FINAL_PATIENTIZATION_ACTIVE')),true);
    assert.equal(await page.locator('#identity-good-ending').count(),0);
    if(label==='correct-name-wrong-id'){
     await shot(`${id}-wrong-staff-id-locked`);
     await page.reload({waitUntil:'load'});await page.waitForFunction(()=>window.__storyQA?.identityManager.runSave.runEnded,{},{timeout:120000});
     assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.committedM9Result.type),'WRONG_MEMORY_BAD_END');
     assert.equal(await page.locator('#identity-loop-panel.m9-open').count(),0);assert.deepEqual(await current(),saved);
    }
    assert.equal((await page.evaluate(id=>window.__storyQA.identityLoopPanel.commit(id,id),id)).reason,'ALREADY_COMMITTED');return saved.runSave;
   });
  }
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=String(error.stack);console.error(error);if(page)try{await shot('failure');}catch{}process.exitCode=1;}
finally{await save();await browser.close();if(server)await new Promise(resolve=>server.httpServer.close(resolve));}
