import * as THREE from 'three';
import { solid } from '../../art/ArtDetails.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { SignAnchor } from '../shared/SignAnchor.js';
import {buildDispatchVehicle,buildDispatchRoomDetails} from '../../art/B1DispatchArt.js';
import {CollisionFactory} from '../shared/CollisionFactory.js';
import { gameState } from '../../core/GameState.js';

export class B1DispatchHub {
  constructor(scene,geometryFactory){
    this.scene=scene;this.gf=geometryFactory;this.colliders=[];this.walkables=[];this.interactables=[];
    this.zoneGroup=new THREE.Group();this.zoneGroup.name='B1_DispatchHub_Zone';
  }

  build(){
    this.scene.add(this.zoneGroup);
    const m=this.gf.materials;
    this.gf.buildFloor(this.zoneGroup,this.walkables,0,0,-7,18,20,m.floorTile);
    this.gf.buildCeiling(this.zoneGroup,0,3.3,-7,18,20);
    this.gf.buildWall(this.zoneGroup,this.colliders,-9,1.65,-7,.3,3.3,20);
    this.gf.buildWall(this.zoneGroup,this.colliders,9,1.65,-7,.3,3.3,20);
    this.gf.buildWall(this.zoneGroup,this.colliders,0,1.65,-17,18,3.3,.3);
    this.gf.buildWall(this.zoneGroup,this.colliders,0,1.65,3,18,3.3,.3);
    for(const z of [0,-5,-10,-15])this.gf.buildCeilingLight(this.zoneGroup,0,3.18,z,.55,3.4,0xd6c8a8);

    SignAnchor.buildWallPlaque({
      scene:this.zoneGroup,x:-7.1,y:2.35,z:2.82,rotationY:0,width:1.75,height:.48,
      code:'B1',title:'救護車接駁調度室',subtitle:'AMBULANCE / LOGISTICS DISPATCH',header:'地下後勤網絡'
    });

    const vehicle=buildDispatchVehicle(this.zoneGroup,m);
    vehicle.updateWorldMatrix(true,true);
    this.colliders.push(new THREE.Box3().setFromObject(vehicle));
    buildDispatchRoomDetails(this);

    // Dispatch whiteboard evidence.
    const boardCanvas=document.createElement('canvas');boardCanvas.width=1100;boardCanvas.height=650;
    const ctx=boardCanvas.getContext('2d');ctx.fillStyle='#e6eadf';ctx.fillRect(0,0,1100,650);
    ctx.fillStyle='#40564b';ctx.fillRect(0,0,1100,70);ctx.fillStyle='#fff';ctx.font='bold 34px sans-serif';ctx.fillText('跨院救護調度白板｜1998',32,47);
    ctx.fillStyle='#29372f';ctx.font='26px ui-monospace,monospace';
    ['車次 092 | 21:10 第一院區 → 第二院區','車次 093 | 22:35 第二院區 → 第一院區','車次 094 | 23:40 第二院區 → 第一院區','隨車支援醫師：[姓名欄磨損]  MED-89••••'].forEach((line,i)=>ctx.fillText(line,48,150+i*92));
    const boardTex=new THREE.CanvasTexture(boardCanvas);boardTex.colorSpace=THREE.SRGBColorSpace;
    const board=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.05),new THREE.MeshStandardMaterial({map:boardTex,roughness:.88}));
    board.position.set(-8.69,1.68,-3.5);board.rotation.y=Math.PI/2;
    board.userData={interactable:true,id:'CHEN_DISPATCH_BOARD',type:'chen_dispatch_board',label:'查看 1998 跨院救護調度白板'};
    this.zoneGroup.add(board);this.interactables.push(board);
    solid(this.zoneGroup,m.metal,[-8.75,1.68,-3.5],[.07,2.14,3.62]).name='B1_DispatchBoard_Frame';
    solid(this.zoneGroup,m.metal,[-8.59,.60,-3.5],[.26,.055,3.45]);
    for(let i=0;i<3;i++)solid(this.zoneGroup,m.wallBumper,[-8.54,.643,-3.8+i*.22],[.025,.025,.15],.008);


    // Open-front steel cabinet: the ledger rests on a shelf behind its door.
    const locker=new THREE.Group();locker.name='Chen_DispatchLocker';locker.position.set(-4.8,0,-13.9);this.zoneGroup.add(locker);
    solid(locker,m.wallBumper,[0,1.02,-.29],[1.22,1.98,.075]);
    for(const x of [-.59,.59])solid(locker,m.metal,[x,1.02,0],[.065,1.98,.64]);
    for(const y of [.09,1.97])solid(locker,m.metal,[0,y,0],[1.24,.07,.65]);
    for(const y of [.48,.91,1.40])solid(locker,m.metal,[0,y,0],[1.13,.035,.58]);
    const shelf=solid(locker,m.metal,[0,1.12,0],[1.13,.035,.62]);shelf.name='B1_LockerShelf';
    CollisionFactory.addBox(this.colliders,-4.8,1.02,-13.9,1.24,2.02,.65);
    const door=new THREE.Group();door.name='B1_LockerDoor';door.position.set(-.59,0,.35);locker.add(door);this.lockerDoor=door;
    solid(door,m.wallBumper,[.58,1.04,0],[1.14,1.88,.045]);
    solid(door,m.stainless,[1.02,1.15,.07],[.035,.20,.05]);
    for(let i=0;i<7;i++)solid(door,m.metal,[.58,1.54+i*.038,.026],[.48,.014,.008],.001);
    const reader=solid(locker,m.wallBumper,[.64,1.26,.36],[.20,.33,.11]);
    reader.userData={interactable:true,id:'CHEN_DISPATCH_LOCKER_READER',type:'chen_dispatch_locker_reader',label:'用灰滾邊證件刷開調度鎖櫃'};
    this.interactables.push(reader);this.dispatchReader=reader;
    solid(locker,m.metal,[.64,1.21,.425],[.14,.014,.01],.001);
    const led=new THREE.Mesh(new THREE.CircleGeometry(.021,14),new THREE.MeshBasicMaterial({color:0x9d4237}));led.position.set(.64,1.36,.421);locker.add(led);this.dispatchIndicator=led;
    const log=solid(locker,m.bedSheet,[.02,1.151,0],[.50,.027,.34],.003);log.name='Chen_DriverHandoffLog';
    log.userData={interactable:false,id:'CHEN_DRIVER_LOG',type:'chen_driver_log',label:'翻閱救護車司機交接簽名冊'};
    this.interactables.push(log);this.driverLog=log;
    // Fine lines, page edges and a bound spine remain physical, non-glowing details.
    for(let i=0;i<6;i++)solid(log,m.wallBumper,[.02,.014,-.10+i*.038],[.37,.001,.002],.0001);
    solid(log,m.wallBumper,[-.23,0,0],[.035,.031,.34],.003);

    // Flush-mounted lift with rails, split leaves and a separate call panel.
    const lift=new THREE.Group();lift.name='B1_ServiceLift_Frame';lift.position.set(8.77,0,-4.2);this.zoneGroup.add(lift);
    for(const z of [-1.10,1.10])solid(lift,m.metal,[0,1.27,z],[.15,2.54,.09]);
    solid(lift,m.metal,[0,2.51,0],[.15,.08,2.28]);
    for(const z of [-.535,.535])solid(lift,m.wallBumper,[.035,1.23,z],[.06,2.44,1.055]);
    solid(lift,m.stainless,[-.04,.027,0],[.29,.04,2.15]);
    const liftHit=new THREE.Mesh(new THREE.BoxGeometry(.30,2.35,2.10),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    liftHit.position.set(8.55,1.20,-4.2);
    liftHit.userData={interactable:false,id:'CHEN_DISPATCH_SERVICE_LIFT',type:'chen_dispatch_service_lift',label:'搭乘後勤工務電梯返回 3F'};
    this.zoneGroup.add(liftHit);this.interactables.push(liftHit);this.serviceLiftHit=liftHit;
    const panel=solid(lift,m.metal,[-.075,1.25,1.33],[.07,.34,.18]);panel.name='B1_ServiceLift_CallPanel';
    SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:8.65,y:2.75,z:-4.2,rotationY:-Math.PI/2,width:1.65,height:.38,code:'B1',title:'後勤工務電梯',subtitle:'3F / 316 ACCESS',header:''});

    // Route map / pipes reinforce the logistics identity without naming the player.
    const mapCanvas=document.createElement('canvas');mapCanvas.width=1000;mapCanvas.height=620;
    const mctx=mapCanvas.getContext('2d');mctx.fillStyle='#e7e1cf';mctx.fillRect(0,0,1000,620);mctx.strokeStyle='#40594d';mctx.lineWidth=16;
    mctx.beginPath();mctx.moveTo(90,420);mctx.lineTo(360,420);mctx.lineTo(360,170);mctx.lineTo(690,170);mctx.lineTo(690,390);mctx.lineTo(910,390);mctx.stroke();
    mctx.fillStyle='#303c35';mctx.font='bold 30px sans-serif';mctx.fillText('兩院區地下後勤接駁網',52,62);
    mctx.font='22px sans-serif';mctx.fillText('第一院區',70,485);mctx.fillText('B1 調度',420,145);mctx.fillText('第二院區',775,455);
    const mapTex=new THREE.CanvasTexture(mapCanvas);mapTex.colorSpace=THREE.SRGBColorSpace;
    const map=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.98),new THREE.MeshStandardMaterial({map:mapTex,roughness:.9}));
    map.position.set(-1.55,1.72,-16.78);this.zoneGroup.add(map);

    this.syncStoryState();
    return this;
  }

  syncStoryState(){
    const unlocked=gameState.getFlag('CHEN_DISPATCH_LOCKER_OPENED')===true;
    if(this.dispatchIndicator)this.dispatchIndicator.material.color.setHex(unlocked?0x43a567:0x9d4237);
    if(this.lockerDoor)this.lockerDoor.rotation.y=unlocked?-Math.PI*.72:0;
    if(this.driverLog){
      this.driverLog.visible=unlocked;
      this.driverLog.userData.interactable=unlocked;
    }
    if(this.serviceLiftHit){
      const ready=gameState.getFlag('CHEN_DISPATCH_LOG_VERIFIED')===true;
      this.serviceLiftHit.userData.interactable=ready;
    }
  }

  cleanup(){this.scene.remove(this.zoneGroup);disposeZoneArt(this.zoneGroup);this.colliders=[];this.walkables=[];this.interactables=[];}
}
