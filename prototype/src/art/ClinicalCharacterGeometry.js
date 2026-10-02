import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Small authored cross-sections replace the repeated sphere/capsule silhouette.
// Rings are [height, halfWidth, halfDepth, depthOffset]; forward is local -Z.
export function profileGeometry(rings,{segments=16,warp,color}={}){
  const positions=[],uvs=[],colors=[],indices=[];
  const bottom=rings[0][0],height=Math.max(.001,rings.at(-1)[0]-bottom);
  for(let r=0;r<rings.length;r++)for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,[y,w,d,z=0]=rings[r];let point=[Math.sin(a)*w,y,Math.cos(a)*d+z];
    if(warp)point=warp(point,a,r);
    positions.push(...point);uvs.push(i/segments,(y-bottom)/height);
    if(color)colors.push(...color(point,a,r));
  }
  for(let r=0;r<rings.length-1;r++)for(let i=0;i<segments;i++){
    const a=r*(segments+1)+i,b=a+1,c=a+segments+1,d=c+1;indices.push(a,b,c,b,d,c);
  }
  for(const [r,top] of [[0,false],[rings.length-1,true]]){
    const [y,,,z=0]=rings[r],center=positions.length/3;positions.push(0,y,z);uvs.push(.5,top?1:0);if(color)colors.push(...color([0,y,z],0,r));
    for(let i=0;i<segments;i++){const a=r*(segments+1)+i;indices.push(center,...(top?[a,a+1]:[a+1,a]));}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  if(color)geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();geometry.computeBoundingBox();return geometry;
}
export function characterMesh(parent,geometry,material,name){const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
export function mergedCharacterMesh(parent,geometries,material,name){const merged=mergeGeometries(geometries,false);if(!merged)throw Error('Character geometry attributes do not match');for(const geometry of geometries)geometry.dispose();return characterMesh(parent,merged,material,name);}
export function strokeGeometry(points,radius=.0012){return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),Math.max(6,points.length*3),radius,4,false);}

// Coloured facial patches share one draw: off-white eyes, iris, lid and eyebrows.
export function faceDetailGeometry(){
  const position=[],color=[],indices=[];
  const patch=(points,tint)=>{const start=position.length/3;for(const point of points){position.push(...point);color.push(...tint);}for(let i=1;i<points.length-1;i++)indices.push(start,start+i,start+i+1);};
  for(const side of [-1,1]){
    const x=side*.033,y=.016+(side===1?.0008:0),z=-.084;
    patch([[x-.017,y,z],[x-.008,y+.0043,z-.0015],[x+.007,y+.0040,z-.0015],[x+.017,y-.0005,z],[x+.007,y-.0040,z-.0015],[x-.009,y-.0039,z-.0015]],[.67,.66,.60]);
    const iris=[];for(let i=0;i<12;i++){const a=i/12*Math.PI*2;iris.push([x+Math.cos(a)*.0039,y+Math.sin(a)*.0039,z-.0025]);}patch(iris,[.14,.17,.14]);
    patch([[x-.018,y+.001,z-.0008],[x-.008,y+.0054,z-.002],[x+.009,y+.0050,z-.002],[x+.018,y+.0002,z-.0008],[x+.008,y+.0036,z-.002],[x-.008,y+.0036,z-.002]],[.35,.28,.23]);
    patch([[x-.019,y+.018,z+.001],[x-.007,y+.022,z-.001],[x+.012,y+.020,z],[x+.021,y+.014,z+.003],[x+.011,y+.0168,z-.0005],[x-.008,y+.0188,z-.001]],[.19,.19,.16]);
  }
  for(let i=0;i<position.length;i+=3){const x=position[i],extra=position[i+2]+.084;position[i+2]=-.084*Math.pow(Math.max(.05,1-(x/.089)**2),.225)+extra-.001;}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(position,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(color,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
