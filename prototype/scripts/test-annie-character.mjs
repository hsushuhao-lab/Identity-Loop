import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAnnieCharacter,updateAnnieCharacter,disposeAnnieCharacter,inspectAnnieCharacter,ANNIE_CHARACTER_STATES,ANNIE_CHARACTER_BUDGET} from '../src/art/AnnieCharacter.js';
import {disposeZoneArt} from '../src/art/ArtResources.js';
const stats=[];
for(const state of Object.values(ANNIE_CHARACTER_STATES)){
 const parent=new THREE.Group();const actor=createAnnieCharacter(parent,{state,position:[5,0,-2],rotationY:.6});
 assert.equal(actor.userData.characterId,'ANNIE_CPR_TRAINING_MANNEQUIN');assert.equal(actor.userData.aggressor,false);
 for(const name of ['Annie_Head','Annie_Rig_UpperBody','Annie_Cuff_-1','Annie_Cuff_1','Annie_HandStack_Bottom','Annie_HandStack_Top'])assert(actor.getObjectByName(name),name);
 assert(!actor.getObjectByName('Annie_ElbowTeachingHinge_-1'));assert(!actor.getObjectByName('Annie_KneeTeachingHinge_-1'));
 const budget=inspectAnnieCharacter(actor);assert(budget.meshes<=ANNIE_CHARACTER_BUDGET.maxDraws);assert(budget.triangles<=ANNIE_CHARACTER_BUDGET.maxTriangles);assert(budget.geometryBytes<=ANNIE_CHARACTER_BUDGET.maxGeometryBytes);assert.equal(budget.lights,0);assert.equal(budget.textures,3);stats.push({state,...budget});
 actor.traverse(o=>{if(o.isMesh){assert([...o.geometry.attributes.position.array].every(Number.isFinite));assert([...o.geometry.attributes.normal.array].every(Number.isFinite));assert.equal(o.geometry.groups.length,0);}});
 const resources=actor.userData.characterResources;assert.equal([...resources.textures].reduce((sum,t)=>sum+t.image.data.byteLength,0),ANNIE_CHARACTER_BUDGET.textureBytesRGBA);
 const rig=actor.userData.rig,initial=rig.upperBody.position.clone(),initialHead=rig.head.quaternion.clone();
 let maximum=0;
 for(let i=0;i<600;i++){updateAnnieCharacter(actor,.01);maximum=Math.max(maximum,rig.compression);assert(rig.baseUpperBodyY-rig.upperBody.position.y<=.040001);}
 if(state==='STORAGE_STATIC'){assert(rig.upperBody.position.equals(initial));assert(rig.head.quaternion.equals(initialHead));assert.equal(rig.elapsed,0);assert(actor.getObjectByName('Annie_Stool'));}
 if(state==='BRIDGE_MANIFEST'){assert(Math.abs(rig.head.rotation.y)<=.006001);assert(Math.abs(rig.upperBody.rotation.z)<=.003001);assert(!rig.head.quaternion.equals(initialHead));}
 if(state==='FLOOR6_CPR'){assert(maximum>.99);assert.equal(rig.head.rotation.y,0);}
 assert.throws(()=>updateAnnieCharacter(actor,NaN),/finite/);
 const disposalCounts=[];for(const resource of [...resources.geometries,...resources.materials,...resources.textures]){const item={count:0};resource.addEventListener('dispose',()=>item.count++);disposalCounts.push(item);}
 disposeZoneArt(parent);assert.equal(parent.children.length,0);assert(disposalCounts.every(x=>x.count===1),'all resources released once through zone cleanup');
 disposeAnnieCharacter(actor);assert(disposalCounts.every(x=>x.count===1));
}
const actor=createAnnieCharacter(null,{cuffColor:0x4c6880});
assert.equal(actor.getObjectByName('Annie_Cuff_-1').material.color.getHex(),0x4c6880);
assert.notEqual(actor.getObjectByName('Annie_Cuff_-1').material,actor.getObjectByName('Annie_Cuff_1').material,'cuffs remain individually tintable');
const head=actor.getObjectByName('Annie_Head');head.rotation.y=.2;assert.equal(head.rotation.y,.2);
const cuff=actor.getObjectByName('Annie_Cuff_-1');cuff.material=cuff.material.clone();cuff.material.color.setHex(0x4c6880);
let cuffCloneDisposed=0;cuff.material.addEventListener('dispose',()=>cuffCloneDisposed++);
const bounds=new THREE.Box3().setFromObject(actor);assert(bounds.min.y>=-.0001);assert(bounds.max.y<1.48,'adult seated silhouette');
disposeAnnieCharacter(actor);assert.equal(cuffCloneDisposed,1,'existing 5F cuff clone is also owned and released');assert.throws(()=>createAnnieCharacter(null,{state:'invented'}),/Unsupported/);
const cart=createAnnieCharacter(null,{posture:'standing',contactShadow:false});
assert(cart.getObjectByName('Annie_Stool'));assert.equal(cart.getObjectByName('Annie_Stool').visible,false);
assert(new THREE.Box3().setFromObject(cart).max.y<1.66);cart.rotation.z=Math.PI/2;updateAnnieCharacter(cart,.1);disposeAnnieCharacter(cart);
console.log('PASS AnnieCharacter: story metadata, named anchors, three poses, bounded animation, static mannequin, original texture budget, finite geometry, independent cuffs and exactly-once zone teardown');console.log(JSON.stringify(stats));
