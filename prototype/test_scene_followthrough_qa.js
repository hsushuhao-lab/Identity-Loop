import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preloadAssetNames} from './src/art/AssetRegistry.js';
import {WorldRouter} from './src/world/WorldRouter.js';
import {FPSController} from './src/player/FPSController.js';
import {gameState} from './src/core/GameState.js';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
import {IdentityManager} from './src/core/IdentityManager.js';
import {getIdentityRouteScene,shouldShowAnnie} from './src/story/IdentityRouteScenes.js';
import {WORLD_SPAWNS,STAIR_DOORS} from './src/world/shared/WorldRoutes.js';
import * as glimpse from './src/story/ElevatorGlimpseScene.js';
const ctx=new Proxy({measureText:s=>({width:s.length*18})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
const events={};global.document={querySelector:()=>null,addEventListener(n,f){(events[n]??=[]).push(f);},createElement:()=>({width:0,height:0,dataset:{},getContext:()=>ctx})};

const oldLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){const b=readFileSync(new URL('./public'+url,import.meta.url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
try{await preloadAssetNames(['workDesk','officeChair','storageCabinet','hospitalBed','bench','printer','plant']);}finally{GLTFLoader.prototype.loadAsync=oldLoad;}
const camera=new THREE.PerspectiveCamera(68,1,.1,220),c=new FPSController(camera,{addEventListener(){}},[],[],[]),r=new WorldRouter(new THREE.Scene(),camera,c),results=[];
async function test(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message);}}
function director(id,step,index=0){const m=IdentityManager.createForTest(id);m.runSave.currentRouteStep=m.route.indexOf(step);const d=new IdentityRouteDirector({manager:m,worldRouter:r,controller:c,gameState,uiManager:{},panel:{}});d.step=step;d.beats=getIdentityRouteScene(step,id);d.beatIndex=index;d.renderObjective=()=>{};return d;}
function aim(o,eye){r.activeZoneInstance.zoneGroup.updateMatrixWorld(true);c.teleport(...eye);camera.lookAt(o.getWorldPosition(new THREE.Vector3()));camera.updateMatrixWorld(true);c.updateRaycast();return c.currentInteractable?.id;}
await test('409 form resolves into the real medication-and-equipment cart on all seeds',()=>{
 const z=r.loadZone('first_campus_4f');
 for(const id of ['ZHANG','LI','ZHOU','CHEN'])for(const seed of [null,0,17,42]){
  const beats=getIdentityRouteScene('M2',id,seed),form=beats.findIndex(b=>b.label.includes('醫囑單')||b.label==='核對臨時床位單');
  assert(form>=0);const next=beats[form+1];assert(next?.cartCheck,'next event must be cart, not a random empty-space trigger');
  assert.equal(next.review,'協助確認工作車上的藥品與器材');
  const d=director(id,'M2',form+1);d.beats=beats;
  const binding=d.bindingFor();assert.equal(binding.id,'IDENTITY_4F_CLINICAL_CART');
  assert(z.interactables.find(o=>o.userData?.id===binding.id)?.isObject3D);
  assert.equal(beats.some(b=>b.annieFlag===`ANNIE_ROUTE_EVENT_${id}`),shouldShowAnnie(id,'M2',seed));
 }
});
await test('Guard visitor log has real neutral pages and is separate from the old album',()=>{
 const z=r.loadZone('second_campus_1f'),book=z.interactables.find(o=>o.userData?.id==='IDENTITY_SECOND_GUARD_LOGBOOK');
 assert.equal(book?.userData.type,'archive_document');assert(book.userData.pages.length>=2);
 for(const page of book.userData.pages){assert(page.length>60);assert.doesNotMatch(page,/張守恆|李承禮|陳柏勳|周啟文|MED-\d{6}|5042|1700|3082/);}
 assert.notEqual(book,z.interactables.find(o=>o.userData?.id==='SECOND_GUARD_PHOTO_ALBUM'));
 return {pages:book.userData.pages.length};
});
await test('Second 5F storage contains one seated mannequin with local blue cuffs',()=>{
 const z=r.loadZone('second_campus_5f'),a=z.zoneGroup.getObjectByName('Second5F_StorageAnnie');assert(a?.isGroup);
 const room=z.roomAreas.find(r=>r.id==='STORE_ENTRY'),p=a.getWorldPosition(new THREE.Vector3());
 assert(p.x>room.rect[0]&&p.x<room.rect[2]&&p.z>room.rect[1]&&p.z<room.rect[3]);
 for(const side of [-1,1]){const cuff=a.getObjectByName(`Annie_Cuff_${side}`);assert(cuff);assert(cuff.material.color.b>cuff.material.color.r);}
 assert(z.interactables.includes(a));assert.equal(a.userData.type,'archive_document');return {position:p.toArray(),room:room.rect};
});
await test('Second 5F bathroom has a closed, operable privacy door and safe interior path',()=>{
 const z=r.loadZone('second_campus_5f'),b=z.secondDutyBathroom,door=z.keyedDoors.second_duty_bathroom;assert(door,'missing door');
 assert(door.closed);assert(z.colliders.includes(door.closedBox));door.toggle(new THREE.Vector3(81.25,1.7,6.05));assert(!door.closed);
 c.teleport(...b.walkingPath[0]);for(const point of b.walkingPath.slice(1)){c.moveWithCollision(point[0]-c.position.x,point[2]-c.position.z);assert(Math.hypot(c.position.x-point[0],c.position.z-point[2])<.05,'bathroom path blocked');}
 assert(door.toggle(c.position));assert(door.closed);assert(door.toggle(c.position));return {path:b.walkingPath};
});
await test('All four route assessments enable the patient parent and a real E target',async()=>{
 for(const id of ['ZHANG','LI','ZHOU','CHEN']){
  delete global.window;
  const z=r.loadZone('first_campus_2f'),step=id==='LI'?'LI_ER_2005':'M3',d=director(id,step);
  global.window={location:{search:'?qa=story'}};
  gameState.setFlag('ER_JANE_PRESENT',false);await d.placeBeat();z.syncStoryState();
  assert(z.janeDoePatient.visible,id+' patient stays hidden by legacy state');assert(z.janeDoeHit.userData.interactable);
  const eye=[10.5,1.7,5.8];assert(!c.checkCollision(eye[0],eye[2]));assert.equal(aim(z.janeDoeHit,eye),'2F_JANE_DOE_ASSESSMENT');
  let got=null;c.onInteract=data=>{got=data.id;};for(const fn of events.keydown)fn({code:'KeyE',preventDefault(){}});assert.equal(got,'2F_JANE_DOE_ASSESSMENT');
  if(id!=='LI'){d.beatIndex=1;await d.placeBeat();z.syncStoryState();assert(!z.janeDoePatient.visible,'00:33 must still have no patient');}
 }
});
delete global.window;
await test('First 2F stairs are on the opposite east wall and agree with travel metadata',()=>{
 const z=r.loadZone('first_campus_2f'),leaf=z.interactables.find(o=>o.userData?.id==='first_campus_2f_stairs');const p=leaf.parent.getWorldPosition(new THREE.Vector3());
 assert(Math.abs(p.x-STAIR_DOORS.first_campus_2f.position[0])<.001,'stair on wrong side');assert(Math.abs(p.z-STAIR_DOORS.first_campus_2f.position[2])<.001);
 const sp=WORLD_SPAWNS.first_2f_stairs.pos;assert.equal(aim(leaf,sp),'first_campus_2f_stairs');assert(!c.checkCollision(sp[0],sp[2]));
 assert(Math.abs(p.x+.22)<.01,'door must sit in front of east wall inner face');return {door:p.toArray(),spawn:sp};
});
await test('ER approach has an existing photographic source and plant clear of the walkway',()=>{
 const z=r.loadZone('first_campus_2f'),photo=z.zoneGroup.getObjectByName('ER_ArrivalPhoto'),plant=z.zoneGroup.getObjectByName('ER_ArrivalPlant');assert(photo);assert(plant);
 const face=z.interactables.find(o=>o.userData?.id==='ER_ARRIVAL_PHOTO');assert.equal(face.userData.type,'identity_photo');assert.equal(face.userData.photoKey,'er');
 c.teleport(-8,1.7,0);c.moveWithCollision(6,0);assert(Math.abs(c.position.x+2)<.05,'entrance scenery blocks path');
});
await test('Observation poster no longer overlaps the medical headwall',()=>{
 const z=r.loadZone('first_campus_2f'),poster=z.eraPosters.find(o=>o.name.includes('poster_01_restraint_sop'));
 const box=new THREE.Box3().setFromObject(poster);let checked=0;
 z.zoneGroup.traverse(o=>{const p=o.geometry?.parameters;if(p?.width===.8&&p?.height===.5&&p?.depth===.12){assert(!box.intersectsBox(new THREE.Box3().setFromObject(o)));checked++;}});assert.equal(checked,4);
});
await test('Bridge scene text never forecasts forced view or mouse control',()=>{
 for(const id of ['LI','ZHANG','ZHOU','CHEN'])assert.doesNotMatch(JSON.stringify(getIdentityRouteScene('M5',id)),/視角會被|強制拉|硬生生扯|滑鼠/);
});
await test('Sixth-floor preview belongs to a real ascent before 8F, not arrival dialogue',()=>{
 assert.equal(typeof glimpse.shouldPreviewSixthFloor,'function');
 const flags={},state={getFlag:k=>flags[k]};
 const trip={kind:'elevator',fromFloor:3,destination:{zoneId:'first_campus_8f',floorNum:8},zoneId:'first_campus_3f',gameState:state};
 assert(glimpse.shouldPreviewSixthFloor(trip),'must not depend on unrelated second-campus access');
 assert(!glimpse.shouldPreviewSixthFloor({...trip,kind:'stairs'}));
 assert(!glimpse.shouldPreviewSixthFloor({...trip,destination:{zoneId:'first_campus_4f',floorNum:4}}));
 assert(!glimpse.shouldPreviewSixthFloor({...trip,zoneId:'second_campus_2f'}));
 flags.CG_ELEVATOR_TO_8F_PREVIEW_PLAYED=true;assert(!glimpse.shouldPreviewSixthFloor(trip));
});
const out=process.env.SCENE_EVIDENCE;if(out){mkdirSync(out,{recursive:true});writeFileSync(out+'/scene-functional.json',JSON.stringify({source:'actual production models, controller and route binding; labels canvas stubbed',results},null,2));}
assert.equal(results.filter(r=>r.status==='FAIL').length,0,JSON.stringify(results.filter(r=>r.status==='FAIL')));
console.log('PASS scene follow-through:',results.length,'functional checks');
