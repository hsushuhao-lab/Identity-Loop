import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'qa-results/scene-followthrough';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4195,strictPort:true}});
const base=supplied||'http://127.0.0.1:4195/';
const assets=await readdir('dist/assets'),js=await readFile('dist/assets/'+assets.find(p=>/^index-.*\.js$/.test(p)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop,'main renderer name');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'Production bundle with seeded checkpoints and supported standing fixtures; real E-key and UI handlers. Not a complete first-person playthrough. Main render sampled on demand.',base,checks:[],errors:[],resources:[],screenshots:[]};
let page;const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function start(identity){
 if(page)await page.close();page=await browser.newPage({viewport:{width:1280,height:860}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__closureFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto(base+'?qa=story&identity='+identity,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
}
async function seed(step,index=0){await page.evaluate(async ({step,index})=>{
 const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager,u=q.uiManager;
 d.removeInteractionTarget();u.closeAllTransientOverlays();u.dialogueSequence=null;u.closeStoryChoice(false);m.runSave.currentRouteStep=m.route.indexOf(step);m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone=step;m.save();
 if(step==='M4'){q.setFlag('CHEN_5042_LOCKBOX_OPENED',false);q.setFlag('CHEN_GREY_BADGE_COLLECTED',false);}
 if(step==='M2'){q.setFlag('BED33_RESOLVED',false);q.setFlag('FOURF_409_SEAL_CHECKED_AFTER_408C',false);}
 d.busy=false;await d.loadCurrentStep({forceLoad:true});if(index){d.beatIndex=index;await d.placeBeat({forceLoad:true});}q.controller.enabled=true;
 },{step,index});}
async function aim(id=null){return page.evaluate(id=>{
 const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller,o=id?z.interactables.find(o=>o.userData?.id===id):q.identityRouteDirector.boundTarget?.object;
 if(!o)throw Error('Missing physical target '+id);z.zoneGroup.updateMatrixWorld(true);const center=o.getWorldPosition(c.position.clone()),ray=new c.raycaster.constructor();
 if(o.userData.id==='SECOND_5F_STORAGE_ANNIE')center.y+=1.1;
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
}
try{
 for(const identity of ['ZHANG','LI','ZHOU','CHEN']){
  await start(identity);await seed(identity==='LI'?'LI_ER_2005':'M3');
  await check(identity+' patient visible; actual 01-bed E assessment advances',async()=>{
   assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.janeDoePatient.visible),true);
   assert.match(await page.locator('#task-panel').innerText(),/01/);
   if(identity==='ZHANG'){
    await page.evaluate(()=>window.__storyQA.worldRouter.teleportToSpawn('first_2f_lift'));
    await walk([[-8,6],[-8,2],[-8,0],[-1,0]]);await doorHere('ER_MAIN');
    await walk([[2,0],[14.5,0],[14.5,2.4]]);await doorHere('ER_BEDS');await walk([[14.5,5.7],[10.5,5.7]]);
    const hit=await page.evaluate(()=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance;z.zoneGroup.updateMatrixWorld(true);q.lookAt(z.janeDoeHit.getWorldPosition(q.controller.position.clone()).toArray());q.controller.enabled=true;return q.controller.currentInteractable?.id;});
    assert.equal(hit,'2F_JANE_DOE_ASSESSMENT');await shot('er-01-patient-from-entry');await page.keyboard.press('KeyE');await dialogue();
   }else{await e('2F_JANE_DOE_ASSESSMENT');}
   const choice=await page.locator('#story-choice-modal').evaluate(el=>el.classList.contains('active'));
   if(choice){await page.locator('#btn-story-primary').click();await dialogue();}
   await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex>0);
   const state=await page.evaluate(()=>({index:window.__storyQA.identityRouteDirector.beatIndex,step:window.__storyQA.identityRouteDirector.step,patient:window.__storyQA.worldRouter.activeZoneInstance.janeDoePatient.visible}));
   if(identity!=='LI')assert.equal(state.patient,false,'ghost registration must not gain a patient');return state;
  });
 }
 for(const identity of ['ZHANG','LI','ZHOU','CHEN']){
  await start(identity);
  await check(identity+' order -> actual cart -> next chapter',async()=>{
   if(identity==='ZHANG'){
    await e('IDENTITY_4F_NURSE_STATION');
    await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='M2');
   }else{
    await seed('M2');await e('IDENTITY_4F_NURSE_STATION');
   }
   await e('408C_BED_PLAQUE');await e('BED33_409_SEALED');
   await e('BED33_ASSIGNMENT');await page.locator('#btn-bed33-reject').click();await page.evaluate(()=>window.__storyQA.identityRouteDirector.update());
   await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.currentBeat?.cartCheck);
   assert.match(await page.locator('#task-panel').innerText(),/協助確認工作車上的藥品與器材/);
   const hit=await aim();assert.equal(hit.id,'IDENTITY_4F_CLINICAL_CART');
   if(identity==='ZHANG')await shot('4f-medication-equipment-cart');
   await page.keyboard.press('KeyE');await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step!=='M2');
   return {hit,next:await page.evaluate(()=>window.__storyQA.identityRouteDirector.step),cartChecked:await page.evaluate(()=>window.__storyQA.gameState.getFlag('M2_CART_CHECKED'))};
  });
 }
 await start('CHEN');await seed('M4');
 await check('Shared 5F storage opens without formal handoff and has blue-cuffed Annie',async()=>{
  assert.equal(await page.evaluate(()=>window.__storyQA.gameState.isTaskComplete('KEY_PICKUP')),false);
  const hit=await e('storage_STORE_ENTRY');assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.keyedDoors.storage_STORE_ENTRY.closed),false);
  await page.evaluate(()=>window.__storyQA.controller.teleport(66.2,1.7,1));await walk([[63.3,1]]);
  await aim('SECOND_5F_STORAGE_ANNIE');await shot('5f-storage-blue-cuffs');await page.keyboard.press('KeyE');
  await page.locator('#archive-modal.active').waitFor();const text=await page.locator('#archive-document-page').innerText();assert.match(text,/藍布/);assert.doesNotMatch(text,/MED-|張守恆|李承禮|周啟文|陳柏勳/);
  await page.locator('#btn-close-archive').click();assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),0);return {hit,text};
 });
 await check('5F shower privacy door: E open, walk in, close, reopen, walk out',async()=>{
  const hit=await e('second_duty_bathroom');assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.keyedDoors.second_duty_bathroom.closed),false);
  const path=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.secondDutyBathroom.walkingPath);
  await page.evaluate(p=>window.__storyQA.controller.teleport(...p),path[0]);await walk(path.slice(1).map(p=>[p[0],p[2]]));
  await walk([[82.1,3.8],[81.25,3.8],[81.25,4.4]]);
  async function viewDoor(){return page.evaluate(()=>{const q=window.__storyQA;q.worldRouter.activeZoneInstance.zoneGroup.updateMatrixWorld(true);q.lookAt([81.25,1.22,5.25]);q.controller.enabled=true;return q.controller.currentInteractable?.doorId;});}
  assert.equal(await viewDoor(),'second_duty_bathroom');await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.keyedDoors.second_duty_bathroom.closed),true);await shot('5f-shower-door-closed-inside');
  assert.equal(await viewDoor(),'second_duty_bathroom');await page.keyboard.press('KeyE');await walk([[81.25,6.05]]);
  await page.evaluate(()=>window.__storyQA.lookAt([81.3,1.2,3]));await shot('5f-shower-door-open');return {hit,path};
 });
 await start('ZHANG');await seed('ZHANG_SECOND_CAMPUS_SECURITY');
 await check('Visitor log: three nonempty pages, repeat reading, no photo-album completion',async()=>{
  await e('IDENTITY_SECOND_GUARD_LOGBOOK');const pages=[];
  for(let i=0;i<3;i++){pages.push(await page.locator('#archive-document-page').innerText());assert(pages[i].length>60);if(i<2)await page.locator('#btn-archive-next').click();}
  await shot('guard-visitor-log-pages');await page.locator('#btn-close-archive').click();await e('IDENTITY_SECOND_GUARD_LOGBOOK');assert.equal(await page.locator('#archive-document-page').innerText(),pages[0]);await page.locator('#btn-close-archive').click();
  assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),0);assert.notEqual(await page.evaluate(()=>window.__storyQA.gameState.getFlag('ZHANG_GUARD_ALBUM_REVIEWED')),true);
  await e('SECOND_GUARD_PHOTO_ALBUM');await page.locator('#memory-modal.active').waitFor();await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');
  await page.locator('#btn-close-memory').click();return {pages,bookSeparateFromAlbum:true};
 });
 await start('ZHANG');await seed('M3');
 await check('First 2F stairs, entry photograph/plant and uncluttered bed headwall',async()=>{
  await page.evaluate(()=>window.__storyQA.worldRouter.teleportToSpawn('first_2f_stairs'));
  const hit=await aim('first_campus_2f_stairs');await shot('2f-stairs-east-wall');await page.keyboard.press('KeyE');assert.match(await page.locator('#elevator-status-text').innerText(),/安全梯/);await page.locator('#btn-cancel-travel').click();
  const photo=await aim('ER_ARRIVAL_PHOTO');await shot('2f-entry-photo-and-plant');await page.keyboard.press('KeyE');
  await page.locator('#memory-modal.active').waitFor();await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');await page.locator('#btn-close-memory').click();
  await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(10.5,1.7,6);q.lookAt([10,1.65,9.1]);});await shot('er-poster-clear-of-headwall');
  return {hit,photo};
 });
 for(const identity of ['ZHANG','LI','ZHOU','CHEN']){
  await start(identity);await seed('M1');
  await page.evaluate(()=>{const q=window.__storyQA;q.setFlag('SECOND_CAMPUS_ACCESS',false);q.setFlag('CG_ELEVATOR_6F_PREVIEW_PLAYED',true);window.__glimpseCount=0;new MutationObserver(records=>{for(const rec of records)for(const el of rec.addedNodes)if(el.classList?.contains('elevator-glimpse-canvas'))window.__glimpseCount++;}).observe(document.body,{childList:true,subtree:true});});
  await check(identity+' physical 6F preview precedes 8F arrival',async()=>{
   await e('first_campus_3f_elevator');await page.locator('[data-floor="first_campus_8f"]').click();
   await page.locator('.elevator-glimpse-canvas').waitFor({state:'attached',timeout:15000});
   assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId),'first_campus_3f');
   if(identity==='ZHANG'){await page.waitForTimeout(1300);await shot('6f-preview-before-8f-arrival');}
   await page.locator('.elevator-glimpse-canvas').waitFor({state:'detached',timeout:15000});await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_8f');
   assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('CG_ELEVATOR_TO_8F_PREVIEW_PLAYED')),true);assert.equal(await page.evaluate(()=>window.__glimpseCount),1);
   if(identity==='ZHANG'){
    await seed('ZHANG_OUTBOUND_8F');await page.waitForTimeout(250);await dialogue();await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.__glimpseCount),1,'no landing replay');
   }
   return {before:'first_campus_3f',after:'first_campus_8f',canvasCount:await page.evaluate(()=>window.__glimpseCount)};
  });
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page)await shot('failure').catch(()=>{});}
finally{await save();await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));console.log('SCENE_FOLLOWTHROUGH_RESULT '+JSON.stringify(report));}
