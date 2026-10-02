import assert from 'node:assert/strict';
import * as THREE from 'three';
import {batchStaticWardBeds} from '../src/art/StaticWardBeds.js';
const zone={zoneGroup:new THREE.Group()};zone.zoneGroup.position.set(72,0,4);
const geometry=new THREE.BoxGeometry(1,1,2),material=new THREE.MeshStandardMaterial();
const beds=[];
for(let i=0;i<4;i++){
 const bed=new THREE.Group();bed.name=`Bed_401${'ABCD'[i]}`;bed.position.set(i*2,0,-3);bed.rotation.y=i*Math.PI/2;
 const mesh=new THREE.Mesh(geometry,material);mesh.position.set(.1,.5,0);bed.add(mesh);zone.zoneGroup.add(bed);beds.push({bed,mesh});
}
const dynamic=new THREE.Mesh(geometry,material);dynamic.name='ClinicalPatient';zone.zoneGroup.add(dynamic);
zone.zoneGroup.updateMatrixWorld(true);const before=beds.map(b=>b.mesh.matrixWorld.clone());
assert.equal(batchStaticWardBeds(zone),true);assert.equal(dynamic.visible,true);
assert.deepEqual(zone.staticBedBatchStats,{beds:4,originals:4,batches:1});
const root=zone.zoneGroup.getObjectByName('StaticWardBedBatches'),batch=root.children[0];zone.zoneGroup.updateMatrixWorld(true);
for(let i=0;i<4;i++){const matrix=new THREE.Matrix4();batch.getMatrixAt(i,matrix);matrix.premultiply(batch.matrixWorld);assert(matrix.elements.every((v,n)=>Math.abs(v-before[i].elements[n])<1e-6));assert.equal(beds[i].mesh.visible,false);assert.equal(beds[i].bed.name,`Bed_401${'ABCD'[i]}`);}
const ray=new THREE.Raycaster(new THREE.Vector3(72.1,3,1),new THREE.Vector3(0,-1,0));assert(ray.intersectObject(batch).length>0,'instanced beds retain occlusion raycasts');
assert.equal(batchStaticWardBeds(zone),true);assert.equal(root.children.length,1);
const waiting={zoneGroup:new THREE.Group()},pending=new THREE.Group();pending.name='Bed_401A';pending.userData.pendingAsset='hospitalBed';waiting.zoneGroup.add(pending);
assert.equal(batchStaticWardBeds(waiting),false);assert.equal(waiting.staticBedBatchComplete,undefined);
console.log('PASS static beds: exact world transforms, preserved metadata/dynamic objects, raycasts, idempotence and pending-asset guard');
