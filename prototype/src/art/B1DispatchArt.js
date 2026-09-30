import * as THREE from 'three';
import {solid,asset,monitor} from './ArtDetails.js';
import {CollisionFactory} from '../world/shared/CollisionFactory.js';

// Geometry-only art pass. Reuses loaded hospital PBR surfaces; no new downloads.
function pipe(parent,material,a,b,r=.045){
  const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),d=end.clone().sub(start);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),12),material);
  mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());
  mesh.castShadow=true;parent.add(mesh);return mesh;
}
function textPlate(parent,text,position,size,yaw=0){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=160;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#d2d0bd';ctx.fillRect(0,0,768,160);ctx.strokeStyle='#56615a';ctx.lineWidth=9;ctx.strokeRect(8,8,752,144);
  ctx.fillStyle='#293b33';ctx.font='bold 44px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,100,710);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshStandardMaterial({map,roughness:.88}));
  mesh.position.set(...position);mesh.rotation.y=yaw;parent.add(mesh);return mesh;
}

export function buildDispatchVehicle(parent,m){
  const root=new THREE.Group();root.name='Chen_1998_Ambulance';root.position.set(3.8,0,-10.8);parent.add(root);
  const paint=new THREE.MeshStandardMaterial({color:0xbdbbb0,roughness:.58,metalness:.18});
  const glass=new THREE.MeshStandardMaterial({color:0x253831,roughness:.24,metalness:.48});
  const rubber=new THREE.MeshStandardMaterial({color:0x262927,roughness:.94});
  const stripe=new THREE.MeshStandardMaterial({color:0x86534a,roughness:.79});
  const cloth=m.bedSheet.clone();cloth.userData={};cloth.color.setHex(0x7d8274);cloth.side=THREE.DoubleSide;cloth.roughness=1;
  solid(root,rubber,[-.45,.40,0],[5.42,.28,1.52],.04);
  solid(root,paint,[0,1.22,0],[3.9,1.61,1.96],.10).name='B1_Ambulance_Body';
  solid(root,paint,[-2.47,1.05,0],[1.34,1.42,1.88],.09);
  solid(root,paint,[-3.12,.75,0],[.50,.48,1.83],.07);
  solid(root,paint,[0,2.035,0],[3.96,.10,2.00],.035);
  const windshield=solid(root,glass,[-3.15,1.38,0],[.04,.62,1.61],.02);windshield.rotation.z=.12;windshield.name='B1_Ambulance_Windshield';
  for(const side of [-1,1]){
    solid(root,glass,[-2.45,1.42,side*.954],[.99,.54,.028],.03);
    solid(root,glass,[.52,1.49,side*.993],[1.57,.38,.02],.035);
    solid(root,stripe,[-.12,.94,side*.992],[3.45,.16,.018],.002);
    solid(root,rubber,[-1.79,1.02,side*.96],[.017,1.1,.017],.001);
    solid(root,m.stainless,[-2.0,1.10,side*.988],[.17,.035,.028],.004);
    solid(root,m.stainless,[.83,1.04,side*1.015],[.22,.036,.04],.005);
    solid(root,rubber,[-2.88,1.37,side*1.10],[.08,.04,.32],.007);
    solid(root,m.metal,[-2.92,1.43,side*1.25],[.15,.22,.08],.02);
    for(const x of [-2.48,1.23]){
      const tire=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.25,32),rubber);tire.rotation.x=Math.PI/2;tire.position.set(x,.43,side*1.005);root.add(tire);
      const hub=new THREE.Mesh(new THREE.CylinderGeometry(.235,.235,.025,24),m.metal);hub.rotation.x=Math.PI/2;hub.position.set(x,.43,side*1.145);root.add(hub);
      const arch=new THREE.Mesh(new THREE.TorusGeometry(.46,.037,8,32,Math.PI),paint);arch.position.set(x,.43,side*1.145);root.add(arch);
      for(let j=0;j<6;j++){
        const a=j*Math.PI/3;const bolt=new THREE.Mesh(new THREE.SphereGeometry(.021,8,6),m.stainless);
        bolt.position.set(x+Math.cos(a)*.15,.43+Math.sin(a)*.15,side*1.165);root.add(bolt);
      }
    }
    const sideMarker=new THREE.Mesh(new THREE.BoxGeometry(.14,.09,.026),new THREE.MeshStandardMaterial({color:0xb6924e,roughness:.4}));sideMarker.position.set(-3.26,.90,side*.9);root.add(sideMarker);
  }
  solid(root,rubber,[-3.38,.47,0],[.12,.18,1.97],.04);
  const grille=solid(root,rubber,[-3.385,.78,0],[.025,.29,1.03],.015);grille.name='B1_Ambulance_Grille';
  for(let i=0;i<5;i++)solid(root,m.metal,[-3.405,.67+i*.055,0],[.02,.013,.95],.001);
  for(const z of [-.70,.70])solid(root,m.bedSheet,[-3.394,.81,z],[.035,.23,.28],.025);
  solid(root,m.metal,[2.02,.48,0],[.14,.18,2.02],.02);
  solid(root,rubber,[1.967,1.21,0],[.015,1.34,.02],.001);
  for(const z of [-.8,.8])solid(root,stripe,[1.98,1.02,z],[.035,.35,.10],.012);
  for(const z of [-.58,.58])solid(root,stripe,[-1.30,2.135,z],[.56,.16,.24],.04);
  solid(root,m.metal,[-1.30,2.05,0],[.70,.045,1.45],.008);
  textPlate(root,'院內接駁 094',[-.15,1.19,1.006],[1.10,.22]);
  const coverGeometry=new THREE.PlaneGeometry(3.05,3.02,22,22),positions=coverGeometry.attributes.position;
  for(let i=0;i<positions.count;i++){
    const x=positions.getX(i),z=positions.getY(i);
    const y=2.11-Math.max(0,Math.abs(z)-.94)*1.65+.016*Math.sin(x*18+z*6)+.013*Math.cos(z*24);
    positions.setXYZ(i,x+.33,y,z);
  }
  coverGeometry.computeVertexNormals();
  const cover=new THREE.Mesh(coverGeometry,cloth);cover.name='B1_Ambulance_DrapedCover';cover.castShadow=true;cover.receiveShadow=true;root.add(cover);
  return root;
}

export function buildDispatchRoomDetails(zone){
  const parent=zone.zoneGroup,m=zone.gf.materials;
  const markings=new THREE.Group();markings.name='B1_ParkingMarkings';parent.add(markings);
  const yellow=new THREE.MeshStandardMaterial({color:0xaaa077,roughness:1});
  for(const z of [-12.45,-9.05])solid(markings,yellow,[3.0,.009,z],[6.85,.012,.07],.001);
  for(const x of [-.42,6.42])solid(markings,yellow,[x,.01,-10.75],[.07,.012,3.4],.001);
  for(const x of [1.32,5.02])solid(markings,m.wallDark,[x,.085,-12.17],[.85,.15,.23],.025);
  textPlate(parent,'車輛封存區｜請勿啟動',[3.1,1.98,-16.78],[2.5,.40]);
  const pipes=new THREE.Group();pipes.name='B1_CeilingPipes';parent.add(pipes);
  for(const x of [-7.2,5.9,6.16]){
    pipe(pipes,m.metal,[x,3.05,2.75],[x,3.05,-16.7],x<0?.105:.047);
    for(const z of [-2,-7,-12]){pipe(pipes,m.stainless,[x-.19,3.09,z],[x+.19,3.09,z],.013);pipe(pipes,m.metal,[x,3.11,z],[x,3.29,z],.015);}
  }
  solid(pipes,m.metal,[0,3.10,-15.75],[17.6,.22,.45],.01);
  for(const x of [-6.9,-2,3])for(let i=0;i<9;i++)solid(pipes,m.wallBumper,[x+i*.07,2.978,-15.75],[.028,.02,.29],.001);
  for(const x of [-8.64,8.64])for(const z of [-7.5,-16.4]){
    solid(parent,m.wall,[x,1.64,z],[.40,3.27,.44],.015);
    solid(parent,m.wallBumper,[x,.60,z],[.44,.46,.48],.01);
    CollisionFactory.addBox(zone.colliders,x,1.60,z,.44,3.2,.48);
  }
  for(const x of [-8.81,8.81])solid(parent,m.wallBumper,[x,.32,-7],[.075,.23,19.6],.005);
  // Measured desktop support, not the height of a chair or of the whole cluster.
  const desk=new THREE.Group();desk.name='B1_DispatchWorkstation';desk.position.set(-6.75,0,-6.55);parent.add(desk);
  const table=asset(desk,'workDesk',[0,0,0]);desk.updateWorldMatrix(true,true);
  const tableBox=new THREE.Box3().setFromObject(table),top=tableBox.max.y;
  monitor(desk,m,0,top+.003,0);
  const chair=asset(parent,'officeChair',[-6.75,0,-5.25],[.92,.92,.92],Math.PI);
  parent.updateWorldMatrix(true,true);zone.colliders.push(tableBox,new THREE.Box3().setFromObject(chair));
  const radio=solid(desk,m.wallBumper,[-.52,top+.07,.06],[.27,.14,.20],.015);radio.name='B1_DeskRadio';
  for(let i=0;i<6;i++)solid(desk,m.metal,[-.59+i*.022,top+.085,.164],[.011,.062,.004],.001);
  pipe(desk,m.stainless,[-.61,top+.13,-.015],[-.65,top+.43,-.015],.006);
  textPlate(parent,'值勤聯絡／車次核對',[-8.82,2.35,-6.4],[1.5,.30],Math.PI/2).name='B1_WorkstationWallPlaque';
  solid(parent,m.metal,[-8.84,2.35,-6.4],[.03,.34,1.56]).name='B1_WorkstationWallPlaque_Frame';
  for(const z of [-9.25,-11.4]){
    const cabinet=asset(parent,'storageCabinet',[-8.15,0,z],[.8,.9,.8],Math.PI/2);
    cabinet.updateWorldMatrix(true,true);zone.colliders.push(new THREE.Box3().setFromObject(cabinet));
  }
  const bench=asset(parent,'bench',[-6.7,0,1.45],[.85,.9,.85],Math.PI);
  bench.updateWorldMatrix(true,true);zone.colliders.push(new THREE.Box3().setFromObject(bench));
  // Low-intensity task lighting leaves the scene's global exposure untouched.
  for(const [x,y,z,power,distance] of [[-5.8,2.7,-3.5,2.2,7],[-4.8,2.6,-13,2.0,5],[4.4,2.8,-10,2.4,7]]){
    const light=new THREE.PointLight(0xd9d4b9,power,distance,2);light.position.set(x,y,z);parent.add(light);
  }
}
