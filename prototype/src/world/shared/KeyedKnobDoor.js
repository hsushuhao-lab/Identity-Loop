import * as THREE from 'three';
import { solid } from '../../art/ArtDetails.js';

/** Single-leaf, normally closed wooden door with a traditional keyed round knob. */
export class KeyedKnobDoor {
  constructor(zone,{id='duty_room',x,z,yaw=0,width=1.4,title='醫師值班室',openDirection=-1,interactionSide=1}){
    this.zone=zone;this.id=id;this.width=width;this.openDirection=openDirection>=0?1:-1;this.interactionSide=interactionSide>=0?1:-1;
    const m=zone.gf.materials;
    this.root=new THREE.Group();this.root.name=`KeyedKnobDoor_${id}`;
    this.root.position.set(x,0,z);this.root.rotation.y=yaw;zone.zoneGroup.add(this.root);

    for(const side of [-1,1]) solid(this.root,m.doorWood,[side*(width/2+.045),1.2,0],[.09,2.4,.18]);
    solid(this.root,m.doorWood,[0,2.42,0],[width+.18,.10,.18]);
    solid(this.root,m.wall,[0,2.82,0],[width+.18,.70,.18]);

    this.hinge=new THREE.Group();this.hinge.position.set(-width/2,0,0);this.root.add(this.hinge);
    this.interactionData={interactable:true,id,doorId:id,type:'duty_door',label:`鑰匙開啟${title}`};

    this.leaf=solid(this.hinge,m.doorWood,[width/2,1.175,0],[width,2.35,.08]);
    this.leaf.userData=this.interactionData;
    zone.interactables.push(this.leaf);

    // Invisible interaction plate on the corridor side.  The visible leaf is thin
    // and the knob meshes are siblings, so the browser walkthrough can miss the
    // interactable target even though the door is correctly present and closed.
    // This plate does not collide or change topology; it only gives the real
    // crosshair raycast a stable E-interaction target for the keyed knob lock.
    const hitMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false});
    this.hitPanel=new THREE.Mesh(new THREE.BoxGeometry(width+.18,2.25,.05),hitMaterial);
    this.hitPanel.position.set(0,1.22,.18*this.interactionSide);
    this.hitPanel.name=`DoorInteractionSensor_${id}`;
    this.hitPanel.userData.sensorSide=this.interactionSide;
    this.hitPanel.userData=this.interactionData;
    this.root.add(this.hitPanel);
    zone.interactables.push(this.hitPanel);

    const knobMat=m.stainless;
    for(const side of [-1,1]){
      const knob=new THREE.Mesh(new THREE.SphereGeometry(.07,16,12),knobMat);
      knob.position.set(width*.78,1.05,side*.09);
      knob.userData=this.interactionData;
      this.hinge.add(knob);
      zone.interactables.push(knob);

      const plate=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.018,20),knobMat);
      plate.rotation.x=Math.PI/2;
      plate.position.set(width*.78,1.05,side*.055);
      plate.userData=this.interactionData;
      this.hinge.add(plate);
      zone.interactables.push(plate);
    }

    zone.keyedDoors??={};zone.keyedDoors[id]=this;
    this.root.updateWorldMatrix(true,true);
    this.closedBox=new THREE.Box3(new THREE.Vector3(-width/2,0,-.10),new THREE.Vector3(width/2,2.35,.10)).applyMatrix4(this.root.matrixWorld);
    this.closed=false;this.setClosed(true);
  }

  setClosed(closed){
    this.closed=closed;
    this.hinge.rotation.y=closed?0:this.openDirection*Math.PI/2;
    const i=this.zone.colliders.indexOf(this.closedBox);
    if(closed&&i<0)this.zone.colliders.push(this.closedBox);
    if(!closed&&i>=0)this.zone.colliders.splice(i,1);
    this.interactionData.label=this.interactionData.type==='bathroom_door'?(closed?'開啟淋浴間門':'關閉淋浴間門'):(closed?'喇叭鎖：鑰匙開門':'喇叭鎖：關門');
    this.root.updateWorldMatrix(true,true);
  }

  toggle(position){
    if(!this.closed&&position){
      const player=new THREE.Box3(
        new THREE.Vector3(position.x-.35,0,position.z-.35),
        new THREE.Vector3(position.x+.35,1.95,position.z+.35)
      );
      if(player.intersectsBox(this.closedBox))return false;
    }
    this.setClosed(!this.closed);return true;
  }
}
