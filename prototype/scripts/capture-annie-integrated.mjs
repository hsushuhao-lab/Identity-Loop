import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const out=process.argv[2]||'../../qa-evidence/character-refinement/annie-integrated';await mkdir(out,{recursive:true});
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4233,strictPort:true}});
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8'),loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)[1];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={bundleSHA256:createHash('sha256').update(js).digest('hex'),method:'Actual production factories in all encounter scenes; original practical lighting; pose/visibility and observer-camera QA fixtures, no encounter progression claim or handset FPS measurement.',errors:[],views:[],teardown:[]};
try{for(const mobile of [false,true]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1100,height:850},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});const page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 await page.addInitScript(name=>{localStorage.setItem('IdentityLoop_Quality_v1','performance');const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>fn.name===name?0:raf(fn);},loop);
 await page.goto('http://127.0.0.1:4233/?qa=story&identity=LI',{timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
 await page.evaluate(()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.identityRouteDirector.removeInteractionTarget();q.controller.enabled=false;q.gameState.setGameTime('17:00');});
 await page.addStyleTag({content:'#crosshair,#interaction-prompt{visibility:hidden!important}'});
 const specs=[
  {id:'seated',zone:'second_campus_5f',name:'Second5F_StorageAnnie',position:[63,1.25,1.65],target:[61,.95,1]},
  {id:'face',zone:'second_campus_5f',name:'Second5F_StorageAnnie',position:[61.68,1.42,1.20],target:[61,1.39,1]},
  {id:'face-detail',zone:'second_campus_5f',name:'Second5F_StorageAnnie',position:[61.62,1.33,1.08],target:[61,1.27,1]},
  {id:'teaching-cart',zone:'first_campus_3f',name:'Annie_STORAGE_STATIC',position:[13.5,1.7,3.2],target:[13.4,1.075,5.15]},
  {id:'two-mannequins',zone:'first_campus_3f',name:'Annie_2117_GuardCheckpoint_Seated',position:[19,1.7,0],target:[15.5,1,5.1]},
  {id:'bridge',zone:'skybridge',name:'Annie_BRIDGE_MANIFEST',position:[44.8,1.45,.7],target:[46,1.35,0],seconds:3},
  {id:'cpr',zone:'phantom_6f',name:'Annie_FLOOR6_CPR',position:[3.3,1.6,-5.8],target:[1.2,.96,-7.3],seconds:.136}
 ];
 for(const spec of specs){if(mobile&&!['seated','two-mannequins','cpr'].includes(spec.id))continue;
  const setup=await page.evaluate(async spec=>{const q=window.__storyQA;if(q.worldRouter.activeZoneId!==spec.zone){await q.prefetch({zoneId:spec.zone});q.load(spec.zone);}q.controller.enabled=false;const z=q.worldRouter.activeZoneInstance,a=z.zoneGroup.getObjectByName(spec.name);if(!a)throw Error('Missing production actor '+spec.name);a.visible=true;q.controller.teleport(...spec.position);q.lookAt(spec.target);window.__integratedAnnie=a;
   const actors=[];z.zoneGroup.traverse(o=>{if(o.userData.assetVersion==='ANNIE_CHARACTER_V1')actors.push(o);});let meshes=0,triangles=0;for(const actor of actors)actor.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
   if(!actors.length||meshes>actors.length*24||triangles>actors.length*28000)throw Error('Actor scene budget');const light=a.getObjectByName('Annie_Local_CoolWhite_Practical');if(!light||light.intensity!==3.6)throw Error('Practical lighting changed');
   return {actors:actors.length,meshes,triangles,identity:JSON.stringify(q.identityManager.snapshot()),compression:a.userData.rig.compression,practical:{intensity:light.intensity,color:light.color.getHex()}};
  },spec);
  const phases=spec.seconds?[['rest',0],['motion',spec.seconds]]:[['rest',0]];const hashes=[];
  for(const [phase,seconds] of phases){const details=await page.evaluate(async ({seconds,id})=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,a=window.__integratedAnnie;for(let t=0;t<seconds;t+=.01){const dt=Math.min(.01,seconds-t);if(id==='cpr')z.update(q.controller.camera,dt);else a.userData.updateCharacter(dt);}await new Promise(requestAnimationFrame);q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());const stats=q.qualitySettings.snapshot();return {stats,compression:a.userData.rig.compression,head:a.userData.rig.head.rotation.toArray(),identity:JSON.stringify(q.identityManager.snapshot())};},{seconds,id:spec.id});assert.equal(details.identity,setup.identity);assert(details.stats.withinSceneBudget);if(spec.id==='cpr'&&phase==='motion')assert(details.compression>.98);const file=(mobile?'mobile-':'desktop-')+spec.id+'-'+phase+'.png';await page.screenshot({path:out+'/'+file});hashes.push(createHash('sha256').update(await readFile(out+'/'+file)).digest('hex'));report.views.push({file,spec,setup,...details});}
  if(hashes.length===2)assert.notEqual(...hashes,'Encounter must animate');
 }
 report.teardown.push(await page.evaluate(()=>{const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,actors=[];z.zoneGroup.traverse(o=>{if(o.userData.assetVersion==='ANNIE_CHARACTER_V1')actors.push(o);});let expected=0,released=0;for(const a of actors)for(const kind of ['geometries','materials','textures'])for(const resource of a.userData.characterResources[kind]){expected++;resource.addEventListener('dispose',()=>released++);}q.load('first_campus_4f');if(expected!==released)throw Error('Annie owned resources leaked '+released+'/'+expected);if(actors.some(a=>!a.userData.characterResources.disposed))throw Error('Annie disposal flag absent');return {actors:actors.length,expected,released};}));
 await context.close();
}assert.deepEqual(report.errors,[]);report.verdict='PASS';}catch(e){report.verdict='FAIL';report.failure=e.stack;process.exitCode=1;}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));console.log('ANNIE_INTEGRATED',report.verdict,report.failure||'');}
