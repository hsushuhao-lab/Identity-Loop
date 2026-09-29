import * as THREE from 'three';
import { SHARED_PHOTOS } from '../story/SharedMedia.js';
import { preloadArtPass2Image, getArtPass2Image } from './ArtPass2Assets.js';

export const MEDIA_FRAME_COLOR=0x493d2f;
const sourceUrl=key=>(import.meta.env?.BASE_URL||'./')+SHARED_PHOTOS[key].path;
export const preloadSharedPhoto=key=>preloadArtPass2Image(sourceUrl(key));
export function preloadSharedSequence(sequence){
  return Promise.all([...new Set(sequence.frames.map(f=>f.photo))].map(preloadSharedPhoto));
}
export function photoRect(image,key){
  const cell=SHARED_PHOTOS[key].cell;
  if(cell===undefined)return [0,0,image.width,image.height];
  const w=image.width/4,h=image.height/2;
  return [(cell%4+.02)*w,(Math.floor(cell/4)+.02)*h,w*.96,h*.96];
}
export function containRect(sw,sh,x,y,w,h){
  const scale=Math.min(w/sw,h/sh),dw=sw*scale,dh=sh*scale;
  return [x+(w-dw)/2,y+(h-dh)/2,dw,dh];
}
export function drawSharedPhoto(ctx,key,x,y,w,h,{elapsedMs=0,cctv=false}={}){
  const image=getArtPass2Image(sourceUrl(key));
  if(!image)return false;
  const source=photoRect(image,key),dest=containRect(source[2],source[3],x,y,w,h);
  ctx.save();
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  // Very small breathing exposure, not a geometric stretch or fabricated figure.
  ctx.filter=`saturate(${cctv?.16:.64}) contrast(1.03) brightness(${.97+.025*Math.sin(elapsedMs/1600)})`;
  ctx.drawImage(image,...source,...dest);
  ctx.restore();
  return true;
}
export function renderSharedMemory(ui,sequence,elapsedMs=0){
  const frame=sequence.frames[ui.memoryFrameIndex];
  if(!frame||!ui.memoryFrameCanvas)return;
  const canvas=ui.memoryFrameCanvas,ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const cctv=sequence.mode==='CCTV';
  ctx.fillStyle='#151b18';ctx.fillRect(0,0,w,h);
  const loaded=drawSharedPhoto(ctx,frame.photo,22,22,w-44,h-64,{elapsedMs,cctv});
  canvas.dataset.mediaStyle='photographic';canvas.dataset.mediaPhoto=frame.photo;
  canvas.dataset.mediaLoaded=String(loaded);
  if(!loaded){ctx.fillStyle='#c8c7b8';ctx.font='24px sans-serif';ctx.fillText('影像載入中',36,60);}
  if(cctv){
    ctx.fillStyle='rgba(17,26,23,.07)';for(let y=24;y<h-44;y+=6)ctx.fillRect(22,y,w-44,1);
  }
  ctx.strokeStyle='#746c59';ctx.lineWidth=2;ctx.strokeRect(12,12,w-24,h-24);
  ctx.fillStyle='#bec4b8';ctx.font='19px ui-monospace,monospace';
  ctx.fillText(`${cctv?'PLAYBACK':'ARCHIVE'} / ${String(ui.memoryFrameIndex+1).padStart(2,'0')}`,28,h-23);
  for(const [id,text] of [['memory-stamp',frame.stamp],['memory-frame-title',frame.title],['memory-caption',frame.caption],['memory-narration',frame.narration]]){
    document.getElementById(id).textContent=text||'';
  }
  document.getElementById('memory-indicator').textContent=`${ui.memoryFrameIndex+1} / ${sequence.frames.length}`;
  document.getElementById('btn-memory-prev').textContent=cctv?'A / 上一幀':'A / 上一頁';
  document.getElementById('btn-memory-next').textContent=cctv?'下一幀 / D':'下一頁 / D';
  document.getElementById('btn-memory-prev').disabled=ui.memoryFrameIndex===0;
  document.getElementById('btn-memory-next').disabled=ui.memoryFrameIndex===sequence.frames.length-1;
  if(loaded)ui.memoryVisited?.add(ui.memoryFrameIndex);
  if(ui.memoryVisited?.size===sequence.frames.length&&!ui.memoryReadCompleted){
    ui.memoryReadCompleted=true;ui.memoryReadHandler?.();
  }
}

export function applyAlbumCover(book){
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=600;
  const ctx=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(.42,.28),new THREE.MeshStandardMaterial({map:texture,roughness:.92}));
  face.name='GuardAlbum_PhotographicCover';face.rotation.x=-Math.PI/2;face.position.y=.026;
  book.add(face);
  const paint=()=>{ctx.fillStyle='#302d25';ctx.fillRect(0,0,900,600);drawSharedPhoto(ctx,'group',28,28,844,478);ctx.fillStyle='#d3cebc';ctx.font='36px sans-serif';ctx.fillText('院內留影',32,558);texture.needsUpdate=true;};
  paint();void preloadSharedPhoto('group').then(()=>{if(face.parent)paint();});
}

export async function buildSharedGalleryTexture(){
  const keys=['group','station','archive','skills','reflection'];
  await Promise.all(keys.map(preloadSharedPhoto));
  const canvas=document.createElement('canvas');canvas.width=1540;canvas.height=696;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#272b23';ctx.fillRect(0,0,1540,696);
  ctx.fillStyle='#d3cebc';ctx.font='32px sans-serif';ctx.fillText('院史影像留存',34,48);
  keys.forEach((key,i)=>{const x=28+i*304;drawSharedPhoto(ctx,key,x,80,282,550);});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
