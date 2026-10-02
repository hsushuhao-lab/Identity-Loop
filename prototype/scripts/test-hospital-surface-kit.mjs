import assert from 'node:assert/strict';
import * as THREE from 'three';
import { installHospitalSurfaceKit, buildHospitalDetailGeometry, wardSurfacePanels, finishHospitalLighting } from '../src/art/HospitalSurfaceKit.js';
import { disposeZoneArt } from '../src/art/ArtResources.js';

const zone = { zoneGroup: new THREE.Group(), colliders: [], interactables: [], walkables: [] };
const source = new THREE.MeshStandardMaterial({ color: 0xf0ece2 });
source.name = 'hospital/wall'; source.userData = { sharedAsset: true, surface: 'plaster' };
const geometry = new THREE.BoxGeometry(1, 3.2, .22);
const mesh = new THREE.Mesh(geometry, source); zone.zoneGroup.add(mesh);
const invalidCount = zone.zoneGroup.children.length;
assert.throws(() => installHospitalSurfaceKit(zone), /PBR texture readiness/);
assert.equal(zone.zoneGroup.children.length, invalidCount); assert.equal(mesh.material, source);
const maps = ['map', 'normalMap', 'roughnessMap'].map(() => new THREE.Texture());
for (const [i, key] of ['map', 'normalMap', 'roughnessMap'].entries()) source[key] = maps[i];
const original = source.color.clone();
const second = new THREE.InstancedMesh(geometry, source, 2); zone.zoneGroup.add(second);
const arrayMaterialMesh = new THREE.Mesh(geometry, [source, source]); zone.zoneGroup.add(arrayMaterialMesh);
const materialOnly = installHospitalSurfaceKit(zone, { panels: false });
assert.equal(materialOnly.stats.addedDrawCalls, 0); assert.equal(materialOnly.stats.materialVariants, 1);
assert.equal(mesh.material, second.material); assert.equal(arrayMaterialMesh.material[0], mesh.material);
assert.equal(mesh.material.map, source.map); assert.equal(mesh.material.normalMap, source.normalMap);
assert.equal(mesh.material.roughnessMap, source.roughnessMap);
assert(source.color.equals(original)); assert.equal(source.userData.sharedAsset, true);
assert.equal(installHospitalSurfaceKit(zone), materialOnly);
materialOnly.dispose(); materialOnly.dispose(); assert.equal(mesh.material, source);
assert.equal(arrayMaterialMesh.material[0], source);

const panelSpecs = wardSurfacePanels(), panels = buildHospitalDetailGeometry(panelSpecs);
assert.equal(panelSpecs.length, 10); assert.equal(panels.attributes.position.count / 3, 120);
assert.equal(panels.groups.length, 0, 'merged geometry uses one material draw');
assert([...panels.attributes.position.array].every(Number.isFinite));
assert([...panels.attributes.uv.array].every(v => v > 0 && v < 1));
// Front faces are inset into the corresponding quadrant, and normals face the corridor.
assert(panels.attributes.normal.getX(24) < -.99);
assert(panels.boundingBox.max.x < 6.89); assert(panels.boundingBox.min.x > -7.89);
let atlasDisposals = 0, borrowedDisposals = 0;
for (const map of maps) map.addEventListener('dispose', () => borrowedDisposals++);
const atlasFactory = () => { const t = new THREE.Texture(); t.addEventListener('dispose', () => atlasDisposals++); return t; };
const kit = installHospitalSurfaceKit(zone, { atlasFactory });
assert.equal(kit.stats.addedDrawCalls, 1); assert.equal(kit.stats.addedTriangles, 120);
assert.equal(kit.stats.addedLights, 0); assert.equal(kit.stats.shadowCasters, 0);
assert.equal(kit.stats.atlasBytesRGBA, 1048576);
assert.deepEqual(zone.colliders, []); assert.deepEqual(zone.interactables, []); assert.deepEqual(zone.walkables, []);
kit.dispose(); assert.equal(atlasDisposals, 1); assert.equal(borrowedDisposals, 0);
assert.equal(mesh.material, source); assert.equal(second.material, source);

const lightGroup = new THREE.Group(), panel = new THREE.RectAreaLight(0xffefd6, 4), reading = new THREE.PointLight(0xffdcaa, 9);
lightGroup.add(panel, reading); const lightColor = panel.color.clone(), readingColor = reading.color.clone();
const lights = finishHospitalLighting(lightGroup); assert.equal(lights.count, 1);
assert.equal(panel.intensity, 4); assert.equal(reading.intensity, 9); assert(reading.color.equals(readingColor));
lights.dispose(); lights.dispose(); assert(panel.color.equals(lightColor));
assert.throws(() => installHospitalSurfaceKit(zone, { zoneId: 'annex' }), /explicit panels/);
assert.throws(() => installHospitalSurfaceKit(zone, { atlasFactory: () => { throw new Error('canvas failed'); } }), /canvas failed/);
assert.equal(mesh.material, source, 'atlas failure leaves source references intact');

// Compatible with owner teardown: cleanup releases atlas and restores registry materials.
for (const map of maps) map.userData.sharedAsset = true;
const finalKit = installHospitalSurfaceKit(zone, { atlasFactory });
disposeZoneArt(zone.zoneGroup); assert.equal(zone.zoneGroup.children.length, 0);
assert.equal(borrowedDisposals, 0); assert.equal(atlasDisposals, 2, 'each owned atlas is disposed exactly once');
finalKit.dispose(); assert.equal(atlasDisposals, 2);
console.log('PASS HospitalSurfaceKit: zero-draw material path, merged relief, shared PBR ownership, atomic readiness failures, reversible lighting, no gameplay mutation, idempotent installation and zone teardown');
