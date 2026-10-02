import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.argv[2]||'../../qa-evidence/character-refinement/before';await mkdir(out,{recursive:true});
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4221,strictPort:true}});
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)[1];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={bundleSHA256:createHash('sha256').update(js).digest('hex'),method:'Same supported cameras, fixed M2 state/time, identical viewport and quality; actual production mesh under existing ward lighting. No physical-phone FPS claim.',errors:[],views:[]};
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__characterFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto('http://127.0.0.1:4221/?qa=story&identity=LI',{timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
 await page.evaluate(async()=>{const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;d.removeInteractionTarget();m.runSave.currentRouteStep=m.route.indexOf('M2');m.runSave.currentMilestone='M2';m.save();await d.loadCurrentStep({forceLoad:true});q.gameState.setGameTime('21:17');q.controller.enabled=true;});
 const views=[{id:'face',position:[5.65,1.7,-12.85],target:[5.65,1.61,-13.8]},{id:'full',position:[5.65,1.7,-11.4],target:[5.65,.97,-13.8]},{id:'quarter',position:[4.85,1.7,-12.15],target:[5.65,1.13,-13.8]},{id:'far',position:[5.65,1.7,-7.7],target:[5.65,1.02,-13.8]}];
 for(const view of views){const details=await page.evaluate(async view=>{
  const q=window.__storyQA,c=q.controller,s=q.hospitalSimulation.data.staff,systems=q.worldRouter.activeZoneInstance.hospitalSystems;
  c.teleport(...view.position);Object.assign(s,{z:-13.8,waypoint:1,mode:'patrol',remaining:0});systems.staff.rotation.y=Math.PI;systems.synchronizeStaff(0,c.position);
  for(let i=0;i<120;i++)systems.actor.update(1/60,s,c.position,{heading:Math.PI});
  q.lookAt(view.target);await new Promise(requestAnimationFrame);c.enabled=false;q.qualitySettings.lastRender=0;window.__characterFrame();c.enabled=true;
  const meshes=[];systems.staff.traverse(o=>{if(o.isMesh)meshes.push({name:o.name,triangles:o.geometry.index?o.geometry.index.count/3:o.geometry.attributes.position.count/3});});
  return {supported:c.supportedHeight(c.position.x,c.position.z)!==null,collision:c.checkCollision(c.position.x,c.position.z),performance:q.qualitySettings.snapshot(),actor:{meshes:meshes.length,triangles:meshes.reduce((sum,o)=>sum+o.triangles,0)},state:structuredClone(s)};
 },view);assert(details.supported&&!details.collision,JSON.stringify({view,details}));assert(details.performance.withinSceneBudget);const name=(mobile?'mobile':'desktop')+'-'+view.id+'.png';await page.screenshot({path:out+'/'+name});report.views.push({...view,...details,file:name});}
 await context.close();
}assert.deepEqual(report.errors,[]);report.verdict='PASS';}catch(e){report.verdict='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));}
console.log('CHARACTER_CAPTURE',out,report.verdict,report.errors);
