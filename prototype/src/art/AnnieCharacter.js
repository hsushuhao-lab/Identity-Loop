import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ANNIE_CHARACTER_STATES = Object.freeze({ STORAGE_STATIC:'STORAGE_STATIC', BRIDGE_MANIFEST:'BRIDGE_MANIFEST', FLOOR6_CPR:'FLOOR6_CPR' });
export const ANNIE_CHARACTER_BUDGET = Object.freeze({ maxDraws:24, maxTriangles:28000, maxGeometryBytes:1048576, textureBytesRGBA:196608, newLights:0 });
const TAU=Math.PI*2, vec=a=>new THREE.Vector3(...a);
const gauss=(x,y,cx,cy,sx,sy)=>Math.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2));

/** Authored anatomical surface; nose, sockets, cheeks, chin belong to the head mesh. */
function faceDepth(x,y) {
  const s=Math.max(0,1-(x/.094)**2-(y/.127)**2);
  return .083*Math.sqrt(s)
    +.009*gauss(x,y,0,-.075,.058,.033)
    +.018*gauss(x,y,0,-.010,.014,.049)
    +.012*gauss(x,y,0,-.035,.022,.014)
    -.010*(gauss(x,y,-.035,.024,.020,.016)+gauss(x,y,.035,.024,.020,.016))
    +.007*(gauss(x,y,-.050,-.015,.023,.022)+gauss(x,y,.050,-.015,.023,.022))
    +.004*gauss(x,y,0,-.064,.030,.010);
}

function surface(uCount,vCount,sample) {
  const p=[],uv=[],colors=[],index=[];
  for(let j=0;j<=vCount;j++)for(let i=0;i<=uCount;i++){
    const u=i/uCount,v=j/vCount,s=sample(u,v);p.push(...s.position);uv.push(u,v);colors.push(...(s.color||[1,1,1]));
  }
  for(let j=0;j<vCount;j++)for(let i=0;i<uCount;i++){
    const a=j*(uCount+1)+i,b=a+uCount+1;index.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(index);g.computeVertexNormals();return g;
}

function headGeometry() {
  return surface(64,48,(u,v)=>{
    const a=u*TAU,y=Math.cos(v*Math.PI)*.127,r=Math.sin(v*Math.PI);
    const jaw=1-.16*Math.max(0,-y/.127),x=Math.sin(a)*.094*r*jaw;
    const front=Math.cos(a),z=front>0?faceDepth(x,y):.082*front*r;
    const tint=1-.035*(gauss(x,y,-.049,-.026,.025,.025)+gauss(x,y,.049,-.026,.025,.025));
    return {position:[x,y,z],color:[tint,tint*.988,tint*.974]};
  });
}

function ellipsoid(position,scale,segments=16,rings=10) {
  return surface(segments,rings,(u,v)=>({position:[position[0]+Math.sin(u*TAU)*Math.sin(v*Math.PI)*scale[0],position[1]+Math.cos(v*Math.PI)*scale[1],position[2]+Math.cos(u*TAU)*Math.sin(v*Math.PI)*scale[2]]}));
}

/** Continuous ring lofts make cloth cover the elbows/knees instead of ball joints. */
function loft(points,radii,{segments=24,rings=18,fold=.003,open=0}={}) {
  const curve=new THREE.CatmullRomCurve3(points.map(vec));
  return surface(segments,rings,(u,v)=>{
    const center=curve.getPoint(v),t=curve.getTangent(v).normalize();
    let xAxis=new THREE.Vector3(1,0,0).addScaledVector(t,-t.x);
    if(xAxis.lengthSq()<.01)xAxis=new THREE.Vector3(0,0,1).addScaledVector(t,-t.z);
    xAxis.normalize();const yAxis=new THREE.Vector3().crossVectors(t,xAxis).normalize();
    const k=v*(radii.length-1),i=Math.min(radii.length-2,Math.floor(k)),f=k-i;
    const rx=THREE.MathUtils.lerp(radii[i][0],radii[i+1][0],f),rz=THREE.MathUtils.lerp(radii[i][1],radii[i+1][1],f);
    const a=(open&&t.y>0?Math.PI:0)+open+u*(TAU-open*2),wrinkle=fold*Math.sin(v*Math.PI)*Math.cos(a*7+v*27);
    center.addScaledVector(xAxis,(rx+wrinkle)*Math.sin(a)).addScaledVector(yAxis,(rz+wrinkle*.45)*Math.cos(a));
    return {position:center.toArray(),color:[1-.016*Math.cos(v*36+a*5),1,1]};
  });
}

function ribbon(points,width) {
  const curve=new THREE.CatmullRomCurve3(points.map(vec));
  return surface(2,18,(u,v)=>{const p=curve.getPoint(v),t=curve.getTangent(v);const across=new THREE.Vector3(-t.y,t.x,0);if(across.lengthSq()<.0001)across.set(1,0,0);across.normalize();p.addScaledVector(across,(u-.5)*width*Math.sin(Math.PI*(v*.92+.04)));return {position:p.toArray()};});
}

function patch(points) {
  const g=new THREE.BufferGeometry();
  const p=[],uv=[],c=[];for(const index of [0,1,2,0,2,3]){p.push(...points[index]);uv.push(index===1||index===2?1:0,index>=2?0:1);c.push(1,1,1);}
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(c,3));g.computeVertexNormals();return g;
}

function originalTexture(kind,size) {
  const data=new Uint8Array(size*size*4);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const index=(y*size+x)*4,n=((Math.imul(x+19,73856093)^Math.imul(y+37,19349663))>>>0)%19;
    let value=kind==='cloth'?241+n*.45-(y%4===0?8:0):246+n*.22;
    if(kind==='shadow'){const r=((x-size/2)/(size*.48))**2+((y-size/2)/(size*.48))**2;value=0;data[index+3]=Math.round(90*Math.max(0,1-r)**2);}
    else data[index+3]=255;
    data[index]=data[index+1]=data[index+2]=value;
  }
  const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.needsUpdate=true;
  texture.name='AnnieCharacter/original-'+kind;texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;
  if(kind==='cloth')texture.repeat.set(5,9);
  return texture;
}

class Parts {
  constructor(root,owned){this.root=root;this.owned=owned;this.buckets=new Map();}
  add(material,geometry){if(!this.buckets.has(material))this.buckets.set(material,[]);this.buckets.get(material).push(geometry);}
  finish(){for(const [material,list]of this.buckets){
    for(const g of list)if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));
    const geometry=mergeGeometries(list,false);geometry.computeBoundingSphere();geometry.userData.sharedAsset=true;this.owned.geometries.add(geometry);
    const mesh=new THREE.Mesh(geometry,material);mesh.name='AnnieCharacter_'+material.name;mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);
    for(const g of list)g.dispose();
  }}
}

function hairGeometry() {
  return surface(48,24,(u,v)=>{
    const a=u*TAU,front=Math.cos(a),end=front>.35?1.05+Math.sin(a)*.15:2.30;
    const phi=v*end,r=Math.sin(phi),y=Math.cos(phi)*.133+.009;
    const striation=.0015*Math.sin(a*52+v*9);
    return {position:[Math.sin(a)*(.105+striation)*r,y,Math.cos(a)*(.092+striation)*r-.009],color:[.88+Math.sin(a*33)*.07,.91+Math.sin(a*33)*.07,.95+Math.sin(a*33)*.07]};
  });
}

function buildFace(parent,m,owned) {
  const skin=new Parts(parent,owned),hair=new Parts(parent,owned),features=new Parts(parent,owned),eyes=new Parts(parent,owned);
  skin.add(m.skin,headGeometry());
  for(const side of [-1,1]){
    skin.add(m.skin,ellipsoid([side*.091,-.007,-.010],[.014,.033,.018]));
    const cx=side*.034,cy=.021;
    eyes.add(m.eye,surface(20,8,(u,v)=>{const x=cx+(u-.5)*.031,y=cy+Math.sin(u*Math.PI)*(v-.5)*.010;return {position:[x,y,faceDepth(x,y)+.001]};}));
    eyes.add(m.iris,ellipsoid([cx,cy,faceDepth(cx,cy)+.0015],[.0048,.0048,.0014],12,8));
    features.add(m.detail,ribbon([[cx-.015,cy,faceDepth(cx-.015,cy)+.0018],[cx,cy+.005,faceDepth(cx,cy+.005)+.002],[cx+.015,cy,faceDepth(cx+.015,cy)+.0018]],.0018));
    hair.add(m.hair,ribbon([[cx-.017,.044,faceDepth(cx-.017,.044)+.002],[cx,.049,faceDepth(cx,.049)+.002],[cx+.018,.045,faceDepth(cx+.018,.045)+.002]],.004));
    features.add(m.detail,ellipsoid([side*.010,-.043,faceDepth(side*.010,-.043)+.001],[.004,.0018,.001],12,6));
  }
  // Quiet neutral mouth; no grin, exaggerated teeth, living-person eye blink or blush.
  features.add(m.lip,ribbon([[-.025,-.061,faceDepth(-.025,-.061)+.001],[0,-.064,faceDepth(0,-.064)+.002],[.025,-.061,faceDepth(.025,-.061)+.001]],.008));
  features.add(m.detail,ribbon([[-.024,-.062,faceDepth(-.024,-.062)+.002],[0,-.063,faceDepth(0,-.063)+.003],[.024,-.062,faceDepth(.024,-.062)+.002]],.0015));
  hair.add(m.hair,hairGeometry());
  for(let i=0;i<9;i++){
    const offset=i*.007;
    hair.add(m.hair,ribbon([[-.042+offset,.126,.027],[-.016+offset,.100,.082],[.028+offset*.6,.061,.082],[.075+offset*.17,.038,.054]],.005));
  }
  skin.finish();hair.finish();features.finish();eyes.finish();
}

function hand(parent,name,side,position,m,owned,{stack=false}={}) {
  const root=new THREE.Group();root.name=name;root.position.set(...position);root.rotation.z=stack?side*.04:side*-.12;parent.add(root);
  const parts=new Parts(root,owned);
  parts.add(m.skin,loft([[0,0,-.035],[0,0,.003],[0,-.003,.041]],[[.021,.014],[.038,.018],[.032,.015]],{segments:18,rings:10,fold:0}));
  for(let i=0;i<4;i++){
    const x=(i-1.5)*.018,length=[.058,.074,.069,.050][i];
    parts.add(m.skin,loft([[x,-.002,.030],[x,-.004,.061],[x,-.014,.038+length],[x,-.012,.042+length]],[[.009,.009],[.0085,.008],[.0065,.0065],[.001,.001]],{segments:10,rings:9,fold:0}));
    parts.add(m.nail,ellipsoid([x,-.010,.025+length],[.005,.001,.009],10,6));
  }
  parts.add(m.skin,loft([[side*.032,0,-.003],[side*.051,-.003,.025],[side*.056,-.015,.056]],[[.012,.010],[.009,.008],[.001,.001]],{segments:12,rings:10,fold:0}));
  parts.finish();return root;
}

/** Standalone adult trainer asset. State/metadata/name contract matches the legacy art. */
export function createAnnieCharacter(parent,{state='STORAGE_STATIC',position=[0,0,0],rotationY=0,materials,cuffColor=null,contactShadow=true,posture='seated'}={}) {
  if(!Object.values(ANNIE_CHARACTER_STATES).includes(state))throw new Error('Unsupported Annie state: '+state);
  const owned={geometries:new Set(),materials:new Set(),textures:new Set(),disposed:false};
  const root=new THREE.Group();root.name='Annie_'+state;root.position.set(...position);root.rotation.y=rotationY;
  root.userData={characterId:'ANNIE_CPR_TRAINING_MANNEQUIN',state,pose:state,modelHeight:1.65,materialIntent:'matte anatomical synthetic trainer, clothed joints',clothingOwner:'張守恆',aggressor:false,assetVersion:'ANNIE_CHARACTER_V1'};
  const cloth=originalTexture('cloth',128),grain=originalTexture('skin',128),shadow=originalTexture('shadow',128);
  [cloth,grain,shadow].forEach(t=>{t.userData.sharedAsset=true;owned.textures.add(t);});
  const mat=(name,parameters)=>{const material=new THREE.MeshStandardMaterial({name,vertexColors:true,...parameters});material.userData={sharedAsset:true,annieCharacterOwned:true};owned.materials.add(material);return material;};
  const m={skin:mat('Annie_Mat_Skin',{color:0xbdb7a7,map:grain,roughness:.87}),coat:mat('Annie_Mat_Coat',{color:0xd9ddd1,map:cloth,roughness:.96,side:THREE.DoubleSide}),
    scrubs:mat('Annie_Mat_Scrubs',{color:0x697e78,map:cloth,roughness:.98}),edge:mat('Annie_Mat_CoatEdge',{color:0xc7cfc2,map:cloth,roughness:.94,side:THREE.DoubleSide}),
    hair:mat('Annie_Mat_Hair',{color:0x282621,roughness:.93,side:THREE.DoubleSide}),detail:mat('Annie_Mat_Features',{color:0x544f43,roughness:.94,side:THREE.DoubleSide}),
    lip:mat('Annie_Mat_Mouth',{color:0x9a9282,roughness:.92,side:THREE.DoubleSide}),eye:mat('Annie_Mat_Eye',{color:0x9a9d8c,roughness:.77,side:THREE.DoubleSide}),
    iris:mat('Annie_Mat_Iris',{color:0x353c32,roughness:.86}),nail:mat('Annie_Mat_Nail',{color:0xb7b0a0,roughness:.75}),
    shoe:mat('Annie_Mat_Shoe',{color:0x393d38,roughness:.88}),metal:mat('Annie_Mat_StoolFrame',{color:0x919e94,roughness:.58,metalness:.45})};
  const seated=state==='STORAGE_STATIC'&&posture!=='standing',cpr=state==='FLOOR6_CPR',resting=state==='STORAGE_STATIC'&&!seated;
  const hip=seated?.54:cpr?.49:.82,shoulder=seated?1.095:cpr?1.105:1.35,headY=seated?1.27:cpr?1.28:1.51;
  const upper=new THREE.Group();upper.name='Annie_Rig_UpperBody';upper.position.y=hip;root.add(upper);
  const torso=new Parts(upper,owned),lower=new Parts(root,owned);
  const lean=cpr?.28:seated?.035:0;
  const localShoulder=shoulder-hip;
  const bodyPoints=[[0,-.03,0],[0,.14,.012],[0,localShoulder-.20,lean*.60],[0,localShoulder-.04,lean],[0,localShoulder+.015,lean]];
  torso.add(m.coat,loft(bodyPoints,[[.174,.102],[.168,.114],[.204,.116],[.226,.099],[.135,.087]],{segments:32,rings:22,open:.25,fold:.0025}));
  const shirt=loft([[0,.18,.005],[0,localShoulder-.05,lean],[0,localShoulder+.020,lean]],[[.155,.105],[.190,.095],[.07,.057]],{segments:24,rings:14,fold:.002});
  const shirtPosition=shirt.attributes.position;
  for(let i=0;i<shirtPosition.count;i++){
    const x=shirtPosition.getX(i),y=shirtPosition.getY(i),z=shirtPosition.getZ(i);
    if(y>localShoulder-.08&&z>lean)shirtPosition.setY(i,y-.08*Math.max(0,1-Math.abs(x)/.09)*THREE.MathUtils.clamp((y-localShoulder+.08)/.10,0,1));
  }
  shirt.computeVertexNormals();torso.add(m.scrubs,shirt);
  torso.add(m.skin,loft([[0,localShoulder-.010,lean],[0,headY-hip-.105,lean+.004]],[[.046,.042],[.039,.035]],{segments:20,rings:6,fold:0}));
  for(const side of [-1,1]){
    // Flat folded lapels rather than capsule-shaped tubes.
    const z=lean+.101;
    torso.add(m.edge,patch([[side*.075,localShoulder+.006,z],[side*.142,localShoulder-.10,z+.015],[side*.040,localShoulder-.29,z+.022],[side*.024,localShoulder-.08,z+.015]]));
    const py=localShoulder-.34,pz=lean*.5+.12;
    torso.add(m.edge,patch([[side*.067,py+.015,pz],[side*.153,py+.013,pz-.01],[side*.143,py-.091,pz-.005],[side*.066,py-.087,pz+.008]]));
    const elbow=seated?[side*.24,.265,.115]:cpr?[side*.12,localShoulder-.02,.56]:resting?[side*.235,.19,.015]:[side*.24,localShoulder-.20,.10];
    const wrist=seated?[side*.12,.060,.245]:cpr?[side*.010,.975-hip,.82]:resting?[side*.205,-.02,.015]:[side*.010,1.135-hip,.365];
    torso.add(m.coat,loft([[side*.135,localShoulder-.032,lean],[side*.20,localShoulder-.085,lean],elbow,wrist],[[.062,.060],[.064,.059],[.057,.051],[.036,.034]],{segments:20,rings:18,fold:.003}));
    const cuffMat=mat('Annie_Mat_Cuff_'+side,{color:cuffColor??0xbfc9bd,map:cloth,roughness:.97});
    const cuff=new THREE.Mesh(loft([[wrist[0],wrist[1]+.013,wrist[2]-.012],wrist],[[.038,.036],[.037,.034]],{segments:20,rings:3,fold:0}),cuffMat);
    cuff.name='Annie_Cuff_'+side;cuff.geometry.userData.sharedAsset=true;owned.geometries.add(cuff.geometry);cuff.castShadow=true;upper.add(cuff);
    const palm=hand(upper,side<0?'Annie_HandStack_Bottom':'Annie_HandStack_Top',side,[wrist[0],wrist[1]-(seated?.003:side*.009),wrist[2]+.021],m,owned,{stack:!seated});
    if(resting)palm.rotation.x=Math.PI/2;
    const knee=seated?[side*.125,.445,.29]:cpr?[side*.145,.12,-.24]:[side*.107,.45,.002];
    const ankle=seated?[side*.125,.097,.285]:cpr?[side*.145,.087,-.485]:[side*.105,.091,.018];
    lower.add(m.scrubs,loft([[side*.108,hip-.017,-.014],knee,ankle],[[.084,.079],[.071,.066],[.044,.041]],{segments:22,rings:22,fold:.005}));
    const shoeZ=ankle[2]+(cpr?-.045:.052);
    lower.add(m.shoe,ellipsoid([ankle[0],.056,shoeZ],[.066,.050,.116],24,12));
    lower.add(m.shoe,loft([[ankle[0],.012,shoeZ],[ankle[0],.024,shoeZ]],[[.067,.116],[.066,.113]],{segments:24,rings:2,fold:0}));
    // Sitting coat tails lie across the thighs, instead of penetrating the stool.
    if(seated)lower.add(m.coat,loft([[side*.092,.535,-.015],[side*.118,.528,.14],[side*.13,.482,.245]],[[.078,.030],[.076,.029],[.061,.015]],{segments:16,rings:12,fold:.004}));
  }
  if(!seated){
    lower.add(m.coat,loft([[0,hip+.015,0],[0,hip-.15,-.01],[0,hip-.29,0]],[[.186,.110],[.196,.111],[.202,.112]],{segments:32,rings:18,fold:.003,open:.25}));
    lower.add(m.coat,patch([[-.176,hip+.04,-.132],[.176,hip+.04,-.132],[.163,hip-.04,-.131],[-.163,hip-.04,-.131]]));
  }
  const head=new THREE.Group();head.name='Annie_Head';head.position.set(0,headY-hip,lean+.010);upper.add(head);buildFace(head,m,owned);
  torso.finish();lower.finish();
  if(seated){const stool=new THREE.Group();stool.name='Annie_Stool';root.add(stool);const s=new Parts(stool,owned);
    s.add(m.scrubs,ellipsoid([0,.473,-.065],[.19,.022,.175],24,12));
    for(const angle of [0,TAU/3,TAU*2/3]){const x=Math.sin(angle)*.135,z=Math.cos(angle)*.125-.065;s.add(m.metal,loft([[x,.018,z],[x,.453,z]],[[.012,.012],[.014,.014]],{segments:10,rings:3,fold:0}));}
    s.finish();
  }
  else if(state==='STORAGE_STATIC'){const anchor=new THREE.Group();anchor.name='Annie_Stool';anchor.visible=false;root.add(anchor);}
  if(contactShadow){
    const geometry=new THREE.PlaneGeometry(.82,cpr?1.1:.9);geometry.userData.sharedAsset=true;owned.geometries.add(geometry);
    const material=new THREE.MeshBasicMaterial({map:shadow,transparent:true,depthWrite:false,opacity:.75});material.userData.sharedAsset=true;owned.materials.add(material);
    const contact=new THREE.Mesh(geometry,material);contact.name='Annie_ContactShadow';contact.rotation.x=-Math.PI/2;contact.position.set(0,.004,cpr?-.27:seated?.15:.03);root.add(contact);
  }
  const rig={upperBody:upper,head,baseUpperBodyY:hip,baseLean:0,elapsed:0,compression:0,characterVersion:1};
  root.userData.rig=rig;root.userData.characterResources=owned;
  // This hook owns the resources; sharedAsset flags avoid double disposal in zone QA.
  root.userData.disposeArt=()=>disposeAnnieCharacter(root,{remove:false});
  root.userData.updateCharacter=delta=>updateAnnieCharacter(root,delta);
  parent?.add(root);return root;
}

export function updateAnnieCharacter(annie,delta) {
  const rig=annie?.userData.rig;if(!rig||annie.userData.characterResources?.disposed)return;
  if(!Number.isFinite(delta)||delta<0)throw new TypeError('Annie delta must be finite and nonnegative');
  if(annie.userData.state==='STORAGE_STATIC')return; // Explicit narrative: no breathing.
  rig.elapsed+=Math.min(delta,.1);
  if(annie.userData.state==='BRIDGE_MANIFEST'){
    const phase=rig.elapsed*.45;rig.upperBody.rotation.z=Math.sin(phase)*.003;
    rig.head.rotation.z=Math.sin(phase-.15)*.0045;rig.head.rotation.y=Math.sin(phase*.61)*.006;
  }else{
    const phase=(rig.elapsed%(60/110))/(60/110),press=Math.pow(Math.max(0,Math.sin(phase*TAU)),3);
    rig.compression=press;rig.upperBody.position.y=rig.baseUpperBodyY-.04*press;
    rig.head.rotation.x=.018*press; // No impact, eye blinking or unrelated live-human idle.
  }
}

export function inspectAnnieCharacter(root){let meshes=0,triangles=0,lights=0,geometryBytes=0;root.traverseVisible(o=>{if(o.isLight)lights++;if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;geometryBytes+=(o.geometry.index?.array.byteLength||0)+Object.values(o.geometry.attributes).reduce((sum,a)=>sum+a.array.byteLength,0);}});return {meshes,triangles,lights,geometryBytes,textures:root.userData.characterResources?.textures.size??0};}

export function disposeAnnieCharacter(root,{remove=true}={}) {
  const owned=root?.userData.characterResources;if(!owned||owned.disposed)return;owned.disposed=true;
  // Existing 5F scene clones cuff materials before tinting blue. Track those copies
  // at teardown as well; externally supplied registry materials remain borrowed.
  root.traverse(o=>{for(const material of (Array.isArray(o.material)?o.material:[o.material]))if(material?.userData.annieCharacterOwned)owned.materials.add(material);});
  owned.geometries.forEach(g=>g.dispose());owned.materials.forEach(m=>m.dispose());owned.textures.forEach(t=>t.dispose());
  root.clear();if(remove)root.removeFromParent();
}

// Owner may delegate AnnieArt's factories/updates without changing scene/story imports.
export { createAnnieCharacter as createAnnieArt, updateAnnieCharacter as updateAnnieArt, ANNIE_CHARACTER_STATES as ANNIE_STATES };
