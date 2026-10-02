import * as THREE from 'three';
import {solid} from './ArtDetails.js';
import {materialForSurface,getMaterials} from './MaterialRegistry.js';

export function labelTexture(lines,{screen=false}={}) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle=screen?'#172b25':'#d8d3bd';ctx.fillRect(0,0,512,256);
  ctx.strokeStyle=screen?'#799886':'#5a6556';ctx.strokeRect(12,12,488,232);
  ctx.fillStyle=screen?'#b8cdb6':'#34483e';
  lines.forEach((line,i)=>{ctx.font=i===0?'bold 30px sans-serif':'23px sans-serif';ctx.fillText(line,28,49+i*48);});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function attachLabel(parent,lines,position,size,rotation=[0,0,0],screen=false) {
  const texture=labelTexture(lines,{screen});
  const material=new THREE.MeshStandardMaterial({map:texture,roughness:.87,emissive:screen?0xffffff:0x000000,emissiveMap:screen?texture:null,emissiveIntensity:screen?.22:0,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),material);mesh.position.set(...position);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;
}
function contact(parent,x,z,sx,sz) {
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(32,32,2,32,32,32);gradient.addColorStop(0,'rgba(5,15,11,.38)');gradient.addColorStop(1,'rgba(5,15,11,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.012,z);parent.add(mesh);return mesh;
}
export function dressHospitalSlice(zone,{group,terminal,phone,badge,shelf,wheelchair,simulation}) {
  const m=getMaterials();shelf.children[0].material=materialForSurface('doorWood',1.95,.6);
  attachLabel(terminal,['QINGLING / NIGHT SHIFT','現場核對 → 保留原件','分機 708：器材巡查','請分列觀察與轉述'],[0,.20,.042],[.4,.25],[0,0,0],true);
  attachLabel(phone,['708  /  SERVICE','1   2   3','4   5   6','7   8   9'],[0,.108,.047],[.23,.15],[-Math.PI/2,0,0]);
  attachLabel(badge,['AUDIT','SOURCE ?'],[0,.17,.054],[.125,.052],[0,0,0],true);
  for(const x of [-.26,.26]){
    const arm=solid(wheelchair,m.stainless,[x,.79,-.02],[.05,.05,.42]);
    solid(wheelchair,m.metal,[x,.68,-.14],[.026,.23,.026]);
    const caster=new THREE.Mesh(new THREE.TorusGeometry(.072,.018,6,12),m.metal);caster.rotation.y=Math.PI/2;caster.position.set(x,.09,-.30);wheelchair.add(caster);
  }
  const spokeGeometry=new THREE.BoxGeometry(.009,.54,.012),spokes=new THREE.InstancedMesh(spokeGeometry,m.stainless,16),dummy=new THREE.Object3D();
  let index=0;for(const x of [-.3,.3])for(let i=0;i<8;i++){dummy.position.set(x,.32,.08);dummy.rotation.set(i*Math.PI/8,0,Math.PI/2);dummy.updateMatrix();spokes.setMatrixAt(index++,dummy.matrix);}spokes.instanceMatrix.needsUpdate=true;wheelchair.add(spokes);
  attachLabel(wheelchair,['器材盤點','未署名 / ORIGINAL'],[0,.85,.238],[.30,.14],[0,Math.PI,0]);
  contact(group,3.05,-2.4,2.25,.85);contact(wheelchair,0,0,.95,1.1);
  const taskLamp=new THREE.SpotLight(0xffd2a1,20,4.8,.55,.55,2);taskLamp.position.set(3.1,2.7,-1.5);taskLamp.target.position.set(3.1,.8,-2.4);taskLamp.castShadow=true;taskLamp.shadow.mapSize.set(512,512);taskLamp.shadow.bias=-.0002;group.add(taskLamp,taskLamp.target);
  solid(group,m.metal,[3.1,2.72,-1.5],[.42,.045,.12]);
  const emitter=solid(group,m.lightWarm,[3.1,2.693,-1.5],[.35,.009,.06]);
  const receipt=new THREE.Group();receipt.name='HospitalCase_ReturnReceipt';receipt.position.set(3.48,.837,-2.46);group.add(receipt);
  const note=attachLabel(receipt,['檢修廊 / 保留原件','觀察回執'],[0,0,0],[.32,.21],[-Math.PI/2,0,0]);
  // Small scuff panels sit against fixed wall faces, away from door apertures.
  const wear=labelTexture(['','', '','']);const ctx=wear.image.getContext('2d');ctx.clearRect(0,0,512,256);ctx.fillStyle='rgba(65,58,40,.08)';
  for(let i=0;i<42;i++)ctx.fillRect((i*79)%510,160+(i*13)%85,5+(i%5)*7,2);wear.needsUpdate=true;
  const grime=new THREE.MeshStandardMaterial({map:wear,transparent:true,depthWrite:false,roughness:1});
  for(const z of [-6.8,-10.8]){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.6),grime);mesh.position.set(6.874,.5,z);mesh.rotation.y=-Math.PI/2;group.add(mesh);}
  return {taskLamp,receipt,synchronize(){taskLamp.intensity=simulation.data.taskPower?20:0;emitter.visible=simulation.data.taskPower;receipt.visible=simulation.data.sideCase.outcome!=='pending';note.material.color.set(simulation.data.sideCase.outcome==='verify'?0xc4dcc4:0xdfcfa4);}};
}
