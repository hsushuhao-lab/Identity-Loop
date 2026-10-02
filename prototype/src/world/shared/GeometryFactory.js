// GeometryFactory.js - Standardized architectural primitives for modeling-first zones
import * as THREE from 'three';
import { getMaterials, materialForSurface } from '../../art/MaterialRegistry.js';

export class GeometryFactory {
  constructor() {
    this.materials = getMaterials();
  }

  surface(material, width, depth) {
    const name = Object.keys(this.materials).find(key => this.materials[key] === material);
    return name ? materialForSurface(name, width, depth) : material;
  }

  buildFloor(scene, walkables, x, y, z, width, depth, material = this.materials.floor) {
    const geo = new THREE.PlaneGeometry(width, depth);
    const mesh = new THREE.Mesh(geo, this.surface(material, width, depth));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    if (walkables) walkables.push(mesh);
    return mesh;
  }

  buildCeiling(scene, x, y, z, width, depth, material = this.materials.ceiling) {
    const geo = new THREE.PlaneGeometry(width, depth);
    const mesh = new THREE.Mesh(geo, this.surface(material, width, depth));
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(x, y, z);
    scene.add(mesh);
    const grid = new THREE.Group();
    grid.name = 'ArtRoot_CeilingGrid';
    const trim = this.materials.ceiling;
    for (let u = -width / 2 + 0.6; u < width / 2; u += 0.6) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.012, depth), trim);
      rail.position.set(x + u, y - 0.012, z);
      grid.add(rail);
    }
    for (let v = -depth / 2 + 0.6; v < depth / 2; v += 0.6) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.012, 0.014), trim);
      rail.position.set(x, y - 0.012, z + v);
      grid.add(rail);
    }
    scene.add(grid);
    return mesh;
  }

  buildWall(scene, colliders, x, y, z, width, height, depth, material = this.materials.wall) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    // A wall along Z has depth as its visible length, not the .22m thickness.
    const mesh = new THREE.Mesh(geo, this.surface(material, Math.max(width, depth), height));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    if (colliders) {
      const box = new THREE.Box3();
      box.setFromCenterAndSize(
        new THREE.Vector3(x, y, z),
        new THREE.Vector3(width, height, depth)
      );
      colliders.push(box);
    }
    return mesh;
  }

  buildHandrail(scene, colliders, x, y, z, length, isAlongZ = false) {
    const w = isAlongZ ? 0.08 : length;
    const d = isAlongZ ? length : 0.08;
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      this.materials.handrail
    );
    rail.position.set(x, y, z);
    rail.castShadow = true;
    scene.add(rail);
    return rail;
  }

  buildBaseboard(scene, x, y, z, width, depth) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.12, depth),
      this.materials.wallBumper
    );
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }

  buildCeilingLight(scene, x, y, z, intensity = 0.75, distance = 7.0, color = 0xfff6ea, isTransverse = false) {
    const fw = isTransverse ? 0.35 : 1.4;
    const fd = isTransverse ? 1.4 : 0.35;
    const ew = isTransverse ? 0.22 : 1.25;
    const ed = isTransverse ? 1.25 : 0.22;

    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(fw, 0.06, fd),
      this.materials.metal
    );
    fixture.position.set(x, y, z);
    scene.add(fixture);

    const emitter = new THREE.Mesh(
      new THREE.BoxGeometry(ew, 0.02, ed),
      new THREE.MeshBasicMaterial({ color: 0xfffaed })
    );
    emitter.position.set(x, y - 0.035, z);
    scene.add(emitter);

    emitter.material.color.setHex(color);
    emitter.userData.practicalEmitter = true;
    emitter.userData.baseColor = color;
    return { fixture, emitter, light: null };
  }
}
