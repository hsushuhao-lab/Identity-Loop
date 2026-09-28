import * as THREE from 'three';
import { ROUTE_STEPS } from './IdentityRoutes.js';
import { getIdentityRouteScene } from './IdentityRouteScenes.js';

const PHOTO_FILES = { history_group_1998: 'history-group.png', guard_reflection_1998: 'history-reflection.png' };

export class IdentityRouteDirector {
  constructor({ manager, panel, worldRouter, controller, gameState, uiManager, prepareZone, onEnding = () => {}, onRouteStep = () => {} }) {
    Object.assign(this, { manager, panel, worldRouter, controller, gameState, uiManager, prepareZone, onEnding, onRouteStep });
    this.step = null;
    this.beats = [];
    this.beatIndex = 0;
    this.lineIndex = -1;
    this.anchor = null;
    this.busy = false;
    this.revision = 0;
  }

  get currentRouteStep() { return this.step; }
  get currentScene() { return this.step ? { step: this.step, ...ROUTE_STEPS[this.step], beats: this.beats } : null; }
  get currentBeat() { return this.beats[this.beatIndex] ? { ...this.beats[this.beatIndex], index: this.beatIndex, lineIndex: this.lineIndex } : null; }

  async start() { return this.resume(); }

  async resume() {
    if (this.busy) return false;
    const finalState = this.manager.runSave.runEnded || this.manager.runSave.currentMilestone === 'M10';
    if (!finalState && !this.manager.currentRouteStep) return false;
    this.busy = true;
    this.controller.enabled = false;
    try {
      if (finalState) {
        await this.restoreEnding();
        return true;
      }
      const firstBeat = getIdentityRouteScene(this.manager.currentRouteStep, this.manager.currentIdentity)[0];
      await this.prepareZone(firstBeat.zoneId || ROUTE_STEPS[this.manager.currentRouteStep].zoneId);
      await this.loadCurrentStep();
      return true;
    } finally {
      this.busy = false;
      this.controller.enabled = !finalState;
    }
  }

  async restoreEnding() {
    const route = ROUTE_STEPS.M9;
    await this.prepareZone(route.zoneId);
    this.removeAnchor();
    this.worldRouter.loadZone(route.zoneId, route.spawn);
    this.step = this.manager.currentRouteStep;
    this.beats = [];
    this.revision += 1;
    document.exitPointerLock?.();
    await this.onRouteStep('M9');
    this.panel.render();
    this.panel.root?.classList.add('visible');
    if (this.manager.runSave.runEnded) {
      const { currentIdentity: identity, m9CommittedChoice: selectedIdentity } = this.manager.runSave;
      const type = selectedIdentity === identity ? 'GOOD_END' : 'WRONG_MEMORY_BAD_END';
      const result = { ok: true, type, identity, selectedIdentity };
      this.panel.showEnding(result);
      this.gameState.setFlag('GAME_COMPLETE', type === 'GOOD_END');
      if (type === 'WRONG_MEMORY_BAD_END') await this.onEnding(result);
    } else {
      this.panel.root?.classList.add('ending-open');
      this.panel.root?.querySelector('[data-identity-choices]')?.replaceChildren();
      const body = this.panel.root?.querySelector('[data-identity-detail]');
      if (body) body.textContent = '四段夜班記憶都已找回。四份最後交班已完成，這一輪在此收束。';
      this.gameState.setFlag('GAME_COMPLETE', true);
    }
    this.uiManager.renderTaskBoard('夜班結束', []);
  }

  async loadCurrentStep() {
    this.removeAnchor();
    this.step = this.manager.currentRouteStep;
    const route = ROUTE_STEPS[this.step];
    this.beats = getIdentityRouteScene(this.step, this.manager.currentIdentity);
    this.beatIndex = 0;
    this.lineIndex = -1;
    this.revision += 1;
    if (route.time === '16:50') {
      this.gameState.gameTime = route.time;
      this.gameState.storyTimeIndex = -1;
      this.gameState.notify('time_changed', route.time);
    } else if (route.time) this.gameState.setGameTime(route.time);
    const firstBeat = this.beats[0];
    this.worldRouter.loadZone(firstBeat.zoneId || route.zoneId, firstBeat.spawn || route.spawn);
    await this.onRouteStep(this.step);
    if (this.step === 'B2') {
      if (!this.manager.runSave.b2Entered) this.manager.enterB2();
      this.controller.teleport(0, 1.7, -1, 0);
      this.controller.updateCameraRotation();
      this.worldRouter.activeZoneInstance.beginExitClosure();
    }
    if (this.step === 'M8') this.gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE', true);
    await this.placeBeat();
    this.render();
  }

  async placeBeat() {
    const beat = this.beats[this.beatIndex];
    const zoneId = beat.zoneId || ROUTE_STEPS[this.step].zoneId;
    if (this.worldRouter.activeZoneId !== zoneId) {
      await this.prepareZone(zoneId);
      this.removeAnchor();
      this.worldRouter.loadZone(zoneId, beat.spawn || ROUTE_STEPS[this.step].spawn);
      await this.onRouteStep(this.step);
    } else if (beat.spawn) this.worldRouter.teleportToSpawn(beat.spawn);
    if (beat.room) {
      const zone = this.worldRouter.activeZoneInstance;
      const room = zone.roomAreas.find(item => item.id === beat.room);
      const bed = zone.bedAreas?.find(item => item.id === beat.bed);
      const [x, y, z] = room.point;
      const yaw = bed ? Math.atan2(x - bed.position[0], z - bed.position[2]) : beat.yaw || 0;
      this.controller.teleport(x, y, z, yaw);
    }
    await this.installAnchor();
  }

  photoUrl(beat) {
    return beat.photoId ? `${import.meta.env.BASE_URL}assets/identity-v03/${PHOTO_FILES[beat.photoId]}` : null;
  }

  async installAnchor() {
    this.removeAnchor();
    const beat = this.beats[this.beatIndex];
    const photoUrl = this.photoUrl(beat);
    let texture = photoUrl ? await new THREE.TextureLoader().loadAsync(photoUrl) : null;
    if (!photoUrl && beat.art !== 'coffee') {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 384;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#d8ceb1'; ctx.fillRect(0, 0, 512, 384);
      ctx.strokeStyle = '#716c59'; ctx.strokeRect(18, 18, 476, 348);
      ctx.fillStyle = '#333b31'; ctx.font = 'bold 28px sans-serif';
      ctx.fillText('夜班現場紀錄', 38, 65);
      ctx.font = '22px sans-serif'; ctx.fillText(beat.label, 38, 118, 432);
      for (let y = 166; y < 335; y += 37) {ctx.beginPath();ctx.moveTo(38,y);ctx.lineTo(474,y);ctx.stroke();}
      texture = new THREE.CanvasTexture(canvas);
    }
    if (texture) texture.colorSpace = THREE.SRGBColorSpace;
    const geometry = photoUrl ? new THREE.PlaneGeometry(1.25, 1.25 * 2 / 3) : beat.art === 'coffee'
      ? new THREE.CylinderGeometry(.15, .12, .24, 20) : new THREE.BoxGeometry(.32, .24, .018);
    const material = new THREE.MeshBasicMaterial(texture ? { map: texture, side: THREE.DoubleSide } : { color: beat.art === 'coffee' ? 0x503022 : 0xc2ae76 });
    const anchor = new THREE.Mesh(geometry, material);
    anchor.name = 'identity_route_event';
    const camera = this.worldRouter.camera;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    anchor.position.copy(this.controller.position).addScaledVector(forward, photoUrl ? 1.65 : 1.55);
    if (!photoUrl) anchor.position.y -= .28;
    anchor.quaternion.copy(camera.quaternion);
    anchor.userData = { type: 'identity_route_event', interactable: true, label: beat.label, step: this.step, beatIndex: this.beatIndex, photoUrl, art: beat.art || 'record' };
    this.worldRouter.scene.add(anchor);
    this.controller.interactables.push(anchor);
    this.anchor = anchor;
  }

  removeAnchor() {
    if (!this.anchor) return;
    const index = this.controller.interactables.indexOf(this.anchor);
    if (index >= 0) this.controller.interactables.splice(index, 1);
    this.anchor.removeFromParent();
    this.anchor.geometry.dispose();
    this.anchor.material.map?.dispose();
    this.anchor.material.dispose();
    this.anchor = null;
  }

  handleInteract(interactable) {
    const data = interactable?.userData || interactable;
    if (data?.type !== 'identity_route_event') return false;
    if (!this.busy && !this.manager.runSave.runEnded && data.step === this.step && data.beatIndex === this.beatIndex) this.inspect();
    return true;
  }

  inspect() {
    if (this.busy || this.manager.runSave.runEnded) return;
    document.exitPointerLock?.();
    this.controller.enabled = false;
    if (this.lineIndex < 0) this.lineIndex = 0;
    this.render();
  }

  render() {
    this.panel.render();
    const root = this.panel.root;
    if (!root) return;
    root.classList.add('visible');
    root.dataset.routeStep = this.step;
    const body = root.querySelector('[data-identity-detail]');
    const choices = root.querySelector('[data-identity-choices]');
    choices?.replaceChildren();
    body.replaceChildren();
    const beat = this.beats[this.beatIndex];
    this.uiManager.renderTaskBoard('目前', [{ id: 'identity-route-objective', state: 'active', text: `${ROUTE_STEPS[this.step].label}：${beat.label}` }]);
    const title = document.createElement('h3');
    title.textContent = `${ROUTE_STEPS[this.step].label} · ${beat.label}`;
    body.append(title);
    const progress = document.createElement('p');
    progress.textContent = `現場紀錄 ${this.beatIndex + 1} / ${this.beats.length}`;
    body.append(progress);
    const revision = this.revision;
    const lineIndex = this.lineIndex;
    const beatIndex = this.beatIndex;
    const button = (label, action, routeAction) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'identity-choice';
      node.textContent = label;
      node.dataset.routeAction = routeAction;
      node.addEventListener('click', () => {
        if (this.busy || this.manager.runSave.runEnded || revision !== this.revision || beatIndex !== this.beatIndex || lineIndex !== this.lineIndex) return;
        document.exitPointerLock?.();
        Promise.resolve().then(action).catch(error => {
          console.error('[IdentityRouteDirector] Scene action failed', error);
          this.render();
          const alert = document.createElement('p');
          alert.setAttribute('role', 'alert');
          alert.textContent = '場景未能載入，請再次確認以重試。';
          body.append(alert);
        });
      });
      body.append(node);
    };
    if (this.lineIndex < 0) {
      button(`檢視：${beat.label}`, () => this.inspect(), 'inspect');
      return;
    }
    if (beat.photoId) {
      const img = document.createElement('img');
      img.src = this.photoUrl(beat);
      img.alt = beat.photoId === 'history_group_1998' ? '1998 年夜班團隊合照，攝影者不在畫面中' : '設備合照玻璃中的相機、手腕與拍攝者反射';
      img.style.cssText = 'display:block;width:100%;height:auto;max-height:32vh;object-fit:contain';
      body.append(img);
    }
    for (const line of beat.lines.slice(0, this.lineIndex + 1)) {
      const p = document.createElement('p');
      p.textContent = line;
      body.append(p);
    }
    if (this.lineIndex < beat.lines.length - 1) {
      button('下一段對話', () => { this.lineIndex += 1; this.render(); }, 'next');
    } else {
      button('重新閱讀現場紀錄', () => { this.lineIndex = 0; this.render(); }, 'reread');
      if (beat.puzzle) button(beat.wrong, () => {
        this.gameState.setFlag('M7_WRONG_PROCEDURE_SEEN', true);
        this.render();
        const warning = document.createElement('p');
        warning.setAttribute('role', 'alert');
        warning.textContent = beat.wrongLines.join(' ');
        body.append(warning);
      }, 'wrong');
      button(beat.review, () => this.completeBeat(), 'review');
    }
  }

  async completeBeat() {
    const beat = this.beats[this.beatIndex];
    if (this.busy || this.manager.runSave.runEnded || this.lineIndex !== beat.lines.length - 1) return false;
    if (this.step === 'M9') {
      this.removeAnchor();
      this.controller.enabled = false;
      this.panel.openM9({ onCommit: result => this.finishEnding(result) });
      return true;
    }
    this.busy = true;
    this.controller.enabled = false;
    try {
      if (beat.flag) this.gameState.setFlag(beat.flag, true);
      this.manager.recordEvidence({ id: `route:${this.step}:${this.beatIndex}`, category: 'route', milestone: this.step, visibleText: `${beat.label}：${beat.lines.at(-1)}` });
      if (this.beatIndex + 1 < this.beats.length) {
        this.beatIndex += 1;
        this.lineIndex = -1;
        await this.placeBeat();
        this.render();
      } else {
        const nextStep = this.manager.route[this.manager.route.indexOf(this.step) + 1];
        const nextBeat = getIdentityRouteScene(nextStep, this.manager.currentIdentity)[0];
        await this.prepareZone(nextBeat.zoneId || ROUTE_STEPS[nextStep].zoneId);
        if (!this.manager.completeRouteStep(this.step)) throw new Error('Route completion rejected');
        await this.loadCurrentStep();
      }
      return true;
    } finally {
      this.busy = false;
      this.controller.enabled = !this.manager.runSave.runEnded;
    }
  }

  finishEnding(result) {
    if (!result.ok) return;
    this.removeAnchor();
    this.controller.enabled = false;
    if (result.type === 'GOOD_END') {
      this.gameState.setFlag('FINAL_SUCCESS_RECAP_MANAGED', true);
      this.gameState.setFlag('GAME_COMPLETE', true);
      this.gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE', false);
      this.uiManager.updateTasks();
    }
    return this.onEnding(result);
  }
}
