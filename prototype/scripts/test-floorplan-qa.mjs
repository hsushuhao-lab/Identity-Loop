import assert from 'node:assert/strict';
import * as THREE from 'three';
import fs from 'node:fs';
import {WorldRouter} from '../src/world/WorldRouter.js';
import {FPSController} from '../src/player/FPSController.js';
import {FIRST_FLOORS,SECOND_FLOORS,WORLD_SPAWNS} from '../src/world/shared/WorldRoutes.js';
import {CORE_ORIGINS} from '../src/world/shared/VerticalCore.js';
const context=new Proxy({measureText:t=>({width:t.length*20})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
global.document={querySelector:()=>null,addEventListener(){},createElement:()=>({getContext:()=>context})};
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),c=new FPSController(camera,{addEventListener(){}},[],[],[]),r=new WorldRouter(scene,camera,c);
let passed=0,failed=0;const results=[];
function check(name,fn){try{fn();passed++;results.push({name,pass:true});console.log('PASS',name);}catch(e){failed++;results.push({name,pass:false,error:e.message});console.error('FAIL',name,e.message);}}
function walk(a,b){c.teleport(...a);const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),n=Math.ceil(from.distanceTo(to)/.04);for(let i=0;i<n;i++)c.moveWithCollision((b[0]-a[0])/n,(b[2]-a[2])/n);assert(Math.hypot(c.position.x-b[0],c.position.z-b[2])<.07,`blocked at ${c.position.toArray()} toward ${b}`);}
check('First campus permitted floors',()=>assert.deepEqual(FIRST_FLOORS,[1,2,3,4,8]));check('Second campus permitted floors',()=>assert.deepEqual(SECOND_FLOORS,[1,2,5]));
for(const id of Object.keys(CORE_ORIGINS).filter(s=>s!=='second_campus_std')){
 const z=r.loadZone(id);scene.updateMatrixWorld(true);
 check(id+' identical core layout',()=>assert.equal(z.verticalCore.layout,id.startsWith('first')?'FIRST_CORE_V1':'SECOND_CORE_V1'));
 const [x,z0]=z.verticalCore.origin;
 check(id+' lift button beside door',()=>assert.deepEqual(z.verticalCore.panel,[1.65,3.72]));
 check(id+' core entrance reachable',()=>walk([x,1.7,z0+1.5],[x,1.7,z0-(z.wardDoor?2.8:4.6)]));
 for(const [key,spawn] of Object.entries(WORLD_SPAWNS).filter(([,v])=>v.zoneId===id))check(key+' collision and ground',()=>{c.teleport(...spawn.pos);assert(!c.checkCollision(c.position.x,c.position.z));assert.notEqual(c.supportedHeight(c.position.x,c.position.z),null);});
 check(id+' menu-only stair physically closed',()=>{const leaf=z.interactables.find(o=>o.userData?.kind==='stairs');const p=leaf.getWorldPosition(new THREE.Vector3());assert(c.checkCollision(p.x,p.z));});
 if(id==='first_campus_4f'||id==='second_campus_5f'){
  const second=id.startsWith('second'),gate=z.wardDoor,inner=z.innerWardDoor;
  check(id+' V5 outer and inner gates start closed',()=>{assert(gate.closed);assert(inner.closed);});
  const center=gate.closedBox.getCenter(new THREE.Vector3());
  check(id+' closed outer gate blocks actual controller',()=>{c.teleport(center.x,1.7,center.z+1);c.moveWithCollision(0,-3);assert(c.position.z>center.z);});
  z.setWardGateClosed(false);
  check(id+' outer gate opens into vestibule',()=>{walk([center.x,1.7,center.z+1.2],[center.x,1.7,center.z-.8]);});
  const innerCenter=inner.closedBox.getCenter(new THREE.Vector3());
  check(id+' closed inner gate independently blocks ward',()=>{c.teleport(innerCenter.x,1.7,innerCenter.z+1);c.moveWithCollision(0,-2.5);assert(c.position.z>innerCenter.z);});
  z.setInnerWardGateClosed(false);
  check(id+' inner gate authorizes ward entry',()=>{walk([innerCenter.x,1.7,innerCenter.z+1],[innerCenter.x,1.7,innerCenter.z-1.2]);});
  for(const d of Object.values(z.accessDoors||{})) if(d!==gate&&d!==inner&&!d.portal) d.setClosed(false);
  for(const d of Object.values(z.keyedDoors||{})) d.setClosed(false);
  const roomIds=z.roomAreas.filter(x=>x.kind==='ward').map(x=>x.id);
  check(id+' exact nine V5 perimeter rooms',()=>assert.deepEqual(roomIds,Array.from({length:9},(_,i)=>String((second?500:400)+i+1))));
  check(id+(second?' exactly 36 ward beds':' exactly 32 first-campus ward beds'),()=>{
   assert.equal(z.bedAreas.length,second?36:32);
   if(second)assert.equal(z.bedAreas.find(b=>b.wardBedNumber===33)?.roomId,'509');
   else{assert.equal(z.bedAreas.find(b=>b.wardBedNumber===33),undefined);assert(!z.bedAreas.some(b=>b.roomId==='409'));}
  });
  for(const room of z.roomAreas)check(id+' room '+room.id+' in and out',()=>{walk(room.corridor,room.point);walk(room.point,room.corridor);});
  check(id+' V5.1 custom protected station',()=>assert.equal(z.station.module,'NursingStation_V5_2_GLASS_BOX'));
  check(id+' glass bypass is transparent',()=>{const d=z.accessDoors[second?'second_ward_glass':'first_ward_glass'];assert(d);assert(d.leaves.every(l=>l.material.transparent));});
  check(id+' station ward door faces x06',()=>{const d=z.accessDoors[second?'second_station_ward':'first_station_ward'];assert(d);assert.equal(z.station.facesRoom,String((second?500:400)+6));assert.equal(z.station.wardDoorMaterial,'metal');});
  check(id+' four-sided station glazing',()=>assert.deepEqual(z.station.glazedSides,['south','north','west','east']));
  check(id+' patient room doors are knob doors',()=>{for(const room of z.roomAreas.filter(room=>room.kind==='ward')){assert.equal(room.doorType,'knob');assert(z.keyedDoors[room.accessDoorId]);}});
  for(const w of z.workstations)check(id+' screen faces chair '+w.id,()=>{const p=w.screen.getWorldPosition(new THREE.Vector3()),n=new THREE.Vector3(0,0,1).transformDirection(w.screen.matrixWorld),dir=new THREE.Vector3(...w.chair).sub(p);dir.y=0;assert(n.dot(dir.normalize())>.98);});
  if(!second)check('Duty room near lift outside ward gate',()=>{z.setDutyDoorClosed(false);walk([0,1.7,6],z.dutyRoom.outside);walk(z.dutyRoom.outside,z.dutyRoom.inside);assert(Math.hypot(-8,6-9.8)<10);});
  if(second)check('Second-campus external room is duty room',()=>{assert(z.roomAreas.some(room=>room.id==='SECOND_DUTY'&&room.label==='值班室'));const door=z.keyedDoors.second_duty_room;assert(door);assert.equal(door.keepOpen,true);assert.equal(door.closed,false);});
  check(id+' both gate states survive round-trip',()=>{z.setWardGateClosed(true);z.setInnerWardGateClosed(true);r.loadZone('first_campus_3f');const reloaded=r.loadZone(id);assert(reloaded.wardDoor.closed);assert(reloaded.innerWardDoor.closed);});
 }
}
{
 const z=r.loadZone('first_campus_2f');scene.updateMatrixWorld(true);
 for(const id of ['ER_MAIN','ER_BEDS','ER_HILLSIDE']){
  const d=z.accessDoors[id],p=d.closedBox.getCenter(new THREE.Vector3());
  check(id+' closed barrier',()=>{assert(d.closed);c.teleport(p.x,1.7,p.z);assert(c.checkCollision(p.x,p.z));});
  check(id+' inner and outer readers',()=>assert.equal(d.readers.length,2));
  check(id+' rejects closing onto player',()=>{d.setClosed(false);assert.equal(d.toggle(new THREE.Vector3(p.x,1.7,p.z)),false);});
  check(id+' open geometry clears centre',()=>assert(!c.checkCollision(p.x,p.z)));
 }
 check('ER main to bed area via controlled entrances',()=>{walk([-4,1.7,0],[14.5,1.7,0]);walk([14.5,1.7,0],[14.5,1.7,4.6]);});
 check('ER hillside door is traversable on authorization',()=>walk([20.5,1.7,0],[24,1.7,0]));
}
for(const id of ['first_campus_8f','skybridge','second_campus_2f']){
 const z=r.loadZone(id);for(const d of Object.values(z.accessDoors).filter(d=>d.portal))check(id+' portal door stays closed '+d.id,()=>{assert(d.closed);const p=d.closedBox.getCenter(new THREE.Vector3());c.teleport(p.x,1.7,p.z);assert(c.checkCollision(p.x,p.z));const before=r.activeZoneId;r.update();assert.equal(r.activeZoneId,before);});
}
check('20 alternating zone cleanup cycles stable',()=>{let initial;for(let i=0;i<20;i++){r.loadZone('first_campus_4f');r.loadZone('second_campus_5f');r.loadZone('first_campus_3f');let n=0;scene.traverse(()=>n++);initial??=n;assert.equal(n,initial);}assert.equal(scene.children.length,2);});
console.log(JSON.stringify({passed,failed},null,2));fs.mkdirSync('qa-results',{recursive:true});fs.writeFileSync('qa-results/floorplan-v2.json',JSON.stringify({passed,failed,results},null,2));if(failed)process.exitCode=1;
