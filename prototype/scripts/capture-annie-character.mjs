import {chromium} from 'playwright';
import {build,preview} from 'vite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const baseline=process.argv.includes('--baseline');
const out=resolve(process.argv[2]||root+'/qa-results/annie-character');await mkdir(out,{recursive:true});
const outDir=baseline?'dist':'qa-results/annie-character-build';
if(!baseline)await build({root,base:'./',build:{outDir,emptyOutDir:true},plugins:[{name:'annie-qa-import',transformIndexHtml:{order:'pre',handler(html){return html.replace('</head>',`<script type="module">import * as api from '/src/art/AnnieCharacter.js';window.__annieCharacterAPI=api;</script></head>`);}}}]});
const server=await preview({root,build:{outDir},preview:{host:'127.0.0.1',port:4227,strictPort:true}});
const files=await readdir(root+'/'+outDir+'/assets'),js=await readFile(root+'/'+outDir+'/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:850}}),report={base:'d2e5302',bundleSHA256:createHash('sha256').update(js).digest('hex'),baseline,method:'Actual production-built 5F scene, fixed cameras/time with optional QA import. Headless Chromium SwiftShader, DPR 1. Pose/animation renders are QA fixtures; they do not change encounter triggers. No handset FPS claim.',errors:[],views:[],animations:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
await page.addInitScript(name=>{localStorage.setItem('IdentityLoop_Quality_v1','performance');const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__annieFrame=fn;return 0;}return raf(fn);};},loop);
try{
 await page.goto('http://127.0.0.1:4227/?qa=story&identity=LI',{timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
 await page.evaluate(async()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.identityRouteDirector.removeInteractionTarget();await q.prefetch({zoneId:'second_campus_5f'});q.load('second_campus_5f');q.controller.enabled=true;});
 await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneInstance.zoneGroup.getObjectByName('Second5F_StorageAnnie'));
 await page.addStyleTag({content:'#crosshair,#interaction-prompt{visibility:hidden!important}'});
 const frozen=await page.evaluate(()=>({identity:window.__storyQA.identityManager.snapshot(),hospital:window.__storyQA.hospitalSimulation.snapshot(),ids:window.__storyQA.worldRouter.activeZoneInstance.interactables.map(o=>o.userData.id)}));
 for(const view of [{name:'game-seated',position:[63,1.25,1.65],target:[61,.95,1]},{name:'game-face',position:[61.68,1.42,1.20],target:[61,1.39,1]}]){
  await page.evaluate(v=>{const q=window.__storyQA;q.controller.teleport(...v.position);q.lookAt(v.target);},view);
  const before=await frame();await page.screenshot({path:out+'/'+view.name+'-before.png'});
  if(!baseline){
   await page.evaluate(()=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,old=z.zoneGroup.getObjectByName('Second5F_StorageAnnie');window.__oldAnnie=old;old.visible=false;const api=window.__annieCharacterAPI;const a=api.createAnnieCharacter(z.zoneGroup,{state:old.userData.state,position:old.position.toArray(),rotationY:old.rotation.y,cuffColor:0x4c6880});a.name='AnnieCharacter_QA';window.__newAnnie=a;});
   await frame();const after=await frame();await page.screenshot({path:out+'/'+view.name+'-after.png'});
   assert(after.actor.meshes<=24);assert(after.actor.triangles<=28000);assert(after.withinSceneBudget);assert(after.drawCalls<before.drawCalls);
   report.views.push({name:view.name,before,after});
   await page.evaluate(()=>{window.__annieCharacterAPI.disposeAnnieCharacter(window.__newAnnie);window.__oldAnnie.visible=true;});
  }else report.views.push({name:view.name,before});
 }
 const afterState=await page.evaluate(()=>({identity:window.__storyQA.identityManager.snapshot(),hospital:window.__storyQA.hospitalSimulation.snapshot(),ids:window.__storyQA.worldRouter.activeZoneInstance.interactables.map(o=>o.userData.id)}));
 assert.deepEqual(afterState,frozen);
 if(!baseline){
  for(const [zoneId,state,key,camera,target]of [
    ['skybridge','BRIDGE_MANIFEST','bridgeDoppelganger',[44.8,1.45,.7],[46,1.35,0]],
    ['phantom_6f','FLOOR6_CPR','annie',[3.3,1.6,-5.8],[1.2,.96,-7.3]]]){
   const setup=await page.evaluate(async({zoneId,state,key,camera,target})=>{const q=window.__storyQA;await q.prefetch({zoneId});q.load(zoneId);const z=q.worldRouter.activeZoneInstance,old=z[key];old.visible=false;const a=window.__annieCharacterAPI.createAnnieCharacter(z.zoneGroup,{state,position:old.position.toArray(),rotationY:old.rotation.y});window.__poseAnnie=a;q.controller.teleport(...camera);q.lookAt(target);return window.__annieCharacterAPI.inspectAnnieCharacter(a);},{zoneId,state,key,camera,target});
   const images=[];
   for(const [phase,seconds]of [['rest',0],['motion',state==='FLOOR6_CPR'?.136:3]]){
    const motion=await page.evaluate(({seconds})=>{const api=window.__annieCharacterAPI,a=window.__poseAnnie;for(let t=0;t<seconds;t+=.01)api.updateAnnieCharacter(a,Math.min(.01,seconds-t));const q=window.__storyQA;q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());return {compression:a.userData.rig.compression,head:a.userData.rig.head.rotation.toArray(),upperY:a.userData.rig.upperBody.position.y};},{seconds});
    const name=state.toLowerCase()+'-'+phase+'.png';await page.screenshot({path:out+'/'+name});images.push({name,...motion});
   }
   if(state==='FLOOR6_CPR')assert(images[1].compression>.98);
   assert.notEqual(createHash('sha256').update(await readFile(out+'/'+images[0].name)).digest('hex'),createHash('sha256').update(await readFile(out+'/'+images[1].name)).digest('hex'));
   report.animations.push({state,setup,images});await page.evaluate(()=>window.__annieCharacterAPI.disposeAnnieCharacter(window.__poseAnnie));
  }
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  mobile.on('pageerror',e=>report.errors.push(e.message));
  await mobile.addInitScript(name=>{localStorage.setItem('IdentityLoop_Quality_v1','performance');const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>fn.name===name?0:raf(fn);},loop);
  await mobile.goto('http://127.0.0.1:4227/?qa=story&identity=LI',{timeout:120000});await mobile.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
  await mobile.addStyleTag({content:'#crosshair,#interaction-prompt{visibility:hidden!important}'});
  const stats=await mobile.evaluate(async()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.identityRouteDirector.removeInteractionTarget();await q.prefetch({zoneId:'second_campus_5f'});q.load('second_campus_5f');const z=q.worldRouter.activeZoneInstance,old=z.zoneGroup.getObjectByName('Second5F_StorageAnnie');old.visible=false;window.__annieCharacterAPI.createAnnieCharacter(z.zoneGroup,{state:'STORAGE_STATIC',position:old.position.toArray(),rotationY:old.rotation.y,cuffColor:0x4c6880});q.controller.teleport(63,1.25,1.65);q.lookAt([61,.95,1]);await new Promise(requestAnimationFrame);q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());const {p95FrameMs,sampledFrames,...s}=q.qualitySettings.snapshot();return {...s,cssViewport:[innerWidth,innerHeight]};});
  assert(stats.withinSceneBudget);assert.equal(stats.pixelRatio,1);assert.equal(stats.cssViewport[0],390);await mobile.screenshot({path:out+'/mobile-seated.png'});report.mobile=stats;await mobile.close();
 }
 report.verdict='PASS';assert.deepEqual(report.errors,[]);
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));console.log('ANNIE_CHARACTER_QA',report.verdict,out);}
async function frame(){return page.evaluate(async()=>{await new Promise(requestAnimationFrame);const q=window.__storyQA;q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());const {p95FrameMs,sampledFrames,...stats}=q.qualitySettings.snapshot();const a=window.__newAnnie?.parent?window.__newAnnie:q.worldRouter.activeZoneInstance.zoneGroup.getObjectByName('Second5F_StorageAnnie');let meshes=0,triangles=0;a.traverseVisible(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {...stats,actor:{meshes,triangles},state:a.userData.state};});}
