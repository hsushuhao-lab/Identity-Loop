import { AccessDoor } from '../shared/AccessDoor.js';
// SecondCampus2F.js - Milestone M9: Second Campus 2F Special Bridge Landing & Gallery
import * as THREE from 'three';
import { artRoot, solid, asset, monitor, counterFront, wallTrim } from '../../art/ArtDetails.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { Doorway } from '../shared/Doorway.js';
import { SignAnchor } from '../shared/SignAnchor.js';
import { CollisionFactory } from '../shared/CollisionFactory.js';
import {buildDeskCluster,buildMonitorWall,buildSupplyCabinet} from '../../art/ClinicalDressing.js';
import { gameState } from '../../core/GameState.js';

export class SecondCampus2F {
  constructor(scene, geometryFactory) {
    this.scene = scene;
    this.gf = geometryFactory;
    this.colliders = [];
    this.walkables = [];
    this.interactables = [];
    this.roomAreas = [];
    this.zoneGroup = new THREE.Group();
    this.zoneGroup.name = 'SecondCampus2F_Zone';
  }

  build() {
    this.scene.add(this.zoneGroup);
    this.art = artRoot(this.zoneGroup, 'SecondCampus2F');

    // ==========================================
    // 1. BRIDGE ARRIVAL GALLERY FLOOR & CEILING (x: 60 to 80, z: -4.5 to 4.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 70, 0, 0, 20, 9, this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup, 70, 3.2, 0, 20, 9);

    // North wall
    this.gf.buildWall(this.zoneGroup,this.colliders,65.2,1.6,4.5,10.4,3.2,.4);
    this.gf.buildWall(this.zoneGroup,this.colliders,76.8,1.6,4.5,6.4,3.2,.4);
    // South wall
    for (const [x, width] of [[62.65,5.3],[70,6.6],[77.35,5.3]]) {
      this.gf.buildWall(this.zoneGroup, this.colliders, x, 1.6, -4.5, width, 3.2, .4);
    }
    for (const [index, x] of [66,74].entries()) {
      this.gf.buildFloor(this.zoneGroup, this.walkables, x, 0, -7.5, 8.04, 6.04);
      this.gf.buildCeiling(this.zoneGroup, x, 3.2, -7.5, 8, 6);
      this.gf.buildWall(this.zoneGroup, this.colliders, x, 1.6, -10.5, 8, 3.2, .4);
      for(const side of [-1,1])this.gf.buildWall(this.zoneGroup, this.colliders, x+side*4, 1.6, -7.5, .4, 3.2, 6);
      Doorway.build({scene:this.zoneGroup,colliders:this.colliders,x,z:-4.5,width:1.4,height:2.4,wallHeight:3.2,isAlongX:true,isOpen:true,doorMaterial:this.gf.materials.doorWood});
      const code = index === 0 ? '201' : '202';
      const label = index === 0 ? '警衛休息室' : '安檢監控支援室';
      SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:x-1.25,y:1.9,z:-4.28,rotationY:0,code,title:label,subtitle:'',header:'第二院區 2F'});
      if(index===0){
        buildDeskCluster(this.art,this.gf.materials,{x:x-1,z:-8.7,chairs:2,name:'Second2F_GuardRestDesk'});
        buildSupplyCabinet(this.art,this.gf.materials,{x:x+2.8,z:-9.65,name:'Second2F_GuardRestShelf'});
        asset(this.art,'storageCabinet',[x-3,0,-9.6],[.72,.9,.72]);
        const vhs=solid(this.art,this.gf.materials.wallDark,[x-.72,.86,-8.56],[.34,.055,.22]);
        vhs.name='LI_GuardLounge_CCTV_Tape';
        const tapeLabel=solid(this.art,this.gf.materials.lightWarm,[x-.72,.892,-8.56],[.24,.008,.13]);
        tapeLabel.name='LI_GuardLounge_CCTV_Tape_Label';
        const clueHit=new THREE.Mesh(
          new THREE.BoxGeometry(.78,.62,.72),
          new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
        );
        clueHit.position.set(x-.72,1.02,-8.56);
        clueHit.userData={
          interactable:true,
          id:'LI_GUARD_LOUNGE_CCTV_CLUE',
          type:'identity_route_context_event',
          label:'查看警衛桌上的監視錄影帶'
        };
        this.zoneGroup.add(clueHit);this.interactables.push(clueHit);
        this.liGuardLoungeCctvClue=clueHit;
      }else{
        const controlDesk=buildDeskCluster(this.art,this.gf.materials,{x:x-1,z:-8.7,chairs:2,name:'Second2F_SecurityControlDesk'});
        const oldPhone=controlDesk.getObjectByName('Second2F_SecurityControlDesk_Phone');
        oldPhone.traverse(object=>object.geometry?.dispose());oldPhone.removeFromParent();
        buildMonitorWall(this.art,this.gf.materials,{x,z:-10.25,name:'Second2F_CCTVWall'});
        buildSupplyCabinet(this.art,this.gf.materials,{x:x+2.8,z:-9.65,name:'Second2F_SecurityArchiveShelf'});
        // Wall-mounted historical recordings are always optional exploration.
        const archiveWallHit=new THREE.Mesh(
          new THREE.BoxGeometry(3.2,2.0,1.2),
          new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
        );
        archiveWallHit.position.set(x,1.55,-9.75);
        archiveWallHit.userData={
          interactable:true,
          id:'SECOND_2F_CCTV_ARCHIVE_WALL',
          type:'archive_document',
          label:'查看牆面的過去監視錄影',
          documentTitle:'第二院區 2F｜過去監視錄影',
          pages:[
            '1998 年舊監視畫面：天橋與第二院區 2F 連通口。時間戳多次缺格，但仍可辨認值班醫師、警衛與工務人員往返。',
            '其中幾段影像在 02:17 前後突然失去同步；畫面右側偶爾多出不在值勤名冊上的白袍輪廓。',
            '這些舊畫面可以隨時重看，但不是目前監控主機的即時異常。'
          ]
        };
        this.zoneGroup.add(archiveWallHit);
        this.interactables.push(archiveWallHit);

        // Current CCTV workstation: visible at all times but locked as an interaction
        // until Zhang has heard the guard's coffee-room hint.
        const cctvDeskHit=new THREE.Mesh(
          new THREE.BoxGeometry(1.45,.95,1.10),
          new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
        );
        cctvDeskHit.position.set(x-1.0,1.22,-8.72);
        cctvDeskHit.userData={
          interactable:gameState.getFlag('ZHANG_CCTV_HINT_RECEIVED')===true,
          id:'SECOND_2F_CCTV_DESK',
          type:'security_monitor_anomaly',
          label:'使用桌上監控電腦'
        };
        this.zoneGroup.add(cctvDeskHit);
        this.interactables.push(cctvDeskHit);
        this.cctvDeskHit=cctvDeskHit;

        // Identity Loop monitoring-room phone; same visual language as the 316 desk phone.
        const cctvPhone=new THREE.Group();
        cctvPhone.name='Second2F_CCTV_Phone';
        const phoneDesk=new THREE.Group();phoneDesk.name='Second2F_CCTV_PhoneDesk';
        phoneDesk.position.set(x+2.4,0,-6.45);this.art.add(phoneDesk);
        const phoneTop=solid(phoneDesk,this.gf.materials.doorWood,[0,.77,0],[1.18,.06,.68]);
        phoneTop.name='CCTVPhoneDeskTop';
        for(const dx of [-.49,.49])for(const dz of [-.25,.25])solid(phoneDesk,this.gf.materials.stainless,[dx,.37,dz],[.04,.74,.04]);
        CollisionFactory.addBox(this.colliders,x+2.4,.4,-6.45,1.18,.8,.68);
        cctvPhone.position.set(0,.8,0);phoneDesk.add(cctvPhone);
        cctvPhone.userData={surface:'Second2F_CCTV_PhoneDesk'};
        const phoneBase=new THREE.Mesh(
          new THREE.BoxGeometry(.34,.09,.23),
          new THREE.MeshStandardMaterial({color:0x27302b,roughness:.58})
        );
        phoneBase.position.y=.045;cctvPhone.add(phoneBase);
        const phonePanel=new THREE.Mesh(
          new THREE.BoxGeometry(.27,.025,.08),
          new THREE.MeshStandardMaterial({color:0xd8ded8,roughness:.72})
        );
        phonePanel.position.set(0,.102,-.045);cctvPhone.add(phonePanel);
        for(let row=0;row<3;row++)for(let col=0;col<3;col++){
          const key=new THREE.Mesh(
            new THREE.BoxGeometry(.026,.012,.018),
            new THREE.MeshStandardMaterial({color:0x828a85,roughness:.6})
          );
          key.position.set(-.07+col*.07,.118,.015+row*.036);
          cctvPhone.add(key);
        }
        const handset=new THREE.Mesh(
          new THREE.CapsuleGeometry(.026,.20,4,10),
          new THREE.MeshStandardMaterial({color:0x1d2421,roughness:.6})
        );
        handset.rotation.z=Math.PI/2;handset.position.set(0,.17,-.065);cctvPhone.add(handset);
        const cordCurve=new THREE.CatmullRomCurve3([
          new THREE.Vector3(-.12,.13,.02),
          new THREE.Vector3(-.18,.09,.12),
          new THREE.Vector3(-.09,.05,.20),
          new THREE.Vector3(-.16,.02,.28)
        ]);
        cctvPhone.add(new THREE.Mesh(
          new THREE.TubeGeometry(cordCurve,24,.004,6,false),
          new THREE.MeshStandardMaterial({color:0x1d2421,roughness:.8})
        ));
        const cctvPhoneHit=new THREE.Mesh(
          new THREE.BoxGeometry(.62,.42,.50),
          new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false})
        );
        cctvPhoneHit.position.set(0,.12,0);
        cctvPhoneHit.userData={
          interactable:true,
          id:'IDENTITY_SECOND_2F_CCTV_PHONE',
          type:'identity_cctv_phone',
          label:'接聽監控室電話'
        };
        cctvPhone.add(cctvPhoneHit);
        this.cctvPhoneDesk=phoneDesk;
        this.interactables.push(cctvPhoneHit);
        this.identityCctvPhone=cctvPhoneHit;
      }
      this.gf.buildCeilingLight(this.zoneGroup,x,3.15,-7.5);
      this.roomAreas.push({id:code,label,point:[x,1.7,-7.5],door:[x,1.7,-4.5],corridor:[x,1.7,0]});
    }
    this.gf.buildFloor(this.zoneGroup,this.walkables,72,0,8.85,8,8.7,this.gf.materials.floor);
    this.gf.buildCeiling(this.zoneGroup,72,3.2,8.85,8,8.7);
    this.gf.buildWall(this.zoneGroup,this.colliders,72,1.6,13.2,8,3.2,.4);
    for(const x of [68,76])this.gf.buildWall(this.zoneGroup,this.colliders,x,1.6,8.85,.4,3.2,8.7);
    for(const [x,width] of [[69.5,3],[74.5,3]])this.gf.buildWall(this.zoneGroup,this.colliders,x,1.6,4.5,width,3.2,.4);
    // Keep the elevator-side opening unobstructed: no door leaf/frame in front of this passage.
    SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:70.65,y:1.9,z:4.28,rotationY:0,code:'203',title:'醫師值班室',subtitle:'DUTY ROOM',header:'第二院區 2F'});
    buildDeskCluster(this.art,this.gf.materials,{x:70,z:8.8,chairs:1,name:'Second2F_DoctorDutyDesk'});
    buildSupplyCabinet(this.art,this.gf.materials,{x:69,z:12.75,name:'Second2F_DoctorShelf'});
    asset(this.art,'hospitalBed',[73.5,0,8.7],[1,1,.9],Math.PI/2);
    this.gf.buildWall(this.zoneGroup,this.colliders,74.4,1.3,6.7,3,2.6,.18);
    this.gf.buildWall(this.zoneGroup,this.colliders,74.9,1.3,8.1,.18,2.6,3);
    solid(this.art,this.gf.materials.bedSheet,[75.15,.28,7.5],[.42,.56,.48]);
    solid(this.art,this.gf.materials.wall,[74.75,.65,6.86],[.55,.18,.36]);
    solid(this.art,this.gf.materials.glass,[74.75,1.35,6.78],[.62,.55,.025]);
    this.gf.buildCeilingLight(this.zoneGroup,72,3.15,7.5);
    this.roomAreas.push({id:'203',label:'醫師值班室',point:[72,1.7,7.5],door:[72,1.7,4.5],corridor:[72,1.7,0]});

    // West wall with bridge entrance portal (at x = 60)
    // Left segment (z: -4.5 to -1.4)
    this.gf.buildWall(this.zoneGroup, this.colliders, 60.0, 1.6, -2.95, 0.4, 3.2, 3.1);
    // Right segment (z: 1.4 to 4.5)
    this.gf.buildWall(this.zoneGroup, this.colliders, 60.0, 1.6, 2.95, 0.4, 3.2, 3.1);

    // Bridge portal doorway
    Doorway.build({
      scene: this.zoneGroup,
      colliders: this.colliders,
      x: 60.0,
      y: 0,
      z: 0.0,
      width: 2.8,
      height: 2.5,
      wallHeight: 3.2,
      wallThickness: 0.4,
      isAlongX: false,
      isOpen: true,
      frameMaterial: this.gf.materials.metal
    });

    SignAnchor.buildHangingSign({
      scene: this.zoneGroup,
      x: 63.0,
      y: 2.65,
      z: 0,
      ceilingY: 3.2,
      rotationY: Math.PI / 2,
      text: '◀ 第二院區 2F 連通道管制大廳 ｜ 警衛室・電梯・樓梯往 1F ▶'
    });

    // ==========================================
    // 2. BRIDGE SECURITY & ACCESS CONTROL STATION (No nursing station on 2F)
    // ==========================================
    const counterBody = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 1.1, 0.8),
      this.gf.materials.wallDark
    );
    counterBody.position.set(67.0, 0.55, 3.2);
    this.zoneGroup.add(counterBody);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.08, 0.95),
      this.gf.materials.counterTop
    );
    counterTop.position.set(67.0, 1.14, 3.2);
    this.zoneGroup.add(counterTop);
    CollisionFactory.addBox(this.colliders, 67.0, 0.6, 3.2, 4.4, 1.2, 0.95);

    // Security monitor on counter facing inward (+Z toward back wall)
    monitor(this.art, this.gf.materials, 67.0, 1.18, 3.2, 0);

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 67.0,
      y: 2.2,
      z: 4.28,
      rotationY: Math.PI,
      code: 'SEC-2',
      title: '2F 連通道警衛室 ｜ 出入口管制台',
      subtitle: 'BRIDGE SECURITY & ACCESS CONTROL',
      header: '青嶺醫療中心 ｜ 第二院區 2F'
    });

    // ==========================================
    // 3. ELEVATOR & STAIR CORE (at East wall x = 80)
    // ==========================================
    this.gf.buildWall(this.zoneGroup,this.colliders,80,1.6,0,.4,3.2,9);

    // Ceiling lights
    this.gf.buildCeilingLight(this.zoneGroup, 65, 3.15, 0, 0.8, 7.5);
    this.gf.buildCeilingLight(this.zoneGroup, 75, 3.15, 0, 0.8, 7.5);

    // Narrative lure: while passing the monitoring-room doorway after M4, the light
    // glitches hard enough to pull the player's attention into room 202.
    this.cctvLureLight=new THREE.PointLight(0xddebe2,0,8,2);
    this.cctvLureLight.name='Second2F_CCTV_LureLight';
    this.cctvLureLight.position.set(74,2.35,-4.8);
    this.zoneGroup.add(this.cctvLureLight);
    this.cctvLureElapsed=0;
    this.cctvLureActive=false;

    const art = this.art;
    counterFront(art, this.gf.materials, 67, 2.78, 4.2, 1.1);
    asset(art, 'bench', [70, 0, -3.85]);
    const oldBridgeDoor=this.zoneGroup.getObjectByName('Doorway_60_0');
    for(const leaf of oldBridgeDoor.children)if(leaf.geometry?.parameters.height===2.35||leaf.geometry?.parameters.height===2.45)leaf.visible=false;
    new AccessDoor(this,{id:'BRIDGE_ACCESS',x:60,z:0,yaw:Math.PI/2,width:2.8,title:'天橋感應門',portal:'bridge_from_second'});
    wallTrim(this.zoneGroup,this.gf.materials);
    return this;
  }

  update(camera,delta=0){
    if(!camera||gameState.getFlag('CCTV_SELF_DUPLICATE_SEEN')){
      if(this.cctvLureLight)this.cctvLureLight.intensity=0;
      return;
    }
    const nearDoor=camera.position.x>71.0&&camera.position.x<77.0&&camera.position.z>-6.4&&camera.position.z<-2.1;
    if(nearDoor&&!gameState.getFlag('SECOND_2F_CCTV_LURE_SEEN')){
      gameState.setFlag('SECOND_2F_CCTV_LURE_SEEN',true);
      this.cctvLureActive=true;
      this.cctvLureElapsed=0;
    }
    if(this.cctvLureActive){
      this.cctvLureElapsed+=delta;
      const t=this.cctvLureElapsed;
      const pulse=(Math.sin(t*29)>0?.95:.05)+(Math.sin(t*11)>.35?.45:0);
      this.cctvLureLight.intensity=pulse;
      if(t>2.8){this.cctvLureActive=false;this.cctvLureLight.intensity=.10;}
    }else if(this.cctvLureLight){
      this.cctvLureLight.intensity=.06;
    }
  }

  cleanup() {
    if (this.zoneGroup) {
      this.scene.remove(this.zoneGroup);
      disposeZoneArt(this.zoneGroup);
    }
    this.colliders = [];
    this.walkables = [];
    this.interactables = [];
    this.roomAreas = [];
  }
}
