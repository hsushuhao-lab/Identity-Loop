import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out=process.argv[2]||'../../qa-evidence/hospital-upgrade/annex';await mkdir(out,{recursive:true});
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4213,strictPort:true}});
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8');const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)[1];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={bundleSHA256:createHash('sha256').update(js).digest('hex'),method:'Production bundle; explicit M2 checkpoint, physical raycast approaches, real E/touch/UI and supported continuous walks. Main world rendering sampled; no physical-phone FPS claim.',checks:[],errors:[],screenshots:[]};
let context,page,mobile=false;const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await save();console.log('ANNEX_PASS',name);}
async function start(identity,touch=false){
 if(context)await context.close();mobile=touch;context=await browser.newContext({viewport:touch?{width:844,height:390}:{width:1280,height:800},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__annexFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto('http://127.0.0.1:4213/?qa=story&identity='+identity,{timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
 await page.evaluate(async()=>{const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;d.removeInteractionTarget();m.runSave.currentRouteStep=m.route.indexOf('M2');m.runSave.currentMilestone='M2';m.save();await d.loadCurrentStep({forceLoad:true});q.gameState.setGameTime('21:17');q.controller.enabled=true;});
}
async function aim(id){return page.evaluate(id=>{
 const q=window.__storyQA,c=q.controller,z=q.worldRouter.activeZoneInstance,o=z.interactables.find(o=>o.userData?.id===id);if(!o)throw Error('Missing '+id);z.zoneGroup.updateMatrixWorld(true);
 const center=o.getWorldPosition(c.position.clone());if(id==='HOSPITAL_STAFF')center.y+=1.15;
 const ray=new c.raycaster.constructor(),visible=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
 for(const radius of [1.5,1.1,.8,1.9,2.3,2.8])for(let i=0;i<64;i++){
  const angle=Math.PI/2+i*Math.PI/32;c.teleport(center.x+radius*Math.cos(angle),1.7,center.z+radius*Math.sin(angle));
  if(c.checkCollision(c.position.x,c.position.z)||c.supportedHeight(c.position.x,c.position.z)===null)continue;
  const delta=center.clone().sub(c.camera.position);ray.set(c.camera.position,delta.clone().normalize());ray.far=delta.length();
  const hit=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&!m.transparent));
  let own=false;for(let n=hit?.object;n;n=n.parent)if(n===o)own=true;
  if(hit&&!own&&hit.distance<delta.length()-.03)continue;
  if(q.lookAt(center.toArray()).current===id){c.enabled=true;return {id,position:c.position.toArray()};}
 }throw Error('No supported unobstructed approach '+id);
},id);}
async function use(id){const hit=await aim(id);if(mobile)await page.locator('#touch-interact').tap();else await page.keyboard.press('KeyE');return hit;}
async function close(){await page.locator('#hospital-case-panel [data-case-close]').click();}
async function shot(name){await page.bringToFront();const frame=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);const q=window.__storyQA;q.qualitySettings.lastRender=0;window.__annexFrame();return q.qualitySettings.snapshot();});await page.screenshot({path:out+'/'+name+'.png'});report.screenshots.push(name+'.png');return frame;}
async function enter(){await use('storage_STORE_ENTRY');await use('HOSPITAL_ANNEX_ENTRY');await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='ward_service_annex'&&!window.__storyQA.hospitalExcursion.transitioning);}
async function back(){await use('CASE_EXIT');await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_4f'&&!window.__storyQA.hospitalExcursion.transitioning);}
async function walk(points){
 const results=[];
 for(const target of points){
  await page.evaluate(target=>{const c=window.__storyQA.controller;c.resetInput();c.enabled=true;c.yaw=Math.atan2(c.position.x-target[0],c.position.z-target[1]);c.pitch=0;c.updateCameraRotation();},target);
  await page.keyboard.down('KeyW');
  const leg=await page.evaluate(target=>{const c=window.__storyQA.controller,start=c.position.toArray();let frames=0;for(;frames<360;frames++){if(Math.hypot(c.position.x-target[0],c.position.z-target[1])<.13)break;c.update(1/60);if(c.supportedHeight(c.position.x,c.position.z)===null||c.checkCollision(c.position.x,c.position.z))throw Error('Unsupported/colliding walking step');}return {start,end:c.position.toArray(),target,frames,distance:Math.hypot(c.position.x-target[0],c.position.z-target[1])};},target);
  await page.keyboard.up('KeyW');await page.evaluate(()=>window.__storyQA.controller.resetInput());assert(leg.distance<.13,JSON.stringify(leg));results.push(leg);
 }return results;
}
try{
 for(const identity of ['LI','ZHANG','ZHOU','CHEN']){
  await start(identity,identity==='CHEN');
  await check(identity+' optional paper path, exit and exact mainline beat recovery',async()=>{
   const before=await page.evaluate(()=>({manager:window.__storyQA.identityManager.snapshot(),beat:window.__storyQA.identityRouteDirector.beatIndex}));await enter();
   await use('CASE_PAPER');assert.match(await page.locator('[data-case-text]').innerText(),/1998|複寫單/);await close();
   await use('CASE_REPORT');await page.locator('[data-case-resolve="archive"]').click();assert.equal(await page.evaluate(()=>window.__storyQA.hospitalSimulation.data.sideCase.outcome),'archive');
   assert.doesNotMatch(await page.locator('#hospital-case-panel').innerText(),/李承禮|張守恆|周伯彥|陳國偉|MED-/);await shot(identity+'-archive');await close();await back();
   const after=await page.evaluate(()=>({manager:window.__storyQA.identityManager.snapshot(),beat:window.__storyQA.identityRouteDirector.beatIndex}));assert.deepEqual(after,before);
   assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.hospitalSystems.dressing.receipt.visible),true);
   await use('HOSPITAL_STAFF');await page.locator('[data-ask]').click();const voice=await page.locator('[data-status]').innerText();assert.doesNotMatch(voice,/李承禮|張守恆|周伯彥|陳國偉|MED-/);await page.locator('#hospital-panel [data-close]').click();
   const binding=await page.evaluate(()=>window.__storyQA.identityRouteDirector.qaInteractionState());assert.equal(binding.boundToWorldObject,true);assert.equal(binding.beatIndex,before.beat);return {before,after,voice,binding};
  });
 }
 await start('LI',true);
 await check('continuous keyboard walk reaches both annex rooms and exit corridor',async()=>{await enter();const legs=await walk([[0,-4.7],[-4,-4.7],[-4,-6],[-4,-4.7],[0,-4.7],[4,-4.7],[4,-6],[4,-4.7],[0,-4.7],[0,5.8]]);await shot('mobile-annex-entry');await back();return {legs};});
 await check('mechanical path needs no paper, fan animation and two outcomes on revisit',async()=>{
  await enter();await use('CASE_RELAY');await close();await use('CASE_POWER');await page.locator('[data-case-power]').click();await close();await use('CASE_FLOW');assert.match(await page.locator('[data-case-text]').innerText(),/沒有動/);await close();
  await use('CASE_DAMPER');await page.locator('[data-case-damper]').click();await close();await use('CASE_FLOW');assert.match(await page.locator('[data-case-text]').innerText(),/抖動/);await close();
  const animation=await page.evaluate(()=>{const z=window.__storyQA.worldRouter.activeZoneInstance,before=z.fan.rotation.z;z.update(null,.5);return {before,after:z.fan.rotation.z,strip:z.paperStrip.rotation.x};});assert.notEqual(animation.before,animation.after);
  await use('CASE_REPORT');assert.equal(await page.evaluate(()=>window.__storyQA.hospitalSimulation.data.sideCase.outcome),'pending','opening panel must not click an answer');await page.locator('[data-case-resolve="verify"]').click();const first=await page.evaluate(()=>window.__storyQA.hospitalSimulation.snapshot().sideCase);assert.equal(first.outcome,'verify');assert.equal(first.clues.includes('paper'),false);await close();
  const budget=await shot('mobile-annex-verified');assert.equal(budget.withinSceneBudget,true,JSON.stringify(budget));await back();await enter();assert.equal(await page.evaluate(()=>window.__storyQA.hospitalSimulation.data.sideCase.outcome),'verify');
  await use('CASE_REPORT');await page.locator('[data-case-resolve="archive"]').click();const revised=await page.evaluate(()=>window.__storyQA.hospitalSimulation.snapshot().sideCase);assert.equal(revised.outcome,'archive');assert.equal(revised.power,false);assert(revised.clues.includes('air_flow'));await close();await back();return {first,revised,animation,budget};
 });
 await check('reload inside annex preserves case and safely restores mainline',async()=>{
  await enter();const before=await page.evaluate(()=>({seed:window.__storyQA.identityManager.runSave.runSeed,case:window.__storyQA.hospitalSimulation.snapshot().sideCase}));await page.goto('http://127.0.0.1:4213/?qa=story');await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
  const after=await page.evaluate(()=>({seed:window.__storyQA.identityManager.runSave.runSeed,case:window.__storyQA.hospitalSimulation.snapshot().sideCase,zone:window.__storyQA.worldRouter.activeZoneId}));assert.equal(after.seed,before.seed);assert.deepEqual(after.case,before.case);assert.equal(after.zone,'first_campus_4f');return after;
 });
 await check('unfinished branch can exit, emergency event blocks new excursions',async()=>{
  await start('LI',true);
  await enter();await page.locator('#hospital-annex-return').click();await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_4f');
  assert.equal(await page.evaluate(()=>window.__storyQA.hospitalSimulation.data.sideCase.outcome),'pending');
  await page.evaluate(()=>window.__storyQA.gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',true));assert.equal(await page.evaluate(()=>window.__storyQA.hospitalExcursion.travel('enter')),false);assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId),'first_campus_4f');return {exitAlwaysAvailable:true,emergencyProtected:true};
 });
 assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page)await shot('failure').catch(()=>{});}
finally{await save();await browser.close();await new Promise(r=>server.httpServer.close(r));console.log('ANNEX_RESULT',report.verdict);}
