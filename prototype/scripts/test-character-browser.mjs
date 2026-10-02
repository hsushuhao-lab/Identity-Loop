import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.argv[2]||'../../qa-evidence/character-refinement/character-browser';await mkdir(out,{recursive:true});
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4231,strictPort:true}});
const names=await readdir('dist/assets'),js=await readFile('dist/assets/'+names.find(f=>/^index-.*\.js$/.test(f)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)[1];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'Production actor, loaded-zone simulation, real colliders and disposal; deterministic frame stepping. No physical-device frame-rate measurement.',bundleSHA256:createHash('sha256').update(js).digest('hex'),errors:[],checks:[]};
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}});page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__characterFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto('http://127.0.0.1:4231/?qa=story&identity=LI',{timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
 await page.evaluate(async()=>{const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;d.removeInteractionTarget();m.runSave.currentRouteStep=m.route.indexOf('M2');m.runSave.currentMilestone='M2';m.save();await d.loadCurrentStep({forceLoad:true});q.gameState.setGameTime('21:17');q.controller.teleport(0,1.7,-12);q.controller.enabled=true;});
 report.checks.push(await page.evaluate(()=>{
  const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,h=z.hospitalSystems,s=q.hospitalSimulation.data.staff,before=JSON.stringify(q.identityManager.snapshot());
  let moved=0,turnWait=0,maxTurn=0,minimumSole=Infinity,maximumLift=0;const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const sole=foot=>{let min=Infinity;foot.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();const b=o.geometry.boundingBox;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const zz of [b.min.z,b.max.z])min=Math.min(min,q.controller.position.clone().set(x,y,zz).applyMatrix4(o.matrixWorld).y);});return min;};
  for(let i=0;i<1800;i++){
   const oldZ=s.z,oldY=h.staff.rotation.y,target=s.mode==='investigate'?s.targetZ:[-13.8,-7.6,-4.2,-7.6][s.waypoint],desired=target>=oldZ?Math.PI:0;
   q.worldRouter.update(1/60);const turn=Math.abs(wrap(h.staff.rotation.y-oldY));maxTurn=Math.max(maxTurn,turn);if(turn>1.75/60+1e-6)throw Error('Hard yaw flip');
   if(Math.abs(wrap(desired-oldY))>.35){if(s.z!==oldZ)throw Error('Moves before completing patrol turn');turnWait++;}else if(s.z!==oldZ)moved++;
   h.staff.updateMatrixWorld(true);const feet=h.actor.feet.map(sole);minimumSole=Math.min(minimumSole,...feet);maximumLift=Math.max(maximumLift,...feet);if(Math.min(...feet)<-.0001||Math.min(...feet)>.02)throw Error('Bad foot contact '+feet);
  }
  if(moved<900||turnWait<20||maximumLift<.035)throw Error('Patrol did not walk and turn '+JSON.stringify({moved,turnWait,maximumLift}));
  q.hospitalSimulation.moveWheelchair();let sawInspect=false;
  for(let i=0;i<2700;i++){q.worldRouter.update(1/60);if(s.mode==='inspect')sawInspect=true;}
  if(!sawInspect||s.investigated!==1)throw Error('Noise investigation missing '+JSON.stringify(s));
  if(JSON.stringify(q.identityManager.snapshot())!==before)throw Error('Art changed identity state');
  return {name:'loaded patrol turns, planted feet and noise investigation',status:'PASS',moved,turnWait,maxTurn,minimumSole,maximumLift,staff:structuredClone(s)};
 }));
 await page.evaluate(()=>{const q=window.__storyQA,s=q.hospitalSimulation.data.staff;const c=q.controller;c.teleport(5.65,1.7,s.z+2.4);q.lookAt([5.65,1.04,s.z]);c.enabled=false;q.qualitySettings.lastRender=0;window.__characterFrame();c.enabled=true;});await page.screenshot({path:out+'/patrol.png'});
 report.checks.push(await page.evaluate(()=>{
  const q=window.__storyQA,old=q.worldRouter.activeZoneInstance.hospitalSystems;let disposed=0;const owned=new Set();old.staff.traverse(o=>{if(o.isMesh)owned.add(o.geometry);});for(const g of owned)g.addEventListener('dispose',()=>disposed++);
  q.load('first_campus_3f');q.controller.enabled=true;for(let i=0;i<120;i++)q.worldRouter.update(1/60);q.load('first_campus_4f');const h=q.worldRouter.activeZoneInstance.hospitalSystems;
  if(disposed!==owned.size)throw Error('Actor geometries leaked '+disposed+'/'+owned.size);if(h===old||h.staff.parent===null)throw Error('Actor not reconstructed');
  if(h.staff.position.z!==q.hospitalSimulation.data.staff.z)throw Error('Staff position did not persist');if(!q.controller.checkCollision(5.65,h.staff.position.z))throw Error('Staff collider absent');
  if(q.worldRouter.activeZoneInstance.zoneGroup.getObjectsByProperty('name','HospitalSystems_EquipmentAttendant').length!==1)throw Error('Duplicated actor');
  return {name:'unload disposes actor and restores one saved anonymous staff member',status:'PASS',ownedGeometries:owned.size,disposed};
 }));
 assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(e){report.verdict='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));console.log('CHARACTER_BROWSER',report.verdict,report.failure||'',report.checks);}
