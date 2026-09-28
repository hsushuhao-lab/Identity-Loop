import * as THREE from 'three';
import { worldNarrative } from '../story/IdentityPrivacy.js';

function makeCanvasLabel(lines, options = {}) {
  const width = options.width || 1024;
  const height = options.height || 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = options.background || '#f4f1e8';
  ctx.fillRect(0, 0, width, height);

  if (options.border !== false) {
    ctx.strokeStyle = options.borderColor || '#7b8b80';
    ctx.lineWidth = options.borderWidth || 8;
    ctx.strokeRect(8, 8, width - 16, height - 16);
  }

  ctx.textAlign = options.align || 'center';
  ctx.textBaseline = 'middle';

  const startY = options.startY || height * 0.34;
  const lineGap = options.lineGap || 64;
  lines.forEach((line, index) => {
    ctx.fillStyle = line.color || '#24362e';
    ctx.font = line.font || (index === 0 ? 'bold 48px sans-serif' : '30px sans-serif');
    ctx.fillText(worldNarrative(line.text), width / 2, startY + index * lineGap);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function addCorrectedSign(scene, { x, y, z, width, height, rotationY = 0, lines, background, borderColor }) {
  const texture = makeCanvasLabel(lines, { background, borderColor });
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: false, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;
  mesh.renderOrder = 50;
  scene.add(mesh);
  return mesh;
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el) el.textContent = value;
}

function sanitizeAct1UI() {
  document.documentElement.dataset.artDirection = 'act1-canonical-v2';

  // Public prototype stays fictionalized. Real reference material is not part of the game UI.
  setText('.hud-tag', '松德醫療中心 ｜ 夜間值班');
  setText('.his-title-main', '松德醫療中心 醫療資訊整合系統 (HIS)');
  setText('.his-title-sub', '夜間交班模組');
  setText('.badge-secure', '病房門禁：刷卡');

  const emblem = document.querySelector('.his-emblem');
  if (emblem) emblem.textContent = 'HIS';

  // Remove gamey emoji iconography from the medical workstation.
  document.querySelectorAll('.his-card .card-icon, .his-nav-item .nav-icon').forEach((el) => {
    el.textContent = '';
  });

  // No invented duty-room number. It was never part of the approved topology.
  const stickyBody = document.querySelector('.his-sticky-note .sticky-body');
  if (stickyBody) {
    stickyBody.innerHTML = [
      worldNarrative('李醫師，值班室鑰匙在 316 辦公桌旁。<br/>'),
      '交班完記得先上去放行李。<br/>',
      '<strong>晚餐約 18:30 送達護理站。</strong>'
    ].join('');
  }

  // Bed 33 is a later legend. Act 1 must not prime or reveal it.
  document.querySelectorAll('.his-table tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length && cells[0].textContent.trim() === '4A33') {
      cells[0].textContent = '4A31';
      cells[1].textContent = worldNarrative('王○○');
      cells[2].textContent = '女 / 45';
      cells[3].textContent = '情緒症狀穩定期';
      cells[4].textContent = '常規夜間巡視與交班確認。';
      cells[5].innerHTML = '<span class="badge-stable">病況平穩</span>';
    }
  });

  document.querySelectorAll('.his-card').forEach((card) => {
    if (card.textContent.includes('4A33')) {
      card.querySelectorAll('p').forEach((p) => {
        if (p.textContent.includes('4A33')) {
          p.textContent = '• 4A31 常規照護中，依交班內容於夜間巡視確認。';
        }
      });
    }
  });

  document.querySelectorAll('.book-header h3').forEach((el) => {
    el.textContent = '松德醫療中心';
  });

  document.querySelectorAll('td').forEach((cell) => {
    if (cell.textContent.includes('422')) {
      cell.textContent = cell.textContent.replace(/422\s*/g, '');
    }
  });
}

function add4FVisualCorrections(scene) {
  // Cover the unverified room number used by the earlier implementation.
  addCorrectedSign(scene, {
    x: 5.05, y: 11.55, z: -2.445,
    width: 0.62, height: 0.20,
    lines: [
      { text: '4F 值班室', font: 'bold 46px sans-serif' },
      { text: '夜間值班醫師休息空間', font: '25px sans-serif', color: '#4b6257' }
    ],
    background: '#eee8dc',
    borderColor: '#8e785f'
  });

  // Replace prison-like/red-warning visual language with neutral hospital access-control language.
  addCorrectedSign(scene, {
    x: 3.0, y: 12.82, z: 2.405,
    width: 2.7, height: 0.42,
    rotationY: Math.PI,
    lines: [
      { text: '4A / 4B 病房', font: 'bold 46px sans-serif', color: '#f8fbf8' },
      { text: '門禁區域 · 請刷卡進入', font: '27px sans-serif', color: '#d9eadf' }
    ],
    background: '#355c49',
    borderColor: '#b8d1c2'
  });

  addCorrectedSign(scene, {
    x: 4.05, y: 10.85, z: 2.415,
    width: 0.86, height: 0.44,
    rotationY: Math.PI,
    lines: [
      { text: '病房出入提醒', font: 'bold 40px sans-serif' },
      { text: '進出請刷卡，並確認門扇已關閉', font: '23px sans-serif', color: '#46564f' }
    ],
    background: '#f7f6f0',
    borderColor: '#97a79e'
  });

  // Nursing station should read as a working care hub, not a security checkpoint.
  addCorrectedSign(scene, {
    x: 3.0, y: 11.70, z: 4.78,
    width: 2.05, height: 0.48,
    rotationY: Math.PI,
    lines: [
      { text: '4A 護理站  Nursing Station', font: 'bold 40px sans-serif', color: '#f9fbf9' },
      { text: '夜間照護 · 交班 · 聯絡', font: '24px sans-serif', color: '#d4eadc' }
    ],
    background: '#2f6048',
    borderColor: '#c8dfd1'
  });

  // Remove the premature Bed 33 cue and the invented 422 reference from the visible 4A whiteboard.
  addCorrectedSign(scene, {
    x: 4.2, y: 11.8, z: 9.445,
    width: 1.62, height: 0.82,
    rotationY: Math.PI,
    lines: [
      { text: '4A 今日交班', font: 'bold 42px sans-serif' },
      { text: '小夜班交接進行中 · 第一線值班：李醫師', font: '23px sans-serif', color: '#3e4c46' },
      { text: '18:30 晚餐送達護理站 · 重要事項依交班系統確認', font: '21px sans-serif', color: '#56655e' }
    ],
    background: '#fafafa',
    borderColor: '#7b8b80'
  });
}

export function applyAct1ArtDirection({ scene, renderer }) {
  // Act 1 is intentionally safe, warm and ordinary. Horror must come later by contrast.
  scene.background = new THREE.Color(0x918f89);
  scene.fog = new THREE.FogExp2(0xb5aa9b, 0.0075);

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Normalize the earlier pass, which was too orange / theatrical in places.
  scene.traverse((obj) => {
    if (obj.isDirectionalLight) {
      obj.color.setHex(0xffc58b);
      obj.intensity = Math.min(obj.intensity, 1.55);
    } else if (obj.isAmbientLight) {
      obj.color.setHex(0xfff2df);
      obj.intensity = Math.min(obj.intensity, 0.62);
    } else if (obj.isPointLight) {
      if (obj.position.y < 9) {
        obj.color.lerp(new THREE.Color(0xfff1da), 0.55);
      } else {
        obj.color.lerp(new THREE.Color(0xffead7), 0.45);
      }
      obj.intensity *= 0.90;
    }

    if (obj.isMesh && obj.material && !Array.isArray(obj.material)) {
      const mat = obj.material;
      if (mat.isMeshStandardMaterial && mat.roughness < 0.35 && mat.metalness < 0.25) {
        mat.roughness = 0.42;
      }
    }
  });

  add4FVisualCorrections(scene);
  sanitizeAct1UI();
}
