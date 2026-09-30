import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {preloadAssetNames} from './src/art/AssetRegistry.js';
import {buildIdentityGoodEnding,ENDING_CODAS} from './src/story/IdentityGoodEndingScene.js';
import {disposeZoneArt} from './src/art/ArtResources.js';
const paint=new Proxy({},{get:()=>()=>{}});globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>paint})};
const original=GLTFLoader.prototype.loadAsync;
GLTFLoader.prototype.loadAsync=async function(url){const b=readFileSync(new URL('./public'+url,import.meta.url));return this.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
try{await preloadAssetNames(['workDesk','hospitalBed','officeChair']);}finally{GLTFLoader.prototype.loadAsync=original;}
const expected={LI:['LI_RedPen','LI_SeparateAmendment'],ZHANG:['ZHANG_OpeningDoor','ZHANG_BedsideRecord'],ZHOU:['ZHOU_LoweredCamera','ZHOU_DeliveredMemo'],CHEN:['CHEN_HaltedWheelchair','CHEN_CancelledOrder']};
const signatures=[];
for(const [id,names]of Object.entries(expected)){
 const set=buildIdentityGoodEnding(id);assert.equal(set.shots.length,3);assert.equal(set.scene.name,'IdentityGoodEnding_'+id);
 const moving=set.scene.getObjectByName(names[0]);assert(moving);assert(set.scene.getObjectByName(names[1]));
 set.update(0);const first=moving.matrixWorld.elements.slice();set.update(20);assert.notDeepEqual(moving.matrixWorld.elements,first,'scene action must actually move');
 for(const shot of set.shots){assert.notDeepEqual(shot.from,shot.to);assert(shot.line.length>10);}
 if(['LI','ZHOU'].includes(id)){
  const desk=new THREE.Box3().setFromObject(set.scene.getObjectByName('EndingDesk'));
  const props=id==='LI'?['LI_OriginalRecord','LI_SeparateAmendment','LI_RedPen','LI_Clock']:['ZHOU_LoweredCamera','ZHOU_DeliveredMemo','ZHOU_ReceivingTray'];
  for(const time of [0,11,24]){set.update(time);for(const name of props){
   const box=new THREE.Box3().setFromObject(set.scene.getObjectByName(name));
   assert.ok(box.min.x>=desk.min.x-.001&&box.max.x<=desk.max.x+.001&&box.min.z>=desk.min.z-.001&&box.max.z<=desk.max.z+.001,`${id} ${name} must stay over the physical tabletop at ${time}`);
   if(name.includes('Record')||name.includes('Amendment'))assert.ok(box.min.y-desk.max.y<.01,`${name} must rest on paper-height support`);
  }}
 }
 signatures.push(JSON.stringify({names,shots:set.shots,coda:ENDING_CODAS[id]}));disposeZoneArt(set.scene);assert.equal(set.scene.children.length,0);
}
assert.equal(new Set(signatures).size,4);
console.log('PASS four separate GLB/PBR ending sets: 12 camera shots, moving props, supported tabletop props, distinct coda data and scene disposal');
