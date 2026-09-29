import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preloadAssetNames} from './src/art/AssetRegistry.js';
import {WorldRouter} from './src/world/WorldRouter.js';
import {FPSController} from './src/player/FPSController.js';
import {gameState} from './src/core/GameState.js';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';
import {getIdentityDialogue} from './src/story/IdentityLoopDialogue.js';

// Real production GLBs/controller/raycast/collision; only canvas text drawing is stubbed.
const ctx=new Proxy({measureText:s=>({width:s.length*18})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
const events={};global.document={querySelector:()=>null,addEventListener(n,f){(events[n]??=[]).push(f);},createElement:()=>({width:0,height:0,getContext:()=>ctx})};
const originalLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){const b=readFileSync(new URL('./public'+url,import.meta.url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
try{await preloadAssetNames(['workDesk','officeChair','storageCabinet','hospitalBed','bench','printer','plant']);}finally{GLTFLoader.prototype.loadAsync=originalLoad;}
const camera=new THREE.PerspectiveCamera(68,1,.1,220),c=new FPSController(camera,{addEventListener(){}},[],[],[]),router=new WorldRouter(new THREE.Scene(),camera,c),results=[];
async function test(name,fn){try{const detail=await fn();results.push({name,status:'PASS',detail});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message);}}
const visible=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;};
function approach(z,o){
 z.zoneGroup.updateMatrixWorld(true);const center=o.getWorldPosition(new THREE.Vector3()),ray=new THREE.Raycaster();
 for(const dy of [0,.025,-.025,.1])for(const r of [.75,1.1,1.5,1.9,2.3])for(let i=0;i<48;i++){
  const a=i*Math.PI/24,x=center.x+r*Math.cos(a),zz=center.z+r*Math.sin(a);c.teleport(x,1.7,zz);
  if(c.checkCollision(x,zz)||c.supportedHeight(x,zz)===null)continue;
  const target=center.clone();target.y+=dy;const eye=camera.position.clone(),delta=target.clone().sub(eye),distance=delta.length();
  ray.set(eye,delta.normalize());ray.far=distance+.01;
  const hit=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>=.85)));
  let own=false;for(let p=hit?.object;p;p=p.parent)if(p===o||(o.parent!==z.zoneGroup&&p===o.parent))own=true;
  if(hit&&!own&&hit.distance<distance-.025)continue;
  c.yaw=Math.atan2(-delta.x,-delta.z);c.pitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z));c.updateCameraRotation();camera.updateMatrixWorld();c.updateRaycast();
  if(c.currentInteractable?.id===o.userData.id)return {eye:eye.toArray(),target:target.toArray(),id:o.userData.id,firstSolid:hit?.object.name};
 }
 throw Error('No supported unobstructed approach: '+o.userData.id);
}
let z=router.loadZone('second_campus_5f');
await test('All four routes report through the 5F computer',()=>{
 const computer=z.workstations.find(w=>w.id==='second_station_A').screen;assert.equal(computer.userData.id,'IDENTITY_SECOND_5F_NURSE_STATION');assert(!z.zoneGroup.getObjectByName('IdentitySecond5F_Intercom'));
 for(const identity of ['LI','ZHOU','ZHANG','CHEN']){const d=Object.create(IdentityRouteDirector.prototype);d.manager={currentIdentity:identity};for(const index of [0,3]){const b=d.bindingFor('M4',index);assert.equal(b.id,computer.userData.id);assert.doesNotMatch(b.prompt,/對講機/);assert.match(b.prompt,/電腦/);}}
 return approach(z,computer);
});
await test('Medical order is visible and independently pickable',()=>approach(z,z.secondCampusTreatmentOrder));
await test('Open safe retires its hitbox; E selects the badge',()=>{
 gameState.setFlag('CHEN_5042_LOCKBOX_OPENED',false);gameState.setFlag('CHEN_GREY_BADGE_COLLECTED',false);z.syncStoryState();assert.equal(z.chenGreyBadge.visible,false);
 const lock=z.interactables.find(o=>o.userData?.id==='CHEN_5042_LOCKBOX');approach(z,lock);
 gameState.setFlag('CHEN_5042_LOCKBOX_OPENED',true);z.syncStoryState();assert.equal(lock.userData.interactable,false,'open safe must not intercept badge');assert.equal(z.chenGreyBadgeHit.userData.interactable,true);
 const aim=approach(z,z.chenGreyBadgeHit);let picked=0;c.onInteract=data=>{assert.equal(data.id,'CHEN_GREY_BADGE');picked++;};for(const fn of events.keydown||[])fn({code:'KeyE',preventDefault(){}});assert.equal(picked,1);
 gameState.setFlag('CHEN_GREY_BADGE_COLLECTED',true);z.syncStoryState();c.updateRaycast();assert.equal(z.chenGreyBadge.visible,false);assert.notEqual(c.currentInteractable?.id,'CHEN_GREY_BADGE');return aim;
});
await test('Bathroom has real fixtures and a collision-safe walking route',()=>{
 const b=z.secondDutyBathroom;assert(b,'bathroom topology missing');for(const name of b.fixtures){const o=b.root.getObjectByName('SecondDutyBathroom_'+name);assert(o?.isMesh,name);assert(visible(o));}
 c.teleport(...b.walkingPath[0]);assert(!c.checkCollision(c.position.x,c.position.z));
 for(const dest of b.walkingPath.slice(1)){const count=Math.ceil(Math.hypot(dest[0]-c.position.x,dest[2]-c.position.z)/.04),dx=(dest[0]-c.position.x)/count,dz=(dest[2]-c.position.z)/count;for(let j=0;j<count;j++)c.moveWithCollision(dx,dz);assert(Math.hypot(c.position.x-dest[0],c.position.z-dest[2])<.05,'blocked route to '+dest);}
 assert(c.checkCollision(80.72,2.85),'toilet collision');assert(c.checkCollision(81.49,2.85),'shower screen collision');return {path:b.walkingPath,end:c.position.toArray(),fixtures:b.fixtures};
});
await test('Collected badge remains absent after scene reload',()=>{gameState.setFlag('CHEN_GREY_BADGE_COLLECTED',true);z=router.loadZone('second_campus_5f');z.syncStoryState();assert.equal(z.chenGreyBadge.visible,false);assert.equal(z.chenGreyBadgeHit.userData.interactable,false);});
z=router.loadZone('second_campus_2f');
await test('CCTV phone has a separate supporting desk and its own E-ray',()=>{
 const desk=z.zoneGroup.getObjectByName('Second2F_CCTV_PhoneDesk');assert(desk,'real phone desk missing');assert(desk.children.filter(o=>o.isMesh).length>=5);
 const phone=z.zoneGroup.getObjectByName('Second2F_CCTV_Phone');assert.equal(phone.parent,desk);const top=desk.children.find(o=>o.name==='CCTVPhoneDeskTop');assert(top,'desk top');z.zoneGroup.updateMatrixWorld(true);
 const base=phone.children.find(o=>o.isMesh&&!o.userData.interactable);assert(Math.abs(new THREE.Box3().setFromObject(base).min.y-new THREE.Box3().setFromObject(top).max.y)<.006,'phone floats');
 const hit=z.interactables.find(o=>o.userData.id==='IDENTITY_SECOND_2F_CCTV_PHONE');hit.userData.interactable=true;return approach(z,hit);
});
await test('Li 408C -> 409 -> order with irregular knocking; other seeds unchanged',()=>{
 const scene=getIdentityRouteScene('M2','LI');assert.equal(scene.length,4);assert(scene[1].furiousKnock);assert(scene[2].knock409);
 const d=Object.create(IdentityRouteDirector.prototype);d.manager={currentIdentity:'LI'};
 for(const [i,id]of [[1,'408C_BED_PLAQUE'],[2,'BED33_409_SEALED'],[3,'BED33_ASSIGNMENT']])assert.equal(d.bindingFor('M2',i).id,id);
 d.step='M2';d.beatIndex=2;d.beats=scene;assert(d.matchesBinding({type:'duty_door',doorId:'room_409'}),'real door knob must match visit');
 assert.doesNotMatch(JSON.stringify(scene),/四下|再九下|4—停—9/);assert.doesNotMatch(JSON.stringify(getIdentityRouteScene('LI_RETURN_DUTY_2117','LI')),/4—停—9/);assert.doesNotMatch(JSON.stringify(getIdentityDialogue('M2','LI')),/四下|再九下/);
 for(const id of ['ZHANG','ZHOU','CHEN'])assert.match(JSON.stringify(getIdentityRouteScene('M2',id)),/四下/);
});
await test('Hidden parent cannot be picked; transparent active hitbox can',()=>{
 const p=new THREE.Group(),hit=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:0}));hit.userData={interactable:true,id:'hidden-test'};p.add(hit);p.position.set(0,1.7,-2);p.updateMatrixWorld(true);c.interactables=[hit];camera.position.set(0,1.7,0);camera.quaternion.identity();camera.updateMatrixWorld();p.visible=false;c.updateRaycast();assert.notEqual(c.currentInteractable?.id,'hidden-test');p.visible=true;c.updateRaycast();assert.equal(c.currentInteractable.id,'hidden-test');
});
if(process.env.CLOSURE_EVIDENCE){mkdirSync(process.env.CLOSURE_EVIDENCE,{recursive:true});writeFileSync(process.env.CLOSURE_EVIDENCE+'/geometry.json',JSON.stringify({method:'Production GLBs/controller/physics; text canvas stubbed, not a rendered playthrough.',results},null,2));}
assert.equal(results.filter(r=>r.status==='FAIL').length,0,JSON.stringify(results.filter(r=>r.status==='FAIL')));
console.log('PASS clinical interaction closure:',results.length,'functional checks');
