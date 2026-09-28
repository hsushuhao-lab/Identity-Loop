import * as THREE from 'three';

const PHOTO_ZONES = Object.freeze({
  first_campus_2f: { cell: 0, x: 15.78, y: 1.62, z: -8.8, rotationY: -Math.PI / 2 },
  first_campus_3f: { cell: 1, x: -21.84, y: 1.62, z: 6.75, rotationY: Math.PI / 2 },
  first_campus_4f: { cell: 2, x: -13.84, y: 1.62, z: 10.0, rotationY: Math.PI / 2 },
  second_campus_2f: { cell: 0, x: 63.7, y: 1.62, z: -10.28, rotationY: 0 },
  second_campus_4f_story: { cell: 3, x: 74.6, y: 1.15, z: 0.13, rotationY: 0 },
  second_campus_5f: { cell: 4, x: 74.6, y: 1.15, z: 0.13, rotationY: 0 },
  phantom_6f: { cell: 5, x: 3.83, y: 1.62, z: -6.3, rotationY: -Math.PI / 2 },
  b1_dispatch_hub: { cell: 6, x: 4.0, y: 2.0, z: -16.78, rotationY: 0 },
  b2_archive: { cell: 7, x: -4.82, y: 2.08, z: -14.0, rotationY: Math.PI / 2 }
});

const ROUTE_READINGS = Object.freeze({
  ZHANG: '合照裡每個人都朝向同一處，唯獨鏡頭前沒有留下拍攝者的影子。被記下的不是誰到過，而是誰替缺席的人留了位置。',
  LI: '照片邊緣那張交班紙總被翻到背面。有人記得當晚的處置，卻想不起交班究竟交給了誰。',
  ZHOU: '畫面裡的時鐘比走廊慢了七分鐘。每次重看，站在門邊的人都少一個；空出來的位置卻沒有改變。',
  CHEN: '拍攝者把救護車的反光也收進了照片。回程紀錄有兩道車燈，交班簿卻只剩一個空白欄位。'
});

const CELL_STORY = Object.freeze({
  0: '這張急診照片留下了太多空白。',
  1: '歸檔照片的角落有一道被擦掉的日期。',
  2: '夜班桌上的杯子還有一圈沒有乾的水痕。',
  3: '走廊盡頭的輪椅朝著與照片相反的方向。',
  4: '護理站的燈亮著，交班紙卻沒有落款。',
  5: '訓練室裡的床單很平整，地面卻留著拖痕。',
  6: '車窗映出調度室的燈，照片裡找不到拿相機的人。',
  7: '封存室的紙箱都標了日期，只有最裡面那箱沒有。'
});

export function installIdentityFloorPhoto(zone, zoneId) {
  const placement = PHOTO_ZONES[zoneId];
  if (!placement || !zone?.zoneGroup || !zone.interactables) return null;

  const root = new THREE.Group();
  root.name = `IdentityFloorPhoto/${zoneId}`;
  root.position.set(placement.x, placement.y, placement.z);
  root.rotation.y = placement.rotationY;

  const width = 1.02;
  const height = width * 2 / 3;
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
  const story = Object.freeze({
    ...ROUTE_READINGS,
    fallback: `${CELL_STORY[placement.cell]} ${ROUTE_READINGS.ZHANG}`
  });
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

  return root;
}

export const IDENTITY_FLOOR_PHOTO_ZONES = Object.freeze(Object.keys(PHOTO_ZONES));
