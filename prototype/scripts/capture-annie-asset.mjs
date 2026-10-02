import {chromium} from 'playwright';
import {build,preview} from 'vite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const baseline=process.argv.includes('--baseline');
const out=resolve(process.argv[2]||root+'/qa-results/annie-asset');await mkdir(out,{recursive:true});
const outDir=baseline?'dist':'qa-results/annie-asset-build';
if(!baseline)await build({root,base:'./',build:{outDir,emptyOutDir:true},plugins:[{name:'annie-qa-import',transformIndexHtml:{order:'pre',handler(html){return html.replace('</head>',`<script type="module">import * as api from '/src/art/AnnieAsset.js';import {disposeZoneArt} from '/src/art/ArtResources.js';window.__annieAssetAPI=api;window.__disposeZoneArt=disposeZoneArt;</script></head>`);}}}]});
const server=await preview({root,build:{outDir},preview:{host:'127.0.0.1',port:4237,strictPort:true}});
const files=await readdir(root+'/'+outDir+'/assets'),js=await readFile(root+'/'+outDir+'/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1100,height:850}}),report={base:'539eb70',bundleSHA256:createHash('sha256').update(js).digest('hex'),baseline,method:'Actual production-built 5F scene, identical fixed cameras/time/lights with optional QA import. Existing Annie practical stays enabled in both views; only its geometry is hidden. Headless Chromium SwiftShader, DPR 1. Pose/animation renders are QA fixtures; they do not change encounter triggers. Localhost load times, no handset FPS claim.',errors:[],views:[],animations:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
await page.addInitScript(name=>{localStorage.setItem('IdentityLoop_Quality_v1','performance');const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__annieFrame=fn;return 0;}return raf(fn);};},loop);
try{
 await page.goto('http://127.0.0.1:4237/?qa=story&identity=LI',{timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
 await page.evaluate(async()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.identityRouteDirector.removeInteractionTarget();await q.prefetch({zoneId:'second_campus_5f'});q.load('second_campus_5f');q.controller.enabled=true;});
 await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneInstance.zoneGroup.getObjectByName('Second5F_StorageAnnie'));
 await page.addStyleTag({content:'#crosshair,#interaction-prompt{visibility:hidden!important}'});
 const frozen=await page.evaluate(()=>({identity:window.__storyQA.identityManager.snapshot(),hospital:window.__storyQA.hospitalSimulation.snapshot(),ids:window.__storyQA.worldRouter.activeZoneInstance.interactables.map(o=>o.userData.id)}));
 for(const view of [{name:'game-seated',position:[63,1.25,1.65],target:[61,.95,1]},{name:'game-face',position:[61.68,1.42,1.20],target:[61,1.39,1]}]){
  await page.evaluate(v=>{const q=window.__storyQA;q.controller.teleport(...v.position);q.lookAt(v.target);},view);
  const before=await frame();await page.screenshot({path:out+'/'+view.name+'-before.png'});
  if(!baseline){
   const load=await page.evaluate(async()=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,old=z.zoneGroup.getObjectByName('Second5F_StorageAnnie');window.__oldAnnie=old;window.__oldMeshFlags=[];old.traverse(o=>{if(o.isMesh){window.__oldMeshFlags.push([o,o.visible]);o.visible=false;}});const api=window.__annieAssetAPI,start=performance.now();const a=api.createAnnieAsset(z.zoneGroup,{state:old.userData.state,position:old.position.toArray(),rotationY:old.rotation.y});a.name='AnnieAsset_QA';window.__newAnnie=a;await a.userData.ready;return {readyMs:performance.now()-start,actor:api.inspectAnnieAsset(a),resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('annie-trainer.glb')).map(r=>({durationMs:r.duration,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize}))};});
   await frame();const after=await frame();await page.screenshot({path:out+'/'+view.name+'-after.png'});
   assert(after.actor.meshes<=10);assert(after.actor.triangles<=35000);assert(after.withinSceneBudget);assert(after.drawCalls<before.drawCalls);
   assert.deepEqual(after.lights,before.lights);
   report.views.push({name:view.name,before,after,load});
   await page.evaluate(()=>{window.__annieAssetAPI.disposeAnnieAsset(window.__newAnnie);for(const [o,v]of window.__oldMeshFlags)o.visible=v;});
  }else report.views.push({name:view.name,before});
 }
 const afterState=await page.evaluate(()=>({identity:window.__storyQA.identityManager.snapshot(),hospital:window.__storyQA.hospitalSimulation.snapshot(),ids:window.__storyQA.worldRouter.activeZoneInstance.interactables.map(o=>o.userData.id)}));
 assert.deepEqual(afterState,frozen);
 if(!baseline){
  report.lifecycle=await page.evaluate(async()=>{
   const api=window.__annieAssetAPI,parent=window.__storyQA.worldRouter.activeZoneInstance.zoneGroup;
   const a=api.createAnnieAsset(parent),b=api.createAnnieAsset(parent);await Promise.all([a.userData.ready,b.userData.ready]);
   const checks=[];const check=(name,ok)=>{if(!ok)throw Error(name);checks.push(name);};
   check('prefetched factory has synchronous rig',Boolean(a.userData.rig&&b.userData.rig));
   check('independent cloned skeletons',a.userData.rig.bones.head!==b.userData.rig.bones.head);
   const ma=a.getObjectByName('Annie_VinylAnatomy'),mb=b.getObjectByName('Annie_VinylAnatomy');
   check('shared cached geometry and textures',ma.geometry===mb.geometry&&ma.material.map===mb.material.map);
   check('independent instance materials',ma.material!==mb.material);
   const initial=JSON.stringify(Object.values(a.userData.rig.bones).map(o=>[o.position.toArray(),o.quaternion.toArray()]));
   for(let i=0;i<300;i++)api.updateAnnieAsset(a,.02);
   check('storage mannequin has no breathing or blink motion',initial===JSON.stringify(Object.values(a.userData.rig.bones).map(o=>[o.position.toArray(),o.quaternion.toArray()]))&&a.userData.rig.elapsed===0);
   let protectedCache=false;try{api.clearAnnieAssetCache();}catch{protectedCache=true;}check('active instance protects shared cache',protectedCache);
   const cuff=a.getObjectByName('Annie_Cuff_1');cuff.material=cuff.material.clone();cuff.material.color.setHex(0x4c6880);let clonedCuffDisposed=0;cuff.material.addEventListener('dispose',()=>clonedCuffDisposed++);
   api.disposeAnnieAsset(a);api.disposeAnnieAsset(a);check('owner cloned blue cuff is disposed exactly once',clonedCuffDisposed===1);
   check('disposing one actor preserves other actor',b.parent===parent&&b.children.length>0);
   api.disposeAnnieAsset(b);check('all disposed roots detach',!a.parent&&!b.parent);
   api.clearAnnieAssetCache();
   const pending=api.createAnnieAsset(parent);api.disposeAnnieAsset(pending);await pending.userData.ready;check('early disposal does not attach a late model',!pending.parent&&pending.children.length===0);
   const cart=api.createAnnieAsset(parent,{posture:'standing',stool:false});await cart.userData.ready;check('cart posture has no visible stool',!cart.getObjectByName('Annie_Stool').visible);api.disposeAnnieAsset(cart);
   const container=parent.clone(false),zoneActor=api.createAnnieAsset(container);await zoneActor.userData.ready;
   const counts=[];for(const resource of [...zoneActor.userData.assetResources.materials,...zoneActor.userData.assetResources.geometries]){const c={n:0};resource.addEventListener('dispose',()=>c.n++);counts.push(c);}
   window.__disposeZoneArt(container);api.disposeAnnieAsset(zoneActor);check('zone teardown owns each instance resource exactly once',counts.every(c=>c.n===1)&&container.children.length===0);
   api.clearAnnieAssetCache();check('cache teardown succeeds after final instance',true);
   return checks;
  });
  for(const [zoneId,state,key,camera,target]of [
    ['skybridge','BRIDGE_MANIFEST','bridgeDoppelganger',[44.8,1.45,.7],[46,1.35,0]],
    ['phantom_6f','FLOOR6_CPR','annie',[3.3,1.6,-5.8],[1.2,.96,-7.3]]]){
   const setup=await page.evaluate(async({zoneId,state,key,camera,target})=>{const q=window.__storyQA;await q.prefetch({zoneId});q.load(zoneId);const z=q.worldRouter.activeZoneInstance,old=z[key];old.visible=true;old.traverse(o=>{if(o.isMesh)o.visible=false;});const a=window.__annieAssetAPI.createAnnieAsset(z.zoneGroup,{state,position:old.position.toArray(),rotationY:old.rotation.y});window.__poseAnnie=a;await a.userData.ready;q.controller.teleport(...camera);q.lookAt(target);return window.__annieAssetAPI.inspectAnnieAsset(a);},{zoneId,state,key,camera,target});
   const images=[];
   for(const [phase,seconds]of [['rest',0],['motion',state==='FLOOR6_CPR'?.136:3]]){
    const motion=await page.evaluate(({seconds})=>{const api=window.__annieAssetAPI,a=window.__poseAnnie;for(let t=0;t<seconds;t+=.01)api.updateAnnieAsset(a,Math.min(.01,seconds-t));const q=window.__storyQA;q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());return {compression:a.userData.rig.compression,head:a.userData.rig.head.rotation.toArray(),upperY:a.userData.rig.bones.Root.position.y};},{seconds});
    const name=state.toLowerCase()+'-'+phase+'.png';await page.screenshot({path:out+'/'+name});images.push({name,...motion});
   }
   if(state==='FLOOR6_CPR')assert(images[1].compression>.98);
   assert.notEqual(createHash('sha256').update(await readFile(out+'/'+images[0].name)).digest('hex'),createHash('sha256').update(await readFile(out+'/'+images[1].name)).digest('hex'));
   report.animations.push({state,setup,images});await page.evaluate(()=>window.__annieAssetAPI.disposeAnnieAsset(window.__poseAnnie));
  }
  const mobile=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
  mobile.on('pageerror',e=>report.errors.push(e.message));
  await mobile.addInitScript(name=>{localStorage.setItem('IdentityLoop_Quality_v1','performance');const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>fn.name===name?0:raf(fn);},loop);
  await mobile.goto('http://127.0.0.1:4237/?qa=story&identity=LI',{timeout:120000});await mobile.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
  await mobile.addStyleTag({content:'#crosshair,#interaction-prompt{visibility:hidden!important}'});
  await mobile.evaluate(async()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.identityRouteDirector.removeInteractionTarget();await q.prefetch({zoneId:'second_campus_5f'});q.load('second_campus_5f');});
  const cdp=await mobile.context().newCDPSession(mobile);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:625000,uploadThroughput:125000});
  const stats=await mobile.evaluate(async()=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,old=z.zoneGroup.getObjectByName('Second5F_StorageAnnie');old.traverse(o=>{if(o.isMesh)o.visible=false;});const start=performance.now(),a=window.__annieAssetAPI.createAnnieAsset(z.zoneGroup,{state:'STORAGE_STATIC',position:old.position.toArray(),rotationY:old.rotation.y});await a.userData.ready;const readyMs=performance.now()-start;q.controller.teleport(63,1.25,1.65);q.lookAt([61,.95,1]);await new Promise(requestAnimationFrame);q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());const {p95FrameMs,sampledFrames,...s}=q.qualitySettings.snapshot();return {...s,cssViewport:[innerWidth,innerHeight],actor:window.__annieAssetAPI.inspectAnnieAsset(a),load:{readyMs,firstRenderedMs:performance.now()-start,network:'Browser emulation 5 Mbit/s downstream, 100 ms latency, no CPU throttle; not handset timing',resources:performance.getEntriesByType('resource').filter(r=>r.name.includes('annie-trainer.glb')).map(r=>({durationMs:r.duration,transferSize:r.transferSize,encodedBodySize:r.encodedBodySize}))}};});
  assert(stats.withinSceneBudget);assert.equal(stats.pixelRatio,1);assert.equal(stats.cssViewport[0],390);await mobile.screenshot({path:out+'/mobile-seated.png'});report.mobile=stats;await mobile.close();
 }
 report.verdict='PASS';assert.deepEqual(report.errors,[]);
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));console.log('ANNIE_ASSET_QA',report.verdict,out);}
async function frame(){return page.evaluate(async()=>{await new Promise(requestAnimationFrame);const q=window.__storyQA;q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());const {p95FrameMs,sampledFrames,...stats}=q.qualitySettings.snapshot();const a=window.__newAnnie?.parent?window.__newAnnie:q.worldRouter.activeZoneInstance.zoneGroup.getObjectByName('Second5F_StorageAnnie');let meshes=0,triangles=0;const lights=[];q.worldRouter.scene.traverseVisible(o=>{if(o.isLight)lights.push({name:o.name,type:o.type,intensity:o.intensity,color:o.color.getHex(),matrix:o.matrixWorld.toArray()});});a.traverseVisible(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});return {...stats,actor:{meshes,triangles},state:a.userData.state,lights};});}
