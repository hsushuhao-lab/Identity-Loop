import * as THREE from 'three';
import {worldNarrative} from '../story/IdentityPrivacy.js';
import {createAnnieCharacter,updateAnnieCharacter,disposeAnnieCharacter} from './AnnieCharacter.js';

export const ANNIE_STATES = Object.freeze({
  STORAGE_STATIC: 'STORAGE_STATIC',
  BRIDGE_MANIFEST: 'BRIDGE_MANIFEST',
  FLOOR6_CPR: 'FLOOR6_CPR'
});

export const ANNIE_ART_TOKENS = Object.freeze({
  materials: Object.freeze({
    vinyl: Object.freeze({color: 0xd1cbb9, roughness: 0.48, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.58}),
    seam: Object.freeze({color: 0xaaa698, roughness: 0.72}),
    hair: Object.freeze({color: 0x34302b, roughness: 0.88}),
    coat: Object.freeze({color: 0xd7d1b7, roughness: 0.88, metalness: 0}),
    coatEdge: Object.freeze({color: 0xe3ddc8, roughness: 0.86}),
    scrubs: Object.freeze({color: 0x727f76, roughness: 0.93, metalness: 0}),
    stethoscopeRubber: Object.freeze({color: 0x46443b, roughness: 0.74}),
    stethoscopeMetal: Object.freeze({color: 0x8f8469, roughness: 0.48, metalness: 0.68}),
    shoe: Object.freeze({color: 0x514b40, roughness: 0.83})
  }),
  inscription: Object.freeze({background: '#4e4c43', border: '#c3b58e', text: '#e0d3ab'}),
  lighting: Object.freeze({color: 0xdde8e8, intensity: 3.6, distance: 6.4, angle: Math.PI / 5.2, penumbra: 0.72, decay: 1.4}),
  shadow: Object.freeze({color: 0x171b19, opacity: 0.28, radius: 0.16})
});

const sphereGeometry = new THREE.SphereGeometry(1, 48, 32);
const rubberMaterial = new THREE.MeshStandardMaterial({...ANNIE_ART_TOKENS.materials.stethoscopeRubber, name: 'Annie_Mat_Stethoscope_Rubber'});
const metalMaterial = new THREE.MeshStandardMaterial({...ANNIE_ART_TOKENS.materials.stethoscopeMetal, name: 'Annie_Mat_Stethoscope_Metal'});

function ellipsoid(parent, name, position, scale, material) {
  const mesh = new THREE.Mesh(sphereGeometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  parent.add(mesh);
  return mesh;
}

function capsuleBetween(parent, name, start, end, radius, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const axis = to.clone().sub(from);
  const length = axis.length();
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 10, 32), material
  );
  mesh.name = name;
  mesh.position.copy(from.add(to).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.normalize());
  parent.add(mesh);
  return mesh;
}

function tube(parent, name, points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 12, false), material);
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function ring(parent, name, position, radius, material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.003, 10, 48), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.x = Math.PI / 2;
  parent.add(mesh);
  return mesh;
}

function makeInscriptionTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 384;
  const context = canvas.getContext('2d');
  context.fillStyle = ANNIE_ART_TOKENS.inscription.background;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = ANNIE_ART_TOKENS.inscription.border;
  context.lineWidth = 12;
  context.strokeRect(10, 10, 748, 364);
  context.fillStyle = ANNIE_ART_TOKENS.inscription.text;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = 'bold 108px sans-serif';
  context.fillText(worldNarrative('祝 守恆 醫師'), 384, 126);
  context.font = 'bold 88px sans-serif';
  context.fillText('1997 執業誌慶', 384, 270);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildStethoscope(prop, shoulderLocalY) {
  const stethoscope = new THREE.Group();
  stethoscope.name = 'Zhang_Stethoscope_1997';
  stethoscope.userData.owner = '張守恆';
  stethoscope.userData.inscription = '祝 守恆 醫師 1997 執業誌慶';
  prop.add(stethoscope);
  tube(stethoscope, 'Zhang_Stethoscope_OldRubberTube', [
    [-0.09, shoulderLocalY + 0.05, 0.105], [-0.145, shoulderLocalY - 0.10, 0.135],
    [-0.12, shoulderLocalY - 0.27, 0.164], [0, shoulderLocalY - 0.34, 0.176],
    [0.12, shoulderLocalY - 0.27, 0.164], [0.145, shoulderLocalY - 0.10, 0.135],
    [0.09, shoulderLocalY + 0.05, 0.105]
  ], 0.009, rubberMaterial);

  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.041, 0.018, 32), metalMaterial);
  bell.name = 'Zhang_StethoscopeBell';
  bell.rotation.x = Math.PI / 2;
  bell.position.set(0, shoulderLocalY - 0.36, 0.187);
  stethoscope.add(bell);

  const plate = ellipsoid(stethoscope, 'Zhang_StethoscopeEngravingPlate', [0, shoulderLocalY - 0.25, 0.196], [0.132, 0.081, 0.014], metalMaterial);
  plate.userData.inscription = stethoscope.userData.inscription;
  const inscription = new THREE.Mesh(
    new THREE.PlaneGeometry(0.245, 0.118),
    new THREE.MeshBasicMaterial({map: makeInscriptionTexture(), toneMapped: false})
  );
  inscription.name = 'Zhang_Stethoscope_1997_Inscription';
  inscription.position.set(0, shoulderLocalY - 0.25, 0.210);
  stethoscope.add(inscription);
}

export function createZhangStethoscopeProp(parent, {position, rotationX = 0, scale = 1}) {
  const prop = new THREE.Group();
  prop.name = 'Zhang_Stethoscope_1997_Prop';
  prop.userData.owner = '張守恆';
  prop.userData.inscription = '祝 守恆 醫師 1997 執業誌慶';
  prop.position.set(...position);
  prop.rotation.x = rotationX;
  prop.scale.setScalar(scale);
  parent.add(prop);
  buildStethoscope(prop, 0.45);
  return prop;
}

/** Shared trainer factory; existing scene imports and clue factory stay stable. */
export function createAnnieArt(parent,options) {
  const root=createAnnieCharacter(parent,options),cpr=options.state===ANNIE_STATES.FLOOR6_CPR;
  const upper=root.userData.rig.upperBody,head=root.userData.rig.head;
  const torso=new THREE.Group();torso.name='Annie_Torso';upper.add(torso);
  for(const child of [...upper.children])if(child.isMesh&&child.name.startsWith('AnnieCharacter_')){
    if(child.material.name==='Annie_Mat_Coat')child.name='Annie_WhiteCoat';
    if(child.material.name==='Annie_Mat_Scrubs')child.name='Annie_Scrubs';
    torso.add(child);
  }
  const face=head.children.find(o=>o.isMesh&&o.material.name==='Annie_Mat_Skin');if(face)face.name='Annie_SmoothVinylFace';
  const nose=new THREE.Object3D();nose.name='Annie_MoldedNose';nose.position.set(0,-.025,.106);head.add(nose);
  const hands=new THREE.Group();hands.name='Annie_OverlappedHands';upper.add(hands);
  for(const name of ['Annie_HandStack_Bottom','Annie_HandStack_Top']){const hand=upper.getObjectByName(name);if(hand)hands.add(hand);}
  // Preserve the prior practical and its exact settings: the redesign does not
  // alter scene illumination to disguise proportions or surface defects.
  const t=ANNIE_ART_TOKENS.lighting,practical=new THREE.SpotLight(t.color,t.intensity,t.distance,t.angle,t.penumbra,t.decay);
  practical.name='Annie_Local_CoolWhite_Practical';practical.position.set(.12,cpr?2.12:2.32,.68);practical.castShadow=true;
  practical.shadow.mapSize.set(512,512);practical.shadow.bias=-.00025;
  practical.target.name='Annie_Local_Practical_Target';practical.target.position.set(0,cpr?.95:1.08,cpr?.87:.06);root.add(practical,practical.target);
  let released=false;root.userData.disposeArt=()=>{if(released)return;released=true;practical.shadow.dispose();disposeAnnieCharacter(root,{remove:false});};
  return root;
}
export function updateAnnieArt(root,delta){updateAnnieCharacter(root,delta);}
