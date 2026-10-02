import * as THREE from 'three';

/** Optional finish pass. No story, collision, navigation, NPC or runtime dependencies. */
export const HOSPITAL_SURFACE_STYLE = Object.freeze({
  overheadColor: 0xe6eeec,
  atlasSize: 512,
  // Small trims become cooler, while the existing amber reading/task pools remain.
  finishes: Object.freeze({
    wall: { color: 0xe5e7df, roughness: .91 },
    wallDark: { color: 0x687c75, roughness: .86 },
    wallBumper: { color: 0x536d65, roughness: .77 },
    ceiling: { color: 0xd7ddd7, roughness: .98 },
    floorTile: { color: 0xd3d9cf, roughness: .64 },
    counterTop: { color: 0xbac9c0, roughness: .62 },
    metal: { color: 0x9daaa5, roughness: .53, metalness: .52 },
    stainless: { color: 0xc1cbc6, roughness: .42, metalness: .72 },
    bedFrame: { color: 0xb6c2b9, roughness: .57, metalness: .32 }
  })
});

// Atlas artwork is generated here from original shapes; no downloads/licensed stock.
export function createHospitalDetailAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = HOSPITAL_SURFACE_STYLE.atlasSize;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('HospitalSurfaceKit requires a 2D canvas context');
  const tile = (x, y, fill) => {
    ctx.fillStyle = fill; ctx.fillRect(x, y, 256, 256);
    ctx.strokeStyle = '#8c9890'; ctx.lineWidth = 3; ctx.strokeRect(x + 9, y + 9, 238, 238);
    ctx.strokeStyle = '#e2e8df'; ctx.lineWidth = 2; ctx.strokeRect(x + 13, y + 13, 230, 230);
    for (const dx of [23, 233]) for (const dy of [23, 233]) {
      ctx.fillStyle = '#738078'; ctx.beginPath(); ctx.arc(x + dx, y + dy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#d7dfd5'; ctx.beginPath(); ctx.moveTo(x + dx - 2, y + dy - 2); ctx.lineTo(x + dx + 2, y + dy + 2); ctx.stroke();
    }
  };
  tile(0, 0, '#bdc8bd');
  for (let y = 42; y < 223; y += 15) {
    ctx.fillStyle = '#33453e'; ctx.fillRect(38, y, 180, 6);
    ctx.fillStyle = '#d4ddd2'; ctx.fillRect(38, y + 6, 180, 2);
  }
  // Twin blank outlet sockets: no invented codes, names or narrative text.
  tile(256, 0, '#d4d9cb');
  for (const cy of [80, 174]) {
    ctx.strokeStyle = '#a8b3a5'; ctx.lineWidth = 3; ctx.strokeRect(294, cy - 28, 180, 65);
    ctx.fillStyle = '#243b32';
    for (const cx of [355, 409]) ctx.fillRect(cx, cy - 10, 8, 27);
    ctx.fillRect(384, cy + 20, 8, 9);
  }
  tile(0, 256, '#a6b1a9');
  // Brushed kickplate, with deterministic scratches and cleaning streaks.
  for (let i = 0; i < 180; i++) {
    ctx.strokeStyle = i % 3 ? 'rgba(233,239,228,.19)' : 'rgba(54,72,60,.17)';
    const y = 291 + (i * 37) % 179;
    ctx.beginPath(); ctx.moveTo(25 + (i * 13) % 120, y); ctx.lineTo(118 + (i * 19) % 113, y + (i % 3) - 1); ctx.stroke();
  }
  tile(256, 256, '#748980');
  for (let y = 310; y < 465; y += 18) for (let x = 300; x < 470; x += 15) {
    ctx.fillStyle = '#273b33'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = 'HospitalSurfaceKit/original-detail-atlas';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
}

// Boxes are shallow relief, merged into one draw per independently moving parent.
export function buildHospitalDetailGeometry(panels) {
  const positions = [], normals = [], uvs = [];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), point = new THREE.Vector3();
  for (const { position, size, yaw = 0, tile = 0 } of panels) {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2] ?? .014).toNonIndexed();
    rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    matrix.compose(new THREE.Vector3(...position), rotation, new THREE.Vector3(1, 1, 1));
    const { position: p, normal: n, uv } = geometry.attributes;
    for (let i = 0; i < p.count; i++) {
      point.fromBufferAttribute(p, i).applyMatrix4(matrix); positions.push(point.x, point.y, point.z);
      point.fromBufferAttribute(n, i).applyQuaternion(rotation); normals.push(point.x, point.y, point.z);
      // +Z is the front. Insets prevent mip bleed. Side faces sample plain enamel.
      const front = i >= 24 && i < 30;
      const x = front ? ((tile % 2) * 256 + 6 + uv.getX(i) * 244) : 260 + uv.getX(i) * 4;
      const y = front ? (Math.floor(tile / 2) * 256 + 6 + (1 - uv.getY(i)) * 244) : 258 + (1 - uv.getY(i)) * 4;
      uvs.push(x / 512, 1 - y / 512);
    }
    geometry.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  merged.computeBoundingBox(); merged.computeBoundingSphere();
  return merged;
}

/** Decorative anchors on solid 4F wall segments; none cross the room apertures. */
export function wardSurfacePanels() {
  const panels = [];
  for (const [x, yaw] of [[6.879, -Math.PI / 2], [-7.879, Math.PI / 2]]) {
    for (const z of [-6.6, -11]) {
      panels.push({ position: [x, 2.57, z], size: [.68, .28, .014], yaw, tile: 0 });
      panels.push({ position: [x, .46, z], size: [.115, .20, .012], yaw, tile: 1 });
    }
    panels.push({ position: [x, .29, -14.7], size: [1.15, .30, .016], yaw, tile: 2 });
  }
  return panels;
}

/** Tune only existing overhead panels. Does not change intensity, phases or shadows. */
export function finishHospitalLighting(lightGroup) {
  const saved = [];
  lightGroup?.traverse(light => {
    if (!light.isRectAreaLight) return;
    saved.push([light, light.color.clone()]);
    light.color.setHex(HOSPITAL_SURFACE_STYLE.overheadColor);
  });
  let disposed = false;
  return { count: saved.length, dispose() {
    if (disposed) return; disposed = true;
    for (const [light, color] of saved) light.color.copy(color);
  } };
}

const installations = new WeakMap();

/**
 * Call after zone assets/PBR readiness and static bed batching. Owner controls timing.
 * panels:false = material-only (zero added meshes). equipment:false avoids phase3 overlays.
 * Explicit panels can serve an annex; zoneId protects automatic 4F placement elsewhere.
 * Call dispose before zone teardown; existing disposeZoneArt also calls our cleanup hook.
 */
export function installHospitalSurfaceKit(zone, {
  zoneId = 'first_campus_4f', panels = true, equipment = false, lightingGroup = null,
  atlasFactory = createHospitalDetailAtlas
} = {}) {
  if (!zone?.zoneGroup?.isObject3D) throw new TypeError('HospitalSurfaceKit requires zone.zoneGroup');
  if (installations.has(zone.zoneGroup)) return installations.get(zone.zoneGroup);
  if (panels === true && zoneId !== 'first_campus_4f') throw new Error('Supply explicit panels or panels:false outside 4F');
  const root = zone.zoneGroup, candidates = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    if (list.some(material => HOSPITAL_SURFACE_STYLE.finishes[material?.name?.replace('hospital/', '')])) {
      if (list.some(material => material?.userData.surface && !material.map)) {
        throw new Error('HospitalSurfaceKit: wait for zone PBR texture readiness before installation');
      }
      candidates.push(mesh);
    }
  });
  const replacements = new Map(), originals = [], details = [];
  let atlas, detailMaterial, disposed = false;
  const cloneFinish = original => {
    const finish = HOSPITAL_SURFACE_STYLE.finishes[original?.name?.replace('hospital/', '')];
    if (!finish) return original;
    if (!replacements.has(original)) {
      const material = original.clone(); material.setValues(finish);
      // Borrow existing maps. Ownership stays with the registry/original material.
      material.userData = { ...original.userData, sharedAsset: false, hospitalSurfaceFinish: true };
      replacements.set(original, material);
    }
    return replacements.get(original);
  };
  const selected = panels === true ? wardSurfacePanels() : panels || [];
  const equipmentRoots = equipment ? root.children.flatMap(object => {
    const found = [];
    object.traverse(child => {
      const id = child.userData.id;
      if (id === 'HOSPITAL_TERMINAL') found.push([child, [{ position: [0, .20, -.036], size: [.29, .12], yaw: Math.PI, tile: 3 }]]);
      if (id === 'HOSPITAL_PHONE') found.push([child, [{ position: [.164, .049, 0], size: [.09, .045], yaw: Math.PI / 2, tile: 3 }]]);
    });
    return found;
  }) : [];
  // Build owned resources before modifying originals, so canvas failure is atomic.
  if (selected.length || equipmentRoots.length) {
    atlas = atlasFactory();
    detailMaterial = new THREE.MeshStandardMaterial({ map: atlas, roughness: .78, metalness: .12 });
    detailMaterial.name = 'HospitalSurfaceKit/relief';
    for (const [parent, specs] of [[root, selected], ...equipmentRoots]) {
      if (!specs.length) continue;
      const mesh = new THREE.Mesh(buildHospitalDetailGeometry(specs), detailMaterial);
      mesh.name = 'HospitalSurfaceKit_MergedRelief'; mesh.receiveShadow = true;
      // Decoration does not steal an interactable ancestor's aim hits.
      mesh.raycast = () => {};
      details.push([parent, mesh]);
    }
  }
  for (const mesh of candidates) {
    originals.push([mesh, mesh.material]);
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneFinish) : cloneFinish(mesh.material);
  }
  for (const [parent, mesh] of details) parent.add(mesh);
  const lighting = finishHospitalLighting(lightingGroup);
  const handle = {
    stats: Object.freeze({ changedMeshes: originals.length, materialVariants: replacements.size,
      addedDrawCalls: details.length, addedTriangles: details.reduce((sum, [, mesh]) => sum + mesh.geometry.attributes.position.count / 3, 0),
      addedLights: 0, shadowCasters: 0, atlasBytesRGBA: atlas ? 512 * 512 * 4 : 0,
      atlasBytesWithMipmapsEstimate: atlas ? Math.ceil(512 * 512 * 4 * 4 / 3) : 0,
      finishedOverheads: lighting.count }),
    dispose() {
      if (disposed) return; disposed = true;
      for (const [mesh, original] of originals) mesh.material = original;
      for (const [parent, mesh] of details) { parent.remove(mesh); mesh.geometry.dispose(); }
      detailMaterial?.dispose(); atlas?.dispose();
      for (const material of replacements.values()) material.dispose();
      lighting.dispose();
      if (root.userData.disposeArt === cleanup) {
        if (previousDisposeArt) root.userData.disposeArt = previousDisposeArt;
        else delete root.userData.disposeArt;
      }
      installations.delete(root);
    }
  };
  // Root hook runs before traversal visits meshes. Restore borrowed materials and
  // remove/release owned relief first, avoiding double disposal by disposeZoneArt.
  const previousDisposeArt = root.userData.disposeArt;
  const cleanup = () => { handle.dispose(); previousDisposeArt?.(); };
  root.userData.disposeArt = cleanup;
  installations.set(root, handle);
  return handle;
}
