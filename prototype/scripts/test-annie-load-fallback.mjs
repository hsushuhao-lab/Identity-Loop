import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {preloadAnnieArt,createAnnieArt} from '../src/art/AnnieArt.js';
import {isAnnieAssetReady,clearAnnieAssetCache} from '../src/art/AnnieAsset.js';
import {disposeZoneArt} from '../src/art/ArtResources.js';
const original=GLTFLoader.prototype.loadAsync,warning=console.warn;
let calls=0,resolveLoad;
GLTFLoader.prototype.loadAsync=async()=>{calls++;if(calls===1)throw Error('offline');return await new Promise(resolve=>resolveLoad=()=>resolve({scene:new THREE.Group()}));};
console.warn=()=>{};
try{
 assert.equal(await preloadAnnieArt({timeoutMs:30}),false);assert.equal(isAnnieAssetReady(),false);
 const parent=new THREE.Group(),trainer=createAnnieArt(parent,{state:'STORAGE_STATIC'});
 assert(trainer.userData.characterResources);assert(trainer.getObjectByName('Annie_Head'));
 assert.equal(await preloadAnnieArt({timeoutMs:20}),false);assert.equal(calls,2,'failure cache must allow retry');
 assert.equal(isAnnieAssetReady(),false);assert.throws(()=>clearAnnieAssetCache(),/loading/);
 const before=trainer.children.slice();resolveLoad();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(isAnnieAssetReady(),true);assert.deepEqual(trainer.children,before,'late detail cannot rewrite a visible fallback or its encounter');
 disposeZoneArt(parent);assert.equal(parent.children.length,0);clearAnnieAssetCache();assert.equal(isAnnieAssetReady(),false);
 console.log('PASS Annie optional failure/retry/deadline, playable stable fallback, late completion and cache cleanup');
}finally{GLTFLoader.prototype.loadAsync=original;console.warn=warning;}
