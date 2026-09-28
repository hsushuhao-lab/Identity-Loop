import { zoneAssetManifest } from './src/art/ZoneAssetManifest.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync('./src/main.js','utf8');
const ui=readFileSync('./src/ui/UIManager.js','utf8');
const assets=readFileSync('./src/art/AssetRegistry.js','utf8');
const materials=readFileSync('./src/art/MaterialRegistry.js','utf8');
const campus=readFileSync('./src/art/CampusBackdrop.js','utf8');
const zoneAssets=readFileSync('./src/art/ZoneAssetManifest.js','utf8');
const b2=readFileSync('./src/world/zones/B2Archive.js','utf8');
const routes=readFileSync('./src/world/shared/WorldRoutes.js','utf8');

const essentialPreload=main.indexOf('await preloadZoneEssential(openingZoneId)');
const sceneSetup=main.indexOf('// Setup Three.js Scene & Renderer');
assert(essentialPreload>=0&&essentialPreload<sceneSetup,'opening essential models and PBR must be ready before scene construction');
assert(zoneAssets.includes('preloadAssetNames(entries.models')&&zoneAssets.includes('preloadMaterialSurfaces(entries.surfaces'),'essential contract must load models and PBR together');
for(const asset of ['officeChair','storageCabinet','workDesk','printer','bench','plant'])assert(zoneAssets.includes(`'${asset}'`),'opening critical asset missing: '+asset);
assert(!main.includes('deferredHospitalAssets'),'first paint must not start a whole-world download storm');
assert(main.includes("prepareLoopReset:()=>prepareZoneWithRetry('first_campus_3f')"),'loop reset must prepare 3F art and materials');
const loopManager=readFileSync('./src/core/LoopManager.js','utf8');
assert(loopManager.includes('await this.loopResetPreparation'),'loop reset must await art/material readiness before loadZone');
assert(ui.includes('async finishLoopCutscene()')&&ui.includes("body.textContent='場景重建中……'")&&ui.includes('await result'),'patientization cutscene must remain active while loop art finishes loading');
assert(ui.includes("if(el===this.loopCutscene)return;"),'loop reset overlay cleanup must not expose the old scene before the rebuilt 3F is ready');

// Batch split: outdoor assets and textures are not part of the indoor preload.
assert(assets.includes("outdoorAssets = new Set(['shrub', 'fern', 'campusTree'])"),'outdoor GLTF split missing');
assert(materials.includes("outdoorSurfaces = new Set(['ground', 'asphalt'])"),'outdoor PBR split missing');
assert(!materials.includes("if (surface === 'plaster') material.map = null"),'plaster albedo must never be discarded; walls must render real texture maps');
assert(materials.includes("surface === 'plaster' ? .11")&&materials.includes("surface === 'vinyl' ? .12"),'indoor normal detail must remain visibly scaled');
const geometryFactory=readFileSync('./src/world/shared/GeometryFactory.js','utf8');
const level3=readFileSync('./src/world/Level3FBlockout.js','utf8');
assert(geometryFactory.includes('this.surface(material, width, height)'),'shared architectural walls must use dimension-aware repeated PBR materials');
assert(level3.includes('materialForSurface(materialName,width,height)'),'3F walls must use dimension-aware repeated PBR materials');
assert(campus.includes('preloadCampusBackdropAssets'),'campus backdrop preload hook missing');
for (const zone of ['first_campus_3f','first_campus_2f','first_campus_1f','first_campus_8f','skybridge']) {
  const { essential, optional } = zoneAssetManifest[zone];
  for (const surface of ['ground','asphalt']) {
    assert(!essential.surfaces.includes(surface), `${zone}: distant ${surface} must not block entry`);
    assert(optional.surfaces.includes(surface), `${zone}: distant ${surface} must retain background PBR hydration`);
  }
  for (const surface of ['plaster','vinyl','terrazzo','wood'])
    assert(essential.surfaces.includes(surface), `${zone}: core ${surface} must remain essential`);
  assert(!essential.models.includes('campusTree'), `${zone}: optional tree must not block entry`);
}

assert(ui.includes("openTravelSelector(destinations, currentZone, onSelect, kind = 'elevator', onPrefetch = null)"),'travel prefetch callback missing');
assert(ui.includes('const preloadPromise=Promise.resolve(onPrefetch?.(destination))'),'destination preload must start at transition start');
assert(ui.includes('await preloadPromise'),'arrival must wait for destination essentials before zone construction');
assert(!ui.includes('preloadDeadline'),'required indoor art must never be bypassed by an arbitrary timeout');
assert(main.includes('prefetchDestinationAssets'),'main travel flow must provide destination prefetch');
assert(main.includes('await prepareZoneWithRetry(zoneId)'),'travel transition must await only destination essentials');
assert(main.includes('void preloadZoneOptional(zoneId)'),'decorative assets must not block arrival');
assert(!main.includes('preloadAssets()')&&!main.includes('preloadCampusBackdropAssets()'),'travel must not block on full hospital or campus vegetation');
for(const zone of ['first_campus_3f','first_campus_4f','first_campus_2f','first_campus_1f','first_campus_8f','skybridge','second_campus_2f','second_campus_5f','phantom_6f','b2_archive'])assert(zoneAssets.includes(`${zone}:`),'zone manifest missing '+zone);

// B2: terminal + one-way door, no staircase; each identity exits toward its actual next route step.
assert(b2.includes("type:'b2_exit_door'")&&!b2.includes('B2_EscapeStairwell'),'B2 must have a door exit and no stairwell');
assert(main.includes("identity==='CHEN'")&&main.includes("zone:'b1_dispatch_hub',spawn:'chen_b1_dispatch'"),'Chen must leave B2 for the B1 dispatch route');
assert(main.includes("identity==='ZHANG'")&&main.includes("zone:'first_campus_3f',spawn:'m0_3f_corridor'"),'Zhang must leave B2 for the 3F archive route');
assert(main.includes("identity==='LI'")&&main.includes("返回 3F：打開行政辦公室與文史室確認後，回 316。"),'Li must leave B2 for the 3F evidence sweep');
assert(main.includes("identity==='ZHOU'")&&main.includes("zone:'first_campus_4f',spawn:'m3_4f_nursing_station'"),'Zhou must leave B2 for M8 identity rejection on 4F');
assert(main.includes("worldRouter.loadZone(destination.zone,destination.spawn)"),'B2 exit must load the route-specific destination rather than a stale hard-coded floor');
assert(main.includes("B2_EXITED_PERMANENTLY"),'B2 one-way exit lockout missing');
assert(main.includes("M7_IDENTITY_RESOLVED_AT_316"),'final 316 path may still mark deferred identity resolution');
assert(main.includes("B2_FIRE_RECAP_SEEN"),'B2 terminal fire recap gate missing');
assert(main.includes("先啟動 B2 封存終端"),'one-way exit must remain locked until the fire recap is viewed');
assert(main.includes("有人嘗試覆寫模板已在 316 登入｜請輸入真正員編末四碼｜最後一次機會"),'final 316 warning must stay anonymous and explicit');
assert(!main.includes("trueNameResolved&&persistentMemory.hasAllProofs()"),'final 316 identity declaration must not hard-block on the full proof bundle');
assert(!ui.includes('沿 B2 逃生梯返回'),'B2 task board must not tell the player to use a removed staircase');
assert(!ui.includes('沿逃生梯離開封存層'),'B2 completion task must use the one-way door, not a staircase');
const b2FailForward=ui.indexOf("this.gameState.getFlag('B2_EXITED_PERMANENTLY')&&this.gameState.getFlag('B2_FIRE_RECAP_SEEN')");
const b2ReopenPrompt=ui.indexOf("this.gameState.getFlag('M6_FLOOR6_RESOLVED')&&!this.gameState.getFlag('M7_B2_OPEN')");
assert(b2FailForward>=0&&b2ReopenPrompt>=0&&b2FailForward<b2ReopenPrompt,'post-recap permanent B2 exit must take precedence over the service-door objective');

// Loop 2: fast path can skip chores but cannot hide the admin evidence.
const adminBranch=main.slice(main.indexOf("['admin_roster_3f','admin_printer_doc_3f','admin_drawer_manual_3f']"),main.indexOf("} else if (interactable.type === 'spare_key_316')"));
assert(adminBranch.includes('openArchiveDocument'),'admin documents must remain readable after loop reset');
assert(!adminBranch.includes("if(gameState.getFlag('FAST_PATH_3F'))"),'FAST_PATH_3F must not suppress admin evidence');
assert(main.includes("if(!gameState.getFlag('FOUND_316_SPARE_KEY'))"),'loop fast path must still require the patrol-point spare key');
assert(main.includes("prefetchDestinationAssets({zoneId:'first_campus_4f'})"),'316 fast-path phone must preload 4F before card pickup');
const fastPhone=main.slice(main.indexOf("gameState.getFlag('FAST_PATH_3F')&&gameState.getFlag('PHONE_RING_ACTIVE')"),main.indexOf("}else if(gameState.getFlag('SECOND_CAMPUS_PHONE_PENDING'))"));
assert(!fastPhone.includes("markTaskComplete('KEY_PICKUP')")&&!fastPhone.includes("setFlag('STAFF_ACCESS_CARD',true)"),'fast phone must leave key and card in the locker');

const second2f=readFileSync('./src/world/zones/SecondCampus2F.js','utf8');
const ward=readFileSync('./src/world/shared/WardFloorplan.js','utf8');
const floor6=readFileSync('./src/world/zones/Phantom6F.js','utf8');
assert(!second2f.includes("Doorway.build({scene:this.zoneGroup,colliders:this.colliders,x:72,z:4.5"),'second-campus 2F elevator-front doorway must stay removed');
assert(ward.includes('Second5F_DutyPhoto_')&&ward.includes('1998 夜班合照')&&ward.includes('臨床教學留影'),'second-campus 5F duty room must contain actual framed photos');
assert(floor6.includes("title:'臨床技能中心'")&&floor6.includes('Floor6_MedicationCart')&&floor6.includes('Floor6_CrashCart')&&floor6.includes('Floor6_IV_Stand')&&floor6.includes('Floor6_VitalMonitor'),'hidden 6F must present as a clinical skills center with teaching equipment');
assert(!floor6.includes("title:'異常檔案區'"),'obsolete rear green archive board must stay removed');

console.log('LOADING / B2 / LOOP2 REGRESSION QA PASS');
