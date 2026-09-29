import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldRouter} from './src/world/WorldRouter.js';
import {FPSController} from './src/player/FPSController.js';
global.document={querySelector:()=>null,addEventListener(){},createElement:()=>({getContext:()=>new Proxy({measureText:t=>({width:t.length*20})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))})})};
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),c=new FPSController(camera,{addEventListener(){}},[],[],[]),r=new WorldRouter(scene,camera,c);
function travel(a,b){c.teleport(...a);const n=140;for(let i=0;i<n;i++)c.moveWithCollision((b[0]-a[0])/n,(b[2]-a[2])/n);assert(Math.hypot(c.position.x-b[0],c.position.z-b[2])<.07,JSON.stringify({a,b,at:c.position.toArray()}));}
const admin=r.loadZone('first_campus_3f');
assert(admin.keyedDoors['3F_ADMIN_OFFICE_DOOR']?.closed,'3F admin office door must start closed');
assert(admin.keyedDoors['3F_ARCHIVE_DOOR']?.closed,'3F archive door must start closed');
assert(admin.zoneGroup.getObjectByName('AdminDesk_Monitor'),'3F 316 admin workstation must remain present');

const z=r.loadZone('first_campus_4f');z.setWardGateClosed(false);z.setInnerWardGateClosed(false);for(const door of Object.values(z.accessDoors||{}))if(!door.portal)door.setClosed(false);for(const door of Object.values(z.keyedDoors||{}))door.setClosed(false);
for(const room of z.roomAreas){travel(room.corridor,room.point);travel(room.point,room.corridor);}
assert.deepEqual(z.roomAreas.filter(r=>r.kind==='ward').map(r=>r.id),Array.from({length:9},(_,i)=>String(401+i)));
assert.equal(z.bedAreas.length,32);assert.equal(z.bedAreas.find(b=>b.wardBedNumber===33),undefined);assert(!z.bedAreas.some(b=>b.roomId==='409'));
assert(z.keyedDoors.duty_bathroom);assert.deepEqual(z.dutyBathroom.fixtures,['toilet','sink','mirror','towel_rail','floor_drain','shower']);
console.log('FIRST UPPER ROOMS V5.2 PASS: 316 admin retained; 401–408 x4 beds, narrative-only 409A, bathroom fixtures and accessible ward rooms');
