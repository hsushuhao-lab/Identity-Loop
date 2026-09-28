// WorldRouter.js - Milestone M13: Central Scene/Zone Router, Traversal Verification & Debug Spawns
import * as THREE from 'three';
import { applyZoneLighting } from '../art/VisualProfile.js';
import { applyExteriorTime } from '../art/CampusBackdrop.js';
import { installEraPosters } from '../art/PosterFactory.js';
import { installMemoryEvidence } from '../story/MemoryInstallations.js';
import { installIdentityFloorPhoto } from '../art/IdentityFloorPhotos.js';
import { GeometryFactory } from './shared/GeometryFactory.js';
import { WORLD_SPAWNS as DEBUG_SPAWN_POINTS, ROUTE_PORTALS, FIRST_FLOORS, SECOND_FLOORS } from './shared/WorldRoutes.js';
import { addTravelFixtures } from './shared/TravelFixtures.js';
import { CollisionFactory } from './shared/CollisionFactory.js';
import { floorStateManager } from '../core/FloorStateManager.js';
import { gameState } from '../core/GameState.js';

import { FirstCampus3F } from './zones/FirstCampus3F.js';
import { FirstCampus4F } from './zones/FirstCampus4F.js';
import { FirstCampus2FER } from './zones/FirstCampus2FER.js';
import { FirstCampus1F } from './zones/FirstCampus1F.js';
import { FirstCampus8FBridgeEntry } from './zones/FirstCampus8FBridgeEntry.js';
import { Skybridge } from './zones/Skybridge.js';
import { SecondCampus2F } from './zones/SecondCampus2F.js';
import { SecondCampusStandardFloor } from './zones/SecondCampusStandardFloor.js';
import { SecondCampus1F } from './zones/SecondCampus1F.js';
import { Phantom6F } from './zones/Phantom6F.js';
import { B2Archive } from './zones/B2Archive.js';
import { B1DispatchHub } from './zones/B1DispatchHub.js';

export class WorldRouter {
  constructor(scene, camera, controller) {
    this.scene = scene;
    this.camera = camera;
    this.controller = controller;
    this.gf = new GeometryFactory();

    this.activeZoneId = null;
    this.activeZoneInstance = null;
    this.lightingZoneId=null;
    this.roomLamps=[];
    this.identityAlarmLight=new THREE.AmbientLight(0x9b1d1d,0);
    this.identityAlarmLight.name='M8_CodeBlack_Ambient';
    gameState.addListener((event,data)=>{
      const identityAlarmChanged=event==='flag_changed'&&['M8_IDENTITY_BATTLE_ACTIVE','GAME_COMPLETE'].includes(data?.flag);
      if(((event==='phase_changed'||event==='time_changed')||identityAlarmChanged)&&this.lightingZoneId){
        this.refreshLighting();
        applyExteriorTime(this.activeZoneInstance?.zoneGroup,gameState.gameTime);
      }
    });

    this.zones = {
      'first_campus_3f': FirstCampus3F,
      'first_campus_4f': FirstCampus4F,
      'first_campus_2f': FirstCampus2FER,
      'first_campus_1f': FirstCampus1F,
      'first_campus_8f': FirstCampus8FBridgeEntry,
      'skybridge': Skybridge,
      'second_campus_2f': SecondCampus2F,
      'second_campus_4f_story': SecondCampusStandardFloor,
      'second_campus_5f': SecondCampusStandardFloor,
      'second_campus_std': SecondCampusStandardFloor,
      'second_campus_1f': SecondCampus1F,
      'phantom_6f': Phantom6F,
      'b2_archive': B2Archive,
      'b1_dispatch_hub': B1DispatchHub
    };

    this.zoneLabels = {
      'first_campus_3f': '第一院區 3F 行政與總醫師室',
      'first_campus_4f': '第一院區 4F 病房',
      'first_campus_2f': '第一院區 2F 急診',
      'first_campus_1f': '第一院區 1F 公共服務大廳',
      'first_campus_8f': '第一院區 8F 院史展與天橋前廳',
      'skybridge': '跨院區封閉連通道',
      'second_campus_2f': '第二院區 2F 連通道管制台',
      'second_campus_4f_story': '第二院區 4F 劇情專用場景（一般電梯不顯示）',
      'second_campus_5f': '第二院區 5F 病房護理站',
      'second_campus_std': '第二院區 5F 病房護理站',
      'second_campus_1f': '第二院區 1F 警衛台',
      'phantom_6f': '6F 臨床技能中心',
      'b2_archive': 'B2 封存隔離層',
      'b1_dispatch_hub': 'B1 地下救護車接駁調度室'
    };

    this.lightingGroup = new THREE.Group();
    this.lightingGroup.name = 'WorldRouter_BaselineLighting';
    this.scene.add(this.lightingGroup);
    this.lightingGroup.add(this.identityAlarmLight);
  }

  resetTransientState(){
    this.closeZoneDoors(this.activeZoneInstance);
  }

  closeZoneDoors(zone){
    if(!zone)return;
    for(const door of Object.values(zone.accessDoors||{}))door.setClosed?.(true);
    for(const door of Object.values(zone.keyedDoors||{}))if(!door.keepOpen)door.setClosed?.(true);
    zone.setDutyDoorClosed?.(true);
    zone.setWardGateClosed?.(true);
    zone.setInnerWardGateClosed?.(true);
    zone.setAcuteGateClosed?.(true);
  }

  refreshLighting(){
    applyZoneLighting({
      group:this.lightingGroup,
      scene:this.scene,
      zoneGroup:this.activeZoneInstance?.zoneGroup,
      zoneId:this.lightingZoneId,
      storyTime:gameState.gameTime,
      roomLamps:this.roomLamps
    });
    const codeBlack=gameState.getFlag('M8_IDENTITY_BATTLE_ACTIVE')&&!gameState.getFlag('GAME_COMPLETE');
    if(this.identityAlarmLight){
      this.identityAlarmLight.intensity=codeBlack?.48:0;
      if(codeBlack&&!this.identityAlarmLight.parent)this.lightingGroup.add(this.identityAlarmLight);
    }
  }

  /**
   * Loads a specific zone by ID and teleports player to a designated spawn point.
   */
  loadZone(zoneId, spawnId = null) {
    if (!this.zones[zoneId]) {
      console.warn(`[WorldRouter] Unknown zone: ${zoneId}, defaulting to first_campus_3f`);
      zoneId = 'first_campus_3f';
    }

    // Clean up current zone
    if (this.activeZoneInstance && typeof this.activeZoneInstance.cleanup === 'function') {
      this.closeZoneDoors(this.activeZoneInstance);
      this.activeZoneInstance.cleanup();
      this.activeZoneInstance = null;
    }

    console.info(`[WorldRouter] Loading Zone: ${zoneId}`);
    const lightingZone = (zoneId === 'second_campus_4f_story' || zoneId === 'second_campus_5f') ? 'second_campus_std' : zoneId;
    this.lightingZoneId=lightingZone;
    const ZoneClass = this.zones[zoneId];
    const floorMatch = zoneId.match(/_([0-9])f(?:_|$)/);
    this.activeZoneInstance = new ZoneClass(this.scene, this.gf, { floor: Number(floorMatch?.[1] || 5) });
    this.activeZoneInstance.build();
    applyExteriorTime(this.activeZoneInstance.zoneGroup,gameState.gameTime);
    installEraPosters(this.activeZoneInstance, zoneId);
    installMemoryEvidence(this.activeZoneInstance, zoneId);
    installIdentityFloorPhoto(this.activeZoneInstance, zoneId);
    addTravelFixtures(this.activeZoneInstance, zoneId);
    floorStateManager.apply(zoneId,this.activeZoneInstance);
    this.activeZoneInstance.zoneGroup.updateMatrixWorld(true);

    // The new wards have an authored light plan. Do not multiply shader lights
    // by both room and corridor count when expanding from four to nine rooms.
    const authoredWard = ['first_campus_4f','second_campus_5f','second_campus_4f_story','second_campus_std'].includes(zoneId);
    const corridorLights = new Set();
    this.roomLamps=[];
    for (const room of (authoredWard ? [] : this.activeZoneInstance.roomAreas || [])) {
      for (const point of [room.point, room.corridor].filter(Boolean)) {
        const key = point[0] + ':' + point[2];
        if (corridorLights.has(key)) continue;
        corridorLights.add(key);
        this.roomLamps.push([point[0],point[2]]);
      }
    }
    this.refreshLighting();

    this.closeZoneDoors(this.activeZoneInstance);
    if (zoneId === 'first_campus_1f') {
      this.activeZoneInstance.setEntranceClosed(true);
    }
    this.activeZoneId = zoneId;

    // Connect zone colliders, walkables, and interactables to the controller
    if (this.controller) {
      this.controller.colliders = this.activeZoneInstance.colliders || [];
      this.controller.walkables = this.activeZoneInstance.walkables || [];
      this.controller.interactables = this.activeZoneInstance.interactables || [];
    }

    // Handle spawn point
    if (spawnId && DEBUG_SPAWN_POINTS[spawnId]) {
      this.teleportToSpawn(spawnId);
    } else {
      // Find first default spawn point for this zone
      const defaultSpawn = Object.keys(DEBUG_SPAWN_POINTS).find(
        (key) => DEBUG_SPAWN_POINTS[key].zoneId === zoneId
      );
      if (defaultSpawn) {
        this.teleportToSpawn(defaultSpawn);
      }
    }

    this.updateHUDLocation();
    return this.activeZoneInstance;
  }

  /**
   * Teleports player to named spawn point.
   */
  teleportToSpawn(spawnKey) {
    const sp = DEBUG_SPAWN_POINTS[spawnKey];
    if (!sp) {
      console.warn(`[WorldRouter] Spawn point not found: ${spawnKey}`);
      return;
    }

    // Ensure zone is active
    if (this.activeZoneId !== sp.zoneId) {
      this.loadZone(sp.zoneId, spawnKey);
      return;
    }

    if (this.controller) {
      this.controller.teleport(sp.pos[0], sp.pos[1], sp.pos[2], sp.yaw);
      this.controller.pitch = sp.pitch || 0;
      this.controller.updateCameraRotation();
      console.info(`[WorldRouter] Teleported to ${spawnKey} (${sp.name}):`, sp.pos);
    }
  }

  updateHUDLocation() {
    const locTag = document.querySelector('.hud-location');
    if (locTag && this.zoneLabels[this.activeZoneId]) {
      locTag.textContent = this.zoneLabels[this.activeZoneId].replace(/^[0-9]+[.] /, '').split(' (M')[0];
    }
  }

  update(delta) {
    this.activeZoneInstance?.update?.(this.camera,delta);
    if (!this.controller?.enabled) return;
    const portal = ROUTE_PORTALS.find(p => {
      const allowed=!p.gated||(p.requiresFlag&&gameState.getFlag(p.requiresFlag));
      return allowed&&p.from===this.activeZoneId&&new THREE.Box3(new THREE.Vector3(...p.bounds[0]),new THREE.Vector3(...p.bounds[1])).containsPoint(this.controller.position);
    });
    if (portal) this.teleportToSpawn(portal.spawn);
  }

  floorDestinations(kind = 'elevator') {
    const campus = this.activeZoneId.startsWith('first') ? 'first' : 'second';
    const floors = campus === 'first' ? [...FIRST_FLOORS] : [...SECOND_FLOORS];
    const mapped=floors.map(f => {
      let zoneId = `${campus}_campus_${f}f`;
      if (campus === 'second' && f === 5) zoneId = 'second_campus_5f';
      const spawn = kind === 'stairs' ? `${campus}_${f}f_stairs` : `${campus}_${f}f_lift`;
      let label = `${f}F`;
      if (campus === 'first') {
        if (f === 1) label = '1F 公共服務大廳';
        else if (f === 2) label = '2F 急診';
        else if (f === 3) label = '3F 醫師行政區';
        else if (f === 4) label = '4F 病房';
        else if (f === 8) label = '8F 院史展天橋';
      } else {
        if (f === 1) label = '1F 警衛台出入口';
        else if (f === 2) label = '2F 連通道管制台';
        else if (f === 5) label = '5F 病房護理站';
      }
      return { floorNum: f, zoneId, spawn, label };
    });
    return mapped;
  }

  /**
   * Builds developer location debug selector on the screen.
   */
  createDebugUI() {
    const existing = document.getElementById('debug-zone-selector');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'debug-zone-selector';
    panel.style.position = 'fixed';
    panel.style.bottom = '16px';
    panel.style.left = '16px';
    panel.style.zIndex = '999999';
    panel.style.backgroundColor = 'rgba(20, 32, 26, 0.92)';
    panel.style.border = '1px solid #4d7a64';
    panel.style.borderRadius = '6px';
    panel.style.padding = '8px 12px';
    panel.style.fontFamily = 'monospace';
    panel.style.fontSize = '12px';
    panel.style.color = '#e2ede7';
    panel.style.boxShadow = '0 4px 14px rgba(0,0,0,0.5)';

    const label = document.createElement('div');
    label.style.fontWeight = 'bold';
    label.style.marginBottom = '6px';
    label.style.color = '#79d2a6';
    label.textContent = '🛠️ MODELING QA — 空間導覽切換 (M0~M13)';
    panel.appendChild(label);

    const select = document.createElement('select');
    select.style.backgroundColor = '#11221a';
    select.style.color = '#ffffff';
    select.style.border = '1px solid #3d6050';
    select.style.borderRadius = '4px';
    select.style.padding = '4px 8px';
    select.style.outline = 'none';

    Object.keys(DEBUG_SPAWN_POINTS).forEach((key) => {
      const sp = DEBUG_SPAWN_POINTS[key];
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `[${sp.milestone}] ${sp.name}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      this.teleportToSpawn(e.target.value);
    });

    panel.appendChild(select);
    document.body.appendChild(panel);
  }
}
