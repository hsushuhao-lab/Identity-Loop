import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldRouter} from './src/world/WorldRouter.js';
import {FPSController} from './src/player/FPSController.js';
global.document={querySelector:()=>null,addEventListener(){},createElement:()=>({getContext:()=>new Proxy({measureText:t=>({width:t.length*20})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))})})};
const camera=new THREE.PerspectiveCamera(),controller=new FPSController(camera,{addEventListener(){}},[],[],[]);
const router=new WorldRouter(new THREE.Scene(),camera,controller);
let assertions=0;
const check=(name,fn)=>{fn();assertions++;console.log('PASS',name);};
function walk(a,b){controller.teleport(...a);for(let i=0;i<180;i++)controller.moveWithCollision((b[0]-a[0])/180,(b[2]-a[2])/180);assert(Math.hypot(controller.position.x-b[0],controller.position.z-b[2])<.05);}
let zone=router.loadZone('first_campus_1f');
for(const id of ['1F_PHARM_GATE','1F_OPD_GATE'])check(id+' fixed opaque night closure',()=>{const gate=zone.interactables.find(o=>o.userData.id===id);assert.equal(gate.material,zone.gf.materials.metal);assert.equal(gate.userData.type,'closed_door');assert.equal(gate.userData.locked,true);assert.equal(zone.accessDoors?.[id],undefined);});
check('1F lift portal has no suspended legacy board',()=>{const hits=[];zone.zoneGroup.traverse(o=>{if(o.isMesh&&o.position.x===-9&&o.position.z>7.7&&o.position.z<7.8)hits.push(o);});assert.equal(hits.length,0);});
zone=router.loadZone('first_campus_2f');
check('ER exterior frame has no second swinging door leaf',()=>{const frame=zone.zoneGroup.getObjectByName('Doorway_22_0');assert(frame);assert.equal(frame.children.filter(o=>o.geometry?.parameters?.height>2.5&&o.geometry?.parameters?.height<2.6).length,0);});
for(const id of ['ER_NURSE_ENTRY','ER_NURSE_BEDS'])check(id+' closed transparent card door',()=>{const gate=zone.accessDoors[id];assert(gate?.closed);assert(gate.leaves.every(l=>l.material.transparent&&l.material.opacity<.4));assert.equal(gate.readers.length,2);});
check('ER staff to bed route is actually connected through glass access',()=>{zone.accessDoors.ER_NURSE_ENTRY.setClosed(false);zone.accessDoors.ER_NURSE_BEDS.setClosed(false);walk([6.4,1.7,2.4],[6.4,1.7,6]);walk([6.4,1.7,6],[9.6,1.7,6]);});
for(const id of ['first_campus_4f','second_campus_5f']){
 zone=router.loadZone(id);const o=id.startsWith('first')?0:72,prefix=o?'second':'first';
 check(id+' outer gate at lift-lobby boundary',()=>{assert.equal(zone.wardDoor.root.position.z,2);assert.equal(zone.wardDoor.root.position.x,o);assert(controller.checkCollision(o,2));});
 check(id+' inner gate enters nursing station directly',()=>{assert.equal(zone.innerWardDoor.root.position.z,0);assert.equal(zone.innerWardDoor.root.position.x,o);assert(controller.checkCollision(o,0));assert.deepEqual(zone.station.entryDoor,[o,0]);});
 check(id+' right-side glass bypass enters ward',()=>{const d=zone.accessDoors[prefix+'_ward_glass'];assert(d?.closed);assert.equal(d.root.position.x,o+6);assert.equal(d.root.position.z,0);assert(d.leaves.every(l=>l.material.transparent&&l.material.opacity<.5));});
 check(id+' station ward door faces x06 and is metal',()=>{const d=zone.accessDoors[prefix+'_station_ward'];assert(d?.closed);assert.equal(zone.station.facesRoom,(o?'50':'40')+'6');assert(Math.abs(d.root.position.x-(o+4))<.01);assert(Math.abs(d.root.position.z+8.6)<.01);assert(d.leaves.every(l=>l.material===zone.gf.materials.metal));});
 check(id+' nursing station is four-sided lower-wall/upper-glass box',()=>{assert.deepEqual(zone.station.glazedSides,['south','north','west','east']);assert(zone.station.lowerWallHeight>1);assert(zone.station.upperGlassHeight>1.5);});
 check(id+' nursing station has four oriented workstations',()=>{const work=zone.workstations.filter(w=>w.id.startsWith(prefix+'_station_'));assert.equal(work.length,4);for(const ws of work)assert.equal(ws.deskYaw,ws.yaw);});
 check(id+' nursing station has clinical props',()=>{const ids=new Set(zone.clinicalProps.map(p=>p.id));for(const suffix of ['medication_cart','treatment_cart','iv_pole','iv_bag','medication_cabinet','syringe_tray','sharps_container','stethoscope','white_coat','bp_device','pulse_oximeter','supply_boxes'])assert(ids.has(prefix+'_station_'+suffix),suffix);});
 check(id+' all nine ward-room knob doors default closed',()=>{for(const room of zone.roomAreas.filter(r=>r.kind==='ward')){assert.equal(room.doorType,'knob');assert(zone.keyedDoors[room.accessDoorId]?.closed,room.id);}});
 check(id+' entrance vestibule has storage and plant',()=>{const store=zone.roomAreas.find(r=>r.id==='STORE_ENTRY');assert(store);assert(zone.accessDoors[store.accessDoorId]?.closed||zone.keyedDoors[store.accessDoorId]?.closed);assert(zone.entrancePlant);});
}
zone=router.loadZone('second_campus_5f');
check('Second-campus V5.2 uses an always-open horn-lock duty room',()=>{assert(zone.roomAreas.some(r=>r.id==='SECOND_DUTY'&&r.label==='值班室'));assert.equal(zone.keyedDoors.second_duty_room?.closed,false);assert.equal(zone.keyedDoors.second_duty_room?.keepOpen,true);assert(zone.zoneGroup.getObjectByName('Second5F_DutyRoomDecor'));assert(!zone.roomAreas.some(r=>r.id==='DOCTOR'));});
check('Second-campus straight route reaches station then ward',()=>{zone.setWardGateClosed(false);zone.setInnerWardGateClosed(false);const d=zone.accessDoors.second_station_ward;d.setClosed(false);walk([72,1.7,3.2],[72,1.7,1]);walk([72,1.7,1],[72,1.7,-3]);walk([76,1.7,-7.3],[76,1.7,-9.8]);});
check('Second-campus glass bypass independently reaches ward',()=>{const d=zone.accessDoors.second_ward_glass;d.setClosed(false);walk([78,1.7,1],[78,1.7,-1.2]);});
zone=router.loadZone('first_campus_4f');
check('Duty-room cabinet doors face room, not wall',()=>{assert.equal(zone.dutyCabinetYaw,Math.PI);const source=zone.dutyCabinetAnchor;assert(source[2]<9.8);assert(!controller.checkCollision(source[0],source[2]-.9));});
check('Duty-room bathroom has knob door and real fixtures',()=>{assert(zone.keyedDoors.duty_bathroom?.closed);assert.deepEqual(zone.dutyBathroom.fixtures,['toilet','sink','mirror','towel_rail','floor_drain','shower']);});
check('Duty-room bathroom has V5.2 visual refinement',()=>{assert.equal(zone.dutyBathroom.visualRefinement,'V5_3_4F_SHOWER_TOILET');for(const detail of ['tile_wainscot','mirror_frame','soap_dispenser','toilet_paper','waste_bin','flush_button','exhaust_grille','bath_mat'])assert(zone.dutyBathroom.details.includes(detail),detail);});
console.log(`SCREENSHOT ACCESS V5.2 REGRESSION PASS ${assertions}/${assertions}`);
