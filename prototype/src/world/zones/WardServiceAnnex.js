import * as THREE from 'three';
import {PlanWalls} from '../shared/PlanArchitecture.js';
import {CollisionFactory} from '../shared/CollisionFactory.js';
import {solid,asset} from '../../art/ArtDetails.js';
import {attachLabel} from '../../art/HospitalAtmosphere.js';
import {disposeZoneArt} from '../../art/ArtResources.js';
import {freshSideCase} from '../../core/HospitalSideCase.js';

export function annexDoor(zone,position,yaw,id,action) {
  const root=new THREE.Group();root.position.set(...position);root.rotation.y=yaw;zone.zoneGroup.add(root);
  const m=zone.gf.materials;
  for(const side of [-1,1])solid(root,m.stainless,[side*.75,1.15,0],[.09,2.3,.17]);
  solid(root,m.stainless,[0,2.31,0],[1.59,.08,.17]);
  const leaf=solid(root,m.metal,[0,1.13,0],[1.42,2.24,.07]);
  leaf.userData={interactable:true,id,type:'hospital_annex',action,label:action==='enter'?'進入封存檢修廊（可隨時返回）':'返回 4F 儲藏室'};zone.interactables.push(leaf);
  solid(root,m.stainless,[.51,1.05,.08],[.035,.32,.045]);
  attachLabel(root,[action==='enter'?'4F / 封存檢修廊':'返回 / 4F 儲藏室','SERVICE ACCESS','非必要調查 / 原件保留'],[0,1.73,.041],[1.1,.53]);
  return leaf;
}
export class WardServiceAnnex {
  constructor(scene,gf,{hospitalSimulation}={}){Object.assign(this,{scene,gf,simulation:hospitalSimulation});this.zoneGroup=new THREE.Group();this.zoneGroup.name='WardServiceAnnex';this.colliders=[];this.walkables=[];this.interactables=[];this.roomAreas=[];this.elapsed=0;}
  build(){
    const g=this.zoneGroup,m=this.gf.materials;this.scene.add(g);
    this.gf.buildFloor(g,this.walkables,0,0,-.5,12,17,m.floorTile);
    this.gf.buildCeiling(g,0,3.15,-.5,12,17);
    const walls=new PlanWalls(this);walls.rect(-6,-9,6,8);walls.line('x',2,-6,6);walls.cut('x',2,0,2.2);
    walls.line('z',-2,-9,-2);walls.cut('z',-2,-4.7,1.6);walls.line('z',2,-9,-2);walls.cut('z',2,-4.7,1.6);walls.build();
    annexDoor(this,[0,0,7.86],Math.PI,'CASE_EXIT','return');
    const anchor=(id,label,position)=>{const object=new THREE.Group();object.position.set(...position);object.userData={interactable:true,id,type:'hospital_case',label};g.add(object);this.interactables.push(object);return object;};
    const desk=asset(g,'workDesk',[-4.15,0,-3.5],[1,1,1]);
    CollisionFactory.addBox(this.colliders,-4.15,.4,-3.5,1.45,.8,.80);g.updateMatrixWorld(true);
    const top=desk?new THREE.Box3().setFromObject(desk).max.y:.76;
    const paper=anchor('CASE_PAPER','查看 1998 年驗收原件',[-4.1,top+.012,-3.28]);
    attachLabel(paper,['1998 / 風道驗收','指示燈亮起。','紙條沒有動。','完成章：時間缺角。'],[0,0,0],[.45,.30],[-Math.PI/2,0,0]);
    asset(g,'storageCabinet',[-4.9,0,-7.7],[1.1,1,1]);CollisionFactory.addBox(this.colliders,-4.9,.8,-7.7,1.1,1.6,.7);
    const bench=asset(g,'workDesk',[4.0,0,-3.5],[1.1,1,1]);CollisionFactory.addBox(this.colliders,4,.4,-3.5,1.6,.8,.85);
    const relay=anchor('CASE_RELAY','檢查燻黑接點',[3.65,top+.10,-3.4]);
    const burnt=new THREE.MeshStandardMaterial({color:0x3b342a,roughness:.98});solid(relay,burnt,[0,0,0],[.20,.12,.21]);
    for(const x of [-.08,.08])solid(relay,m.stainless,[x,.035,.12],[.025,.025,.10]);
    const power=anchor('CASE_POWER','切換低壓測試電源',[4.40,top+.13,-3.40]);solid(power,m.metal,[0,0,0],[.26,.20,.21]);
    this.switchLever=solid(power,m.stainless,[0,.025,.13],[.03,.13,.04]);
    const led=solid(power,m.lightWarm,[.075,.06,.112],[.026,.026,.012]);this.powerLED=led;
    attachLabel(power,['TEST DC','隔離回路'],[0,.21,0],[.34,.16]);
    const damper=anchor('CASE_DAMPER','調整測試風道擋板',[1.55,1.2,-8.72]);solid(damper,m.metal,[0,0,0],[.32,.40,.16]);
    this.damperHandle=solid(damper,m.stainless,[0,0,.115],[.19,.035,.035]);attachLabel(damper,['TEST ONLY','測試擋板'],[0,.36,0],[.52,.22]);
    const flow=anchor('CASE_FLOW','觀察風口紙條',[0,1.65,-8.69]);solid(flow,m.metal,[0,.30,-.05],[1.35,1.2,.23]);
    this.fan=new THREE.Group();this.fan.position.set(0,.30,.08);flow.add(this.fan);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.40,.032,8,28),m.stainless);this.fan.add(ring);
    for(let i=0;i<4;i++){const blade=solid(this.fan,m.stainless,[0,.17,.012],[.10,.40,.025]);blade.rotation.z=i*Math.PI/2;blade.position.set(Math.sin(i*Math.PI/2)*.18,Math.cos(i*Math.PI/2)*.18,.012);}
    this.paperStrip=solid(flow,m.bedSheet,[0,-.30,.18],[.065,.28,.006]);
    for(let i=0;i<7;i++)solid(flow,m.metal,[-.54+i*.18,.30,.13],[.018,.98,.02]);
    const report=anchor('CASE_REPORT','整理調查並留下回執',[4.4,1.38,-.6]);solid(report,m.doorWood,[0,0,0],[.64,.53,.045]);
    attachLabel(report,['沒有風的驗收','原件 / 觀察 / 回執','僅供器材調查'],[0,0,.027],[.60,.49]);
    this.outcomeLamp=new THREE.PointLight(0xe3ae6d,1.8,5.5,2);this.outcomeLamp.position.set(4,2.2,-.5);g.add(this.outcomeLamp);
    const task=new THREE.SpotLight(0xffd6aa,26,7,.58,.55,2);task.position.set(4,2.95,-2.5);task.target.position.set(4,.75,-3.5);task.castShadow=true;task.shadow.mapSize.set(512,512);task.shadow.bias=-.0002;g.add(task,task.target);
    for(const x of [-5.5,5.5])solid(g,m.stainless,[x,2.87,-.5],[.09,.09,15.7]);
    attachLabel(g,['4F / 封存檢修廊','← 原件　　測試台 →','隨時可從入口返回'],[0,2.45,2.1],[1.8,.65]);
    this.syncStoryState();return this;
  }
  syncStoryState(){const data=this.simulation?.data.sideCase||freshSideCase();this.switchLever.rotation.x=data.power?-.6:.6;this.powerLED.visible=data.power;this.damperHandle.rotation.z=data.damper?Math.PI/2:0;this.outcomeLamp.color.set(data.outcome==='verify'?0x9abbb0:0xe3ae6d);}
  update(camera,delta){this.elapsed+=delta;const data=this.simulation?.data.sideCase;const running=data?.power && data?.damper;this.fan.rotation.z+=running?delta*3.8:0;this.paperStrip.rotation.x=running?Math.sin(this.elapsed*11)*.23:0;}
  cleanup(){this.scene.remove(this.zoneGroup);disposeZoneArt(this.zoneGroup);this.colliders=[];this.walkables=[];this.interactables=[];}
}
