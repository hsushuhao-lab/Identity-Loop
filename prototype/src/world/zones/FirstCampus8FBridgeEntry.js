import { AccessDoor } from '../shared/AccessDoor.js';
// FirstCampus8FBridgeEntry.js - Milestone M6: First Campus 8F Skybridge Transition Vestibule
import * as THREE from 'three';
import { worldNarrative } from '../../story/IdentityPrivacy.js';
import { artRoot, solid, asset, wallTrim } from '../../art/ArtDetails.js';
import { buildCampusBackdrop } from '../../art/CampusBackdrop.js';
import { disposeZoneArt } from '../../art/ArtResources.js';
import { Doorway } from '../shared/Doorway.js';
import { SignAnchor } from '../shared/SignAnchor.js';

export class FirstCampus8FBridgeEntry {
  constructor(scene, geometryFactory) {
    this.scene = scene;
    this.gf = geometryFactory;
    this.colliders = [];
    this.walkables = [];
    this.interactables = [];
    this.zoneGroup = new THREE.Group();
    this.zoneGroup.name = 'FirstCampus8F_Zone';
  }

  build() {
    this.scene.add(this.zoneGroup);

    // ==========================================
    // 1. ELEVATOR ARRIVAL CORE (x: -12 to -4, z: -3.5 to 3.5)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, -8, 0, 0, 8, 7, this.gf.materials.floorTile);
    this.gf.buildCeiling(this.zoneGroup, -8, 3.2, 0, 8, 7);

    this.gf.buildWall(this.zoneGroup, this.colliders, -12, 1.6, 0, 0.4, 3.2, 7);
    for(const x of [-10.8,-5.2])this.gf.buildWall(this.zoneGroup,this.colliders,x,1.6,3.5,2.4,3.2,.4);
    this.gf.buildWall(this.zoneGroup, this.colliders, -8, 1.6, -3.5, 8, 3.2, 0.4);

    // Authorized boundary repair: close the two arrival-core narrowing returns.
    this.gf.buildWall(this.zoneGroup, this.colliders, -4, 1.6, -2.75, 0.4, 3.2, 1.5);
    this.gf.buildWall(this.zoneGroup, this.colliders, -4, 1.6, 2.75, 0.4, 3.2, 1.5);

    SignAnchor.buildHangingSign({
      scene: this.zoneGroup,
      x: -6.0,
      y: 2.65,
      z: 0,
      ceilingY: 3.2,
      rotationY: Math.PI / 2,
      text: '◀ 8F 電梯大廳 ｜ 前往 第二院區空中連通道 ▶'
    });

    this.gf.buildCeilingLight(this.zoneGroup, -8, 3.15, 0);

    // ==========================================
    // 2. ENCLOSED BRIDGE VESTIBULE (x: -4 to 0, z: -2.0 to 2.0)
    // ==========================================
    this.gf.buildFloor(this.zoneGroup, this.walkables, -2, 0, 0, 4, 4, this.gf.materials.floor);
    this.gf.buildCeiling(this.zoneGroup, -2, 3.2, 0, 4, 4);

    // North and south side walls
    this.gf.buildWall(this.zoneGroup, this.colliders, -2, 1.6, 2.0, 4, 3.2, 0.4);
    this.gf.buildWall(this.zoneGroup, this.colliders, -2, 1.6, -2.0, 4, 3.2, 0.4);

    // Handrails
    this.gf.buildHandrail(this.zoneGroup, null, -2, 1.05, 1.78, 4.0);
    this.gf.buildHandrail(this.zoneGroup, null, -2, 1.05, -1.78, 4.0);

    // ==========================================
    // 3. FIRE DOOR SEPARATION & BRIDGE THRESHOLD (x = 0)
    // ==========================================
    // Partition wall returns
    this.gf.buildWall(this.zoneGroup, this.colliders, 0, 1.6, 1.6, 0.4, 3.2, 0.8);
    this.gf.buildWall(this.zoneGroup, this.colliders, 0, 1.6, -1.6, 0.4, 3.2, 0.8);

    // Fire door opening (width 2.4m, magnetic open plates)
    Doorway.build({
      scene: this.zoneGroup,
      colliders: this.colliders,
      x: 0,
      y: 0,
      z: 0,
      width: 2.4,
      height: 2.4,
      wallHeight: 3.2,
      wallThickness: 0.4,
      isAlongX: false,
      isOpen: true,
      frameMaterial: this.gf.materials.metal
    });

    SignAnchor.buildHangingSign({
      scene: this.zoneGroup,
      x: -1.0,
      y: 2.65,
      z: 0,
      ceilingY: 3.2,
      rotationY: Math.PI / 2,
      text: '🌉 青嶺院史長廊 ｜ 歷任院長與重大貢獻者紀念展 ▶'
    });

    // Gallery introductory exhibition plaque
    SignAnchor.buildWallPlaque({
      scene: this.zoneGroup,
      x: -3.5,
      y: 1.8,
      z: 1.78,
      rotationY: Math.PI,
      width: 1.1,
      height: 0.55,
      code: 'HERITAGE',
      title: '青嶺院史長廊 ｜ 創立與傳承',
      subtitle: 'HOSPITAL HERITAGE & ARCHIVAL GALLERY',
      header: '青嶺醫療中心 ｜ 8F 空中連通道'
    });

    // Archival vintage B&W portraits on vestibule walls
    const buildPortrait = (x, y, z, rotY, title, role, period) => {
      const cv = document.createElement('canvas');
      cv.width = 256; cv.height = 320;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = '#181714'; ctx.fillRect(0, 0, 256, 320);
      const rad = ctx.createRadialGradient(128, 120, 30, 128, 120, 110);
      rad.addColorStop(0, '#5a574f'); rad.addColorStop(0.7, '#383630'); rad.addColorStop(1, '#151412');
      ctx.fillStyle = rad; ctx.fillRect(16, 16, 224, 210);
      ctx.fillStyle = '#1c1b18'; ctx.beginPath(); ctx.arc(128, 95, 34, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(128, 185, 65, 48, 0, 0, Math.PI, true); ctx.fill();
      ctx.strokeStyle = '#827f72'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(114, 130); ctx.lineTo(128, 158); ctx.lineTo(142, 130); ctx.stroke();
      ctx.fillStyle = '#0f0e0c'; ctx.fillRect(16, 236, 224, 68);
      ctx.strokeStyle = '#7c6d48'; ctx.lineWidth = 1.8; ctx.strokeRect(18, 238, 220, 64);
      ctx.fillStyle = '#cfc29f'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(worldNarrative(title), 128, 260);
      ctx.font = '12px sans-serif'; ctx.fillStyle = '#99917d';
      ctx.fillText(role, 128, 277); ctx.fillText(period, 128, 292);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const grp = new THREE.Group(); grp.position.set(x, y, z); grp.rotation.y = rotY;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.92, 0.04), new THREE.MeshStandardMaterial({ color: 0x2b1c11, roughness: 0.7 }));
      frame.position.z = -0.02; grp.add(frame);
      grp.add(new THREE.Mesh(new THREE.PlaneGeometry(0.66, 0.86), new THREE.MeshBasicMaterial({ map: tex })));
      this.zoneGroup.add(grp);
    };

    // North wall archival portraits
    buildPortrait(-2.0, 1.75, 1.78, Math.PI, '首任院長 陳○○ 醫師', '精神醫學奠基先驅', '1979 - 1986');
    buildPortrait(-0.8, 1.75, 1.78, Math.PI, '第二任院長 林○○ 醫師', '專科醫療體系確立', '1986 - 1994');

    // South wall archival portraits
    buildPortrait(-2.0, 1.75, -1.78, 0, '首任精神部主任 葉○○', '急重症精神醫療先鋒', '1979 - 1989');
    buildPortrait(-0.8, 1.75, -1.78, 0, '首任總護理長 許○○', '人性化病房照護制度', '1980 - 1995');

    // Heritage vitrine display case with historical records
    const vitrineBase = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.45), this.gf.materials.wallDark);
    vitrineBase.position.set(-2.0, 0.4, 1.55);
    this.zoneGroup.add(vitrineBase);
    const vitrineGlass = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.5, 0.42), this.gf.materials.glass);
    vitrineGlass.position.set(-2.0, 1.05, 1.55);
    this.zoneGroup.add(vitrineGlass);

    this.gf.buildCeilingLight(this.zoneGroup, -2, 3.15, 0);

    const art=artRoot(this.zoneGroup,'BridgeEntry');
    buildCampusBackdrop(art);
    solid(art,this.gf.materials.floorTile,[10,-.08,0],[20,.16,4]);
    solid(art,this.gf.materials.ceiling,[10,3.2,0],[20,.16,4]);
    for(const z of [-2,2]) {
      solid(art,this.gf.materials.wall,[10,.45,z],[20,.9,.35]);
      solid(art,this.gf.materials.wall,[10,2.95,z],[20,.5,.35]);
      solid(art,this.gf.materials.glass,[10,1.8,z],[20,1.8,.025]);
      for(let x=0;x<=20;x+=5)solid(art,this.gf.materials.metal,[x,1.8,z],[.2,1.8,.35]);
    }
    solid(art,this.gf.materials.wall,[20,1.6,0],[.3,3.2,4]);
    for(const x of [5,12,18])solid(art,this.gf.materials.lightWarm,[x,3.10,0],[1.2,.04,.35]);
    // Keep the 8F transfer lobby and bridge approach clear of loose seating/furniture.
    asset(art,'plant',[-10.5,0,-2.7]);

    // Identy Loop: Zhou's opening clue is a real wall-mounted archival group photo,
    // not a route-generated quest card. The photographer remains outside the frame.
    const historyTexture=new THREE.TextureLoader().load(`${import.meta.env?.BASE_URL || './'}assets/identity-v03/history-group.png`);
    historyTexture.colorSpace=THREE.SRGBColorSpace;
    const historyFrame=new THREE.Group();
    historyFrame.name='IdentityHistoryGroupPhoto_Frame';
    historyFrame.position.set(19.78,1.62,0);
    historyFrame.rotation.y=-Math.PI/2;
    const historyBacking=new THREE.Mesh(
      new THREE.BoxGeometry(2.62,1.82,.055),
      new THREE.MeshStandardMaterial({color:0x2a2118,roughness:.78})
    );
    historyFrame.add(historyBacking);
    const historyPhoto=new THREE.Mesh(
      new THREE.PlaneGeometry(2.48,1.65),
      new THREE.MeshBasicMaterial({map:historyTexture,toneMapped:false})
    );
    historyPhoto.position.z=-.031;
    historyPhoto.name='IdentityHistoryGroupPhoto';
    historyPhoto.userData={
      interactable:true,
      id:'IDENTITY_HISTORY_GROUP_PHOTO',
      type:'identity_photo',
      label:'查看院史長廊大型合照'
    };
    historyFrame.add(historyPhoto);
    this.zoneGroup.add(historyFrame);
    this.interactables.push(historyPhoto);
    const oldBridgeDoor=this.zoneGroup.getObjectByName('Doorway_0_0');
    for(const leaf of oldBridgeDoor.children)if(leaf.geometry?.parameters.height===2.35||leaf.geometry?.parameters.height===2.45)leaf.visible=false;
    new AccessDoor(this,{id:'BRIDGE_ACCESS',x:0,z:0,yaw:Math.PI/2,width:2.4,title:'天橋感應門',portal:'bridge_from_first'});
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
