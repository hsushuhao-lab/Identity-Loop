import * as THREE from 'three';
import { solid, asset } from '../../art/ArtDetails.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { SignAnchor } from '../shared/SignAnchor.js';

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

    // Old 1998 ambulance under a dust sheet.
    const ambulance=new THREE.Group();ambulance.name='Chen_1998_Ambulance';ambulance.position.set(3.8,0,-10.8);this.zoneGroup.add(ambulance);
    const body=new THREE.Mesh(new THREE.BoxGeometry(3.9,1.55,1.85),new THREE.MeshStandardMaterial({color:0xb8b7aa,roughness:.92}));
    body.position.y=1.0;ambulance.add(body);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.55,1.35,1.78),new THREE.MeshStandardMaterial({color:0xd0cec1,roughness:.86}));
    cab.position.set(-2.25,.9,0);ambulance.add(cab);
    for(const x of [-2.1,1.25])for(const z of [-.82,.82]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.17,20),m.wallDark);
      wheel.rotation.x=Math.PI/2;wheel.position.set(x,.38,z);ambulance.add(wheel);
    }
    const sheet=new THREE.Mesh(new THREE.BoxGeometry(4.4,.06,2.15),new THREE.MeshStandardMaterial({color:0x777a73,roughness:1,transparent:true,opacity:.76}));
    sheet.position.set(-.35,1.82,0);sheet.rotation.z=-.03;ambulance.add(sheet);
    asset(this.zoneGroup,'storageCabinet',[-6.6,0,-11.5],[.85,.9,.85],Math.PI/2);
    asset(this.zoneGroup,'storageCabinet',[-6.6,0,-8.5],[.85,.9,.85],Math.PI/2);

    // Dispatch whiteboard evidence.
    const boardCanvas=document.createElement('canvas');boardCanvas.width=1100;boardCanvas.height=650;
    const ctx=boardCanvas.getContext('2d');ctx.fillStyle='#e6eadf';ctx.fillRect(0,0,1100,650);
    ctx.fillStyle='#40564b';ctx.fillRect(0,0,1100,70);ctx.fillStyle='#fff';ctx.font='bold 34px sans-serif';ctx.fillText('跨院救護調度白板｜1998',32,47);
    ctx.fillStyle='#29372f';ctx.font='26px ui-monospace,monospace';
    ['車次 092 | 21:10 第一院區 → 第二院區','車次 093 | 22:35 第二院區 → 第一院區','車次 094 | 23:40 第二院區 → 第一院區','隨車支援醫師：陳○○  MED-89••••'].forEach((line,i)=>ctx.fillText(line,48,150+i*92));
    const boardTex=new THREE.CanvasTexture(boardCanvas);boardTex.colorSpace=THREE.SRGBColorSpace;
    const board=new THREE.Mesh(new THREE.PlaneGeometry(3.5,2.05),new THREE.MeshStandardMaterial({map:boardTex,roughness:.88}));
    board.position.set(-6.55,1.68,-3.5);board.rotation.y=Math.PI/2;
    board.userData={interactable:true,id:'CHEN_DISPATCH_BOARD',type:'chen_dispatch_board',label:'查看 1998 跨院救護調度白板'};
    this.zoneGroup.add(board);this.interactables.push(board);

    // Magnetic-stripe locker reader.
    const locker=solid(this.zoneGroup,m.metal,[-4.8,.95,-13.9],[1.15,1.85,.52]);locker.name='Chen_DispatchLocker';
    const reader=new THREE.Mesh(new THREE.BoxGeometry(.22,.32,.08),new THREE.MeshStandardMaterial({color:0x2d3732,roughness:.62}));
    reader.position.set(-4.08,1.15,-13.58);reader.userData={interactable:true,id:'CHEN_DISPATCH_LOCKER_READER',type:'chen_dispatch_locker_reader',label:'用灰滾邊證件刷開調度鎖櫃'};
    this.zoneGroup.add(reader);this.interactables.push(reader);this.dispatchReader=reader;
    const indicator=new THREE.PointLight(0x7a1f1f,.4,1.4,2);indicator.position.set(-4.08,1.35,-13.55);this.zoneGroup.add(indicator);this.dispatchIndicator=indicator;

    // Driver handoff ledger inside locker.
    const log=solid(this.zoneGroup,m.lightWarm,[-4.2,1.15,-13.48],[.48,.025,.34]);log.name='Chen_DriverHandoffLog';
    log.userData={interactable:false,id:'CHEN_DRIVER_LOG',type:'chen_driver_log',label:'翻閱救護車司機交接簽名冊'};
    this.interactables.push(log);this.driverLog=log;

    // Service elevator / route exit.
    const lift=solid(this.zoneGroup,m.wallDark,[7.85,1.25,-4.2],[.18,2.5,2.2]);lift.name='Chen_DispatchServiceLift';
    const liftHit=new THREE.Mesh(new THREE.BoxGeometry(.72,2.35,2.15),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    liftHit.position.set(7.48,1.15,-4.2);
    liftHit.userData={interactable:false,id:'CHEN_DISPATCH_SERVICE_LIFT',type:'chen_dispatch_service_lift',label:'搭乘後勤工務電梯返回 3F'};
    this.zoneGroup.add(liftHit);this.interactables.push(liftHit);this.serviceLiftHit=liftHit;
    SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:7.65,y:2.62,z:-4.2,rotationY:-Math.PI/2,width:1.25,height:.38,code:'B1',title:'後勤工務電梯',subtitle:'3F / 316 ACCESS',header:''});

    // Route map / pipes reinforce the logistics identity without naming the player.
    const mapCanvas=document.createElement('canvas');mapCanvas.width=1000;mapCanvas.height=620;
    const mctx=mapCanvas.getContext('2d');mctx.fillStyle='#e7e1cf';mctx.fillRect(0,0,1000,620);mctx.strokeStyle='#40594d';mctx.lineWidth=16;
    mctx.beginPath();mctx.moveTo(90,420);mctx.lineTo(360,420);mctx.lineTo(360,170);mctx.lineTo(690,170);mctx.lineTo(690,390);mctx.lineTo(910,390);mctx.stroke();
    mctx.fillStyle='#303c35';mctx.font='bold 30px sans-serif';mctx.fillText('兩院區地下後勤接駁網',52,62);
    mctx.font='22px sans-serif';mctx.fillText('第一院區',70,485);mctx.fillText('B1 調度',420,145);mctx.fillText('第二院區',775,455);
    const mapTex=new THREE.CanvasTexture(mapCanvas);mapTex.colorSpace=THREE.SRGBColorSpace;
    const map=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1.98),new THREE.MeshStandardMaterial({map:mapTex,roughness:.9}));
    map.position.set(0,1.72,-16.78);this.zoneGroup.add(map);

    this.syncStoryState();
    return this;
  }

  syncStoryState(){
    const unlocked=gameState.getFlag('CHEN_DISPATCH_LOCKER_OPENED')===true;
    if(this.dispatchIndicator)this.dispatchIndicator.color.setHex(unlocked?0x43a567:0x7a1f1f);
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
