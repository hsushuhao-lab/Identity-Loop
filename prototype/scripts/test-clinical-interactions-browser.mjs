import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'qa-results/clinical-closure';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4191,strictPort:true}});
const base=supplied||'http://127.0.0.1:4191/';
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
try{
 for(const identity of ['ZHANG','LI','ZHOU','CHEN']){
  await start(identity);await seed('M4');
  await check(identity+' nursing computer',async()=>{const hit=await aim();assert.equal(hit.id,'IDENTITY_SECOND_5F_NURSE_STATION');assert.doesNotMatch(await page.locator('#interaction-prompt').innerText(),/對講機/);await page.keyboard.press('KeyE');await dialogue();assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),1);return hit;});
 }
 // The real safe UI is mandatory here; no qaInteractCurrentBeat or direct pickup flags.
 await seed('M4',4);
 await check('Chen safe -> badge -> duty phone',async()=>{
  const lock=await e();assert.equal(lock.id,'CHEN_5042_LOCKBOX');
  await page.locator('#chen-5042-code').fill('1111');await page.locator('#chen-5042-submit').click();assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('CHEN_5042_LOCKBOX_OPENED')),false);
  await page.locator('#chen-5042-code').fill('5042');await page.locator('#chen-5042-submit').click();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===5);
  const badge=await aim();assert.equal(badge.id,'CHEN_GREY_BADGE');await shot('safe-open-badge');await page.keyboard.press('KeyE');await dialogue();
  await page.setViewportSize({width:390,height:844});await page.locator('#chen-badge-turn').click();await page.locator('#chen-badge-turn').click();await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot('badge-mobile');
  await page.locator('#chen-badge-done').click();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===6);assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('CHEN_GREY_BADGE_COLLECTED')),true);
  await page.setViewportSize({width:1280,height:860});const phone=await e();assert.equal(phone.id,'CHEN_5F_DUTY_PHONE');assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('PHONE_RING_ACTIVE')),false);return {lock,badge,phone};
 });
 await e('second_duty_bathroom');
 await check('5F bathroom physically walkable',async()=>page.evaluate(()=>{
  const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller,path=z.secondDutyBathroom.walkingPath;
  c.teleport(...path[0]);for(const dest of path.slice(1)){const n=Math.ceil(Math.hypot(dest[0]-c.position.x,dest[2]-c.position.z)/.03),dx=(dest[0]-c.position.x)/n,dz=(dest[2]-c.position.z)/n;for(let i=0;i<n;i++)c.moveWithCollision(dx,dz);if(Math.hypot(c.position.x-dest[0],c.position.z-dest[2])>.05)throw Error('Bathroom movement blocked');}q.lookAt([80.8,1.1,3.0]);return {path,end:c.position.toArray()};
 }));await shot('bathroom');
 await start('ZHANG');await seed('M5',1);
 await check('Monitoring telephone ends the call and advances once',async()=>{const phone=await aim();assert.equal(phone.id,'IDENTITY_SECOND_2F_CCTV_PHONE');await shot('monitor-phone-table');await page.keyboard.press('KeyE');await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===2);assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('PHONE_RING_ACTIVE')),false);return phone;});
 for(const identity of ['LI','ZHOU','CHEN']){
  await start(identity);await seed('M5');
  await check(identity+' optional monitoring phone does not skip story',async()=>{const before=await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex);const hit=await e('IDENTITY_SECOND_2F_CCTV_PHONE');assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),before);return hit;});
 }
 await start('LI');await seed('M2');
 await check('Li actual 408C -> 409 -> order -> rest progression',async()=>{
  const interactions=[];interactions.push(await e());interactions.push(await e());assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),2);
  assert.match(await page.locator('#task-panel').innerText(),/409/);interactions.push(await e());assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),3);
  interactions.push(await e());await page.locator('#btn-bed33-reject').waitFor({state:'visible',timeout:15000});await page.locator('#btn-bed33-reject').click();
  await page.evaluate(()=>window.__storyQA.identityRouteDirector.update());
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.currentBeat?.cartCheck);
  interactions.push(await e());await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='LI_DUTY_CALL_2000');
  const door=await e('duty_room');
  await page.evaluate(()=>{const q=window.__storyQA,c=q.controller;c.teleport(-6.6,1.7,6);for(let i=0;i<100;i++)c.moveWithCollision(-.029,0);if(c.position.x> -8.3)throw Error('Cannot walk into duty room');q.identityRouteDirector.update();});
  await dialogue();await page.waitForTimeout(3900);await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('PHONE_RING_ACTIVE')),true);await shot('li-409-to-rest-call');return {interactions,door};
 });
 await start('ZHANG');await seed('M1');
 await check('DutyNight physical glimpse plays before arriving on 8F',async()=>{
  await e('first_campus_3f_elevator');await page.locator('[data-floor="first_campus_8f"]').click();
  await page.locator('.elevator-glimpse-canvas').waitFor({state:'attached',timeout:15000});
  assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneId),'first_campus_3f');
  await page.waitForTimeout(1150);await shot('physical-elevator-glimpse');
  await page.locator('.elevator-glimpse-canvas').waitFor({state:'detached',timeout:15000});
  await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_8f');
  assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('CG_ELEVATOR_TO_8F_PREVIEW_PLAYED')),true);
  return {before:'first_campus_3f',after:'first_campus_8f',canvasRemoved:true};
 });
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page)await shot('failure').catch(()=>{});}
finally{await save();await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));console.log('CLINICAL_CLOSURE_RESULT '+JSON.stringify(report));}
