import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { instantiateAsset } from './AssetRegistry.js';
import { applyMetricSurfaceUVs } from './MetricSurfaceUVs.js';

export function artRoot(parent, name) {
  const root = new THREE.Group();
  root.name = `ArtRoot_${name}`;
  parent.add(root);
  return root;
}

export function asset(parent, name, position, scale = [1, 1, 1], yaw = 0) {
  const model = instantiateAsset(name);
  if (!model) return null;
  model.position.set(...position);
  model.scale.set(...scale);
  model.rotation.y = yaw;
  parent.add(model);
  return model;
}

export function solid(parent, material, position, size, radius = 0.012) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 2, Math.min(radius, ...size.map(v => v / 4))), material);
  applyMetricSurfaceUVs(mesh.geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function counterFront(parent, materials, x, z, width, top = 1.1) {
  solid(parent, materials.doorWood, [x, top / 2, z], [width, top, 0.06]);
  for (let dx = -width / 2 + 0.65; dx < width / 2; dx += 0.8) {
    solid(parent, materials.metal, [x + dx, top / 2, z - 0.035], [0.008, top - 0.12, 0.008], 0.001);
  }
  solid(parent, materials.metal, [x, 0.055, z - 0.035], [width, 0.11, 0.02]);
}

export function monitor(parent, materials, x, y, z, yaw = 0) {
  const root = new THREE.Group();
  root.position.set(x, y, z);
  root.rotation.y = yaw;
  parent.add(root);
  solid(root, materials.metal, [0, 0.018, 0], [0.28, 0.036, 0.18]);
  solid(root, materials.metal, [0, 0.16, 0], [0.065, 0.28, 0.05]);
  solid(root, materials.metal, [0, 0.36, 0], [0.54, 0.34, 0.055]);
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 640;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#dce3df'; ctx.fillRect(0, 0, 1024, 640);
  ctx.fillStyle = '#39544b'; ctx.fillRect(0, 0, 1024, 65);
  ctx.fillStyle = '#fff'; ctx.font = '28px sans-serif'; ctx.fillText('院內資訊系統　交班紀錄', 28, 43);
  ctx.font = '22px sans-serif';
  for (let row = 0; row < 9; row++) {
    ctx.fillStyle = row % 2 ? '#e9eee9' : '#f6f6ee'; ctx.fillRect(20, 90 + row * 53, 984, 48);
    ctx.fillStyle = '#41564c'; ctx.fillText(['交班確認', '常規照護', '值班聯絡'][row % 3], 38, 123 + row * 53);
    ctx.fillStyle = '#a5b7ad'; ctx.fillRect(310, 109 + row * 53, 560, 7);
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.49, 0.285), new THREE.MeshBasicMaterial({map}));
  face.position.set(0, 0.36, 0.03); root.add(face);
  solid(root, materials.metal, [0, 0.015, 0.27], [0.43, 0.03, 0.15]);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 12; col++) {
    solid(root, materials.wallDark, [-0.195 + col * 0.035, 0.033, 0.215 + row * 0.032], [0.029, 0.005, 0.026], 0.001);
  }
  // Ordinary workstation items sit on the same existing desktop footprint.
  const mouse=new THREE.Mesh(new THREE.SphereGeometry(.035,16,10),materials.metal);
  mouse.scale.set(1,.55,1.5);mouse.position.set(.29,.022,.27);root.add(mouse);
  const cablePath=new THREE.CatmullRomCurve3([
    new THREE.Vector3(.29,.012,.22),new THREE.Vector3(.32,.008,.09),
    new THREE.Vector3(.19,.008,-.10),new THREE.Vector3(.06,.13,-.04)
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(cablePath,20,.003,5,false),materials.wallDark));
  const cup=new THREE.Mesh(new THREE.CylinderGeometry(.04,.035,.105,24,1,true),materials.bedSheet);
  cup.name='WorkstationCoffeeCup';cup.position.set(-.34,.053,.14);root.add(cup);
  const inside=new THREE.Mesh(new THREE.CircleGeometry(.033,24),materials.doorWood);
  inside.name='WorkstationCoffeeSurface';inside.rotation.x=-Math.PI/2;inside.position.set(-.34,.084,.14);root.add(inside);
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.025,.007,8,18),materials.bedSheet);
  handle.name='WorkstationCoffeeHandle';handle.position.set(-.391,.055,.14);root.add(handle);
  for(let i=0;i<3;i++) {
    const file=solid(root,i%2?materials.wallBumper:materials.wallDark,[.39+i*.055,.155,-.055],[.048,.30,.22]);
    solid(root,materials.bedSheet,[file.position.x,.19,.058],[.025,.12,.004],.001);
    const hole=new THREE.Mesh(new THREE.CircleGeometry(.008,12),materials.metal);
    hole.position.set(file.position.x,.079,.061);root.add(hole);
  }
  return root;
}

export function wallTrim(parent, materials) {
  const walls = parent.children.filter(object => {
    const p = object.geometry?.parameters;
    return object.isMesh && p?.height >= 2.4 && (p.width <= 0.45 || p.depth <= 0.45);
  });
  const root = artRoot(parent, 'Skirting');
  for (const wall of walls) {
    const {width, depth} = wall.geometry.parameters;
    const alongX = width > depth;
    const p = wall.position;
    for (const side of [-1, 1]) {
      const x = p.x + (alongX ? 0 : side * (width / 2 + 0.012));
      const z = p.z + (alongX ? side * (depth / 2 + 0.012) : 0);
      solid(root, materials.wallBumper, [x, 0.055, z], [alongX ? width : 0.025, 0.11, alongX ? 0.025 : depth]);
    }
  }
}

export function wallClock(parent, materials, x, y, z) {
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.04,48),materials.metal);
  rim.rotation.x=Math.PI/2;rim.position.set(x,y,z);parent.add(rim);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#f1efe5';ctx.fillRect(0,0,512,512);
  ctx.strokeStyle='#34443b';ctx.lineCap='round';
  for(let i=0;i<60;i++){
    const a=i*Math.PI/30,r=i%5===0?197:213;
    ctx.lineWidth=i%5===0?8:3;ctx.beginPath();ctx.moveTo(256+Math.sin(a)*r,256-Math.cos(a)*r);ctx.lineTo(256+Math.sin(a)*231,256-Math.cos(a)*231);ctx.stroke();
  }
  for(const [angle,length,width] of [[Math.PI*2*(5+5/60)/12,124,14],[Math.PI/6,181,9]]){
    ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(256,256);ctx.lineTo(256+Math.sin(angle)*length,256-Math.cos(angle)*length);ctx.stroke();
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const face=new THREE.Mesh(new THREE.CircleGeometry(.168,48),new THREE.MeshStandardMaterial({map,roughness:.75}));face.position.set(x,y,z+.023);parent.add(face);
}
