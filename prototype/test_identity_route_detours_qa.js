import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import * as THREE from 'three';
import {IdentityManager} from './src/core/IdentityManager.js';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
import {getIdentityRouteScene,shouldShowAnnie} from './src/story/IdentityRouteScenes.js';
import {IDENTITY_ROUTES} from './src/story/IdentityRoutes.js';
import {WorldRouter} from './src/world/WorldRouter.js';
import {FPSController} from './src/player/FPSController.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preloadAssetNames} from './src/art/AssetRegistry.js';
import {gameState} from './src/core/GameState.js';
const noop=()=>{},ctx=new Proxy({measureText:s=>({width:s.length*18})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
global.document={querySelector:()=>null,addEventListener:noop,exitPointerLock:noop,createElement:()=>({width:0,height:0,dataset:{},getContext:()=>ctx})};
const originalLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){const b=readFileSync(new URL('./public'+url,import.meta.url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
try{await preloadAssetNames(['workDesk','officeChair','storageCabinet','hospitalBed','bench','printer','plant']);}finally{GLTFLoader.prototype.loadAsync=originalLoad;}
const camera=new THREE.PerspectiveCamera(68,1,.1,220),controller=new FPSController(camera,{addEventListener:noop},[],[],[]),router=new WorldRouter(new THREE.Scene(),camera,controller),results=[];
async function test(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message);}}
const cameoSeed=(id,step)=>Array.from({length:90},(_,i)=>i).find(seed=>shouldShowAnnie(id,step,seed));
function makeDirector(id,step,seed=0){
 const storage={value:null,getItem(){return this.value;},setItem(_,value){this.value=value;}};
 const manager=IdentityManager.createForTest(id,storage);manager.runSave.currentRouteStep=manager.route.indexOf(step);manager.runSave.completedStoryModules=manager.route.slice(0,manager.runSave.currentRouteStep);manager.runSave.runSeed=seed;manager.save();
 const ui={renderTaskBoard(_,items){this.objective=items[0]?.text;},showSubtitle:noop,showDialogue(lines,done){this.lastDialogue=lines;done();},openMemorySequence(sequence,onClose,onRead){this.opened={sequence,onClose,onRead};}};
 const d=new IdentityRouteDirector({manager,worldRouter:router,controller,gameState,uiManager:ui,panel:{render:noop},prepareZone:async()=>{}});
 d.step=step;d.beats=getIdentityRouteScene(step,id,seed);d.beatIndex=0;return d;
}
await test('Random Annie observations never create an additional route target or equipment chore',()=>{
 let checked=0;
 for(const id of Object.keys(IDENTITY_ROUTES))for(const step of IDENTITY_ROUTES[id]){
  const base=getIdentityRouteScene(step,id);
  for(let seed=0;seed<90;seed++){
   const beats=getIdentityRouteScene(step,id,seed);assert.equal(beats.length,base.length,`${id}/${step}/${seed}: cameo added a mandatory beat`);
   assert.equal(beats.some(b=>b.annieFlag===`ANNIE_ROUTE_EVENT_${id}`),shouldShowAnnie(id,step,seed));
   for(let i=0;i<beats.length;i++){assert.equal(beats[i].review,base[i].review,'cameo replaced objective');assert.equal(beats[i].flag,base[i].flag,'cameo replaced completion flag');}
   assert.doesNotMatch(JSON.stringify(beats),/確認設備與通道後繼續|我將設備歸零/);checked++;
  }
 }
 return {seededScenes:checked};
});
await test('Li seeded patrol completion goes directly to 4F duty room, including restored checkpoint',async()=>{
 router.loadZone('first_campus_3f');const d=makeDirector('LI','LI_2117_PATROL',cameoSeed('LI','LI_2117_PATROL'));
 await d.completeBeat();assert.equal(d.step,'LI_RETURN_DUTY_0033');assert.equal(d.awaitingZone,'first_campus_4f');assert.match(d.uiManager.objective,/值班室/);
 assert.equal(gameState.getFlag('LI_2117_ENV_DRIFT'),true);assert.equal(gameState.getFlag('ANNIE_ROUTE_EVENT_LI'),true);
 const restored=new IdentityManager(d.manager.storage);assert.equal(restored.currentRouteStep,'LI_RETURN_DUTY_0033');assert.equal(restored.runSave.runSeed,d.manager.runSave.runSeed);
 return {next:d.step,objective:d.uiManager.objective};
});
await test('Zhou 5F motive leads to physical guard-rest photos before CCTV and bridge',()=>{
 const m4=getIdentityRouteScene('M4','ZHOU');assert.match(JSON.stringify(m4.at(-1)),/照片/);assert.match(m4.at(-1).review,/2F 警衛休息室/);
 const z=router.loadZone('second_campus_2f'),d=makeDirector('ZHOU','M5'),beats=d.beats;
 assert.equal(beats.length,3);assert.equal(beats[0].photoAlbum,'M5_GUARD_REST_LOG');assert.equal(beats[0].room,'201');assert.equal(beats[1].room,'202');assert.equal(beats[2].zoneId,'skybridge');
 const binding=d.bindingFor();assert.equal(binding.id,'MEMORY_M5_GUARD_REST_LOG');assert.equal(binding.passthrough,undefined);
 const photo=d.findExistingTarget(binding);assert(photo?.isObject3D,'must use existing wall photo');assert(z.interactables.includes(photo));
 assert.equal(d.bindingFor('M5',1).id,'SECOND_2F_CCTV_DESK');assert.equal(d.bindingFor('M5',2).proximityBridge,true);
 return {photo:photo.name,position:photo.parent.position.toArray(),route:d.manager.route.length};
});
await test('Zhou photo viewer supports early close/retry and completes once only after all pages are read',async()=>{
 router.loadZone('second_campus_2f');const d=makeDirector('ZHOU','M5');
 d.inspect();assert(d.uiManager.opened,'photo viewer was not opened');assert.equal(d.uiManager.opened.sequence.id,'M5_GUARD_REST_LOG');assert.equal(d.uiManager.opened.sequence.frames.length,4);
 assert.equal(d.busy,true);d.uiManager.opened.onClose();assert.equal(d.beatIndex,0);assert.equal(d.busy,false);
 d.inspect();const {onClose,onRead,sequence}=d.uiManager.opened;
 onRead();assert.equal(d.beatIndex,0,'reading alone must not advance while viewer open');onClose();await new Promise(r=>setTimeout(r,0));
 assert.equal(d.beatIndex,1);assert.equal(d.bindingFor().id,'SECOND_2F_CCTV_DESK');assert.equal(gameState.getFlag('ZHOU_GUARD_REST_PHOTOS_REVIEWED'),true);
 onClose();await new Promise(r=>setTimeout(r,0));assert.equal(d.beatIndex,1,'duplicate close skipped CCTV');
 assert(sequence.frames.every(f=>f.photo&&f.narration));assert.doesNotMatch(JSON.stringify(sequence),/周啟文|MED-880217|守恆|滑鼠|強制拉/);
 return {photos:sequence.frames.map(f=>f.photo),next:d.bindingFor().id};
});
await test('Zhou safe bridge completion with Annie active proceeds to 316 instead of equipment',async()=>{
 router.loadZone('skybridge');const d=makeDirector('ZHOU','M5',cameoSeed('ZHOU','M5'));
 d.beatIndex=d.beats.findIndex(b=>b.forcedBridgeReveal);await d.completeBeat();assert.equal(d.step,'M1');assert.equal(d.awaitingZone,'first_campus_3f');assert.match(d.uiManager.objective,/316.*補交班/);assert.equal(gameState.getFlag('ANNIE_ROUTE_EVENT_ZHOU'),true);
 const restored=new IdentityManager(d.manager.storage);assert.equal(restored.currentRouteStep,'M1');return {next:d.step,objective:d.uiManager.objective};
});
await test('409 cart stays mandatory for all routes; route lengths and save namespace unchanged',()=>{
 for(const id of Object.keys(IDENTITY_ROUTES))for(const seed of [null,0,17,42]){
  const d=makeDirector(id,'M2',seed),cart=d.beats.at(-1);assert(cart.cartCheck);assert.equal(cart.review,'協助確認工作車上的藥品與器材');assert.equal(cart.flag,'M2_CART_CHECKED');
  d.beatIndex=d.beats.length-1;assert.equal(d.bindingFor().id,'IDENTITY_4F_CLINICAL_CART');
 }
 assert.deepEqual(Object.fromEntries(Object.entries(IDENTITY_ROUTES).map(([id,r])=>[id,r.length])),{ZHANG:16,LI:17,ZHOU:16,CHEN:15});
});
const out=process.env.ROUTE_EVIDENCE;if(out){mkdirSync(out,{recursive:true});writeFileSync(out+'/route-detours.json',JSON.stringify({method:'Production handlers and real GLB/Three.js bindings; Node canvas stub, not rendered browser',results},null,2));}
assert.equal(results.filter(r=>r.status==='FAIL').length,0);console.log('PASS route detour regression:',results.length,'checks');
