import assert from 'node:assert/strict';
import * as THREE from 'three';
import {WorldRouter} from './src/world/WorldRouter.js';

const context=new Proxy({measureText:t=>({width:t.length*20})},{get:(o,k)=>o[k]||(()=>({addColorStop(){}}))});
global.document={
  querySelector:()=>null,
  addEventListener(){},
  createElement:(tag)=>tag==='canvas'?{width:0,height:0,getContext:()=>context}:{getContext:()=>context}
};

const router=new WorldRouter(new THREE.Scene(),new THREE.PerspectiveCamera(),null);
const zone=router.loadZone('first_campus_3f');

assert.equal(zone.explorationArea?.id,'3F_ELEVATOR_LOBBY');
assert.deepEqual(zone.explorationArea.bounds,[-12,-3.5,-4,3.5]);
assert.equal(zone.secretArchive?.bookshelfCount,4);
assert.equal(zone.secretArchive?.documentIds.length,5);
assert(zone.keyedDoors['3F_ARCHIVE_DOOR']?.closed,'Museum keyed door must default closed');
assert.equal(zone.secretArchive?.requires,'ARCHIVE_ACCESS_KEY');
assert(zone.levelInstance?.officeDoorLeaf?.userData?.type==='office_316_door','316 office must begin as a locked interactive door');
assert(zone.spareKeyMesh?.userData?.type==='spare_key_316','316 guard-patrol spare-key interaction missing');
assert.equal(zone.guardPatrolPoint?.opposite,'3F_ARCHIVE_DOOR');
assert(zone.levelInstance?.lockerMesh?.userData?.type==='locker_316','316 keypad locker interaction missing');
assert(zone.levelInstance?.credentialDrawerMesh?.userData?.type==='credential_drawer_316','316 under-desk credential drawer missing');

const docs=zone.interactables.filter(o=>o.userData?.type==='archive_document');
assert.equal(docs.length,11,'3F must expose five museum files, the interactive history-photo wall, two office secrets and three 1F hint files');
assert.equal(zone.officeSecrets?.count,2,'316 must contain two optional secret clues');
assert(zone.secretArchive?.documentIds.includes('ARCHIVE_PERSONNEL_1998'),'3F archive must include the 1998 4+3 personnel file');
assert(zone.interactables.some(o=>o.userData?.id==='ARCHIVE_HISTORY_PHOTO_WALL'),'3F archive must expose the history photo wall for the Zhang post-B2 route');
assert.equal(zone.secretArchive?.documentIds.length,5);
for(const doc of docs){
  assert(doc.userData.documentTitle);
  assert(doc.userData.pages.length>=2);
  assert.match(doc.userData.label,/翻閱/);
}
assert.equal(zone.levelInstance?.office302?.code,'3082');
assert.equal(zone.levelInstance?.office302Keypad?.userData?.type,'office_302_keypad');
assert.equal(zone.levelInstance?.office302Clue?.userData?.type,'office_302_inspect');
assert.deepEqual(zone.levelInstance?.office302?.bulletin,[-6.35,1.73,-3.18]);
assert.equal(zone.levelInstance?.museumKey302?.userData?.type,'museum_key_302');
assert.equal(zone.levelInstance?.storageRoom?.anne,true);
assert.equal(zone.levelInstance?.anneStage,0);
assert(zone.levelInstance?.storageDoor,'Storage-room door missing');
assert(zone.levelInstance?.anneStool,'Anne stage-2 stool missing');
assert.equal(zone.levelInstance?.phoneMesh?.userData?.type,'office_phone_316');
assert.equal(zone.coreOffice3F?.relativeTo4FDutyRoom,true);
assert.equal(zone.coreOffice3F?.doorId,'3F_ADMIN_OFFICE_DOOR');
assert.equal(zone.coreOffice3F?.taskId,'3F_ADMIN_ROSTER_TASK');
assert(zone.keyedDoors['3F_ADMIN_OFFICE_DOOR']?.closed,'3F administrative office door must default closed');
assert(zone.interactables.some(o=>o.userData?.type==='admin_roster_3f'),'3F administrative office roster task missing');
assert(zone.interactables.some(o=>o.userData?.type==='admin_printer_doc_3f'),'3F administrative office future printer document missing');
assert(zone.interactables.some(o=>o.userData?.type==='admin_drawer_manual_3f'),'3F administrative office secretary memo missing');
assert.deepEqual(zone.adminRosterTask?.pieces,['3F_ADMIN_ROSTER_TASK','3F_ADMIN_PRINTER_DOC','3F_ADMIN_DRAWER_MANUAL']);

for(const name of ['AdminDesk_Printer','AdminDesk_MonitorBase','AdminDesk_Keyboard']){
  const obj=zone.zoneGroup.getObjectByName(name);
  assert(obj,`${name} missing`);
  const box=new THREE.Box3().setFromObject(obj);
  assert(Math.abs(box.min.y-.82)<.006,`${name} must physically touch the .82m desk surface; got bottom ${box.min.y}`);
}
const printerTopBox=new THREE.Box3().setFromObject(zone.zoneGroup.getObjectByName('AdminDesk_PrinterTop'));
const printerPaperBox=new THREE.Box3().setFromObject(zone.zoneGroup.getObjectByName('AdminDesk_PrinterPaper'));
assert(Math.abs(printerPaperBox.min.y-printerTopBox.max.y)<.004,'Printer supplement sheet must sit on the printer output surface');

const storageRailClearance=new THREE.Box3(new THREE.Vector3(12.76,.96,2.20),new THREE.Vector3(14.24,1.14,2.40));
for(const name of ['RailNorthEast_WestOfStorage','RailNorthEast_EastOfStorage']){
  const rail=zone.zoneGroup.getObjectByName(name);
  assert(rail,`${name} missing`);
  assert(!new THREE.Box3().setFromObject(rail).intersectsBox(storageRailClearance),`${name} intrudes into CPR storage doorway clearance`);
}
assert.deepEqual(zone.coreOffice3F?.bounds,[-22,3.5,-16,11.5]);
assert.deepEqual(zone.coreOffice3F?.door,[-16,1.7,7.5]);

zone.levelInstance.unlock302();
const doorway302=new THREE.Box3(new THREE.Vector3(-9.82,.10,-4.05),new THREE.Vector3(-9.18,1.8,-3.28));
const blockers302=zone.colliders.filter(c=>c.intersectsBox(doorway302));
console.log('302 doorway blockers',blockers302.map(b=>({min:b.min.toArray(),max:b.max.toArray()})));
assert.equal(blockers302.length,0,'302 doorway must be physically passable after keypad unlock');

const coreOfficeDoorway=new THREE.Box3(new THREE.Vector3(-16.18,.10,7.15),new THREE.Vector3(-15.82,1.8,7.85));
const adminDoor=zone.keyedDoors['3F_ADMIN_OFFICE_DOOR'];
adminDoor.setClosed(false);
assert(!zone.colliders.some(c=>c.intersectsBox(coreOfficeDoorway)),'3F office doorway must be passable after the office door opens');

const storageDoorway=new THREE.Box3(new THREE.Vector3(13.05,.10,2.18),new THREE.Vector3(13.95,1.82,3.05));
const storageBlockers=zone.colliders.filter(c=>c.intersectsBox(storageDoorway));
assert.equal(storageBlockers.length,0,'Equipment storage-room doorway must not be blocked by wall or furniture colliders');
console.log('3F EXPLORATION + ARCHIVE QA PASS');
