import * as THREE from 'three';

// Opt-in batching for fixed ward bed visuals only. Clinical plaques, doors,
// patients, bed metadata and collision remain independent scene objects.
export function batchStaticWardBeds(zone) {
  if (zone.staticBedBatchComplete) return true;
  const beds = zone.zoneGroup.children.filter(o=>/^Bed_\d{3}[A-D]$/.test(o.name));
  if (!beds.length || beds.some(b=>b.userData.pendingAsset || !b.children.length)) return false;
  const buckets = new Map();
  zone.zoneGroup.updateMatrixWorld(true);
  const inverse = zone.zoneGroup.matrixWorld.clone().invert();
  for (const bed of beds) bed.traverse(mesh=>{
    if (!mesh.isMesh || mesh.isSkinnedMesh || mesh.isInstancedMesh || Array.isArray(mesh.material) || mesh.material.transparent || mesh.morphTargetInfluences) return;
    for(let parent=mesh;parent && parent!==bed.parent;parent=parent.parent)if(!parent.visible)return;
    const key = `${mesh.geometry.uuid}/${mesh.material.uuid}/${mesh.castShadow}/${mesh.receiveShadow}`;
    if (!buckets.has(key)) buckets.set(key,[]);
    buckets.get(key).push({ mesh, matrix:inverse.clone().multiply(mesh.matrixWorld) });
  });
  const batches = new THREE.Group(); batches.name='StaticWardBedBatches';
  let originals=0;
  for (const entries of buckets.values()) {
    if (entries.length<2) continue;
    const source=entries[0].mesh, batch=new THREE.InstancedMesh(source.geometry,source.material,entries.length);
    batch.castShadow=source.castShadow; batch.receiveShadow=source.receiveShadow;
    entries.forEach(({mesh,matrix},index)=>{batch.setMatrixAt(index,matrix);mesh.visible=false;});
    batch.instanceMatrix.needsUpdate=true;batch.computeBoundingBox();batch.computeBoundingSphere();
    batches.add(batch);originals+=entries.length;
  }
  zone.zoneGroup.add(batches);
  zone.staticBedBatchComplete=true;
  zone.staticBedBatchStats={ beds:beds.length, originals, batches:batches.children.length };
  return true;
}
