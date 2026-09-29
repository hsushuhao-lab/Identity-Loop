import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {WorldRouter} from './src/world/WorldRouter.js';
import {gameState} from './src/core/GameState.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preloadAssetNames} from './src/art/AssetRegistry.js';

const context=new Proxy({measureText:t=>({width:t.length*20})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
global.document={
  querySelector:()=>null,
  addEventListener(){},
  createElement:(tag)=>tag==='canvas'?{width:0,height:0,getContext:()=>context}:{getContext:()=>context}
};

// Mirror production's essential-model readiness before measuring workstation bounds.
const originalLoad=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){
  const bytes=readFileSync(new URL('./public'+url,import.meta.url));
  return this.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
};
try{await preloadAssetNames(['officeChair','workDesk','storageCabinet','hospitalBed','bench','printer','plant']);}
finally{GLTFLoader.prototype.loadAsync=originalLoad;}

const router=new WorldRouter(new THREE.Scene(),new THREE.PerspectiveCamera(),null);

// 4F: paperwork must sit on the actual workstation tops; interaction sensors must face corridors/readers.
let zone=router.loadZone('first_campus_4f');
const wsA=zone.workstations.find(w=>w.id==='first_station_A');
const wsB=zone.workstations.find(w=>w.id==='first_station_B');
for(const [name,desk] of [['Bed33_HIS409Sheet',wsB?.desk],['Bed33_AssignmentForm',wsA?.desk]]){
  const obj=zone.zoneGroup.getObjectByName(name);
  assert(obj,`${name} missing`);
  const box=new THREE.Box3().setFromObject(obj);
  const expectedY=desk?new THREE.Box3().setFromObject(desk).max.y:.82;
  assert(Math.abs(box.min.y-expectedY)<.006,`${name} floats: bottom=${box.min.y}, deskTop=${expectedY}`);
}
assert.equal(zone.dutyDoor?.openDirection,1,'4F duty-room door must swing inward');
assert.equal(zone.dutyBathroomDoor?.openDirection,1,'4F bathroom door must swing inward');
for(const id of ['room_401','room_402','room_403','room_404','room_405','room_406'])assert.equal(zone.keyedDoors[id]?.openDirection,-1,id+' must swing toward the corridor');
for(const id of ['room_407','room_408'])assert.equal(zone.keyedDoors[id]?.openDirection,1,id+' must swing toward the corridor');
assert.equal(zone.keyedDoors['room_409']?.openDirection,-1,'sealed 409 keeps its inward swing');
const handoverBoard=zone.zoneGroup.getObjectByName('FourF_NursingHandoverBoard');
assert(handoverBoard,'4F handover board missing');
assert.deepEqual(handoverBoard.position.toArray(),[-2,1.78,-8.495],'4F handover board must be back on the original north wall');
const stationCabinet=zone.zoneGroup.children.find(object=>object.name==='ArtAsset/storageCabinet'&&Math.abs(object.position.x+3.6)<.01&&Math.abs(object.position.z+1.2)<.01);
assert.equal(stationCabinet,undefined,'green station cabinet must no longer intersect the workstation chair');
const architectureSource=readFileSync('./src/world/shared/PlanArchitecture.js','utf8');
assert(architectureSource.includes("const printerDesk=referenceStation?zone.workstations.find(w=>w.id===id+'_D'):null;"),'both reference nursing stations must use the open D workstation for the printer');
assert(architectureSource.includes('printer.position.y+=deskTop-new THREE.Box3().setFromObject(printer).min.y;'),'4F printer must be grounded against the loaded desk surface');
const dutyDesk=zone.workstations.find(w=>w.id==='duty_desk');
const dutyDeskTop=dutyDesk.desk?new THREE.Box3().setFromObject(dutyDesk.desk).max.y:.76;
assert(Math.abs(dutyDesk.screen.position.y-dutyDeskTop)<.002,'duty computer must sit on its desk top');
const dutyCup=dutyDesk.screen.getObjectByName('WorkstationCoffeeCup');
assert(dutyCup,'duty room must reuse the workstation coffee cup');
assert(dutyDesk.screen.getObjectByName('DutyRoom_HotCoffeeSteam'),'the single duty-room cup must have visible steam');
assert.equal(zone.zoneGroup.getObjectByName('DutyRoom_HotCoffee'),undefined,'duty room must not add a second coffee cup');
assert(zone.dutyPhone.getObjectByName('DutyPhoneHandset'),'duty phone must have a recognizable handset');
for(const object of [zone.dutyPhone,dutyCup]){
  const bounds=new THREE.Box3().setFromObject(object);
  assert(Math.abs(bounds.min.y-dutyDeskTop)<.002,`${object.name} must rest on the duty desk`);
}
assert(zone.interactables.some(object=>object.userData?.id==='4F_DUTY_COMPUTER'&&object.userData?.action==='END_SHIFT'),'21:00 rest must use the duty-room computer');
for(const room of zone.roomAreas.filter(r=>r.kind==='ward')){
  const door=zone.keyedDoors[room.accessDoorId];
  assert(door?.hitPanel,`${room.id} interaction sensor missing`);
  const sensor=door.hitPanel.getWorldPosition(new THREE.Vector3());
  const corridor=new THREE.Vector3(...room.corridor);
  const roomPoint=new THREE.Vector3(...room.point);
  assert(sensor.distanceTo(corridor)<sensor.distanceTo(roomPoint),`${room.id} interaction sensor must face the corridor`);
}
for(const id of ['first_ward','first_ward_inner','first_ward_glass','first_station_ward']){
  const door=zone.accessDoors[id];
  if(!door)continue;
  assert(door.readerSensor,`${id} must interact at the jamb reader, not the door leaf`);
  assert(door.leaves.every(leaf=>leaf.userData.interactable===false),`${id} leaves must not be fake reader targets`);
}

// 3F: admin door swings inward and 21:17 checkpoint is a two-step visible interaction.
gameState.resetForLoop();
zone=router.loadZone('first_campus_3f');
assert.equal(zone.keyedDoors['3F_ADMIN_OFFICE_DOOR']?.openDirection,1,'3F administrative-office door must swing inward');
gameState.setFlag('NIGHT_PATROL_RETURN_3F',true);
zone.applyGamePhase('Phase3_2117_NightPatrol',gameState);
assert.equal(zone.guardSign2117?.userData?.interactable,true,'21:17 checkpoint sign must be interactable');
assert.equal(zone.guardLog2117?.visible,true,'21:17 logbook must be physically visible');
assert.equal(zone.guardLog2117?.userData?.interactable,false,'21:17 logbook must require noticing the sign first');
assert(zone.guardSign2117.geometry.parameters.width>=1.5,'21:17 sign sensor must be large enough for first-person interaction');
assert(zone.guardLog2117.geometry.parameters.width>=1.1,'21:17 logbook sensor must not be a tiny paper-only target');
assert(zone.guardLog2117Visual?.visible===true,'21:17 visual logbook must be visible in night-patrol phase');

// 2F: the 00:33 terminal must be dormant during the first ER visit.
gameState.resetForLoop();
zone=router.loadZone('first_campus_2f');
const triageGlass=zone.zoneGroup.getObjectByName('ER_TriageCounter_GlassPartition');
assert(triageGlass,'2F triage glass divider missing');
assert.equal(triageGlass.position.z,3.125,'2F glass divider must sit at the counter front edge');
for(const id of ['ER_TriageMonitor_1','ER_TriageMonitor_2']){
  const screen=zone.zoneGroup.getObjectByName(id);
  assert(screen,`${id} missing`);
  assert.equal(screen.position.y,1.1425,`${id} base must align with the counter top`);
  assert.equal(screen.position.z,3.55,`${id} must sit behind the glass on the counter`);
}
assert.equal(zone.ghostRegistrationTerminal?.userData?.interactable,false,'00:33 terminal leaked before bootstrap');
assert(Math.abs(zone.ghostRegistrationTerminal.position.z+8.45)<.01,'00:33 terminal sensor must align with the doctor computer');
assert(zone.ghostRegistrationTerminal.geometry.parameters.width>=1.3,'00:33 terminal sensor must be easy to target');
gameState.setFlag('GHOST_REGISTRATION_AVAILABLE',true);
zone.syncStoryState();
assert.equal(zone.ghostRegistrationTerminal?.userData?.interactable,true,'00:33 terminal did not activate after the story gate');
assert.equal(zone.erNoteInteraction?.interactable,false,'completed ER-note prompt must not cover the 00:33 terminal');

// Second-campus transfer paperwork also belongs on a desk.
zone=router.loadZone('second_campus_5f');
const transfer=zone.zoneGroup.getObjectByName('SecondCampus_ChestTreatmentOrder');
assert(transfer,'Second-campus 409-A treatment order missing');
assert.equal(transfer.userData.id,'SECOND_CHEST_TRANSFER','Second-campus treatment order must preserve the story interaction id');
const orderDesk=zone.workstations.find(w=>w.id==='second_station_B').desk;
assert(Math.abs(new THREE.Box3().setFromObject(transfer).min.y-new THREE.Box3().setFromObject(orderDesk).max.y)<.005,'Second-campus treatment order must sit on the loaded workstation surface');

const signAnchor=readFileSync('./src/world/shared/SignAnchor.js','utf8');
assert(signAnchor.includes("header = '青嶺醫療中心 ｜ 臨床醫療區'"),'Default room signage must use the fictional Qingling name');
assert(!signAnchor.includes("header = '松德醫療中心"),'Default room signage must not expose the real-hospital name');

console.log('VISUAL GEOMETRY + STORY GATING CONTRACT QA PASS');
