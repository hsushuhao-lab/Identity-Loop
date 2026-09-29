import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {IdentityManager,IDENTITY_PROFILES} from './src/core/IdentityManager.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
const results=[];
async function test(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});}catch(e){results.push({name,status:'FAIL',error:e.message});}console.log(results.at(-1));}
const ids=Object.keys(IDENTITY_PROFILES),store=()=>({value:null,getItem(){return this.value;},setItem(_,v){this.value=v;}});
function final(id,s=store()){const m=IdentityManager.createForTest(id,s);while(m.currentRouteStep!=='M9')m.completeRouteStep(m.currentRouteStep);return m;}
await test('64 independent name and employee selections: only four correct pairs succeed',()=>{
 let good=0,bad=0;
 for(const actual of ids)for(const named of ids)for(const staff of ids){
  const s=store(),m=final(actual,s),employee=IDENTITY_PROFILES[staff].employeeId;
  const r=m.commitM9(named,employee),correct=actual===named&&actual===staff;
  assert.equal(r.type,correct?'GOOD_END':'WRONG_MEMORY_BAD_END',`${actual}: name=${named}, ID=${staff}`);
  assert.equal(m.runSave.m9CommittedEmployeeId,employee);assert.equal(m.runSave.runEnded,true);
  assert.equal(new IdentityManager(s).m9SelectionCorrect,correct);
  assert.equal(m.metaSave.completedGoodEnds.includes(actual),correct);
  assert.equal(m.commitM9(actual,IDENTITY_PROFILES[actual].employeeId).reason,'ALREADY_COMMITTED');
  correct?good++:bad++;
 }return {good,bad};
});
await test('Unselected fields cannot commit; old completed saves retain their outcome',()=>{
 const m=final('ZHANG');assert.equal(m.commitM9('ZHANG',null).ok,false);assert.equal(m.runSave.runEnded,false);
 for(const named of ids){const s=store(),m=final('LI',s);m.commitM9(named);const state=JSON.parse(s.value);delete state.runSave.m9CommittedEmployeeId;s.value=JSON.stringify(state);const restored=new IdentityManager(s);assert.equal(restored.m9SelectionCorrect,named==='LI');assert.equal(restored.commitM9('LI').reason,'ALREADY_COMMITTED');}
});
await test('Zhang explains why the witness matters before returning to 408C',()=>{
 const b=getIdentityRouteScene('ZHANG_2F_PRESENCE_CHECK','ZHANG')[1];
 assert.match(b.zhangCareReview.note,/408C/);assert.match(b.zhangCareReview.note,/親耳|直接聽/);assert.match(b.zhangCareReview.note,/時間|什麼時候/);assert.match(b.zhangCareReview.note,/不是.*評估/);
});
// Real Three.js scene objects, not source-string checks. Canvas text is stubbed.
const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
const {preloadAssetNames}=await import('./src/art/AssetRegistry.js');
const THREE=await import('three');
const {WorldRouter}=await import('./src/world/WorldRouter.js');
const {FPSController}=await import('./src/player/FPSController.js');
const {gameState}=await import('./src/core/GameState.js');
const context=new Proxy({measureText:s=>({width:s.length*18})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
globalThis.document={querySelector:()=>null,addEventListener(){},createElement:()=>({width:0,height:0,dataset:{},getContext:()=>context})};
globalThis.window={location:{search:'?qa=story'},localStorage:store()};
const load=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){const b=readFileSync(new URL('./public'+url,import.meta.url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
try{await preloadAssetNames(['workDesk','officeChair','storageCabinet','hospitalBed','bench','printer','plant']);}finally{GLTFLoader.prototype.loadAsync=load;}
// Node has no browser image loader. Defer only optional exterior vegetation;
// the clinical GLB objects, scene construction and collision/raycast code are real.
const {assetLoadQueue}=await import('./src/art/AssetLoadQueue.js');
const enqueue=assetLoadQueue.enqueue.bind(assetLoadQueue);
assetLoadQueue.enqueue=(load,options)=>options?.optional?new Promise(()=>{}):enqueue(load,options);
const camera=new THREE.PerspectiveCamera(68,1,.1,220),c=new FPSController(camera,{addEventListener(){}},[],[],[]),r=new WorldRouter(new THREE.Scene(),camera,c);
await test('Identity ER desk has one registered physical target and no legacy proximity task',()=>{
 const z=r.loadZone('first_campus_2f');
 const atDesk=z.interactables.filter(o=>{const p=o.isObject3D?o.getWorldPosition(new THREE.Vector3()):o.position;return p&&Math.hypot(p.x-13,p.z+8.4)<1.4;});
 assert.equal(atDesk.length,1,'doctor, ghost registration and legacy note must not overlap');
 assert.equal(atDesk[0],z.identityErDoctorCharting);assert.equal(atDesk[0].userData.interactable,false);
 gameState.setFlag('GHOST_REGISTRATION_AVAILABLE',true);z.syncStoryState();assert.equal(atDesk[0].userData.interactable,false,'legacy flags cannot re-enable a completed route interaction');
 return {targets:atDesk.map(o=>o.userData?.id)};
});
await test('Four route workflows use the same desk and retire it after their current beat',async()=>{
 const cases=[['ZHANG','ZHANG_2F_PRESENCE_CHECK',1],['LI','LI_ER_2005',1],['LI','LI_ER_0033',0],['ZHOU','M3',1],['ZHOU','ZHOU_2F_WARNING_READBACK',1],['CHEN','CHEN_2F_HANDOFF_RECEIPT',0],['CHEN','CHEN_2F_HANDOFF_RECEIPT',1]];
 for(const [id,step,index]of cases){
  const z=r.loadZone('first_campus_2f'),manager=IdentityManager.createForTest(id);
  const d=new IdentityRouteDirector({manager,worldRouter:r,controller:c,gameState,panel:{},uiManager:{}});
  Object.assign(d,{step,beats:getIdentityRouteScene(step,id),beatIndex:index,renderObjective(){}});
  await d.placeBeat();assert.equal(d.boundTarget?.object,z.identityErDoctorCharting,`${id} ${step}/${index}`);
  assert.equal(z.identityErDoctorCharting.userData.interactable,true);assert(d.matchesBinding(z.identityErDoctorCharting.userData));
  d.removeInteractionTarget();z.syncStoryState();assert.equal(z.identityErDoctorCharting.userData.interactable,false);
 }
 return {workflows:cases.length};
});
await test('Linear mode retains its existing note and registration interactions',()=>{
 window.location.search='?mode=linear';const z=r.loadZone('first_campus_2f');assert(z.interactables.includes(z.erNoteInteraction));assert(z.interactables.includes(z.ghostRegistrationTerminal));window.location.search='?qa=story';
});
const output=process.env.ER_FINAL_EVIDENCE;
if(output){mkdirSync(output,{recursive:true});writeFileSync(output+'/functional.json',JSON.stringify({method:'actual manager/scene/route modules; canvas labels stubbed',results},null,2));}
assert.equal(results.filter(r=>r.status==='FAIL').length,0,'ER/final-choice regression failures');
