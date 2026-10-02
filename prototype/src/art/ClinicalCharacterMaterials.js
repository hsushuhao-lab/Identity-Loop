import * as THREE from 'three';

export function clinicalCharacterMaterials(){
  const grain=new Uint8Array(128*128*4);
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
    const noise=((x*73+y*31+x*y*3)%17)-8;
    const weave=(x%4===0?3:0)+(y%4===0?-3:0),v=232+noise*.55+weave;
    grain.set([v,v,v,255],(y*128+x)*4);
  }
  const weave=new THREE.DataTexture(grain,128,128);weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(5,6);weave.needsUpdate=true;
  const cloth=new THREE.MeshStandardMaterial({name:'Attendant/TailoredCotton',color:0x728078,map:weave,bumpMap:weave,bumpScale:.0017,roughness:.92});
  const trousers=cloth.clone();trousers.name='Attendant/CottonTrousers';trousers.color.set(0x5c6d65);
  const materials={cloth,trousers,
    skin:new THREE.MeshStandardMaterial({name:'Attendant/Skin',color:0xd0b09a,vertexColors:true,roughness:.74}),
    hair:new THREE.MeshStandardMaterial({name:'Attendant/CroppedHair',color:0x33342e,vertexColors:true,roughness:.94}),
    mask:new THREE.MeshStandardMaterial({name:'Attendant/PleatedMask',color:0xe1e3d5,map:weave,bumpMap:weave,bumpScale:.0007,roughness:.98,side:THREE.DoubleSide}),
    shoe:new THREE.MeshStandardMaterial({name:'Attendant/WorkShoe',color:0x353f39,roughness:.78}),
    sole:new THREE.MeshStandardMaterial({name:'Attendant/RubberSole',color:0x202b24,roughness:.98}),
    seam:new THREE.MeshStandardMaterial({name:'Attendant/Seams',color:0x58675f,roughness:.95}),
    detail:new THREE.MeshStandardMaterial({name:'Attendant/FaceDetail',color:0xffffff,vertexColors:true,roughness:.72,side:THREE.DoubleSide})};
  return materials;
}

export function footContactTexture(){
  const bytes=new Uint8Array(32*32*4);
  for(let y=0;y<32;y++)for(let x=0;x<32;x++){
    const radius=Math.hypot((x-15.5)/15.5,(y-15.5)/15.5),alpha=Math.max(0,1-radius);
    bytes.set([12,20,15,Math.round(alpha*alpha*116)],(y*32+x)*4);
  }
  const texture=new THREE.DataTexture(bytes,32,32);texture.needsUpdate=true;return texture;
}
