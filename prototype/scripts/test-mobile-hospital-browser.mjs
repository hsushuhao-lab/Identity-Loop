import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const out=process.argv[2]||'../../qa-evidence/mobile-hospital';await mkdir(out,{recursive:true});
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4197,strictPort:true}});
const base='http://127.0.0.1:4197/';
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(x=>/^index-.*\.js$/.test(x)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={bundleSHA256:createHash('sha256').update(js).digest('hex'),method:'Production build with explicit story checkpoints and standing/aim fixtures; native CDP multi-touch events, real keyboard/UI handlers; rendering sampled on demand. No physical-device FPS acceptance.',checks:[],errors:[],screenshots:[],performance:[]};
let page,context,cdp;
const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await save();console.log('SLICE_PASS',name);}
async function start(identity,mobile=true){
 if(context)await context.close();context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:mobile?3:1});
 page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 page.on('requestfailed',r=>report.errors.push(r.url()+': '+r.failure()?.errorText));
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__sliceFrame=fn;return 0;}return raf(fn);};},loop);
 if(mobile)await page.addInitScript(()=>{Object.defineProperty(document,'exitPointerLock',{value:undefined});Object.defineProperty(HTMLElement.prototype,'requestPointerLock',{value:undefined,configurable:true});});
 await page.goto(base+'?qa=story&identity='+identity,{timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
 await page.evaluate(async()=>{const q=window.__storyQA,m=q.identityManager,d=q.identityRouteDirector;
   q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;d.removeInteractionTarget();
   m.runSave.currentRouteStep=m.route.indexOf('M2');m.runSave.currentMilestone='M2';m.save();d.busy=false;
   await d.loadCurrentStep({forceLoad:true});q.controller.enabled=true;
 });
 cdp=await context.newCDPSession(page);
}
async function shot(name){
 await page.bringToFront();await page.waitForFunction(()=>!document.hidden);
 // Flush viewport resize before drawing; correlate counters with that frame,
 // rather than reading a live renderer after an asynchronous PNG capture.
 const frame=await page.evaluate(async()=>{await new Promise(requestAnimationFrame);window.__storyQA.qualitySettings.lastRender=0;window.__sliceFrame?.();return window.__storyQA.qualitySettings.snapshot();});
 await page.screenshot({path:`${out}/${name}.png`,timeout:30000});report.screenshots.push(name+'.png');return frame;
}
async function aim(id){return page.evaluate(id=>{
 const q=window.__storyQA,c=q.controller,z=q.worldRouter.activeZoneInstance,o=z.interactables.find(o=>o.userData?.id===id);if(!o)throw Error('Missing '+id);
 z.zoneGroup.updateMatrixWorld(true);const center=o.getWorldPosition(c.position.clone()),ray=new c.raycaster.constructor();if(id==='HOSPITAL_STAFF')center.y+=1.1;
 const visible=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
 for(const radius of [1.5,1.1,.8,1.9,2.3,2.8])for(let i=0;i<64;i++){
   const angle=Math.PI/2+i*Math.PI/32;c.teleport(center.x+radius*Math.cos(angle),1.7,center.z+radius*Math.sin(angle));
   if(c.checkCollision(c.position.x,c.position.z)||c.supportedHeight(c.position.x,c.position.z)===null)continue;
   const delta=center.clone().sub(c.camera.position),distance=delta.length();ray.set(c.camera.position,delta.normalize());ray.far=distance;
   const hit=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&!m.transparent));
   let own=false;for(let n=hit?.object;n;n=n.parent)if(n===o)own=true;
   if(hit&&!own&&hit.distance<distance-.03)continue;
   if(q.lookAt(center.toArray()).current===id){c.enabled=true;return {id,position:c.position.toArray()};}
 }throw Error('No supported unobstructed aim '+id);
},id);}
async function tap(){await page.locator('#touch-interact').tap();}
async function touch(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:4,radiusY:4,force:1}))});}
try{
 const variants=[];
 for(const id of ['LI','ZHANG','ZHOU','CHEN']){
  await start(id,true);
  await check(id+' phone + anonymous badge, no route mutation',async()=>{
   const before=await page.evaluate(()=>window.__storyQA.identityManager.snapshot());
   const hit=await aim('HOSPITAL_PHONE');await tap();await page.getByRole('textbox',{name:'分機號碼'}).fill('316');await page.getByRole('button',{name:'撥號',exact:true}).click();
   const text=await page.locator('[data-status]').innerText();variants.push(text);assert.doesNotMatch(text,/李承禮|張守恆|周伯彥|陳國偉|MED-/);
   await page.locator('[data-tab="patrol"]').click();await page.locator('[data-ask]').click();const voice=await page.locator('[data-status]').innerText();assert.doesNotMatch(voice,/李承禮|張守恆|周伯彥|陳國偉|MED-/);
   await page.locator('[data-tab="badge"]').click();await page.locator('[data-scan]').click();const badge=await page.locator('[data-status]').innerText();
   assert.deepEqual(await page.evaluate(()=>window.__storyQA.identityManager.snapshot()),before);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   if(id==='CHEN')await shot('mobile-portrait-badge');
   await page.locator('#hospital-panel [data-close]').click();return {hit,text,badge,voice};
  });
 }
 assert.equal(new Set(variants).size,4);
 await check('native multi-touch movement/look and pointer cancellation',async()=>{
  await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(0,1.7,-12,0);q.controller.enabled=true;});
  const before=await page.evaluate(()=>({pos:window.__storyQA.controller.position.toArray(),yaw:window.__storyQA.controller.yaw}));
  await touch('touchStart',[[1,80,740],[2,310,410]]);await touch('touchMove',[[1,80,692],[2,345,395]]);
  await page.evaluate(()=>{for(let i=0;i<20;i++)window.__storyQA.controller.update(.016);});
  const after=await page.evaluate(()=>({pos:window.__storyQA.controller.position.toArray(),yaw:window.__storyQA.controller.yaw}));
  assert.notDeepEqual(after.pos,before.pos);assert.notEqual(after.yaw,before.yaw);
  await touch('touchCancel',[]);assert.deepEqual(await page.evaluate(()=>window.__storyQA.controller.touchMove),{x:0,z:0});return {before,after};
 });
 await check('long press observes once without opening an interaction',async()=>{
  await aim('HOSPITAL_BADGE');await touch('touchStart',[[1,195,422]]);await page.waitForTimeout(650);await touch('touchEnd',[]);
  assert.equal(await page.locator('#hospital-panel').evaluate(el=>el.classList.contains('active')),false);
  assert.match(await page.locator('#subtitle-text').innerText(),/門禁/);return {observed:true};
 });
 await check('wheelchair collider + light + call history survive zone unload/reload',async()=>{
  await aim('HOSPITAL_WHEELCHAIR');await tap();await page.locator('[data-push]').click();
  assert.equal(await page.evaluate(()=>window.__storyQA.hospitalSimulation.snapshot().wheelchairPad),1);
  await page.locator('[data-tab="terminal"]').click();await page.locator('[data-power-switch]').click();
  await page.locator('[data-tab="cctv"]').click();await shot('mobile-portrait-monitor');
  await page.locator('[data-close]').click();
  const saved=await page.evaluate(()=>window.__storyQA.hospitalSimulation.snapshot());
  const actual=await page.evaluate(()=>{const q=window.__storyQA;q.load('first_campus_3f');q.load('first_campus_4f');const z=q.worldRouter.activeZoneInstance;return {state:q.hospitalSimulation.snapshot(),z:z.hospitalSystems.wheelchair.position.z,collision:z.hospitalSystems.collider.min.z};});
  assert.deepEqual(actual.state,saved);assert.equal(actual.z,-6.45);assert.equal(actual.state.taskPower,false);return actual;
 });
 await check('real page reload restores current Loop and equipment',async()=>{
  const before=await page.evaluate(()=>({identity:window.__storyQA.identityManager.currentIdentity,seed:window.__storyQA.identityManager.runSave.runSeed,state:window.__storyQA.hospitalSimulation.snapshot()}));
  await page.goto(base+'?qa=story',{timeout:120000});
  await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
  const after=await page.evaluate(()=>({identity:window.__storyQA.identityManager.currentIdentity,seed:window.__storyQA.identityManager.runSave.runSeed,state:window.__storyQA.hospitalSimulation.snapshot()}));
  assert.deepEqual(after,before);return {restored:true,seedPreserved:true};
 });
 await check('mobile dialogue continuation, evidence panel and blocked movement',async()=>{
  await page.evaluate(()=>{const q=window.__storyQA;q.controller.enabled=false;q.uiManager.showDialogue([{speaker:'值班醫師',text:'設備核對中。'}],()=>{q.controller.enabled=true;});q.touchControls.refresh();});
  await page.locator('#touch-continue').tap();assert.equal(await page.evaluate(()=>window.__storyQA.uiManager.dialogueSequence),null);
  await page.locator('#touch-journal').tap();assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('touch-objective-open')),true);
  await page.locator('#touch-objective').tap();
  await aim('HOSPITAL_PHONE');await tap();assert.equal(await page.locator('#touch-move').isVisible(),false);await page.locator('[data-close]').click();return {continued:true,inputSuspended:true};
 });
 await check('staff noise response, player yielding and unloaded simulation persist',async()=>{
  await aim('HOSPITAL_STAFF');await tap();assert.equal(await page.locator('[data-ask]').isVisible(),true);await page.locator('[data-ask]').click();await shot('mobile-patrol-panel');
  assert.equal(await page.evaluate(()=>{const q=window.__storyQA,z=q.hospitalSimulation.data.staff.z;q.worldRouter.update(.1);return q.hospitalSimulation.data.staff.z===z;}),true,'modal pauses staff');await page.locator('[data-close]').click();
  const before=await page.evaluate(()=>window.__storyQA.identityManager.snapshot());
  const outcome=await page.evaluate(()=>{
   const q=window.__storyQA,s=q.hospitalSimulation,c=q.controller,z=q.worldRouter.activeZoneInstance;
   c.teleport(5.65,1.7,s.data.staff.z+.5);c.enabled=true;const stop=s.data.staff.z;for(let i=0;i<8;i++)q.worldRouter.update(.1);if(s.data.staff.z!==stop)throw Error('Staff did not yield to player');
   c.teleport(0,1.7,-12);s.moveWheelchair();z.hospitalSystems.synchronize();
   for(let i=0;i<450;i++)q.worldRouter.update(.1);
   if(s.data.staff.investigated!==1)throw Error('Staff investigation did not complete: '+JSON.stringify(s.data.staff));
   const afterNoise=s.snapshot();q.load('first_campus_3f');c.enabled=true;for(let i=0;i<20;i++)q.worldRouter.update(.1);
   const unloaded=s.snapshot();if(unloaded.staff.z===afterNoise.staff.z)throw Error('Unloaded staff did not continue');
   q.load('first_campus_4f');const systems=q.worldRouter.activeZoneInstance.hospitalSystems;
   if(!c.checkCollision(5.65,s.data.staff.z))throw Error('Staff collider absent');
   if(systems.staff.position.z!==unloaded.staff.z)throw Error('Staff mesh did not restore');
   if(q.worldRouter.activeZoneInstance.zoneGroup.getObjectsByProperty('name','HospitalSystems_EquipmentAttendant').length!==1)throw Error('Duplicate staff');
   return {afterNoise,unloaded,staffPosition:systems.staff.position.toArray(),collider:systems.staffCollider.min.toArray()};
  });
  assert.deepEqual(await page.evaluate(()=>window.__storyQA.identityManager.snapshot()),before);
  await aim('HOSPITAL_STAFF');await shot('mobile-patrol-world');return outcome;
 });
 await check('portrait/landscape controls, quality persistence and budgets',async()=>{
  await page.waitForFunction(()=>{const q=window.__storyQA;q.worldRouter.update(.1);return q.worldRouter.activeZoneInstance.staticBedBatchComplete;});
  const batches=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.staticBedBatchStats);assert.equal(batches.beds,32);assert(batches.originals>batches.batches*10);
  const observations=[];
  for(const viewport of [{width:390,height:844},{width:844,height:390}]){
   await page.setViewportSize(viewport);await aim('HOSPITAL_TERMINAL');const info=await shot(`mobile-world-${viewport.width}`);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   observations.push({viewport,...info});report.performance.push({viewport,...info});assert.equal(info.withinSceneBudget,true,JSON.stringify(info));
   await page.locator('#quality-settings summary').tap();await page.getByRole('combobox',{name:'畫質模式'}).selectOption('ultra');
   assert.equal(await page.evaluate(()=>window.__storyQA.qualitySettings.snapshot().pixelRatio),2);
   assert.equal(await page.evaluate(()=>localStorage.getItem('IdentityLoop_Quality_v1')),'ultra');
   await page.getByRole('combobox',{name:'畫質模式'}).selectOption('performance');await page.locator('#quality-settings summary').tap();
  }
  return {observations,batches};
 });
 await check('pinch zoom position monitor',async()=>{
  await page.setViewportSize({width:390,height:844});
  await aim('HOSPITAL_TERMINAL');await tap();await page.locator('[data-tab="cctv"]').click();
  const box=await page.locator('.hospital-map').boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
  await touch('touchStart',[[1,x-25,y],[2,x+25,y]]);await touch('touchMove',[[1,x-65,y],[2,x+65,y]]);await touch('touchEnd',[]);
  assert.match(await page.locator('.hospital-map').getAttribute('style'),/scale\(2/);await page.locator('[data-close]').click();return {zoomed:true};
 });
 await start('LI',false);
 await check('desktop E-key physically reaches four props and the staff member',async()=>{
  const hits=[];for(const id of ['HOSPITAL_TERMINAL','HOSPITAL_PHONE','HOSPITAL_BADGE','HOSPITAL_WHEELCHAIR','HOSPITAL_STAFF']){hits.push(await aim(id));await page.keyboard.press('KeyE');assert.equal(await page.locator('#hospital-panel').evaluate(el=>el.classList.contains('active')),true);if(id==='HOSPITAL_TERMINAL')await shot('desktop-terminal');await page.locator('[data-close]').click();}
  await aim('HOSPITAL_TERMINAL');await shot('desktop-world');report.performance.push(await page.evaluate(()=>window.__storyQA.qualitySettings.snapshot()));return hits;
 });
 await check('cancel failed elevator preload retains zone and restores controls',async()=>{
  const original=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId);
  await page.evaluate(()=>{const q=window.__storyQA;q.controller.enabled=false;q.uiManager.openTravelSelector([{zoneId:'first_campus_3f',floorNum:3,spawn:'first_3f_lift',label:'3F'}],q.worldRouter.activeZoneId,()=>{throw Error('Arrival must not happen');},'elevator',()=>Promise.reject(Error('injected preload failure')));});
  await page.locator('[data-floor="first_campus_3f"]').click();await page.waitForFunction(()=>!window.__storyQA.uiManager.elevatorCutscene.classList.contains('active'));
  assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId),original);assert.equal(await page.evaluate(()=>window.__storyQA.controller.enabled),true);return {original,retained:true};
 });
 await check('closed elevator waits for ready before committing arrival',async()=>{
  const source=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId);
  await page.evaluate(()=>{const q=window.__storyQA;q.controller.enabled=false;q.uiManager.openTravelSelector([{zoneId:'first_campus_3f',floorNum:3,spawn:'first_3f_lift',label:'3F'}],q.worldRouter.activeZoneId,destination=>q.load(destination.zoneId,destination.spawn),'elevator',()=>new Promise(resolve=>{window.__finishSlicePreload=resolve;}));});
  await page.locator('[data-floor="first_campus_3f"]').click();await page.waitForTimeout(2000);
  assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId),source);
  assert.equal(await page.evaluate(()=>window.__storyQA.controller.enabled),false);
  await page.evaluate(()=>window.__finishSlicePreload());await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_3f');
  assert.equal(await page.evaluate(()=>window.__storyQA.controller.enabled),true);return {source,destination:'first_campus_3f',onlyAfterReady:true};
 });
 await check('PWA manifest and PNG icons resolve under relative base',async()=>{
  const response=await page.request.get(base+'manifest.webmanifest');assert.equal(response.status(),200);
  const manifest=await response.json();assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){const response=await page.request.get(new URL(icon.src,base).href);assert.equal(response.status(),200);assert.equal(response.headers()['content-type'],'image/png');}
  return {icons:manifest.icons.map(icon=>icon.sizes),offline:false,installedOnDevice:false};
 });
 await check('WebGL unavailable gives retry UI',async()=>{
  const unsupported=await browser.newPage({viewport:{width:390,height:844}});
  await unsupported.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2')return null;return original.call(this,type,...args);};});
  await unsupported.goto(base,{timeout:120000});
  await unsupported.waitForFunction(()=>document.getElementById('asset-loading-message')?.textContent.includes('WebGL2'),null,{timeout:120000});
  assert.equal(await unsupported.locator('#asset-loading-retry').isVisible(),true);
  await unsupported.screenshot({path:out+'/webgl-fallback.png'});report.screenshots.push('webgl-fallback.png');await unsupported.close();return {retryVisible:true};
 });
 assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page)await shot('failure').catch(()=>{});}
finally{await save();await browser.close();await new Promise(r=>server.httpServer.close(r));console.log('SLICE_RESULT',report.verdict);}
