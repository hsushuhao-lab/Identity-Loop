import * as THREE from 'three';
import { isIdentityRouteMode } from './IdentityPrivacy.js';
import { sharedAlbum } from './SharedMedia.js';
import { drawSharedPhoto, preloadSharedPhoto, MEDIA_FRAME_COLOR } from '../art/SharedMediaArt.js';
import { getMemorySequence } from './NarrativeV22.js';
import { drawCharacterStrip } from '../art/CharacterPortraitArt.js';
import {drawMemoryFragment,preloadArtPass2Image} from '../art/ArtPass2Assets.js';

const P=(memoryId,x,y,z,rotationY,width=.74)=>Object.freeze({memoryId,x,y,z,rotationY,width});
const PLACEMENTS=Object.freeze({
  first_campus_3f:Object.freeze([
    P('M1_ADMIN_DUTY_PHOTO',-21.84,1.55,8.55,Math.PI/2,.72),
    P('M1_ARCHIVE_6F_ALBUM',23.56,1.60,-2.30,-Math.PI/2,.48)
  ]),
  first_campus_4f:Object.freeze([P('M2_DUTYROOM_ALBUM',-13.84,1.55,8.65,Math.PI/2,.72)]),
  first_campus_2f:Object.freeze([P('M3_ER_PHOTO',15.78,1.55,-7.55,-Math.PI/2,.72)]),
  second_campus_2f:Object.freeze([P('M5_GUARD_REST_LOG',63.7,1.50,-10.28,0,.70)]),
  second_campus_5f:Object.freeze([P('M4_SECOND_DUTY_NOTE',85.74,1.52,8.65,-Math.PI/2,.72)]),
  phantom_6f:Object.freeze([P('M6_6F_PLAYBACK',3.83,1.55,-5.15,-Math.PI/2,.78)]),
  first_campus_1f:Object.freeze([P('M7_GUARD_0217',-13.70,1.58,2.65,Math.PI/2,.70)]),
  b2_archive:Object.freeze([P('B2_VICTIM_MAP',-4.82,1.55,-9.55,Math.PI/2,.82)])
});

function memoryArtIndex(sequence){
  const id=sequence?.id||sequence?.title||'memory';
  let hash=0;for(let i=0;i<id.length;i++)hash=(hash*31+id.charCodeAt(i))>>>0;
  return hash%6;
}

function drawFace(sequence){
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=600;
  const ctx=canvas.getContext('2d');const cctv=sequence.mode==='CCTV';
  if(isIdentityRouteMode()){
    const album=sharedAlbum(sequence.id);
    ctx.fillStyle='#1b211d';ctx.fillRect(0,0,900,600);
    drawSharedPhoto(ctx,album.frames[0].photo,24,24,852,500);
    ctx.fillStyle='#d3cebc';ctx.font='26px sans-serif';ctx.fillText(album.title,28,561);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
  }
  ctx.fillStyle=cctv?'#111612':'#c9ba98';ctx.fillRect(0,0,900,600);
  const header=ctx.createLinearGradient(0,0,900,90);
  header.addColorStop(0,cctv?'#07100b':'#544331');header.addColorStop(1,cctv?'#18251c':'#7d6748');
  ctx.fillStyle=header;ctx.fillRect(0,0,900,82);
  ctx.fillStyle=cctv?'#b9d7bf':'#f1e7d1';ctx.font='bold 30px sans-serif';ctx.fillText(cctv?'ARCHIVE PLAYBACK':'封存影像／記憶照片',34,51);
  ctx.fillStyle=cctv?'#7fa58a':'#4e4434';ctx.font='bold 31px sans-serif';
  const title=sequence.title.length>24?sequence.title.slice(0,24)+'…':sequence.title;ctx.fillText(title,34,133);
  ctx.font='21px ui-monospace,monospace';ctx.fillText(String(sequence.frames.length).padStart(2,'0')+' FRAMES',34,174);

  ctx.fillStyle=cctv?'#07100c':'#574a38';ctx.fillRect(68,205,764,326);
  const usedArt=drawMemoryFragment(ctx,memoryArtIndex(sequence),78,215,744,286);
  if(usedArt){
    const shade=ctx.createLinearGradient(0,215,0,501);
    shade.addColorStop(0,'rgba(4,9,8,.08)');
    shade.addColorStop(.62,'rgba(4,8,7,.13)');
    shade.addColorStop(1,'rgba(4,7,6,.72)');
    ctx.fillStyle=shade;ctx.fillRect(78,215,744,286);
  }else{
    const bg=ctx.createLinearGradient(78,215,822,501);
    bg.addColorStop(0,cctv?'#26362b':'#9d8965');bg.addColorStop(1,cctv?'#0b120d':'#65523b');
    ctx.fillStyle=bg;ctx.fillRect(78,215,744,286);
  }
  ctx.strokeStyle=cctv?'#78977e':'#5c4933';ctx.lineWidth=7;ctx.strokeRect(74,211,752,294);

  const previewPeople=[];
  for(const frame of sequence.frames||[])for(const person of frame.people||[]){
    if(!previewPeople.includes(person)&&person!=='Annie')previewPeople.push(person);
    if(previewPeople.length>=4)break;
  }
  if(previewPeople.length){
    ctx.save();ctx.globalAlpha=usedArt?.84:1;
    drawCharacterStrip(ctx,previewPeople,{left:125,right:775,baseY:445,cctv,labels:false,maxScale:.58});
    ctx.restore();
  }

  ctx.fillStyle=cctv?'rgba(4,11,7,.78)':'rgba(229,216,184,.92)';ctx.fillRect(78,503,744,48);
  ctx.fillStyle=cctv?'#bdd8c2':'#40362a';ctx.font='20px sans-serif';ctx.fillText('E｜檢視逐幀記憶與原始註記',278,534);
  if(cctv){ctx.globalAlpha=.16;ctx.fillStyle='#d9f1df';for(let y=215;y<500;y+=7)ctx.fillRect(78,y,744,1);ctx.globalAlpha=1;}
  else{ctx.globalAlpha=.10;ctx.fillStyle='#3b2d1f';for(let i=0;i<44;i++){const x=70+(i*101)%760,y=205+(i*59)%330;ctx.fillRect(x,y,2+(i%3),2+(i%4));}ctx.globalAlpha=1;}

  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export function createMemoryEvidence(zone,placement){
  const sequence=getMemorySequence(placement.memoryId);if(!sequence||!zone?.zoneGroup)return null;
  const width=placement.width||.74,height=width*2/3;
  const root=new THREE.Group();root.name='MemoryEvidence/'+placement.memoryId;
  root.position.set(placement.x,placement.y,placement.z);root.rotation.y=placement.rotationY||0;
  const frame=new THREE.Mesh(new THREE.BoxGeometry(width+.08,height+.08,.04),new THREE.MeshStandardMaterial({color:MEDIA_FRAME_COLOR,roughness:.9}));frame.position.z=-.018;root.add(frame);
  const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:drawFace(sequence),roughness:.88,side:THREE.DoubleSide}));
  face.position.z=.005;face.name='MemoryEvidenceFace/'+placement.memoryId;
  face.userData={interactable:true,id:'MEMORY_'+placement.memoryId,type:'memory_evidence',memoryId:placement.memoryId,label:'查看「'+(isIdentityRouteMode()?sharedAlbum(sequence.id).title:sequence.title)+'」'};
  root.add(face);zone.zoneGroup.add(root);zone.interactables.push(face);

  // Refine the wall photo once the lightweight generated memory atlas has decoded.
  // The atlas is visual-only; all names, timestamps and captions remain canonical data.
  const loading=isIdentityRouteMode()?preloadSharedPhoto(sharedAlbum(sequence.id).frames[0].photo):preloadArtPass2Image('memoryFragments');
  void loading.then(()=>{
    if(!face.parent)return;
    const previous=face.material.map;
    face.material.map=drawFace(sequence);
    face.material.needsUpdate=true;
    previous?.dispose?.();
  }).catch(error=>console.warn('[artpass2] memory photo refinement failed',placement.memoryId,error));
  return root;
}
export function installMemoryEvidence(zone,zoneId){
  const created=[];for(const placement of PLACEMENTS[zoneId]||[]){const item=createMemoryEvidence(zone,placement);if(item)created.push(item);}
  zone.memoryEvidence=created;return created;
}
