import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'qa-results/b2-recovery';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4199,strictPort:true}});
const base=supplied||'http://127.0.0.1:4199/';
const assets=await readdir('dist/assets'),js=await readFile('dist/assets/'+assets.find(p=>/^index-.*\.js$/.test(p)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop,'main renderer name');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const baseline=process.env.B2_BASELINE==='1';
const report={baseline,method:'Production bundle with seeded checkpoints and supported standing fixtures; real E-key and UI handlers. Not a complete first-person playthrough. Main render sampled on demand; the actual route director runs continuously on a 16 ms clock to expose dialogue re-entry races.',base,checks:[],errors:[],resources:[],screenshots:[]};
let page;const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function start(identity){
 if(page)await page.close();page=await browser.newPage({viewport:{width:1280,height:860}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__closureFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto(base+'?qa=story&identity='+identity,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
}
async function aim(id=null){return page.evaluate(id=>{
 const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller,o=id?z.interactables.find(o=>o.userData?.id===id):q.identityRouteDirector.boundTarget?.object;
 if(!o)throw Error('Missing physical target '+id);z.zoneGroup.updateMatrixWorld(true);const center=o.getWorldPosition(c.position.clone()),ray=new c.raycaster.constructor();
 if(o.isGroup)new c.colliders[0].constructor().setFromObject(o).getCenter(center);
 const visible=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;};
 for(const dy of [0,.025,-.025,.12])for(const r of [.75,1.1,1.5,1.9,2.3,2.9])for(let i=0;i<48;i++){
  const a=i*Math.PI/24,x=center.x+r*Math.cos(a),zz=center.z+r*Math.sin(a);c.teleport(x,1.7,zz);
  if(c.checkCollision(x,zz)||c.supportedHeight(x,zz)===null)continue;
  const eye=c.camera.position.clone(),target=center.clone();target.y+=dy;const delta=target.clone().sub(eye),distance=delta.length();if(distance>=4.4)continue;
  ray.set(eye,delta.normalize());ray.far=distance+.01;
  const h=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>=.85)));
  let own=false;for(let p=h?.object;p;p=p.parent)if(p===o||(o.parent!==z.zoneGroup&&p===o.parent))own=true;
  if(h&&!own&&h.distance<distance-.025)continue;
  if(q.lookAt(target.toArray()).current===o.userData.id){c.enabled=true;return {id:o.userData.id,eye:eye.toArray(),target:target.toArray()};}
 }
 throw Error('No clear supported approach: '+o.userData.id);
},id);}
async function dialogue(){const lines=[];for(let i=0;i<40;i++){if(!await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence))return lines;lines.push(await page.locator('#subtitle-text').innerText());await page.keyboard.press('KeyE');}throw Error('Dialogue did not complete');}
async function shot(name){await page.evaluate(()=>window.__closureFrame?.());await page.waitForTimeout(150);await page.screenshot({path:`${out}/${name}.png`,timeout:20000});report.screenshots.push(name+'.png');}
async function e(id){const hit=await aim(id);await page.keyboard.press('KeyE');await dialogue();return hit;}
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await save();console.log('CLINICAL_CLOSURE_PASS',name);}

async function seed(identity,{visited=true,badge=true,step='B2'}={}){
 await start(identity);
 await page.evaluate(async({visited,badge,step})=>{
  const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager,u=q.uiManager;
  d.removeInteractionTarget();u.closeAllTransientOverlays();u.dialogueSequence=null;u.closeStoryChoice(false);
  m.runSave.currentRouteStep=m.route.indexOf(step);m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone=step;
  m.runSave.b2Entered=false;
  if(badge&&m.currentIdentity==='CHEN')m.recordEvidence({id:'route:M4:5',category:'route',milestone:'M4',visibleText:'已檢驗並收起識別證'});
  m.save();q.setFlag('ADMIN_OFFICE_ENTERED',visited);q.setFlag('ARCHIVE_ROOM_ENTERED',visited);
  q.setFlag('CHEN_GREY_BADGE_COLLECTED',badge&&m.currentIdentity==='CHEN');
  d.busy=false;await d.loadCurrentStep({forceLoad:true});q.controller.enabled=true;
  const show=u.showDialogue.bind(u);window.__dialogueStarts=[];
  u.showDialogue=(lines,done)=>{window.__dialogueStarts.push({step:d.step,zone:q.worldRouter.activeZoneId,first:lines[0]?.text});return show(lines,done);};
  window.__b2Ticks=0;
  window.__b2Tick=setInterval(()=>{window.__b2Ticks++;d.update();},16);
 },{visited,badge,step});
 if(step==='B2'){await page.waitForFunction(()=>!!window.__storyQA.uiManager.dialogueSequence);await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);}
}
async function state(){return page.evaluate(()=>{const q=window.__storyQA,d=q.identityRouteDirector;return {
 identity:q.identityManager.currentIdentity,step:d.step,beat:d.beatIndex,zone:q.worldRouter.activeZoneId,awaiting:d.awaitingZone,
 dialogue:q.uiManager.dialogueSequence?{index:q.uiManager.dialogueSequence.index,first:q.uiManager.dialogueSequence.lines[0]?.text}:null,
 recap:q.gameState.getFlag('B2_FIRE_RECAP_SEEN'),exited:q.gameState.getFlag('B2_EXITED_PERMANENTLY'),badge:q.gameState.getFlag('CHEN_GREY_BADGE_COLLECTED'),
 target:d.boundTarget?.object?.userData?.id,objective:document.querySelector('#task-panel').innerText,starts:window.__dialogueStarts||[],ticks:window.__b2Ticks
 };});}
async function recap(){
 const terminal=await aim('B2_ARCHIVE_TERMINAL');await page.keyboard.press('KeyE');
 await page.locator('#b2-fire-recap.active').waitFor();
 for(let i=0;i<6;i++){
  await page.waitForFunction(()=>!!window.__storyQA.b2FireRecapDirector.advanceResolve);
  await page.keyboard.press('KeyE');await page.waitForTimeout(280);
 }
 await page.waitForFunction(()=>window.__storyQA.gameState.getFlag('B2_FIRE_RECAP_SEEN')&&!window.__storyQA.b2FireRecapDirector.active);
 await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step!=='B2');return terminal;
}
async function exitTo(zone){const hit=await aim('B2_ONE_WAY_EXIT');await page.keyboard.press('KeyE');
 await page.waitForFunction(zone=>window.__storyQA.worldRouter.activeZoneId===zone,zone,{timeout:15000});
 await page.waitForFunction(()=>!window.__storyQA.identityRouteDirector.awaitingZone&&!window.__storyQA.identityRouteDirector.busy);
 return hit;
}
try{
 if(baseline){
  await seed('LI');await recap();await page.waitForTimeout(700);
  const a=await state();await page.keyboard.press('KeyE');await page.waitForTimeout(180);const b=await state();
  assert.equal(a.zone,'b2_archive');assert.match(a.dialogue.first,/B2 只證明四種職務/);assert.equal(b.dialogue.index,1);assert.ok(b.starts.length>a.starts.length);
  await shot('baseline-li-b2-repeating-first-line');report.checks.push({name:'Exact screenshot dialogue repeatedly resets in B2',status:'REPRODUCED',before:a,after:b});
  await seed('CHEN');await recap();await aim('B2_ONE_WAY_EXIT');await page.keyboard.press('KeyE');
  await page.getByText('必要資料載入失敗，請重試。',{exact:true}).waitFor({timeout:15000});
  await shot('baseline-chen-b1-missing-manifest');report.checks.push({name:'B1 exit fails at missing required manifest',status:'REPRODUCED',state:await state()});
  report.verdict='REPRODUCED';
 }else{
  await seed('LI');
  await check('B2 exit still requires actually reading the fire recap',async()=>{
   await aim('B2_ONE_WAY_EXIT');await page.keyboard.press('KeyE');await page.waitForTimeout(100);
   const s=await state();assert.equal(s.zone,'b2_archive');assert.equal(s.recap,false);assert.equal(s.exited,false);return s;
  });
  await check('Li: real terminal recap does not launch the 3F dialogue inside B2',async()=>{
   const terminal=await recap();await page.waitForTimeout(900);const s=await state();
   assert.equal(s.zone,'b2_archive');assert.equal(s.step,'LI_3F_EVIDENCE');assert.equal(s.dialogue,null);assert.equal(s.awaiting,'first_campus_3f');
   assert.match(s.objective,/離開 B2.*3F/);assert.ok(s.ticks>30);await shot('li-b2-recap-finished-exit-ready');return {terminal,...s};
  });
  await check('Li: physical exit, continuous updates and E keys finish the dialogue once on 3F',async()=>{
   const exit=await exitTo('first_campus_3f');await page.waitForFunction(()=>!!window.__storyQA.uiManager.dialogueSequence);
   const first=await state();await page.keyboard.press('KeyE');await page.waitForTimeout(450);const next=await state();
   assert.equal(next.dialogue.index,2);assert.equal(next.starts.filter(s=>s.step==='LI_3F_EVIDENCE').length,1);
   await shot('li-3f-dialogue-advances-not-restarted');await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='M9');
   assert.equal(await page.evaluate(()=>Object.keys(window.__storyQA.identityManager.runSave.evidence).filter(k=>k==='route:LI_3F_EVIDENCE:0').length),1);
   return {exit,first,next,after:await state()};
  });
  await seed('LI',{visited:false});await recap();
  await check('Li: unvisited 3F sources remain real tasks, not fabricated completion',async()=>{
   await exitTo('first_campus_3f');await page.waitForTimeout(400);const s=await state();
   assert.equal(s.step,'LI_3F_EVIDENCE');assert.equal(s.dialogue,null);assert.match(s.objective,/行政辦公室/);return s;
  });
  await seed('CHEN');await recap();
  await check('Chen: real B2 exit loads B1, its models and the dispatch board without retry overlay',async()=>{
   const exit=await exitTo('b1_dispatch_hub');assert.equal(await page.getByText('必要資料載入失敗，請重試。',{exact:true}).count(),0);
   const board=await aim('CHEN_DISPATCH_BOARD');const s=await state();assert.equal(s.step,'CHEN_M8_DISPATCH');assert.equal(s.badge,true);assert.equal(s.exited,true);
   await shot('chen-b1-arrival-board-interactable');return {exit,board,...s};
  });
  await check('Chen: refresh at B1 restores the same run and its proven physical badge',async()=>{
   const seed=await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed);
   await page.evaluate(()=>history.replaceState(null,'',location.pathname+'?qa=story'));
   await page.reload({waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
   await page.evaluate(()=>{window.__b2Tick=setInterval(()=>window.__storyQA.identityRouteDirector.update(),16);});
   const s=await state();assert.equal(s.zone,'b1_dispatch_hub');assert.equal(s.identity,'CHEN');assert.equal(s.badge,true);
   assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed),seed);return {seed,...s};
  });
  await check('Chen: board -> badge reader -> driver log -> service lift -> 316 all use E',async()=>{
   const board=await e('CHEN_DISPATCH_BOARD');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);
   const reader=await e('CHEN_DISPATCH_LOCKER_READER');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===2);
   assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.driverLog.visible),true);
   const log=await e('CHEN_DRIVER_LOG');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===3);
   const lift=await e('CHEN_DISPATCH_SERVICE_LIFT');await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_3f'&&window.__storyQA.identityRouteDirector.step==='M9',{},{timeout:15000});
   assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.canEnterB2()),false);
   await shot('chen-dispatch-complete-return-316');return {board,reader,log,lift,after:await state()};
  });
  await seed('CHEN',{badge:false,step:'CHEN_M8_DISPATCH'});
  await check('Chen: a run without badge evidence remains blocked at the reader',async()=>{
   await e('CHEN_DISPATCH_BOARD');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);
   await e('CHEN_DISPATCH_LOCKER_READER');const s=await state();assert.equal(s.badge,false);assert.equal(s.beat,1);assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('CHEN_DISPATCH_LOCKER_OPENED')),false);return s;
  });
  for(const identity of ['ZHANG','ZHOU']){
   await seed(identity);await recap();
   await check(`${identity}: original post-B2 destination remains unchanged`,async()=>{
    const zone=identity==='ZHANG'?'first_campus_3f':'first_campus_4f';await exitTo(zone);
    if(identity==='ZHOU'){await page.waitForFunction(()=>!!window.__storyQA.uiManager.dialogueSequence);await dialogue();}
    const s=await state();assert.equal(s.zone,zone);assert.ok(['ZHANG_3F_ARCHIVE','M8'].includes(s.step));return s;
   });
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
 }
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page){report.state=await state().catch(()=>null);await shot('failure').catch(()=>{});}}
finally{await save();await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));console.log('B2_RECOVERY_RESULT '+JSON.stringify(report));}
