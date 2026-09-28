import * as THREE from 'three';
import { ROUTE_STEPS } from './IdentityRoutes.js';
import { getIdentityRouteScene } from './IdentityRouteScenes.js';
import { WORLD_SPAWNS } from '../world/shared/WorldRoutes.js';
import { soundManager } from '../audio/SoundManager.js';

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
  'b2_exit_door',
  'office_316_door',
  'spare_key_316'
]);

// During Identity Loop, exploration should remain open. Only world interactions
// that can advance/overwrite a main story state are blocked when they are not
// the current route target. Posters, photos, documents and ordinary props stay usable.
const IDENTITY_STORY_CRITICAL_TYPES = new Set([
  'identity_nurse_station_4f',
  'identity_second_5f_nurse_station',
  'key',
  'duty_log',
  'workstation',
  'legacy_terminal_316',
  'office_phone_316',
  'story_phone',
  'second_chest_patient',
  'second_chest_transfer',
  'security_monitor_anomaly',
  'bridge_loop_event',
  'floor6_stethoscope_search',
  'floor6_stethoscope_inspect',
  'guard_post_inspection',
  'b2_archive_terminal',
  'er_ghost_registration',
  'guard_sign_2117',
  'guard_book_2117',
  'p1_action',
  'identity_route_context_event',
  'credential_drawer_316',
  'locker_316',
  'bed33_409_sealed',
  'bed33_assignment',
  'identity_cctv_phone'
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
    this.m1GateState = null;
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
    this.m1EntryTriggered = false;

    if (route.time === '16:50') {
      this.gameState.gameTime = route.time;
      this.gameState.storyTimeIndex = -1;
      this.gameState.notify('time_changed', route.time);
    } else if (route.time) {
      this.gameState.setGameTime(route.time);
    }

    if(this.manager.runSave.completedStoryModules.includes('M1')){
      this.ensureIdentityDutyAccess();
    }

    if(this.step==='ZHANG_3F_ARCHIVE'){
      this.gameState.setFlag('ARCHIVE_ACCESS_KEY',true);
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

  ensureIdentityDutyAccess() {
    // Once M1 handoff is complete, V2 must not inherit V1's locker/HIS gates.
    // Keep legacy flags/tasks synchronized so reloads and later 316 visits never
    // strand the player without the duty keys/access card needed for 4F.
    this.gameState.setFlag('FOUND_316_SPARE_KEY', true);
    this.gameState.setFlag('OPENED_316', true);
    this.gameState.setFlag('STAFF_ACCESS_CARD', true);
    this.gameState.setFlag('ZHANG_4F_SPARE_KEY_BORROWED', false);
    this.gameState.setFlag('IDENTITY_4F_TEMP_ACCESS_CARD', false);
    for(const task of ['KEY_PICKUP','DUTY_LOG','E_HANDOFF']){
      if(!this.gameState.isTaskComplete(task)) this.gameState.markTaskComplete(task);
    }
    this.gameState.setFlag('P1_316_COMPLETE', true);
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
    if(
      this.step==='M5' &&
      this.manager.currentIdentity==='ZHANG' &&
      this.beatIndex===2 &&
      this.gameState.getFlag('BRIDGE_REFLECTION_NOTICE_PENDING') &&
      !this.busy &&
      !this.uiManager.dialogueSequence
    ){
      this.gameState.setFlag('BRIDGE_REFLECTION_NOTICE_PENDING',false);
      this.gameState.setFlag('BRIDGE_REFLECTION_NOTICE_SEEN',true);
      this.inspect();
      return;
    }

    if(this.gameState.getFlag('BRIDGE_OVERRIDE_PENDING')&&!this.manager.runSave.runEnded){
      this.gameState.setFlag('BRIDGE_OVERRIDE_PENDING',false);
      this.gameState.setFlag('BRIDGE_NO_LOOKBACK_RULE_ACTIVE',false);
      this.gameState.setFlag('BRIDGE_MANUAL_LOOKBACK_AFTER_SAFE_CHOICE',false);
      this.gameState.setFlag('BRIDGE_LOOKBACK_FAILURE',true);
      this.controller.enabled=false;
      this.onEnding({type:'BAD_END',reason:'BRIDGE_MANUAL_LOOKBACK_PATIENTIZATION'});
      return;
    }

    if (
      this.awaitingZone &&
      !this.busy &&
      !this.manager.runSave.runEnded &&
      this.worldRouter.activeZoneId === this.awaitingZone
    ) {
      void this.onArriveTargetZone().catch(error => console.error('[IdentityRouteDirector] arrival binding failed', error));
      return;
    }

    const currentBinding=this.bindingFor();
    if(
      currentBinding?.passthrough &&
      this.bindingCompletionReady(currentBinding) &&
      !this.busy &&
      !this.manager.runSave.runEnded
    ){
      void this.completeBeat();
      return;
    }

    if(this.step==='M1'&&!this.awaitingZone){
      const gateState=!this.gameState.getFlag('FOUND_316_SPARE_KEY')
        ? 'GET_KEY'
        : !this.gameState.getFlag('OPENED_316')
          ? 'OPEN_DOOR'
          : 'ENTER_OFFICE';
      if(gateState!==this.m1GateState){
        this.m1GateState=gateState;
        this.renderObjective();
      }
    }

    // M1 handoff is spatial, not a desk checklist. The player begins outside
    // 316, gets the spare key from the real patrol checkpoint, opens the real
    // office door, and completes handoff only after physically crossing inside.
    if (
      this.step === 'M1' &&
      this.beatIndex === 0 &&
      !this.m1EntryTriggered &&
      !this.busy &&
      this.controller.enabled &&
      this.worldRouter.activeZoneId === 'first_campus_3f' &&
      this.gameState.getFlag('OPENED_316')
    ) {
      const p=this.controller.position;
      if(p.x>3.2&&p.x<10.8&&p.z>2.8&&p.z<8.2){
        this.m1EntryTriggered=true;
        this.inspect();
      }
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
      if(index===0) return { officeEntry:true };
      if(index===1) return { id:'DUTY_LOG', prompt:'打開並簽署 316 值班簿', passthrough:true, completeTask:'DUTY_LOG' };
      if(index===2) return { type:'credential_drawer_316', prompt:'打開活動櫃取得 HIS 登入卡', passthrough:true, completeFlag:'HIS_CREDENTIALS' };
      if(index===3) return { type:'workstation', prompt:'使用 316 HIS 工作站完成電子交班', passthrough:true, completeTask:'E_HANDOFF' };
      if(index===4) return { type:'locker_316', prompt:'在電子櫃輸入 1700 解鎖', passthrough:true, completeFlag:'LOCKER_OPENED' };
      if(index===5) return { id:'KEY_PICKUP', prompt:'從電子櫃內拿取正式值班鑰匙與感應卡', passthrough:true, completeTask:'KEY_PICKUP' };
      if(identity==='ZHANG'&&index===6) return { id:'316_PHONE', prompt:'接聽正在響的 316 電話' };
    }

    if(step==='ZHANG_OUTBOUND_8F'){
      return { auto:true };
    }

    if (step === 'M2') {
      if (index === 0) return {
        id: 'IDENTITY_4F_NURSE_STATION',
        prompt: identity==='ZHANG'
          ? '使用護理站電腦聯絡晚班護理師，領取 4F 備用鑰匙與臨時感應卡'
          : '使用護理站電腦聯絡晚班護理師，確認 408C 狀況'
      };
      if (index === 1) return { id: '408C_BED_PLAQUE', prompt: '到 408C 確認敲牆聲' };
      if (index === 2) return { id: 'BED33_409_SEALED', prompt: '確認 409 封閉房與敲擊來源' };
      if (index === 3) return {
        id:'BED33_ASSIGNMENT',
        prompt:'回護理站確認 409-A／Bed 33 臨時床位分配單',
        passthrough:true,
        completeFlag:'BED33_RESOLVED'
      };
    }

    if (step === 'M3') {
      if (index === 0) return { id: '2F_JANE_DOE_ASSESSMENT', prompt: '評估急診身分待確認男性' };
      if (index === 1) return { id: 'ER_GHOST_REGISTRATION', prompt: '查詢 00:33 異常掛號' };
      if (index === 2) return {
        type:'legacy_terminal_316',
        prompt:'在 316 舊終端查詢 1998-ER-0217',
        passthrough:true,
        completeFlag:'M3_316_DECODED'
      };
    }

    if (step === 'M4') {
      if (index === 0) return {
        id: 'IDENTITY_SECOND_5F_NURSE_STATION',
        prompt: (identity==='ZHOU'||identity==='CHEN')
          ? '使用 5F 護理站電腦聯絡護理師，借會診備用鑰匙'
          : '使用 5F 護理站電腦完成聯絡報到'
      };
      if (index === 1) return { id: 'SECOND_CHEST_PATIENT', prompt: '評估 504B 胸痛病人' };
      if (index === 2) return { id: 'SECOND_CHEST_TRANSFER', prompt: '查看 504B 預填轉院單' };
      if (index === 3) return {
        id: 'IDENTITY_SECOND_5F_NURSE_STATION',
        prompt: (identity==='ZHOU'||identity==='CHEN')
          ? '回 5F 護理站電腦聯絡護理師並歸還會診備用鑰匙'
          : '回 5F 護理站電腦回報 504B 處置'
      };
      if(index===4) return { auto:true };
    }

    if (step === 'ZHANG_SECOND_CAMPUS_SECURITY') {
      return { id:'IDENTITY_SECOND_GUARD_COFFEE', prompt:'到一樓警衛台喝咖啡並詢問監控異常' };
    }

    if (step === 'M5') {
      if(index===0) return { id:'SECOND_2F_CCTV_DESK', prompt:'使用桌上監控電腦查看即時異常' };
      if(identity==='ZHANG'){
        if(index===1) return { id:'IDENTITY_SECOND_2F_CCTV_PHONE', prompt:'接聽正在響的監控室電話' };
        if(index===2) return { proximityBridge:true, prompt:'穿越天橋返回第一院區；保持視線向前' };
      }
      if(index===1) return { id:'BRIDGE_LOOP_EVENT', prompt:'走到天橋中段，確認異常回聲與白袍人影' };
    }

    if (step === 'ZHANG_6F_FORESHADOW') return { id: 'IDENTITY_6F_DISPLAY', prompt: '查看電梯樓層顯示' };

    if (step === 'ZHOU_1F_PHOTO') {
      return { id: 'IDENTITY_GUARD_REFLECTION_PHOTO', prompt: '查看警衛台旁牆上的事故前設備照片' };
    }

    if (step === 'ZHOU_SECURITY_TALK') {
      if(index===0) return { id: 'OLD_GUARD_POST', prompt: '回警衛台詢問老照片' };
      return { id: 'IDENTITY_GUARD_PHONE', prompt: '接聽正在響的警衛台電話' };
    }
    if (step === 'ZHOU_2117_RETURN') return { id: 'GUARD_SIGN_2117', prompt: '查看 21:17 查哨板' };

    if (step === 'M6') {
      if(identity==='ZHANG'){
        if(index===0) return { auto:true };
        return {
          id:'FLOOR6_SAFE_RETURN',
          prompt:'回到電梯前，離開 6F 前往一樓警衛台',
          passthrough:true,
          completeFlag:'SECURITY_RECORD_OBJECTIVE'
        };
      }
      if (index === 0) return { auto: true };
      if (index === 1) return { id: 'FLOOR6_STETHOSCOPE_SEARCH', prompt: '靠近焦黑器材與記憶錨點' };
    }

    if (step === 'M7') {
      if(identity==='ZHANG'){
        if(index===0) return { id:'IDENTITY_GUARD_REFLECTION_PHOTO', prompt:'查看警衛台後方牆上的舊照片' };
        if(index===1) return { id:'OLD_GUARD_POST', prompt:'檢查警衛台並取得 B-Panel 十字鑰匙' };
        return { id:'1F_HIDDEN_SERVICE_DOOR', prompt:index===2?'查看警衛台後的 B-Panel 舊門框':'操作 B-Panel 備援控制' };
      }
      if (index === 0) return { id: 'OLD_GUARD_POST', prompt: '檢查一樓舊警衛台與十字鑰匙' };
      return { id: '1F_HIDDEN_SERVICE_DOOR', prompt: index === 1 ? '查看警衛台後的 B-Panel 舊門框' : '操作 B-Panel 備援控制' };
    }

    if (step === 'B2') {
      if (index === 0) return { auto: true };
      if (index === 1) return {
        id:'B2_ARCHIVE_TERMINAL',
        prompt:'使用 B2 封存終端讀取火災紀錄',
        passthrough:true,
        completeFlag:'B2_FIRE_RECAP_SEEN'
      };
    }

    if(step==='ZHANG_3F_ARCHIVE'){
      if(index===0) return {
        id:'ARCHIVE_HISTORY_PHOTO_WALL',
        prompt:'查看文史館院史影像牆',
        passthrough:true,
        completeFlag:'ARCHIVE_HISTORY_WALL_REVIEWED'
      };
      return {
        id:'ARCHIVE_PERSONNEL_1998',
        prompt:'翻閱 1998 夜班核心人員名錄',
        passthrough:true,
        completeFlag:'HISTORY_PERSONNEL_PROFILES_REVIEWED'
      };
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

    if(this.worldRouter.activeZoneId==='first_campus_3f'){
      this.worldRouter.activeZoneInstance?.setIdentityDutyItemsVisible?.(
        this.step==='M1' && this.beatIndex===5 && this.gameState.getFlag('LOCKER_OPENED')
      );
    }
    if(this.worldRouter.activeZoneId==='first_campus_4f'){
      this.worldRouter.activeZoneInstance?.setIdentityWardSpareKeyBorrowed?.(
        this.gameState.getFlag('ZHANG_4F_SPARE_KEY_BORROWED')
      );
    }
    if(this.worldRouter.activeZoneId==='second_campus_5f'){
      this.worldRouter.activeZoneInstance?.setIdentitySecondConsultKeyBorrowed?.(
        this.gameState.getFlag('SECOND_5F_CONSULT_KEY_BORROWED')
      );
    }

    if(this.step==='ZHOU_SECURITY_TALK'&&this.beatIndex===1){
      this.gameState.setFlag('PHONE_CALL_KIND','IDENTITY_ZHOU_ER');
      this.gameState.setFlag('PHONE_ANSWERED',false);
      this.gameState.setFlag('PHONE_RING_ACTIVE',true);
    }
    if(this.step==='M1'&&this.manager.currentIdentity==='ZHANG'&&this.beatIndex===6){
      this.gameState.setFlag('PHONE_CALL_KIND','IDENTITY_ZHANG_SECOND_CAMPUS');
      this.gameState.setFlag('PHONE_ANSWERED',false);
      this.gameState.setFlag('PHONE_RING_ACTIVE',true);
    }
    if(this.step==='M5'&&this.manager.currentIdentity==='ZHANG'&&this.beatIndex===1){
      this.gameState.setFlag('PHONE_CALL_KIND','IDENTITY_ZHANG_ER_FROM_CCTV');
      this.gameState.setFlag('PHONE_ANSWERED',false);
      this.gameState.setFlag('PHONE_RING_ACTIVE',true);
    }

    const binding = this.bindingFor();
    if (binding.officeEntry || binding.proximityBridge) {
      this.renderObjective();
      return;
    }

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

  bindingCompletionReady(binding=this.bindingFor()) {
    if(binding?.completeTask) return this.gameState.isTaskComplete(binding.completeTask);
    if(binding?.completeFlag) return this.gameState.getFlag(binding.completeFlag)===true;
    return false;
  }

  handleInteract(interactable) {
    const data = interactable?.userData || interactable;
    if (!data) return false;
    if (!this.matchesBinding(data)) return false;
    const binding=this.bindingFor();
    if(binding?.passthrough) return false;
    if (!this.busy && !this.manager.runSave.runEnded) this.inspect();
    return true;
  }

  allowWorldInteraction(interactable) {
    const data = interactable?.userData || interactable;
    if (NAVIGATION_TYPES.has(data?.type)) return true;
    const binding=this.bindingFor();
    if(binding?.passthrough && this.matchesBinding(data)) return true;
    return !IDENTITY_STORY_CRITICAL_TYPES.has(data?.type);
  }

  dialogueLines(beat) {
    return beat.lines.map(raw => {
      if (raw && typeof raw === 'object') return raw;
      const text = String(raw).trim();
      const match = text.match(/^([^：]{1,18})：「?(.+?)」?$/);
      if (match) {
        const speaker = match[1] === '我' ? '值班醫師' : match[1];
        const spoken = match[2].startsWith('「') ? match[2] : `「${match[2]}」`;
        return { speaker, text: spoken };
      }
      if (/^(我|玩家)/.test(text)) return { speaker: '值班醫師', text };
      if (/護理師|學長|警衛|第二院區|急診/.test(text)) return { speaker: '現場', text };
      return { speaker: /記得|熟悉|回聲|閃|心跳|手指|身體|為什麼/.test(text) ? '內心' : '現場', text };
    });
  }

  playAutoMemorySequence(sequence,onComplete,{interval=900,hold=850}={}){
    let timer=null;
    let closing=false;
    this.busy=true;
    const done=()=>{
      this.busy=false;
      onComplete?.();
    };
    const finish=()=>{
      if(closing)return;
      closing=true;
      if(timer)clearInterval(timer);
      setTimeout(()=>{
        if(this.uiManager.memorySequence===sequence)this.uiManager.closeMemorySequence(false);
        else done();
      },hold);
    };
    this.uiManager.openMemorySequence(sequence,()=>{if(timer)clearInterval(timer);done();});
    timer=setInterval(()=>{
      if(this.uiManager.memorySequence!==sequence){clearInterval(timer);return;}
      if(this.uiManager.memoryFrameIndex<sequence.frames.length-1)this.uiManager.stepMemory(1);
      else finish();
    },interval);
  }

  playForcedBridgeReveal(onComplete){
    const bridge=this.worldRouter.activeZoneInstance;
    const annie=bridge?.bridgeDoppelganger;
    const startYaw=this.controller.yaw;
    this.busy=true;
    const startX=annie?.position.x ?? 46;
    const startZ=annie?.position.z ?? 0;
    if(annie){
      annie.visible=false;
      annie.position.set(Math.max(35,startX),0,.65);
    }
    this.controller.enabled=false;
    const start=performance.now();
    const duration=1550;
    const tick=(now)=>{
      const t=Math.min(1,(now-start)/duration);
      const turn=t<.48?Math.sin((t/.48)*Math.PI/2)*.72:Math.cos(((t-.48)/.52)*Math.PI/2)*.72;
      this.controller.yaw=startYaw-turn;
      this.controller.updateCameraRotation?.();
      if(annie&&t>.28){
        annie.visible=true;
        const p=Math.min(1,(t-.28)/.42);
        annie.position.x=Math.max(32.8,startX-(startX-33.5)*p);
        annie.position.z=.65-.45*p;
      }
      if(bridge?.bridgeAnomalyLight)bridge.bridgeAnomalyLight.intensity=t>.28&&t<.82?.9:.18;
      if(t<1){
        requestAnimationFrame(tick);
      }else{
        this.controller.yaw=startYaw;
        this.controller.updateCameraRotation?.();
        if(annie){annie.position.x=Math.max(33.5,annie.position.x);annie.position.z=startZ;}
        this.busy=false;
        onComplete?.();
      }
    };
    requestAnimationFrame(tick);
  }

  openBridgeChoice(){
    this.uiManager.openStoryChoice({
      title:'空中天橋',
      body:'剛才那個白袍人影就在身後。\n\n理智告訴你不能回頭，但你非常想確認她到底是誰。',
      primaryText:'忍住，不回頭',
      secondaryText:'回頭確認',
      onPrimary:()=>{
        this.uiManager.closeStoryChoice(false);
        this.gameState.setFlag('M5_BRIDGE_RESOLVED',true);
        this.gameState.setFlag('M5_BRIDGE_COMMITTED',true);
        this.gameState.setFlag('M5_ROUTE_CHOICE_RESOLVED',true);
        this.gameState.setFlag('BRIDGE_NO_LOOKBACK_RULE_ACTIVE',true);
        this.worldRouter.activeZoneInstance?.armManualNoLookbackRule?.();
        this.uiManager.showDialogue([
          {speaker:'內心',text:'「不能回頭。先走出去。」'}
        ],()=>{ void this.completeBeat(); });
      },
      onSecondary:()=>{
        this.uiManager.closeStoryChoice(false);
        this.gameState.setFlag('BRIDGE_LOOKBACK_FAILURE',true);
        this.uiManager.showDialogue([
          {speaker:'內心',text:'我還是回頭了。下一秒，視野像被整個拖倒。'},
          {speaker:'現場',text:'白色腕帶扣上手腕：409-A。'}
        ],()=>this.onEnding({type:'BAD_END',reason:'BRIDGE_LOOKBACK_PATIENTIZATION'}));
      }
    });
  }

  inspect() {
    if (this.busy || this.manager.runSave.runEnded) return;
    const beat = this.beats[this.beatIndex];
    if(
      (this.step==='ZHOU_SECURITY_TALK'&&this.beatIndex===1) ||
      (this.step==='M1'&&this.manager.currentIdentity==='ZHANG'&&this.beatIndex===6) ||
      (this.step==='M5'&&this.manager.currentIdentity==='ZHANG'&&this.beatIndex===1)
    ){
      this.gameState.setFlag('PHONE_RING_ACTIVE',false);
      this.gameState.setFlag('PHONE_ANSWERED',true);
      this.gameState.setFlag('PHONE_CALL_KIND',null);
    }
    if (!beat) return;
    if(beat.knock409){
      void soundManager.ensureRunning().then(ready=>{
        if(ready)soundManager.playBed33KnockPattern(.16);
      });
    }
    document.exitPointerLock?.();
    this.controller.enabled = false;

    this.uiManager.showDialogue(this.dialogueLines(beat), () => {
      if(beat.glimpse6f){
        const sequence={
          id:'ZHANG_6F_GLIMPSE',
          title:'3F → 8F 電梯｜6F 一閃',
          mode:'CCTV',
          source:'ELEVATOR MEMORY / TRANSIENT FRAME',
          frames:[
            {stamp:'05 → 06',title:'樓層顯示停頓',caption:'數字「6」比其他樓層多停了不到一秒。',narration:'電梯沒有正式停靠，門縫卻像被撬開一線。'},
            {stamp:'06 / 0.4 SEC',title:'臨床技能中心',caption:'褪色門牌、CPR 人偶、教學床架。',narration:'這不是病房。像是一間早就停用的臨床技能訓練中心。'},
            {stamp:'06 / 0.7 SEC',title:'白袍背影',caption:'畫面最深處有一個背對電梯的人影。',narration:'還沒看清楚，門就重新合上。'},
            {stamp:'07 → 08',title:'電梯恢復',caption:'樓層顯示恢復正常。',narration:'八樓到了。剛才那一幕像從沒發生。'}
          ]
        };
        this.playAutoMemorySequence(sequence,()=>{void this.completeBeat();},{interval:720,hold:650});
        return;
      }
      if(beat.accidentCg){
        const sequence={
          id:'ZHANG_6F_ACCIDENT_MEMORY',
          title:'6F｜1998 事故回放＋自傳體記憶',
          mode:'CCTV',
          source:'CORRUPTED MEMORY / FIRST-PERSON RECONSTRUCTION',
          frames:[
            {stamp:'1998 / 02:16',title:'B-Panel 過熱',caption:'電氣火花、排煙異常、走廊警鈴。',narration:'有人大喊不要照舊手冊拉下三個開關。'},
            {stamp:'02:17',title:'防火門落下',caption:'煙開始沿走廊擴散。',narration:'第一人稱視角在門的另一側。手上不是控制盤，而是病歷與藍色印泥。'},
            {stamp:'02:17:20',title:'409',caption:'規律敲擊：4 下、停、9 下。',narration:'我記得自己一直要求先確認裡面的人是誰。'},
            {stamp:'02:18',title:'技能中心',caption:'CPR 人偶、焦黑教學床、白袍人影。',narration:'黑咖啡、捲袖、藍印泥。這不是別人的記憶，我是從那雙手裡往外看。'},
            {stamp:'MEMORY END',title:'不要再覆寫',caption:'畫面被大量雪花吞沒。',narration:'名字仍然想不起來，但這段事故視角確實屬於我。'}
          ]
        };
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_FOUND',true);
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_INSPECTED',true);
        this.gameState.setFlag('SIX_FLOOR_HISTORY_CONFIRMED',true);
        this.playAutoMemorySequence(sequence,()=>{void this.completeBeat();},{interval:950,hold:900});
        return;
      }
      if(beat.erRegistrationChoice){
        this.uiManager.openStoryChoice({
          title:'2F 急診｜身分待確認',
          body:'HIS 找不到這名男子的有效掛號。\n\n你要直接建立一筆「無名病人」新病歷，還是先核對他的工務吊牌與既有舊掛號？',
          primaryText:'先核對身分，不新建病歷',
          secondaryText:'建立無名新病歷',
          onPrimary:()=>{
            this.uiManager.closeStoryChoice(false);
            this.gameState.setFlag('ER_IDENTITY_VERIFICATION_CHOSEN',true);
            void this.completeBeat();
          },
          onSecondary:()=>{
            this.uiManager.closeStoryChoice(false);
            this.gameState.setFlag('ER_CREATED_UNVERIFIED_RECORD',true);
            this.uiManager.showDialogue([
              {speaker:'HIS',text:'TEMPORARY UNKNOWN PATIENT RECORD CREATED.'},
              {speaker:'內心',text:'畫面上的姓名欄突然開始反向覆寫到我的值班身分。'}
            ],()=>this.onEnding({type:'BAD_END',reason:'ER_UNVERIFIED_RECORD_PATIENTIZATION'}));
          }
        });
        return;
      }
      if(beat.forcedBridgeReveal){
        this.playForcedBridgeReveal(()=>{
          this.uiManager.showDialogue([
            {speaker:'內心',text:'「不能回頭……可是我真的很想確認後面是不是有人。」'}
          ],()=>this.openBridgeChoice());
        });
        return;
      }
      if(beat.bridgeChoice){
        this.openBridgeChoice();
        return;
      }
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
    let objective;
    if(this.step==='M6'&&this.awaitingZone==='phantom_6f'){
      objective='回 4F 值班室；搭乘一般電梯';
    }else if(this.step==='M1'&&!this.awaitingZone&&this.beatIndex===0){
      if(!this.gameState.getFlag('FOUND_316_SPARE_KEY')) objective='前往三樓警衛查哨點，取得 316 備援鑰匙';
      else if(!this.gameState.getFlag('OPENED_316')) objective='回到 316 門口，用備援鑰匙開門';
      else objective='走進 316 辦公室，開始正式交班';
    }else{
      objective = this.awaitingZone
        ? `前往${zoneLabels[this.awaitingZone] || '下一個區域'}｜${beat.review || beat.label || ROUTE_STEPS[this.step].label}`
        : (beat.review || beat.label);
    }
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
      if(this.step==='M2'&&this.beatIndex===0&&this.manager.currentIdentity==='ZHANG'){
        this.gameState.setFlag('IDENTITY_4F_TEMP_ACCESS_CARD',true);
      }
      if (beat.clearFlag) this.gameState.setFlag(beat.clearFlag, false);
      if (beat.flag==='ZHANG_4F_SPARE_KEY_BORROWED' || beat.clearFlag==='ZHANG_4F_SPARE_KEY_BORROWED') {
        this.worldRouter.activeZoneInstance?.setIdentityWardSpareKeyBorrowed?.(
          this.gameState.getFlag('ZHANG_4F_SPARE_KEY_BORROWED')
        );
      }
      if (beat.flag==='SECOND_5F_CONSULT_KEY_BORROWED' || beat.clearFlag==='SECOND_5F_CONSULT_KEY_BORROWED') {
        this.worldRouter.activeZoneInstance?.setIdentitySecondConsultKeyBorrowed?.(
          this.gameState.getFlag('SECOND_5F_CONSULT_KEY_BORROWED')
        );
      }

      if(this.step==='M2'&&this.beatIndex===0){
        if(!this.gameState.isTaskComplete('P1_4F_REPORT'))this.gameState.markTaskComplete('P1_4F_REPORT');
      }
      if(this.step==='M2'&&this.beatIndex===1){
        if(!this.gameState.isTaskComplete('P1_NORMAL_EVENT_DONE'))this.gameState.markTaskComplete('P1_NORMAL_EVENT_DONE');
      }
      if(this.step==='M2'&&this.beatIndex===2){
        this.gameState.setFlag('FOURF_409_SEAL_CHECKED_AFTER_408C',true);
      }
      if(this.step==='M4'&&this.beatIndex===this.beats.length-1){
        this.gameState.setFlag('M4_CHEST_RESOLVED',true);
      }
      if(this.step==='M5'&&this.beatIndex===0){
        this.gameState.setFlag('M5_CCTV_RESOLVED',true);
      }

      // Compatibility flags let the original physical doors/elevators remain the
      // actual traversal mechanism while V2 owns the narrative state.
      if(this.step==='M6'&&this.manager.currentIdentity==='ZHANG'&&this.beatIndex===0){
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_FOUND',true);
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_INSPECTED',true);
        this.gameState.setFlag('SIX_FLOOR_HISTORY_CONFIRMED',true);
      }
      if (this.step === 'M6' && this.beatIndex === this.beats.length - 1) {
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_FOUND', true);
        this.gameState.setFlag('FLOOR6_STETHOSCOPE_INSPECTED', true);
        this.gameState.setFlag('M6_FLOOR6_RESOLVED', true);
      }
      const m7KeyBeat=this.manager.currentIdentity==='ZHANG'?1:0;
      if (this.step === 'M7' && this.beatIndex === m7KeyBeat) {
        this.gameState.setFlag('FIRST_FLOOR_GUARD_KEY', true);
        this.gameState.setFlag('HIDDEN_SERVICE_DOOR_DISCOVERED', true);
        this.worldRouter.activeZoneInstance?.syncStoryState?.();
      }
      if (this.step === 'B2' && this.beatIndex === 1) {
        this.gameState.setFlag('B2_TERMINAL_CONTACTED', true);
        this.gameState.setFlag('B2_FIRE_RECAP_SEEN', true);
        this.gameState.setFlag('RECORD_OVERWRITE_ACTIVE', true);
        if(this.manager.currentIdentity==='ZHANG')this.gameState.setFlag('ARCHIVE_ACCESS_KEY',true);
      }

      this.manager.recordEvidence({
        id: `route:${this.step}:${this.beatIndex}`,
        category: 'route',
        milestone: this.step,
        visibleText: `${beat.label}：${beat.lines.at(-1)}`
      });

      if (this.step === 'B2' && this.beatIndex === 0 && this.manager.currentIdentity!=='ZHANG') {
        this.panel.openB2Archive();
      }

      if (this.beatIndex + 1 < this.beats.length) {
        this.beatIndex += 1;
        await this.placeBeat({ forceLoad: false });
      } else {
        if(this.step==='M1'){
          this.ensureIdentityDutyAccess();
          this.worldRouter.activeZoneInstance?.setIdentityDutyItemsVisible?.(false);
        }
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
    if(binding.officeEntry){
      this.gameState.setFlag('FOUND_316_SPARE_KEY',true);
      this.gameState.setFlag('OPENED_316',true);
      this.m1EntryTriggered=true;
      this.inspect();
      return true;
    }
    if(binding.proximityBridge){
      this.gameState.setFlag('BRIDGE_REFLECTION_NOTICE_PENDING',false);
      this.gameState.setFlag('BRIDGE_REFLECTION_NOTICE_SEEN',true);
      this.inspect();
      return true;
    }
    if (binding.auto) {
      this.inspect();
      return true;
    }
    if(binding.passthrough){
      if(binding.completeTask&&!this.gameState.isTaskComplete(binding.completeTask)){
        this.gameState.markTaskComplete(binding.completeTask);
      }
      if(binding.completeFlag&&!this.gameState.getFlag(binding.completeFlag)){
        this.gameState.setFlag(binding.completeFlag,true);
        if(binding.completeFlag==='LOCKER_OPENED'){
          this.worldRouter.activeZoneInstance?.markLockerOpen?.(true);
        }
      }
      void this.completeBeat();
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
      awaitingZone: this.awaitingZone,
      auto: binding.auto === true,
      boundToWorldObject: !!this.boundTarget,
      contextualHitbox: !!this.anchor,
      visibleSyntheticQuestCard: this.anchor?.name?.startsWith('identity_route_event') === true,
      targetId: (this.boundTarget?.object?.userData || this.boundTarget?.object)?.id || this.anchor?.userData?.label || null
    };
  }

  async qaArriveAtAwaitingZone() {
    if (!this.awaitingZone || this.busy) return false;
    const beat = this.beats[this.beatIndex];
    const route = ROUTE_STEPS[this.step];
    const targetZone = this.awaitingZone;
    this.worldRouter.loadZone(targetZone, beat?.spawn || route?.spawn);
    await this.onArriveTargetZone();
    return true;
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
