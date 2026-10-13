import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out=process.argv[2]||'qa-results/echo-browser';await mkdir(out,{recursive:true});
const base=process.argv[3]||'http://127.0.0.1:4273/';
const server=process.argv[3]?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4273,strictPort:true}});
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8');const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)[1];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={bundleSHA256:createHash('sha256').update(js).digest('hex'),method:'Production bundle; explicit M2 checkpoint, physical raycast approaches, real E/touch/UI and supported continuous walks. Main world rendering sampled; no physical-phone FPS claim.',checks:[],errors:[],screenshots:[]};
let context,page,mobile=false;const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await save();console.log('ECHO_PASS',name);}
async function start(identity,touch=false){
 if(context)await context.close();mobile=touch;context=await browser.newContext({viewport:touch?{width:390,height:844}:{width:1280,height:800},hasTouch:touch,isMobile:touch,deviceScaleFactor:1});page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__annexFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto(base+'?qa=story&identity='+identity,{timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
 await page.evaluate(async()=>{const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;d.removeInteractionTarget();m.runSave.currentRouteStep=m.route.indexOf('M2');m.runSave.currentMilestone='M2';m.save();await d.loadCurrentStep({forceLoad:true});q.gameState.setGameTime('21:17');q.gameState.markTaskComplete('KEY_PICKUP');q.controller.enabled=true;});
}
async function aim(id){return page.evaluate(id=>{
 const q=window.__storyQA,c=q.controller,z=q.worldRouter.activeZoneInstance,o=z.interactables.find(o=>o.userData?.id===id);if(!o)throw Error('Missing '+id);z.zoneGroup.updateMatrixWorld(true);
 const center=o.getWorldPosition(c.position.clone());if(id==='HOSPITAL_STAFF'||id==='ECHO_TECHNICIAN')center.y+=1.15;
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
report.source=process.env.GITHUB_SHA||'working-tree';
report.method='Production build; explicit M2/KEY_PICKUP story checkpoint and supported standing/camera fixtures. Native E/touch/DOM actions; world frames sampled. No physical-phone FPS or unassisted full-route claim.';
async function echoClose(){await page.locator('#echo-survey-panel [data-echo-close]').click();}
async function action(id){await page.locator('[data-echo-action="'+id+'"]').click();}
async function survey(){return page.evaluate(()=>window.__storyQA.echoSurvey.snapshot());}
async function mainState(){return page.evaluate(()=>{const q=window.__storyQA;return{manager:q.identityManager.snapshot(),beat:q.identityRouteDirector.beatIndex,time:q.gameState.gameTime};});}
try{
 const orders={LI:['paper','relay','air'],ZHANG:['relay','air','paper'],ZHOU:['air','paper','relay'],CHEN:['air','relay','paper']};
 for(const identity of Object.keys(orders)){
  await start(identity,identity==='CHEN');
  await check(identity+' non-linear passive survey, real NPC/tools, cancellation and exact mainline return',async()=>{
   const before=await mainState();await enter();const fresh=await survey();await use('ECHO_TECHNICIAN');await echoClose();assert.deepEqual(await survey(),fresh,'opening/cancelling never borrows or mutates');
   await use('ECHO_TECHNICIAN');await action('borrow');await echoClose();
   for(const id of orders[identity]){await use('ECHO_'+id.toUpperCase());await action('record');assert.equal((await survey()).broadcast.length,0);assert.doesNotMatch(await page.locator('#echo-survey-panel').innerText(),/李承禮|張守恆|周伯彥|陳國偉|MED-/);await echoClose();}
   await use('ECHO_TECHNICIAN');await action('filter');await action('file');const completed=await survey();assert(completed.filed&&completed.filter&&completed.recorder);assert.equal(completed.recorded.length,3);assert.equal(completed.broadcast.length,0);
   if(mobile)await shot('mobile-technician-receipt');await echoClose();await back();assert.deepEqual(await mainState(),before);assert(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.echoSurveyVisual.stations[0].receipt.visible));return{order:orders[identity],completed,mainlinePreserved:true};
  });
 }
 await start('LI',true);const before=await mainState();await enter();await use('ECHO_TECHNICIAN');await action('borrow');await echoClose();
 await check('confirmed unique choices create three authored persistent stages; cancelled confirmation changes nothing',async()=>{
  const stages=[];
  for(const id of ['relay','paper','air']){
   await use('ECHO_'+id.toUpperCase());await action('record');const saved=await survey();await action('broadcast');await action('cancel');assert.deepEqual(await survey(),saved);await action('broadcast');await action('confirm');await echoClose();
   const view=await page.evaluate(()=>{const q=window.__storyQA,v=q.worldRouter.activeZoneInstance.echoSurveyVisual;v.sync();return{view:q.echoSurvey.getView(),clock:v.hand.rotation.z,residue:v.stations.filter(s=>s.traces.visible).map(s=>s.id)};});stages.push(view);assert.equal(view.view.level,stages.length);assert.equal(view.residue.length,stages.length);assert(Math.abs(view.clock+stages.length*Math.PI/6)<.001);
   await use('ECHO_TECHNICIAN');assert.match(await page.locator('[data-echo-text]').innerText(),stages.length===1?/檢修鐘/:stages.length===2?/回傳燈/:/三段/);await echoClose();
  }
  await use('ECHO_TECHNICIAN');await action('filter');await action('file');await echoClose();await shot('three-stage-annex');return{stages};
 });
 await check('reusable isolation tool moves between stations without erasing accumulated marks',async()=>{
  for(const id of ['paper','air','relay']){await use('ECHO_'+id.toUpperCase());await action('isolate');const s=await survey();assert.equal(s.filterAt,id);assert.equal(s.broadcast.length,3);await echoClose();}
  await use('ECHO_RELAY');await action('isolate');assert.equal((await survey()).filterAt,null);await action('isolate');assert.equal((await survey()).filterAt,'relay');await echoClose();return await survey();
 });
 await check('real WebAudio spatial burst is bounded, completes and is cleaned on unloading',async()=>{
  await use('ECHO_PAPER');const start=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.echoSurveyVisual.audio.bursts);await action('record');const audio=await page.evaluate(()=>{const a=window.__storyQA.worldRouter.activeZoneInstance.echoSurveyVisual.audio;return{bursts:a.bursts,nodes:a.nodes.size,context:window.__storyQA.soundManager.ctx.state};});assert(audio.bursts>start);assert(audio.nodes<=3);await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.echoSurveyVisual.audio.nodes.size),0);await echoClose();return audio;
 });
 await check('return while instrument panel is open cancels choice and restores controls; revisit rehydrates one actor',async()=>{
  await use('ECHO_PAPER');const saved=await survey();await action('return');await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_4f'&&!window.__storyQA.hospitalExcursion.transitioning);assert.deepEqual(await survey(),saved);assert(await page.evaluate(()=>window.__storyQA.controller.enabled&&!window.__storyQA.echoSurveyPanel.active));assert.deepEqual(await mainState(),before);
  await enter();assert.deepEqual(await survey(),saved);const visuals=await page.evaluate(()=>{const z=window.__storyQA.worldRouter.activeZoneInstance,v=z.echoSurveyVisual;return{actors:z.interactables.filter(o=>o.userData?.id==='ECHO_TECHNICIAN').length,level:v.root.userData.echoLevel,isolated:v.root.userData.echoEffectiveLevel};});assert.equal(visuals.actors,1);assert.equal(visuals.level,3);assert.equal(visuals.isolated,2);return visuals;
 });
 await check('reload in branch preserves tools, choices and original run; restores a safe mainline zone',async()=>{
  const saved=await survey(),seed=await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed);await page.goto(base+'?qa=story');await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});assert.deepEqual(await survey(),saved);assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed),seed);assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId),'first_campus_4f');
  await page.evaluate(()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.controller.enabled=true;q.gameState.markTaskComplete('KEY_PICKUP');});await enter();assert.deepEqual(await survey(),saved);await use('ECHO_TECHNICIAN');assert.match(await page.locator('[data-echo-text]').innerText(),/回執已收好/);await echoClose();return{saved,seed};
 });
 await check('scene budgets, finite assets and 4F costs at portrait/landscape; tools never leak to B2',async()=>{
  await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(0,1.7,-6);q.lookAt([0,1.8,-8.6]);});const annex=await shot('mobile-echo-annex');assert(annex.withinSceneBudget);await back();
  const costs=[];for(const viewport of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(viewport);await aim('HOSPITAL_TERMINAL');const frame=await shot('echo-4f-'+viewport.width);assert(frame.withinSceneBudget);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));costs.push({viewport,...frame});}
  await page.evaluate(()=>window.__storyQA.load('b2_archive'));assert.equal(await page.evaluate(()=>!!window.__storyQA.worldRouter.activeZoneInstance.echoSurveyVisual),false);assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.some(o=>o.userData?.type==='echo_survey')),false);return{annex,costs};
 });
 await check('legacy hospital saves without an echo key keep equipment and original run intact',async()=>{
  await start('LI',true);
  const legacy=await page.evaluate(()=>{const q=window.__storyQA;q.hospitalSimulation.setTaskPower(false);q.hospitalSimulation.moveWheelchair();q.hospitalSimulation.inspectCase('paper');q.hospitalSimulation.resolveCase('archive');localStorage.removeItem(q.echoSurvey.key);return{equipment:q.hospitalSimulation.snapshot(),seed:q.identityManager.runSave.runSeed};});
  await page.goto(base+'?qa=story');await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
  const restored=await page.evaluate(()=>({equipment:window.__storyQA.hospitalSimulation.snapshot(),seed:window.__storyQA.identityManager.runSave.runSeed,echo:window.__storyQA.echoSurvey.getView()}));
  assert.equal(restored.seed,legacy.seed);assert.equal(restored.equipment.taskPower,false);assert.equal(restored.equipment.wheelchairPad,1);assert.deepEqual(restored.equipment.sideCase,legacy.equipment.sideCase);assert.equal(restored.echo.level,0);assert.equal(restored.echo.recorder,false);return{legacy,restored};
 });
 assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);await page?.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await save();await browser.close();await server?.close();}
console.log('ECHO_BROWSER',report.verdict,report.checks.length);
