import * as THREE from 'three';
import { SHARED_PHOTOS, FLOOR_PHOTO_KEYS } from '../story/SharedMedia.js';

const PHOTO_ZONES = Object.freeze({
  first_campus_2f: { cell: 0, x: 15.78, y: 1.62, z: -8.8, rotationY: -Math.PI / 2 },
  first_campus_3f: { cell: 1, x: -21.84, y: 1.62, z: 7.4, rotationY: Math.PI / 2 },
  first_campus_4f: { cell: 2, x: -13.84, y: 1.62, z: 9.4, rotationY: Math.PI / 2 },
  second_campus_2f: { cell: 0, x: 65.0, y: 1.62, z: -10.28, rotationY: 0 },
  second_campus_4f_story: { cell: 3, x: 76.1, y: 1.62, z: 0.13, rotationY: 0 },
  second_campus_5f: { cell: 4, x: 76.1, y: 1.62, z: 0.13, rotationY: 0 },
  phantom_6f: { cell: 5, x: 3.83, y: 1.62, z: -6.3, rotationY: -Math.PI / 2 },
  b1_dispatch_hub: { cell: 6, x: 4.0, y: 2.0, z: -16.78, rotationY: 0 },
  b2_archive: { cell: 7, x: -4.82, y: 1.7, z: -15.2, rotationY: Math.PI / 2 }
});

export function installIdentityFloorPhoto(zone, zoneId) {
  const placement = PHOTO_ZONES[zoneId];
  if (!placement || !zone?.zoneGroup || !zone.interactables) return null;

  const root = new THREE.Group();
  root.name = `IdentityFloorPhoto/${zoneId}`;
  root.position.set(placement.x, placement.y, placement.z);
  root.rotation.y = placement.rotationY;

  const width = .60;
  const height = width * 4 / 3;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + .09, height + .09, .055),
    new THREE.MeshStandardMaterial({ color: 0x493d2f, roughness: .9 })
  );
  root.add(frame);

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ color: 0xd4cbb8, roughness: .92, side: THREE.DoubleSide })
  );
  face.position.z = .031;
  const entry=SHARED_PHOTOS[FLOOR_PHOTO_KEYS[placement.cell]];
  const story=Object.freeze({...entry.readings,fallback:entry.caption});
  face.userData = {
    interactable: true,
    id: `IDENTITY_FLOOR_PHOTO_${zoneId}`,
    type: 'identity_floor_photo',
    photoCell: placement.cell,
    routeReadings: story,
    label: '查看牆上的夜班照片'
  };
  root.add(face);
  zone.zoneGroup.add(root);
  zone.interactables.push(face);

  const canLoadImage=typeof document!=='undefined'&&typeof document.createElementNS==='function';
  if(canLoadImage){
    const baseUrl=import.meta.env?.BASE_URL||'./';
    const sheetUrl = `${baseUrl}assets/identity-v03/floor-photo-contact-sheet.png`;
    new THREE.TextureLoader().load(sheetUrl, (sheet) => {
      if (!face.parent) { sheet.dispose(); return; }
      const texture = sheet.clone();
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      const column = placement.cell % 4;
      const row = Math.floor(placement.cell / 4);
      texture.repeat.set(.24, .48);
      texture.offset.set(column * .25 + .005, .5 - row * .5 + .01);
      texture.needsUpdate = true;
      face.material.map = texture;
      face.material.needsUpdate = true;
      sheet.dispose();
    }, undefined, (error) => console.warn('[identity-photo] photo atlas failed to load', error));
  }

  return root;
}

export const IDENTITY_FLOOR_PHOTO_ZONES = Object.freeze(Object.keys(PHOTO_ZONES));
