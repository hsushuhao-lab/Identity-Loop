import * as THREE from 'three';
import { asset, solid } from '../../art/ArtDetails.js';
import {buildLegacyArchiveTerminal} from '../../art/LegacyTerminalArt.js';
import {buildDeskCluster,buildSupplyCabinet} from '../../art/ClinicalDressing.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { SignAnchor } from '../shared/SignAnchor.js';

export class B2Archive {
  constructor(scene,geometryFactory){
    this.scene=scene;this.gf=geometryFactory;this.colliders=[];this.walkables=[];this.interactables=[];
    this.zoneGroup=new THREE.Group();this.zoneGroup.name='B2Archive_Zone';
  }

  build(){
    this.scene.add(this.zoneGroup);
    const m=this.gf.materials;
    this.gf.buildFloor(this.zoneGroup,this.walkables,0,0,-7,10,18,m.floorTile);
    this.gf.buildCeiling(this.zoneGroup,0,3.2,-7,10,18);
    this.gf.buildWall(this.zoneGroup,this.colliders,-5,1.6,-7,.3,3.2,18);
    this.gf.buildWall(this.zoneGroup,this.colliders,5,1.6,-7,.3,3.2,18);
    this.gf.buildWall(this.zoneGroup,this.colliders,0,1.6,-16,10,3.2,.3);
    this.gf.buildWall(this.zoneGroup,this.colliders,0,1.6,2,10,3.2,.3);

    for(const z of [-1,-6,-11])this.gf.buildCeilingLight(this.zoneGroup,0,3.15,z,.55,2.6,0x6b5146);

    SignAnchor.buildWallPlaque({
      scene:this.zoneGroup,x:-3.5,y:2.1,z:.8,rotationY:0,width:1.25,height:.42,
      code:'B2',title:'封存隔離層',subtitle:'ARCHIVE / ISOLATION',header:'資料不存在於現行樓層圖'
    });

    const frame=solid(this.zoneGroup,m.wallDark,[0,1.25,-14.65],[3.4,2.5,.15]);
    frame.name='B2_ArchiveMirror_Frame';
    const mirror=new THREE.Mesh(
      new THREE.PlaneGeometry(2.62,1.82),
      new THREE.MeshPhysicalMaterial({color:0x56665f,metalness:.82,roughness:.24,envMapIntensity:.7})
    );
    mirror.name='B2_ArchiveMirror_Surface';mirror.position.set(0,1.23,-14.56);this.zoneGroup.add(mirror);
    SignAnchor.buildWallPlaque({
      scene:this.zoneGroup,x:0,y:2.36,z:-14.52,rotationY:0,width:1.45,height:.42,
      code:'B2',title:'封存驗證區',subtitle:'ARCHIVE MIRROR',header:''
    });

    const desk=solid(this.zoneGroup,m.doorWood,[0,.78,-12.8],[2.2,.08,.88]);desk.name='B2_ArchiveDesk';
    solid(this.zoneGroup,m.metal,[-.8,.38,-12.8],[.07,.72,.07]);
    solid(this.zoneGroup,m.metal,[.8,.38,-12.8],[.07,.72,.07]);
    const workstation=buildLegacyArchiveTerminal({
      parent:this.zoneGroup,materials:m,position:[0,.82,-12.92],id:'B2_ARCHIVE_TERMINAL',type:'b2_archive_terminal',
      label:'啟動封存驗證終端',screenTitle:'IDENTITY ARCHIVE VERIFICATION',name:'B2_ArchiveLegacyTerminal'
    });
    const phone=new THREE.Group();phone.name='B2_ArchiveDeskPhone';phone.position.set(.72,.84,-12.66);this.zoneGroup.add(phone);
    solid(phone,m.wallDark,[0,.04,0],[.34,.08,.22]);
    solid(phone,m.metal,[0,.12,0],[.42,.08,.09],.025);
    const terminal=workstation.hitbox;this.interactables.push(terminal);

    const exitDoor=new THREE.Group();exitDoor.name='B2_OneWayExitDoor';exitDoor.position.set(0,0,1.54);this.zoneGroup.add(exitDoor);
    solid(exitDoor,m.wallDark,[-.91,1.25,.16],[.10,2.5,.18]);solid(exitDoor,m.wallDark,[.91,1.25,.16],[.10,2.5,.18]);
    solid(exitDoor,m.wallDark,[0,2.48,.16],[1.92,.12,.18]);
    this.exitHinge=new THREE.Group();this.exitHinge.name='B2_FireDoor_Hinge';this.exitHinge.position.set(-.86,0,.10);exitDoor.add(this.exitHinge);
    solid(this.exitHinge,m.metal,[.86,1.15,0],[1.72,2.30,.14]).name='B2_FireDoor_Leaf';
    solid(this.exitHinge,m.stainless,[1.48,1.12,-.13],[.26,.05,.09]).name='B2_FireDoor_Handle';
    solid(this.exitHinge,m.wallDark,[1.48,.96,-.085],[.10,.16,.035]).name='B2_FireDoor_Lock';
    this.exitHinge.rotation.y=1.05;
    SignAnchor.buildWallPlaque({scene:exitDoor,x:0,y:2.64,z:.10,rotationY:Math.PI,width:1.55,height:.38,code:'EXIT',title:'經由逃生門離開',subtitle:'ONE-WAY EXIT',header:'離開後無法返回 B2'});
    const returnHit=new THREE.Mesh(new THREE.BoxGeometry(1.78,2.30,.62),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    returnHit.position.set(0,1.15,1.18);
    returnHit.userData={interactable:true,id:'B2_ONE_WAY_EXIT',type:'b2_exit_door',label:'經由逃生門離開'};
    this.zoneGroup.add(returnHit);this.interactables.push(returnHit);

    // Charred archive boxes: visual evidence only.
    for(let i=0;i<8;i++)solid(this.zoneGroup,i%2?m.wallDark:m.metal,[-3.6+(i%2)*7.2,.28+(i%3)*.38,-3.5-Math.floor(i/2)*2.2],[.72,.52,.92]);
    buildDeskCluster(this.zoneGroup,m,{x:-2.5,z:-5.6,yaw:Math.PI/2,chairs:2,name:'B2_ArchiveDesk_A'});
    buildDeskCluster(this.zoneGroup,m,{x:2.5,z:-8.8,yaw:-Math.PI/2,chairs:2,name:'B2_ArchiveDesk_B'});
    buildSupplyCabinet(this.zoneGroup,m,{x:-3.9,z:-13.5,yaw:Math.PI/2,name:'B2_ArchiveShelf_A'});
    buildSupplyCabinet(this.zoneGroup,m,{x:3.9,z:-13.5,yaw:-Math.PI/2,name:'B2_ArchiveShelf_B'});
    asset(this.zoneGroup,'storageCabinet',[-3.7,0,-1.5],[.75,.9,.75],Math.PI/2);
    asset(this.zoneGroup,'storageCabinet',[3.7,0,-1.5],[.75,.9,.75],-Math.PI/2);

    this.b2={id:'B2_ARCHIVE',archiveMirror:true,terminal:'B2_ARCHIVE_TERMINAL',exit:'B2_ONE_WAY_EXIT'};
    return this;
  }

  beginExitClosure(){this.exitClosureElapsed=0;}

  update(camera,delta=0){
    if(this.exitClosureElapsed===undefined)return;
    this.exitClosureElapsed+=delta;
    const progress=Math.min(1,this.exitClosureElapsed/1.4);
    this.exitHinge.rotation.y=1.05*(1-progress*progress*(3-2*progress));
  }

  cleanup(){this.scene.remove(this.zoneGroup);disposeZoneArt(this.zoneGroup);this.colliders=[];this.walkables=[];this.interactables=[];}
}
