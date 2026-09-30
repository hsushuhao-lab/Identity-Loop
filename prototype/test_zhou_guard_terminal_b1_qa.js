import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import * as THREE from 'three';
import {IdentityManager,IDENTITY_STORAGE_KEY} from './src/core/IdentityManager.js';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
import {IDENTITY_ROUTES} from './src/story/IdentityRoutes.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';
import {soundManager} from './src/audio/SoundManager.js';
import {GeometryFactory} from './src/world/shared/GeometryFactory.js';
import {B2Archive} from './src/world/zones/B2Archive.js';
import {B1DispatchHub} from './src/world/zones/B1DispatchHub.js';
import {FPSController} from './src/player/FPSController.js';
import {gameState} from './src/core/GameState.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preloadAssetNames} from './src/art/AssetRegistry.js';
const noop=()=>{},texts=[];
const ctx=new Proxy({fillText:t=>texts.push(String(t)),measureText:s=>({width:String(s).length*18})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
globalThis.document={addEventListener:noop,exitPointerLock:noop,querySelector:()=>null,createElement:()=>({style:{},dataset:{},getContext:()=>ctx})};
soundManager.ensureRunning=async()=>false;
const load=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){const b=readFileSync(new URL('./public'+url,import.meta.url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
try{await preloadAssetNames(['workDesk','officeChair','storageCabinet','hospitalBed','bench','printer','plant']);}finally{GLTFLoader.prototype.loadAsync=load;}
const checks=[],tick=()=>new Promise(r=>setTimeout(r,0));
async function test(name,fn){try{const detail=await fn();checks.push({name,status:'PASS',detail});console.log('PASS',name);}catch(e){checks.push({name,status:'FAIL',error:e.message});console.log('FAIL',name,e.message);}}
const store=value=>({value,getItem(){return this.value;},setItem(_,value){this.value=value;}});
function fixture(identity='ZHOU',step='M3'){
 const storage=store(null),manager=IdentityManager.createForTest(identity,storage),flags={};
 manager.runSave.currentRouteStep=manager.route.indexOf(step);manager.runSave.completedStoryModules=manager.route.slice(0,manager.runSave.currentRouteStep);manager.save();
 const state={getFlag:k=>flags[k]??false,setFlag:(k,v)=>{flags[k]=v;},isTaskComplete:()=>true,setGameTime:noop};
 const ui={renderTaskBoard(_,items){this.objective=items[0]?.text;},showDialogue(lines,done){this.dialogue={lines,done};},showSubtitle:noop};
 const router={activeZoneId:'first_campus_2f',activeZoneInstance:{interactables:[]}};
 const d=new IdentityRouteDirector({manager,gameState:state,worldRouter:router,controller:{enabled:true,interactables:[]},panel:{render:noop},uiManager:ui,prepareZone:async()=>{}});
 d.step=step;d.beats=getIdentityRouteScene(step,identity);d.beatIndex=0;
 return {d,ui,manager,flags,router,storage};
}
await test('Zhou leaves 4F before guard chat, photo, phone and ER, without adding steps',()=>{
 const r=IDENTITY_ROUTES.ZHOU;assert.equal(r.length,16);assert.deepEqual(r.slice(3,8),['M1','M2','ZHOU_1F_PHOTO','ZHOU_SECURITY_TALK','M3']);
 const cart=getIdentityRouteScene('M2','ZHOU').at(-1);assert.match(JSON.stringify(cart.lines),/我去找警衛聊天好了/);
 const d=fixture().d;assert.equal(d.bindingFor('ZHOU_1F_PHOTO',0).id,'OLD_GUARD_POST');assert.equal(d.bindingFor('ZHOU_1F_PHOTO',1).id,'IDENTITY_GUARD_REFLECTION_PHOTO');
 assert.match(JSON.stringify(getIdentityRouteScene('ZHOU_1F_PHOTO','ZHOU')[0].lines),/照片/);
 assert.equal(d.bindingFor('ZHOU_SECURITY_TALK',1).id,'IDENTITY_GUARD_PHONE');
});
await test('Zhou bedside handoff delivers receipt before directing to the real 316 terminal',async()=>{
 const {d,ui,flags,router}=fixture();
 try{
  assert.equal(d.bindingFor('M3',1).auto,true,'receipt cannot depend on a second unannounced ER hotspot');
  d.inspect();ui.dialogue.done();await tick();assert.equal(d.beatIndex,1);
  await new Promise(r=>setTimeout(r,240));assert.ok(ui.dialogue.lines.some(l=>l.text.includes('1998-ER-0217')));
  const end=ui.dialogue.done;ui.dialogue=null;end();await tick();assert.equal(flags.ER0033_SLIP_COLLECTED,true);
  assert.equal(d.beatIndex,2);assert.equal(d.awaitingZone,'first_campus_3f');assert.match(ui.objective,/316.*終端/);
  const terminal={userData:{id:'316_LEGACY_TERMINAL',type:'legacy_terminal_316',interactable:true,label:'舊終端'}};
  router.activeZoneId='first_campus_3f';router.activeZoneInstance.interactables=[terminal];await d.onArriveTargetZone();
  assert.equal(d.boundTarget.object,terminal);assert.equal(d.bindingFor().id,'316_LEGACY_TERMINAL');assert.equal(d.handleInteract(terminal),false);assert.equal(d.allowWorldInteraction(terminal),true);assert.equal(d.bindingCompletionReady(),false);
 }finally{d.removeInteractionTarget();}
});
await test('Zhou receipt survives chapter recovery only when actually recorded in this run',async()=>{
 for(const proof of [false,true]){
  const {d,manager,flags}=fixture();if(proof)manager.recordEvidence({id:'route:M3:1',category:'route',milestone:'M3',visibleText:'已取得原始掛號聯'});
  await d.loadCurrentStep({forceLoad:false});
  assert.equal(d.beatIndex,proof?2:0);assert.equal(flags.ER0033_SLIP_COLLECTED===true,proof);assert.equal(flags.M3_316_DECODED===true,false);d.removeInteractionTarget();
 }
});
await test('All 16 old Zhou checkpoints retain identity, evidence and current chapter by name',()=>{
 const old=['ZHOU_OPEN_8F','M4','M5','M1','ZHOU_1F_PHOTO','ZHOU_SECURITY_TALK','M3','M2','ZHOU_1F_WARNING_CALL','ZHOU_2F_WARNING_READBACK','ZHOU_2117_RETURN','M6','M7','B2','M8','M9'];
 for(const [i,step] of old.entries()){
  const original={currentIdentity:'ZHOU',zhouRouteRevision:1,runSeed:941,currentRouteStep:i,completedStoryModules:old.slice(0,i),evidence:{original:{id:'original',visibleText:'保留'}}};
  const storage=store(JSON.stringify({version:2,metaSave:{completedGoodEnds:['LI']},runSave:original})),m=new IdentityManager(storage);
  assert.equal(m.currentRouteStep,step);assert.equal(m.runSave.zhouRouteRevision,2);assert.equal(m.runSave.runSeed,941);assert.deepEqual(m.runSave.evidence,original.evidence);assert.deepEqual(m.runSave.completedStoryModules,original.completedStoryModules);
  assert.equal(new IdentityManager(storage).currentRouteStep,step);
  if(step==='M2'){m.completeRouteStep('M2');assert.equal(m.currentRouteStep,'ZHOU_1F_WARNING_CALL','old already-played guard/ER must not replay');}
 }
});
await test('B2 sign and E prompt share neutral exit wording; no destination hard-coded on door',()=>{
 const before=texts.length,z=new B2Archive(new THREE.Scene(),new GeometryFactory()).build();
 const text=texts.slice(before).join('\n');assert.match(text,/經由逃生門離開/);assert.doesNotMatch(text,/返回 3F/);
 assert.equal(z.interactables.find(o=>o.userData.id==='B2_ONE_WAY_EXIT').userData.label,'經由逃生門離開');z.cleanup();
});
await test('B1 has a detailed rescue vehicle, supported evidence, real locker and unobstructed walking path',()=>{
 gameState.setFlag('CHEN_DISPATCH_LOCKER_OPENED',false);gameState.setFlag('CHEN_DISPATCH_LOG_VERIFIED',false);
 const scene=new THREE.Scene(),z=new B1DispatchHub(scene,new GeometryFactory()).build();z.zoneGroup.updateMatrixWorld(true);
 for(const name of ['B1_Ambulance_Windshield','B1_Ambulance_Grille','B1_Ambulance_DrapedCover','B1_DispatchWorkstation','B1_DispatchBoard_Frame','B1_LockerShelf','B1_ServiceLift_Frame','B1_CeilingPipes','B1_ParkingMarkings'])assert.ok(z.zoneGroup.getObjectByName(name),name);
 const plaque=z.zoneGroup.getObjectByName('B1_WorkstationWallPlaque');assert.ok(plaque);assert.ok(Math.abs(plaque.position.x+8.85)<.04,'workstation sign must stay flush with the west wall');
 assert.equal(z.driverLog.visible,false);assert.equal(z.driverLog.userData.interactable,false);
 gameState.setFlag('CHEN_DISPATCH_LOCKER_OPENED',true);z.syncStoryState();z.zoneGroup.updateMatrixWorld(true);
 const shelf=new THREE.Box3().setFromObject(z.zoneGroup.getObjectByName('B1_LockerShelf')),log=new THREE.Box3().setFromObject(z.driverLog);
 assert.ok(Math.abs(shelf.max.y-log.min.y)<.005,'ledger must sit on real shelf');assert.ok(log.min.x>=shelf.min.x&&log.max.x<=shelf.max.x&&log.min.z>=shelf.min.z&&log.max.z<=shelf.max.z);
 assert.equal(z.driverLog.userData.interactable,true);assert.ok(Math.abs(z.lockerDoor.rotation.y)>1);
 const c=new FPSController(new THREE.PerspectiveCamera(68,1,.1,220),{addEventListener:noop},z.colliders,z.interactables,z.walkables);
 c.teleport(0,1.7,1.2);
 for(const [x,zz] of [[-4,1],[-5,-3.5],[-3,-3.5],[-3,-12.5],[0,-12.5],[0,-6],[6.8,-6],[7.4,-4.2]]){
  c.moveWithCollision(x-c.position.x,zz-c.position.z);assert.ok(Math.hypot(c.position.x-x,c.position.z-zz)<.05,'blocked route '+[x,zz]);
 }
 assert.ok(c.checkCollision(3.8,-10.8),'vehicle needs collision');assert.ok(c.checkCollision(-4.8,-13.9),'locker needs collision');
 const pose={position:c.position.toArray(),meshes:0};z.zoneGroup.traverse(o=>{if(o.isMesh)pose.meshes++;});
 gameState.setFlag('CHEN_DISPATCH_LOG_VERIFIED',true);z.syncStoryState();assert.equal(z.serviceLiftHit.userData.interactable,true);
 z.cleanup();assert.equal(scene.children.length,0);return pose;
});
const out=process.argv[2]||'qa-results/zhou-b1';mkdirSync(out,{recursive:true});writeFileSync(out+'/functional.json',JSON.stringify({checks,verdict:checks.every(x=>x.status==='PASS')?'PASS':'FAIL'},null,2));
if(checks.some(c=>c.status==='FAIL'))process.exitCode=1;
