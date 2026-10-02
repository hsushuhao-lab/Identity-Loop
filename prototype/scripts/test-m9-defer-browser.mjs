import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'../../qa-evidence/m9-defer-integration';await mkdir(out,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4240,strictPort:true}}),base='http://127.0.0.1:4240/';
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(n=>/^index-.*\.js$/.test(n)),'utf8'),loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'M9 chapter-arrival fixture, real E/touch and form controls, keyboard/native-CDP-touch walk through unchanged floor collision to archive and back. Main renderer clock stepped explicitly, no teleport during the excursion. Not continuous four-Seed story/ending acceptance or physical FPS.',runs:[],errors:[]};
let page,cdp,mobile,touchPoint;
async function ready(){await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});}
async function interact(){if(mobile)await page.locator('#touch-interact').tap();else await page.keyboard.press('KeyE');}
async function dialogue(){for(let i=0;i<20;i++){if(!await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence))return;if(mobile)await page.locator('#touch-continue').tap();else await page.keyboard.press('KeyE');}throw Error('Dialogue did not finish');}
async function motion(active){
 if(!mobile){await page.keyboard[active?'down':'up']('KeyW');return;}
 if(active){const box=await page.locator('#touch-move').boundingBox();assert(box);touchPoint={x:box.x+box.width/2,y:box.y+box.height/2,id:17};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touchPoint]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...touchPoint,y:touchPoint.y-60}]});}
 else await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
async function aimTerminal(){return page.evaluate(()=>{
 const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller,o=z.interactables.find(o=>o.userData.type==='legacy_terminal_316');
 const target=o.getWorldPosition(c.position.clone());
 for(const radius of [.8,1.1,1.5,1.9,2.3])for(let i=0;i<48;i++){
  const x=target.x+radius*Math.cos(i*Math.PI/24),zz=target.z+radius*Math.sin(i*Math.PI/24);
  if(c.checkCollision(x,zz)||c.supportedHeight(x,zz)===null)continue;
  c.teleport(x,1.7,zz);if(q.lookAt(target.toArray()).current===o.userData.id)return c.position.toArray();
 }throw Error('No supported terminal approach');
});}
async function walk(goal){
 const path=await page.evaluate(goal=>{
  const q=window.__storyQA,c=q.controller,z=q.worldRouter.activeZoneInstance,colliders=c.colliders,step=.35;
  const key=(x,y)=>x+','+y,cell=p=>[Math.round(p[0]/step),Math.round(p[1]/step)],start=cell([c.position.x,c.position.z]),end=cell(goal),cache=new Map();
  // Plan through the hinged door, then open it using its real sensor before crossing.
  // Only this synchronous planner omits the door; movement retains every collider.
  c.colliders=colliders.filter(box=>box!==z.archiveDoor.closedBox);
  const open=(x,y)=>{const k=key(x,y);if(!cache.has(k))cache.set(k,x*step>=-24&&x*step<=24&&y*step>=-10&&y*step<=12&&!c.checkCollision(x*step,y*step)&&c.supportedHeight(x*step,y*step)!==null);return cache.get(k);};
  const queue=[start],parents=new Map([[key(...start),null]]);let found;
  try{for(let head=0;head<queue.length;head++){const p=queue[head];if(Math.hypot(p[0]-end[0],p[1]-end[1])<1.5){found=p;break;}for(const d of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+d[0],p[1]+d[1]],k=key(...n);if(!parents.has(k)&&open(...n)){parents.set(k,p);queue.push(n);}}}}finally{c.colliders=colliders;}
  if(!found)throw Error('No physical floor path to '+goal);const result=[];for(let p=found;p;p=parents.get(key(...p)))result.push([p[0]*step,p[1]*step]);return result.reverse().slice(1);
 },goal);
 let frames=0,distance=0;
 await motion(true);
 for(const point of path){
  const door=await page.evaluate(()=>{const q=window.__storyQA,d=q.worldRouter.activeZoneInstance.archiveDoor;return d.closed&&Math.hypot(q.controller.position.x-d.root.position.x,q.controller.position.z-d.root.position.z)<2.3;});
  if(door){await motion(false);const id=await page.evaluate(()=>{const q=window.__storyQA,d=q.worldRouter.activeZoneInstance.archiveDoor;return q.lookAt(d.hitPanel.getWorldPosition(q.controller.position.clone()).toArray()).current;});assert.equal(id,'3F_ARCHIVE_DOOR');await interact();assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.archiveDoor.closed),false);await motion(true);}
  const result=await page.evaluate(point=>{const q=window.__storyQA,c=q.controller,before=c.position.clone();let frames=0;for(;frames<100&&Math.hypot(c.position.x-point[0],c.position.z-point[1])>.12;frames++){q.lookAt([point[0],c.position.y,point[1]]);c.update(.01);}if(Math.hypot(c.position.x-point[0],c.position.z-point[1])>.20)throw Error('Walking blocked at '+point);if(c.checkCollision(c.position.x,c.position.z)||c.supportedHeight(c.position.x,c.position.z)===null)throw Error('Invalid walking support');return {frames,distance:before.distanceTo(c.position)};},point);
  frames+=result.frames;distance+=result.distance;
 }
 await motion(false);
 // Several seconds of physics run in one browser task. Keep the next native
 // tap a distinct gesture rather than an artificial sub-300ms double-tap.
 if(mobile)await page.waitForTimeout(350);
 return {waypoints:path.length,frames,distance,end:await page.evaluate(()=>window.__storyQA.controller.position.toArray())};
}
try{
 for(const identity of ['ZHOU','CHEN']){
  mobile=identity==='CHEN';page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:860},isMobile:mobile,hasTouch:mobile});cdp=await page.context().newCDPSession(page);
  page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>fn.name===name?0:raf(fn);},loop);
  await page.goto(base+'?qa=story&identity='+identity,{timeout:120000});await ready();
  await page.evaluate(async()=>{const q=window.__storyQA,m=q.identityManager;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;while(m.currentRouteStep!=='M9')m.completeRouteStep(m.currentRouteStep);q.gameState.setFlag('ARCHIVE_ACCESS_KEY',true);q.load('first_campus_1f');await q.identityRouteDirector.loadCurrentStep({forceLoad:true});q.controller.enabled=true;});
  if(mobile)await page.evaluate(()=>{window.__tapEvents=[];const q=window.__storyQA,t=q.touchControls;for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','click'])document.getElementById('touch-interact').addEventListener(type,e=>window.__tapEvents.push({type,pointer:e.pointerId,time:e.timeStamp,pending:t.pendingClick,held:t.held,timer:!!t.holdTimer,blocked:t.blocked(),enabled:q.controller.enabled,current:q.controller.currentInteractable?.id}),true);const action=q.controller.onInteract;q.controller.onInteract=data=>{window.__tapEvents.push({type:'interact',id:data.id});return action(data);};});
  const approach=await aimTerminal(),before=await page.evaluate(()=>window.__storyQA.identityManager.snapshot());
  if(mobile)await page.waitForFunction(()=>!document.getElementById('touch-controls').classList.contains('input-blocked'));
  report.openAttempt=await page.evaluate(()=>{const q=window.__storyQA;return {step:q.identityRouteDirector.step,busy:q.identityRouteDirector.busy,enabled:q.controller.enabled,current:q.controller.currentInteractable?.userData??q.controller.currentInteractable,dialogue:!!q.uiManager.dialogueSequence};});
  await interact();await dialogue();report.afterOpenAttempt=await page.evaluate(()=>{const q=window.__storyQA;return {step:q.identityRouteDirector.step,busy:q.identityRouteDirector.busy,enabled:q.controller.enabled,dialogue:!!q.uiManager.dialogueSequence};});await page.locator('.identity-entry-defer').waitFor({timeout:5000});assert.equal(await page.evaluate(()=>window.__storyQA.controller.enabled),false);
  await page.locator('.identity-entry-defer')[mobile?'tap':'click']();await page.waitForFunction(()=>window.__storyQA.controller.enabled);
  assert.deepEqual(await page.evaluate(()=>window.__storyQA.identityManager.snapshot()),before,'deferral must preserve the exact run');
  if(mobile)await page.waitForFunction(()=>!document.getElementById('touch-controls').classList.contains('input-blocked'));
  const outbound=await walk([19,-4.8]);assert(outbound.distance>8);
  const roster=await page.evaluate(()=>{const q=window.__storyQA,o=q.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.id==='ARCHIVE_PERSONNEL_1998');return q.lookAt(o.getWorldPosition(q.controller.position.clone()).toArray()).current;});assert.equal(roster,'ARCHIVE_PERSONNEL_1998');await interact();report.rosterAttempt=await page.evaluate(()=>{const q=window.__storyQA;return {enabled:q.controller.enabled,blocked:q.touchControls.blocked(),dialogue:!!q.uiManager.dialogueSequence,events:window.__tapEvents,text:document.body.innerText.slice(-800)};});await page.locator('#btn-close-archive').waitFor({timeout:5000});await page.screenshot({path:out+'/'+identity+'-archive-after-defer.png'});await page.locator('#btn-close-archive')[mobile?'tap':'click']();await page.waitForFunction(()=>window.__storyQA.controller.enabled);
  const inbound=await walk([approach[0],approach[2]]);
  const reopened=await page.evaluate(()=>{const q=window.__storyQA,o=q.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='legacy_terminal_316');return q.lookAt(o.getWorldPosition(q.controller.position.clone()).toArray()).current;});assert.equal(reopened,'316_LEGACY_TERMINAL');await interact();await dialogue();await page.locator('.identity-entry-defer').waitFor();
  assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.runSave.m9CommittedChoice),null);
  for(const field of ['m9-name','m9-employee']){const radio=page.locator(`input[name="${field}"][value="${identity}"]`);if(mobile)await radio.tap();else await radio.check();assert(await radio.isChecked());}
  await page.locator('.identity-entry-submit')[mobile?'tap':'click']();
  const committed=await page.evaluate(identity=>{const q=window.__storyQA;return {ended:q.identityManager.runSave.runEnded,name:q.identityManager.runSave.m9CommittedChoice,employee:q.identityManager.runSave.m9CommittedEmployeeChoice,second:q.identityManager.commitM9(identity,identity),staleDefer:q.identityLoopPanel.deferM9(),enabled:q.controller.enabled};},identity);
  assert.equal(committed.ended,true);assert.equal(committed.name,identity);assert.equal(committed.employee,identity);assert.equal(committed.second.reason,'ALREADY_COMMITTED');assert.equal(committed.staleDefer,false);assert.equal(committed.enabled,false);
  report.runs.push({identity,mobile,approach,outbound,inbound,committed});await page.close();
 }
 assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page&&!page.isClosed())await page.screenshot({path:out+'/failure.png'});}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log('M9_DEFER_BROWSER',report.verdict,report.runs.length);
