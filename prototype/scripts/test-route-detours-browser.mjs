import {shouldShowAnnie} from '../src/story/IdentityRouteScenes.js';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'qa-results/route-detours';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4197,strictPort:true}});
const base=supplied||'http://127.0.0.1:4197/';
const assets=await readdir('dist/assets'),js=await readFile('dist/assets/'+assets.find(p=>/^index-.*\.js$/.test(p)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop,'main renderer name');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'Production bundle with seeded checkpoints and supported standing fixtures; real E-key and UI handlers. Not a complete first-person playthrough. Main render sampled on demand.',base,checks:[],errors:[],resources:[],screenshots:[]};
let page;const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function start(identity){
 if(page)await page.close();page=await browser.newPage({viewport:{width:1280,height:860}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__closureFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto(base+'?qa=story&identity='+identity,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
}
async function seed(step,index=0,runSeed=0){await page.evaluate(async ({step,index,runSeed})=>{
 const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager,u=q.uiManager;
 d.removeInteractionTarget();u.closeAllTransientOverlays();u.dialogueSequence=null;u.closeStoryChoice(false);m.runSave.currentRouteStep=m.route.indexOf(step);m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone=step;m.runSave.runSeed=runSeed;m.save();
 if(step==='M4'){q.setFlag('CHEN_5042_LOCKBOX_OPENED',false);q.setFlag('CHEN_GREY_BADGE_COLLECTED',false);}
 if(step==='M2'){q.setFlag('BED33_RESOLVED',false);q.setFlag('FOURF_409_SEAL_CHECKED_AFTER_408C',false);}
 d.busy=false;await d.loadCurrentStep({forceLoad:true});
 // A direct checkpoint jump from Li's initial 3F does not rebuild that same zone.
 // Rebuild as a real later arrival would, so the already-collected spare key
 // cannot survive as an initial-scene hitbox over the patrol board.
 if(step==='LI_2117_PATROL'){q.worldRouter.loadZone('first_campus_3f','m0_3f_corridor');await d.onArriveTargetZone();}
 if(index){d.beatIndex=index;await d.placeBeat({forceLoad:true});}q.controller.enabled=true;
 },{step,index,runSeed});}
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
async function dialogue(){for(let i=0;i<40;i++){if(!await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence))return;await page.keyboard.press('KeyE');}throw Error('Dialogue did not complete');}
async function shot(name){await page.evaluate(()=>window.__closureFrame?.());await page.waitForTimeout(150);await page.screenshot({path:`${out}/${name}.png`,timeout:20000});report.screenshots.push(name+'.png');}
async function e(id){const hit=await aim(id);await page.keyboard.press('KeyE');await dialogue();return hit;}
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await save();console.log('CLINICAL_CLOSURE_PASS',name);}

async function walk(points){return page.evaluate(points=>{
 const q=window.__storyQA,c=q.controller;
 for(const dest of points){const n=Math.ceil(Math.hypot(dest[0]-c.position.x,dest[1]-c.position.z)/.03),dx=(dest[0]-c.position.x)/n,dz=(dest[1]-c.position.z)/n;
  for(let i=0;i<n;i++)c.moveWithCollision(dx,dz);
  if(Math.hypot(c.position.x-dest[0],c.position.z-dest[1])>.05)throw Error('Path blocked '+JSON.stringify({dest,at:c.position.toArray()}));
 }
 c.camera.position.copy(c.position);c.camera.updateMatrixWorld(true);
 return c.position.toArray();
},points);}
async function doorHere(id){
 const hit=await page.evaluate(id=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,d=z.accessDoors[id];z.zoneGroup.updateMatrixWorld(true);q.lookAt(d.readerSensor.getWorldPosition(q.controller.position.clone()).toArray());q.controller.enabled=true;return q.controller.currentInteractable?.doorId;},id);
 assert.equal(hit,id);await page.keyboard.press('KeyE');assert.equal(await page.evaluate(id=>window.__storyQA.worldRouter.activeZoneInstance.accessDoors[id].closed,id),false);
}const seeded=(id,step,active)=>Array.from({length:90},(_,n)=>n).find(n=>shouldShowAnnie(id,step,n)===active);
const noChore=async()=>assert.doesNotMatch(await page.locator('#task-panel').innerText(),/確認設備與通道|設備歸零/);
async function arrive(){await page.evaluate(async()=>{const d=window.__storyQA.identityRouteDirector;await d.qaArriveAtAwaitingZone();});}
try{
 for(const active of [true,false]){
  await start('LI');const runSeed=seeded('LI','LI_2117_PATROL',active);await seed('LI_2117_PATROL',0,runSeed);
  await check(`Li patrol -> duty room -> 00:33 call (Annie ${active})`,async()=>{
   const hit=await e('GUARD_SIGN_2117');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='LI_RETURN_DUTY_0033');
   assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.awaitingZone),'first_campus_4f');await noChore();
   if(active){
    await shot('li-patrol-next-duty-room');
    await page.evaluate(()=>history.replaceState(null,'',location.pathname+'?qa=story'));
    await page.reload({waitUntil:'load',timeout:120000});await page.waitForFunction(()=>!!window.__storyQA&&!window.__storyQA.identityRouteDirector.busy);
    assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.currentIdentity),'LI');assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed),runSeed);
    assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.step),'LI_RETURN_DUTY_0033');await noChore();
   }else await arrive();
   await dialogue(); // A restored room checkpoint may already have started its entry dialogue.
   await e('duty_room');assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.keyedDoors.duty_room.closed),false);
   await page.evaluate(()=>{const q=window.__storyQA,c=q.controller;c.teleport(-6.6,1.7,6);for(let i=0;i<100;i++)c.moveWithCollision(-.029,0);if(c.position.x> -8.3)throw Error('Cannot enter duty room');q.identityRouteDirector.update();});
   await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);
   assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('PHONE_RING_ACTIVE')),true);
   const phone=await aim('4F_DUTY_PHONE');if(active)await shot('li-duty-room-next-phone');
   await page.keyboard.press('KeyE');await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='LI_ER_0033');await noChore();
   return {runSeed,patrol:hit,phone,next:'LI_ER_0033',checkpointRestored:active};
  });
 }
 for(const active of [true,false]){
  await start('ZHOU');const runSeed=seeded('ZHOU','M5',active);await seed('M4',5,runSeed);
  await check(`Zhou 5F motive -> guard-rest photos (Annie ${active})`,async()=>{
   await page.waitForFunction(()=>!!window.__storyQA.uiManager.dialogueSequence);
   const text=await page.evaluate(()=>window.__storyQA.uiManager.dialogueSequence.lines.map(l=>l.text).join('\n'));assert.match(text,/我想再看一下/);assert.match(text,/二樓警衛休息室/);
   await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='M5');assert.match(await page.locator('#task-panel').innerText(),/警衛休息室.*照片/);await noChore();
   // Actual 5F lift and destination UI; no forced completion of photo/CCTV flags.
   await e('second_campus_5f_elevator');await page.locator('[data-floor="second_campus_2f"]').click();
   await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='second_campus_2f',{},{timeout:120000});
   await page.evaluate(()=>window.__storyQA.identityRouteDirector.update());await page.waitForFunction(()=>!!window.__storyQA.identityRouteDirector.boundTarget);
   const hit=await aim('MEMORY_M5_GUARD_REST_LOG');if(active)await shot('zhou-2f-guard-rest-physical-photo');return {runSeed,motive:text,hit};
  });
  await check(`Zhou four photo pages, early close/retry, no false completion (Annie ${active})`,async()=>{
   await page.keyboard.press('KeyE');await dialogue();await page.locator('#memory-modal.active').waitFor();
   await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');
   await page.locator('#btn-close-memory').click();assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),0);assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.busy),false);
   await e('MEMORY_M5_GUARD_REST_LOG');await page.locator('#memory-modal.active').waitFor();
   const pages=[];
   for(let i=0;i<4;i++){
    await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');
    const text=await page.locator('#memory-modal').innerText();assert.doesNotMatch(text,/周啟文|張守恆|李承禮|陳柏勳|MED-\d|滑鼠失去控制|強制拉向/);
    pages.push(await page.locator('#memory-frame-title').innerText());if(active&&(i===0||i===3))await shot(`zhou-guard-rest-photo-page-${i+1}`);
    if(i<3)await page.locator('#btn-memory-next').click();
   }
   assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),0,'do not advance inside viewer');await page.locator('#btn-close-memory').click();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);
   assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('ZHOU_GUARD_REST_PHOTOS_REVIEWED')),true);
   assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.boundTarget.object.userData.id),'SECOND_2F_CCTV_DESK');assert.match(await page.locator('#task-panel').innerText(),/隔壁監控室/);
   // Optional re-reading after the task must not skip the subsequent CCTV beat.
   await e('MEMORY_M5_GUARD_REST_LOG');await page.locator('#memory-modal.active').waitFor();await page.locator('#btn-close-memory').click();assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),1);
   return {pages,next:'SECOND_2F_CCTV_DESK',earlyCloseAndReread:true};
  });
  await check(`Zhou CCTV -> bridge safe choice -> 316, no equipment detour (Annie ${active})`,async()=>{
   await e('SECOND_2F_CCTV_DESK');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===2);await noChore();await arrive();
   // Checkpoint arrival at second end, then real collision-supported movement
   // into the trigger. The production zone sets its own reflection flags.
   await page.evaluate(()=>{
    const q=window.__storyQA,c=q.controller,z=q.worldRouter.activeZoneInstance;
    z.update(c.camera,.016);c.moveWithCollision(-25.4,0);c.camera.position.copy(c.position);c.camera.updateMatrixWorld(true);
    if(Math.abs(c.position.x-33)>.06)throw Error('Bridge approach blocked');z.update(c.camera,.016);q.identityRouteDirector.update();
   });
   await dialogue();await page.waitForFunction(()=>!!window.__storyQA.uiManager.dialogueSequence&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:10000});await dialogue();
   await page.locator('#story-choice-modal.active').waitFor();await page.locator('#btn-story-primary').click();await dialogue();
   await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='M1');assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.awaitingZone),'first_campus_3f');await noChore();
   assert.match(await page.locator('#task-panel').innerText(),/316.*補交班/);assert.equal(await page.evaluate(()=>!!window.__storyQA.identityRouteDirector.anchor),false);
   if(active)await shot('zhou-bridge-next-316');return {next:'M1',objective:await page.locator('#task-panel').innerText(),noSyntheticAnchor:true};
  });
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page)await shot('failure').catch(()=>{});}
finally{await save();await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));console.log('ROUTE_DETOURS_RESULT '+JSON.stringify(report));}
