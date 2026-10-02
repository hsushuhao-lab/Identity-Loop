import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const ANNIE_ASSET_STATES=Object.freeze({STORAGE_STATIC:'STORAGE_STATIC',BRIDGE_MANIFEST:'BRIDGE_MANIFEST',FLOOR6_CPR:'FLOOR6_CPR'});
export const ANNIE_ASSET_URL=`${import.meta.env?.BASE_URL??'/'}assets/characters/annie/annie-trainer.glb`;
const cache=new Map();

export function isAnnieAssetReady(url=ANNIE_ASSET_URL){return cache.get(url)?.loaded===true;}

/** Prefetch the real GLB + its PBR textures before a zone's synchronous factory. */
export function preloadAnnieAsset({url=ANNIE_ASSET_URL,manager}={}) {
  if(cache.has(url))return cache.get(url).promise;
  const entry={users:0,loaded:false};cache.set(url,entry);
  entry.promise=new GLTFLoader(manager).loadAsync(url).then(gltf=>{
    gltf.scene.traverse(o=>{if(o.geometry)o.geometry.userData.sharedAsset=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.userData.sharedAsset=true;for(const v of Object.values(m))if(v?.isTexture)v.userData.sharedAsset=true;}});
    entry.gltf=gltf;entry.loaded=true;return gltf;
  }).catch(error=>{cache.delete(url);throw error;});return entry.promise;
}

/** Returns a stable root immediately. Await root.userData.ready before revealing
 * a zone/retiring a fallback. Async completion respects event-driven visibility.
 * Model, rig, lights and story state are independent of the main scene factory. */
export function createAnnieAsset(parent,{state='STORAGE_STATIC',position=[0,0,0],rotationY=0,posture='seated',stool=true,url=ANNIE_ASSET_URL}={}) {
  if(!Object.values(ANNIE_ASSET_STATES).includes(state))throw new TypeError('Unknown Annie asset state');
  const root=new THREE.Group();root.name='Annie_AssetRoot';root.position.set(...position);root.rotation.y=rotationY;
  const resources={disposed:false,materials:new Set(),geometries:new Set(),skeletons:new Set(),entry:null};
  root.userData={characterId:'ANNIE_CPR_TRAINING_MANNEQUIN',aggressor:false,state,assetVersion:1,assetResources:resources};
  root.userData.disposeArt=()=>disposeAnnieAsset(root,{remove:false});
  root.userData.updateCharacter=delta=>updateAnnieAsset(root,delta);
  const initialize=gltf=>{
    if(resources.disposed)return root;
    const entry=cache.get(url);entry.users++;resources.entry=entry;
    const model=clone(gltf.scene);model.name='Annie_ContinuousModel';root.add(model);
    const bones={};model.traverse(o=>{
      if(o.isBone)bones[o.userData.sourceBone??o.name.replace('AnnieBone_','')]=o;
      if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;
        o.material=o.material.clone();o.material.userData.sharedAsset=true;o.material.userData.annieAssetOwned=true;resources.materials.add(o.material);
        if(o.skeleton)resources.skeletons.add(o.skeleton);}
    });
    bones.head.name='Annie_Head';
    bones.spine_01.name='Annie_Rig_UpperBody';bones.hand_l.name='Annie_HandStack_Bottom';bones.hand_r.name='Annie_HandStack_Top';
    const seated=state==='STORAGE_STATIC'&&posture!=='standing';
    root.userData.rig={model,bones,head:bones.head,upperBody:bones.spine_01,elapsed:0,compression:0,seated,basePelvisY:bones.pelvis.position.y};
    pose(root);
    if(seated&&stool)makeStool(root,resources);
    else {const anchor=new THREE.Group();anchor.name='Annie_Stool';anchor.visible=false;root.add(anchor);}
    root.updateMatrixWorld(true);return root;
  };
  // A prefetched factory initializes synchronously, keeping existing named rig
  // anchors available during zone construction. The promise remains awaitable.
  const cached=cache.get(url);
  root.userData.ready=cached?.loaded?Promise.resolve(initialize(cached.gltf)):preloadAnnieAsset({url}).then(initialize);
  parent?.add(root);return root;
}

function direction(model,bone,target){
  model.updateMatrixWorld(true);
  const from=model.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const rest=new THREE.Vector3(...bone.userData.restDirection).normalize();
  const desired=new THREE.Vector3(...target).sub(from).normalize();
  const modelQ=model.getWorldQuaternion(new THREE.Quaternion());
  const worldQ=new THREE.Quaternion().setFromUnitVectors(rest,desired).premultiply(modelQ);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQ));
}
function point(model,bone){model.updateMatrixWorld(true);return model.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));}
function reachArm(model,upper,lower,hand,target,side){
  const shoulder=point(model,upper),elbow=point(model,lower),wrist=point(model,hand);
  const first=shoulder.distanceTo(elbow),second=elbow.distanceTo(wrist),goal=new THREE.Vector3(...target),axis=goal.clone().sub(shoulder);
  const distance=THREE.MathUtils.clamp(axis.length(),Math.abs(first-second)+.001,first+second-.001);axis.normalize();
  const along=(first*first-second*second+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,first*first-along*along));
  const bend=new THREE.Vector3(side,0,0);bend.addScaledVector(axis,-bend.dot(axis)).normalize();
  const joint=shoulder.clone().addScaledVector(axis,along).addScaledVector(bend,height);
  direction(model,upper,joint.toArray());direction(model,lower,goal.toArray());
}
function pose(root){
  const {model,bones:b,seated}=root.userData.rig,state=root.userData.state;
  if(seated){
    // Grounded knees/ankles; all limbs bend the actual anatomical skin.
    const hip=point(model,b.pelvis);b.Root.position.y+=.525-hip.y;
    for(const side of ['l','r']){
      const sign=side==='l'?1:-1;
      direction(model,b['thigh_'+side],[sign*.13,.50,.39]);
      direction(model,b['calf_'+side],[sign*.135,.065,.34]);
      const ankle=point(model,b['foot_'+side]);direction(model,b['foot_'+side],[ankle.x,ankle.y-.024,ankle.z+.16]);
    }
  }else if(state==='FLOOR6_CPR'){
    // Bed-height trainer stance: feet stay planted while the torso reaches over
    // the existing target. Kneeling would put adult shoulders below this bed.
    b.spine_01.rotation.x=.82;b.spine_02.rotation.x=.10;b.head.rotation.x=.08;
  }
  model.updateMatrixWorld(true);
  for(const side of ['l','r']){
    const sign=side==='l'?1:-1,shoulder=point(model,b['upperarm_'+side]);
    if(state==='FLOOR6_CPR'){
      // Reach the actual bed contact plane with anatomical arm lengths. The
      // wrists stack; elbows bend outward while the feet/root stay planted.
      reachArm(model,b['upperarm_'+side],b['lowerarm_'+side],b['hand_'+side],[sign*.012,.98+(side==='r'?.006:0),.75],sign);
      const h=point(model,b['hand_'+side]);direction(model,b['hand_'+side],[h.x-sign*.012,h.y-.035,h.z+.11]);
      for(const finger of ['index','middle','ring','pinky'])for(let i=1;i<=3;i++)b[`${finger}_0${i}_${side}`].rotation.x=.10;
      continue;
    }
    const elbow=seated?[sign*.24,shoulder.y-.26,.12]:state==='BRIDGE_MANIFEST'?[sign*.235,shoulder.y-.25,.14]:[sign*.235,shoulder.y-.26,.025];
    direction(model,b['upperarm_'+side],elbow);
    const e=point(model,b['lowerarm_'+side]);
    const hand=seated?[sign*.095,.62,.30]:state==='BRIDGE_MANIFEST'?[sign*.055,e.y-.13,e.z+.23]:[sign*.105,e.y-.19,e.z+.13];
    direction(model,b['lowerarm_'+side],hand);
    const h=point(model,b['hand_'+side]);
    direction(model,b['hand_'+side],seated?[h.x-sign*.024,h.y-.024,h.z+.12]:state==='BRIDGE_MANIFEST'?[h.x-sign*.095,h.y-.024,h.z+.035]:[h.x-sign*.01,h.y-.115,h.z+.025]);
    // Mild bend in sculpted finger segments, static molded hands.
    for(const finger of ['index','middle','ring','pinky'])for(let i=1;i<=3;i++)b[`${finger}_0${i}_${side}`].rotation.x=.10;
  }
  root.userData.rig.baseRootY=b.Root.position.y;
  root.userData.rig.baseSpineY=b.spine_01.position.y;
  root.userData.rig.baseSpineX=b.spine_01.rotation.x;
  root.updateMatrixWorld(true);
}
function makeStool(root,resources){
  const parts=[],seat=new THREE.CylinderGeometry(.17,.17,.035,24);seat.translate(0,.478,-.055);parts.push(seat);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3,g=new THREE.CylinderGeometry(.012,.013,.445,8);g.translate(Math.sin(a)*.125,.237,Math.cos(a)*.125-.055);parts.push(g);}
  const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());geometry.userData.sharedAsset=true;resources.geometries.add(geometry);
  const material=new THREE.MeshStandardMaterial({color:0x555f5c,metalness:.35,roughness:.75});material.userData.sharedAsset=true;resources.materials.add(material);
  const stool=new THREE.Mesh(geometry,material);stool.name='Annie_Stool';root.add(stool);
}
export function updateAnnieAsset(root,delta){
  if(!Number.isFinite(delta)||delta<0)throw new TypeError('Annie delta must be finite and nonnegative');
  const rig=root?.userData.rig;if(!rig||root.userData.assetResources.disposed||root.userData.state==='STORAGE_STATIC')return;
  rig.elapsed+=Math.min(delta,.1);
  if(root.userData.state==='BRIDGE_MANIFEST'){
    rig.bones.head.rotation.y=Math.sin(rig.elapsed*.3)*.045;
  }else{
    const press=Math.pow(Math.max(0,Math.sin(rig.elapsed*110/60*Math.PI*2)),3);rig.compression=press;
    rig.bones.spine_01.position.y=rig.baseSpineY-.035*press;rig.bones.spine_01.rotation.x=rig.baseSpineX+.035*press;
  }
}
export function inspectAnnieAsset(root){
  let meshes=0,triangles=0,geometryBytes=0,lights=0;const textures=new Set(),arrays=new Set();
  root.traverseVisible(o=>{if(o.isLight)lights++;if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;
    if(o.geometry.index)arrays.add(o.geometry.index.array);
    for(const a of Object.values(o.geometry.attributes))arrays.add(a.isInterleavedBufferAttribute?a.data.array:a.array);
    for(const v of Object.values(o.material))if(v?.isTexture)textures.add(v);}});
  // glTF interleaves float and uint skin attributes in the same bufferView.
  // Count the byte-range union, not both typed views of the same GPU data.
  const ranges=new Map();for(const a of arrays){if(!ranges.has(a.buffer))ranges.set(a.buffer,[]);ranges.get(a.buffer).push([a.byteOffset,a.byteOffset+a.byteLength]);}
  for(const list of ranges.values()){list.sort((a,b)=>a[0]-b[0]);let start=-1,end=-1;for(const [s,e]of list){if(s>end){if(end>=0)geometryBytes+=end-start;start=s;end=e;}else end=Math.max(end,e);}if(end>=0)geometryBytes+=end-start;}
  return {meshes,triangles,geometryBytes,lights,bones:Object.keys(root.userData.rig?.bones??{}).length,textures:textures.size,
    textureBytes:[...textures].reduce((n,t)=>n+(t.image?.width??0)*(t.image?.height??0)*4*4/3,0)};
}
export function disposeAnnieAsset(root,{remove=true}={}){
  const r=root?.userData.assetResources;if(!r||r.disposed)return;r.disposed=true;
  root.traverse(o=>{if(o.material?.userData.annieAssetOwned)r.materials.add(o.material);});
  r.materials.forEach(m=>m.dispose());r.geometries.forEach(g=>g.dispose());r.skeletons.forEach(s=>s.dispose());
  if(r.entry)r.entry.users--;root.clear();if(remove)root.removeFromParent();
}
/** Explicit application teardown, only after every instance is disposed. */
export function clearAnnieAssetCache(){
  if([...cache.values()].some(e=>e.users||!e.loaded))throw new Error('Annie assets still loading or in use');
  for(const e of cache.values()){
    const geometries=new Set(),materials=new Set(),textures=new Set();e.gltf.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v);}});
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }cache.clear();
}
