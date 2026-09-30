import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'qa-results/zhou-b1';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4198,strictPort:true}});
const base=supplied||'http://127.0.0.1:4198/';
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

async function state(){return page.evaluate(()=>{const q=window.__storyQA,d=q.identityRouteDirector;return {identity:q.identityManager.currentIdentity,step:d.step,beat:d.beatIndex,zone:q.worldRouter.activeZoneId,target:d.boundTarget?.object?.userData?.id,awaiting:d.awaitingZone,slip:q.gameState.getFlag('ER0033_SLIP_COLLECTED'),decoded:q.gameState.getFlag('M3_316_DECODED'),ring:q.gameState.getFlag('PHONE_RING_ACTIVE'),objective:document.querySelector('#task-panel').innerText};});}
async function travel(from,to){await e(from);await page.locator(`[data-floor="${to}"]`).click();await page.waitForFunction(to=>window.__storyQA.worldRouter.activeZoneId===to,to,{timeout:120000});await page.waitForFunction(()=>document.getElementById('elevator-cutscene').dataset.travelling!=='true');await page.evaluate(()=>window.__storyQA.identityRouteDirector.update());}

async function seed(identity,step){
 await start(identity);
 await page.evaluate(async step=>{
  const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager,u=q.uiManager;
  d.removeInteractionTarget();u.closeAllTransientOverlays();u.dialogueSequence=null;u.closeStoryChoice(false);
  m.runSave.currentRouteStep=m.route.indexOf(step);m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone=step;
  if(m.currentIdentity==='CHEN')m.recordEvidence({id:'route:M4:5',category:'route',milestone:'M4',visibleText:'實際收取的證件'});
  m.save();d.busy=false;await d.loadCurrentStep({forceLoad:true});q.controller.enabled=true;
  window.__zhouTick=setInterval(()=>d.update(),16);
 },step);
}
async function waitTarget(id){await page.waitForFunction(id=>window.__storyQA.identityRouteDirector.boundTarget?.object?.userData?.id===id,id);}
async function pose(eye,target,name){await page.evaluate(({eye,target})=>{const q=window.__storyQA;q.controller.teleport(...eye);q.lookAt(target);},{eye,target});await shot(name);}
try{
 await seed('ZHOU','M2');
 await check('4F medication cart ends with the requested guard-chat motive and next target',async()=>{
  await page.evaluate(async()=>{const q=window.__storyQA,d=q.identityRouteDirector;for(const key of ['BED33_RESOLVED','FOURF_409_SEAL_CHECKED_AFTER_408C'])q.gameState.setFlag(key,true);q.gameState.markTaskComplete('P1_NORMAL_EVENT_DONE');d.beatIndex=d.beats.length-1;await d.placeBeat();});
  await aim('IDENTITY_4F_CLINICAL_CART');await page.keyboard.press('KeyE');
  const lines=await dialogue();assert.match(lines.join(' '),/我去找警衛聊天好了/);
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='ZHOU_1F_PHOTO');
  const s=await state();assert.equal(s.awaiting,'first_campus_1f');assert.match(s.objective,/警衛聊天/);await shot('zhou-4f-next-guard-chat');return {lines,...s};
 });
 await travel('first_campus_4f_elevator','first_campus_1f');await waitTarget('OLD_GUARD_POST');
 await check('Guard points to the actual wall photo before the ER call becomes active',async()=>{
  await aim('OLD_GUARD_POST');await page.keyboard.press('KeyE');const lines=await dialogue();
  assert.match(lines.join(' '),/後面牆上這張/);await waitTarget('IDENTITY_GUARD_REFLECTION_PHOTO');
  assert.equal((await state()).ring,false);const hit=await aim('IDENTITY_GUARD_REFLECTION_PHOTO');await shot('zhou-guard-points-wall-photo');return {hit,lines,...await state()};
 });
 await check('Physical photo opens its photograph; closing it leads to the ringing ER phone',async()=>{
  await page.keyboard.press('KeyE');await dialogue();await page.locator('#memory-modal.active').waitFor();
  await page.waitForTimeout(1100);assert.match(await page.locator('#memory-title').innerText(),/設備查看紀錄/);await shot('zhou-first-campus-guard-photo-viewer');
  await page.locator('#btn-close-memory').click();await page.waitForFunction(()=>!!window.__storyQA.uiManager.dialogueSequence);await dialogue();
  await waitTarget('IDENTITY_GUARD_PHONE');assert.equal((await state()).ring,true);const hit=await aim('IDENTITY_GUARD_PHONE');await shot('zhou-guard-phone-after-photo');return {hit,...await state()};
 });
 await check('ER phone sends Zhou to 01 bed, without an equipment detour',async()=>{
  await page.keyboard.press('KeyE');const lines=await dialogue();assert.match(lines.join(' '),/2F 急診/);
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='M3');assert.equal((await state()).ring,false);
  await travel('first_campus_1f_elevator','first_campus_2f');await waitTarget('2F_JANE_DOE_ASSESSMENT');
  const hit=await aim('2F_JANE_DOE_ASSESSMENT');await shot('zhou-er-bedside-target');return {hit,lines,...await state()};
 });
 await check('Bedside assessment hands over 1998-ER-0217 automatically, before 316 becomes objective',async()=>{
  await page.keyboard.press('KeyE');await dialogue();
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1&&!!window.__storyQA.uiManager.dialogueSequence);
  const lines=await dialogue();assert.match(lines.join(' '),/帶回 316/);
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===2);const s=await state();
  assert.equal(s.slip,true);assert.equal(s.decoded,false);assert.equal(s.awaiting,'first_campus_3f');assert.match(s.objective,/綠字.*終端/);return {lines,...s};
 });
 await travel('first_campus_2f_elevator','first_campus_3f');await waitTarget('316_LEGACY_TERMINAL');
 await check('The existing green terminal is reachable with E, and refresh preserves the obtained receipt',async()=>{
  const hit=await aim('316_LEGACY_TERMINAL');assert.match(await page.locator('#interaction-prompt').innerText(),/1998-ER-0217/);await shot('zhou-316-green-terminal-E-ready');
  const seed=await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed);
  await page.evaluate(()=>history.replaceState(null,'',location.pathname+'?qa=story'));
  await page.reload({waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
  await page.evaluate(()=>{window.__zhouTick=setInterval(()=>window.__storyQA.identityRouteDirector.update(),16);});
  const s=await state();assert.equal(s.zone,'first_campus_3f');assert.equal(s.beat,2);assert.equal(s.slip,true);assert.equal(s.decoded,false);assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed),seed);
  await waitTarget('316_LEGACY_TERMINAL');return {hit,seed,restored:s};
 });
 await check('One E queries the old index, then goes to the pending warning, never replaying 4F',async()=>{
  await aim('316_LEGACY_TERMINAL');await page.keyboard.press('KeyE');assert.match(await page.locator('#subtitle-text').innerText(),/1998-ER-0217/);
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='ZHOU_1F_WARNING_CALL');assert.equal((await state()).decoded,true);
  await shot('zhou-query-complete-next-warning');await page.keyboard.press('KeyE');await page.keyboard.press('KeyE');assert.equal((await state()).step,'ZHOU_1F_WARNING_CALL');return await state();
 });
 await seed('CHEN','CHEN_M8_DISPATCH');
 await check('B1 detailed room uses rendered geometry with clear central circulation',async()=>{
  const counts=await page.evaluate(()=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller;let meshes=0;z.zoneGroup.traverse(o=>{if(o.isMesh)meshes++;});c.teleport(0,1.7,1.2);for(const [x,zz] of [[-4,1],[-5,-3.5],[-3,-3.5],[-3,-12.5],[0,-12.5],[0,-6],[6.8,-6],[7.4,-4.2]]){c.moveWithCollision(x-c.position.x,zz-c.position.z);if(Math.hypot(c.position.x-x,c.position.z-zz)>.05)throw Error('B1 path blocked');}return {meshes,hasVehicle:z.zoneGroup.getObjectByName('B1_Ambulance_Windshield')?.isMesh,hasPipes:!!z.zoneGroup.getObjectByName('B1_CeilingPipes')};});
  assert.equal(counts.hasVehicle,true);assert.equal(counts.hasPipes,true);
  await pose([-.35,1.7,.3],[-1,.95,-10],'b1-refined-room-overview');
  await pose([-.5,1.7,-7.2],[3.4,1.2,-10.8],'b1-refined-ambulance');
  await pose([-3,1.7,-3.3],[-7,1.2,-6.55],'b1-dispatch-workstation');return counts;
 });
 await check('B1 board -> attached reader -> physical shelf ledger stays visible and pickable',async()=>{
  const board=await e('CHEN_DISPATCH_BOARD');await waitTarget('CHEN_DISPATCH_LOCKER_READER');
  const reader=await e('CHEN_DISPATCH_LOCKER_READER');await waitTarget('CHEN_DRIVER_LOG');
  const log=await aim('CHEN_DRIVER_LOG');
  const visibility=await page.evaluate(()=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller,log=z.driverLog;z.zoneGroup.updateMatrixWorld(true);const target=log.getWorldPosition(c.position.clone()),ray=new c.raycaster.constructor();ray.set(c.camera.position,target.sub(c.camera.position).normalize());const visible=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};const first=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&h.object.material&&(!h.object.material.transparent||h.object.material.opacity>=.85));let own=false;for(let n=first?.object;n;n=n.parent)if(n===log)own=true;return {own,first:first?.object.name,doorAngle:z.lockerDoor.rotation.y};});
  assert.equal(visibility.own,true,'ledger must not be selected through cabinet wall or closed door');
  await shot('b1-locker-open-ledger-E');await page.keyboard.press('KeyE');await dialogue();await waitTarget('CHEN_DISPATCH_SERVICE_LIFT');
  return {board,reader,log,visibility};
 });
 await check('B1 service lift still returns to 316 final paired choices',async()=>{
  const hit=await e('CHEN_DISPATCH_SERVICE_LIFT');await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_3f'&&window.__storyQA.identityRouteDirector.step==='M9');
  assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.canEnterB2()),false);await shot('chen-refined-b1-return-316');await e('316_LEGACY_TERMINAL');await page.locator('#identity-loop-panel.m9-open').waitFor();assert.equal(await page.locator('input[type=radio][name^=m9-]').count(),8);assert.equal(await page.locator('.identity-entry-submit').isDisabled(),true);return {hit,...await state()};
 });
 await seed('CHEN','CHEN_M8_DISPATCH');await page.setViewportSize({width:390,height:844});
 await pose([-.35,1.7,.3],[1.4,1.2,-10],'b1-refined-narrow-390');
 await check('B2 visible door and prompt use neutral exit wording',async()=>{
  await page.setViewportSize({width:1280,height:860});
  await page.evaluate(()=>window.__storyQA.load('b2_archive','b2_archive_entry'));
  await pose([0,1.7,-1.1],[0,1.45,1.6],'b2-neutral-exit-sign');const hit=await aim('B2_ONE_WAY_EXIT');
  const text=await page.locator('#interaction-prompt').innerText();assert.match(text,/經由逃生門離開/);assert.doesNotMatch(text,/3F/);await shot('b2-neutral-exit-E-prompt');return {hit,text};
 });
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page){report.state=await state().catch(()=>null);await shot('failure').catch(()=>{});}}
finally{await save();await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));console.log('ZHOU_B1_RESULT '+JSON.stringify(report));}
