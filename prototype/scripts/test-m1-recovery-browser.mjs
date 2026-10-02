import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'qa-results/m1-recovery';await mkdir(out,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4218,strictPort:true}}),base='http://127.0.0.1:4218/';
const assets=await readdir('dist/assets'),js=await readFile('dist/assets/'+assets.find(p=>/^index-.*\.js$/.test(p)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
let mobileMode=false;
const report={method:'Production bundle, chapter-arrival fixture, actual E/UI handoff transactions and reload; not a continuous four-Seed walkthrough or physical-device FPS test.',checks:[],errors:[],resources:[]};let page;
async function ready(){await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});}
async function start(identity,mobile){mobileMode=mobile;
 if(page)await page.close();page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:860},hasTouch:mobile,isMobile:mobile});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__closureFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto(base+'?qa=story&identity='+identity,{waitUntil:'load',timeout:120000});await ready();
 await page.evaluate(async()=>{const q=window.__storyQA,m=q.identityManager;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;while(m.currentRouteStep!=='M1')m.completeRouteStep(m.currentRouteStep);await q.identityRouteDirector.loadCurrentStep({forceLoad:true});q.controller.enabled=true;});
}
async function tick(){await page.evaluate(()=>{const q=window.__storyQA;q.controller.enabled=true;q.identityRouteDirector.update();});await ready();}
async function pressInteract(){if(mobileMode){await page.evaluate(()=>window.__storyQA.touchControls.refresh());await page.locator('#touch-interact').tap();}else await page.keyboard.press('KeyE');}
async function dialogue(){for(let i=0;i<40;i++){if(!await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence))return;if(mobileMode){await page.evaluate(()=>window.__storyQA.touchControls.refresh());await page.locator('#touch-continue').tap();}else await page.keyboard.press('KeyE');}throw Error('Dialogue pending');}
async function use(id){const approach=await aim(id);await pressInteract();await dialogue();return approach;}
async function snapshot(){return page.evaluate(()=>{const q=window.__storyQA,m=q.identityManager,g=q.gameState,z=q.worldRouter.activeZoneInstance;return {identity:m.currentIdentity,seed:m.runSave.runSeed,step:m.currentRouteStep,beat:q.identityRouteDirector.beatIndex,checkpoint:m.runSave.m1HandoffCheckpoint,tasks:[...g.completedTasks],card:g.getFlag('STAFF_ACCESS_CARD'),opened:g.getFlag('OPENED_316'),locker:g.getFlag('LOCKER_OPENED'),enabled:q.controller.enabled,keyVisible:z.keyMesh?.userData?.targetGroup?.visible,doorPhysicalOpen:z.levelInstance?.officeDoorOpen,doorColliderPresent:z.levelInstance?.colliders.includes(z.levelInstance.officeDoorCollider),spareInteractable:z.spareKeyMesh?.userData.interactable,lockerAngle:z.levelInstance?.lockerDoor?.rotation.z,phone:g.getFlag('PHONE_RING_ACTIVE'),journal:Object.keys(m.runSave.evidence).filter(id=>id.startsWith('route:M1:')),b2:m.runSave.b2Entered,m9:m.runSave.m9CommittedChoice};});}
async function reload(label){const before=await snapshot();await page.goto(base+'?qa=story',{waitUntil:'load',timeout:120000});await ready();const after=await snapshot();assert.equal(after.identity,before.identity);assert.equal(after.seed,before.seed);const finished=['ZHOU','CHEN'].includes(before.identity)&&before.tasks.includes('KEY_PICKUP');assert.equal(after.step,finished?'M2':'M1');if(finished)assert.equal(after.checkpoint,null);else assert.deepEqual(after.checkpoint,before.checkpoint);assert.equal(after.enabled,true);for(const t of ['DUTY_LOG','HIS_CREDENTIALS_FOUND','E_HANDOFF','LOCKER_OPENED','KEY_PICKUP'])assert.equal(after.tasks.includes(t),before.tasks.includes(t));assert.equal(after.card,before.card);assert.equal(after.opened,before.opened);assert.equal(after.locker,before.locker);assert.equal(after.b2,false);assert.equal(after.m9,null);if(after.step==='M1'){assert.equal(after.doorPhysicalOpen,after.opened);assert.equal(after.doorColliderPresent,!after.opened);if(after.checkpoint?.flags.FOUND_316_SPARE_KEY)assert.equal(after.spareInteractable,false);if(after.locker){assert.equal(after.lockerAngle,-1.15);assert.equal(after.keyVisible,!after.tasks.includes('KEY_PICKUP'));}}report.checks.push({label,before,after});await writeFile(out+'/result.json',JSON.stringify(report,null,2));}
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

try{
 for(const identity of ['LI','ZHANG','ZHOU','CHEN']){
  await start(identity,identity==='CHEN');
  await use('316_SPARE_KEY');await reload(identity+' spare key');
  const door=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='office_316_door').userData.id);
  await use(door);await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(5.1,1.7,5);q.controller.enabled=true;q.identityRouteDirector.update();});await dialogue();await ready();
  assert.equal((await snapshot()).beat,1);await reload(identity+' reviewed office entry');
  await use('DUTY_LOG');await page.locator('#btn-sign-log').click();await tick();await reload(identity+' signed duty log');
  const credential=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='credential_drawer_316').userData.id);await use(credential);await tick();await reload(identity+' HIS card');
  const workstation=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='workstation').userData.id);await use(workstation);await page.locator('#btn-sign-handoff').click();
  await reload(identity+' submitted HIS before animation completes');await tick();
  const locker=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='locker_316').userData.id);await use(locker);await page.locator('#locker-code').fill('1111');await page.locator('#btn-unlock-locker').click();assert.equal((await snapshot()).locker,false);
  await page.locator('#locker-code').fill('1700');await page.locator('#btn-unlock-locker').click();await page.locator('#btn-close-locker').click();await tick();await reload(identity+' unlocked physical locker');assert.equal((await snapshot()).keyVisible,true);
  await use('KEY_PICKUP');await reload(identity+' took keys, before optional call');if(['LI','ZHANG'].includes(identity))assert.equal((await snapshot()).keyVisible,false);
  await tick();
  if(['LI','ZHANG'].includes(identity)){assert.equal((await snapshot()).beat,6);assert.equal((await snapshot()).step,'M1');await reload(identity+' awaiting unperformed distinct call');await use('316_PHONE');await ready();}
  else await ready();
  assert.notEqual((await snapshot()).step,'M1');assert.equal((await snapshot()).checkpoint,null);for(let i=0;i<6;i++)assert((await snapshot()).journal.includes('route:M1:'+i),'earned journal entry '+i);
  await page.evaluate(()=>window.__closureFrame?.());await page.screenshot({path:out+'/'+identity+'-recovered.png'});
 }
 await start('LI',false);await use('316_SPARE_KEY');const entry=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='office_316_door').userData.id);await use(entry);
 await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(5.1,1.7,5);q.controller.enabled=true;q.identityRouteDirector.update();});await dialogue();await ready();
 const earlyCard=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='credential_drawer_316').userData.id);await use(earlyCard);await reload('LI free order: HIS card before duty log');assert.equal((await snapshot()).beat,1);
 const earlyHIS=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='workstation').userData.id);await use(earlyHIS);await page.locator('#btn-sign-handoff').click();await reload('LI free order: HIS submitted before duty log');assert.equal((await snapshot()).beat,1);assert.equal((await snapshot()).tasks.includes('DUTY_LOG'),false);
 await use('DUTY_LOG');await page.locator('#btn-sign-log').click();for(let i=0;i<4;i++)await tick();await reload('LI late log: preserved HIS consumed without repeating');assert.equal((await snapshot()).beat,4);
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(e){report.verdict='FAIL';report.failure=e.stack;process.exitCode=1;console.error(e);}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log('M1_CHECKPOINT',report.verdict,report.checks.length);
