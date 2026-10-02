import * as THREE from 'three';

/** Fixed furniture contact shading: one transparent draw, no shadow-map pass.
 * This is a soft baked approximation under stationary desks/chairs, not a dynamic
 * shadow or a replacement for the existing practical light plan.
 */
export function createStationContactShading(zone) {
  const root=zone.zoneGroup, footprints=[];
  root.updateWorldMatrix(true,true);
  for(const station of zone.workstations || []) for(const object of [station.desk,station.chairObject]) {
    if(!object?.parent)continue;
    const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());
    const centre=root.worldToLocal(bounds.getCenter(new THREE.Vector3()));
    if(!Number.isFinite(centre.x)||size.x<=0||size.z<=0)continue;
    footprints.push({x:centre.x,z:centre.z,width:size.x+.32,depth:size.z+.32});
  }
  if(!footprints.length)return null;
  const positions=[],uvs=[],normals=[],indices=[];
  for(const {x,z,width,depth} of footprints){
    const start=positions.length/3;
    for(const [u,v] of [[0,0],[1,0],[1,1],[0,1]]){
      positions.push(x+(u-.5)*width,.013,z+(v-.5)*depth);uvs.push(u,v);normals.push(0,1,0);
    }
    indices.push(start,start+2,start+1,start,start+3,start+2);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
  const pixels=new Uint8Array(64*64*4);
  for(let y=0;y<64;y++)for(let x=0;x<64;x++){
    const radius=Math.hypot((x+.5-32)/32,(y+.5-32)/32),offset=(y*64+x)*4;
    pixels[offset]=pixels[offset+1]=pixels[offset+2]=18;pixels[offset+3]=Math.round(64*Math.max(0,1-radius)**1.6);
  }
  const texture=new THREE.DataTexture(pixels,64,64);texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Station_FixedFurnitureContactShading';mesh.raycast=()=>{};
  mesh.userData.footprints=footprints;root.add(mesh);
  let disposed=false;
  return {mesh,triangles:indices.length/3,textureBytes:pixels.byteLength,dispose(){if(disposed)return;disposed=true;root.remove(mesh);geometry.dispose();material.dispose();texture.dispose();}};
}
