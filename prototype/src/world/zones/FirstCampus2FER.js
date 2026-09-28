import { AccessDoor } from '../shared/AccessDoor.js';
import {worldNarrative} from '../../story/IdentityPrivacy.js';
import { PlanWalls } from '../shared/PlanArchitecture.js';
// FirstCampus2FER.js - Milestone M4: First Campus 2F Emergency / Acute Floor
import * as THREE from 'three';
import { persistentMemory } from '../../core/PersistentMemory.js';
import { buildCampusBackdrop } from '../../art/CampusBackdrop.js';
import { artRoot, asset, solid, counterFront, monitor, wallTrim } from '../../art/ArtDetails.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { buildRoomWing } from '../shared/RoomWing.js';
import { Doorway } from '../shared/Doorway.js';
import { SignAnchor } from '../shared/SignAnchor.js';
import { CollisionFactory } from '../shared/CollisionFactory.js';
import { gameState } from '../../core/GameState.js';
import {buildClinicalCart,buildDeskCluster,buildIvStand,buildSupplyCabinet} from '../../art/ClinicalDressing.js';

export class FirstCampus2FER {
  constructor(scene, geometryFactory) {
    this.scene = scene;
    this.gf = geometryFactory;
    this.colliders = [];
    this.walkables = [];
    this.interactables = [];
    this.acuteGateClosed = true;
    this.zoneGroup = new THREE.Group();
    this.zoneGroup.name = 'FirstCampus2FER_Zone';
  }

  build() {
    this.scene.add(this.zoneGroup);
    this.art = artRoot(this.zoneGroup, 'ER');

    // ==========================================
    // 1. ELEVATOR / STAIR CORRIDOR ARRIVAL (x: -12 to -4, z: -3.5 to 3.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, -8, 0, 0, 8, 7, this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup, -8, 3.2, 0, 8, 7);

    this.gf.buildWall(this.zoneGroup, this.colliders, -12, 1.6, 0, 0.4, 3.2, 7); // West perimeter wall
    for(const x of [-10.8,-5.2])this.gf.buildWall(this.zoneGroup,this.colliders,x,1.6,3.5,2.4,3.2,.4);  // North wall of arrival lobby
    this.gf.buildWall(this.zoneGroup, this.colliders, -8, 1.6, -3.5, 8, 3.2, 0.4); // South wall of arrival lobby

    // Enclosed Acute Ward Gate Partition at x = 0 (separates outer arrival corridor from inner acute ward)
    // South partition wall (z: -3.5 to -1.0)
    this.gf.buildWall(this.zoneGroup, this.colliders, 0, 1.6, -2.25, 0.4, 3.2, 2.5);
    // North partition wall (z: 1.0 to 3.5)
    this.gf.buildWall(this.zoneGroup, this.colliders, 0, 1.6, 2.25, 0.4, 3.2, 2.5);

    // Iron security gate doorway (width 2.0m, height 2.4m)
    const acuteDoorway = Doorway.build({
      scene: this.zoneGroup,
      colliders: this.colliders,
      x: 0,
      y: 0,
      z: 0,
      width: 2.0,
      height: 2.4,
      wallHeight: 3.2,
      wallThickness: 0.4,
      isAlongX: false,
      isOpen: true,
      includeLeaf: false,
      doorMaterial: this.gf.materials.metal
    });
    // The controlled AccessDoor below is the only door assembly in this aperture.

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: -0.25,
      y: 2.35,
      z: 1.2,
      rotationY: -Math.PI / 2,
      code: '2F-ER',
      title: '2F 急診',
      subtitle: 'EMERGENCY / ACUTE WARD — ACCESS CONTROL',
      header: '青嶺醫療中心 ｜ 2F 急診'
    });

    SignAnchor.buildHangingSign({
      scene: this.zoneGroup,
      x: -6.0,
      y: 2.65,
      z: 0,
      ceilingY: 3.2,
      rotationY: Math.PI / 2,
      text: '◀ 2F 急診留觀區 ｜ 處置室・救護車道出入口 ▶'
    });

    this.gf.buildCeilingLight(this.zoneGroup, -8, 3.15, 0, 0.9, 7.0, 0xffffff);

    // ==========================================
    // 2. MAIN ER CORRIDOR (x: -4 to 22, z: -3.5 to 3.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 9, 0, 0, 26, 7, this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup, 9, 3.2, 0, 26, 7);

    // User-authorized shell repair: close only the six reproduced corridor boundary gaps.
    [[-2,-3.5,4],[-2,3.5,4],[8,-3.5,2],[8,3.5,2],[19,-3.5,6],[21,3.5,2]].forEach(([x,z,width]) => {
      this.gf.buildWall(this.zoneGroup, this.colliders, x, 1.6, z, width, 3.2, .4);
    });

    // Close the same nonwalkable shaft from the room side; no room/route footprint changes.
    for(const [z,d] of [[4.3,1.6],[8.25,2.5]])this.gf.buildWall(this.zoneGroup,this.colliders,9,1.6,z,.4,3.2,d);
    this.gf.buildWall(this.zoneGroup, this.colliders, 9, 1.6, -6.5, .4, 3.2, 6);

    // Corridor handrails
    [[1.35, 2.5], [5.65, 2.5], [10.4, 2.6], [14.6, 2.6]].forEach(([x, width]) => {
      this.gf.buildHandrail(this.zoneGroup, null, x, 1.05, -3.28, width);
    });

    this.gf.buildCeilingLight(this.zoneGroup, 0, 3.15, 0, 0.85, 7.5);
    this.gf.buildCeilingLight(this.zoneGroup, 8, 3.15, 0, 0.85, 7.5);
    this.gf.buildCeilingLight(this.zoneGroup, 16, 3.15, 0, 0.85, 7.5);

    // ==========================================
    // 3. ER NURSING & TRIAGE WORK ZONE (x: 0 to 7, z: 3.5 to 8.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 3.5, 0, 6.0, 7, 5, this.gf.materials.floor);
    this.gf.buildCeiling(this.zoneGroup, 3.5, 3.2, 6.0, 7, 5);

    this.gf.buildWall(this.zoneGroup, this.colliders, 3.5, 1.6, 8.5, 7, 3.2, 0.4); // North back wall
    this.gf.buildWall(this.zoneGroup, this.colliders, 0.0, 1.6, 6.0, 0.4, 3.2, 5.0); // West wall
    for(const [z,d] of [[4.3,1.6],[7.7,1.6]])this.gf.buildWall(this.zoneGroup,this.colliders,7,1.6,z,.4,3.2,d); // East wall, one staff-to-beds aperture

    // Triage Counter (at z = 3.5)
    const triageCounter = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.1, 0.7), this.gf.materials.wallDark);
    triageCounter.name='ER_TriageCounter';
    triageCounter.position.set(3.5, 0.55, 3.5);
    this.zoneGroup.add(triageCounter);
    CollisionFactory.addBox(this.colliders, 3.5, 0.55, 3.5, 4.8, 1.1, 0.7);

    // Protective reinforced clear glass partition over triage counter
    const triageGlass = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 1.2), this.gf.materials.glass);
    triageGlass.name='ER_TriageCounter_GlassPartition';
    triageGlass.position.set(3.5, 1.75, 3.125);
    this.zoneGroup.add(triageGlass);
    CollisionFactory.addBox(this.colliders,3.5,1.8,3.5,4.8,2.8,.12);
    this.gf.buildWall(this.zoneGroup,this.colliders,.55,1.6,3.5,1.1,3.2,.22);
    const clearGlass=this.gf.materials.glass.clone();
    clearGlass.transparent=true;clearGlass.opacity=.23;clearGlass.depthWrite=false;clearGlass.side=THREE.DoubleSide;
    new AccessDoor(this,{id:'ER_NURSE_ENTRY',x:6.4,z:3.5,width:1.0,title:'護理站',material:clearGlass,readerSide:-1});
    // Transparent card-controlled link directly from protected station to observation beds.
    this.gf.buildFloor(this.zoneGroup,this.walkables,8,0,6,2.4,1.8,this.gf.materials.floor);
    this.gf.buildCeiling(this.zoneGroup,8,3.2,6,2.4,1.8);
    for(const z of [5.1,6.9])this.gf.buildWall(this.zoneGroup,this.colliders,8,1.6,z,2,3.2,.18);
    new AccessDoor(this,{id:'ER_NURSE_BEDS',x:8,z:6,yaw:Math.PI/2,width:1.6,title:'留觀區感應玻璃門',material:clearGlass});

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 3.5,
      y: 2.5,
      z: 3.38,
      rotationY: Math.PI,
      code: 'ER',
      title: '急診檢傷與護理站',
      subtitle: 'TRIAGE & NURSING',
      header: '青嶺醫療中心 ｜ 急診醫學部'
    });

    this.gf.buildCeilingLight(this.zoneGroup, 3.5, 3.15, 6.0, 0.8, 6.0);
    buildDeskCluster(this.art,this.gf.materials,{x:2.0,z:6.15,yaw:Math.PI,chairs:1,name:'ER_NurseDesk_A'});
    buildDeskCluster(this.art,this.gf.materials,{x:5.1,z:6.15,yaw:Math.PI,chairs:1,name:'ER_NurseDesk_B'});
    buildSupplyCabinet(this.art,this.gf.materials,{x:1.0,z:8.1,name:'ER_MedicationCabinet_A'});
    buildSupplyCabinet(this.art,this.gf.materials,{x:5.9,z:8.1,name:'ER_RecordCabinet_B'});
    buildClinicalCart(this.art,this.gf.materials,{x:6.15,z:7.2,yaw:Math.PI/2,name:'ER_MedicationCart'});
    asset(this.art,'officeChair',[3.55,0,7.75],[.92,.92,.92],0);
    const slipCanvas=document.createElement('canvas');slipCanvas.width=512;slipCanvas.height=720;
    const slipContext=slipCanvas.getContext('2d');
    slipContext.fillStyle='#e7e2d3';slipContext.fillRect(0,0,512,720);
    slipContext.fillStyle='#365447';slipContext.fillRect(24,28,464,62);
    slipContext.fillStyle='#f5f3e9';slipContext.font='bold 28px sans-serif';slipContext.fillText('急診掛號紀錄',42,69);
    slipContext.fillStyle='#29342f';slipContext.font='24px sans-serif';
    ['1998-ER-0217','建檔時間　00:33','病人姓名　＿＿＿＿','床位　未指定'].forEach((line,index)=>slipContext.fillText(line,42,166+index*76));
    const slipTexture=new THREE.CanvasTexture(slipCanvas);slipTexture.colorSpace=THREE.SRGBColorSpace;
    this.ghostRegistrationSlip=new THREE.Mesh(new THREE.PlaneGeometry(.23,.32),new THREE.MeshBasicMaterial({map:slipTexture,side:THREE.DoubleSide}));
    this.ghostRegistrationSlip.name='ER_GhostRegistration_Printout';
    this.ghostRegistrationSlip.position.set(3.55,.965,6.72);this.ghostRegistrationSlip.rotation.x=-Math.PI/2;
    this.ghostRegistrationSlip.visible=false;this.art.add(this.ghostRegistrationSlip);
    asset(this.art,'plant',[.55,0,4.25],[.7,.7,.7]);

    // ==========================================
    // 4. ER ACUTE OBSERVATION BED BAYS (x: 9 to 20, z: 3.5 to 9.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 14.5, 0, 6.5, 11, 6, this.gf.materials.floor);
    this.gf.buildCeiling(this.zoneGroup, 14.5, 3.2, 6.5, 11, 6);

    this.gf.buildWall(this.zoneGroup, this.colliders, 14.5, 1.6, 9.5, 11, 3.2, 0.4); // North wall
    this.gf.buildWall(this.zoneGroup, this.colliders, 20.0, 1.6, 6.5, 0.4, 3.2, 6.0); // East wall

    // 4 ER Bed Bays with stretchers and curtain dividers
    for (let i = 0; i < 4; i++) {
      const bx = 10.5 + i * 2.5;
      // Stretcher/bed
      asset(this.art, 'hospitalBed', [bx, 0, 7.5], [1, 1, 2.1 / 2.135], Math.PI);
      CollisionFactory.addBox(this.colliders, bx, 0.4, 7.5, 1.0, 0.8, 2.1);

      // Medical gas / monitor headwall box
      const headwall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.12), this.gf.materials.metal);
      headwall.position.set(bx, 1.4, 9.25);
      this.zoneGroup.add(headwall);

      // Curtain rail partition
      if (i < 3) {
        this.buildCurtain(bx + 1.25, 7.5);
        CollisionFactory.addBox(this.colliders, bx + 1.25, 1.5, 7.5, 0.1, 2.2, 2.8);
      }
    }

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 14.5,
      y: 2.6,
      z: 3.38,
      rotationY: Math.PI,
      code: 'OBS',
      title: '急診留觀區 (床位 01-04)',
      subtitle: 'OBSERVATION BAYS',
      header: '青嶺醫療中心 ｜ 急診醫學部'
    });
    asset(this.art,'bench',[10.2,0,2.55]);
    asset(this.art,'bench',[18.2,0,2.55]);
    asset(this.art,'plant',[19.25,0,2.75],[.75,.75,.75]);
    const guideStand=new THREE.Group();guideStand.name='ER_ObservationGuideStand';guideStand.position.set(16.8,0,2.65);this.art.add(guideStand);
    solid(guideStand,this.gf.materials.metal,[0,.62,0],[.05,1.24,.05]);
    solid(guideStand,this.gf.materials.wallBumper,[0,1.03,0],[.78,.48,.06]);
    solid(guideStand,this.gf.materials.metal,[0,.03,0],[.65,.06,.36]);

    // ==========================================
    // 5. ACUTE TREATMENT ROOM / ECT PREP FOOTPRINT (x: 0 to 7, z: -9.5 to -3.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 3.5, 0, -6.5, 7, 6, this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup, 3.5, 3.2, -6.5, 7, 6);

    this.gf.buildWall(this.zoneGroup, this.colliders, 3.5, 1.6, -9.5, 7, 3.2, 0.4); // South back wall
    this.gf.buildWall(this.zoneGroup, this.colliders, 0.0, 1.6, -6.5, 0.4, 3.2, 6.0); // West wall
    this.gf.buildWall(this.zoneGroup, this.colliders, 7.0, 1.6, -6.5, 0.4, 3.2, 6.0); // East wall

    // Corridor front wall (at z = -3.5) with doorway opening from x = 2.8 to 4.2
    this.gf.buildWall(this.zoneGroup, this.colliders, 1.4, 1.6, -3.5, 2.8, 3.2, 0.4);
    this.gf.buildWall(this.zoneGroup, this.colliders, 5.6, 1.6, -3.5, 2.8, 3.2, 0.4);

    Doorway.build({
      scene: this.zoneGroup,
      colliders: this.colliders,
      x: 3.5,
      y: 0,
      z: -3.5,
      width: 1.4,
      height: 2.4,
      wallHeight: 3.2,
      wallThickness: 0.4,
      isAlongX: true,
      isOpen: true,
      doorMaterial: this.gf.materials.stainless
    });

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 2.2,
      y: 1.85,
      z: -3.28,
      rotationY: 0,
      code: 'TR-1',
      title: '急性處置室 ｜ ECT 準備／集合區',
      subtitle: 'ACUTE TREATMENT / ECT PREPARATION',
      header: '青嶺醫療中心 ｜ 急診醫學部'
    });

    // Treatment table
    asset(this.art, 'hospitalBed', [3.5, 0, -6.5], [1.1 / .992, 1, 2.2 / 2.135]);
    CollisionFactory.addBox(this.colliders, 3.5, 0.4, -6.5, 1.1, 0.8, 2.2);

    this.gf.buildCeilingLight(this.zoneGroup, 3.5, 3.15, -6.5, 0.9, 6.5, 0xffffff);
    buildSupplyCabinet(this.art,this.gf.materials,{x:.75,z:-8.8,name:'ER_TreatmentSupply_A'});
    buildSupplyCabinet(this.art,this.gf.materials,{x:6.25,z:-8.8,name:'ER_TreatmentSupply_B'});
    buildClinicalCart(this.art,this.gf.materials,{x:1.15,z:-5.2,name:'ER_TreatmentCart_A'});
    buildClinicalCart(this.art,this.gf.materials,{x:5.85,z:-5.2,yaw:Math.PI,name:'ER_TreatmentCart_B'});
    buildIvStand(this.art,this.gf.materials,{x:2.55,z:-7.15,name:'ER_IVStand_A'});
    buildIvStand(this.art,this.gf.materials,{x:4.45,z:-7.15,name:'ER_IVStand_B'});

    // ==========================================
    // 6. DOCTOR ON-DUTY CHARTING ROOM (x: 9 to 16, z: -9.5 to -3.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 12.5, 0, -6.5, 7, 6, this.gf.materials.floor);
    this.gf.buildCeiling(this.zoneGroup, 12.5, 3.2, -6.5, 7, 6);

    this.gf.buildWall(this.zoneGroup, this.colliders, 12.5, 1.6, -9.5, 7, 3.2, 0.4); // South wall
    this.gf.buildWall(this.zoneGroup, this.colliders, 16.0, 1.6, -6.5, 0.4, 3.2, 6.0); // East wall

    this.gf.buildWall(this.zoneGroup, this.colliders, 10.5, 1.6, -3.5, 3.0, 3.2, 0.4);
    this.gf.buildWall(this.zoneGroup, this.colliders, 14.5, 1.6, -3.5, 3.0, 3.2, 0.4);

    Doorway.build({
      scene: this.zoneGroup,
      colliders: this.colliders,
      x: 12.5,
      y: 0,
      z: -3.5,
      width: 1.2,
      height: 2.4,
      wallHeight: 3.2,
      wallThickness: 0.4,
      isAlongX: true,
      isOpen: true,
      doorMaterial: this.gf.materials.doorWood
    });

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 11.2,
      y: 1.85,
      z: -3.28,
      rotationY: 0,
      code: '208',
      title: '急診醫師診療研究室',
      subtitle: 'DUTY PHYSICIAN OFFICE',
      header: '青嶺醫療中心 ｜ 急診醫學部'
    });

    // Charting desk & computer
    asset(this.art, 'workDesk', [13, 0, -8.55], [2 / 1.405, 1, 1 / .725]);
    // Privacy: the doctor's screen faces the inner/back wall, never the doorway.
    const doctorScreen=monitor(this.art,this.gf.materials,13,.76,-8.55,0);
    this.ghostRegistrationScreen=doctorScreen.children.find(child=>child.isMesh&&child.material?.map);
    this.workstations=[{id:'ER_DOCTOR',screen:doctorScreen,chair:[13,0,-7.45],yaw:0}];
    asset(this.art,'officeChair',[13,0,-7.45],[1,1,1],Math.PI);
    asset(this.art,'storageCabinet',[10.2,0,-8.55],[.9,.9,.9],Math.PI);
    asset(this.art,'hospitalBed',[17.4,0,-7.7],[1.05,.95,.95],Math.PI/2);
    solid(this.art,this.gf.materials.doorWood,[15.7,.78,-9.05],[2.5,.06,.30]);
    for(let i=0;i<9;i++)solid(this.art,i%2?this.gf.materials.wallBumper:this.gf.materials.bedSheet,[14.65+i*.25,1.08,-9.02],[.18,.48,.22]);
    CollisionFactory.addBox(this.colliders, 13.0, 0.4, -8.55, 2.0, 0.8, 1.0);
    CollisionFactory.addBox(this.colliders, 17.4, .45, -7.7, 1.3, .9, 2.1);

    // ==========================================
    // 7. HILLSIDE EXTERIOR AMBULANCE ENTRANCE (x = 22, z = 0)
    // ==========================================
    // East wall with ambulance doorway
    this.gf.buildWall(this.zoneGroup, this.colliders, 22.0, 1.6, 2.2, 0.4, 3.2, 2.6);
    this.gf.buildWall(this.zoneGroup, this.colliders, 22.0, 1.6, -2.2, 0.4, 3.2, 2.6);

    // Automatic sliding glass entrance threshold
    Doorway.build({
      scene: this.zoneGroup,
      colliders: this.colliders,
      x: 22.0,
      y: 0,
      z: 0.0,
      width: 2.4,
      height: 2.6,
      wallHeight: 3.2,
      wallThickness: 0.4,
      isAlongX: false,
      isOpen: true,
      includeLeaf: false, // only the controlled steel leaves below exist
      frameMaterial: this.gf.materials.stainless
    });

    // Exterior covered ramp / ambulance bay (x: 22 to 30, z: -4 to 4)
    this.gf.buildFloor(this.zoneGroup, this.walkables, 26.0, 0, 0, 8, 8, this.gf.materials.pathGravel);
    this.gf.buildCeiling(this.zoneGroup, 26.0, 3.8, 0, 8, 8, this.gf.materials.wallDark);

    // Exterior support pillars
    this.gf.buildWall(this.zoneGroup, this.colliders, 30.0, 1.9, 3.8, 0.6, 3.8, 0.6, this.gf.materials.metal);
    this.gf.buildWall(this.zoneGroup, this.colliders, 30.0, 1.9, -3.8, 0.6, 3.8, 0.6, this.gf.materials.metal);

    // Exterior boundary containment collider so player cannot fall off the ramp
    CollisionFactory.addBox(this.colliders, 30.5, 1.0, 0, 0.4, 2.0, 8.0);
    CollisionFactory.addBox(this.colliders, 26.0, 1.0, 4.2, 8.0, 2.0, 0.4);
    CollisionFactory.addBox(this.colliders, 26.0, 1.0, -4.2, 8.0, 2.0, 0.4);

    SignAnchor.buildHangingSign({
      scene: this.zoneGroup,
      x: 21.0,
      y: 2.7,
      z: 0,
      ceilingY: 3.2,
      rotationY: Math.PI / 2,
      text: '急診夜間出入口 ｜ 此門只進不出'
    });

    const ghostTerminal=new THREE.Mesh(new THREE.BoxGeometry(1.35,.95,.75),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    ghostTerminal.name='ER_GhostRegistrationTerminal';
    ghostTerminal.position.set(13,1.18,-8.45);
    ghostTerminal.userData={interactable:gameState.getFlag('GHOST_REGISTRATION_AVAILABLE')===true,id:'ER_GHOST_REGISTRATION',type:'er_ghost_registration',label:'查詢 00:33 異常掛號紀錄'};
    this.zoneGroup.add(ghostTerminal);this.interactables.push(ghostTerminal);this.ghostRegistrationTerminal=ghostTerminal;

    const exitNotice=new THREE.Mesh(new THREE.BoxGeometry(.9,.42,.10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    exitNotice.position.set(21.72,1.75,.95);
    exitNotice.userData={interactable:true,id:'ER_EXIT_NOTICE',type:'er_exit_notice',label:'查看急診夜間出入口告示'};
    this.zoneGroup.add(exitNotice);this.interactables.push(exitNotice);

    this.erNoteInteraction={type:'p1_action',action:'ER_NOTE',label:'完成急診評估紀錄',position:new THREE.Vector3(13,1.2,-8.1),radius:2.5,interactable:!gameState.isTaskComplete('P1_ER_NOTE_DONE')};
    this.interactables.push(this.erNoteInteraction);
    this.buildArtDetails();
    this.buildAcuteGate();
    const bedWalls=new PlanWalls(this);
    bedWalls.line('x',3.5,9,20);bedWalls.cut('x',3.5,14.5,2.4);bedWalls.build();
    this.gf.buildWall(this.zoneGroup,this.colliders,14.5,2.8,3.5,2.4,.8,.22);
    new AccessDoor(this,{id:'ER_BEDS',x:14.5,z:3.5,width:2.4,title:'急診留觀區'});
    // No generic fixed-open leaf is built at the ambulance entrance.
    new AccessDoor(this,{id:'ER_HILLSIDE',x:22,z:0,yaw:Math.PI/2,width:1.8,title:'急診山側感應門'});
    const exterior=buildCampusBackdrop(this.zoneGroup);
    exterior.position.y=11.5;
    // Only cached backdrop vegetation intersecting the newly occupied clinical wing is hidden.
    exterior.updateMatrixWorld(true);
    const wingVolume=new THREE.Box3(new THREE.Vector3(-6.35,0,10.45),new THREE.Vector3(11.95,3.2,25.55));
    for(const child of exterior.children) {
      if(child.name.startsWith('ArtAsset/') && new THREE.Box3().setFromObject(child).intersectsBox(wingVolume)) child.visible=false;
    }
    this.syncStoryState();
    return this;
  }

  syncStoryState(){
    const ghostAvailable=gameState.getFlag('GHOST_REGISTRATION_AVAILABLE')===true;
    const registrationStage=this.registrationStage ?? (gameState.getFlag('CG_00_33_GHOST_REGISTRATION_PLAYED') ? 3 : 0);
    if(this.ghostRegistrationSlip)this.ghostRegistrationSlip.visible=ghostAvailable&&registrationStage>=3;
    if(ghostAvailable&&this.ghostRegistrationScreen?.material?.map){
      const canvas=this.ghostRegistrationScreen.material.map.image;
      const context=canvas.getContext('2d');
      context.fillStyle='#07110e';context.fillRect(0,0,canvas.width,canvas.height);
      context.fillStyle='#17392c';context.fillRect(0,0,canvas.width,65);
      context.fillStyle='#b8d1c1';context.font='bold 28px sans-serif';context.fillText('急診掛號系統　／　夜間紀錄',28,43);
      context.fillStyle='#e4ece4';context.font='bold 42px monospace';if(registrationStage>=1)context.fillText('00:33　1998-ER-0217',38,178);
      context.font='26px sans-serif';if(registrationStage>=2){context.fillText(worldNarrative('劉志遠／ENG-860214'),38,225);context.fillText('資料狀態：已存在',38,266);}if(registrationStage>=3)context.fillText('病人位置：未回報',38,298);
      context.fillStyle='#718779';context.fillRect(38,350,820,3);
      this.ghostRegistrationScreen.material.map.needsUpdate=true;
    }
    if(this.ghostRegistrationTerminal){
      this.ghostRegistrationTerminal.userData.interactable=ghostAvailable;
    }
    if(this.erNoteInteraction){
      this.erNoteInteraction.interactable=!gameState.isTaskComplete('P1_ER_NOTE_DONE')&&!ghostAvailable;
    }
    if(this.janeDoePatient){
      this.janeDoePatient.visible=gameState.getFlag('ER_JANE_PRESENT')===true;
      this.janeDoeHit.userData.interactable=this.janeDoePatient.visible;
      this.janeDoeHit.userData.label=(gameState.getFlag('ER_LIU_IDENTITY_REVEALED')||persistentMemory.data.journalNotes.some(note=>note.id==='LIU_MAINTENANCE_TAG'))?'評估劉志遠／ENG-860214':'評估身分待確認的男性';
    }
  }

  buildCurtain(x, z) {
    const material = new THREE.MeshStandardMaterial({color: 0xa6bbb1, roughness: .98, side: THREE.DoubleSide});
    const geometry = new THREE.PlaneGeometry(2.8, 2.2, 84, 1);
    const positions = geometry.attributes.position;
    for(let i=0;i<positions.count;i++) positions.setZ(i, Math.sin(positions.getX(i)*Math.PI*9)*.024);
    geometry.computeVertexNormals();
    const cloth = new THREE.Mesh(geometry, material);
    cloth.position.set(x,1.5,z);
    cloth.rotation.y=Math.PI/2;
    cloth.castShadow=true; cloth.receiveShadow=true;
    this.art.add(cloth);
    solid(this.art,this.gf.materials.stainless,[x,2.67,z],[.045,.045,2.86]);
    [-1.2,0,1.2].forEach(offset=>solid(this.art,this.gf.materials.stainless,[x,2.93,z+offset],[.012,.53,.012]));
    for(let offset=-1.3;offset<1.4;offset+=.23) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.036,.007,6,12),this.gf.materials.stainless);
      ring.rotation.y=Math.PI/2; ring.position.set(x,2.64,z+offset); this.art.add(ring);
    }
  }

  buildArtDetails() {
    const m=this.gf.materials;
    const add=(material,position,size)=>solid(this.art,material,position,size);
    wallTrim(this.zoneGroup,m);
    this.janeDoePatient=new THREE.Group();
    this.janeDoePatient.name='ER_UnknownMale_ObservationPatient';
    this.janeDoePatient.position.set(10.5,.83,7.5);
    this.janeDoePatient.visible=false;
    this.zoneGroup.add(this.janeDoePatient);
    const gown=new THREE.MeshStandardMaterial({color:0x555a55,roughness:.98});
    const skin=new THREE.MeshStandardMaterial({color:0xc8b7a7,roughness:.94});
    const hair=new THREE.MeshStandardMaterial({color:0x383633,roughness:1});
    const torso=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),gown);torso.scale.set(.28,.19,.46);torso.position.z=-.06;this.janeDoePatient.add(torso);
    const blanket=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),m.bedSheet);blanket.scale.set(.34,.13,.32);blanket.position.set(0,-.04,-.43);this.janeDoePatient.add(blanket);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.15,24,18),skin);head.scale.set(.88,.82,1);head.position.set(0,.025,.64);this.janeDoePatient.add(head);
    const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.155,24,16),hair);hairCap.scale.set(1,.42,1);hairCap.position.set(0,.1,.65);this.janeDoePatient.add(hairCap);
    for(const side of [-1,1]){
      const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.052,.34,5,10),skin);arm.rotation.z=side*.16;arm.position.set(side*.31,-.005,.05);this.janeDoePatient.add(arm);
    }
    const wristband=new THREE.Mesh(new THREE.TorusGeometry(.06,.013,8,20),new THREE.MeshStandardMaterial({color:0xc9a94a,roughness:.82}));
    wristband.rotation.x=Math.PI/2;wristband.position.set(-.30,-.005,.25);this.janeDoePatient.add(wristband);
    const tag=new THREE.Mesh(new THREE.BoxGeometry(.16,.045,.07),new THREE.MeshStandardMaterial({color:0xe0cf87,roughness:.9}));tag.position.set(-.35,-.005,.25);this.janeDoePatient.add(tag);
    const janeHit=new THREE.Mesh(new THREE.BoxGeometry(.95,.65,1.45),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    janeHit.position.set(0,.08,.03);janeHit.userData={interactable:false,id:'2F_JANE_DOE_ASSESSMENT',type:'p1_action',action:'ER_ASSESS',label:'評估身分不詳男性'};
    this.janeDoePatient.add(janeHit);this.janeDoeHit=janeHit;this.interactables.push(janeHit);
    this.janeDoeWristband={id:'2F_CHARRED_MAINTENANCE_TAG',format:'ENG-860214 / 6F SKILL LAB / B-PANEL'};
    counterFront(this.art,m,3.5,3.135,4.8,1.1);
    add(m.counterTop,[3.5,1.115,3.5],[4.95,.055,.77]);
    add(m.doorWood,[3.5,2.55,3.5],[5.1,.5,.2]);
    [1.05,5.95].forEach(x=>add(m.doorWood,[x,1.58,3.125],[.065,3.16,.12]));
    const triageDeskY=1.1425;
    [1.8,5.2].forEach((x,index)=>{
      const screen=monitor(this.art,m,x,triageDeskY,3.55);
      screen.name=`ER_TriageMonitor_${index+1}`;
    });
    const nurseComputerHit=new THREE.Mesh(new THREE.BoxGeometry(4.5,1.25,.9),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    nurseComputerHit.position.set(3.5,1.48,3.48);
    nurseComputerHit.userData={interactable:true,id:'ER_NURSE_COMPUTERS',type:'er_nurse_computer',label:'查看急診護理站電腦'};
    this.zoneGroup.add(nurseComputerHit);this.interactables.push(nurseComputerHit);
    asset(this.art,'printer',[4.15,triageDeskY,3.55],[.8,.8,.8]);
    asset(this.art,'plant',[3.15,triageDeskY,3.55],[.25,.25,.25]);
    // Observation sign is held by a ceiling-fastened beam, above the open route.
    add(m.wallBumper,[14.5,2.63,3.5],[10.9,.42,.14]);
    [9.2,14.5,19.8].forEach(x=>add(m.stainless,[x,2.94,3.5],[.025,.52,.025]));
    for(let bay=0;bay<4;bay++) {
      const x=10.5+bay*2.5;
      add(m.bedSheet,[x,1.43,9.17],[.72,.19,.025]);
      [-.22,0,.22].forEach(dx=> {
        const socket=new THREE.Mesh(new THREE.CylinderGeometry(.032,.032,.018,16),m.stainless);
        socket.rotation.x=Math.PI/2; socket.position.set(x+dx,1.43,9.147);this.art.add(socket);
      });
      add(m.wallDark,[x,1.66,9.17],[.17,.1,.025]);
    }
    // Treatment tools remain over the existing bed footprint or against the back wall.
    add(m.stainless,[3.5,1.32,-9.265],[1.4,.16,.06]);
    [3.1,3.5,3.9].forEach(x=>add(m.wallDark,[x,1.32,-9.226],[.07,.07,.018]));
    // Small wall-mounted charting shelf has support brackets and restrained binders.
    add(m.doorWood,[13,1.45,-9.24],[2.1,.045,.18]);
    [12.25,13.75].forEach(x=>add(m.stainless,[x,1.35,-9.26],[.03,.18,.15]));
    for(let i=0;i<7;i++) {
      const x=12.4+i*.14;
      add(i%2?m.wallBumper:m.bedSheet,[x,1.65,-9.23],[.11,.34,.14]);
      add(m.bedSheet,[x,1.66,-9.151],[.06,.15,.005]);
    }
    // Threshold and floor expansion joint details follow the existing exterior slab.
    add(m.stainless,[-11.598,1.25,0],[.012,2.3,.012]);
    add(m.stainless,[22,.012,0],[.22,.024,2.32]);
    [-3.65,3.65].forEach(z=>add(m.metal,[26,.008,z],[7.8,.016,.09]));
    for(let x=22.2;x<30;x+=.18) {
      [-3.65,3.65].forEach(z=>add(m.wallDark,[x,.018,z],[.008,.006,.07]));
    }
  }

  buildAcuteGate() {
    this.acuteGateDoor=new AccessDoor(this,{id:'ER_MAIN',x:0,z:0,yaw:Math.PI/2,width:1.92,title:'2F 急診'});
    this.acuteGateCollider=this.acuteGateDoor.closedBox;
    this.acuteGateReaders=this.acuteGateDoor.readers;
    this.setAcuteGateClosed(true);
  }
  setAcuteGateClosed(closed){this.acuteGateDoor.setClosed(closed);this.acuteGateClosed=closed;}
  toggleAcuteGate(p){const ok=this.acuteGateDoor.toggle(p);this.acuteGateClosed=this.acuteGateDoor.closed;return ok;}

  cleanup() {
    if (this.zoneGroup) {
      this.scene.remove(this.zoneGroup);
      disposeZoneArt(this.zoneGroup);
    }
    this.colliders = [];
    this.walkables = [];
    this.interactables = [];
  }
}
