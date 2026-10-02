import * as THREE from 'three';
import {solid} from './ArtDetails.js';

export function buildEquipmentAttendant(root) {
  const grain=new Uint8Array(64*64*4);
  for(let i=0;i<64*64;i++){const v=216+((i*37+(i>>6)*13)%19);grain.set([v,v,v,255],i*4);}
  const weave=new THREE.DataTexture(grain,64,64);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(5,7);weave.needsUpdate=true;
  const cloth=new THREE.MeshStandardMaterial({color:0x60716a,map:weave,bumpMap:weave,bumpScale:.003,roughness:.94});cloth.name='Attendant/WovenScrubs';
  const skin=new THREE.MeshStandardMaterial({color:0xb69b86,roughness:.76});
  const hair=new THREE.MeshStandardMaterial({color:0x393730,roughness:1});
  const shoe=new THREE.MeshStandardMaterial({color:0x242b28,roughness:.72});
  const mask=new THREE.MeshStandardMaterial({color:0xdddccf,map:weave,roughness:.98});
  const eye=new THREE.MeshStandardMaterial({color:0x373b35,roughness:.32});
  const oval=(parent,material,position,scale)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),material);mesh.position.set(...position);mesh.scale.set(...scale);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const limb=(parent,material,radius,length,y)=>{const mesh=new THREE.Mesh(new THREE.CapsuleGeometry(radius,length,5,10),material);mesh.position.y=y;mesh.castShadow=true;parent.add(mesh);return mesh;};
  oval(root,cloth,[0,1.16,0],[.205,.29,.135]);
  oval(root,cloth,[0,.91,0],[.17,.15,.12]);
  limb(root,skin,.045,.07,1.44);
  const head=new THREE.Group();head.position.y=1.60;root.add(head);
  oval(head,skin,[0,0,0],[.12,.158,.105]);
  const scalp=new THREE.Mesh(new THREE.SphereGeometry(1,16,10,0,Math.PI*2,0,Math.PI*.46),hair);scalp.scale.set(.123,.162,.108);head.add(scalp);
  oval(head,mask,[0,-.052,-.086],[.116,.069,.045]);
  for(const side of [-1,1]){
    oval(head,skin,[side*.122,-.017,0],[.023,.040,.017]);
    oval(head,eye,[side*.043,.030,-.098],[.018,.006,.006]);
    const brow=solid(head,hair,[side*.044,.046,-.097],[.039,.008,.009],.004);brow.rotation.z=side*.07;
    solid(head,mask,[side*.10,-.025,-.018],[.006,.008,.13],.002);
  }
  solid(root,mask,[-.08,1.17,-.133],[.065,.04,.008],.003); // Blank clip, no personnel identifier.
  solid(root,cloth,[.07,1.03,-.135],[.09,.11,.018],.006);
  const arms=[],legs=[],knees=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.19,1.36,0);root.add(arm);arms.push(arm);
    limb(arm,cloth,.06,.18,-.12);
    const elbow=new THREE.Group();elbow.position.y=-.26;arm.add(elbow);elbow.rotation.x=-.12;
    limb(elbow,cloth,.046,.20,-.13);oval(elbow,skin,[0,-.29,0],[.040,.054,.026]);
    const leg=new THREE.Group();leg.position.set(side*.09,.86,0);root.add(leg);legs.push(leg);
    limb(leg,cloth,.075,.23,-.19);
    const knee=new THREE.Group();knee.position.y=-.37;leg.add(knee);knees.push(knee);
    limb(knee,cloth,.065,.25,-.19);oval(knee,shoe,[0,-.43,-.047],[.076,.045,.14]);
  }
  let phase=0,elapsed=0,previousZ=root.position.z;
  return { head,arms,legs,knees,
    update(delta,state,player){
      const distance=Math.abs(state.z-previousZ),moving=distance>.00001;phase+=distance*8;elapsed+=delta;previousZ=state.z;
      for(let i=0;i<2;i++){
        const swing=moving?Math.sin(phase+i*Math.PI)*.32:0;
        legs[i].rotation.x=THREE.MathUtils.lerp(legs[i].rotation.x,swing,.35);
        knees[i].rotation.x=THREE.MathUtils.lerp(knees[i].rotation.x,moving?Math.max(0,-swing)*1.3:0,.35);
        arms[i].rotation.x=THREE.MathUtils.lerp(arms[i].rotation.x,state.mode==='inspect'&&i===1?-.65:-swing*.55,.3);
      }
      head.rotation.x=state.mode==='inspect'?.16:Math.sin(elapsed*.8)*.012;
      if(player && Math.hypot(player.x-root.position.x,player.z-root.position.z)<3.2){
        const wanted=Math.atan2(root.position.x-player.x,root.position.z-player.z);
        const difference=Math.atan2(Math.sin(wanted-root.rotation.y),Math.cos(wanted-root.rotation.y));root.rotation.y+=difference*Math.min(1,delta*3);
      }
    }
  };
}
