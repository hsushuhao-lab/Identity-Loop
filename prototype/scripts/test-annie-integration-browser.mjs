import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'qa-results/annie-integration';await mkdir(out,{recursive:true});
const server=await preview({preview:{host:'127.0.0.1',port:4239,strictPort:true}}),base='http://127.0.0.1:4239/';
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(n=>/^index-.*\.js$/.test(n)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'Actual integrated production scene factories, fixed arrival/camera fixtures, real keyboard/touch document interaction, failure/retry and zone cleanup. SwiftShader/browser emulation; no physical-phone FPS claim.',checks:[],views:[],errors:[],expectedFailures:[]};
async function start(mobile=false,fail=false){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1100,height:850},isMobile:mobile,hasTouch:mobile});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
 if(fail)await page.route('**/annie-trainer.glb',r=>{report.expectedFailures.push(r.request().url());return r.abort('failed');});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>fn.name===name?0:raf(fn);},loop);
 await page.goto(base+'?qa=story&identity=LI',{timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
 await page.evaluate(()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.controller.enabled=true;q.identityRouteDirector.removeInteractionTarget();});
 return page;
}
async function load(page,zone){await page.evaluate(async zone=>{const q=window.__storyQA;await q.prefetch({zoneId:zone});q.load(zone);q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.controller.enabled=true;},zone);}
async function documentInteraction(page,mobile){
 const aim=await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(63,1.25,1.65);q.controller.enabled=true;return q.lookAt([61,1.05,1]);});
 assert.equal(aim.current,'SECOND_5F_STORAGE_ANNIE');
 if(mobile){await page.evaluate(()=>window.__storyQA.touchControls.refresh());await page.locator('#touch-interact').tap();}else await page.keyboard.press('KeyE');
 await page.waitForFunction(()=>document.body.innerText.includes('一具教學人偶坐在固定椅凳上'));
 report.checks.push(mobile?'mobile physical mannequin document':'desktop physical mannequin document');
 await page.evaluate(()=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.controller.enabled=true;});
}
try{
 const page=await start();
 for(const fixture of [
  {zone:'first_campus_3f',names:['Annie_2117_GuardCheckpoint_Seated'],view:'patrol',position:[20.25,1.4,1.25],target:[20.25,1.0,-1.35]},
  {zone:'first_campus_3f',names:[],cart:true,view:'cart',position:[13.6,1.75,3.1],target:[13.5,1.0,5.15]},
  {zone:'second_campus_5f',names:['Second5F_StorageAnnie'],view:'seated',position:[63,1.25,1.65],target:[61,.95,1]},
  {zone:'skybridge',names:[],bridge:true,view:'bridge',position:[43,1.4,1.3],target:[46,1.0,0]},
  {zone:'phantom_6f',names:[],cpr:true,view:'cpr',position:[-1.3,1.7,-4.6],target:[1.1,1.0,-7.3]}
 ]){
  if(process.argv.includes('--cpr-only')&&!fixture.cpr)continue;
  await load(page,fixture.zone);
  const result=await page.evaluate(f=>{
   const q=window.__storyQA,z=q.worldRouter.activeZoneInstance;
   const a=f.cart?z.levelInstance.anneGroup:f.bridge?z.bridgeDoppelganger:f.cpr?z.annie:z.zoneGroup.getObjectByName(f.names[0]);
   if(!a?.userData.assetResources)throw Error('Detailed asset missing at '+f.view);
   window.__integrationActor=a;window.__integrationIdentity=q.identityManager.snapshot();
   const rig=a.userData.rig,head=rig.head,initial=head.quaternion.clone(),upper=rig.upperBody.position.clone();
   for(let i=0;i<100;i++)a.userData.updateCharacter(.01);
   if(a.userData.state==='STORAGE_STATIC'&&(!initial.equals(head.quaternion)||!upper.equals(rig.upperBody.position)))throw Error('Static trainer moved');
   let meshCount=0,triangles=0;const resources=a.userData.assetResources,owned=[...resources.materials,...resources.skeletons,...resources.geometries];
   a.traverse(o=>{if(o.isMesh){meshCount++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;if(o.material?.userData.annieAssetOwned&&!owned.includes(o.material))owned.push(o.material);}});
   const released=owned.map(resource=>{const item={count:0},dispose=resource.dispose.bind(resource);resource.dispose=()=>{item.count++;dispose();};return item;});window.__integrationReleased=released;
   const practical=a.getObjectByName('Annie_Local_CoolWhite_Practical'),original=practical.shadow.dispose.bind(practical.shadow);window.__integrationShadowCount=0;practical.shadow.dispose=()=>{window.__integrationShadowCount++;original();};
   const beforeVisible=a.visible;if(f.bridge||f.view==='patrol')a.visible=true; // controlled art view after recording the real encounter gate
   q.controller.teleport(...f.position);q.lookAt(f.target);q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());
   const world=o=>o.getWorldPosition(q.controller.position.clone()).toArray();
   return {state:a.userData.state,meshCount,triangles,bones:Object.keys(rig.bones).length,headParentIsBone:head.parent.isBone,beforeVisible,position:a.position.toArray(),rotation:a.rotation.toArray(),hands:['Annie_HandStack_Bottom','Annie_HandStack_Top'].map(n=>world(a.getObjectByName(n))),feet:['foot_l','foot_r'].map(n=>world(rig.bones[n])),patient:f.cpr?world(z.patientTarget):null,budget:q.qualitySettings.snapshot(),practical:{intensity:practical.intensity,color:practical.color.getHex(),shadow:practical.castShadow},cuffColors:[-1,1].map(side=>a.getObjectByName('Annie_Cuff_'+side).material.color.getHex())};
  },fixture);
  assert.equal(result.bones,53);assert.equal(result.headParentIsBone,true);assert(result.meshCount<=9);assert(result.triangles<=35000);assert.equal(result.budget.withinSceneBudget,true);assert.equal(result.practical.intensity,3.6);assert.equal(result.practical.shadow,true);
  if(fixture.cpr)await writeFile(out+'/cpr-contact.json',JSON.stringify(result,null,2));
  if(fixture.bridge)assert.equal(result.beforeVisible,false,'original route visibility gate');
  if(fixture.cpr){assert(result.feet.every(p=>p[1]>.04&&p[1]<.10),'feet stay planted');assert(result.hands.every(p=>p[1]>.94&&p[1]<1.00),'wrists meet the existing chest surface');assert(Math.abs(result.hands[0][2]-result.hands[1][2])<.075,'palms overlap around the chest');}
  if(fixture.view==='seated'){assert.deepEqual(result.cuffColors,[0x4c6880,0x4c6880]);await documentInteraction(page,false);await page.evaluate(f=>{const q=window.__storyQA;q.controller.teleport(...f.position);q.lookAt(f.target);q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());},fixture);}
  await page.screenshot({path:out+'/'+fixture.view+'.png'});report.views.push({...fixture,result,screenshot:fixture.view+'.png'});
  if(fixture.view==='seated'){await page.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(61.68,1.42,1.20);q.lookAt([61,1.39,1]);q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());});await page.screenshot({path:out+'/face.png'});}
  await page.evaluate(()=>window.__storyQA.load('first_campus_1f'));
  const cleanup=await page.evaluate(()=>({disposed:window.__integrationActor.userData.assetResources.disposed,children:window.__integrationActor.children.length,counts:window.__integrationReleased.map(x=>x.count),shadowCount:window.__integrationShadowCount,identityUnchanged:JSON.stringify(window.__integrationIdentity)===JSON.stringify(window.__storyQA.identityManager.snapshot())}));
  assert.equal(cleanup.disposed,true);assert.equal(cleanup.children,0);assert(cleanup.counts.every(n=>n===1));assert.equal(cleanup.shadowCount,1);assert.equal(cleanup.identityUnchanged,true);report.checks.push(fixture.view+' actual factory/anchors/cleanup/story isolation');
 }
 await page.close();
 const mobile=await start(true);await load(mobile,'second_campus_5f');await documentInteraction(mobile,true);await mobile.evaluate(()=>{const q=window.__storyQA;q.controller.teleport(63,1.25,1.65);q.lookAt([61,.95,1]);q.qualitySettings.lastRender=0;q.qualitySettings.render(performance.now());});await mobile.screenshot({path:out+'/mobile-seated.png'});await mobile.close();
 const failure=await start(true,true);await load(failure,'second_campus_5f');assert.equal(await failure.evaluate(()=>!!window.__storyQA.worldRouter.activeZoneInstance.zoneGroup.getObjectByName('Second5F_StorageAnnie').userData.characterResources),true);await documentInteraction(failure,true);report.checks.push('failed GLB uses playable procedural fallback');
 await failure.unroute('**/annie-trainer.glb');await load(failure,'second_campus_5f');assert.equal(await failure.evaluate(()=>!!window.__storyQA.worldRouter.activeZoneInstance.zoneGroup.getObjectByName('Second5F_StorageAnnie').userData.assetResources),true);report.checks.push('GLB retry recovers detailed model without scene/state rewrite');await failure.close();
 assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await server.close();}
console.log('ANNIE_INTEGRATION',report.verdict,report.checks.length,report.views.length);
