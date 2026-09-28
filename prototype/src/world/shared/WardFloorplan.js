import * as THREE from 'three';
import { worldNarrative } from '../../story/IdentityPrivacy.js';
import { solid, asset } from '../../art/ArtDetails.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { PlanWalls, ordinaryRoom, nursingStationV5, workstation } from './PlanArchitecture.js';
import { AccessDoor } from './AccessDoor.js';
import { KeyedKnobDoor } from './KeyedKnobDoor.js';
import { CollisionFactory } from './CollisionFactory.js';
import { SignAnchor } from './SignAnchor.js';
import {createAnnieMannequin} from './AnnieMannequin.js';
import { persistentMemory } from '../../core/PersistentMemory.js';
import { gameState } from '../../core/GameState.js';
import {drawMemoryFragment,preloadArtPass2Image} from '../../art/ArtPass2Assets.js';

/** September 22 V5 user floorplan. Units are gameplay metres, not a real hospital survey. */
export class WardFloorplan {
  constructor(scene,gf,{campus='first',floor=4}={}){
    Object.assign(this,{scene,gf,campus,floor});this.colliders=[];this.walkables=[];this.interactables=[];this.roomAreas=[];this.bedAreas=[];this.workstations=[];this.clinicalProps=[];this.accessDoors={};this.keyedDoors={};
    this.layoutVersion='USER_PLAN_20260923_IMAGE_V5_2';this.activityHall=null;this.layoutPlan=null;
    this.zoneGroup=new THREE.Group();this.zoneGroup.name=`${campus}_${floor}F_PLAN_V5_2`;
  }
  build(){this.scene.add(this.zoneGroup);const second=this.campus==='second',o=second?72:0,walls=new PlanWalls(this);this.planOrigin=o;
    this.gf.buildFloor(this.zoneGroup,this.walkables,o,0,-10,24,24,this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup,o,3.2,-10,24,24);

    // V5.1: outer gate -> vestibule. Straight through the inner gate enters the nursing station.
    // From the vestibule, move right then turn left/north through the glass bypass into the ward.
    walls.rect(o-12,-22,o+12,2);walls.cut('x',2,o,2.4);
    // Room/storage walls already cover x<=-7 and x>=7 at z=0.
    // Only bridge the gaps to the glass-box station; keep the station's south face glazed.
    walls.line('x',0,o-7,o-4.6);
    walls.line('x',0,o+4.6,o+7);walls.cut('x',0,o+6.0,1.4);

    const room=(n,r,side,d,kind='ward',label)=>ordinaryRoom(this,walls,{id:String(this.floor*100+n),label:label||`${this.floor*100+n} 病房`,rect:[r[0]+o,r[1],r[2]+o,r[3]],side,door:d+(side==='north'||side==='south'?o:0),kind,bedLimit:!second&&this.floor===4?32:Infinity});
    const roomIds=Array.from({length:9},(_,i)=>String(this.floor*100+i+1));

    // V5 perimeter geometry: 401/501 bottom-left -> 403/503 upper-left,
    // 404/504–406/506 across the top, 407/507 upper-right -> 409/509 bottom-right.
    room(1,[-12,-6,-8,0],'east',-3);
    room(2,[-12,-12,-8,-6],'east',-9);
    room(3,[-12,-22,-8,-12],'east',-13);
    room(4,[-8,-22,-3,-16],'south',-5.5);
    room(5,[-3,-22,2,-16],'south',-.5);
    room(6,[2,-22,7,-16],'south',4.5);
    room(7,[7,-22,12,-12],'west',-13);
    room(8,[7,-12,12,-6],'west',-9);
    room(9,[7,-6,12,0],'west',-3,'ward','409 整修封閉');

    // Entrance vestibule storage room on the left, plant bay on the right.
    ordinaryRoom(this,walls,{id:'STORE_ENTRY',label:'儲藏室',rect:[o-12,0,o-7,2],side:'east',door:1,kind:'storage',protectedArea:false,storageLock:'knob'});
    if(second&&this.floor===5){
      // Keep nursing interaction on the workstation screen for visual consistency.
      const nurseStationScreen=this.workstations.find(item=>item.id==='second_station_A')?.screen;
      if(nurseStationScreen){
        nurseStationScreen.userData={
          ...nurseStationScreen.userData,
          interactable:true,
          id:'IDENTITY_SECOND_5F_NURSE_STATION',
          type:'identity_second_5f_nurse_station',
          label:'聯絡第二院區 5F 護理站'
        };
        this.interactables.push(nurseStationScreen);
      }

      const keyDesk=this.workstations.find(item=>item.id==='second_station_A')?.desk;
      const keySurfaceY=keyDesk?new THREE.Box3().setFromObject(keyDesk).max.y:.82;
      const consultKey=new THREE.Group();
      consultKey.name='IdentitySecond5F_ConsultSpareKey';
      consultKey.position.set(o-3.05,keySurfaceY+.035,-2.17);
      const consultRing=new THREE.Mesh(new THREE.TorusGeometry(.052,.008,8,22),this.gf.materials.stainless);
      consultRing.rotation.x=Math.PI/2;consultKey.add(consultRing);
      const consultBlade=new THREE.Mesh(new THREE.BoxGeometry(.028,.012,.16),this.gf.materials.stainless);
      consultBlade.position.set(0,.004,-.09);consultKey.add(consultBlade);
      const consultTag=solid(consultKey,this.gf.materials.wallBumper,[.075,.012,.018],[.15,.022,.085]);
      consultTag.name='IdentitySecond5F_ConsultSpareKey_Tag';
      this.zoneGroup.add(consultKey);
      this.identitySecondConsultKey=consultKey;
    }

    if(!second&&this.floor===4){
      // Keep nursing interaction on the workstation screen; no low-poly nurse model.
      const nurseStationScreen=this.workstations.find(item=>item.id==='first_station_A')?.screen;
      if(nurseStationScreen){
        nurseStationScreen.userData={
          ...nurseStationScreen.userData,
          interactable:true,
          id:'IDENTITY_4F_NURSE_STATION',
          type:'identity_nurse_station_4f',
          label:'聯絡 4F 護理站'
        };
        this.interactables.push(nurseStationScreen);
      }

      // 4F temporary access set: traditional room key + temporary ward access card.
      // This is intentionally separate from the formal 316 duty credentials.
      const keyDesk=this.workstations.find(item=>item.id==='first_station_A')?.desk;
      const keySurfaceY=keyDesk?new THREE.Box3().setFromObject(keyDesk).max.y:.82;
      const spareKey=new THREE.Group();
      spareKey.name='Identity4F_WardSpareKey';
      spareKey.position.set(-3.05,keySurfaceY+.035,-2.17);
      const keyRing=new THREE.Mesh(new THREE.TorusGeometry(.052,.008,8,22),this.gf.materials.stainless);
      keyRing.rotation.x=Math.PI/2;spareKey.add(keyRing);
      for(let i=0;i<2;i++){
        const key=new THREE.Mesh(new THREE.BoxGeometry(.025,.012,.14),this.gf.materials.stainless);
        key.position.set(-.025+i*.055,.004,-.085-i*.015);
        key.rotation.y=(-.18+i*.32);
        spareKey.add(key);
      }
      const tag=solid(spareKey,this.gf.materials.wallBumper,[.08,.012,.015],[.12,.022,.075]);
      tag.name='Identity4F_WardSpareKey_Tag';
      const tempCard=new THREE.Mesh(
        new THREE.BoxGeometry(.14,.012,.09),
        new THREE.MeshStandardMaterial({color:0x3e765f,roughness:.5})
      );
      tempCard.position.set(-.10,.006,.06);
      tempCard.rotation.y=-.18;
      tempCard.name='Identity4F_TemporaryAccessCard';
      spareKey.add(tempCard);
      this.zoneGroup.add(spareKey);
      this.identityWardSpareKey=spareKey;
    }

    this.wardDoor=new AccessDoor(this,{id:second?'second_ward':'first_ward',x:o,z:2,width:2.4,title:'感應式鐵門'});
    this.innerWardDoor=new AccessDoor(this,{id:second?'second_ward_inner':'first_ward_inner',x:o,z:0,width:2.4,title:'感應式鐵門2'});
    this.glassBypassDoor=new AccessDoor(this,{id:second?'second_ward_glass':'first_ward_glass',x:o+6.0,z:0,width:1.4,title:'感應玻璃門',material:this.gf.materials.glass,readerSide:1});
    this.wardGateCollider=this.wardDoor.closedBox;this.wardGateClosed=true;this.innerWardGateClosed=true;this.glassBypassClosed=true;

    this.activityHall={id:'ACTIVITY_HALL',label:'病房公共區',bounds:[o-7,-16,o+7,0],center:[o,1.7,-13]};
    this.layoutVersion='USER_PLAN_20260923_IMAGE_V5_2';
    this.layoutPlan={
      rooms:roomIds,
      storage:['STORE_ENTRY'],
      centralStation:true,
      nursingStationFourSideGlass:true,
      nursingStationLowerWallUpperGlass:true,
      patientRoomDoorType:'traditional_knob',
      bedPlaquesWallMounted:true,
      dualGate:true,
      glassBypassDoor:true,
      stationWardDoor:true,
      stationWardDoorFaces:roomIds[5],
      stationWardDoorReaderSide:-1,
      stationWorkstationCount:4,
      stationClinicalProps:true,
      entrancePlant:true,
      bedCapacity:!second&&this.floor===4?32:36,
      bedLabels:['A','B','C','D'],
      bed33Id:roomIds[8]+'A',
      allControlledDoorsDefaultClosed:true,
      dutyRoomOutsideWard:true,
      narrowStationStrip:false
    };

    if(!second){
      this.buildDutyRoom();
      if(this.floor===4)this.buildBed33Legend();
    }else{
      this.buildSecondDutyRoom(o);
      if(this.floor===5)this.buildSecondCampusChestLegend(o);
    }

    this.entryPoint=[o,1.7,3.2];this.vestibulePoint=[o,1.7,1];this.hallPoint=[o,1.7,-1.2];

    walls.build();
    // Solid sill spans the outer ward/core seam; no sub-pixel support crack at z=2.
    this.gf.buildFloor(this.zoneGroup,this.walkables,o,.002,2,2.4,.36,this.gf.materials.stainless);
    for(const [x,z] of [[o,1],[o,-12],[o-6,-4],[o+6,-4],[o,-18]]) this.gf.buildCeilingLight(this.zoneGroup,x,3.15,z,.7,8);
    SignAnchor.buildHangingSign({scene:this.zoneGroup,x:o,y:2.7,z:1.6,ceilingY:3.2,rotationY:0,text:second?`${this.floor}F 病房`:'4F 病房'});
    this.zoneGroup.updateWorldMatrix(true,true);return this;
  }
  buildDutyRoom(){
    const w=new PlanWalls(this);w.rect(-14,2,-8,10);w.cut('z',-8,6,1.4);
    this.gf.buildFloor(this.zoneGroup,this.walkables,-11,0,6,6,8,this.gf.materials.floorWood);
    this.gf.buildCeiling(this.zoneGroup,-11,3.2,6,6,8);
    this.dutyDoor=new KeyedKnobDoor(this,{id:'duty_room',x:-8,z:6,yaw:Math.PI/2,width:1.4,title:'醫師值班室',openDirection:1});
    this.dutyDoor.setClosed(true);this.dutyDoorClosed=true;
    SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:-7.885,y:2.62,z:6,rotationY:Math.PI/2,width:1.18,height:.34,code:'4F',title:'醫師值班室',subtitle:'ON-CALL ROOM',header:''});
    asset(this.zoneGroup,'hospitalBed',[-12.5,0,7.8],[1.2,.95,.97]);CollisionFactory.addBox(this.colliders,-12.5,.45,7.8,1.4,.9,2.2);
    solid(this.zoneGroup,this.gf.materials.doorWood,[-11.25,.28,8.1],[.5,.56,.5]);
    solid(this.zoneGroup,this.gf.materials.lightWarm,[-11.25,.76,8.1],[.19,.24,.19]);
    workstation(this,{x:-10.0,z:3.1,id:'duty_desk'});
    const dutyDesk=this.workstations.find(w=>w.id==='duty_desk');
    const deskSurfaceY=dutyDesk?.desk?new THREE.Box3().setFromObject(dutyDesk.desk).max.y:.76;
    if(dutyDesk?.screen){
      dutyDesk.screen.userData={interactable:true,id:'4F_DUTY_COMPUTER',type:'p1_action',action:'END_SHIFT',label:'使用值班室電腦稍作休息'};
      this.interactables.push(dutyDesk.screen);
      dutyDesk.screen.getObjectByName('WorkstationCoffeeSurface').material=new THREE.MeshBasicMaterial({color:0x3b2417,side:THREE.DoubleSide});
      const steam=new THREE.Group();steam.name='DutyRoom_HotCoffeeSteam';steam.position.set(-.34,.13,.14);dutyDesk.screen.add(steam);
      const steamMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.16,depthWrite:false});
      for(const [x,y] of [[-.018,0],[.016,.06]]){const wisp=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),steamMaterial);wisp.scale.set(.65,1.8,.65);wisp.position.set(x,y,0);steam.add(wisp);}
    }
    const phone=new THREE.Group();phone.name='DutyRoom_ExtensionPhone';phone.position.set(-9.45,0,3.34);phone.userData={fixture:'EXTENSION_PHONE',extension:'316',interactable:true,id:'4F_DUTY_PHONE',type:'story_phone',label:'接聽值班電話'};this.zoneGroup.add(phone);this.dutyPhone=phone;this.interactables.push(phone);
    solid(phone,this.gf.materials.wallDark,[0,.84,0],[.28,.07,.20]);
    solid(phone,this.gf.materials.metal,[0,.89,-.01],[.19,.018,.09]);
    solid(phone,this.gf.materials.bedSheet,[0,.92,-.055],[.25,.035,.055]);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)solid(phone,this.gf.materials.stainless,[-.065+col*.065,.885,.025+row*.035],[.025,.008,.016]);
    const handset=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.19,4,10),this.gf.materials.wallDark);handset.name='DutyPhoneHandset';handset.rotation.z=Math.PI/2;handset.position.set(0,.98,-.055);phone.add(handset);
    phone.updateWorldMatrix(true,true);
    phone.position.y+=deskSurfaceY-new THREE.Box3().setFromObject(phone).min.y;
    this.dutyCabinetAnchor=[-8.8,0,9.3];this.dutyCabinetYaw=Math.PI;
    asset(this.zoneGroup,'storageCabinet',this.dutyCabinetAnchor,[1,1,1],this.dutyCabinetYaw);

    // Enclosed duty-room bathroom with a real knob door, toilet, sink, mirror and dedicated light.
    w.rect(-14,2,-11.5,5.2);w.cut('z',-11.5,4.0,1.1);
    this.gf.buildFloor(this.zoneGroup,this.walkables,-12.75,.006,3.6,2.5,3.2,this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup,-12.75,3.2,3.6,2.5,3.2);
    this.dutyBathroomDoor=new KeyedKnobDoor(this,{id:'duty_bathroom',x:-11.5,z:4.0,yaw:Math.PI/2,width:1.1,title:'值班室洗手間',openDirection:1});
    this.dutyBathroomDoor.setClosed(true);
    // Toilet with cistern and seat.
    solid(this.zoneGroup,this.gf.materials.bedSheet,[-13.25,.34,4.05],[.58,.68,.78]);
    solid(this.zoneGroup,this.gf.materials.bedSheet,[-13.25,.73,4.36],[.50,.52,.20]);
    solid(this.zoneGroup,this.gf.materials.stainless,[-13.25,.74,4.23],[.34,.035,.32]);

    // Compact sink/vanity against the south wall.
    solid(this.zoneGroup,this.gf.materials.wall,[-12.35,.42,2.55],[.78,.78,.46]);
    solid(this.zoneGroup,this.gf.materials.stainless,[-12.35,.84,2.55],[.84,.08,.50]);
    solid(this.zoneGroup,this.gf.materials.bedSheet,[-12.35,.88,2.55],[.48,.10,.30]);
    solid(this.zoneGroup,this.gf.materials.metal,[-12.35,1.05,2.48],[.05,.28,.05]);

    // Wall-mounted mirror, towel rail and floor drain.
    solid(this.zoneGroup,this.gf.materials.glass,[-12.35,1.65,2.20],[.78,.82,.025]);
    solid(this.zoneGroup,this.gf.materials.metal,[-13.35,1.20,2.35],[.48,.05,.05]);
    solid(this.zoneGroup,this.gf.materials.metal,[-12.8,.015,4.65],[.22,.03,.22]);

    // Refined tile wainscot and framed mirror; geometry stays inside the existing bathroom bounds.
    solid(this.zoneGroup,this.gf.materials.bedSheet,[-13.88,1.02,3.62],[.025,1.98,2.90]);
    solid(this.zoneGroup,this.gf.materials.bedSheet,[-12.75,1.02,2.12],[2.20,1.98,.025]);
    solid(this.zoneGroup,this.gf.materials.bedSheet,[-12.75,1.02,5.08],[2.20,1.98,.025]);
    for(const yy of [.52,1.02,1.52])solid(this.zoneGroup,this.gf.materials.wallBumper,[-13.865,yy,3.62],[.012,.018,2.86],.001);
    solid(this.zoneGroup,this.gf.materials.metal,[-12.35,2.08,2.185],[.86,.035,.04]);
    solid(this.zoneGroup,this.gf.materials.metal,[-12.35,1.22,2.185],[.86,.035,.04]);
    solid(this.zoneGroup,this.gf.materials.metal,[-12.79,1.65,2.185],[.035,.86,.04]);
    solid(this.zoneGroup,this.gf.materials.metal,[-11.91,1.65,2.185],[.035,.86,.04]);
    solid(this.zoneGroup,this.gf.materials.bedSheet,[-11.93,1.24,2.18],[.18,.28,.12]);
    solid(this.zoneGroup,this.gf.materials.metal,[-13.86,.95,3.28],[.06,.08,.42]);
    const paper=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.28,20),this.gf.materials.bedSheet);
    paper.rotation.x=Math.PI/2;paper.position.set(-13.80,.95,3.28);this.zoneGroup.add(paper);
    const bin=new THREE.Mesh(new THREE.CylinderGeometry(.15,.18,.42,20),this.gf.materials.stainless);
    bin.position.set(-13.20,.21,2.78);this.zoneGroup.add(bin);
    solid(this.zoneGroup,this.gf.materials.metal,[-13.25,.88,4.38],[.12,.06,.03]);
    solid(this.zoneGroup,this.gf.materials.wallDark,[-13.20,2.63,2.16],[.52,.28,.035]);
    for(let i=0;i<5;i++)solid(this.zoneGroup,this.gf.materials.stainless,[-13.38+i*.09,2.63,2.135],[.015,.20,.01],.001);
    solid(this.zoneGroup,this.gf.materials.wallBumper,[-12.55,.018,3.55],[.90,.025,.58]);
    this.gf.buildCeilingLight(this.zoneGroup,-12.75,3.15,3.6,.48,5,0xfff2dc);

    this.dutyBathroom={
      door:[-11.5,1.7,4.0],bounds:[-14,2,-11.5,5.2],
      fixtures:['toilet','sink','mirror','towel_rail','floor_drain'],
      details:['tile_wainscot','mirror_frame','soap_dispenser','toilet_paper','waste_bin','flush_button','exhaust_grille','bath_mat'],
      visualRefinement:'V5_2_DUTY_BATHROOM_REFINEMENT'
    };
    w.build();this.gf.buildCeilingLight(this.zoneGroup,-11,3.15,6,.7,7,0xffebce);
    this.dutyRoom={door:[-8,1.7,6],inside:[-9.5,1.7,6],outside:[-6.5,1.7,6],bounds:[-14,2,-8,10]};
    const reportBoard=this.zoneGroup.getObjectByName('FourF_NursingHandoverBoard');
    if(reportBoard){
      // Reporting is now implicit when the physician opens the ward access door.
      // Keep the board readable as scenery; do not require a second hidden/board interaction.
      reportBoard.userData={...reportBoard.userData,interactable:false,id:'4F_NURSING_REPORT_BOARD',type:'decorative',label:''};
      this.fourFNursingReportBoard=reportBoard;
    }

  }
  buildBed33Legend(){
    const m=this.gf.materials;

    // Legend 01 clue board: a single old slot claims bed 33 = 409A.
    const boardCanvas=document.createElement('canvas');boardCanvas.width=760;boardCanvas.height=520;
    const ctx=boardCanvas.getContext('2d');
    ctx.fillStyle='#e9ece7';ctx.fillRect(0,0,760,520);ctx.fillStyle='#435b4f';ctx.fillRect(0,0,760,62);
    ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.fillText('4F 晚間床位板',24,42);
    ctx.fillStyle='#34443b';ctx.font='22px monospace';
    ['29  408A','30  408B','31  408C','32  408D'].forEach((t,i)=>ctx.fillText(t,52,122+i*62));
    ctx.fillStyle='#8a332b';ctx.font='bold 25px monospace';ctx.fillText('33  409A',420,308);
    ctx.font='16px sans-serif';ctx.fillStyle='#777';ctx.fillText('舊卡片／未列入現行床位統計',420,344);
    const boardTex=new THREE.CanvasTexture(boardCanvas);boardTex.colorSpace=THREE.SRGBColorSpace;
    const board=new THREE.Mesh(new THREE.PlaneGeometry(1.55,1.05),new THREE.MeshStandardMaterial({map:boardTex,roughness:.92}));
    board.position.set(-4.47,1.62,-4.4);board.rotation.y=Math.PI/2;
    board.name='Bed33_WardBoard';
    board.userData={
      interactable:true,id:'BED33_BOARD',type:'bed33_board',label:'查看 4F 晚間床位板',
      documentTitle:'4F 晚間床位板',
      pages:['現行床位表列至 32 床後，右側卻夾著一張褪色舊卡：\n\n33　409A\n\n旁註：「未列入現行床位統計」。']
    };
    this.zoneGroup.add(board);this.interactables.push(board);

    // Ground both papers against the actual GLB work-desk surfaces, not a guessed Y.
    const stationA=this.workstations.find(w=>w.id==='first_station_A');
    const stationB=this.workstations.find(w=>w.id==='first_station_B');
    const deskSurfaceY=(station)=>{
      station?.desk?.updateWorldMatrix?.(true,true);
      return station?.desk?new THREE.Box3().setFromObject(station.desk).max.y:.82;
    };
    const aY=deskSurfaceY(stationA),bY=deskSurfaceY(stationB);
    const aPos=stationA?.desk?.position||new THREE.Vector3(-3.35,0,-2.35);
    const bPos=stationB?.desk?.position||new THREE.Vector3(-1.35,0,-2.35);

    const hisSheet=solid(this.zoneGroup,m.lightWarm,[bPos.x+.08,bY+.009,bPos.z+.18],[.38,.018,.28]);
    hisSheet.rotation.y=-.12;hisSheet.name='Bed33_HIS409Sheet';
    hisSheet.userData={
      interactable:true,id:'BED33_HIS_409',type:'bed33_his_status',label:'查看 409 系統狀態列印',
      documentTitle:'HIS 房室狀態查詢',
      pages:['房號：409\n狀態：整修封閉\n可用床數：0\n現行住院床統計：不計入\n\n然而護理站舊卡卻仍列著「33／409A」。']
    };
    this.interactables.push(hisSheet);

    // Temporary assignment form is physically seated on workstation A.
    const assignment=solid(this.zoneGroup,m.lightWarm,[aPos.x+.13,aY+.009,aPos.z+.17],[.40,.018,.30]);
    assignment.rotation.y=.08;assignment.name='Bed33_AssignmentForm';
    assignment.userData={interactable:true,id:'BED33_ASSIGNMENT',type:'bed33_assignment',label:'查看臨時床位分配單'};
    this.interactables.push(assignment);

    // 409 sealed-room presentation. The existing knob door remains physically closed;
    // warning tape is render-only and the interaction is intercepted by main.js.
    for(const y of [.92,1.24,1.56]){
      const tape=solid(this.zoneGroup,m.wallBumper,[6.88,y,-3.0],[.025,.09,1.45]);
      tape.rotation.x=(y>1.2?.16:-.13);tape.name='Bed33_409_WarningTape';
    }
    SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:6.75,y:2.22,z:-3.0,rotationY:Math.PI/2,width:1.38,height:.38,code:'',title:'環境消毒與管線重置',subtitle:'暫停使用',header:''});
    const coldLight=new THREE.PointLight(0x9ac9c4,.32,2.2,2);coldLight.position.set(6.22,1.95,-3.0);coldLight.name='Bed33_409_ColdPeepholeLight';this.zoneGroup.add(coldLight);
    const sealedHit=new THREE.Mesh(new THREE.BoxGeometry(.55,2.1,1.75),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    sealedHit.position.set(6.72,1.18,-3.0);
    sealedHit.userData={
      interactable:true,id:'BED33_409_SEALED',type:'bed33_409_sealed',label:'查看 409 整修封條',
      documentTitle:'409 病房',
      pages:['門把纏著黃色封條：「院區整修，暫停使用」。\n\n透過門上視窗只能看見一張鋪得過分平整的空病床。']
    };
    this.zoneGroup.add(sealedHit);this.interactables.push(sealedHit);

    this.bed33Legend={
      id:'LEGEND_BED33',
      bedId:'409A',
      wardBedNumber:33,
      boardId:'BED33_BOARD',
      hisStatusId:'BED33_HIS_409',
      sealedDoorId:'BED33_409_SEALED',
      assignmentId:'BED33_ASSIGNMENT',
      checkpoint:'CP_408C_KNOCK'
    };
  }

  buildSecondDutyRoom(o){
    const w=new PlanWalls(this);w.rect(o+8,2,o+14,10);w.cut('z',o+8,6,1.4);
    this.gf.buildFloor(this.zoneGroup,this.walkables,o+11,0,6,6,8,this.gf.materials.floorWood);
    this.gf.buildCeiling(this.zoneGroup,o+11,3.2,6,6,8);
    workstation(this,{x:o+12,z:3.1,id:'second_duty_desk'});
    const door=new KeyedKnobDoor(this,{id:'second_duty_room',x:o+8,z:6,yaw:Math.PI/2,width:1.4,title:'值班室',openDirection:1});
    door.keepOpen=true;door.setClosed(false);
    door.root.traverse(object=>{if(object.userData?.doorId==='second_duty_room')object.userData.interactable=false;});
    SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:o+7.885,y:2.62,z:6,rotationY:-Math.PI/2,width:1.18,height:.34,code:'5F',title:'醫師值班室',subtitle:"DOCTORS' DUTY ROOM",header:''});
    const decor=new THREE.Group();decor.name='Second5F_DutyRoomDecor';this.zoneGroup.add(decor);
    asset(decor,'bench',[o+10,0,9.25],[.62,.62,.62],Math.PI);
    asset(decor,'plant',[o+13.15,0,9.1],[.55,.55,.55]);

    const dutyPhoto=(x,y,z,title,subtitle,people=4,artIndex=0)=>{
      const canvas=document.createElement('canvas');canvas.width=960;canvas.height=620;
      const render=()=>{
        const ctx=canvas.getContext('2d');
        ctx.fillStyle='#bca988';ctx.fillRect(0,0,960,620);
        const paper=ctx.createLinearGradient(0,0,960,620);paper.addColorStop(0,'#dfd0ae');paper.addColorStop(1,'#75634d');ctx.fillStyle=paper;ctx.fillRect(24,24,912,572);

        ctx.fillStyle='#30281f';ctx.font='bold 36px sans-serif';ctx.fillText(title,52,72);
        ctx.fillStyle='#60513f';ctx.font='21px sans-serif';ctx.fillText(subtitle,52,108);

        const hasArt=drawMemoryFragment(ctx,artIndex,62,136,836,340);
        if(!hasArt){
          const photoBg=ctx.createLinearGradient(62,136,898,476);photoBg.addColorStop(0,'#5f625b');photoBg.addColorStop(1,'#252a27');
          ctx.fillStyle=photoBg;ctx.fillRect(62,136,836,340);
          for(let i=0;i<people;i++){
            const px=170+i*(620/Math.max(1,people-1));
            ctx.fillStyle=i%2?'#66716a':'#505953';
            ctx.beginPath();ctx.arc(px,250,42,0,Math.PI*2);ctx.fill();
            ctx.fillRect(px-50,292,100,145);
          }
        }else{
          const wash=ctx.createLinearGradient(0,136,0,476);
          wash.addColorStop(0,'rgba(55,43,29,.12)');wash.addColorStop(1,'rgba(30,23,17,.36)');
          ctx.fillStyle=wash;ctx.fillRect(62,136,836,340);
        }

        ctx.strokeStyle='#4f3d2c';ctx.lineWidth=9;ctx.strokeRect(57,131,846,350);
        ctx.fillStyle='rgba(235,222,190,.94)';ctx.fillRect(62,487,836,72);
        ctx.fillStyle='#3e352b';ctx.font='20px sans-serif';ctx.fillText('青嶺醫療中心｜第二院區留影',88,525);
        ctx.fillStyle='#76624a';ctx.font='15px ui-monospace,monospace';ctx.fillText('ARCHIVE PRINT / SOURCE VERIFIED',88,550);
        tex.needsUpdate=true;
      };

      const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
      render();
      const frame=solid(decor,this.gf.materials.doorWood,[x,y,z],[1.52,1.02,.07]);
      frame.name='Second5F_DutyPhoto_Frame_'+title;
      const photo=new THREE.Mesh(new THREE.PlaneGeometry(1.38,.88),new THREE.MeshStandardMaterial({map:tex,roughness:.88,metalness:0}));
      photo.position.set(x,y,z-.041);photo.name='Second5F_DutyPhoto_'+title;decor.add(photo);
      void preloadArtPass2Image('memoryFragments').then(()=>{if(photo.parent)render();}).catch(()=>{});
    };
    dutyPhoto(o+10.25,1.72,9.78,'1998 夜班合照','第二院區 5F 值班室',4,0);
    dutyPhoto(o+12.15,1.72,9.78,'臨床教學留影','病房急救演練',3,4);
    asset(this.zoneGroup,'hospitalBed',[o+12.3,0,7.15],[.9,.85,.85]);CollisionFactory.addBox(this.colliders,o+12.3,.4,7.15,1.15,.8,1.8);
    asset(this.zoneGroup,'storageCabinet',[o+9.45,0,7.15],[.8,.82,.8],Math.PI);
    const phone=new THREE.Group();phone.name='SecondDutyRoom_ExtensionPhone';phone.position.set(o+12.55,.84,3.34);this.zoneGroup.add(phone);
    solid(phone,this.gf.materials.wallDark,[0,0,0],[.28,.07,.20]);
    solid(phone,this.gf.materials.bedSheet,[0,.08,-.055],[.25,.035,.055]);
    w.build();this.gf.buildCeilingLight(this.zoneGroup,o+11,3.15,6,.75,7);
    this.roomAreas.push({id:'SECOND_DUTY',label:'值班室',point:[o+9.5,1.7,6],door:[o+8,1.7,6],corridor:[o+6.5,1.7,6],protectedArea:false,kind:'duty_room',accessDoorId:'second_duty_room'});
  }
  buildSecondCampusChestLegend(o){
    const m=this.gf.materials;
    const chestBed=this.bedAreas.find(item=>item.id==='504B');
    const [bx,,bz]=chestBed.position;
    // No separate nursing-station report hotspot: opening the 5F ward access
    // door is the report action. Keep metadata only for diagnostics/QA.
    this.secondCampusNursingReport={
      position:new THREE.Vector3(o-2.35,0,-2.35),radius:4.8,
      interactable:false,id:'SECOND_5F_NURSING_REPORT',type:'decorative',label:''
    };
    const patient=new THREE.Group();patient.name='SecondCampus_ChestPainPatient';patient.position.set(bx,.80,bz);this.zoneGroup.add(patient);
    const gown=new THREE.MeshStandardMaterial({color:0xd3ddd5,roughness:.96});
    const skin=new THREE.MeshStandardMaterial({color:0xc7b5a4,roughness:.94});
    const hair=new THREE.MeshStandardMaterial({color:0x383635,roughness:1});
    const torso=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),gown);torso.name='SecondCampus_ChestPainPatient_Gown';torso.scale.set(.27,.20,.48);patient.add(torso);
    const blanket=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),this.gf.materials.bedSheet);blanket.name='SecondCampus_ChestPainPatient_Blanket';blanket.scale.set(.34,.15,.36);blanket.position.set(0,-.02,-.40);patient.add(blanket);
    const pillow=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),this.gf.materials.bedSheet);pillow.name='SecondCampus_ChestPainPatient_Pillow';pillow.scale.set(.27,.08,.32);pillow.position.set(0,-.015,.62);patient.add(pillow);
    const face=new THREE.Mesh(new THREE.SphereGeometry(.145,24,18),skin);face.name='SecondCampus_ChestPainPatient_Face';face.scale.set(.92,.78,1);face.position.set(0,.015,.72);patient.add(face);
    const hairCap=new THREE.Mesh(new THREE.SphereGeometry(.15,24,16),hair);hairCap.scale.set(1,.48,1);hairCap.position.set(0,.09,.71);patient.add(hairCap);
    const armMat=new THREE.MeshStandardMaterial({color:0xc7b5a4,roughness:.94});
    for(const side of [-1,1]){
      const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.38,5,10),armMat);arm.rotation.x=Math.PI/2;arm.position.set(side*.31,.015,.02);patient.add(arm);
    }
    const wristband=new THREE.Mesh(new THREE.TorusGeometry(.062,.014,8,20),this.gf.materials.lightWarm);wristband.name='SecondCampus_ChestPainPatient_Wristband';wristband.rotation.x=Math.PI/2;wristband.position.set(.31,.015,.28);patient.add(wristband);

    const cardCanvas=document.createElement('canvas');cardCanvas.width=620;cardCanvas.height=360;
    const ctx=cardCanvas.getContext('2d');ctx.fillStyle='#f2eee3';ctx.fillRect(0,0,620,360);
    ctx.fillStyle='#40584c';ctx.fillRect(0,0,620,60);ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.fillText('第二院區｜臨時留置床',24,40);
    ctx.fillStyle='#2f3934';ctx.font='24px sans-serif';ctx.fillText('主訴：胸悶、心悸',34,118);ctx.fillText(worldNarrative('姓名：陳怡君'),34,170);
    ctx.font='20px sans-serif';ctx.fillText('評估：焦慮伴隨換氣過度',34,230);
    ctx.font='18px sans-serif';ctx.fillStyle='#6b6e69';ctx.fillText('生命徵象穩定，心電圖無急性變化',34,286);
    const tex=new THREE.CanvasTexture(cardCanvas);tex.colorSpace=THREE.SRGBColorSpace;
    const card=new THREE.Mesh(new THREE.PlaneGeometry(1.05,.62),new THREE.MeshBasicMaterial({map:tex}));
    card.position.set(bx+1.25,1.45,bz+.35);card.rotation.y=-Math.PI/2;this.zoneGroup.add(card);

    const patientHit=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.6,2.2),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    patientHit.position.set(bx,1.0,bz);
    patientHit.userData={interactable:true,id:'SECOND_CHEST_PATIENT',type:'second_chest_patient',label:'評估胸痛病人'};
    this.zoneGroup.add(patientHit);this.interactables.push(patientHit);

    // The transfer form sits on the second-campus nursing-station workstation, not in mid-air.
    const form=solid(this.zoneGroup,m.lightWarm,[o-1.28,.829,-2.18],[.42,.018,.30]);
    form.name='SecondCampus_ChestTransferForm';
    form.userData={interactable:true,id:'SECOND_CHEST_TRANSFER',type:'second_chest_transfer',label:'查看病人處置醫囑'};
    this.secondCampusTreatmentOrder=form;
    this.interactables.push(form);

    const roster=solid(this.zoneGroup,m.lightWarm,[bx+.36,.91,bz+.64],[.25,.012,.12]);
    roster.name='SecondCampus_TrueNameRosterFragment';
    roster.userData={interactable:true,id:'SECOND_CHEST_NAME_CLUE',type:'second_chest_roster_clue',label:'檢查病床旁的舊名冊殘頁',documentTitle:'第一院區舊名冊殘頁',pages:['第一線：張 守 [墨漬]\\n\\n背面以鉛筆寫著：「守住 409 的門。」']};
    this.interactables.push(roster);

    this.secondCampusLegend={id:'LEGEND_CHEST_PAIN',patient:'SECOND_CHEST_PATIENT',form:'SECOND_CHEST_TRANSFER'};
  }

  syncStoryState(){
    if(this.dutyPhone){
      const ringing=gameState.getFlag('PHONE_RING_ACTIVE')===true;
      this.dutyPhone.userData.interactable=ringing;
      this.dutyPhone.userData.label=ringing?'接聽值班電話':'查看值班電話';
    }
    if(this.secondCampusNursingReport){
      this.secondCampusNursingReport.interactable=false;
    }
    if(this.secondCampusTreatmentOrder){
      const seen=gameState.getFlag('SECOND_CHEST_PATIENT_SEEN')===true;
      this.secondCampusTreatmentOrder.userData.label=seen?'重新查看病人處置醫囑':'查看病人處置醫囑';
    }
  }

  setIdentitySecondConsultKeyBorrowed(borrowed){
    if(this.identitySecondConsultKey)this.identitySecondConsultKey.visible=!borrowed;
  }
  setIdentityWardSpareKeyBorrowed(borrowed){
    if(this.identityWardSpareKey)this.identityWardSpareKey.visible=!borrowed;
  }
  setWardGateClosed(closed){this.wardDoor.setClosed(closed);this.wardGateClosed=closed;}
  setInnerWardGateClosed(closed){if(this.innerWardDoor)this.innerWardDoor.setClosed(closed);this.innerWardGateClosed=closed;}
  setGlassBypassClosed(closed){if(this.glassBypassDoor)this.glassBypassDoor.setClosed(closed);this.glassBypassClosed=closed;}
  toggleWardGate(p){const ok=this.wardDoor.toggle(p);this.wardGateClosed=this.wardDoor.closed;return ok;}
  setDutyDoorClosed(closed){if(this.dutyDoor)this.dutyDoor.setClosed(closed);this.dutyDoorClosed=closed;}
  toggleDutyDoor(p){if(!this.dutyDoor)return false;const ok=this.dutyDoor.toggle(p);this.dutyDoorClosed=this.dutyDoor.closed;return ok;}
  cleanup(){this.scene.remove(this.zoneGroup);disposeZoneArt(this.zoneGroup);this.colliders=[];this.walkables=[];this.interactables=[];this.roomAreas=[];this.bedAreas=[];this.workstations=[];this.accessDoors={};this.keyedDoors={};}
}
