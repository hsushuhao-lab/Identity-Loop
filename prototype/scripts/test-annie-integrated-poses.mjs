import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {preloadAnnieAsset,clearAnnieAssetCache} from '../src/art/AnnieAsset.js';
import {createAnnieArt,updateAnnieArt} from '../src/art/AnnieArt.js';
import {disposeZoneArt} from '../src/art/ArtResources.js';
globalThis.ProgressEvent??=class extends Event{constructor(t,p){super(t);Object.assign(this,p);}};
const bytes=await readFile(new URL('../public/assets/characters/annie/annie-trainer.glb',import.meta.url)),length=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+length).toString());
doc.buffers[0].uri='data:application/octet-stream;base64,'+bytes.subarray(28+length).toString('base64');
delete doc.images;delete doc.textures;delete doc.materials;for(const mesh of doc.meshes)for(const p of mesh.primitives)delete p.material;
const gltf=await new GLTFLoader().parseAsync(JSON.stringify(doc),'');
const original=GLTFLoader.prototype.loadAsync;GLTFLoader.prototype.loadAsync=async()=>gltf;
try{
 await preloadAnnieAsset();
 for(const state of ['STORAGE_STATIC','BRIDGE_MANIFEST','FLOOR6_CPR']){
  const parent=new THREE.Group(),a=createAnnieArt(parent,{state,position:[1.42,0,-7.3],rotationY:-Math.PI/2}),r=a.userData.rig;
  assert.equal(Object.keys(r.bones).length,53);assert.equal(r.head.parent.isBone,true,'preserve skin hierarchy');
  const feet=['foot_l','foot_r'].map(n=>r.bones[n].getWorldPosition(new THREE.Vector3())),head=r.head.quaternion.clone();
  let maximum=0;for(let i=0;i<600;i++){updateAnnieArt(a,.01);a.updateMatrixWorld(true);maximum=Math.max(maximum,r.compression);for(let j=0;j<2;j++)assert(r.bones[['foot_l','foot_r'][j]].getWorldPosition(new THREE.Vector3()).distanceTo(feet[j])<1e-9);}
  if(state==='STORAGE_STATIC'){assert(r.head.quaternion.equals(head));assert.equal(r.elapsed,0);}
  if(state==='BRIDGE_MANIFEST'){assert(Math.abs(r.head.rotation.y)<=.045001);assert(!r.head.quaternion.equals(head));}
  if(state==='FLOOR6_CPR'){
   assert(maximum>.99);const hands=['Annie_HandStack_Bottom','Annie_HandStack_Top'].map(n=>a.getObjectByName(n).getWorldPosition(new THREE.Vector3()));
   assert(hands.every(p=>p.y>.94&&p.y<1),'wrists align with existing bed contact plane');assert(Math.abs(hands[0].z-hands[1].z)<.075,'hands overlap around chest');
  }
  const owned=[...a.userData.assetResources.materials,...a.userData.assetResources.skeletons,...a.userData.assetResources.geometries],counts=owned.map(resource=>{let count=0;const dispose=resource.dispose.bind(resource);resource.dispose=()=>{count++;dispose();};return ()=>count;});
  disposeZoneArt(parent);assert(counts.every(get=>get()===1));assert.equal(parent.children.length,0);assert.equal(a.userData.assetResources.disposed,true);
 }
 clearAnnieAssetCache();console.log('PASS actual GLB integrated anchors, three poses, bed contact, planted feet, bounded motion and owned cleanup');
}finally{GLTFLoader.prototype.loadAsync=original;}
