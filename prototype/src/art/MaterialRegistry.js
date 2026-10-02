import { assetLoadQueue } from './AssetLoadQueue.js';
import * as THREE from 'three';

const textureRoot = `${import.meta.env?.BASE_URL ?? '/'}assets/textures/`;
const sources = {
  plaster: { id: 'PaintedPlaster017', resolution: '1K', metres: 1, metresY: .5 },
  vinyl: { id: 'Plastic010', metres: .35 },
  terrazzo: { id: 'Terrazzo001', metres: 2 },
  wood: { id: 'Wood051', metres: .8 },
  ground: { id: 'Ground037', metres: 2 },
  asphalt: { id: 'Asphalt033', metres: 2 },
};
const definitions = {
  lightWarm: { color: 0xfff2d9, emissive: 0xffefd6, emissiveIntensity: 1.2, roughness: .8 },
  wall: { color: 0xf0ece2, roughness: .88, surface: 'plaster' },
  wallDark: { color: 0x899b8c, roughness: .85, surface: 'plaster' },
  wallBumper: { color: 0x6e8475, roughness: .66 },
  floor: { color: 0xe0dbce, roughness: .82, surface: 'vinyl' },
  floorTile: { color: 0xe7e0d2, roughness: .7, surface: 'terrazzo' },
  floorWood: { color: 0xe5d2af, roughness: .72, surface: 'wood' },
  ceiling: { color: 0xefede4, roughness: .97, surface: 'plaster' },
  doorWood: { color: 0xf3e8d5, roughness: .76, surface: 'wood' },
  metal: { color: 0x929991, roughness: .47, metalness: .65 },
  stainless: { color: 0xb4b8b3, roughness: .38, metalness: .8 },
  glass: { color: 0xc8d5ce, transparent: true, opacity: .22, roughness: .15 },
  glassOpaquePlaceholder: { color: 0xc3c8bd, roughness: .57 },
  counterTop: { color: 0xc2c4b7, roughness: .55 },
  bedSheet: { color: 0xe8e7d9, roughness: .96 },
  bedFrame: { color: 0xa6ada1, roughness: .5, metalness: .35 },
  terrainGrass: { color: 0xb5b9a6, roughness: .99, surface: 'ground' },
  pathGravel: { color: 0xd5d5cb, roughness: .92, surface: 'asphalt' },
  waterPlaceholder: { color: 0x486159, roughness: .28, metalness: .2 },
  handrail: { color: 0xd7bd96, roughness: .62, surface: 'wood' },
};
const materials = Object.fromEntries(Object.entries(definitions).map(([name, definition]) => {
  const { surface, ...parameters } = definition;
  const material = new THREE.MeshStandardMaterial(parameters);
  material.name = `hospital/${name}`;
  material.userData = { sharedAsset: true, surface, physicalMetres: sources[surface]?.metres ?? 1, physicalMetresY: sources[surface]?.metresY ?? sources[surface]?.metres ?? 1 };
  return [name, material];
}));
const surfaces = new Map();
const outdoorSurfaces = new Set(['ground', 'asphalt']);
let preload;
let outdoorPreload;
const pendingSurfaces = new Map();

export function getMaterials() { return materials; }

function loadMaterialEntries(entries) {
  const loader = new THREE.TextureLoader();
  return Promise.all(entries.map(async ([surface, { id, resolution = '2K' }]) => {
    const textures = await Promise.all(['Color', 'NormalGL', 'Roughness'].map(async channel => {
      const texture = await loader.loadAsync(`${textureRoot}${id}_${resolution}-JPG_${channel}.jpg`);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = channel === 'Color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.anisotropy = 8;
      texture.userData.sharedAsset = true;
      return texture;
    }));
    for (const material of Object.values(materials)) {
      if (material.userData.surface !== surface) continue;
      [material.map, material.normalMap, material.roughnessMap] = textures;
      // Keep the scanned albedo on painted surfaces. The previous implementation
      // explicitly nulled plaster.map, which made walls/ceilings render as flat color
      // even though the texture files had been downloaded successfully.
      const normalStrength = surface === 'plaster' ? .065 : surface === 'vinyl' ? .12 : surface === 'wood' ? .12 : .24;
      material.normalScale.set(normalStrength, normalStrength);
      material.needsUpdate = true;
    }
  })).then(() => {
    for (const [key, material] of surfaces) applySurfaceMaps(material, key.split(':')[0]);
    return materials;
  });
}

export function preloadMaterials() {
  if (preload) return preload;
  preload = preloadMaterialSurfaces(Object.keys(sources).filter(surface => !outdoorSurfaces.has(surface)))
    .catch(error => { throw new Error(`Hospital PBR texture preload failed: ${error.message}`, { cause: error }); });
  return preload;
}

export function preloadOutdoorMaterials() {
  if (outdoorPreload) return outdoorPreload;
  outdoorPreload = preloadMaterialSurfaces([...outdoorSurfaces])
    .catch(error => { throw new Error(`Outdoor PBR texture preload failed: ${error.message}`, { cause: error }); });
  return outdoorPreload;
}

function applySurfaceMaps(material, name) {
  const base = materials[name];
  for (const key of ['map', 'normalMap', 'roughnessMap']) {
    if (!base[key]) continue;
    material[key] = base[key].clone();
    material[key].repeat.set(material.userData.repeatX, material.userData.repeatY);
    material[key].userData.sharedAsset = true;
    material[key].needsUpdate = true;
  }
  material.normalScale.copy(base.normalScale);
  material.needsUpdate = true;
}

export function materialForSurface(name, width = 1, height = 1) {
  const key = `${name}:${width.toFixed(3)}:${height.toFixed(3)}`;
  if (surfaces.has(key)) return surfaces.get(key);
  const base = materials[name];
  const material = base.clone();
  material.userData = { ...base.userData, repeatX: width / base.userData.physicalMetres, repeatY: height / base.userData.physicalMetresY };
  applySurfaceMaps(material, name);
  surfaces.set(key, material);
  return material;
}

export function preloadMaterialSurfaces(names,{optional=false}={}) {
  return Promise.all(names.map(name => {
    if (!sources[name]) throw new Error(`Unknown PBR surface: ${name}`);
    if(isMaterialSurfaceReady(name))return Promise.resolve();
    if (!pendingSurfaces.has(name)) {
      const request=assetLoadQueue.enqueue(()=>loadMaterialEntries([[name, sources[name]]]),{optional})
        .finally(()=>pendingSurfaces.delete(name));
      pendingSurfaces.set(name,request);
    }
    return pendingSurfaces.get(name);
  }));
}

export function auditSceneMaterials(root) {
  const byMaterial = new Map();
  const totals = { texturedMeshCount: 0, flatMeshCount: 0, pbrMeshCount: 0 };
  root?.traverseVisible(object => {
    if (!object.isMesh) return;
    const meshMaterials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of meshMaterials) {
      if (!material) continue;
      const name = material.name || '(unnamed)';
      let entry = byMaterial.get(name);
      if (!entry) {
        entry = { materialName: name, meshCount: 0, flatMeshCount: 0, pbrMeshCount: 0,
          hasMap: false, hasNormalMap: false,
          hasRoughnessMap: false, mapImageWidth: 0, mapImageHeight: 0,
          repeatX: null, repeatY: null, colorSpace: null };
        byMaterial.set(name, entry);
      }
      entry.meshCount++;
      if (!material.map) entry.flatMeshCount++;
      if (material.map && material.normalMap && material.roughnessMap) entry.pbrMeshCount++;
      entry.hasMap ||= !!material.map;
      entry.hasNormalMap ||= !!material.normalMap;
      entry.hasRoughnessMap ||= !!material.roughnessMap;
      entry.mapImageWidth = material.map?.image?.width ?? entry.mapImageWidth;
      entry.mapImageHeight = material.map?.image?.height ?? entry.mapImageHeight;
      entry.repeatX = material.map?.repeat?.x ?? entry.repeatX;
      entry.repeatY = material.map?.repeat?.y ?? entry.repeatY;
      entry.colorSpace = material.map?.colorSpace ?? entry.colorSpace;
      if (material.map) totals.texturedMeshCount++;
      else totals.flatMeshCount++;
      if (material.map && material.normalMap && material.roughnessMap) totals.pbrMeshCount++;
    }
  });
  return { ...totals, materials: [...byMaterial.values()].sort((a, b) => a.materialName.localeCompare(b.materialName)) };
}

export function isMaterialSurfaceReady(name) {
  return Object.values(materials).some(material=>material.userData.surface===name&&material.map&&material.normalMap&&material.roughnessMap);
}
