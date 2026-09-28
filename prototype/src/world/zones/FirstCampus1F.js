// FirstCampus1F.js - Milestone M5: First Campus 1F Public Lobby
import * as THREE from 'three';
import { buildCampusBackdrop } from '../../art/CampusBackdrop.js';
import { artRoot, asset, solid, monitor, counterFront, wallTrim } from '../../art/ArtDetails.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { buildRoomWing } from '../shared/RoomWing.js';
import { Doorway } from '../shared/Doorway.js';
import { SignAnchor } from '../shared/SignAnchor.js';
import { CollisionFactory } from '../shared/CollisionFactory.js';
import { gameState } from '../../core/GameState.js';

export class FirstCampus1F {
  constructor(scene, geometryFactory) {
    this.scene = scene;
    this.gf = geometryFactory;
    this.colliders = [];
    this.walkables = [];
    this.interactables = [];
    this.zoneGroup = new THREE.Group();
    this.zoneGroup.name = 'FirstCampus1F_Zone';
  }

  build() {
    this.scene.add(this.zoneGroup);

    const lobbyHeight = 4.0; // Higher ceiling for public lobby

    // ==========================================
    // 1. GRAND PUBLIC LOBBY FLOOR & CEILING (x: -14 to 18, z: -8 to 8)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 2, 0, 0, 32, 16, this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup, 2, lobbyHeight, 0, 32, 16);

    // Outer perimeter walls. The east wall is segmented so the closed glass-fronted
    // pharmacy/drug-storage and outpatient areas read as real locked rooms rather than
    // decorative panels placed on a solid wall.
    this.gf.buildWall(this.zoneGroup, this.colliders, 18, lobbyHeight / 2, -6.8, 0.4, lobbyHeight, 2.4);
    this.gf.buildWall(this.zoneGroup, this.colliders, 18, lobbyHeight / 2, 0.0, 0.4, lobbyHeight, 4.8);
    this.gf.buildWall(this.zoneGroup, this.colliders, 18, lobbyHeight / 2, 6.8, 0.4, lobbyHeight, 2.4);
    this.gf.buildWall(this.zoneGroup,this.colliders,-11.8,lobbyHeight/2,8,4.4,lobbyHeight,.4);
    this.gf.buildWall(this.zoneGroup,this.colliders,5.8,lobbyHeight/2,8,24.4,lobbyHeight,.4);
    this.gf.buildWall(this.zoneGroup,this.colliders,-8,3.6,8,3.2,.8,.4);  // North wall

    const buildClosedSteelBay = (z, title) => {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.6, 3.2), this.gf.materials.metal);
      glass.position.set(17.85, 1.3, z);
      this.zoneGroup.add(glass);
      CollisionFactory.addBox(this.colliders, 17.88, 1.3, z, 0.16, 2.6, 3.2);

      // Stainless perimeter and center mullion make the locked glass door legible.
      for (const zOff of [-1.56, 0, 1.56]) {
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 0.07), this.gf.materials.stainless);
        mullion.position.set(17.80, 1.35, z + zOff);
        this.zoneGroup.add(mullion);
      }
      for (const y of [0.08, 2.62]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 3.2), this.gf.materials.stainless);
        rail.position.set(17.80, y, z);
        this.zoneGroup.add(rail);
      }

      // A shallow sealed room behind the glass prevents exterior/void views while
      // remaining non-walkable during night duty.
      this.gf.buildFloor(this.zoneGroup, null, 19.0, 0.02, z, 2.0, 3.2, this.gf.materials.floorTile);
      this.gf.buildCeiling(this.zoneGroup, 19.0, lobbyHeight, z, 2.0, 3.2);
      this.gf.buildWall(this.zoneGroup, this.colliders, 20.0, lobbyHeight / 2, z, 0.4, lobbyHeight, 3.2);
      this.gf.buildWall(this.zoneGroup, this.colliders, 19.0, lobbyHeight / 2, z - 1.6, 2.0, lobbyHeight, 0.2);
      this.gf.buildWall(this.zoneGroup, this.colliders, 19.0, lobbyHeight / 2, z + 1.6, 2.0, lobbyHeight, 0.2);
      this.gf.buildWall(this.zoneGroup,this.colliders,18,3.3,z,.4,1.4,3.2);
      return glass;
    };

    // 1. Pharmacy / drug-storage facade (z = -4.0), closed behind glass at night.
    const pharmShutter = buildClosedSteelBay(-4.0, '門診藥局／藥庫');
    pharmShutter.userData = {
      interactable: true,
      id: '1F_PHARM_GATE',
      type: 'closed_door',
      locked: true,
      label: '檢視夜間鎖閉的門診藥局／藥庫'
    };
    this.interactables.push(pharmShutter);

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 17.78,
      y: 2.8,
      z: -4.0,
      rotationY: -Math.PI / 2,
      code: 'PHARM',
      title: '【夜間未開放】門診藥局／藥庫',
      subtitle: 'PHARMACY / DRUG STORAGE CLOSED AT NIGHT',
      header: '青嶺醫療中心 ｜ 藥劑科'
    });

    // 2. Outpatient clinic facade (z = 4.0), also a visibly locked glass frontage.
    const opdShutter = buildClosedSteelBay(4.0, '門診診間區');
    opdShutter.userData = {
      interactable: true,
      id: '1F_OPD_GATE',
      type: 'closed_door',
      locked: true,
      label: '檢視夜間閉館的門診區',
      subtitle: '「門診區日間營業結束，夜間暫停開放。」'
    };
    this.interactables.push(opdShutter);

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 17.78,
      y: 2.8,
      z: 4.0,
      rotationY: -Math.PI / 2,
      code: 'OPD',
      title: '【夜間未開放】門診診間區',
      subtitle: 'OUTPATIENT CLINICS CLOSED',
      header: '青嶺醫療中心 ｜ 門診部'
    });

    // West wall with elevator / stairs core
    this.gf.buildWall(this.zoneGroup, this.colliders, -14, lobbyHeight / 2, 0, 0.4, lobbyHeight, 16);

    SignAnchor.buildHangingSign({
      scene: this.zoneGroup,
      x: -11.0,
      y: 3.3,
      z: 0,
      ceilingY: lobbyHeight,
      rotationY: Math.PI / 2,
      text: '大廳西側電梯 ｜ 2F 急診・3F 行政・4F 病房・8F 天橋'
    });

    // South wall with main entrance (z = -8)
    // Left wall segment (x: -14 to -1)
    this.gf.buildWall(this.zoneGroup, this.colliders, -7.5, lobbyHeight / 2, -8, 13, lobbyHeight, 0.4);
    // Right wall segment (x: 3 to 18)
    this.gf.buildWall(this.zoneGroup, this.colliders, 10.5, lobbyHeight / 2, -8, 15, lobbyHeight, 0.4);

    // Main entrance doorway (x: -1 to 3, width 4m, height 3m, lintel: 3.0 to 4.0m)
    const mainEntranceDoorway = Doorway.build({
      scene: this.zoneGroup,
      colliders: this.colliders,
      x: 1.0,
      y: 0,
      z: -8.0,
      width: 4.0,
      height: 3.0,
      wallHeight: lobbyHeight,
      wallThickness: 0.4,
      isAlongX: true,
      isOpen: true,
      doorMaterial: this.gf.materials.glass
    });
    // Hide Doorway's generic propped-open leaf; the real night state is represented
    // by the two closed glass leaves below.
    for (const child of mainEntranceDoorway.children) {
      const p = child.geometry?.parameters;
      if (p?.width === 0.05 && p?.height === 2.95) child.visible = false;
    }

    // Left and right glass leaves (visual representation)
    const glassDoorL = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.8, 0.08), this.gf.materials.glass);
    glassDoorL.position.set(0.05, 1.45, -7.95);
    this.zoneGroup.add(glassDoorL);

    const glassDoorR = new THREE.Mesh(new THREE.BoxGeometry(1.95, 2.8, 0.08), this.gf.materials.glass);
    glassDoorR.position.set(1.95, 1.45, -7.95);
    this.zoneGroup.add(glassDoorR);

    // Keycard / Intercom access terminal on right frame
    const intercom = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.08), this.gf.materials.metal);
    intercom.position.set(3.08, 1.3, -7.78);
    this.zoneGroup.add(intercom);

    // Main entrance closed signage
    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 1.0,
      y: 3.2,
      z: -7.78,
      rotationY: Math.PI,
      code: 'NIGHT',
      title: '夜間正門已關閉 ｜ 門禁管制',
      subtitle: 'MAIN ENTRANCE CLOSED AT NIGHT',
      header: '青嶺醫療中心 ｜ 總務保全課'
    });

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 1.0,
      y: 1.6,
      z: -7.78,
      rotationY: Math.PI,
      width: 1.1,
      height: 0.45,
      code: 'CLOSED',
      title: '【夜間大門已關閉】',
      subtitle: '夜間到勤／急診洽公請由 2F 急診夜間出入口進出',
      header: ''
    });

    // Make the door interactable to trigger dialogue: 「值班時間都會關起來，出不去。」
    const mainDoorHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.6, 0.5),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    mainDoorHitbox.position.set(1.0, 1.3, -7.8);
    mainDoorHitbox.userData = {
      interactable: true,
      id: '1F_MAIN_DOOR',
      type: 'exit_door',
      label: '檢視夜間鎖閉的正門玻璃門'
    };
    this.zoneGroup.add(mainDoorHitbox);
    this.interactables.push(mainDoorHitbox);

    // Legacy service door concealed by later wall finish; only becomes meaningful after 3F archive evidence.
    const hiddenDoorMat=new THREE.MeshStandardMaterial({color:0xd8d6cf,roughness:.96});
    const hiddenPanel=new THREE.Mesh(new THREE.PlaneGeometry(1.15,2.15),hiddenDoorMat);hiddenPanel.name='FirstFloor_BPanel_ConcealedDoor';
    hiddenPanel.position.set(-13.785,1.18,4.55);hiddenPanel.rotation.y=Math.PI/2;this.zoneGroup.add(hiddenPanel);
    const seamMat=new THREE.MeshStandardMaterial({color:0x8f918d,roughness:.95});
    for(const zOff of [-.57,.57]){
      const seam=new THREE.Mesh(new THREE.BoxGeometry(.012,2.16,.018),seamMat);
      seam.name=`FirstFloor_BPanel_Seam_${zOff}`;
      seam.position.set(-13.77,1.18,4.55+zOff);this.zoneGroup.add(seam);
    }
    const topSeam=new THREE.Mesh(new THREE.BoxGeometry(.012,.018,1.16),seamMat);
    topSeam.name='FirstFloor_BPanel_Seam_Top';
    topSeam.position.set(-13.77,2.25,4.55);this.zoneGroup.add(topSeam);
    const oldKeyhole=new THREE.Mesh(new THREE.CircleGeometry(.022,12),new THREE.MeshBasicMaterial({color:0x4a4239}));
    oldKeyhole.name='FirstFloor_BPanel_OldKeyhole';oldKeyhole.position.set(-13.755,1.05,4.86);oldKeyhole.rotation.y=Math.PI/2;this.zoneGroup.add(oldKeyhole);
    const discoveredFrame=new THREE.Group();
    discoveredFrame.name='FirstFloor_BPanel_DiscoveredFrame';discoveredFrame.visible=false;this.zoneGroup.add(discoveredFrame);
    const frameMat=new THREE.MeshStandardMaterial({color:0x75664b,metalness:.32,roughness:.78,emissive:0x201a10,emissiveIntensity:.22});
    const addFramePiece=(name,size,position)=>{
      const piece=new THREE.Mesh(new THREE.BoxGeometry(...size),frameMat);
      piece.name=name;piece.position.set(...position);discoveredFrame.add(piece);
    };
    addFramePiece('FirstFloor_BPanel_Frame_Left',[.045,2.18,.045],[-13.72,1.18,3.95]);
    addFramePiece('FirstFloor_BPanel_Frame_Right',[.045,2.18,.045],[-13.72,1.18,5.15]);
    addFramePiece('FirstFloor_BPanel_Frame_Top',[.045,.045,1.24],[-13.72,2.25,4.55]);
    addFramePiece('FirstFloor_BPanel_Frame_Bottom',[.045,.045,1.24],[-13.72,.11,4.55]);
    const lockPlate=new THREE.Mesh(new THREE.BoxGeometry(.026,.17,.09),this.gf.materials.wallDark);
    lockPlate.name='FirstFloor_BPanel_LockPlate';lockPlate.position.set(-13.675,1.05,4.86);discoveredFrame.add(lockPlate);
    oldKeyhole.position.x=-13.655;discoveredFrame.add(oldKeyhole);
    const discoveredLed=new THREE.Mesh(new THREE.CircleGeometry(.036,20),new THREE.MeshBasicMaterial({color:0x382646}));
    discoveredLed.name='FirstFloor_BPanel_PurpleIndicator';discoveredLed.position.set(-13.655,1.05,4.72);discoveredLed.rotation.y=Math.PI/2;discoveredLed.visible=false;this.zoneGroup.add(discoveredLed);
    const discoveredLight=new THREE.PointLight(0x9a69c1,0,2.2,2);
    discoveredLight.name='FirstFloor_BPanel_DiscoverySpill';discoveredLight.position.set(-13.45,1.48,4.55);this.zoneGroup.add(discoveredLight);
    const hiddenHit=new THREE.Mesh(new THREE.BoxGeometry(.38,2.3,1.35),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    hiddenHit.name='FirstFloor_BPanel_InteractionHitbox';
    hiddenHit.position.set(-13.58,1.18,4.55);
    hiddenHit.userData={
      interactable:false,
      id:'1F_HIDDEN_SERVICE_DOOR',type:'hidden_service_door_1f',label:'檢查警衛台後方浮現的舊門框'
    };
    this.zoneGroup.add(hiddenHit);this.interactables.push(hiddenHit);
    this.hiddenServiceHit=hiddenHit;this.hiddenServiceFrame=discoveredFrame;this.hiddenServiceKeyhole=oldKeyhole;this.hiddenServiceLed=discoveredLed;this.hiddenServiceLight=discoveredLight;
    this.hiddenServiceDoor={id:'1F_HIDDEN_SERVICE_DOOR',position:[-13.78,1.18,4.55],requires:'FIRST_FLOOR_GUARD_KEY',revealedBy:'HOOK_1F_HIDDEN_DOOR'};

    const guardPost=new THREE.Group();guardPost.name='FirstCampus1F_OldGuardPost';guardPost.position.set(-10.7,0,3.2);guardPost.rotation.y=2.30;
    guardPost.userData={interactable:true,id:'OLD_GUARD_POST',type:'guard_post_inspection',label:'檢查警衛台'};
    this.zoneGroup.add(guardPost);this.guardPostObject=guardPost;this.interactables.push(guardPost);
    solid(guardPost,this.gf.materials.doorWood,[0,.53,0],[2.1,1.06,.78]);
    solid(guardPost,this.gf.materials.counterTop,[0,1.10,0],[2.18,.08,.84]);

    // Identy Loop: Zhou's second photo clue is a physical framed print on the
    // old guard desk. The glass reflection contains the photographer's partial
    // camera/hand silhouette but no readable identity label.
    const canLoadIdentityImage=typeof document!=='undefined'&&typeof document.createElementNS==='function';
    const reflectionTexture=canLoadIdentityImage
      ? new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL || './'}assets/identity-v03/history-reflection.png`)
      : null;
    if(reflectionTexture)reflectionTexture.colorSpace=THREE.SRGBColorSpace;
    const reflectionFrame=new THREE.Group();
    reflectionFrame.name='IdentityGuardReflectionPhoto_Frame';
    reflectionFrame.position.set(-.40,1.50,-.29);
    reflectionFrame.rotation.x=-.10;
    const reflectionBacking=new THREE.Mesh(
      new THREE.BoxGeometry(.78,.54,.035),
      new THREE.MeshStandardMaterial({color:0x30271d,roughness:.8})
    );
    reflectionFrame.add(reflectionBacking);
    const reflectionPhoto=new THREE.Mesh(
      new THREE.PlaneGeometry(.72,.48),
      reflectionTexture
        ? new THREE.MeshBasicMaterial({map:reflectionTexture,toneMapped:false})
        : new THREE.MeshBasicMaterial({color:0x615b50})
    );
    reflectionPhoto.position.z=.019;
    reflectionPhoto.name='IdentityGuardReflectionPhoto';
    reflectionPhoto.userData={
      interactable:true,
      id:'IDENTITY_GUARD_REFLECTION_PHOTO',
      type:'identity_photo',
      label:'查看警衛台上的事故前設備照片'
    };
    reflectionFrame.add(reflectionPhoto);
    guardPost.add(reflectionFrame);
    this.interactables.push(reflectionPhoto);
    const cctv=monitor(guardPost,this.gf.materials,-.48,1.17,-.18,0);cctv.name='OldGuardPost_CCTVMonitor';
    solid(guardPost,this.gf.materials.metal,[.50,1.15,-.1],[.30,.12,.22]);
    solid(guardPost,this.gf.materials.lightWarm,[.06,1.155,.08],[.36,.018,.24]).name='OldGuardPost_NightLogbook';
    const deskPhone=new THREE.Group();deskPhone.name='OldGuardPost_DeskPhone';deskPhone.position.set(.72,1.15,.20);guardPost.add(deskPhone);
    solid(deskPhone,this.gf.materials.wallDark,[0,.045,0],[.30,.07,.20],.015);
    solid(deskPhone,this.gf.materials.metal,[0,.092,-.025],[.24,.018,.08],.006);
    const phoneCord=new THREE.CatmullRomCurve3([
      new THREE.Vector3(-.11,.08,.03),new THREE.Vector3(-.18,.06,.12),
      new THREE.Vector3(-.10,.03,.20),new THREE.Vector3(-.17,.01,.27)
    ]);
    deskPhone.add(new THREE.Mesh(new THREE.TubeGeometry(phoneCord,24,.004,6,false),this.gf.materials.wallDark));
    const keyRing=new THREE.Mesh(new THREE.TorusGeometry(.075,.009,8,24),this.gf.materials.stainless);
    keyRing.name='OldGuardPost_KeyRing';keyRing.rotation.x=Math.PI/2;keyRing.position.set(.76,.03,-.22);guardPost.add(keyRing);
    for(let i=0;i<3;i++){
      const key=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.12,8),this.gf.materials.stainless);
      key.name=`OldGuardPost_ServiceKey_${i+1}`;key.position.set(.70+i*.055,.03,-.30);key.rotation.z=(i-1)*.16;guardPost.add(key);
    }
    const taskLamp=new THREE.Group();taskLamp.name='OldGuardPost_TaskLamp';taskLamp.position.set(-.92,1.14,.20);guardPost.add(taskLamp);
    const lampStem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,.30,12),this.gf.materials.metal);lampStem.position.y=.15;taskLamp.add(lampStem);
    const lampHead=new THREE.Mesh(new THREE.ConeGeometry(.09,.10,20,1,true),this.gf.materials.wallBumper);lampHead.position.set(0,.31,.03);lampHead.rotation.x=Math.PI;taskLamp.add(lampHead);
    const lampLight=new THREE.PointLight(0xe9dfc0,.18,1.8,2);lampLight.name='OldGuardPost_WarmTaskLight';lampLight.position.set(0,.28,.08);taskLamp.add(lampLight);
    asset(guardPost,'storageCabinet',[-1.25,0,-.16],[.45,.9,.55]);
    CollisionFactory.addBox(this.colliders,-10.7,.55,3.2,2.3,1.1,1.9);
    SignAnchor.buildWallPlaque({scene:guardPost,x:0,y:.72,z:.43,rotationY:0,width:1.2,height:.34,code:'SECURITY',title:'警衛台',subtitle:'NIGHT SECURITY POST',header:''});
    this.guardPost={id:'OLD_GUARD_POST',position:[-10.7,0,3.2],cctv:'OldGuardPost_CCTVMonitor',logbook:'OldGuardPost_NightLogbook',phone:'OldGuardPost_DeskPhone',keys:'OldGuardPost_KeyRing',lamp:'OldGuardPost_TaskLamp',serviceDoor:'1F_HIDDEN_SERVICE_DOOR'};

    // ==========================================
    // 2. CENTRAL INFORMATION & REGISTRATION RECEPTION (x: -1 to 5, z: -2 to 1)
    // ==========================================
    const receptionBase = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 1.1, 2.4),
      this.gf.materials.wallDark
    );
    receptionBase.position.set(2.0, 0.55, -0.5);
    this.zoneGroup.add(receptionBase);

    const receptionTop = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.08, 2.6),
      this.gf.materials.counterTop
    );
    receptionTop.position.set(2.0, 1.14, -0.5);
    this.zoneGroup.add(receptionTop);
    CollisionFactory.addBox(this.colliders, 2.0, 0.6, -0.5, 5.2, 1.2, 2.6);

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 2.0,
      y: 2.2,
      z: -1.8,
      rotationY: 0,
      code: 'INFO',
      title: '大廳服務台 ｜ 掛號批價',
      subtitle: 'INFORMATION & REGISTRATION',
      header: '青嶺醫療中心 ｜ 1F 公共服務大廳'
    });

    // ==========================================
    // 3. PUBLIC WAITING LOUNGE (x: 8 to 16, z: -5 to 5)
    // ==========================================
    for (let row = -1; row <= 1; row++) {
      const seatRow = new THREE.Mesh(
        new THREE.BoxGeometry(5.5, 0.48, 0.7),
        this.gf.materials.wallDark
      );
      seatRow.position.set(12.0, 0.24, row * 3.5);
      this.zoneGroup.add(seatRow);
      CollisionFactory.addBox(this.colliders, 12.0, 0.35, row * 3.5, 5.5, 0.7, 0.7);
    }

    // Lobby grand chandelier / ceiling fixtures
    this.gf.buildCeilingLight(this.zoneGroup, 2.0, lobbyHeight - 0.05, -3.0, 1.1, 10.0, 0xfff6ea);
    this.gf.buildCeilingLight(this.zoneGroup, 2.0, lobbyHeight - 0.05, 3.0, 1.1, 10.0, 0xfff6ea);
    this.gf.buildCeilingLight(this.zoneGroup, 12.0, lobbyHeight - 0.05, 0.0, 0.9, 9.0, 0xfff6ea);
    this.gf.buildCeilingLight(this.zoneGroup, -7.0, lobbyHeight - 0.05, 0.0, 0.9, 9.0, 0xfff6ea);

    const art = artRoot(this.zoneGroup, 'Lobby');
    receptionBase.material = this.gf.materials.doorWood;
    counterFront(art, this.gf.materials, 2, -1.72, 5, 1.1);
    monitor(art, this.gf.materials, 1, 1.18, -.5, Math.PI);
    monitor(art, this.gf.materials, 3, 1.18, -.5, Math.PI);
    solid(art, this.gf.materials.doorWood, [2,2.2,-1.76], [5.2,.52,.13]);
    for (const x of [-.4,4.4]) solid(art,this.gf.materials.metal,[x,1.5,-1.7],[.045,3,.045]);
    for (const child of this.zoneGroup.children) {
      if (child.geometry?.parameters.width === 5.5 && child.position.y === .24) child.visible = false;
      if (child.name.startsWith('Plaque_INFO')) { child.rotation.y = Math.PI; child.position.z = -1.85; }
    }
    for (const z of [-3.5,0,3.5]) for(const x of [10.3,12.1,13.9]) asset(art,'bench',[x,0,z]);
    asset(art,'plant',[-10.5,0,6]);
    asset(art,'plant',[16.5,0,6]);
    for(const [x,z,scale] of [[-5.8,-6.8,.65],[6.8,-6.8,.7],[10.2,-6.8,.65],[14.2,-6.8,.7],[-5.8,6.8,.7],[7.8,6.8,.7]])asset(art,'plant',[x,0,z],[scale,scale,scale]);
    for(const [i,x] of [-5,-2,5,9,13].entries()){
      const stand=new THREE.Group();stand.name=`Lobby_PublicInformationStand_${i+1}`;stand.position.set(x,0,-6.65);art.add(stand);
      solid(stand,this.gf.materials.metal,[0,.60,0],[.045,1.20,.045]);
      solid(stand,this.gf.materials.wallBumper,[0,1.02,0],[.80,.52,.055]);
      solid(stand,this.gf.materials.lightWarm,[0,1.02,-.033],[.69,.42,.012]);
      solid(stand,this.gf.materials.metal,[0,.03,0],[.72,.06,.42]);
    }
    for(const [x,title] of [[-4,'夜間門診公告'],[1,'院區平面圖'],[6,'病人安全宣導'],[11,'探病與門禁須知']])SignAnchor.buildWallPlaque({scene:art,x,y:2.35,z:7.76,rotationY:Math.PI,width:1.45,height:.48,code:'',title,subtitle:'青嶺醫療中心',header:''});
    // The shared elevator-core opening is clear; no legacy directory board across it.
    wallTrim(this.zoneGroup,this.gf.materials);
    const exterior=buildCampusBackdrop(this.zoneGroup);
    exterior.position.y=11.5;
    this.syncStoryState();
    return this;
  }

  setEntranceClosed(closed) {
    this.entranceClosed = closed;
    if (closed) {
      if (!this.entranceCollider) {
        this.entranceCollider = new THREE.Box3(
          new THREE.Vector3(-1.0, 0, -8.2),
          new THREE.Vector3(3.0, 3.0, -7.8)
        );
        this.colliders.push(this.entranceCollider);
      }
    } else if (this.entranceCollider) {
      const idx = this.colliders.indexOf(this.entranceCollider);
      if (idx !== -1) this.colliders.splice(idx, 1);
      this.entranceCollider = null;
    }
  }

  syncStoryState(){
    const unlocked=gameState.getFlag('M6_FLOOR6_RESOLVED')===true&&!gameState.getFlag('B2_EXITED_PERMANENTLY');
    const discovered=unlocked&&gameState.getFlag('HIDDEN_SERVICE_DOOR_DISCOVERED')===true&&!gameState.getFlag('B2_EXITED_PERMANENTLY');
    if(this.guardPostObject)this.guardPostObject.userData.interactable=unlocked&&!discovered;
    if(this.hiddenServiceHit)this.hiddenServiceHit.userData.interactable=discovered;
    if(this.hiddenServiceFrame)this.hiddenServiceFrame.visible=discovered;
    if(this.hiddenServiceKeyhole)this.hiddenServiceKeyhole.visible=discovered;
    if(this.hiddenServiceLed)this.hiddenServiceLed.visible=discovered;
    if(this.hiddenServiceLight)this.hiddenServiceLight.intensity=discovered ? .42 : 0;
    const panel=this.zoneGroup.getObjectByName('FirstFloor_BPanel_ConcealedDoor');
    if(panel)panel.material.color.setHex(discovered?0xc7c0ae:0xd8d6cf);
    this.zoneGroup.traverse(object=>{
      if(object.name.startsWith('FirstFloor_BPanel_Seam'))object.material.color.setHex(discovered?0x76654c:0x8f918d);
    });
  }

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
