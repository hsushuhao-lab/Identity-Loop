import * as THREE from 'three';
import { solid } from '../../art/ArtDetails.js';
import { SignAnchor } from './SignAnchor.js';
import { PlanWalls } from './PlanArchitecture.js';
import { gameState } from '../../core/GameState.js';

// Per-campus local layout is identical on every floor; offsets attach it to existing lobbies.
export const CORE_ORIGINS={
 first_campus_1f:[-8,12],first_campus_2f:[-8,7.5],first_campus_3f:[-8,7.5],first_campus_4f:[0,6],first_campus_8f:[-8,7.5],
 second_campus_1f:[72,6],second_campus_2f:[72,8.5],second_campus_5f:[72,6],second_campus_4f_story:[72,6],second_campus_std:[72,6]
};
export function corePoint(zoneId,x,z){const p=CORE_ORIGINS[zoneId];return [p[0]+x,1.7,p[1]+z];}
export function buildVerticalCore(zone,zoneId){
 const origin=CORE_ORIGINS[zoneId];if(!origin)return;
 const first=zoneId.startsWith('first'),[cx,cz]=origin,m=zone.gf.materials;
 const local={gf:zone.gf,colliders:[],walkables:[],interactables:[],zoneGroup:new THREE.Group()};
 const root=local.zoneGroup;root.name=`VerticalCore_${first?'first':'second'}`;root.position.set(cx,0,cz);zone.zoneGroup.add(root);
 const walls=new PlanWalls(local);walls.rect(-8,-4,8,4);walls.cut('x',-4,0,zone.wardDoor?2.4:3.2);
 if(zoneId==='first_campus_4f'||zoneId==='first_campus_3f')walls.cut('z',-8,0,1.4);
 if(zoneId==='second_campus_5f'||zoneId==='second_campus_4f_story'||zoneId==='second_campus_std')walls.cut('z',8,0,1.4);
 walls.build();zone.gf.buildFloor(root,local.walkables,0,0,0,16,8,m.floorTile);zone.gf.buildCeiling(root,0,3.2,0,16,8);
 for(const x of [-4,4])zone.gf.buildCeilingLight(root,x,3.15,0,.8,9);
 // One shared two-leaf lift model; call panel stays on the right wall, never on a leaf.
 for(const x of [-1.2,1.2])solid(root,m.stainless,[x,1.25,3.78],[.12,2.5,.15]);
 solid(root,m.stainless,[0,2.5,3.78],[2.52,.10,.15]);
 for(const x of [-.56,.56])solid(root,m.metal,[x,1.2,3.81],[1.10,2.4,.09]);
 solid(root,m.stainless,[0,.02,3.72],[2.5,.04,.28]);
 const panel=new THREE.Group();panel.position.set(1.65,1.23,3.72);panel.rotation.y=Math.PI;root.add(panel);
 const hit=solid(panel,m.metal,[0,0,0],[.2,.42,.09]);
 hit.userData={interactable:true,id:`${zoneId}_elevator`,type:'elevator',kind:'elevator',label:'電梯：選擇樓層'};zone.interactables.push(hit);
 const button=new THREE.Mesh(new THREE.CircleGeometry(.047,20),new THREE.MeshBasicMaterial({color:0xffb326}));button.position.z=.051;panel.add(button);

 // Identy Loop Zhang route: the 6F foreshadow is read from the real elevator
 // indicator, not from a contextual trigger spawned beside the player.
 if(zoneId==='first_campus_8f'){
   const display=solid(root,m.wallDark,[1.65,2.02,3.72],[.42,.24,.08]);
   display.name='Identity6FIndicator_8F';
   const displayHit=new THREE.Mesh(
     new THREE.BoxGeometry(.72,.58,.28),
     new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
   );
   displayHit.position.set(1.65,2.02,3.58);
   displayHit.userData={
     interactable:true,
     id:'IDENTITY_6F_DISPLAY',
     type:'identity_elevator_indicator',
     label:'查看電梯樓層顯示'
   };
   root.add(displayHit);
   zone.interactables.push(displayHit);
 }

 SignAnchor.buildWallPlaque({scene:root,x:0,y:2.75,z:3.69,rotationY:Math.PI,width:1.2,height:.3,code:'',title:`${zone.floor||Number(zoneId.match(/_(\d)f/)?.[1])}F 電梯`,subtitle:'',header:''});
 const stair=new THREE.Group();stair.position.set(first?(zoneId==='first_campus_2f'?-7:7.78):-5,0,first?0:3.78);stair.rotation.y=first?-Math.PI/2:Math.PI;root.add(stair);
 for(const sx of [-.64,.64])solid(stair,m.metal,[sx,1.2,0],[.10,2.4,.16]);solid(stair,m.metal,[0,2.42,0],[1.38,.12,.16]);
 const leaf=solid(stair,m.metal,[0,1.18,.02],[1.16,2.36,.1]);solid(stair,m.stainless,[0,1,.1],[.9,.06,.08]);
 leaf.userData={interactable:true,id:`${zoneId}_stairs`,type:'travel_selector',kind:'stairs',label:'安全梯：選擇樓層'};zone.interactables.push(leaf);
 if(zoneId==='first_campus_3f'&&!gameState.getFlag('STAIR_SHORTCUT_3F_4F')){
   const latch=solid(stair,m.stainless,[0,1.43,.13],[1.0,.08,.08]);
   latch.name='StairLatch_3F_Locked';
   const chain=solid(stair,m.metal,[0,1.68,.14],[.78,.035,.035]);chain.rotation.z=.28;chain.name='StairChain_3F';
 }
 if(zoneId==='first_campus_4f'&&!gameState.getFlag('STAIR_SHORTCUT_3F_4F')){
   const bolt=solid(stair,m.stainless,[.37,1.44,.14],[.28,.09,.09]);bolt.name='StairBolt_4F_UnlockSide';
 }
 SignAnchor.buildWallPlaque({scene:stair,x:0,y:2.7,z:.1,width:1.1,height:.3,code:'',title:'安全梯',subtitle:'',header:''});
 root.updateWorldMatrix(true,true);for(const c of local.colliders)zone.colliders.push(c.applyMatrix4(root.matrixWorld));
 zone.walkables.push(...local.walkables);zone.colliders.push(new THREE.Box3().setFromObject(leaf));
 zone.verticalCore={origin,layout:first?'FIRST_CORE_V1':'SECOND_CORE_V1',lift:[0,3.81],panel:[1.65,3.72],stairs:first?(zoneId==='first_campus_2f'?[-7,0]:[7.78,1]):[-5,3.78],root};
 if(zone.levelInstance){zone.elevatorLight=button;zone.levelInstance.elevatorLight=button;}
}
