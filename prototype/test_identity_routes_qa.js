import assert from 'node:assert/strict';
import { IdentityManager, IDENTITY_STORAGE_KEY } from './src/core/IdentityManager.js';
import { IDENTITY_ROUTES, ROUTE_STEPS } from './src/story/IdentityRoutes.js';
import { WORLD_SPAWNS } from './src/world/shared/WorldRoutes.js';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { anonymousNarrative, worldNarrative } from './src/story/IdentityPrivacy.js';
import { drawCharacterStrip } from './src/art/CharacterPortraitArt.js';
import { buildVictimMap } from './src/story/B2FireRecapDirector.js';
const expected={
  ZHANG:['ZHANG_OPEN_4F','M2','M1','ZHANG_OUTBOUND_8F','M4','ZHANG_SECOND_CAMPUS_SECURITY','M5','M3','ZHANG_2F_PRESENCE_CHECK','ZHANG_4F_WITNESS_RETURN','ZHANG_3F_OBSERVATION_RECORD','M6','M7','B2','ZHANG_3F_ARCHIVE','M9'],
  LI:['M1','M2','LI_DUTY_CALL_2000','LI_ER_2005','LI_RETURN_DUTY_2117','LI_2117_PATROL','LI_RETURN_DUTY_0033','LI_ER_0033','LI_316_ARCHIVE','LI_OUTBOUND_8F','M4','M5','M6','M7','B2','LI_3F_EVIDENCE','M9'],
  ZHOU:['ZHOU_OPEN_8F','M4','M5','M1','M2','ZHOU_1F_PHOTO','ZHOU_SECURITY_TALK','M3','ZHOU_1F_WARNING_CALL','ZHOU_2F_WARNING_READBACK','ZHOU_2117_RETURN','M6','M7','B2','M8','M9'],
  CHEN:['CHEN_OPEN_SKYBRIDGE','M4','M5','M1','M2','CHEN_1F_TRANSIT_LOG','M3','CHEN_2F_HANDOFF_RECEIPT','CHEN_4F_DESTINATION_CHECK','CHEN_3F_ROUTE_RECONCILE','M6','M7','B2','CHEN_M8_DISPATCH','M9']
};
const storage=()=>({value:null,getItem(){return this.value;},setItem(_,value){this.value=value;}});
for(const [identity,route] of Object.entries(expected)){
  const store=storage();
  let manager=IdentityManager.createForTest(identity,store);
  assert.deepEqual(manager.route,route);
  assert.deepEqual(IDENTITY_ROUTES[identity],route);
  for(const [index,step] of route.entries()){
    assert.equal(manager.currentRouteStep,step);
    assert.equal(manager.runSave.currentRouteStep,index);
    assert.deepEqual(manager.runSave.completedStoryModules,route.slice(0,index));
    const before=store.value;
    assert.equal(manager.completeRouteStep('INVALID'),false);
    if(step!=='M9'){
      assert.equal(manager.completeRouteStep('M9'),false);
      if(route[index+1]!=='M9')assert.equal(manager.advanceMilestone('M9'),false);
      assert.equal(manager.commitM9(identity,identity).reason,'M9_NOT_ACTIVE');
      assert.equal(store.value,before);
      assert.equal(manager.completeRouteStep(step),true);
      assert.equal(manager.completeRouteStep(step),false);
    }else{
      assert.equal(manager.completeRouteStep(step),false);
      assert.equal(manager.commitM9(identity,identity).type,'GOOD_END');
    }
    manager=new IdentityManager(store);
    if(identity==='ZHANG'&&step==='M2')assert.equal(manager.runSave.completedStoryModules.includes('M1'),false);
  }
  assert.equal(manager.currentRouteStep,null);
  const ended=store.value;
  manager.restoreOrStartRun();
  assert.equal(store.value,ended);
  assert.equal(manager.runSave.runEnded,true);
  assert.equal(manager.commitM9(identity,identity).reason,'ALREADY_COMMITTED');
  assert.deepEqual(manager.runSave.completedStoryModules,route);
  assert.deepEqual(manager.startNewRun({restart:true,forceIdentity:identity}).metaSave.completedGoodEnds,[identity]);
  assert.equal(manager.currentRouteStep,route[0]);
  console.log(`PASS route ${identity}: exact order, guarded progression, reload at every step, one final commit, restart retains good ending`);
}
for(const [step,data] of Object.entries(ROUTE_STEPS)){
  assert.equal(WORLD_SPAWNS[data.spawn]?.zoneId,data.zoneId,step);
  assert.doesNotMatch(data.label,/ZHANG|ZHOU|CHEN|\bLI\b|張|李|周|陳/);
  assert.ok(data.time===null||/^\d{2}:\d{2}$/.test(data.time));
}

// Regression: M1 means "arrive at 316", never "spawn inside 316".
// The actual handoff completes only after using the real patrol-point key,
// opening the real office door, and crossing into the office volume.
assert.equal(ROUTE_STEPS.M1.spawn,'m0_316_entrance');
assert.equal(WORLD_SPAWNS[ROUTE_STEPS.M1.spawn].name,'316 總醫師室門口');
const routeDirectorSource=readFileSync(new URL('./src/story/IdentityRouteDirector.js',import.meta.url),'utf8');
assert.match(routeDirectorSource,/if\(index===0\) return \{ officeEntry:true \}/);
assert.match(routeDirectorSource,/this\.gameState\.getFlag\('OPENED_316'\)/);
assert.match(routeDirectorSource,/p\.x>3\.2&&p\.x<10\.8&&p\.z>2\.8&&p\.z<8\.2/);
assert.match(routeDirectorSource,/取得 316 備援鑰匙/);
assert.match(routeDirectorSource,/走進 316 辦公室，開始正式交班/);
const mainSourceFor316=readFileSync(new URL('./src/main.js',import.meta.url),'utf8');
assert.match(mainSourceFor316,/identityLoopMode[\s\S]*門開了。進去 316，完成今晚的交接。/);
console.log('PASS M1 regression: starts outside locked 316; physical entry starts handoff, which completes only after log/HIS/key-card');

const guardSource=readFileSync(new URL('./src/world/zones/FirstCampus1F.js',import.meta.url),'utf8');
assert.match(guardSource,/reflectionFrame\.position\.set\(-10\.72,1\.92,7\.76\)/);
assert.match(guardSource,/new THREE\.PlaneGeometry\(2\.52,1\.62\)/);
assert.match(guardSource,/id:'IDENTITY_GUARD_PHONE'/);
assert.match(guardSource,/OldGuardPost_DeskPhone_Handset/);
assert.doesNotMatch(guardSource,/label:'查看警衛台上的事故前設備照片'/);

const sceneSource=readFileSync(new URL('./src/story/IdentityRouteScenes.js',import.meta.url),'utf8');
assert.match(sceneSource,/ZHOU_SECURITY_TALK:[\s\S]*接聽警衛台電話/);
assert.match(sceneSource,/2F 急診有一名身分待確認的男性/);
assert.match(sceneSource,/ARCHIVE LOOKUP／316 LEGACY CLIENT/);
assert.match(sceneSource,/316 有舊資料終端。我把這張帶回三樓查/);

assert.match(routeDirectorSource,/PHONE_CALL_KIND','IDENTITY_ZHOU_ER'/);
assert.match(routeDirectorSource,/id: 'IDENTITY_GUARD_PHONE'/);
assert.match(routeDirectorSource,/ensureIdentityDutyAccess\(\)/);
assert.match(routeDirectorSource,/setFlag\('STAFF_ACCESS_CARD', true\)/);
assert.match(routeDirectorSource,/\['KEY_PICKUP','DUTY_LOG','E_HANDOFF'\]/);
assert.match(routeDirectorSource,/beat\.review \|\| beat\.label \|\| ROUTE_STEPS\[this\.step\]\.label/);
assert.match(sceneSource,/UNDELIVERED_MEMO_FRAGMENT/);
assert.match(sceneSource,/取得：未送達便條碎片/);
assert.match(sceneSource,/「等一下。」/);
assert.match(sceneSource,/「那張醫囑單先不要——」/);
assert.match(sceneSource,/「……我要叫誰等一下？」/);
assert.match(sceneSource,/你總算上來了。408C 從傍晚就在按鈴/);
assert.match(sceneSource,/醫師……你怎麼現在才來/);
assert.match(sceneSource,/剛剛突然停了，我還以為裡面的人出事了/);
assert.match(sceneSource,/隔壁。四下，停一下，再九下/);
assert.doesNotMatch(sceneSource,/ZHOU:[\s\S]{0,900}煙嗆死/);
assert.match(sceneSource,/守恆，等一下/);
assert.match(sceneSource,/以前，我只留下證據；這一次不能再等下一張照片/);
assert.match(sceneSource,/cameraMemoryCue: identity==='ZHOU'/);
assert.match(routeDirectorSource,/playZhouBridgePhotoLoop/);
assert.match(routeDirectorSource,/identity==='ZHOU'&&index===5\) return \{ auto:true \};/);
assert.match(routeDirectorSource,/ZHOU_BRIDGE_LOOKBACK_SEEN/);
assert.match(routeDirectorSource,/ZHOU_BRIDGE_PHOTOGRAPHIC_LOOP/);
assert.match(routeDirectorSource,/this\.manager\.currentIdentity==='ZHOU'[\s\S]{0,900}M5_BRIDGE_RESOLVED/);
assert.match(routeDirectorSource,/「這次我不拍了。」/);
const soundSource=readFileSync(new URL('./src/audio/SoundManager.js',import.meta.url),'utf8');
assert.match(soundSource,/playCameraShutter\(\)/);
console.log('PASS Zhou polish: memo fragment -> delayed ward consequence -> photographic bridge micro-loop without route rollback -> M7 action catharsis');
console.log('PASS Zhou regression: wall photo -> guard -> ringing phone -> 2F -> explicit 316 legacy lookup; M1 grants durable duty access');

const wardSource=readFileSync(new URL('./src/world/shared/WardFloorplan.js',import.meta.url),'utf8');
assert.match(wardSource,/Identity4F_WardSpareKey/);
assert.match(wardSource,/Identity4F_TemporaryAccessCard/);
assert.doesNotMatch(wardSource,/Identity4F_Nurse_LinWanZhen|IdentitySecond5F_Nurse_LinWanZhen/);
assert.match(wardSource,/first_station_A/);
assert.match(wardSource,/second_station_A/);
assert.doesNotMatch(wardSource,/Identity4F_Intercom/);
assert.match(wardSource,/Identity4F_NurseStationComputer/);
assert.doesNotMatch(wardSource,/IdentitySecond5F_Intercom/);
assert.match(wardSource,/使用護理站電腦聯絡晚班護理師/);
assert.doesNotMatch(wardSource,/按下護理站對講機/);
assert.match(wardSource,/IDENTITY_4F_NURSE_STATION/);
assert.doesNotMatch(wardSource,/IDENTITY_403_PATIENT|Identity403PatientInteraction|identity_patient_403/);
assert.match(routeDirectorSource,/ZHANG_4F_SPARE_KEY_BORROWED/);
assert.match(routeDirectorSource,/IDENTITY_4F_TEMP_ACCESS_CARD/);
assert.doesNotMatch(routeDirectorSource,/IDENTITY_403_PATIENT/);
assert.match(routeDirectorSource,/id:'408C_BED_PLAQUE'/);
assert.match(routeDirectorSource,/id:'BED33_409_SEALED'/);
assert.match(routeDirectorSource,/id:'BED33_ASSIGNMENT'/);
assert.doesNotMatch(routeDirectorSource,/id: 'BED33_BOARD'.*M2|id: 'BED33_HIS_409'.*M2/s);
assert.ok(mainSourceFor316.includes("borrowedWardSpareKey"));
assert.ok(mainSourceFor316.includes("/^room_40[1-8]$/.test"));
assert.doesNotMatch(sceneSource,/403 病人|403 床邊紀錄|詢問 403/);
assert.match(sceneSource,/你今天又提早來了，現在才 16:50/);
assert.match(sceneSource,/先拿 4F 這組備用鑰匙跟臨時感應卡/);
assert.match(sceneSource,/408C 確認/);
assert.match(sceneSource,/409 封閉房/);
assert.match(sceneSource,/核對臨時床位單/);
assert.match(sceneSource,/值班醫師您好/);
assert.match(routeDirectorSource,/step === 'ZHANG_OPEN_4F'[\s\S]*IDENTITY_4F_NURSE_STATION/);
assert.match(routeDirectorSource,/triggerPatientization\(reason='IDENTITY_ROUTE_PATIENTIZATION'/);
assert.match(mainSourceFor316,/M2_BED33_APPROVAL_PATIENTIZATION/);
assert.match(routeDirectorSource,/playBed33KnockPattern/);
assert.match(routeDirectorSource,/return !IDENTITY_STORY_CRITICAL_TYPES\.has\(data\?\.type\)/);
console.log('PASS M2 mainline: 4F workstation dialogue anchor -> 408C; other seeds retain 409/Bed33 branch; no floating 4F intercom');

assert.match(wardSource,/IdentitySecond5F_ConsultSpareKey/);
assert.match(wardSource,/IDENTITY_SECOND_5F_NURSE_STATION/);
assert.doesNotMatch(wardSource,/IdentitySecond5F_Nurse_LinWanZhen/);
assert.match(wardSource,/setIdentitySecondConsultKeyBorrowed/);
assert.match(routeDirectorSource,/SECOND_5F_CONSULT_KEY_BORROWED/);
assert.match(routeDirectorSource,/id: 'IDENTITY_SECOND_5F_NURSE_STATION'/);
assert.ok(mainSourceFor316.includes("borrowedSecondConsultKey"));
assert.ok(mainSourceFor316.includes("interactable.doorId==='room_504'"));
assert.match(sceneSource,/向 5F 護理站借會診備用鑰匙/);
assert.match(sceneSource,/歸還 5F 會診備用鑰匙/);
assert.match(sceneSource,/clearFlag:\(identity==='ZHOU'\|\|identity==='CHEN'\)\?'SECOND_5F_CONSULT_KEY_BORROWED'/);
console.log('PASS pre-handoff M4: Zhou/Chen borrow 504-only consult key, assess patient, review transfer, return key');

const routeSceneSource=readFileSync(new URL('./src/story/IdentityRouteScenes.js',import.meta.url),'utf8');
const uiManagerSource=readFileSync(new URL('./src/ui/UIManager.js',import.meta.url),'utf8');
const m1Slice=routeSceneSource.slice(routeSceneSource.indexOf("    M1: ["),routeSceneSource.indexOf("    M2: ["));
assert.doesNotMatch(m1Slice,/speaker:'學長'/);
assert.match(m1Slice,/以前.*學長/);
assert.match(m1Slice,/簽署值班簿/);
assert.match(m1Slice,/取得 HIS 登入卡/);
assert.match(m1Slice,/完成 HIS 電子交班/);
assert.match(m1Slice,/解鎖 316 值班物品櫃/);
assert.match(m1Slice,/領取正式值班物品/);
assert.match(routeDirectorSource,/index===1\) return \{ id:'DUTY_LOG'.*completeTask:'DUTY_LOG'/);
assert.match(routeDirectorSource,/index===2\) return \{ type:'credential_drawer_316'.*completeFlag:'HIS_CREDENTIALS'/);
assert.match(routeDirectorSource,/index===3\) return \{ type:'workstation'.*completeTask:'E_HANDOFF'/);
assert.match(routeDirectorSource,/index===4\) return \{ type:'locker_316'.*completeFlag:'LOCKER_OPENED'/);
assert.match(routeDirectorSource,/index===5\) return \{ id:'KEY_PICKUP'.*completeTask:'KEY_PICKUP'/);
assert.match(routeDirectorSource,/freeTypes=new Set\(\['duty_log','credential_drawer_316','workstation','locker_316','key'\]\)/);
assert.match(routeDirectorSource,/完成 316 交班（可自由操作）/);
assert.match(uiManagerSource,/SYSTEM WARNING：CURRENT DUTY PHYSICIAN 與歷史值班索引不一致/);
assert.match(uiManagerSource,/if\(isIdentityRouteMode\(\)\)\{[\s\S]*M1_HANDOFF_CHOICE_RESOLVED[\s\S]*commitNightHandoff/);
assert.match(uiManagerSource,/錯誤：未插入夜間值班醫師登入卡｜終端處於待機鎖定/);
assert.match(uiManagerSource,/我沒有密碼。登入卡應該還在這間辦公室裡/);
assert.match(uiManagerSource,/CURRENT DUTY PHYSICIAN：PRESENT｜NAME SOURCE：NULL｜HISTORICAL POINTER：409-A／CORRUPTED/);
assert.match(uiManagerSource,/請輸入交班時間代碼（HHMM）/);
assert.match(routeDirectorSource,/bindingCompletionReady/);
assert.match(routeDirectorSource,/setIdentityDutyItemsVisible/);
assert.match(routeSceneSource,/316 電話/);
assert.match(routeSceneSource,/嘻嘻，你又回來了/);
assert.match(routeDirectorSource,/LI_DUTY_CALL_2000/);
assert.match(routeDirectorSource,/ER_DOCTOR_CHARTING/);
assert.match(routeSceneSource,/奇怪……大家不是都走了？怎麼這時候還有人打 316/);
assert.match(routeSceneSource,/醫師請你走八樓天橋過來第二院區，門禁已打開/);
assert.match(routeSceneSource,/ZHANG_OUTBOUND_8F/);
assert.match(routeSceneSource,/glimpse6f:true/);
assert.match(routeSceneSource,/transferSignChoice:true/);
assert.match(routeDirectorSource,/M4_409A_ORDER_PATIENTIZATION/);
assert.match(routeSceneSource,/警衛台舊相簿/);
assert.match(routeDirectorSource,/SECOND_GUARD_PHOTO_ALBUM/);
assert.match(routeDirectorSource,/M7_HISTORICAL_PROCEDURE_PATIENTIZATION/);
assert.match(routeDirectorSource,/playVentilationCollapse/);
assert.match(routeDirectorSource,/M7_HISTORICAL_ERROR_REPLAYED/);
assert.match(routeDirectorSource,/startZhangArchivePressure/);
assert.match(routeDirectorSource,/04:09 系統資料總核銷即將封存/);
assert.match(routeDirectorSource,/zhang-archive-pressure-active/);
assert.match(routeDirectorSource,/playCartWheelRattle/);
assert.match(routeDirectorSource,/ARCHIVE_PURGE_PATIENTIZATION/);
assert.match(routeDirectorSource,/ZHANG_ARCHIVE_PURGE_TRIGGERED/);
assert.doesNotMatch(routeDirectorSource,/playElevatorGlimpse/,'arrival dialogue must not own the preview');
assert.match(uiManagerSource,/shouldPreviewSixthFloor/,'elevator ascent owns the preview');
const glimpseSource=readFileSync('./src/story/ElevatorGlimpseScene.js','utf8');
assert.match(glimpseSource,/playElevatorCableScrape/);
assert.match(glimpseSource,/playAmbuBagBurst/);
assert.match(routeSceneSource,/需要黑咖啡|警衛台永遠有一壺煮過頭的咖啡/);
assert.match(routeSceneSource,/剛才監視器有點怪/);
assert.match(routeSceneSource,/畫面裡好像多了一個人/);
assert.match(routeSceneSource,/監控室電話/);
assert.match(routeSceneSource,/cctvCg: identity==='ZHANG'/);
assert.match(routeDirectorSource,/ZHANG_CCTV_DOPPELGANGER/);
assert.match(routeDirectorSource,/STAFF MATCH = NONE/);
assert.match(routeSceneSource,/第一院區 2F 急診/);
assert.match(routeSceneSource,/erRegistrationChoice: identity==='ZHANG'/);
assert.match(routeSceneSource,/forcedBridgeReveal:true/);
assert.match(routeSceneSource,/accidentCg:true/);
assert.doesNotMatch(routeSceneSource,/安妮.*回頭啊/s);
assert.match(routeSceneSource,/警衛台後方照片/);
assert.match(routeSceneSource,/ZHANG_3F_ARCHIVE/);
assert.match(routeDirectorSource,/IDENTITY_ZHANG_SECOND_CAMPUS/);
assert.match(routeDirectorSource,/IDENTITY_ZHANG_ER_FROM_CCTV/);
assert.match(routeDirectorSource,/IDENTITY_SECOND_2F_CCTV_PHONE/);
assert.match(routeDirectorSource,/SECOND_2F_CCTV_DESK/);
assert.match(routeDirectorSource,/proximityBridge:true/);
assert.match(routeDirectorSource,/playForcedBridgeReveal/);
assert.match(routeDirectorSource,/primaryText:'忍住，不回頭'/);
assert.match(routeDirectorSource,/secondaryText:'回頭確認'/);
assert.match(routeDirectorSource,/ER_UNVERIFIED_RECORD_PATIENTIZATION/);
assert.match(routeDirectorSource,/ZHANG_6F_ACCIDENT_MEMORY/);
assert.match(routeDirectorSource,/ARCHIVE_HISTORY_PHOTO_WALL/);
assert.match(routeDirectorSource,/BRIDGE_LOOKBACK_PATIENTIZATION/);
assert.match(routeDirectorSource,/BRIDGE_MANUAL_LOOKBACK_PATIENTIZATION/);
const second1FSource=readFileSync(new URL('./src/world/zones/SecondCampus1F.js',import.meta.url),'utf8');
assert.match(second1FSource,/SECOND_GUARD_PHOTO_ALBUM/);
assert.match(second1FSource,/警衛台舊相簿/);
const skybridgeSource=readFileSync(new URL('./src/world/zones/Skybridge.js',import.meta.url),'utf8');
assert.match(skybridgeSource,/deviation>95\*Math\.PI\/180/);
assert.match(skybridgeSource,/this\.lookbackTimer<\.40/);
assert.match(skybridgeSource,/deviation<45\*Math\.PI\/180/);
const second2FSource=readFileSync(new URL('./src/world/zones/SecondCampus2F.js',import.meta.url),'utf8');
assert.match(second2FSource,/Second2F_CCTV_Phone/);
assert.match(second2FSource,/IDENTITY_SECOND_2F_CCTV_PHONE/);
assert.match(second2FSource,/SECOND_2F_CCTV_ARCHIVE_WALL/);
assert.match(second2FSource,/SECOND_2F_CCTV_DESK/);
assert.match(second2FSource,/ZHANG_CCTV_HINT_RECEIVED/);
const first3FSource=readFileSync(new URL('./src/world/zones/FirstCampus3F.js',import.meta.url),'utf8');
assert.match(first3FSource,/ARCHIVE_HISTORY_PHOTO_WALL/);
const b2RecapSource=readFileSync(new URL('./src/story/B2FireRecapDirector.js',import.meta.url),'utf8');
const b2Doctors={
  ZHANG:{name:'張守恆',full:'MED-870409',masked:'MED-87••••'},
  LI:{name:'李承禮',full:'MED-820316',masked:'MED-82••••'},
  ZHOU:{name:'周啟文',full:'MED-880217',masked:'MED-88••••'},
  CHEN:{name:'陳柏勳',full:'MED-890605',masked:'MED-89••••'}
};
const b2NeutralMap=buildVictimMap();
for(const [identity,profile] of Object.entries(b2Doctors)){
  const map=buildVictimMap(identity);
  assert.equal(map,b2NeutralMap,`B2 visible physician map must be seed-neutral: ${identity}`);
  assert.equal(map.includes(profile.name),false,`B2 must redact every physician name: ${identity}`);
  assert.equal(map.includes(profile.full),false,`B2 must redact every full physician employee ID: ${identity}`);
  assert.equal(map.includes(profile.masked),true,`B2 must preserve masked employee prefix: ${identity}`);
}
assert.match(b2RecapSource,/buildVictimMap\(\)/);
assert.match(b2RecapSource,/完整姓名與完整員編配對必須到 3F 文史館/);
assert.match(mainSourceFor316,/hiddenIdentity:identityLoopMode\?identityManager\?\.currentIdentity:null/);
assert.match(mainSourceFor316,/CURRENT SELF：CORRUPTED｜409-A 死者姓名欄遭除籍塗銷｜員編前綴 MED-87••••/);
const identityPanelSource=readFileSync(new URL('./src/ui/IdentityLoopPanel.js',import.meta.url),'utf8');
assert.match(identityPanelSource,/分別選擇姓名與員編/);
assert.match(identityPanelSource,/identity-entry-form/);
assert.match(identityPanelSource,/正式提交交班/);
assert.match(identityPanelSource,/input.type='radio'/);
assert.doesNotMatch(identityPanelSource,/name.type='text'|employeeId.type='text'/);
const level3Source=readFileSync(new URL('./src/world/Level3FBlockout.js',import.meta.url),'utf8');
assert.match(level3Source,/keyGroup\.position\.set\(2\.39, 1\.02, 7\.55\)/);
assert.match(level3Source,/316_LockerDoor/);
assert.match(level3Source,/markLockerOpen\(showContents=true\)/);
assert.doesNotMatch(uiManagerSource,/markTaskComplete\('KEY_PICKUP'\);[\s\S]{0,120}markLockerOpen/);
assert.match(uiManagerSource,/櫃門已解鎖｜請關閉畫面並從櫃內拿取實體鑰匙與感應卡/);
console.log('PASS 316 physical handoff: log UI -> credential card -> HIS UI -> code 1700 cabinet -> physical key/card pickup');

console.log('PASS Zhang narrative chain: 316 phone -> 8F/6F glimpse -> 5F -> coffee -> gated CCTV/phone -> forced Annie -> ER choice -> 6F accident -> 1F/B2 -> 3F archive -> 316');
for(const [identity,route] of Object.entries(expected))for(const milestone of ['M1','M2','M8','M9','B2']){
  const store=storage();
  store.setItem(IDENTITY_STORAGE_KEY,JSON.stringify({metaSave:{completedGoodEnds:['LI']},runSave:{currentIdentity:identity,currentMilestone:milestone,evidence:{old:{id:'old'}},b2Entered:true}}));
  const migrated=new IdentityManager(store);
  assert.equal(migrated.currentIdentity,identity);
  assert.equal(migrated.currentRouteStep,route[0]);
  assert.deepEqual(migrated.runSave.completedStoryModules,[]);
  assert.deepEqual(migrated.metaSave.completedGoodEnds,['LI']);
  assert.equal(new IdentityManager(store).currentRouteStep,route[0]);
  assert.equal(JSON.parse(store.value).version,2);
}
console.log('PASS metadata resolves real spawns without identity labels; 20 legacy unfinished saves restart durably without fabricated modules');
const adjacent=IdentityManager.createForTest('LI');
assert.equal(adjacent.advanceMilestone('M2'),true);
assert.deepEqual(adjacent.runSave.completedStoryModules,['M1']);
assert.equal(adjacent.advanceMilestone('M4'),false);
assert.equal(adjacent.currentRouteStep,'M2');
console.log('PASS legacy advanceMilestone permits only the next route step');
const wrongStore=storage();
const wrong=IdentityManager.createForTest('LI',wrongStore);
while(wrong.currentRouteStep!=='M9')assert.equal(wrong.completeRouteStep(wrong.currentRouteStep),true);
wrong.commitM9('CHEN','CHEN');
const restored=new IdentityManager(wrongStore);
restored.restoreOrStartRun();
assert.equal(restored.runSave.runEnded,true);
assert.equal(restored.runSave.m9CommittedChoice,'CHEN');
assert.equal(restored.commitM9('LI','LI').reason,'ALREADY_COMMITTED');
assert.deepEqual(restored.metaSave.completedGoodEnds,[]);
restored.startNewRun();
assert.equal(restored.runSave.runEnded,false);
console.log('PASS good and wrong endings survive restore; only explicit new run replaces ended state');

const privateNames=['張守恆','李承禮','周啟文','陳柏勳','林婉真','王世榮','謝玉琴','劉志遠'];
assert.equal(anonymousNarrative('終身奉獻獎 蔡護理督導'),'終身奉獻獎 未辨識護理督導');
const placeholderNames=['陳○○','林○○','葉○○','許○○','郭○○','鄭○○','王○○'];
for(const name of placeholderNames){
  const redacted=anonymousNarrative(`名冊：${name}／316`);
  assert.equal(redacted.includes(name[0]),false,name);
  assert.equal(redacted.includes('○'),false,name);
  assert.ok(redacted.startsWith('名冊：')&&redacted.endsWith('／316'),name);
  assert.ok(redacted.length>'名冊：／316'.length,name);
}
console.log('PASS all seven placeholder surnames anonymized without losing roster context');
for(const name of [...privateNames,'陳怡君']){
  assert.equal(anonymousNarrative(`值班：${name}；床位504B`),'值班：身分待核；床位504B',name);
}
for(const surname of ['張','李','周','陳','林','王','謝','劉','許','江','方']){
  for(const title of ['醫師','住院醫師','主治醫師']){
    const redacted=anonymousNarrative(`${surname}${title}／316`);
    assert.equal(redacted.includes(surname),false,`${surname}${title}`);
    assert.ok(redacted.endsWith('／316'),`${surname}${title}: preserve room number`);
    assert.ok(redacted.length>'／316'.length,`${surname}${title}: retain anonymous text`);
  }
}
for(const id of ['MED-12','MED-123','MED-1234','MED-12345','MED-870409','MED-820316','MED-880217','MED-890605']){
  assert.equal(anonymousNarrative(`工號：${id}；17:00`),'工號：MED-••••••；17:00',id);
}
assert.equal(anonymousNarrative('4F／409-A／504B／02:17'),'4F／409-A／504B／02:17');
console.log('PASS anonymousNarrative: all eight personnel names, patient name, 33 surname titles and MED IDs masked; clinical identifiers preserved');

const textureCases=[
  {file:'./src/world/zones/FirstCampus3F.js',call:/rctx\.fillText\([^;\r\n]*,x\+112,y\+44\)/g,inputs:['林醫師','周醫師','陳醫師','許醫師','江醫師','方醫師'],variable:'name'},
  {file:'./src/world/shared/PlanArchitecture.js',call:/ctx\.fillText\([^;\r\n]*,42,y,940\)/g,inputs:['第一線：李住院醫師　｜　總醫師：316 室','病人：陳怡君　｜　床位：504B'],variable:'text'},
  {file:'./src/world/shared/WardFloorplan.js',call:/ctx\.fillText\([^;\r\n]*,34,170\)/g,inputs:['姓名：陳怡君'],variable:'text'},
  {file:'./src/world/zones/FirstCampus8FBridgeEntry.js',call:/ctx\.fillText\([^;\r\n]*,\s*128,\s*260\)/g,inputs:[...privateNames,...placeholderNames],variable:'title'},
  {file:'./src/world/zones/Skybridge.js',call:/ctx\.fillText\([^;\r\n]*,\s*128,\s*260\)/g,inputs:[...privateNames,...placeholderNames],variable:'title'}
];
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
try{
  for(const search of ['','?mode=identity','?mode=linear']){
    Object.defineProperty(globalThis,'window',{value:{location:{search}},writable:true,configurable:true});
    const identityMode=search!=='?mode=linear';
    for(const fixture of textureCases){
      const calls=readFileSync(new URL(fixture.file,import.meta.url),'utf8').match(fixture.call)||[];
      assert.equal(calls.length,1,`locate actual texture draw: ${fixture.file}`);
      for(const input of fixture.inputs){
        const painted=[];
        const ctx={fillText:value=>painted.push(value)};
        const scope={ctx,rctx:ctx,x:0,y:0,[fixture.variable]:input,worldNarrative};
        runInNewContext(calls[0],scope);
        assert.deepEqual(painted,[identityMode?anonymousNarrative(input):input],`${fixture.file}: ${search} ${input}`);
        if(identityMode){
          assert.notEqual(painted[0],input,`sensitive texture text must change: ${fixture.file}`);
          const leaked=[];
          const leakyCtx={fillText:value=>leaked.push(value)};
          runInNewContext(calls[0],{...scope,ctx:leakyCtx,rctx:leakyCtx,worldNarrative:value=>value});
          assert.throws(()=>assert.deepEqual(leaked,painted),assert.AssertionError,`privacy bypass must fail: ${fixture.file}`);
        }
      }
    }
    for(const cctv of [false,true]){
      const labels=[];let drawingCalls=0;
      const ctx=new Proxy({canvas:{width:1800},fillText:text=>labels.push(text)},{get(target,key){return key in target?target[key]:()=>{drawingCalls+=1;};}});
      drawCharacterStrip(ctx,privateNames,{labels:true,cctv});
      assert.ok(drawingCalls>0,'portrait rendering must still draw figures');
      assert.deepEqual(labels,identityMode?[]:privateNames,`portrait labels: ${search}, cctv=${cctv}`);
    }
  }
}finally{
  if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);
  else delete globalThis.window;
}
console.log('PASS real roster/board/bed-card/8F/skybridge draw calls redact in identity modes, preserve linear text, and reject privacy-bypass controls');
console.log('PASS real CharacterPortrait strips suppress all eight labels in identity modes and preserve linear labels in photo/CCTV rendering');
