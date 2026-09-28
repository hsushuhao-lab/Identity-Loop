import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldRouter} from './src/world/WorldRouter.js';
import {FPSController} from './src/player/FPSController.js';
import {WORLD_SPAWNS,ROUTE_PORTALS,FIRST_FLOORS,SECOND_FLOORS} from './src/world/shared/WorldRoutes.js';
global.document={addEventListener(){},querySelector(){return null;},createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>({addColorStop(){}})})})};
const camera=new THREE.PerspectiveCamera(),controller=new FPSController(camera,{addEventListener(){}},[],[],[]),scene=new THREE.Scene(),router=new WorldRouter(scene,camera,controller);
const canonical=[...FIRST_FLOORS.map(f=>`first_campus_${f}f`),'skybridge',...SECOND_FLOORS.map(f=>`second_campus_${f}f`),'second_campus_4f_story','phantom_6f','b2_archive','b1_dispatch_hub'];
assert(!Object.values(WORLD_SPAWNS).some(spawn=>['hillside_route','ecology_pond'].includes(spawn.zoneId)),
 'outdoor zones must not be player-facing production destinations');
assert(ROUTE_PORTALS.every(portal=>!['hillside_route','ecology_pond'].includes(WORLD_SPAWNS[portal.spawn]?.zoneId)),
 'production portals must stay inside the hospitals and enclosed bridge');
let spawns=0,rooms=0;
for(const id of canonical){
 const zone=router.loadZone(id);
 for(const door of Object.values(zone.accessDoors||{})) if(!door.portal) door.setClosed(false);
 for(const door of Object.values(zone.keyedDoors||{})) door.setClosed(false);
 if(id==='first_campus_2f'&&zone.setAcuteGateClosed)zone.setAcuteGateClosed(false);
 if(id==='first_campus_4f'&&zone.setWardGateClosed)zone.setWardGateClosed(false);
 for(const [key,spawn] of Object.entries(WORLD_SPAWNS).filter(([,v])=>v.zoneId===id)){
  router.teleportToSpawn(key);
  assert(!controller.checkCollision(controller.position.x,controller.position.z),`Spawn collider: ${key}`);
  assert.notEqual(controller.supportedHeight(controller.position.x,controller.position.z),null,`Spawn unsupported: ${key}`);spawns++;
 }
 for(const room of zone.roomAreas||[]){
  controller.teleport(...room.corridor);
  walk(room.point);walk(room.corridor);rooms++;
 }
 if(id.startsWith('second_campus_')&&/[3-8]f$/.test(id))assert.equal(zone.floor,Number(id.at(-2)));
}
function walk(point){
 for(let i=0;i<5000;i++){
  const dx=point[0]-controller.position.x,dz=point[2]-controller.position.z,d=Math.hypot(dx,dz);if(d<.025)return;
  const before=controller.position.clone();controller.moveWithCollision(dx/d*Math.min(.04,d),dz/d*Math.min(.04,d));
  assert(controller.position.distanceTo(before)>.001,`Controller stuck at ${controller.position.toArray()} toward ${point}`);
 }
 throw Error('Route did not terminate');
}
const probes={
 first_to_bridge:[[-1.6,1.7,0],[-.6,1.7,0]],bridge_to_first:[[1.6,1.7,0],[.6,1.7,0]],
 bridge_to_second:[[58.4,1.7,0],[59.3,1.7,0]],second_to_bridge:[[61.6,1.7,0],[60.7,1.7,0]],
};
for(const portal of ROUTE_PORTALS){
 router.loadZone(portal.from);controller.teleport(...probes[portal.id][0]);
 if(portal.gated){
  const door=Object.values(router.activeZoneInstance.accessDoors||{}).find(d=>d.portal===portal.spawn);
  assert(door?.closed,`${portal.id}: missing closed access door`);
  router.update();assert.equal(router.activeZoneId,portal.from,`${portal.id}: proximity bypassed card access`);
  // Unit routing only: browser QA separately presses E on this door's real reader.
  router.teleportToSpawn(door.portal);
 }else{walk(probes[portal.id][1]);router.update();}
 assert.equal(router.activeZoneId,WORLD_SPAWNS[portal.spawn].zoneId,`${portal.id} transition failed`);
 router.update();assert.equal(router.activeZoneId,WORLD_SPAWNS[portal.spawn].zoneId,`${portal.id} arrival immediately bounces`);
}
router.activeZoneInstance.cleanup();
console.log(`PLAYABLE_WORLD PASS: ${canonical.length} indoor story zones, ${spawns} supported production spawns, ${rooms} actual-controller room round trips, ${ROUTE_PORTALS.length} card-controlled enclosed portal checks`);
