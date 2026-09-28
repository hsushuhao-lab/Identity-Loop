import * as THREE from 'three';
import { worldNarrative } from '../../story/IdentityPrivacy.js';
import { solid, asset, monitor, counterFront } from '../../art/ArtDetails.js';
import { AccessDoor } from './AccessDoor.js';
import { KeyedKnobDoor } from './KeyedKnobDoor.js';
import { Doorway } from './Doorway.js';
import { CollisionFactory } from './CollisionFactory.js';
import { SignAnchor } from './SignAnchor.js';

/** Merge coincident partitions before cutting apertures: no stacked wall surfaces. */
export class PlanWalls {
  constructor(zone){this.zone=zone;this.lines=new Map();this.cuts=new Map();}
  line(axis,at,a,b){const k=`${axis}:${at}`;if(!this.lines.has(k))this.lines.set(k,[]);this.lines.get(k).push([a,b]);}
  rect(x1,z1,x2,z2){this.line('x',z1,x1,x2);this.line('x',z2,x1,x2);this.line('z',x1,z1,z2);this.line('z',x2,z1,z2);}
  cut(axis,at,c,w){const k=`${axis}:${at}`;if(!this.cuts.has(k))this.cuts.set(k,[]);this.cuts.get(k).push([c-w/2,c+w/2]);}
  build(){const q=this.zone;for(const [key,raw] of this.lines){let merged=[];for(const [a,b] of raw.sort((a,b)=>a[0]-b[0])){if(merged.length&&a<=merged.at(-1)[1]+.001)merged.at(-1)[1]=Math.max(b,merged.at(-1)[1]);else merged.push([a,b]);}
    for(const [ca,cb] of this.cuts.get(key)||[])merged=merged.flatMap(([a,b])=>cb<=a||ca>=b?[[a,b]]:[[a,Math.max(a,ca)],[Math.min(b,cb),b]].filter(([l,r])=>r-l>.001));
    const [axis,s]=key.split(':'),at=Number(s);for(const [a,b] of merged){const x=axis==='x'?(a+b)/2:at,z=axis==='x'?at:(a+b)/2;const w=axis==='x'?b-a:.22,d=axis==='x'?.22:b-a;
      q.gf.buildWall(q.zoneGroup,q.colliders,x,1.6,z,w,3.2,d);
      // Painted baseboard, follows each individual wall segment; never crosses a doorway.
      solid(q.zoneGroup,q.gf.materials.wallDark,[x,.07,z],[w+.025,.14,d+.025]);
    }
  }}
}

function mountBedWallPlaque(zone,{rect,bx,bz,roomId,bedInRoom}){
  const [x1,z1,x2,z2]=rect,margin=.16;
  const choices=[
    {wall:'north',d:Math.abs(bz-z1),x:THREE.MathUtils.clamp(bx,x1+.45,x2-.45),z:z1+margin,rotationY:0},
    {wall:'south',d:Math.abs(z2-bz),x:THREE.MathUtils.clamp(bx,x1+.45,x2-.45),z:z2-margin,rotationY:Math.PI},
    {wall:'west',d:Math.abs(bx-x1),x:x1+margin,z:THREE.MathUtils.clamp(bz,z1+.45,z2-.45),rotationY:Math.PI/2},
    {wall:'east',d:Math.abs(x2-bx),x:x2-margin,z:THREE.MathUtils.clamp(bz,z1+.45,z2-.45),rotationY:-Math.PI/2}
  ].sort((a,b)=>a.d-b.d);
  const p=choices[0];
  const plaqueObject=SignAnchor.buildWallPlaque({
    scene:zone.zoneGroup,x:p.x,y:1.42,z:p.z,rotationY:p.rotationY,
    width:.62,height:.23,code:bedInRoom,title:roomId,subtitle:`${roomId}${bedInRoom}`,header:'床位'
  });
  if(roomId==='408'&&bedInRoom==='C'){
    plaqueObject.userData={interactable:true,id:'408C_BED_PLAQUE',type:'p1_action',action:'NORMAL_EVENT',label:'查看 408C 反映的敲牆聲'};
    zone.interactables.push(plaqueObject);
  }
  return {wall:p.wall,x:p.x,y:1.42,z:p.z,rotationY:p.rotationY};
}

export function ordinaryRoom(zone,walls,{id,label=id+' 病房',rect,side,door,kind='ward',protectedArea=true,bedLimit=Infinity,storageLock='card'}) {
  const [x1,z1,x2,z2]=rect,cx=(x1+x2)/2,cz=(z1+z2)/2;
  walls.rect(...rect);const alongX=side==='north'||side==='south';
  const x=alongX?door:(side==='west'?x1:x2),z=alongX?(side==='north'?z1:z2):door;
  walls.cut(alongX?'x':'z',alongX?z:x,alongX?x:z,1.6);

  let accessDoorId=null,doorType='open';
  if(kind==='ward'){
    accessDoorId='room_'+id;doorType='knob';
    new KeyedKnobDoor(zone,{
      id:accessDoorId,x,z,yaw:alongX?0:Math.PI/2,width:1.6,title:id+' 病房',
      // Occupied patient rooms open toward the corridor so the leaf never sweeps through a bed.
      // 409 is the sealed anomaly room and keeps its previous inward swing.
      openDirection:(bedLimit===32&&Number(id)%100===9)?-1:((side==='south'||side==='east')?-1:1),
      interactionSide:(side==='south'||side==='east')?1:-1
    });
  }else if(kind==='storage'){
    accessDoorId='storage_'+id;doorType=storageLock;
    if(storageLock==='knob')new KeyedKnobDoor(zone,{id:accessDoorId,x,z,yaw:alongX?0:Math.PI/2,width:1.6,title:'儲藏室'});
    else new AccessDoor(zone,{id:accessDoorId,x,z,yaw:alongX?0:Math.PI/2,width:1.6,title:'儲藏室',material:zone.gf.materials.doorWood,readerSide:1});
  }else{
    const opening=Doorway.build({scene:zone.zoneGroup,colliders:zone.colliders,x,z,width:1.6,height:2.4,wallHeight:3.2,isAlongX:alongX,isOpen:true,doorMaterial:zone.gf.materials.doorWood});
    opening.name=`RoomDoor_${id}`;
    for(const child of opening.children)if(child.geometry?.parameters.height===2.35){opening.updateWorldMatrix(true,true);zone.colliders.push(new THREE.Box3().setFromObject(child));}
  }

  const outward=side==='north'?[0,-1]:side==='south'?[0,1]:side==='west'?[-1,0]:[1,0];
  const corridor=[x+outward[0]*1.1,1.7,z+outward[1]*1.1];
  const point=kind==='ward'?(alongX?[x,1.7,cz]:[cx,1.7,z]):[x-outward[0]*1.25,1.7,z-outward[1]*1.25];
  const yaw=side==='north'?Math.PI:side==='south'?0:side==='west'?-Math.PI/2:Math.PI/2;
  const plaqueOffset=.115;
  const plaqueX=kind==='storage'?x:x+(alongX?-1.5:outward[0]*plaqueOffset);
  const plaqueZ=kind==='storage'?z+outward[1]*plaqueOffset:z+(alongX?outward[1]*plaqueOffset:-1.5);
  SignAnchor.buildWallPlaque({scene:zone.zoneGroup,x:plaqueX,y:kind==='storage'?2.62:1.75,z:plaqueZ,rotationY:yaw,width:1,height:.34,code:id,title:label.replace(id,'').trim(),subtitle:'',header:''});

  if(kind==='ward'){
    const dx=Math.min(1.4,(x2-x1)*.28),dz=Math.min(2.2,(z2-z1)*.28);
    const spots=[[cx-dx,cz-dz],[cx+dx,cz-dz],[cx-dx,cz+dz],[cx+dx,cz+dz]];
    const letters=['A','B','C','D'],roomOrdinal=Math.max(1,Number(id)%100);
    zone.bedAreas??=[];
    spots.forEach(([bx,bz],index)=>{
      const bedIndex=index+1,bedInRoom=letters[index],bedId=`${id}${bedInRoom}`,wardBedNumber=(roomOrdinal-1)*4+bedIndex;
      if(wardBedNumber>bedLimit)return;
      const anomalous=wardBedNumber>bedLimit;
      const model=asset(zone.zoneGroup,'hospitalBed',[bx,0,bz],[1,1,1]);
      if(model){model.name=`Bed_${bedId}`;model.userData={...model.userData,roomId:id,bedInRoom,bedIndex,bedId,wardBedNumber,anomalous};}
      CollisionFactory.addBox(zone.colliders,bx,.5,bz,1.15,1,2.15);
      const plaque=mountBedWallPlaque(zone,{rect,bx,bz,roomId:id,bedInRoom});
      zone.bedAreas.push({id:bedId,roomId:id,bedInRoom,bedIndex,wardBedNumber,anomalous,position:[bx,0,bz],plaque});
    });
  }

  zone.roomAreas.push({id,label,rect,door:[x,1.7,z],point,corridor,protectedArea,kind,accessDoorId,doorType});
  zone.gf.buildCeilingLight(zone.zoneGroup,cx,3.15,cz,.65,7);
  return zone.roomAreas.at(-1);
}

export function workstation(zone,{x,z,yaw=0,id}){
  const desk=asset(zone.zoneGroup,'workDesk',[x,0,z],[1.3,1,1],yaw);
  if(desk)desk.name=`WorkstationDesk_${id}`;
  CollisionFactory.addBox(zone.colliders,x,.4,z,1.85,.8,.85);
  const deskSurfaceY=desk?new THREE.Box3().setFromObject(desk).max.y:.76;
  const face=monitor(zone.zoneGroup,zone.gf.materials,x,deskSurfaceY,z,yaw);
  const cx=x+Math.sin(yaw)*.95,cz=z+Math.cos(yaw)*.95;
  const chairObject=asset(zone.zoneGroup,'officeChair',[cx,0,cz],[1,1,1],yaw+Math.PI);
  if(chairObject)chairObject.name=`WorkstationChair_${id}`;
  face.name=`Workstation_${id}`;zone.workstations??=[];zone.workstations.push({id,screen:face,chair:[cx,0,cz],yaw,deskYaw:yaw,desk,chairObject});
  return face;
}

export function buildNursingStationClinicalProps(zone,{x,z=-4.3,id}){
  const m=zone.gf.materials;zone.clinicalProps??=[];
  const make=(suffix,type,position)=>{
    const g=new THREE.Group();g.position.set(...position);g.name=`ClinicalProp_${id}_${suffix}`;
    g.userData={clinicalProp:true,propId:`${id}_${suffix}`,type};zone.zoneGroup.add(g);
    zone.clinicalProps.push({id:`${id}_${suffix}`,type,position});return g;
  };
  const cart=(suffix,type,px,pz)=>{
    const g=make(suffix,type,[px,0,pz]);
    solid(g,m.stainless,[0,.52,0],[.76,.92,.54]);solid(g,m.counterTop,[0,1.02,0],[.84,.07,.62]);
    for(const yy of [.38,.61,.84])solid(g,m.wallDark,[0,yy,-.28],[.60,.02,.02],.002);
    for(const [wx,wz] of [[-.28,-.20],[.28,-.20],[-.28,.20],[.28,.20]]){
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.04,12),m.wallDark);wheel.rotation.z=Math.PI/2;wheel.position.set(wx,.07,wz);g.add(wheel);
    }
    return g;
  };

  const med=cart('medication_cart','medication_cart',x+1.45,z+2.15);
  for(let i=0;i<4;i++){
    const bottle=new THREE.Mesh(new THREE.CylinderGeometry(.035,.04,.12,12),i%2?m.bedSheet:m.wallBumper);
    bottle.position.set(-.24+i*.16,1.13,.05);med.add(bottle);
  }
  const tray=make('syringe_tray','syringe_tray',[x+1.45,1.16,z+1.98]);solid(tray,m.stainless,[0,0,0],[.54,.025,.18]);
  for(let i=0;i<3;i++){solid(tray,m.glass,[-.16+i*.16,.035,0],[.14,.025,.025]);solid(tray,m.metal,[-.04+i*.16,.035,0],[.10,.006,.006],.001);}

  cart('treatment_cart','treatment_cart',x+1.45,z+.15);
  const bp=make('bp_device','bp_device',[x+1.30,1.10,z+.06]);solid(bp,m.metal,[0,.12,0],[.34,.24,.18]);solid(bp,m.glass,[0,.15,.095],[.24,.11,.02]);
  const pulse=make('pulse_oximeter','pulse_oximeter',[x+1.68,1.08,z+.06]);solid(pulse,m.wallDark,[0,.04,0],[.18,.09,.12]);solid(pulse,m.glass,[0,.09,.01],[.12,.025,.08]);

  const iv=make('iv_pole','iv_pole',[x+1.55,0,z-1.80]);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,1.85,12),m.stainless);pole.position.y=.98;iv.add(pole);
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.035,20),m.metal);base.position.y=.035;iv.add(base);
  solid(iv,m.stainless,[0,1.88,0],[.44,.025,.025]);solid(iv,m.stainless,[.20,1.77,0],[.025,.22,.025]);
  const bag=make('iv_bag','iv_bag',[x+1.76,1.56,z-1.80]);solid(bag,m.glass,[0,0,0],[.20,.34,.08]);solid(bag,m.bedSheet,[0,.10,.045],[.11,.05,.01]);

  const cabinet=make('medication_cabinet','medication_cabinet',[x-4.28,0,z+.05]);
  solid(cabinet,m.stainless,[0,1.55,0],[.34,1.45,1.10]);solid(cabinet,m.glass,[.18,1.55,0],[.025,1.18,.88]);

  const scope=make('stethoscope','stethoscope',[x-4.43,0,z-1.05]);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.15,.018,10,28),m.wallDark);ring.rotation.y=Math.PI/2;ring.position.set(.03,1.62,0);scope.add(ring);
  solid(scope,m.wallDark,[.03,1.30,0],[.025,.52,.025]);const chest=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.02,16),m.stainless);chest.rotation.z=Math.PI/2;chest.position.set(.05,1.02,0);scope.add(chest);

  const coat=make('white_coat','white_coat',[x-4.40,0,z-3.00]);
  solid(coat,m.bedSheet,[.04,1.48,0],[.08,.96,.62]);solid(coat,m.bedSheet,[.04,1.43,-.39],[.08,.62,.16]);solid(coat,m.bedSheet,[.04,1.43,.39],[.08,.62,.16]);solid(coat,m.metal,[.04,2.05,0],[.06,.08,.50]);

  const hasHandoverBoard=(zone.campus==='first'&&zone.floor===4)||(zone.campus==='second'&&zone.floor===5);
  if(!hasHandoverBoard){
  const sharps=make('sharps_container','sharps_container',[x-2.80,0,z-4.10]);solid(sharps,m.wallBumper,[0,1.42,0],[.48,.54,.24]);solid(sharps,m.wallDark,[0,1.70,0],[.40,.035,.18]);
  }
  const supplies=make('supply_boxes','supply_boxes',[x-4.22,0,z+2.60]);for(let i=0;i<3;i++)solid(supplies,i===0?m.bedSheet:(i===1?m.wallBumper:m.stainless),[.05,.52+i*.27,0],[.28,.22,.62]);

  return zone.clinicalProps.filter(p=>p.id.startsWith(id+'_')).map(p=>p.id);
}

/** Identical protected staff-station module used by legacy wards. Front faces local -Z. */
export function nursingStation(zone,{x,z,yaw=0,id,rearEntry=false}) {
  const sub={gf:zone.gf,zoneGroup:new THREE.Group(),colliders:[],walkables:[],interactables:[],workstations:[]};
  sub.zoneGroup.name='NursingStation_STANDARD_6x6';sub.zoneGroup.position.set(x,0,z);sub.zoneGroup.rotation.y=yaw;zone.zoneGroup.add(sub.zoneGroup);
  const m=zone.gf.materials;
  solid(sub.zoneGroup,m.wallDark,[-.7,.53,0],[4.5,1.06,.6]);solid(sub.zoneGroup,m.counterTop,[-.7,1.1,0],[4.6,.08,.72]);
  CollisionFactory.addBox(sub.colliders,-.7,1.5,0,4.6,3,.72);
  const glass=m.glass.clone();glass.side=THREE.DoubleSide;glass.transparent=true;glass.opacity=.23;glass.depthWrite=false;
  solid(sub.zoneGroup,glass,[-.7,1.95,0],[4.5,1.6,.035]);
  for(const sx of [-3,1.6,3])solid(sub.zoneGroup,m.doorWood,[sx,1.55,0],[.10,3.1,.14]);
  solid(sub.zoneGroup,m.doorWood,[0,2.92,0],[6.1,.36,.25]);
  zone.gf.buildWall(sub.zoneGroup,sub.colliders,-3,1.6,3,.2,3.2,6);
  zone.gf.buildWall(sub.zoneGroup,sub.colliders,3,1.6,3,.2,3.2,6);
  if(!rearEntry)zone.gf.buildWall(sub.zoneGroup,sub.colliders,0,1.6,6,6.2,3.2,.2);
  workstation(sub,{x:-1.8,z:3.8,yaw:0,id:id+'_A'});workstation(sub,{x:1.8,z:3.8,yaw:0,id:id+'_B'});
  asset(sub.zoneGroup,'storageCabinet',[-1.7,0,5.6],[1,1,1],Math.PI);asset(sub.zoneGroup,'printer',[1.8,.8,3.8],[.7,.7,.7]);
  SignAnchor.buildWallPlaque({scene:sub.zoneGroup,x:0,y:2.88,z:-.15,rotationY:Math.PI,width:1.5,height:.3,code:'',title:'護理站',subtitle:'',header:''});
  sub.zoneGroup.updateWorldMatrix(true,true);
  const matrix=sub.zoneGroup.matrixWorld;
  for(const c of sub.colliders)zone.colliders.push(c.applyMatrix4(matrix));
  for(const item of sub.workstations){const chair=new THREE.Vector3(...item.chair).applyMatrix4(matrix);zone.workstations.push({...item,chair:chair.toArray(),yaw:item.yaw+yaw});}
  const p=new THREE.Vector3(2.3,0,0).applyMatrix4(matrix);
  new AccessDoor(zone,{id:id+'_staff',x:p.x,z:p.z,yaw,width:1.3,title:'護理站工作門',material:m.metal,readerSide:-1});
  zone.station={id,module:'NursingStation_STANDARD_6x6',position:[x,z],yaw};
}

/** V5.2 nursing station: all four sides use a solid lower wall and reinforced upper glass.
 * The south inner iron gate enters the station; the north iron access door opens to the ward and faces x06.
 */
export function nursingStationV5(zone,{x,z=-4.3,id}){
  const m=zone.gf.materials,halfW=4.6,south=0,north=-8.6,west=x-halfW,east=x+halfW,wardExitX=x+4.0;
  const referenceStation=(zone.campus==='first'&&zone.floor===4)||(zone.campus==='second'&&zone.floor===5);
  const lowerH=1.08,glassH=1.72,glassY=lowerH+glassH/2,thickness=.16;
  const glass=m.glass.clone();glass.side=THREE.DoubleSide;glass.transparent=true;glass.opacity=.24;glass.depthWrite=false;

  const glazedSegment=(axis,at,a,b)=>{
    if(b-a<.05)return;
    const alongX=axis==='x',cx=alongX?(a+b)/2:at,cz=alongX?at:(a+b)/2;
    const sx=alongX?b-a:thickness,sz=alongX?thickness:b-a;
    solid(zone.zoneGroup,m.wall,[cx,lowerH/2,cz],[sx,lowerH,sz]);
    solid(zone.zoneGroup,glass,[cx,glassY,cz],[alongX?sx:sx*.22+.025,glassH,alongX?sz*.22+.025:sz]);
    solid(zone.zoneGroup,m.metal,[cx,lowerH+.02,cz],[sx+.02,.06,sz+.02]);
    solid(zone.zoneGroup,m.metal,[cx,lowerH+glassH+.05,cz],[sx+.02,.10,sz+.02]);
    CollisionFactory.addBox(zone.colliders,cx,1.42,cz,sx,2.84,sz);
  };

  // South face: leave the 2.4 m inner iron-gate aperture at centre.
  glazedSegment('x',south,west,x-1.2);
  glazedSegment('x',south,x+1.2,east);

  // North face: leave a 1.4 m iron-door aperture aimed at room x06.
  glazedSegment('x',north,west,wardExitX-.7);
  glazedSegment('x',north,wardExitX+.7,east);

  // West/east faces are continuously glazed above a lower protective wall.
  glazedSegment('z',west,north,south);
  glazedSegment('z',east,north,south);

  workstation(zone,{x:x-3.35,z:z+1.95,yaw:0,id:id+'_A'});
  workstation(zone,{x:x-1.35,z:z+1.95,yaw:0,id:id+'_B'});
  workstation(zone,{x:x-3.35,z:z-1.85,yaw:Math.PI,id:id+'_C'});
  workstation(zone,{x:x-1.35,z:z-1.85,yaw:Math.PI,id:id+'_D'});
  if(referenceStation){
    const boardBlockingChair=zone.workstations.find(item=>item.id===id+'_C')?.chairObject;
    boardBlockingChair?.removeFromParent();
  }
  const printerDesk=referenceStation?zone.workstations.find(w=>w.id===id+'_D'):null;
  const printer=printerDesk?.desk
    ?asset(zone.zoneGroup,'printer',[printerDesk.desk.position.x+.61,0,printerDesk.desk.position.z],[.7,.7,.7],Math.PI)
    :asset(zone.zoneGroup,'printer',[x-1.35,.8,z+1.95],[.7,.7,.7]);
  if(printerDesk?.desk&&printer){
    printerDesk.desk.updateWorldMatrix(true,true);printer.updateWorldMatrix(true,true);
    const deskTop=new THREE.Box3().setFromObject(printerDesk.desk).max.y;
    printer.position.y+=deskTop-new THREE.Box3().setFromObject(printer).min.y;
  }
  const clinicalPropIds=buildNursingStationClinicalProps(zone,{x,z,id});

  if(referenceStation){
    const board=new THREE.Group();board.name=zone.campus==='first'?'FourF_NursingHandoverBoard':'SecondFiveF_NursingHandoverBoard';
    board.position.set(x-2.0,1.78,north+.105);zone.zoneGroup.add(board);
    solid(board,m.wallBumper,[0,0,0],[2.72,1.12,.055],.018);
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=480;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#f1efe6';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#345343';ctx.fillRect(0,0,canvas.width,82);
    ctx.fillStyle='#f5f3eb';ctx.font='bold 42px sans-serif';ctx.textBaseline='middle';
    ctx.fillText(zone.campus==='first'?'4F 今日值班':'5F 今日值班',42,42);
    ctx.fillStyle='#233b30';ctx.font='bold 34px sans-serif';
    const rows=zone.campus==='first'?[
      '第一線：李住院醫師　｜　總醫師：316 室',
      '病房現況：滿床 32 床　｜　408C：防跌倒、易躁動',
      '特別交班：409 封閉整修，禁止推床入內'
    ]:[
      '會診醫師：李住院醫師　｜　值班護理站：5F',
      '病人：陳怡君　｜　床位：504B',
      '主訴：胸悶、心悸　｜　先完成床邊評估'
    ];
    rows.forEach((text,index)=>{
      const y=160+index*96;
      if(index===1){ctx.fillStyle='#e4e9df';ctx.fillRect(22,y-39,980,72);}
      ctx.fillStyle=index===2?'#754d39':'#28332d';ctx.fillText(worldNarrative(text),42,y,940);
      ctx.strokeStyle='#bdc2b5';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(32,y+44);ctx.lineTo(992,y+44);ctx.stroke();
    });
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(2.66,1.06),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
    face.name='FourF_NursingHandoverBoard_Face';face.position.z=.031;board.add(face);
    for(const [sx,sy] of [[-1.29,-.50],[1.29,-.50],[-1.29,.50],[1.29,.50]]){
      const screw=new THREE.Mesh(new THREE.SphereGeometry(.018,12,8),m.stainless);
      screw.position.set(sx,sy,.039);board.add(screw);
    }
    board.userData.text=rows;

    const deskSet=new THREE.Group();deskSet.name='FourF_StationDesktopSet';
    const stationDesk=zone.workstations.find(w=>w.id===id+'_A')?.desk;
    const deskSurfaceY=stationDesk?new THREE.Box3().setFromObject(stationDesk).max.y:.76;
    deskSet.position.set(x-3.35,deskSurfaceY,z+1.95);zone.zoneGroup.add(deskSet);
    const binder=(name,color,px)=>{
      const cover=new THREE.Mesh(new THREE.BoxGeometry(.23,.035,.30),new THREE.MeshStandardMaterial({color,roughness:.9}));
      cover.name=name;cover.position.set(px,.0175,-.23);deskSet.add(cover);
      const label=new THREE.Mesh(new THREE.PlaneGeometry(.16,.12),new THREE.MeshStandardMaterial({color:0xe5e0d0,roughness:.9}));
      label.position.set(px,.032,-.23);label.rotation.x=-Math.PI/2;deskSet.add(label);
    };
    binder('FourF_StationGreenHandoverBinder',0x526b59,-.36);
    binder('FourF_StationBlueHandoverBinder',0x536573,-.08);
    const tissue=new THREE.Mesh(new THREE.BoxGeometry(.19,.105,.17),new THREE.MeshStandardMaterial({color:0xe7e5dc,roughness:.94}));
    tissue.name='FourF_StationTissueBox';tissue.position.set(.34,.0525,-.20);deskSet.add(tissue);
    const cup=new THREE.Mesh(new THREE.CylinderGeometry(.042,.037,.105,20),new THREE.MeshStandardMaterial({color:0xd7d2c2,roughness:.88}));
    cup.name='FourF_StationColdCoffee';cup.position.set(.47,.0525,.18);deskSet.add(cup);
    const coffee=new THREE.Mesh(new THREE.CircleGeometry(.032,20),new THREE.MeshBasicMaterial({color:0x37271d}));
    coffee.rotation.x=-Math.PI/2;coffee.position.set(.47,.106,.18);deskSet.add(coffee);
    for(let i=0;i<3;i++){
      const pen=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.20,8),new THREE.MeshStandardMaterial({color:[0x30455b,0x35533e,0x7b4e3b][i],roughness:.7}));
      pen.name=`FourF_StationPen_${i+1}`;pen.position.set(.56,.005+i*.002,.23+i*.025);pen.rotation.z=Math.PI/2;deskSet.add(pen);
    }
  }
  zone.gf.buildCeilingLight(zone.zoneGroup,x,3.15,z,.8,8);

  SignAnchor.buildWallPlaque({scene:zone.zoneGroup,x:x-2.0,y:2.64,z:north+.10,rotationY:0,width:1.7,height:.32,code:'',title:'護理站',subtitle:'',header:''});

  // Station -> ward activity hall uses a normally-closed metal access door.
  new AccessDoor(zone,{id:id+'_ward',x:wardExitX,z:north,width:1.4,title:'護理站病房感應鐵門',material:m.metal,readerSide:-1});

  zone.station={
    id,module:'NursingStation_V5_2_GLASS_BOX',position:[x,z],
    bounds:[west,north,east,south],entryDoor:[x,south],wardDoor:[wardExitX,north],
    facesRoom:String(zone.floor*100+6),glazedSides:['south','north','west','east'],
    lowerWallHeight:lowerH,upperGlassHeight:glassH,wardDoorMaterial:'metal',
    wardDoorReaderSide:-1,workstationCount:4,clinicalPropIds
  };
  return zone.station;
}
