import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'qa-results/first-duty-bathroom-browser';await mkdir(out,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4193,strictPort:true}});
const assets=await readdir('dist/assets'),js=await readFile('dist/assets/'+assets.find(p=>/^index-.*\.js$/.test(p)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:860}});
const report={method:'Production bundle, 4F seeded checkpoint; real keyboard E, door handler and movement/collision. Main WebGL render sampled on demand; not whole-route playthrough.',errors:[],resources:[],screenshots:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(r.status()+' '+r.url());});
await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__bathFrame=fn;return 0;}return raf(fn);};},loop);
async function shot(name){await page.evaluate(()=>window.__bathFrame());await page.waitForTimeout(150);await page.screenshot({path:out+'/'+name+'.png',timeout:20000});report.screenshots.push(name+'.png');}
async function targetDoor(eye){return page.evaluate(eye=>{const q=window.__storyQA,c=q.controller,z=q.worldRouter.activeZoneInstance;c.teleport(...eye);z.zoneGroup.updateMatrixWorld(true);q.lookAt([-11.5,1.2,4]);c.enabled=true;if(c.checkCollision(c.position.x,c.position.z)||c.supportedHeight(c.position.x,c.position.z)===null)throw Error('Unsupported door approach');return c.currentInteractable?.doorId;},eye);}
try{
 await page.goto('http://127.0.0.1:4193/?qa=story&identity=LI',{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
 await page.evaluate(async()=>{const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager;d.removeInteractionTarget();q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;m.runSave.currentRouteStep=m.route.indexOf('M2');m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone='M2';m.save();d.busy=false;await d.loadCurrentStep({forceLoad:true});});
 report.fixtures=await page.evaluate(()=>{const z=window.__storyQA.worldRouter.activeZoneInstance,b=z.dutyBathroom;return {zone:window.__storyQA.worldRouter.activeZoneId,bounds:b.bounds,fixtures:b.fixtures,meshes:['ShowerHead','ToiletBowl','Sink'].map(n=>({name:n,present:!!b.root.getObjectByName('FirstDutyBathroom_'+n)?.isMesh}))};});
 assert.equal(report.fixtures.zone,'first_campus_4f');assert(report.fixtures.meshes.every(m=>m.present));
 assert.equal(await targetDoor([-10.8,1.7,4]),'duty_bathroom');await shot('4f-bathroom-door-closed');await page.keyboard.press('KeyE');
 assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.dutyBathroomDoor.closed),false);
 report.walk=await page.evaluate(()=>{const q=window.__storyQA,c=q.controller,z=q.worldRouter.activeZoneInstance,path=z.dutyBathroom.walkingPath;c.teleport(...path[0]);for(const dest of path.slice(1)){const n=Math.ceil(Math.hypot(dest[0]-c.position.x,dest[2]-c.position.z)/.03),dx=(dest[0]-c.position.x)/n,dz=(dest[2]-c.position.z)/n;for(let i=0;i<n;i++){c.moveWithCollision(dx,dz);if(c.checkCollision(c.position.x,c.position.z)||c.supportedHeight(c.position.x,c.position.z)===null)throw Error('Invalid bathroom path');}if(Math.hypot(c.position.x-dest[0],c.position.z-dest[2])>.05)throw Error('Blocked bathroom path');}q.lookAt([-13.38,2.15,2.64]);return {path,end:c.position.toArray()};});
 await shot('4f-shower');await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(-12.1,1.7,3.7);q.lookAt([-13.2,.5,4.5]);});await shot('4f-toilet');
 await page.evaluate(()=>window.__storyQA.lookAt([-12,1.2,2.55]));await shot('4f-basin');
 assert.equal(await targetDoor([-12.2,1.7,3.7]),'duty_bathroom');await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.dutyBathroomDoor.closed),true);
 // The production door handler clears the hover target after each use. Refresh it,
 // as the next normal render frame would, before sending the second real E key.
 assert.equal(await page.evaluate(()=>{const c=window.__storyQA.controller;c.updateRaycast();return c.currentInteractable?.doorId;}),'duty_bathroom');
 await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.dutyBathroomDoor.closed),false);
 report.returnPosition=await page.evaluate(()=>{const q=window.__storyQA,c=q.controller;c.teleport(-12.1,1.7,4);for(let i=0;i<45;i++)c.moveWithCollision(1.3/45,0);if(Math.abs(c.position.x+10.8)>.03)throw Error('Bathroom exit blocked');return c.position.toArray();});
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(-12.1,1.7,3.7);q.lookAt([-13.22,1.2,2.7]);});await shot('4f-bathroom-narrow');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(e){report.verdict='FAIL';report.failure=e.stack;process.exitCode=1;await shot('failure').catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));console.log('BATHROOM_BROWSER_RESULT '+JSON.stringify(report));await browser.close();await new Promise(r=>server.httpServer.close(r));}
