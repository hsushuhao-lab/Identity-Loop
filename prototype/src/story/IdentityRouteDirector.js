import * as THREE from 'three';
import { ROUTE_STEPS } from './IdentityRoutes.js';
import { getIdentityRouteScene } from './IdentityRouteScenes.js';
import { WORLD_SPAWNS } from '../world/shared/WorldRoutes.js';

const PHOTO_FILES = {
  history_group_1998: 'history-group.png',
  guard_reflection_1998: 'history-reflection.png'
};

const NAVIGATION_TYPES = new Set([
  'access_door',
  'duty_door',
  'ward_gate',
  'acute_gate',
  'elevator',
  'travel_selector',
  'exit_door',
  'closed_door',
  'floor6_safe_return',
  'hidden_service_door_1f',
  'b2_exit_door'
]);

/**
 * V2 uses the original DutyNight world as the interaction surface.
 * The route director must never create a visible generic "quest card" in front
 * of the player. Existing beds, doors, phones, terminals and CCTV stations are
 * preferred. When no suitable source-world object exists, an invisible hitbox
 * is mounted at the contextual prop/bed location.
 */
export class IdentityRouteDirector {
  constructor({ manager, panel, worldRouter, controller, gameState, uiManager, prepareZone, onEnding = () => {}, onRouteStep = () => {} }) {
    Object.assign(this, { manager, panel, worldRouter, controller, gameState, uiManager, prepareZone, onEnding, onRouteStep });
    this.step = null;
    this.beats = [];
    this.beatIndex = 0;
    this.anchor = null;
    this.boundTarget = null;
    this.busy = false;
    this.revision = 0;
    this.autoTimer = null;
    this.awaitingZone = null;
  }

  get currentRouteStep() { return this.step; }
  get currentScene() { return this.step ? { step: this.step, ...ROUTE_STEPS[this.step], beats: this.beats } : null; }
  get currentBeat() { return this.beats[this.beatIndex] ? { ...this.beats[this.beatIndex], index: this.beatIndex } : null; }

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
      await this.loadCurrentStep({ forceLoad: true });
      return true;
    } finally {
      this.busy = false;
      this.controller.enabled = !finalState;
    }
  }

  async restoreEnding() {
    const route = ROUTE_STEPS.M9;
    await this.prepareZone(route.zoneId);
    this.removeInteractionTarget();
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

  async loadCurrentStep({ forceLoad = true } = {}) {
    this.removeInteractionTarget();
    this.step = this.manager.currentRouteStep;
    const route = ROUTE_STEPS[this.step];
    this.beats = getIdentityRouteScene(this.step, this.manager.currentIdentity);
    this.beatIndex = 0;
    this.revision += 1;
    this.awaitingZone = null;

    if (route.time === '16:50') {
      this.gameState.gameTime = route.time;
      this.gameState.storyTimeIndex = -1;
      this.gameState.notify('time_changed', route.time);
    } else if (route.time) {
      this.gameState.setGameTime(route.time);
    }

    if (this.step === 'M6') {
      // M6 must be reached by a real elevator hijack, never by selecting 6F.
      this.gameState.setFlag('FLOOR6_AVAILABLE', true);
      this.gameState.setFlag('M6_FLOOR6_RESOLVED', false);
    }

    // The evidence panel is a journal/deduction surface, not the dialogue box.
    if (!['B2', 'M9'].includes(this.step)) {
      this.panel.root?.classList.remove('visible', 'archive-open', 'm9-open');
    }

    await this.onRouteStep(this.step);

    const firstBeat = this.beats[0];
    const targetZone = firstBeat.zoneId || route.zoneId;
    if (forceLoad && this.worldRouter.activeZoneId !== targetZone) {
      await this.prepareZone(targetZone);
      this.worldRouter.loadZone(targetZone, firstBeat.spawn || route.spawn);
    }

    if (this.worldRouter.activeZoneId === targetZone) {
      await this.onArriveTargetZone();
    } else {
      this.awaitingZone = targetZone;
      this.renderObjective();
    }
  }

  async onArriveTargetZone() {
    this.awaitingZone = null;
    if (this.step === 'B2') {
      if (!this.manager.runSave.b2Entered) this.manager.enterB2();
      this.worldRouter.activeZoneInstance?.beginExitClosure?.();
    }
    if (this.step === 'M8') this.gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE', true);
    await this.placeBeat({ forceLoad: false });
    this.renderObjective();
  }

  update() {
    if (
      this.awaitingZone &&
      !this.busy &&
      !this.manager.runSave.runEnded &&
      this.worldRouter.activeZoneId === this.awaitingZone
    ) {
      void this.onArriveTargetZone().catch(error => console.error('[IdentityRouteDirector] arrival binding failed', error));
    }
  }

  bindingFor(step = this.step, index = this.beatIndex) {
    const identity = this.manager.currentIdentity;
    if (step === 'ZHANG_OPEN_4F') return { auto: true };
    if (step === 'ZHOU_OPEN_8F') return index === 0
      ? { id: 'IDENTITY_HISTORY_GROUP_PHOTO', prompt: '查看院史長廊大型合照' }
      : { auto: true };
    if (step === 'CHEN_OPEN_SKYBRIDGE') return { auto: true };

    if (step === 'M1') {
      if (index === 0) return { auto: true };
      if (index === 1) return { type: 'workstation', prompt: '使用 316 電腦核對名冊與 HIS' };
      if (identity === 'ZHANG' && index === 2) return { type: 'office_phone_316', prompt: '接起 316 電話' };
    }

    if (step === 'M2') {
      if (index === 0) return { auto: true };
      if (index === 1 || index === 2) return { contextual: true, prompt: index === 1 ? '和 403 病人確認今晚狀況' : '查看 408C 與隔壁聲音' };
      if (index === 3) return { id: 'BED33_409_SEALED', prompt: '靠近 409 確認敲擊來源' };
      if (index === 4) return { id: 'BED33_ASSIGNMENT', prompt: '查看 409-A／Bed 33 臨時床位單' };
      if (identity === 'ZHANG' && index === 5) return { contextual: true, useSpawn: true, prompt: '回護理站向護理師確認' };
    }

    if (step === 'M3') {
      if (index === 0) return { id: '2F_JANE_DOE_ASSESSMENT', prompt: '評估急診身分待確認男性' };
      if (index === 1) return { id: 'ER_GHOST_REGISTRATION', prompt: '查詢 00:33 異常掛號' };
      if (index === 2) return { type: 'legacy_terminal_316', prompt: '在 316 舊終端查詢 Legacy Index' };
    }

    if (step === 'M4') {
      if (index === 0) return { id: 'SECOND_CHEST_PATIENT', prompt: '評估 504B 胸痛病人' };
      if (index === 1) return { id: 'SECOND_CHEST_TRANSFER', prompt: '查看 504B 預填轉院單' };
    }

    if (step === 'ZHANG_SECOND_CAMPUS_SECURITY') {
      return index === 0
        ? { id: 'IDENTITY_SECOND_GUARD_COFFEE', prompt: '查看警衛桌上的黑咖啡' }
        : { id: 'IDENTITY_SECOND_GUARD_LOGBOOK', prompt: '翻閱警衛訪客簿' };
    }

    if (step === 'M5') {
      if (index === 0) return { id: 'SECOND_2F_CCTV_SELF', prompt: '查看第二院區監視畫面' };
      if (index === 1) return { id: 'BRIDGE_LOOP_EVENT', prompt: '走到天橋中段，確認異常回聲與白袍人影' };
    }

    if (step === 'ZHANG_6F_FORESHADOW') return { auto: true };

    if (step === 'ZHOU_1F_PHOTO') {
      return { id: 'IDENTITY_GUARD_REFLECTION_PHOTO', prompt: '查看警衛台上的事故前設備照片' };
    }

    if (step === 'ZHOU_SECURITY_TALK') return { id: 'OLD_GUARD_POST', prompt: '和警衛談談老照片' };
    if (step === 'ZHOU_2117_RETURN') return { id: 'GUARD_SIGN_2117', prompt: '查看 21:17 查哨板' };

    if (step === 'M6') {
      if (index === 0) return { auto: true };
      if (index === 1) return { id: 'FLOOR6_STETHOSCOPE_SEARCH', prompt: '靠近焦黑器材與記憶錨點' };
    }

    if (step === 'M7') {
      if (index === 0) return { id: 'OLD_GUARD_POST', prompt: '檢查一樓舊警衛台與十字鑰匙' };
      return { id: '1F_HIDDEN_SERVICE_DOOR', prompt: index === 1 ? '查看警衛台後的 B-Panel 舊門框' : '操作 B-Panel 備援控制' };
    }

    if (step === 'B2') {
      if (index === 0) return { auto: true };
      if (index === 1) return { id: 'B2_ARCHIVE_TERMINAL', prompt: '啟動 B2 封存驗證終端' };
    }

    if (step === 'M8') return { auto: true };
    if (step === 'M9') return { type: 'legacy_terminal_316', prompt: '使用 316 舊終端完成最後交班' };

    return { contextual: true, fromSpawn: true, distance: 1.45, prompt: this.beats[index]?.review || this.beats[index]?.label || '查看' };
  }

  findExistingTarget(binding) {
    if (!binding?.id && !binding?.type) return null;
    const list = this.worldRouter.activeZoneInstance?.interactables || this.controller.interactables || [];
    const candidates = list.filter(object => {
      const data = object?.userData || object;
      return (!binding.id || data.id === binding.id) && (!binding.type || data.type === binding.type);
    });
    if (!candidates.length) return null;
    const p = this.controller.position;
    candidates.sort((a, b) => {
      const pa = a.getWorldPosition ? a.getWorldPosition(new THREE.Vector3()) : a.position || new THREE.Vector3();
      const pb = b.getWorldPosition ? b.getWorldPosition(new THREE.Vector3()) : b.position || new THREE.Vector3();
      return pa.distanceToSquared(p) - pb.distanceToSquared(p);
    });
    return candidates[0];
  }

  targetPosition(beat, binding) {
    if (binding.point) return new THREE.Vector3(...binding.point);

    const zone = this.worldRouter.activeZoneInstance;
    if (beat.bed) {
      const bed = zone?.bedAreas?.find(item => item.id === beat.bed);
      if (bed?.position) return new THREE.Vector3(bed.position[0], 1.15, bed.position[2]);
    }
    if (beat.room) {
      const room = zone?.roomAreas?.find(item => item.id === beat.room);
      if (room?.point) return new THREE.Vector3(room.point[0], 1.15, room.point[2]);
    }

    const spawnId = binding.useSpawn ? beat.spawn : (beat.spawn || ROUTE_STEPS[this.step].spawn);
    const spawn = WORLD_SPAWNS[spawnId];
    if (spawn?.pos) {
      const position = new THREE.Vector3(...spawn.pos);
      if (binding.fromSpawn) {
        const yaw = spawn.yaw || 0;
        const distance = binding.distance || 1.5;
        position.x += -Math.sin(yaw) * distance;
        position.z += -Math.cos(yaw) * distance;
        position.y = 1.45;
      }
      return position;
    }

    const forward = new THREE.Vector3();
    this.worldRouter.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    return this.controller.position.clone().addScaledVector(forward, binding.distance || 1.5);
  }

  async placeBeat({ forceLoad = false } = {}) {
    this.removeInteractionTarget();
    const beat = this.beats[this.beatIndex];
    const route = ROUTE_STEPS[this.step];
    const zoneId = beat.zoneId || route.zoneId;

    if (this.worldRouter.activeZoneId !== zoneId) {
      if (forceLoad) {
        await this.prepareZone(zoneId);
        this.worldRouter.loadZone(zoneId, beat.spawn || route.spawn);
      } else {
        this.awaitingZone = zoneId;
        this.renderObjective();
        return;
      }
    }

    this.awaitingZone = null;
    const binding = this.bindingFor();
    const existing = this.findExistingTarget(binding);
    if (existing) {
      const data = existing.userData || existing;
      this.boundTarget = {
        object: existing,
        originalInteractable: data.interactable,
        originalLabel: data.label
      };
      data.interactable = true;
      data.label = binding.prompt || beat.review || beat.label;
    } else if (binding.contextual || binding.photo || binding.art) {
      await this.installContextTarget(binding);
    }

    this.renderObjective();

    if (binding.auto) {
      clearTimeout(this.autoTimer);
      this.autoTimer = setTimeout(() => {
        if (!this.busy && !this.manager.runSave.runEnded) this.inspect();
      }, 180);
    }
  }

  photoUrl(beat) {
    return beat.photoId ? `${import.meta.env.BASE_URL}assets/identity-v03/${PHOTO_FILES[beat.photoId]}` : null;
  }

  async installContextTarget(binding) {
    const beat = this.beats[this.beatIndex];
    const photoUrl = this.photoUrl(beat);
    const position = this.targetPosition(beat, binding);

    let geometry;
    let material;

    if (photoUrl || binding.photo) {
      const texture = photoUrl ? await new THREE.TextureLoader().loadAsync(photoUrl) : null;
      if (texture) texture.colorSpace = THREE.SRGBColorSpace;
      geometry = new THREE.PlaneGeometry(1.25, 1.25 * 2 / 3);
      material = texture
        ? new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide })
        : new THREE.MeshStandardMaterial({ color: 0x625a48, roughness: .9, side: THREE.DoubleSide });
    } else if (binding.art === 'coffee' || beat.art === 'coffee') {
      geometry = new THREE.CylinderGeometry(.11, .09, .18, 18);
      material = new THREE.MeshStandardMaterial({ color: 0x4c2d1c, roughness: .82 });
    } else {
      geometry = new THREE.BoxGeometry(.85, 1.35, .55);
      material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    }

    const anchor = new THREE.Mesh(geometry, material);
    anchor.name = `IdentityContextTarget_${this.step}_${this.beatIndex}`;
    anchor.position.copy(position);

    if (photoUrl || binding.photo) {
      anchor.position.y = Math.max(anchor.position.y, 1.45);
      anchor.lookAt(this.controller.position.x, anchor.position.y, this.controller.position.z);
    } else if (binding.art === 'coffee' || beat.art === 'coffee') {
      anchor.position.y = Math.max(.95, anchor.position.y);
    }

    anchor.userData = {
      type: 'identity_route_context_event',
      interactable: true,
      label: binding.prompt || beat.review || beat.label,
      step: this.step,
      beatIndex: this.beatIndex
    };

    this.worldRouter.scene.add(anchor);
    this.controller.interactables.push(anchor);
    this.anchor = anchor;
  }

  releaseBoundTarget() {
    if (!this.boundTarget) return;
    const { object, originalInteractable, originalLabel } = this.boundTarget;
    const data = object?.userData || object;
    if (data) {
      data.interactable = originalInteractable;
      data.label = originalLabel;
    }
    this.boundTarget = null;
  }

  removeInteractionTarget() {
    clearTimeout(this.autoTimer);
    this.autoTimer = null;
    this.releaseBoundTarget();
    if (!this.anchor) return;
    const index = this.controller.interactables.indexOf(this.anchor);
    if (index >= 0) this.controller.interactables.splice(index, 1);
    this.anchor.removeFromParent();
    this.anchor.geometry?.dispose?.();
    this.anchor.material?.map?.dispose?.();
    this.anchor.material?.dispose?.();
    this.anchor = null;
  }

  matchesBinding(data) {
    const binding = this.bindingFor();
    if (binding.id && data?.id === binding.id) return true;
    if (binding.type && data?.type === binding.type) return true;
    return data?.type === 'identity_route_context_event' &&
      data?.step === this.step &&
      data?.beatIndex === this.beatIndex;
  }

  handleInteract(interactable) {
    const data = interactable?.userData || interactable;
    if (!data) return false;
    if (!this.matchesBinding(data)) return false;
    if (!this.busy && !this.manager.runSave.runEnded) this.inspect();
    return true;
  }

  allowWorldInteraction(interactable) {
    const data = interactable?.userData || interactable;
    return NAVIGATION_TYPES.has(data?.type);
  }

  dialogueLines(beat) {
    return beat.lines.map(raw => {
      const text = String(raw).trim();
      const match = text.match(/^([^：]{1,18})：「?(.+?)」?$/);
      if (match) {
        const speaker = match[1] === '我' ? '值班醫師' : match[1];
        const spoken = match[2].startsWith('「') ? match[2] : `「${match[2]}」`;
        return { speaker, text: spoken };
      }
      if (/^(我|玩家)/.test(text)) return { speaker: '值班醫師', text };
      if (/護理師|學長|警衛|第二院區|急診/.test(text)) return { speaker: '現場', text };
      return { speaker: /記得|熟悉|回聲|閃|心跳|手指|身體/.test(text) ? '記憶' : '現場', text };
    });
  }

  inspect() {
    if (this.busy || this.manager.runSave.runEnded) return;
    const beat = this.beats[this.beatIndex];
    if (!beat) return;
    document.exitPointerLock?.();
    this.controller.enabled = false;

    this.uiManager.showDialogue(this.dialogueLines(beat), () => {
      if (beat.puzzle) {
        this.uiManager.openStoryChoice({
          title: 'B-Panel 備援控制',
          body: '舊手冊要求 1 → 3 → 4；現場紀錄卻顯示這個順序會鎖死防火門並停止排煙。你要採取哪個操作？',
          primaryText: '啟動紫色備援排煙',
          secondaryText: '依舊手冊拉下 1 → 3 → 4',
          onPrimary: () => {
            this.uiManager.closeStoryChoice(false);
            void this.completeBeat();
          },
          onSecondary: () => {
            this.uiManager.closeStoryChoice(false);
            this.gameState.setFlag('M7_WRONG_PROCEDURE_SEEN', true);
            this.uiManager.showDialogue(
              (beat.wrongLines || ['防火門鎖死，排煙停止。這正是歷史錯誤。']).map(text => ({ speaker: '現場', text })),
              () => { this.controller.enabled = true; this.renderObjective(); }
            );
          }
        });
        return;
      }
      void this.completeBeat();
    });
  }

  renderObjective() {
    this.panel.render();
    const beat = this.beats[this.beatIndex];
    if (!beat || !this.step) return;
    const zoneLabels = {
      first_campus_1f: '第一院區 1F',
      first_campus_2f: '第一院區 2F 急診',
      first_campus_3f: '第一院區 3F',
      first_campus_4f: '第一院區 4F',
      first_campus_8f: '第一院區 8F',
      second_campus_1f: '第二院區 1F',
      second_campus_2f: '第二院區 2F',
      second_campus_5f: '第二院區 5F',
      skybridge: '空中天橋',
      phantom_6f: '異常樓層',
      b2_archive: 'B2 封存層'
    };
    const objective = this.awaitingZone
      ? `前往${zoneLabels[this.awaitingZone] || '下一個區域'}｜${ROUTE_STEPS[this.step].label}`
      : (beat.review || beat.label);
    this.uiManager.renderTaskBoard('目前任務', [
      {
        id: 'identity-route-objective',
        state: 'active',
        text: objective
      }
    ]);
  }

  async completeBeat() {
    const beat = this.beats[this.beatIndex];
    if (!beat || this.busy || this.manager.runSave.runEnded) return false;

    if (this.step === 'M9') {
      this.removeInteractionTarget();
      this.controller.enabled = false;
      this.panel.openM9({ onCommit: result => this.finishEnding(result) });
      return true;
    }

    this.busy = true;
    this.controller.enabled = false;
    this.removeInteractionTarget();

    try {
      if (beat.flag) this.gameState.setFlag(beat.flag, true);

      // Compatibility flags let the original physical doors/elevators remain the
      // actual traversal mechanism while V2 owns the narrative state.
      if (this.step === 'M6' && this.beatIndex === this.beats.length - 1) {
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_FOUND', true);
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_INSPECTED', true);
        this.gameState.setFlag('M6_FLOOR6_RESOLVED', true);
      }
      if (this.step === 'M7' && this.beatIndex === 0) {
        this.gameState.setFlag('FIRST_FLOOR_GUARD_KEY', true);
        this.gameState.setFlag('HIDDEN_SERVICE_DOOR_DISCOVERED', true);
        this.worldRouter.activeZoneInstance?.syncStoryState?.();
      }
      if (this.step === 'B2' && this.beatIndex === 1) {
        this.gameState.setFlag('B2_TERMINAL_CONTACTED', true);
        this.gameState.setFlag('B2_FIRE_RECAP_SEEN', true);
        this.gameState.setFlag('RECORD_OVERWRITE_ACTIVE', true);
      }

      this.manager.recordEvidence({
        id: `route:${this.step}:${this.beatIndex}`,
        category: 'route',
        milestone: this.step,
        visibleText: `${beat.label}：${beat.lines.at(-1)}`
      });

      if (this.step === 'B2' && this.beatIndex === 0) {
        this.panel.openB2Archive();
      }

      if (this.beatIndex + 1 < this.beats.length) {
        this.beatIndex += 1;
        await this.placeBeat({ forceLoad: false });
      } else {
        const nextStep = this.manager.route[this.manager.route.indexOf(this.step) + 1];
        if (!this.manager.completeRouteStep(this.step)) throw new Error('Route completion rejected');
        if (nextStep) await this.loadCurrentStep({ forceLoad: false });
      }

      return true;
    } finally {
      this.busy = false;
      this.controller.enabled = !this.manager.runSave.runEnded && !this.uiManager.dialogueSequence;
      this.renderObjective();
    }
  }

  qaInteractCurrentBeat() {
    if (this.busy || this.manager.runSave.runEnded || this.uiManager.dialogueSequence) return false;
    const binding = this.bindingFor();
    if (binding.auto) {
      this.inspect();
      return true;
    }
    const target = this.boundTarget?.object || this.anchor;
    if (!target) return false;
    return this.handleInteract(target.userData || target);
  }

  qaInteractionState() {
    const binding = this.bindingFor();
    return {
      step: this.step,
      beatIndex: this.beatIndex,
      auto: binding.auto === true,
      boundToWorldObject: !!this.boundTarget,
      contextualHitbox: !!this.anchor,
      visibleSyntheticQuestCard: this.anchor?.name?.startsWith('identity_route_event') === true,
      targetId: (this.boundTarget?.object?.userData || this.boundTarget?.object)?.id || this.anchor?.userData?.label || null
    };
  }

  finishEnding(result) {
    if (!result.ok) return;
    this.removeInteractionTarget();
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
