/** Give local metre-sized PBR surfaces a consistent texel scale on all box faces.
 * Cached plane materials already carry repeatX/Y and retain their own UV mapping.
 * Geometry must be privately owned; never mutate a registry/shared GLTF geometry.
 */
export function applyMetricSurfaceUVs(geometry, material) {
  if (!material?.userData.surface || material.userData.repeatX != null) return geometry;
  const {position, normal, uv} = geometry.attributes;
  if (!position || !normal || !uv) return geometry;
  const metres=material.userData.physicalMetres || 1, metresY=material.userData.physicalMetresY || metres;
  for(let index=0;index<position.count;index++) {
    const nx=normal.getX(index),ny=normal.getY(index),nz=normal.getZ(index);
    const x=position.getX(index),y=position.getY(index),z=position.getZ(index);
    let u,v;
    if(Math.abs(ny)>=Math.abs(nx)&&Math.abs(ny)>=Math.abs(nz)){u=x;v=-Math.sign(ny)*z;}
    else if(Math.abs(nx)>=Math.abs(nz)){u=-Math.sign(nx)*z;v=y;}
    else {u=Math.sign(nz)*x;v=y;}
    uv.setXY(index,u/metres+.5,v/metresY+.5);
  }
  uv.needsUpdate=true;geometry.userData.metricSurfaceUVs=true;return geometry;
}
