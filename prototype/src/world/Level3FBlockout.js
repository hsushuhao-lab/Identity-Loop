// Level3FBlockout.js - 3F Administration Blockout with Sunset Warmth
import * as THREE from 'three';
import {createAnnieArt} from '../art/AnnieArt.js';
import { getMaterials, materialForSurface } from '../art/MaterialRegistry.js';
import { applyExteriorTime } from '../art/CampusBackdrop.js';
import {buildLegacyArchiveTerminal} from '../art/LegacyTerminalArt.js';

export class Level3FBlockout {
  constructor(scene) {
    this.scene = scene;
    this.interactables = [];
    this.colliders = [];
    this.walkables = [];
    this.materials = {};
    this.elevatorLight = null;
    this.keyMesh = null;
    this.dutyLogMesh = null;
    this.workstationMesh = null;

    this.initMaterials();
    this.buildEnvironment();
    this.buildElevatorLobby();
    this.buildOffice302();
    this.buildCorridor();
    this.buildStorageRoom();
    this.buildDutyOffice();
    this.buildWorkstations();
    this.buildEnvironmentalDetails();
    this.setupLighting();
  }

  initMaterials() {
    const shared = getMaterials();
    this.materials = {
      ...shared,
      bumper: shared.wallBumper,
      elevatorDoor: shared.metal,
      wood: shared.floorWood,
      fixture: shared.metal,
      lightEmitter: new THREE.MeshStandardMaterial({ color: 0xf3f0e5, emissive: 0xfff2d7, emissiveIntensity: 0.5, roughness: 0.8 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xb5a56c, roughness: 0.35, metalness: 0.8 }),
      screen: new THREE.MeshBasicMaterial({ color: 0xc9d6c9 })
    };
  }

  addCollider(box) {
    this.colliders.push(box);
  }

  addWalkable(mesh) {
    mesh.userData.walkable = true;
    this.walkables.push(mesh);
  }

  buildWall(x, y, z, width, height, depth, mat = this.materials.wall) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const shared=getMaterials();
    const materialName=Object.keys(shared).find(key=>shared[key]===mat);
    const resolvedMaterial=materialName?materialForSurface(materialName,width,height):mat;
    const mesh = new THREE.Mesh(geo, resolvedMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Bounding box collider
    const halfW = width / 2;
    const halfD = depth / 2;
    const halfH = height / 2;
    this.addCollider(new THREE.Box3(
      new THREE.Vector3(x - halfW, y - halfH, z - halfD),
      new THREE.Vector3(x + halfW, y + halfH, z + halfD)
    ));
    return mesh;
  }

  buildEnvironment() {
    // Softer dusk backdrop with a readable gradient instead of a flat orange slab.
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1024;
    skyCanvas.height = 512;
    const ctx = skyCanvas.getContext('2d');
    const skyTexture = new THREE.CanvasTexture(skyCanvas);
    skyTexture.colorSpace = THREE.SRGBColorSpace;
    const skyGeo = new THREE.PlaneGeometry(60, 20);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.DoubleSide });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    sky.name='Campus story sky';
    sky.userData.paintStorySky=(palette,phase)=>{
      const top=`#${palette.zenith.toString(16).padStart(6,'0')}`,bottom=`#${palette.horizon.toString(16).padStart(6,'0')}`;
      const grad=ctx.createLinearGradient(0,0,0,512);grad.addColorStop(0,top);grad.addColorStop(.7,bottom);grad.addColorStop(1,phase==='DEEP_NIGHT'?'#080d15':bottom);
      ctx.fillStyle=grad;ctx.fillRect(0,0,1024,512);
      if(phase!=='DEEP_NIGHT'){ctx.fillStyle=phase==='DAWN'?'rgba(255,226,194,.18)':'rgba(255,230,200,.14)';ctx.beginPath();ctx.arc(820,150,54,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle=phase==='DEEP_NIGHT'?'rgba(2,5,9,.82)':'rgba(48,59,66,.42)';
      for(let i=0;i<7;i++)ctx.fillRect(40+i*150,340-(i%3)*18,100,180+(i%2)*28);
      skyTexture.needsUpdate=true;
    };
    sky.position.set(0, 5, -16);
    this.scene.add(sky);
    applyExteriorTime(sky);
  }

  buildElevatorLobby() {
    // Elevator lobby floor: x from -12 to -4, z from -3.5 to 3.5
    const floorGeo = new THREE.PlaneGeometry(8, 7);
    const floor = new THREE.Mesh(floorGeo, materialForSurface('floor', floorGeo.parameters.width, floorGeo.parameters.height));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(-8, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.addWalkable(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(8, 7);
    const ceil = new THREE.Mesh(ceilGeo, materialForSurface('ceiling', ceilGeo.parameters.width, ceilGeo.parameters.height));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(-8, 3.2, 0);
    this.scene.add(ceil);

    // West wall (behind elevator)
    this.buildWall(-12, 1.6, 0, 0.4, 3.2, 7);
    // North wall of elevator lobby
    for(const x of [-10.8,-5.2])this.buildWall(x,1.6,3.5,2.4,3.2,.4);
    // South wall includes the 302 office keypad doorway; keep the elevator-front axis open.
    this.buildWall(-11.0,1.6,-3.5,2.0,3.2,.4);
    this.buildWall(-6.5,1.6,-3.5,5.0,3.2,.4);
    this.buildWall(-9.5,2.8,-3.5,1.0,.8,.4);
    this.explorationArea={id:'3F_ELEVATOR_LOBBY',label:'3F 電梯前候梯探索區',bounds:[-12,-3.5,-4,3.5],entry:[-4.2,1.7,0]};

    // Elevator and escape stair are on the same side from this approach.
    this.createSignMesh(-6.8,2.65,0,'◀ 電梯・逃生梯',Math.PI/2);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.3 });
    const rod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8), rodMat);
    rod1.position.set(-6.8, 2.93, -0.85);
    this.scene.add(rod1);
    const rod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8), rodMat);
    rod2.position.set(-6.8, 2.93, 0.85);
    this.scene.add(rod2);
  }

  buildOffice302() {
    // 302 administration/secretary office: a fully enclosed, believable locked office.
    const floorGeo=new THREE.PlaneGeometry(4.2,4.0);
    const floor=new THREE.Mesh(floorGeo,materialForSurface('floor',4.2,4.0));
    floor.rotation.x=-Math.PI/2;floor.position.set(-9.5,0,-5.5);floor.receiveShadow=true;this.scene.add(floor);this.addWalkable(floor);
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(4.2,4.0),materialForSurface('ceiling',4.2,4.0));
    ceil.rotation.x=Math.PI/2;ceil.position.set(-9.5,3.2,-5.5);this.scene.add(ceil);
    this.buildWall(-11.6,1.6,-5.5,.25,3.2,4.0);
    this.buildWall(-7.4,1.6,-5.5,.25,3.2,4.0);
    this.buildWall(-9.5,1.6,-7.5,4.2,3.2,.25);

    // Complete jamb/header package around a full-height fire-rated wood door.
    const frameMat=new THREE.MeshStandardMaterial({color:0x4a4338,roughness:.58,metalness:.08});
    const doorMat=new THREE.MeshStandardMaterial({color:0x5a3f2f,roughness:.66});
    for(const x of [-10.06,-8.94]){
      const jamb=new THREE.Mesh(new THREE.BoxGeometry(.10,2.44,.16),frameMat);
      jamb.position.set(x,1.22,-3.43);this.scene.add(jamb);
    }
    const header=new THREE.Mesh(new THREE.BoxGeometry(1.22,.10,.16),frameMat);
    header.position.set(-9.5,2.42,-3.43);this.scene.add(header);

    const leaf=new THREE.Mesh(new THREE.BoxGeometry(1.02,2.30,.08),doorMat);
    leaf.position.set(-9.5,1.15,-3.47);leaf.castShadow=true;
    leaf.userData={interactable:true,id:'302_KEYPAD_DOOR',type:'office_302_keypad',label:'302 行政主管／科秘書辦公室｜電子鎖'};
    this.scene.add(leaf);this.interactables.push(leaf);this.office302Door=leaf;this.office302Open=false;

    // Narrow frosted vision panel keeps the office visually private while making the door feel real.
    const glassMat=new THREE.MeshStandardMaterial({color:0xc7d1cc,transparent:true,opacity:.42,roughness:.66,metalness:0});
    const visionFrame=new THREE.Mesh(new THREE.BoxGeometry(.34,.72,.025),frameMat);visionFrame.position.set(0,.34,-.055);leaf.add(visionFrame);
    const vision=new THREE.Mesh(new THREE.PlaneGeometry(.27,.64),glassMat);vision.position.set(0,.34,-.071);vision.rotation.y=Math.PI;leaf.add(vision);
    const handle=new THREE.Mesh(new THREE.BoxGeometry(.22,.035,.035),this.materials.fixture);handle.position.set(.33,-.08,-.08);leaf.add(handle);

    this.office302Collider=new THREE.Box3(new THREE.Vector3(-10.02,0,-3.54),new THREE.Vector3(-8.98,2.35,-3.40));
    this.colliders.push(this.office302Collider);

    // Room plaque above the door.
    const signCanvas=document.createElement('canvas');signCanvas.width=720;signCanvas.height=190;const sctx=signCanvas.getContext('2d');
    sctx.fillStyle='#edf2ee';sctx.fillRect(0,0,720,190);sctx.fillStyle='#24513a';sctx.fillRect(0,0,720,44);
    sctx.fillStyle='#173127';sctx.font='bold 34px sans-serif';sctx.fillText('302 行政主管／科秘書辦公室',28,112);
    sctx.fillStyle='#5b6b62';sctx.font='18px sans-serif';sctx.fillText('ADMINISTRATION / SECRETARY OFFICE',30,154);
    const signTex=new THREE.CanvasTexture(signCanvas);signTex.colorSpace=THREE.SRGBColorSpace;
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.44),new THREE.MeshBasicMaterial({map:signTex}));
    sign.position.set(-9.5,2.68,-3.385);this.scene.add(sign);

    // Physical keypad: casing, screen, 12 tactile keys and status LED.
    const keypadGroup=new THREE.Group();keypadGroup.position.set(-8.78,1.30,-3.39);this.scene.add(keypadGroup);
    const keypadBody=new THREE.Mesh(new THREE.BoxGeometry(.29,.52,.09),new THREE.MeshStandardMaterial({color:0x2b302d,roughness:.45,metalness:.25}));
    keypadGroup.add(keypadBody);
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(.19,.07),new THREE.MeshBasicMaterial({color:0x90b49b}));
    screen.position.set(0,.18,.048);keypadGroup.add(screen);
    const keyMat=new THREE.MeshStandardMaterial({color:0x7d8781,roughness:.52,metalness:.1});
    const labels=['1','2','3','4','5','6','7','8','9','*','0','#'];
    for(let i=0;i<12;i++){
      const col=i%3,row=Math.floor(i/3);
      const key=new THREE.Mesh(new THREE.BoxGeometry(.055,.055,.018),keyMat);
      key.position.set((col-1)*.072,.075-row*.073,.055);keypadGroup.add(key);
    }
    const led=new THREE.Mesh(new THREE.CircleGeometry(.025,14),new THREE.MeshBasicMaterial({color:0xb93c34}));
    led.position.set(.09,.18,.058);keypadGroup.add(led);this.office302Led=led;
    const keypadHit=new THREE.Mesh(new THREE.BoxGeometry(.38,.62,.24),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    keypadHit.position.set(-8.78,1.30,-3.36);
    keypadHit.userData={interactable:true,id:'302_KEYPAD',type:'office_302_keypad',label:'302 電子密碼鎖'};
    this.scene.add(keypadHit);this.interactables.push(keypadHit);this.office302Keypad=keypadHit;

    // Small yellow note beside the lock. It gives direction, not the answer.
    const noteCanvas=document.createElement('canvas');noteCanvas.width=420;noteCanvas.height=300;const nctx=noteCanvas.getContext('2d');
    nctx.fillStyle='#f3e58f';nctx.fillRect(0,0,420,300);nctx.fillStyle='#51462d';nctx.font='bold 28px sans-serif';
    ['每週一重設','請參照對面','夜間告示'].forEach((t,i)=>nctx.fillText(t,28,70+i*72));
    const noteTex=new THREE.CanvasTexture(noteCanvas);noteTex.colorSpace=THREE.SRGBColorSpace;
    const note=new THREE.Mesh(new THREE.PlaneGeometry(.32,.23),new THREE.MeshBasicMaterial({map:noteTex}));
    note.position.set(-8.48,1.53,-3.375);this.scene.add(note);

    // A small desk and bottom drawer containing the brass museum key.
    const desk=new THREE.Mesh(new THREE.BoxGeometry(1.8,.08,.78),this.materials.wood);desk.position.set(-9.4,.78,-6.35);this.scene.add(desk);
    for(const x of [-10.15,-8.65]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.08,.72,.08),this.materials.fixture);leg.position.set(x,.38,-6.35);this.scene.add(leg);}
    const drawer=new THREE.Mesh(new THREE.BoxGeometry(.62,.55,.62),this.materials.wall);drawer.position.set(-8.72,.30,-6.15);this.scene.add(drawer);
    const keyGroup=new THREE.Group();keyGroup.name='MuseumBrassKey_302';
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.05,.009,12,24),this.materials.brass);keyGroup.add(ring);
    const blade=new THREE.Mesh(new THREE.BoxGeometry(.016,.010,.16),this.materials.brass);blade.position.set(0,0,.11);keyGroup.add(blade);
    const tag=new THREE.Mesh(new THREE.BoxGeometry(.12,.014,.16),this.materials.brass);tag.position.set(.085,0,-.02);keyGroup.add(tag);
    keyGroup.position.set(-8.72,.58,-6.12);keyGroup.visible=false;this.scene.add(keyGroup);
    const keyHit=new THREE.Mesh(new THREE.BoxGeometry(.68,.62,.68),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    keyHit.position.set(-8.72,.32,-6.15);
    keyHit.userData={interactable:false,id:'MUSEUM_KEY_302',type:'museum_key_302',label:'檢查 302 最下層抽屜',targetGroup:keyGroup};
    this.scene.add(keyHit);this.interactables.push(keyHit);this.museumKey302=keyHit;

    // Real wall-mounted acrylic bulletin case on the solid south-wall segment.
    const caseBack=new THREE.Mesh(new THREE.BoxGeometry(3.55,1.72,.09),new THREE.MeshStandardMaterial({color:0x735b45,roughness:.7}));
    caseBack.position.set(-6.35,1.73,-3.28);this.scene.add(caseBack);
    const canvas=document.createElement('canvas');canvas.width=1400;canvas.height=760;const ctx=canvas.getContext('2d');
    ctx.fillStyle='#e8e6de';ctx.fillRect(0,0,1400,760);
    ctx.fillStyle='#355342';ctx.fillRect(0,0,1400,90);
    ctx.fillStyle='#fff';ctx.font='bold 42px sans-serif';ctx.fillText('三樓醫療行政配置／夜間聯絡',42,60);
    ctx.fillStyle='#304239';ctx.font='25px sans-serif';
    const rows=[
      ['行政主管','代號 30','分機 4312'],
      ['科秘書夜間備援','代號 82','分機 4398'],
      ['總醫師室','代號 17','分機 4317'],
      ['總務聯絡','代號 09','分機 4309'],
      ['夜間院內保全','巡邏 3F','分機 4411'],
      ['垃圾分類／器材回收','依總務公告辦理','']
    ];
    rows.forEach((r,i)=>{
      const y=150+i*82;ctx.fillStyle=i%2?'#f2f1ec':'#dedfd9';ctx.fillRect(42,y-38,1316,64);
      ctx.fillStyle='#34463d';ctx.font='24px sans-serif';ctx.fillText(r[0],70,y);ctx.fillText(r[1],520,y);ctx.fillText(r[2],920,y);
    });
    ctx.fillStyle='#706f67';ctx.font='16px sans-serif';ctx.fillText('夜間門禁請依各辦公室貼示辦理',70,700);
    // Tiny, low-contrast handwritten residue: unreadable from normal gameplay distance.
    ctx.save();ctx.translate(1110,650);ctx.rotate(-.08);ctx.fillStyle='rgba(120,48,38,.30)';ctx.font='18px cursive';ctx.fillText('門禁 3082',0,0);ctx.restore();
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(3.38,1.55),new THREE.MeshBasicMaterial({map:tex}));
    face.position.set(-6.35,1.73,-3.225);this.scene.add(face);
    const acrylic=new THREE.Mesh(new THREE.PlaneGeometry(3.42,1.59),new THREE.MeshStandardMaterial({color:0xdce6e2,transparent:true,opacity:.17,roughness:.18,metalness:.02}));
    acrylic.position.set(-6.35,1.73,-3.205);this.scene.add(acrylic);
    const boardHit=new THREE.Mesh(new THREE.BoxGeometry(3.60,1.80,.30),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    boardHit.position.set(-6.35,1.73,-3.18);
    boardHit.userData={interactable:true,id:'302_CODE_BOARD',type:'office_302_inspect',label:'[E] 仔細查看'};
    this.scene.add(boardHit);this.interactables.push(boardHit);this.office302Clue=boardHit;

    this.office302={id:'302',code:'3082',door:[-9.5,1.2,-3.47],bounds:[-11.6,-7.5,-7.4,-3.5],bulletin:[-6.35,1.73,-3.18]};
  }

  unlock302() {
    if(this.office302Open)return false;
    this.office302Open=true;
    const i=this.colliders.indexOf(this.office302Collider);if(i>=0)this.colliders.splice(i,1);
    this.office302Door.rotation.y=-Math.PI/2;this.office302Door.position.set(-10.0,1.15,-3.95);
    this.office302Door.userData.label='302 行政主管／科秘書辦公室｜已解鎖';
    if(this.office302Led)this.office302Led.material.color.setHex(0x38a45c);
    if(this.museumKey302){
      this.museumKey302.userData.interactable=true;
      if(this.museumKey302.userData.targetGroup)this.museumKey302.userData.targetGroup.visible=true;
    }
    return true;
  }

  buildCorridor() {
    // Corridor floor: x from -4 to 16, z from -2.5 to 2.5
    const floorGeo = new THREE.PlaneGeometry(20, 5);
    const floor = new THREE.Mesh(floorGeo, materialForSurface('floor', floorGeo.parameters.width, floorGeo.parameters.height));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(6, 0, 0);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.addWalkable(floor);

    // Corridor ceiling
    const ceilGeo = new THREE.PlaneGeometry(20, 5);
    const ceil = new THREE.Mesh(ceilGeo, materialForSurface('ceiling', ceilGeo.parameters.width, ceilGeo.parameters.height));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(6, 3.2, 0);
    this.scene.add(ceil);

    // East end wall
    // User-authorized east administrative wing opening.
    for(const side of [-1,1])this.buildWall(16,1.6,side*1.85,.4,3.2,1.3);

    // South wall with large windows (Sunset view)
    // Pillars and window sills
    this.buildWall(6, 0.5, -2.5, 20, 1.0, 0.4); // lower wall
    this.buildWall(6, 3.0, -2.5, 20, 0.4, 0.4); // upper lintel
    // Vertical mullions
    for (let x = -3; x <= 15; x += 3.5) {
      this.buildWall(x, 1.8, -2.5, 0.3, 2.0, 0.4);
    }
    // Glass panes
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(19, 1.8), this.materials.glass);
    glass.position.set(6, 1.8, -2.35);
    this.scene.add(glass);

    // North wall of corridor has opening into Duty Office
    // Wall segment west of office door (x from -4.0 to 1.8)
    this.buildWall(-1.1, 1.6, 2.5, 5.8, 3.2, 0.4);
    // Doorway opening from x = 1.8 to 3.0 (width 1.2m, height 2.4m)
    // Lintel over doorway (y from 2.4 to 3.2)
    this.buildWall(2.4, 2.8, 2.5, 1.2, 0.8, 0.4);
    // Office front wall east of doorway (x from 3.0 to 11.0)
    this.buildWall(7.0, 1.6, 2.5, 8.0, 3.2, 0.4);
    // Wall east of 316 includes a doorway into the equipment storage room.
    this.buildWall(11.95,1.6,2.5,1.9,3.2,.4);
    this.buildWall(15.05,1.6,2.5,1.9,3.2,.4);
    this.buildWall(13.5,2.8,2.5,1.2,.8,.4);
  }

  buildStorageRoom() {
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(5,4),materialForSurface('floor',5,4));
    floor.rotation.x=-Math.PI/2;floor.position.set(13.5,0,4.5);floor.receiveShadow=true;this.scene.add(floor);this.addWalkable(floor);
    const ceil=new THREE.Mesh(new THREE.PlaneGeometry(5,4),materialForSurface('ceiling',5,4));
    ceil.rotation.x=Math.PI/2;ceil.position.set(13.5,3.2,4.5);this.scene.add(ceil);
    this.buildWall(11,1.6,4.5,.25,3.2,4);
    this.buildWall(16,1.6,4.5,.25,3.2,4);
    this.buildWall(13.5,1.6,6.5,5,3.2,.25);

    // Door is deliberately left slightly ajar.
    const door=new THREE.Mesh(new THREE.BoxGeometry(1.15,2.30,.07),new THREE.MeshStandardMaterial({color:0x6e5140,roughness:.7}));
    door.position.set(13.05,1.15,2.72);door.rotation.y=-.52;this.scene.add(door);this.storageDoor=door;
    const labelCanvas=document.createElement('canvas');labelCanvas.width=480;labelCanvas.height=180;const lctx=labelCanvas.getContext('2d');
    lctx.fillStyle='#edf2ee';lctx.fillRect(0,0,480,180);lctx.fillStyle='#24513a';lctx.fillRect(0,0,480,45);
    lctx.fillStyle='#1f2d26';lctx.font='bold 32px sans-serif';lctx.fillText('器材儲藏室',28,105);lctx.font='18px sans-serif';lctx.fillText('CPR 教學器材',28,143);
    const labelTex=new THREE.CanvasTexture(labelCanvas);labelTex.colorSpace=THREE.SRGBColorSpace;
    const plaque=new THREE.Mesh(new THREE.PlaneGeometry(.95,.36),new THREE.MeshBasicMaterial({map:labelTex}));
    plaque.position.set(12.45,2.05,2.28);plaque.rotation.y=Math.PI;this.scene.add(plaque);

    // Training cart.
    const cartMat=this.materials.fixture;
    const cart=new THREE.Group();cart.position.set(13.5,0,5.15);this.scene.add(cart);
    const bed=new THREE.Mesh(new THREE.BoxGeometry(1.70,.12,.72),this.materials.wall);bed.position.y=.76;cart.add(bed);
    for(const x of [-.72,.72])for(const z of [-.25,.25]){const leg=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.62,8),cartMat);leg.position.set(x,.42,z);cart.add(leg);}
    const anne=createAnnieArt(this.scene,{materials:this.materials,state:'STORAGE_STATIC',position:[14.2,.84,5.15],rotationY:0});
    anne.rotation.z=Math.PI/2;
    this.anneGroup=anne;this.anneHead=anne.getObjectByName('Annie_Head');this.anneStage=0;
    this.anneStool=anne.getObjectByName('Annie_Stool');
    if(this.anneStool)this.anneStool.visible=false;
    const anneHit=new THREE.Mesh(new THREE.BoxGeometry(.95,1.9,.95),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    anneHit.position.set(13.48,1.0,5.15);anneHit.userData={interactable:true,id:'CPR_ANNE',type:'cpr_anne',label:'查看 CPR 訓練假人「安妮」'};
    this.scene.add(anneHit);this.interactables.push(anneHit);this.anneHit=anneHit;
    this.anneTrainingCart=cart;
    this.storageRoom={id:'3F_STORAGE',label:'器材儲藏室',anne:true,bounds:[11,2.5,16,6.5]};
  }

  setAnneStage(stage) {
    if(!this.anneGroup||stage===this.anneStage)return;
    this.anneStage=stage;
    this.anneGroup.visible=stage<3;this.anneHit.visible=stage<3;
    this.anneHit.userData.interactable=stage<3;
    if(stage===0){
      this.anneGroup.position.set(14.2,.84,5.15);this.anneGroup.rotation.set(0,0,Math.PI/2);
      this.anneStool.visible=false;this.anneHit.position.set(13.48,1.0,5.15);
    }
    if(stage===1){
      this.anneGroup.position.set(13.48,0,3.3);this.anneGroup.rotation.set(0,Math.PI,0);
      this.anneStool.visible=false;this.anneHit.position.set(13.48,1.0,3.3);
    }
  }

  buildDutyOffice() {
    // Duty office floor: x from 1 to 11, z from 2.5 to 8.5
    const floorGeo = new THREE.PlaneGeometry(10, 6);
    const floor = new THREE.Mesh(floorGeo, materialForSurface('floor', floorGeo.parameters.width, floorGeo.parameters.height));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(6, 0, 5.5);
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.addWalkable(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(10, 6);
    const ceil = new THREE.Mesh(ceilGeo, materialForSurface('ceiling', ceilGeo.parameters.width, ceilGeo.parameters.height));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(6, 3.2, 5.5);
    this.scene.add(ceil);

    // Office perimeter walls
    this.buildWall(6, 1.6, 8.5, 10, 3.2, 0.4); // North back wall
    this.buildWall(1, 1.6, 5.5, 0.4, 3.2, 6);   // West wall
    this.buildWall(11, 1.6, 5.5, 0.4, 3.2, 6);  // East wall

    // Office main desk
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.08, 1.2),
      this.materials.wood
    );
    deskTop.position.set(6.0, 0.78, 6.2);
    deskTop.castShadow = true;
    this.scene.add(deskTop);

    // Desk legs/body
    const deskBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 0.74, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x5a3d28 })
    );
    deskBody.position.set(6.0, 0.37, 6.2);
    this.scene.add(deskBody);
    this.addCollider(new THREE.Box3(
      new THREE.Vector3(4.7, 0, 5.5),
      new THREE.Vector3(7.3, 1.0, 6.9)
    ));

    // Office chair
    const chair = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.9, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 })
    );
    chair.position.set(6.0, 0.5, 7.3);
    this.scene.add(chair);

    // Bulletin Board on North Wall
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 1.2, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xbf9b68, roughness: 0.9 })
    );
    board.position.set(6.5, 2.0, 8.28);
    this.scene.add(board);

    // Side bookshelf for optional game hints; positioned clear of the duty-rule board.
    const shelfMat=new THREE.MeshStandardMaterial({color:0x4c3526,roughness:.72});
    const hintShelf=new THREE.Group();hintShelf.position.set(9.65,0,8.08);this.scene.add(hintShelf);
    for(const x of [-.72,.72]){const side=new THREE.Mesh(new THREE.BoxGeometry(.10,1.95,.40),shelfMat);side.position.set(x,.98,0);hintShelf.add(side);}
    for(const y of [.08,.52,.96,1.40,1.84]){const sh=new THREE.Mesh(new THREE.BoxGeometry(1.54,.08,.42),shelfMat);sh.position.set(0,y,0);hintShelf.add(sh);}
    const hintDefs=[
      ['316_HINT_1F_SECURITY',-.43,.72,'一樓警衛查哨紀錄影本',[
        '夜間巡邏紀錄提到：一樓警衛台後方仍保留早期鑰匙標籤櫃。\n\n其中幾個標籤已褪色，但仍有人在深夜更動位置。',
        '附註欄反覆出現同一句：「02:17 後不要單獨巡舊服務走道。」\n\n簽名欄卻沒有任何人承認寫過這句話。'
      ]],
      ['316_HINT_1F_SERVICE',0,.72,'一樓設備維護單',[
        '一樓公共大廳後方有一段舊服務走道，平時不對外開放。\n\n維修單備註：02:00 後偶爾會出現無來源的照明啟動紀錄。',
        '最近一次維修結論：線路正常。\n\n工程人員手寫：「若再發生，先確認警衛台後方舊配電箱，而不是換燈管。」'
      ]],
      ['316_HINT_OLD_ROUTE',.43,.72,'舊院區動線修訂頁',[
        '舊版動線圖上，一樓靠近警衛台的位置曾畫有一扇服務門。\n\n新版圖面把它改成實牆，但原始門框是否拆除沒有註記。',
        '圖面角落有鉛筆箭頭指向公共大廳後方，旁邊只寫：「門還在，只是被遮住。」'
      ]]
    ];
    for(const [id,x,y,title,pages] of hintDefs){
      const file=new THREE.Mesh(new THREE.BoxGeometry(.22,.34,.24),this.materials.wood);file.position.set(x,y,.25);
      file.userData={interactable:true,id,type:'archive_document',label:`翻閱：${title}`,documentTitle:title,pages};hintShelf.add(file);this.interactables.push(file);
    }
    this.addCollider(new THREE.Box3(new THREE.Vector3(8.88,0,7.82),new THREE.Vector3(10.42,1.95,8.32)));

    // Desk warm lamp
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.04, 16),
      new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 })
    );
    lampBase.position.set(5.1, 0.84, 6.5);
    this.scene.add(lampBase);

    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.18, 0.16, 32),
      new THREE.MeshStandardMaterial({ color: 0xe8e3d7, roughness: 0.6 })
    );
    lampShade.position.set(5.1, 1.15, 6.5);
    this.scene.add(lampShade);

    // 316 desk phone: ordinary before handoff, uncanny afterwards.
    const phoneBase=new THREE.Group();phoneBase.name='DutyPhone_316_Base';phoneBase.position.set(5.45,.02,5.72);this.scene.add(phoneBase);
    const phonePart=(material,position,size)=>{const part=new THREE.Mesh(new THREE.BoxGeometry(...size),material);part.position.set(...position);phoneBase.add(part);return part;};
    phonePart(this.materials.wallDark,[0,.84,0],[.28,.07,.20]);
    phonePart(this.materials.fixture,[0,.89,-.01],[.19,.018,.09]);
    phonePart(this.materials.ceiling,[0,.92,-.055],[.25,.035,.055]);
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)phonePart(this.materials.metal,[-.065+col*.065,.885,.025+row*.035],[.025,.008,.016]);
    const handset=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.19,4,10),this.materials.wallDark);handset.name='DutyPhone_316_Handset';handset.rotation.z=Math.PI/2;handset.position.set(0,.98,-.055);phoneBase.add(handset);
    const phoneHit=new THREE.Mesh(new THREE.BoxGeometry(.55,.35,.42),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    phoneHit.position.set(5.45,.95,5.72);phoneHit.userData={interactable:true,id:'316_PHONE',type:'office_phone_316',label:'查看 316 辦公室電話'};
    this.scene.add(phoneHit);this.interactables.push(phoneHit);this.phoneMesh=phoneHit;

    // INTERACTABLE 1: Duty-Room Key + Staff Access Card (值班室鑰匙／感應卡)
    const keyGroup = new THREE.Group();
    // Key ring
    const ringGeo = new THREE.TorusGeometry(0.05, 0.008, 12, 24);
    const ring = new THREE.Mesh(ringGeo, this.materials.brass);
    keyGroup.add(ring);

    // Key blade
    const bladeGeo = new THREE.BoxGeometry(0.015, 0.006, 0.12);
    const blade = new THREE.Mesh(bladeGeo, this.materials.brass);
    blade.position.set(0, 0, 0.08);
    keyGroup.add(blade);

    // Key plastic tag for the independent 4F duty room
    const tagGeo = new THREE.BoxGeometry(0.08, 0.01, 0.14);
    const tagMat = new THREE.MeshStandardMaterial({ color: 0x1f5f8b, roughness: 0.5 });
    const tag = new THREE.Mesh(tagGeo, tagMat);
    tag.position.set(0.06, 0, -0.04);
    keyGroup.add(tag);

    const cardMat = new THREE.MeshStandardMaterial({ color: 0x2f745b, roughness: 0.45 });
    const card = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.14), cardMat);
    card.position.set(-0.075, 0, -0.035);
    keyGroup.add(card);
    const cardStripe = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.004, 0.012), this.materials.brass);
    cardStripe.position.set(-0.075, 0.007, -0.055);
    keyGroup.add(cardStripe);

    keyGroup.position.set(2.39, 1.02, 7.55);
    keyGroup.rotation.z=-Math.PI/2;
    keyGroup.visible = false;
    this.scene.add(keyGroup);
    this.dutyItemsGroup=keyGroup;

    // Hitbox for key pickup
    const keyHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.35),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    keyHitbox.position.set(2.42,1.02,7.55);
    keyHitbox.userData = {
      interactable: false,
      id: 'KEY_PICKUP',
      label: '值班物品已移至密碼櫃',
      type: 'key',
      targetGroup: keyGroup
    };
    this.scene.add(keyHitbox);
    this.interactables.push(keyHitbox);
    this.keyMesh = keyHitbox;

    // INTERACTABLE 2: Duty Log Book (值班本)
    const bookGeo = new THREE.BoxGeometry(0.42, 0.04, 0.32);
    const bookMat = new THREE.MeshStandardMaterial({ color: 0x1b3c59, roughness: 0.6 });
    const logBook = new THREE.Mesh(bookGeo, bookMat);
    logBook.position.set(6.4, 0.84, 6.0);
    this.scene.add(logBook);

    // White page on top
    const pageGeo = new THREE.PlaneGeometry(0.38, 0.28);
    const pageMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.9 });
    const page = new THREE.Mesh(pageGeo, pageMat);
    page.rotation.x = -Math.PI / 2;
    page.position.set(6.4, 0.865, 6.0);
    this.scene.add(page);

    // Pen beside book
    const penGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.18);
    penGeo.rotateZ(Math.PI / 2);
    const penMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.6 });
    const pen = new THREE.Mesh(penGeo, penMat);
    pen.position.set(6.7, 0.84, 6.0);
    this.scene.add(pen);

    // Hitbox for Duty Log
    const logHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.25, .85, 1.0),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    logHitbox.position.set(6.4, 0.85, 6.0);
    logHitbox.userData = {
      interactable: true,
      id: 'DUTY_LOG',
      label: '簽署值班名冊',
      type: 'duty_log'
    };
    this.scene.add(logHitbox);
    this.interactables.push(logHitbox);
    this.dutyLogMesh = logHitbox;

    // HIS credentials are hidden in the mobile pedestal under the main desk.
    const credentialDrawer=new THREE.Mesh(new THREE.BoxGeometry(.72,.62,.66),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));
    credentialDrawer.position.set(6.75,.39,6.2);
    credentialDrawer.userData={
      interactable:true,id:'316_CREDENTIAL_DRAWER',type:'credential_drawer_316',
      label:'打開書桌下方活動櫃',
      documentTitle:'夜班 HIS 登入卡',
      pages:['抽屜最底層壓著一張院內登入卡。\n\n帳號：night403\n密碼：QL1700\n\n資料保密・禁止外洩。']
    };
    this.scene.add(credentialDrawer);this.interactables.push(credentialDrawer);this.credentialDrawerMesh=credentialDrawer;

    // Four-digit locked cabinet holding the real duty items.
    const lockerBody=new THREE.Mesh(new THREE.BoxGeometry(1.15,1.65,.48),new THREE.MeshStandardMaterial({color:0x59625d,roughness:.72,metalness:.15}));
    lockerBody.position.set(1.75,.83,7.55);lockerBody.castShadow=true;this.scene.add(lockerBody);
    this.addCollider(new THREE.Box3(new THREE.Vector3(1.16,0,7.27),new THREE.Vector3(2.34,1.70,7.83)));
    const lockerDoor=new THREE.Mesh(
      new THREE.BoxGeometry(.045,1.48,.42),
      new THREE.MeshStandardMaterial({color:0x4f5753,roughness:.68,metalness:.22})
    );
    lockerDoor.position.set(2.355,.84,7.55);
    lockerDoor.name='316_LockerDoor';
    this.scene.add(lockerDoor);
    this.lockerDoor=lockerDoor;
    const lockerInset=new THREE.Mesh(
      new THREE.BoxGeometry(.035,.78,.30),
      new THREE.MeshStandardMaterial({color:0x1d2421,roughness:.95})
    );
    lockerInset.position.set(2.335,1.00,7.55);
    lockerInset.visible=false;
    lockerInset.name='316_LockerOpenInset';
    this.scene.add(lockerInset);
    this.lockerInset=lockerInset;
    const keypad=new THREE.Mesh(new THREE.BoxGeometry(.07,.30,.22),new THREE.MeshStandardMaterial({color:0x242826,roughness:.45}));
    keypad.position.set(2.36,1.05,7.55);
    keypad.userData={interactable:true,id:'316_LOCKER',type:'locker_316',label:'輸入四位數密碼打開值班櫃'};
    this.scene.add(keypad);this.interactables.push(keypad);this.lockerMesh=keypad;
    const keypadLed=new THREE.Mesh(new THREE.CircleGeometry(.025,14),new THREE.MeshBasicMaterial({color:0xaa3a32}));
    keypadLed.rotation.y=Math.PI/2;keypadLed.position.set(2.405,1.12,7.55);this.scene.add(keypadLed);this.lockerLed=keypadLed;
  }

  buildWorkstations() {
    // Latest user direction: visible monitor faces point toward the operator chairs.
    // Workstation desk on the east side of office (x = 10.0, z = 5.5)
    const deskGeo = new THREE.BoxGeometry(1.2, 0.08, 2.6);
    const desk = new THREE.Mesh(deskGeo, this.materials.wood);
    desk.position.set(10.0, 0.78, 5.5);
    this.scene.add(desk);

    const deskLegs = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.74, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    deskLegs.position.set(10.0, 0.37, 5.5);
    this.scene.add(deskLegs);
    this.addCollider(new THREE.Box3(
      new THREE.Vector3(9.4, 0, 4.1),
      new THREE.Vector3(10.7, 1.0, 6.9)
    ));

    // Two PC monitors - oriented INWARD (facing East toward inner desk, backs facing doorway/corridor)
    [-0.6, 0.6].forEach((offsetZ, idx) => {
      if(idx===1){
        const legacy=buildLegacyArchiveTerminal({
          parent:this.scene,materials:getMaterials(),position:[9.65,.78,5.5+offsetZ],rotationY:-Math.PI/2,
          id:'316_LEGACY_TERMINAL',type:'legacy_terminal_316',label:'查看 316 舊資料終端',
          screenTitle:'1998-ER-0217 SEARCH',name:'DutyTerminal_316_Legacy'
        });
        this.interactables.push(legacy.hitbox);this.legacyTerminalMesh=legacy.hitbox;
        return;
      }
      // Monitor stand on desk
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5 })
      );
      stand.position.set(9.65, 0.93, 5.5 + offsetZ);
      this.scene.add(stand);

      // Monitor Screen casing: back faces West toward door, screen faces East toward desk interior
      const casing = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.42, 0.62),
        new THREE.MeshStandardMaterial({ color: 0x1f2326, roughness: 0.4 })
      );
      casing.position.set(9.65, 1.25, 5.5 + offsetZ);
      this.scene.add(casing);

      // HIS-like monitor content on inner screen surface (facing East +X)
      const screenCanvas = document.createElement('canvas');
      screenCanvas.width = 320;
      screenCanvas.height = 220;
      const sctx = screenCanvas.getContext('2d');
      sctx.fillStyle = idx === 0 ? '#d8e4de' : '#dce4ea';
      sctx.fillRect(0, 0, 320, 220);
      sctx.fillStyle = idx === 0 ? '#355342' : '#41576a';
      sctx.fillRect(0, 0, 320, 32);
      sctx.fillStyle = '#ffffff';
      sctx.font = 'bold 18px sans-serif';
      sctx.fillText(idx === 0 ? '夜間交班' : '病房資訊', 14, 22);
      sctx.fillStyle = '#b9c6bf';
      sctx.fillRect(14, 54, 292, 18);
      sctx.fillRect(14, 84, 292, 18);
      sctx.fillRect(14, 114, 292, 18);
      sctx.fillStyle = '#d99f5d';
      sctx.fillRect(14, 154, 96, 28);
      sctx.fillStyle = '#ffffff';
      sctx.font = '16px sans-serif';
      sctx.fillText('確認', 46, 173);
      const screenTex = new THREE.CanvasTexture(screenCanvas);
      screenTex.colorSpace = THREE.SRGBColorSpace;
      const displayGeo = new THREE.PlaneGeometry(0.58, 0.38);
        const display = new THREE.Mesh(displayGeo, new THREE.MeshBasicMaterial({ map: screenTex }));
        display.name='DutyTerminal_316_LegacyScreen';
      // Screen normal points -X toward the operator chair (latest user instruction).
      display.rotation.y = -Math.PI / 2;
      display.position.set(9.61, 1.25, 5.5 + offsetZ);
      this.scene.add(display);

      // Keyboard & mouse on inner desk surface
      const kb = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.44),
        new THREE.MeshStandardMaterial({ color: 0x111111 })
      );
      kb.position.set(9.44, 0.83, 5.5 + offsetZ);
      this.scene.add(kb);

      if (idx === 0) {
        // Main eligible workstation terminal hitbox
        const wsHitbox = new THREE.Mesh(
          new THREE.BoxGeometry(0.8, 0.7, 0.9),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        wsHitbox.position.set(9.8, 1.2, 5.5 + offsetZ);
        wsHitbox.userData = {
          interactable: true,
          id: 'E_HANDOFF',
          label: '使用電子交班工作站',
          type: 'workstation'
        };
        this.scene.add(wsHitbox);
        this.interactables.push(wsHitbox);
        this.workstationMesh = wsHitbox;
      }
    });
  }


  buildEnvironmentalDetails() {
    // Warm wood handrail / bumper strips, aligned to the walls only (unobstructed at office entrance)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x9a7653, roughness: 0.58 });

    // South wall handrail (continuous along window wall)
    const railSouth = new THREE.Mesh(new THREE.BoxGeometry(19.0, 0.10, 0.10), railMat);
    railSouth.position.set(6, 1.05, -2.31);
    railSouth.castShadow = true;
    this.scene.add(railSouth);

    // North wall handrail: West of office door (x: -3.5 to 1.6, length 5.1, center -0.95)
    const railNorthWest = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.10, 0.10), railMat);
    railNorthWest.position.set(-0.95, 1.05, 2.31);
    railNorthWest.castShadow = true;
    this.scene.add(railNorthWest);

    // North wall handrail is split around the CPR equipment-room doorway.
    // Door opening: x 12.9–14.1.  Keep an additional 0.15 m termination margin on both sides.
    const railNorthEastWest = new THREE.Mesh(new THREE.BoxGeometry(9.55, 0.10, 0.10), railMat);
    railNorthEastWest.name='RailNorthEast_WestOfStorage';
    railNorthEastWest.position.set(7.975, 1.05, 2.31);
    railNorthEastWest.castShadow = true;
    this.scene.add(railNorthEastWest);

    const railNorthEastEast = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.10, 0.10), railMat);
    railNorthEastEast.name='RailNorthEast_EastOfStorage';
    railNorthEastEast.position.set(14.875, 1.05, 2.31);
    railNorthEastEast.castShadow = true;
    this.scene.add(railNorthEastEast);

    // 316 Office doorway frame & open door leaf
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x7c5d42, roughness: 0.65 });
    // Left jamb
    const jambLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 0.42), frameMat);
    jambLeft.position.set(1.83, 1.2, 2.5);
    this.scene.add(jambLeft);
    // Right jamb
    const jambRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.4, 0.42), frameMat);
    jambRight.position.set(2.97, 1.2, 2.5);
    this.scene.add(jambRight);
    // Header jamb
    const jambTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.42), frameMat);
    jambTop.position.set(2.4, 2.37, 2.5);
    this.scene.add(jambTop);

    // 316 is locked after office hours. The spare key is hidden nearby.
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x6d4c36, roughness: 0.62 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.08,2.28,.07),doorMat);
    door.position.set(2.4,1.14,2.46);door.castShadow=true;
    door.userData={interactable:true,id:'316_OFFICE_DOOR',type:'office_316_door',label:'316 總醫師辦公室｜上鎖'};
    this.scene.add(door);this.interactables.push(door);this.officeDoorLeaf=door;this.officeDoorOpen=false;
    this.officeDoorCollider=new THREE.Box3(new THREE.Vector3(1.86,0,2.40),new THREE.Vector3(2.94,2.35,2.54));
    this.colliders.push(this.officeDoorCollider);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xc8c8c8, metalness: 0.85, roughness: 0.25 });
    const handleBar = new THREE.Mesh(new THREE.SphereGeometry(.055,14,10),handleMat);
    handleBar.position.set(.36,-.09,-.07);door.add(handleBar);

    // 316 Plaque mounted physically on the corridor wall to the left of the doorway
    const plaqueMountMat = new THREE.MeshStandardMaterial({ color: 0x22362b, metalness: 0.3, roughness: 0.6 });
    const plaqueMount = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.34, 0.024), plaqueMountMat);
    plaqueMount.position.set(1.25, 1.85, 2.29);
    this.scene.add(plaqueMount);

    // Plaque face with crisp medical office typography
    const plaqueCanvas = document.createElement('canvas');
    plaqueCanvas.width = 512;
    plaqueCanvas.height = 192;
    const pctx = plaqueCanvas.getContext('2d');
    pctx.fillStyle = '#edf2ee';
    pctx.fillRect(0, 0, 512, 192);

    // Top hospital department header
    pctx.fillStyle = '#204d37';
    pctx.fillRect(0, 0, 512, 40);
    pctx.fillStyle = '#ffffff';
    pctx.font = 'bold 20px sans-serif';
    pctx.textAlign = 'left';
    pctx.textBaseline = 'middle';
    pctx.fillText('精神醫療部 ｜ 醫療行政區', 24, 20);

    // Left room number badge
    pctx.fillStyle = '#204d37';
    pctx.fillRect(18, 54, 120, 120);
    pctx.fillStyle = '#ffffff';
    pctx.font = 'bold 44px sans-serif';
    pctx.textAlign = 'center';
    pctx.textBaseline = 'middle';
    pctx.fillText('316', 78, 114);

    // Right room designation
    pctx.fillStyle = '#1c2822';
    pctx.font = 'bold 36px sans-serif';
    pctx.textAlign = 'left';
    pctx.fillText('總醫師辦公室', 156, 95);

    pctx.fillStyle = '#556a5e';
    pctx.font = '18px sans-serif';
    pctx.fillText('CHIEF RESIDENT OFFICE', 156, 140);

    // Frame border
    pctx.strokeStyle = '#8faaa0';
    pctx.lineWidth = 4;
    pctx.strokeRect(2, 2, 508, 188);

    const plaqueTex = new THREE.CanvasTexture(plaqueCanvas);
    plaqueTex.colorSpace = THREE.SRGBColorSpace;
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.31),
      new THREE.MeshBasicMaterial({ map: plaqueTex, side: THREE.DoubleSide })
    );
    plaque.position.set(1.25, 1.85, 2.274);
    plaque.rotation.y = Math.PI;
    this.scene.add(plaque);

    // Corridor seating and waiting nook.
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x566e65, roughness: 0.78 });
    [8.7, 10.0].forEach((x) => {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 0.46), seatMat);
      seat.position.set(x, 0.48, 1.95);
      seat.castShadow = true;
      this.scene.add(seat);
      const back = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.56, 0.10), seatMat);
      back.position.set(x, 0.78, 2.18);
      this.scene.add(back);
    });

    // Indoor plant.
    const potMat = new THREE.MeshStandardMaterial({ color: 0x8a6c52, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4d725b, roughness: 0.9 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.42, 20), potMat);
    pot.position.set(13.6, 0.21, -1.95);
    this.scene.add(pot);
    for (let i = 0; i < 8; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), leafMat);
      leaf.scale.set(0.65, 1.8, 0.55);
      const angle = i * Math.PI * 0.25;
      leaf.position.set(13.6 + Math.cos(angle) * 0.18, 0.58 + (i % 2) * 0.10, -1.95 + Math.sin(angle) * 0.18);
      leaf.rotation.z = Math.cos(angle) * 0.35;
      this.scene.add(leaf);
    }

    // Framed notice board at corridor end.
    const artCanvas = document.createElement('canvas');
    artCanvas.width = 512;
    artCanvas.height = 320;
    const actx = artCanvas.getContext('2d');
    const gradient = actx.createLinearGradient(0, 0, 0, 320);
    gradient.addColorStop(0, '#d3d8d3');
    gradient.addColorStop(1, '#f1eee8');
    actx.fillStyle = gradient;
    actx.fillRect(0, 0, 512, 320);
    actx.fillStyle = '#355342';
    actx.font = 'bold 36px sans-serif';
    actx.fillText('醫師值班提醒', 160, 54);
    actx.font = '24px sans-serif';
    ['• 17:00 交接完成後再上樓', '• 夜間門禁請隨身攜帶鑰匙與感應卡', '• 病況變化請先通知護理站'].forEach((line, i) => actx.fillText(line, 54, 125 + i * 56));
    const artTex = new THREE.CanvasTexture(artCanvas);
    artTex.colorSpace = THREE.SRGBColorSpace;
    const art = new THREE.Mesh(
      new THREE.PlaneGeometry(2.25, 1.40),
      new THREE.MeshBasicMaterial({ map: artTex })
    );
    art.position.set(15.77, 1.75, 0);
    art.rotation.y = -Math.PI / 2;
    this.scene.add(art);

    // Subtle trim above doorway.
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xb9b1a4, roughness: 0.78 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.06, 0.06), trimMat);
    trim.position.set(2.4, 2.42, 2.28);
    this.scene.add(trim);
  }

  open316Door() {
    if(this.officeDoorOpen)return false;
    this.officeDoorOpen=true;
    const i=this.colliders.indexOf(this.officeDoorCollider);if(i>=0)this.colliders.splice(i,1);
    this.officeDoorLeaf.rotation.y=-Math.PI/2;
    this.officeDoorLeaf.position.set(1.90,1.14,3.00);
    this.officeDoorLeaf.userData.label='316 總醫師辦公室｜已開啟';
    return true;
  }

  markLockerOpen(showContents=true) {
    if(this.lockerLed)this.lockerLed.material.color.setHex(0x3ea75a);
    if(this.lockerMesh)this.lockerMesh.userData.label='值班櫃｜已解鎖';
    if(this.lockerDoor){
      this.lockerDoor.rotation.z=-1.15;
      this.lockerDoor.position.set(2.48,.32,7.55);
    }
    if(this.lockerInset)this.lockerInset.visible=true;
    if(this.keyMesh){
      this.keyMesh.visible=!!showContents;
      this.keyMesh.userData.interactable=!!showContents;
      if(this.keyMesh.userData.targetGroup)this.keyMesh.userData.targetGroup.visible=!!showContents;
      if(showContents)this.keyMesh.userData.label='拿取櫃內值班鑰匙與感應卡';
    }
  }

  createSignMesh(x, y, z, text, rotationY = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#234a36';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#b6d3c3';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const signGroup = new THREE.Group();
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.6, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x2c3b31, roughness: 0.7 })
    );
    signGroup.add(signBox);

    const signMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const signGeo = new THREE.PlaneGeometry(2.38, 0.58);
    const signFront = new THREE.Mesh(signGeo, signMat);
    signFront.position.set(0, 0, 0.022);
    signGroup.add(signFront);

    const signBack = new THREE.Mesh(signGeo, signMat);
    signBack.rotation.y = Math.PI;
    signBack.position.set(0, 0, -0.022);
    signGroup.add(signBack);

    signGroup.position.set(x, y, z);
    signGroup.rotation.y = rotationY;
    this.scene.add(signGroup);
    return signGroup;
  }

  setupLighting() {
    // Ceiling fluorescent fixtures (warm white 4000K)
    const fixturePositions = [
      { x: -8, y: 3.15, z: 0 },    // Elevator lobby
      { x: -1.5, y: 3.15, z: 0 },  // Corridor west
      { x: 2.5, y: 3.15, z: 0 },   // Corridor west-mid
      { x: 6.5, y: 3.15, z: 0 },   // Corridor mid
      { x: 10.5, y: 3.15, z: 0 },  // Corridor east-mid
      { x: 14.0, y: 3.15, z: 0 },  // Corridor east
      { x: 4.5, y: 3.15, z: 5.5 }, // Office west
      { x: 8.0, y: 3.15, z: 5.5 }  // Office east
    ];

    fixturePositions.forEach(pos => {
      // Physical fixture box
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.08, 0.4),
        this.materials.fixture
      );
      box.position.set(pos.x, pos.y, pos.z);
      this.scene.add(box);

      // Light emitter bar
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.02, 0.25),
        this.materials.lightEmitter
      );
      bar.position.set(pos.x, pos.y - 0.04, pos.z);
      this.scene.add(bar);


    });
  }

  updateElevatorLight(isReady) {
    if (this.elevatorLight) {
      this.elevatorLight.material.color.setHex(isReady ? 0x00ff66 : 0xffaa00);
    }
  }
}
