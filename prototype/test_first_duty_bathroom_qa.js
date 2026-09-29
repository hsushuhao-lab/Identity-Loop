// Uses production GLBs, the 4F scene builder and FPS collision/E-key code.
// Canvas text is stubbed; this is geometry verification, not a rendered playthrough.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preloadAssetNames} from './src/art/AssetRegistry.js';
import {GeometryFactory} from './src/world/shared/GeometryFactory.js';
import {FirstCampus4F} from './src/world/zones/FirstCampus4F.js';
import {FPSController} from './src/player/FPSController.js';

const context=new Proxy({measureText:t=>({width:String(t).length*12})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
const events={};
global.document={querySelector:()=>null,addEventListener(n,f){(events[n]??=[]).push(f);},createElement:()=>({width:0,height:0,style:{},dataset:{},getContext:()=>context})};
const originalLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){const b=readFileSync(new URL('./public'+url,import.meta.url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
try{await preloadAssetNames(['workDesk','officeChair','storageCabinet','hospitalBed','bench','printer','plant']);}finally{GLTFLoader.prototype.loadAsync=originalLoad;}
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(68,1,.1,220);
const z=new FirstCampus4F(scene,new GeometryFactory());z.build();z.zoneGroup.updateMatrixWorld(true);
const c=new FPSController(camera,{addEventListener(){}},z.colliders,z.interactables,z.walkables),results=[];
const b=z.dutyBathroom,door=z.dutyBathroomDoor;
const record=(name,fn)=>{try{const detail=fn();results.push({name,status:'PASS',detail});console.log('PASS',name);}catch(error){results.push({name,status:'FAIL',error:error.message});console.error('FAIL',name,error.message);}};
function walk(path){
  c.teleport(...path[0]);assert(!c.checkCollision(c.position.x,c.position.z),'starting point must be clear');
  for(const dest of path.slice(1)){
    const n=Math.ceil(Math.hypot(dest[0]-c.position.x,dest[2]-c.position.z)/.04);
    const dx=(dest[0]-c.position.x)/n,dz=(dest[2]-c.position.z)/n;
    for(let i=0;i<n;i++){
      c.moveWithCollision(dx,dz);
      assert(c.supportedHeight(c.position.x,c.position.z)!==null,'floor support lost');
      assert(!c.checkCollision(c.position.x,c.position.z),'walk enters a solid collider');
      const body=new THREE.Box3(new THREE.Vector3(c.position.x-c.playerRadius,.15,c.position.z-c.playerRadius),new THREE.Vector3(c.position.x+c.playerRadius,1.95,c.position.z+c.playerRadius));
      assert(!body.intersectsBox(new THREE.Box3().setFromObject(door.leaf)),'walking route intersects the open door leaf');
    }
    assert(Math.hypot(c.position.x-dest[0],c.position.z-dest[2])<.03,'blocked route to '+dest);
  }
  return c.position.toArray();
}
record('4F bathroom has real shower, toilet and basin geometry inside the original footprint',()=>{
  assert.deepEqual(b.bounds,[-14,2,-11.5,5.2]);assert.deepEqual(b.door,[-11.5,1.7,4]);
  for(const name of ['ToiletBowl','ToiletSeat','ToiletCistern','ShowerPan','ShowerHead','ShowerMixer','ShowerScreen','ShowerDrain','Sink','Mirror']){
    const mesh=z.zoneGroup.getObjectByName('FirstDutyBathroom_'+name);assert(mesh?.isMesh,name+' must be an actual mesh');
    const bb=new THREE.Box3().setFromObject(mesh);assert(bb.min.x>=-13.9&&bb.max.x<=-11.6&&bb.min.z>=2.10&&bb.max.z<=5.10,name+' outside bathroom');
  }
  assert.equal(b.fixtures.includes('shower'),true);return {bounds:b.bounds,fixtures:b.fixtures};
});
record('Bathroom door opens with real ray targeting and E-key dispatch, without new story flags',()=>{
  assert(door.closed);c.teleport(-10.8,1.7,4);
  camera.lookAt(-11.5,1.2,4);camera.updateMatrixWorld(true);c.updateRaycast();assert.equal(c.currentInteractable?.doorId,'duty_bathroom');
  let calls=0;c.onInteract=data=>{assert.equal(data.doorId,'duty_bathroom');door.toggle(c.position);calls++;};
  for(const fn of events.keydown||[])fn({code:'KeyE',preventDefault(){}});
  assert.equal(calls,1);assert.equal(door.closed,false);assert(!z.colliders.includes(door.closedBox));
  return {target:c.currentInteractable.doorId,openDirection:door.openDirection};
});
record('Walk from duty room through bathroom door into shower and back',()=>{
  assert(b.walkingPath?.length>=5,'bathroom walk route is missing');
  const end=walk(b.walkingPath);walk([...b.walkingPath].reverse());return {path:b.walkingPath,showerEndpoint:end,exit:c.position.toArray()};
});
record('Basin and toilet have usable standing space without passing through fixtures',()=>{
  assert(b.walkingPath,'bathroom walk route is missing');
  walk([b.walkingPath[0],[-12.1,1.7,4],[-12.1,1.7,3.5]]);
  walk([b.walkingPath[0],[-12.1,1.7,4],[-12.1,1.7,3.7],[-13.2,1.7,3.7]]);
  for(const [name,x,zp] of [['toilet',-13.2,4.62],['basin',-12,2.62],['screen',-12.64,2.72]])assert(c.checkCollision(x,zp),name+' must have a collision body');
  return {basinStanding:[-12.1,1.7,3.5],toiletStanding:[-13.2,1.7,3.7]};
});
record('Door can close and reopen from inside; its full swing does not hit bathroom fixtures',()=>{
  assert(b.root,'fixture group missing');c.teleport(-12.2,1.7,3.7);assert(door.toggle(c.position));assert(door.closed);assert(z.colliders.includes(door.closedBox));
  assert(c.checkCollision(-11.5,4),'closed door should block entry');
  assert(door.toggle(c.position));assert(!door.closed);
  let samples=0;
  for(let angle=0;angle<=Math.PI/2+.001;angle+=Math.PI/36){
    door.hinge.rotation.y=angle;door.root.updateMatrixWorld(true);const leaf=new THREE.Box3().setFromObject(door.leaf);
    b.root.traverse(mesh=>{if(mesh.isMesh)assert(!leaf.intersectsBox(new THREE.Box3().setFromObject(mesh)),'door sweep clips '+mesh.name);});samples++;
  }
  door.setClosed(false);return {swingSamples:samples};
});
record('Duty-room bed, desk, phone, wardrobe and story interaction IDs are preserved',()=>{
  assert.deepEqual(z.dutyRoom.bounds,[-14,2,-8,10]);assert.deepEqual(z.dutyCabinetAnchor,[-8.8,0,9.3]);
  assert.deepEqual(z.workstations.find(w=>w.id==='duty_desk').desk.position.toArray(),[-10,0,3.1]);
  assert(z.interactables.some(o=>o.userData.id==='4F_DUTY_COMPUTER'));
  assert(z.interactables.some(o=>o.userData.id==='4F_DUTY_PHONE'));
  assert(z.interactables.some(o=>o.userData.id==='408C_BED_PLAQUE'));
  assert(z.interactables.some(o=>o.userData.id==='BED33_409_SEALED'));
  const bed=z.zoneGroup.children.find(o=>o.position?.x===-12.5&&o.position?.z===7.8);assert(bed,'duty bed moved or removed');
});
record('Cleanup removes bathroom, floor support and its colliders',()=>{
  const root=b.root;assert(root,'fixture group missing');z.cleanup();assert(!scene.children.includes(z.zoneGroup));assert.equal(z.colliders.length,0);assert.equal(z.walkables.length,0);
});
if(process.env.BATHROOM_EVIDENCE){mkdirSync(process.env.BATHROOM_EVIDENCE,{recursive:true});writeFileSync(process.env.BATHROOM_EVIDENCE+'/first-duty-bathroom.json',JSON.stringify({method:'Real production GLBs, Three.js mesh/collider and FPS/E dispatch; text drawing stubbed, not a rendered playthrough.',results},null,2));}
assert.equal(results.filter(x=>x.status==='FAIL').length,0,JSON.stringify(results.filter(x=>x.status==='FAIL')));
console.log('PASS first-campus 4F shower/toilet:',results.length,'functional checks');
