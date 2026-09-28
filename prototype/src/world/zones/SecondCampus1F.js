// SecondCampus1F.js - Milestone M10: Second Campus 1F Hillside Exit & Outdoor Landing
import * as THREE from 'three';
import { buildHillsidePreview } from '../../art/LandscapeArt.js';
import { artRoot, solid, asset, monitor, counterFront, wallTrim } from '../../art/ArtDetails.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { SignAnchor } from '../shared/SignAnchor.js';
import { CollisionFactory } from '../shared/CollisionFactory.js';
import { AccessDoor } from '../shared/AccessDoor.js';
import {buildDeskCluster,buildSupplyCabinet} from '../../art/ClinicalDressing.js';

export class SecondCampus1F {
  constructor(scene, geometryFactory) {
    this.scene = scene;
    this.gf = geometryFactory;
    this.colliders = [];
    this.walkables = [];
    this.interactables = [];
    this.zoneGroup = new THREE.Group();
    this.zoneGroup.name = 'SecondCampus1F_Zone';
  }

  build() {
    this.scene.add(this.zoneGroup);

    // ==========================================
    // 1. 1F INTERIOR LOBBY / STAIRWELL VESTIBULE (x: 66 to 78, z: -8 to 2)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 72, 0, -3, 12, 10, this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup, 72, 3.2, -3, 12, 10);

    // Interior walls
    for(const x of [68.2,75.8])this.gf.buildWall(this.zoneGroup,this.colliders,x,1.6,2,4.4,3.2,.4);  // North wall
    this.gf.buildWall(this.zoneGroup, this.colliders, 66.0, 1.6, -3.0, 0.4, 3.2, 10.0); // West wall
    this.gf.buildWall(this.zoneGroup, this.colliders, 78.0, 1.6, -3.0, 0.4, 3.2, 10.0); // East wall

    SignAnchor.buildHangingSign({
      scene: this.zoneGroup,
      x: 72.0,
      y: 2.65,
      z: -2.0,
      ceilingY: 3.2,
      rotationY: 0,
      text: '第二院區 1F ｜ 警衛室・急診入口・院內管制'
    });

    // South wall (z = -8.0) with heavy exterior exit doors
    // Left segment (x: 66 to 70.5)
    this.gf.buildWall(this.zoneGroup, this.colliders, 68.25, 1.6, -8.0, 4.5, 3.2, 0.4);
    // Right segment (x: 73.5 to 78)
    this.gf.buildWall(this.zoneGroup, this.colliders, 75.75, 1.6, -8.0, 4.5, 3.2, 0.4);

    // Exterior exit doorway (x: 70.5 to 73.5, width 2.4m double door)
    new AccessDoor(this,{id:'SECOND_1F_HILLSIDE',x:72,z:-8,width:2.4,title:'山側封閉門',material:this.gf.materials.metal,readers:true,readerSide:-1});

    // ==========================================
    // 2. COVERED OUTDOOR CONCRETE LANDING (z: -8 to -14)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, 72, 0, -11.0, 8, 6, this.gf.materials.pathGravel);
    // Concrete overhang / canopy
    this.gf.buildCeiling(this.zoneGroup, 72, 3.2, -11.0, 8, 6, this.gf.materials.wallDark);

    // Support pillars
    this.gf.buildWall(this.zoneGroup, this.colliders, 68.5, 1.6, -13.6, 0.5, 3.2, 0.5, this.gf.materials.metal);
    this.gf.buildWall(this.zoneGroup, this.colliders, 75.5, 1.6, -13.6, 0.5, 3.2, 0.5, this.gf.materials.metal);

    // Landing safety railings
    this.gf.buildWall(this.zoneGroup, this.colliders, 67.8, 0.5, -11.0, 0.2, 1.0, 6.0, this.gf.materials.metal);
    this.gf.buildWall(this.zoneGroup, this.colliders, 76.2, 0.5, -11.0, 0.2, 1.0, 6.0, this.gf.materials.metal);

    // Steps down to hillside path (z: -14 to -17)
    for (let s = 0; s < 3; s++) {
      const stepZ = -14.5 - s * 0.9;
      const stepY = -s * 0.15;
      const stepMesh = this.gf.buildFloor(
        this.zoneGroup,
        this.walkables,
        72,
        stepY,
        stepZ,
        6,
        1.0,
        this.gf.materials.pathGravel
      );
    }

    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: 74.5,
      y: 1.8,
      z: -7.78,
      rotationY: 0,
      code: 'EXIT',
      title: '山側環山步道出口',
      subtitle: 'HILLSIDE TRAIL EXIT',
      header: '青嶺醫療中心 ｜ 第二院區'
    });

    this.gf.buildCeilingLight(this.zoneGroup, 72, 3.15, -4.0);

    const art=artRoot(this.zoneGroup,'SecondCampus1F');
    buildHillsidePreview(art);
    solid(art, this.gf.materials.wallDark, [74, .55, -4.5], [2.6, 1.1, .8]);
    solid(art, this.gf.materials.counterTop, [74, 1.14, -4.5], [2.7, .08, .9]);
    counterFront(art, this.gf.materials, 74, -4.04, 2.6, 1.1);
    // Security CCTV multi-view monitor facing inward
    monitor(art, this.gf.materials, 74, 1.18, -4.5, Math.PI);
    buildDeskCluster(art,this.gf.materials,{x:74,z:-5.2,yaw:Math.PI,chairs:1,name:'Second1F_GuardWorkstation'});
    buildSupplyCabinet(art,this.gf.materials,{x:76.6,z:-6.6,yaw:-Math.PI/2,name:'Second1F_GuardStorage'});
    // Guard logbook and security transceiver.
    // These are real Identy Loop scene props so Zhang's clue is found by looking
    // at the guard desk, not by interacting with a floating route marker.
    const guardLogbook=solid(art, this.gf.materials.doorWood, [75, 1.19, -4.5], [0.35, 0.04, 0.28]);
    guardLogbook.name='Second1F_IdentityGuardLogbook';
    guardLogbook.userData={
      interactable:true,
      id:'IDENTITY_SECOND_GUARD_LOGBOOK',
      type:'identity_guard_logbook',
      label:'翻閱警衛訪客簿'
    };
    this.interactables.push(guardLogbook);

    // Zhang route: an old photo album must be inspected before the coffee/CCTV clue.
    // It is a real desk prop and opens through the archive-document UI.
    const photoAlbum=solid(art,this.gf.materials.doorWood,[73.45,1.19,-4.48],[.46,.045,.34]);
    photoAlbum.name='Second1F_GuardPhotoAlbum';
    photoAlbum.userData={
      interactable:true,
      id:'SECOND_GUARD_PHOTO_ALBUM',
      type:'archive_document',
      label:'翻閱：警衛台舊相簿',
      documentTitle:'第二院區 1F｜警衛台舊相簿',
      pages:[
        '夜班隨手照。警衛桌、天橋門禁、值班電話、保溫壺。照片大多沒有標註日期。',
        '有幾張照片反覆拍到一名捲袖白袍醫師拿著黑咖啡。臉總被玻璃反光、門框或裁切遮住，看不出姓名。',
        '最後一頁夾著便條：「如果監視器又多出不在值勤表上的人，先看 2F 監控室的即時主機。」'
      ]
    };
    this.interactables.push(photoAlbum);

    const coffee=new THREE.Group();
    coffee.name='Second1F_IdentityBlackCoffee';
    coffee.position.set(74.45,1.23,-4.42);
    const cup=new THREE.Mesh(
      new THREE.CylinderGeometry(.075,.065,.15,20),
      new THREE.MeshStandardMaterial({color:0xeee8dc,roughness:.72})
    );
    cup.position.y=.075;
    coffee.add(cup);
    const coffeeSurface=new THREE.Mesh(
      new THREE.CircleGeometry(.058,20),
      new THREE.MeshStandardMaterial({color:0x21120b,roughness:.5})
    );
    coffeeSurface.rotation.x=-Math.PI/2;
    coffeeSurface.position.y=.153;
    coffee.add(coffeeSurface);
    const handle=new THREE.Mesh(
      new THREE.TorusGeometry(.047,.012,8,18,Math.PI*1.45),
      new THREE.MeshStandardMaterial({color:0xeee8dc,roughness:.72})
    );
    handle.rotation.x=Math.PI/2;
    handle.rotation.z=-.35;
    handle.position.set(.075,.085,0);
    coffee.add(handle);
    coffee.userData={
      interactable:true,
      id:'IDENTITY_SECOND_GUARD_COFFEE',
      type:'identity_guard_coffee',
      label:'查看警衛桌上的黑咖啡'
    };
    art.add(coffee);
    this.interactables.push(coffee);

    solid(art, this.gf.materials.metal, [73.2, 1.25, -4.5], [0.08, 0.22, 0.08]);
    CollisionFactory.addBox(this.colliders, 74, .6, -4.5, 2.7, 1.2, .9);
    SignAnchor.buildWallPlaque({scene:this.zoneGroup,x:74,y:.73,z:-4.02,rotationY:0,code:'SEC-1',title:'1F 警衛駐守台',subtitle:'SECURITY POST',header:'青嶺醫療中心 ｜ 第二院區'});

    asset(art,'bench',[76.5,0,-2],[1,1,1],-Math.PI/2);
    asset(art,'plant',[67.3,0,1]);
    solid(art,this.gf.materials.metal,[72,.02,-7.85],[1.6,.04,.6]);
    solid(art,this.gf.materials.metal,[72,2.7,-8.22],[.42,.18,.12]);
    solid(art,this.gf.materials.lightWarm,[72,2.68,-8.30],[.34,.11,.045]);

    for(const x of [70.65,73.35])solid(art,this.gf.materials.wall,[x,1.6,-8],[.3,3.2,.4]);
    wallTrim(this.zoneGroup,this.gf.materials);
    return this;
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
