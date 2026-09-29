import * as THREE from 'three';
import { getEraPoster } from './PosterRegistry.js';
import { getEraPosterPlacements } from './PosterPlacements.js';

const loader=typeof Image!=='undefined' ? new THREE.TextureLoader() : null;
const textureCache=new Map();

function textureUrl(path){
  const base=import.meta.env?.BASE_URL ?? '/';
  return base + path.replace(/^\//,'');
}

function getTexture(path){
  if(!loader||!path)return null;
  if(textureCache.has(path))return textureCache.get(path);
  const texture=loader.load(textureUrl(path));
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.userData.sharedPosterTexture=true;
  textureCache.set(path,texture);
  return texture;
}

function addVariantMarks(group,variant,width,height){
  if(variant==='clean')return;
  const overlay=(color,opacity,x,y,w,h,rz=0)=>{
    const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
    mesh.position.set(x,y,.013);mesh.rotation.z=rz;group.add(mesh);
  };
  if(variant==='stained'){
    overlay(0x60452f,.12,width*.18,-height*.18,width*.20,height*.10,.18);
  }else if(variant==='redacted'){
    overlay(0x171915,.52,0,height*.10,width*.72,height*.045,-.018);
    overlay(0x171915,.34,-width*.06,-height*.16,width*.58,height*.038,.024);
  }else if(variant==='torn'){
    overlay(0x171a18,.20,width*.42,height*.36,width*.22,height*.14,-.24);
  }else if(variant==='burnt'){
    overlay(0x161714,.28,-width*.43,0,width*.12,height*.92,.04);
    overlay(0x1b1714,.25,width*.43,-height*.10,width*.11,height*.78,-.06);
    overlay(0x2b1f18,.18,0,-height*.45,width*.82,height*.09,.01);
  }
}

export function createEraPoster(zone,placement){
  const poster=getEraPoster(placement.posterId);
  if(!poster||!zone?.zoneGroup)return null;
  const width=placement.width||.78;
  const height=width*(1024/723);
  const group=new THREE.Group();
  group.name=`EraPoster/${placement.posterId}/${placement.variant||'clean'}`;
  group.position.set(placement.x,placement.y,placement.z);
  group.rotation.y=placement.rotationY||0;
  group.rotation.z=placement.rotationZ||0;

  const frameMat=new THREE.MeshStandardMaterial({color:0x493d2f,roughness:.9,metalness:0});
  const frame=new THREE.Mesh(new THREE.BoxGeometry(width+.065,height+.065,.032),frameMat);
  frame.position.z=-.018;frame.castShadow=false;frame.receiveShadow=false;group.add(frame);

  const baseMap=getTexture(poster.displayTexture);
  const faceMat=new THREE.MeshStandardMaterial({
    color:0xffffff,map:baseMap||null,roughness:.92,metalness:0,side:THREE.DoubleSide
  });
  const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),faceMat);
  face.name=`EraPosterFace/${placement.posterId}`;
  face.position.z=.002;
  const inspectable=placement.inspectable!==false && poster.inspectable!==false;
  face.userData={
    interactable:inspectable,
    id:`ERA_POSTER_${placement.posterId}_${zone.interactables?.length||0}`,
    type:'era_poster',
    label:`閱讀「${poster.shortTitle}」`,
    posterData:{...poster,variant:placement.variant||'clean'}
  };
  group.add(face);
  addVariantMarks(group,placement.variant||'clean',width,height);
  zone.zoneGroup.add(group);
  if(inspectable)zone.interactables.push(face);
  return group;
}

export function installEraPosters(zone,zoneId){
  const placements=getEraPosterPlacements(zoneId);
  const created=[];
  for(const placement of placements){
    const poster=createEraPoster(zone,placement);
    if(poster)created.push(poster);
  }
  zone.eraPosters=created;
  return created;
}
