import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {instantiateAsset,preloadAssetNames,getAssetReadiness,unregisterPendingAssetInstances} from '../src/art/AssetRegistry.js';
import {preloadMaterialSurfaces,isMaterialSurfaceReady,materialForSurface} from '../src/art/MaterialRegistry.js';
const originalModel=GLTFLoader.prototype.loadAsync,originalTexture=THREE.TextureLoader.prototype.loadAsync;
let releaseModel,modelCalls=0,textureCalls=0,failModel=true,failTexture=true;
GLTFLoader.prototype.loadAsync=async()=>{
 modelCalls++;
 if(failModel){failModel=false;throw new Error('temporary model failure');}
 await new Promise(resolve=>releaseModel=resolve);
 const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,2,1),new THREE.MeshStandardMaterial()));return {scene};
};
THREE.TextureLoader.prototype.loadAsync=async()=>{
 textureCalls++;
 if(failTexture){failTexture=false;throw new Error('temporary texture failure');}
 const texture=new THREE.Texture();texture.image={width:2,height:2};return texture;
};
try{
 await assert.rejects(preloadAssetNames(['officeChair']),/temporary model failure/);
 assert.equal(getAssetReadiness(['officeChair'])[0].pending,false);
 const chair=instantiateAsset('officeChair');chair.position.set(2,3,4);chair.rotation.y=.5;chair.scale.set(2,2,2);
 const detached=instantiateAsset('officeChair');unregisterPendingAssetInstances(detached);
 // Node structural QA deliberately does not auto-fetch on instantiateAsset.
 // Explicitly start the retry before releasing the mocked loader.
 const retry=preloadAssetNames(['officeChair']);
 await new Promise(resolve=>setImmediate(resolve));releaseModel();await retry;
 assert.equal(modelCalls,2);assert.equal(chair.children.length,1);assert.equal(detached.children.length,0);
 assert.deepEqual(chair.position.toArray(),[2,3,4]);assert.deepEqual(chair.scale.toArray(),[2,2,2]);assert.equal(chair.rotation.y,.5);
 assert.equal(chair.userData.pendingAsset,undefined);
 assert.deepEqual(getAssetReadiness(['officeChair']),[{name:'officeChair',ready:true,pending:false,pendingInstanceCount:0}]);
 const wall=materialForSurface('wall',2,2);
 await assert.rejects(preloadMaterialSurfaces(['plaster']),/temporary texture failure/);
 assert.equal(isMaterialSurfaceReady('plaster'),false);
 await preloadMaterialSurfaces(['plaster']);assert(isMaterialSurfaceReady('plaster'));
 assert(wall.map&&wall.normalMap&&wall.roughnessMap);
 const count=textureCalls;await preloadMaterialSurfaces(['plaster']);assert.equal(textureCalls,count);
 console.log('PASS: transient failures retry, indoor furniture resolves in place, detached containers remain empty, PBR clones refresh');
}finally{GLTFLoader.prototype.loadAsync=originalModel;THREE.TextureLoader.prototype.loadAsync=originalTexture;}
