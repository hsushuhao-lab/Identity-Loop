import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildEquipmentAttendant} from '../src/art/EquipmentAttendant.js';
const root=new THREE.Group(),actor=buildEquipmentAttendant(root),state={z:0,mode:'patrol'};
const snapshot=JSON.stringify(state);let meshes=0,triangles=0;
root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const v of o.geometry.attributes.position.array)assert(Number.isFinite(v),o.name);assert(!/Sphere|Capsule/.test(o.geometry.type),o.name);}});
assert(meshes<=32);assert(triangles<=5000);assert.equal(JSON.stringify(state),snapshot);
const bounds=new THREE.Box3().setFromObject(root);assert(bounds.max.y>=1.72&&bounds.max.y<=1.78);assert(bounds.max.x-bounds.min.x<.53);
const face=root.getObjectByName('Attendant_AdultFace');assert(face.geometry.boundingBox.max.y-face.geometry.boundingBox.min.y<.26);assert(face.geometry.boundingBox.min.z>-.11);
assert(root.getObjectByName('Attendant_FittedMask'));assert(root.getObjectByName('Attendant_TopSeams'));assert(root.getObjectByName('Attendant_WorkShoe_-1'));
assert.equal(root.getObjectsByProperty('isLight',true).length,0);assert(!JSON.stringify(root.userData).match(/LI|ZHANG|ZHOU|CHEN/));
actor.update(0,state,null,{heading:Math.PI});
let lowest=Infinity,highest=0,maxTurn=0,stanceFrames=0;
for(let i=0;i<720;i++){
 const old=root.rotation.y,direction=i<360?1:-1;state.z+=direction*.65/60;root.position.z=state.z;
 const before=JSON.stringify(state);actor.update(1/60,state,null,{heading:direction>0?Math.PI:0});assert.equal(JSON.stringify(state),before);
 const angle=Math.abs(Math.atan2(Math.sin(root.rotation.y-old),Math.cos(root.rotation.y-old)));maxTurn=Math.max(maxTurn,angle);assert(angle<=1.75/60+1e-7);
 root.updateMatrixWorld(true);let contact=false;
 for(const foot of actor.feet){const box=new THREE.Box3().setFromObject(foot);lowest=Math.min(lowest,box.min.y);highest=Math.max(highest,box.min.y);assert(box.min.y>=-.0001,'Foot penetrates floor: '+box.min.y);if(box.min.y<.02)contact=true;}
 if(contact)stanceFrames++;assert(contact,'Both feet floating');
 for(const target of actor.pose.footTargets)assert(target.lift<=.052+1e-7);
}
assert(stanceFrames===720);assert(highest>.035);assert(lowest<.009);
const walkingMotion=actor.pose.motion;
state.mode='inspect';for(let i=0;i<240;i++)actor.update(1/60,state,null,{heading:0});
assert(actor.pose.motion<.0001&&walkingMotion>.99);assert(Math.abs(root.rotation.y+Math.PI/2)<.001);assert(actor.torso.rotation.x<-.09);assert(actor.head.rotation.x<-.17);assert(actor.elbows[1].rotation.x>.42);
root.updateMatrixWorld(true);for(const foot of actor.feet){const box=new THREE.Box3().setFromObject(foot);assert(box.min.y>=0&&box.min.y<.015);}
// Idle breathing must remain small; tiny camera frames cannot create gait.
const phase=actor.pose.phase;for(let i=0;i<120;i++)actor.update(1/60,state,{x:2,z:state.z});assert.equal(actor.pose.phase,phase);
assert(Math.abs(actor.torso.position.y)<=.0013);assert(Math.abs(actor.head.rotation.y)<=.48);
assert.equal(root.getObjectByName('Attendant_FootContact_-1').material.depthWrite,false);
console.log('EQUIPMENT_ATTENDANT PASS',JSON.stringify({meshes,triangles,height:bounds.max.y,lowestFoot:lowest,highestFoot:highest,maxTurn,stanceFrames}));

