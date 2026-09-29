import { WORLD_SPAWNS } from './world/shared/WorldRoutes.js';
// main.js - Night Corridor Act 1
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { auditSceneMaterials, preloadMaterialSurfaces } from './art/MaterialRegistry.js';
import { prepareZoneWithRetry } from './art/ZoneReadiness.js';
import { zoneAssetManifest, preloadZoneEssential, preloadZoneOptional } from './art/ZoneAssetManifest.js';
import { preloadAssetNames } from './art/AssetRegistry.js';
import { preloadArtPass2 } from './art/ArtPass2Assets.js';
import { IdentityRouteDirector } from './story/IdentityRouteDirector.js';
import { ROUTE_STEPS } from './story/IdentityRoutes.js';
import { anonymousNarrative } from './story/IdentityPrivacy.js';

const identityLoopMode=new URLSearchParams(location.search).get('mode')!=='linear';
const identityManager=new IdentityManager();
const forcedIdentity=new URLSearchParams(location.search).get('identity');
if(identityLoopMode&&forcedIdentity&&new URLSearchParams(location.search).get('qa')==='story')identityManager.startNewRun({forceIdentity:forcedIdentity,restart:true});
if(identityLoopMode)identityManager.restoreOrStartRun();
document.body.classList.toggle('identity-route-mode',identityLoopMode);

soundManager.installUnlockHandlers();
gameState.addListener((event,data)=>{
  if(event==='flag_changed'&&data.flag==='PHONE_RING_ACTIVE'){
    if(data.val)soundManager.startPhoneRing();else soundManager.stopPhoneRing();
  }
  if(event==='loop_reset')soundManager.stopPhoneRing();
});
RectAreaLightUniformsLib.init();
const requestedOpeningZone = new URLSearchParams(location.search).get('zone');
const openingZoneId = identityLoopMode ? (ROUTE_STEPS[identityManager.currentRouteStep]?.zoneId||'first_campus_3f') : (zoneAssetManifest[requestedOpeningZone] ? requestedOpeningZone : 'first_campus_3f');
const loadingMask=document.getElementById('asset-loading-mask');
const loadingMessage=document.getElementById('asset-loading-message');
const loadingRetry=document.getElementById('asset-loading-retry');
while(true){
  try{await preloadZoneEssential(openingZoneId);break;}
  catch(error){
    console.error('[art] opening essential load failed',error);
    loadingMessage.textContent='必要資料載入失敗，請重試。';
    loadingRetry.hidden=false;
    await new Promise(resolve=>{loadingRetry.onclick=resolve;});
    loadingRetry.onclick=null;loadingRetry.hidden=true;
    loadingMessage.textContent='夜間系統載入中…';
  }
}
// Art Pass 2 is lightweight visual enrichment (~260 KB total) and is intentionally
// background-prefetched. It never blocks zone readiness or reintroduces whole-world preload.
void preloadArtPass2().catch(error=>console.warn('[artpass2] background preload failed',error));
const prefetchDestinationAssets = async destination => {
  const zoneId=destination?.zoneId;
  await prepareZoneWithRetry(zoneId);
  void preloadZoneOptional(zoneId).catch(error => console.warn('[art] optional zone asset preload failed', error));
};
let fastPathWorldPreload=Promise.resolve();
import { gameState } from './core/GameState.js';
import { DutyEventManager } from './core/DutyEventManager.js';
import { Level3FBlockout } from './world/Level3FBlockout.js';
import { applyAct1CollisionHotfix } from './world/CollisionHotfix.js';
import { FPSController } from './player/FPSController.js';
import { UIManager } from './ui/UIManager.js';
import { soundManager } from './audio/SoundManager.js';
import { floorStateManager, GamePhase } from './core/FloorStateManager.js';
import { persistentMemory, TRUE_NAME_CANON } from './core/PersistentMemory.js';
import { legendState, NodeState } from './core/LegendStateManager.js';
import { LoopManager } from './core/LoopManager.js';
import { canAccess } from './core/AccessGraph.js';
import { getMemorySequence, IDENTITY_CANDIDATES } from './story/NarrativeV22.js';
import { CinematicDirector } from './story/CinematicDirector.js';
import { ActPresentationDirector } from './story/ActPresentationDirector.js';
import { FinalPatientizationDirector } from './story/FinalPatientizationDirector.js';
import { FinalSuccessDirector } from './story/FinalSuccessDirector.js';
import { B2FireRecapDirector } from './story/B2FireRecapDirector.js';
import { photoSequence, sharedAlbum, FLOOR_PHOTO_KEYS } from './story/SharedMedia.js';
import { IdentityManager, IDENTITY_PROFILES } from './core/IdentityManager.js';
import { IdentityLoopPanel } from './ui/IdentityLoopPanel.js';


// Setup Three.js Scene & Renderer
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x201c19);
scene.fog = new THREE.FogExp2(0x2a2522, 0.018);

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.1,
  220
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);
const reflectionRoom = new RoomEnvironment();
const reflectionGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = reflectionGenerator.fromScene(reflectionRoom, .04).texture;
scene.environmentIntensity = .25;
reflectionRoom.dispose();
reflectionGenerator.dispose();
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new OutputPass());

import { WorldRouter } from './world/WorldRouter.js';

// Instantiate FPS Controller
const controller = new FPSController(
  camera,
  renderer.domElement,
  [],
  [],
  []
);
const cinematicDirector = new CinematicDirector({ camera, controller, gameState });

// Instantiate World Router
const worldRouter = new WorldRouter(scene, camera, controller);
window.worldRouter = worldRouter;
window.__materialAudit = () => ({
  zoneId: worldRouter.activeZoneId,
  ...auditSceneMaterials(worldRouter.activeZoneInstance?.zoneGroup)
});
const dutyEvents = new DutyEventManager(gameState);
persistentMemory.applyToGameState(gameState);
gameState.setFlag('FAST_PATH_3F',persistentMemory.data.loopCount>=1);

// Instantiate UI Manager
let uiManager;
uiManager = new UIManager(
  gameState,
  () => {
    // On modal close, resume player controls
    controller.enabled = true;
    setTimeout(() => {
      const overlayActive =
        document.querySelector('.modal-overlay.active') ||
        document.querySelector('.cutscene-overlay.active');

      if (
        controller.enabled &&
        !overlayActive &&
        document.pointerLockElement !== renderer.domElement
      ) {
        renderer.domElement.requestPointerLock();
      }
    }, 100);
  },
  () => {
    // Elevator cutscene finish callback
    controller.enabled = true;
    renderer.domElement.requestPointerLock();
  }
);

uiManager.identityMediaContext=()=>identityLoopMode?{identity:identityManager.currentIdentity,step:identityManager.currentRouteStep}:null;

const identityLoopPanel=new IdentityLoopPanel(identityManager,{debug:new URLSearchParams(location.search).get('qa')==='story'||new URLSearchParams(location.search).get('debug')==='1',onNewRun:restartFreshExperience});
if(identityLoopMode)identityLoopPanel.start();
const identityRouteDirector=new IdentityRouteDirector({manager:identityManager,panel:identityLoopPanel,worldRouter,controller,gameState,uiManager,prepareZone:prepareZoneWithRetry,onEnding:result=>{
  if(result.type==='GOOD_END'){
    gameState.setFlag('GAME_COMPLETE',true);
    gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',false);
    persistentMemory.completePerfectEnding();
    controller.enabled=false;
    return;
  }
  if(result.type==='WRONG_MEMORY_BAD_END'){
    triggerFinalPatientizationFailure(()=>identityLoopPanel.newRun());
    return;
  }
  const identity=identityManager.currentIdentity;
  const reasonText={
    M2_BED33_APPROVAL_PATIENTIZATION:'你把不存在的 Bed 33／409-A 正式寫回收治流程。',
    ER_UNVERIFIED_RECORD_PATIENTIZATION:'你在身分未核對前建立了新的無名病歷。',
    ER0033_DUPLICATE_RECORD_PATIENTIZATION:'現場沒有病人，你卻讓異常舊紀錄製造出新的無名病歷。',
    M4_409A_ORDER_PATIENTIZATION:'你簽下了來源未核對、卻已預填「轉入 409-A」的轉送醫囑單。',
    CHEN_ER_TRANSFER_PATIENTIZATION:'你讓一張已經寫好目的地的跨院轉送聯取代了臨床判斷，把自己也送進 409-A。',
    BRIDGE_LOOKBACK_PATIENTIZATION:'你在天橋上回頭確認了不該被確認的人影。',
    BRIDGE_MANUAL_LOOKBACK_PATIENTIZATION:'你已選擇不回頭，卻在離開天橋前再次轉身。',
    M7_HISTORICAL_PROCEDURE_PATIENTIZATION:'你照著熟悉的舊程序重演了 1 → 3 → 4。',
    ARCHIVE_PURGE_PATIENTIZATION:'04:09 資料總核銷完成；未被你及時取回的姓名與值班身分遭到永久格式化。'
  }[result.reason]||'你重演了會把值班醫師重新分類成 409-A 病人的錯誤。';
  persistentMemory.recordOverride(result.reason||'IDENTITY_ROUTE');
  uiManager.playLegendOverride({legend:'409 PATIENTIZATION',reason:reasonText},()=>{
    identityManager.startNewRun({forceIdentity:identity,restart:true});
    location.reload();
  });
},onRouteStep:step=>soundManager.setRouteTheme(identityManager.currentIdentity,step)});

const actPresentationDirector=new ActPresentationDirector({
  gameState,
  persistentMemory,
  controller,
  pointerElement:renderer.domElement,
  getZoneId:()=>worldRouter.activeZoneId
});

const finalPatientizationDirector=new FinalPatientizationDirector({
  soundManager
});

const finalSuccessDirector=new FinalSuccessDirector({
  soundManager
});

const b2FireRecapDirector=new B2FireRecapDirector({
  soundManager
});

const loopManager=new LoopManager({
  gameState,worldRouter,controller,uiManager,
  prepareLoopReset:()=>prepareZoneWithRetry('first_campus_3f')
});
uiManager.setHandoffDecisionHandler(choice=>{
  if(choice==='default'){
    loopManager.triggerLegendOverride('HANDOFF_DEFAULT',{legend:'M1 — 預設值班模板覆寫',reason:'你接受了沒有姓名來源的預設身分。'});
    return;
  }
  persistentMemory.addJournalNote('M1_MANUAL_IDENTITY','17:00：拒絕院內預設值班模板，保留「值班醫師／姓名待核」狀態，直到找到原始紀錄。');
});

function registerBed33Clue(clueId){
  const previous=legendState.getState('LEGEND_BED33');
  const state=legendState.registerClue('LEGEND_BED33',clueId);
  if(state===NodeState.UNDERSTOOD&&previous!==NodeState.UNDERSTOOD){
    gameState.setFlag('BED33_UNDERSTOOD',true);
    gameState.setFlag('WHERE_0409',true);
    persistentMemory.learnCode('code_0409');
    persistentMemory.addJournalNote('INFER_0409','04:09……不是時間。是 409？');
    uiManager.showSubtitle('值班醫師','「04:09……不是時間。是 409？」',3600);
  }
  return state;
}

function trigger409PostSealKnock(){
  if(!gameState.isTaskComplete('P1_NORMAL_EVENT_DONE'))return false;
  if(gameState.getFlag('KNOCK_408C_POST_SEAL_PLAYED')||gameState.getFlag('KNOCK_408C_POST_SEAL_PENDING'))return false;

  gameState.setFlag('KNOCK_408C_POST_SEAL_PENDING',true);
  const expectedZone='first_campus_4f';

  setTimeout(async()=>{
    if(worldRouter.activeZoneId!==expectedZone){
      gameState.setFlag('KNOCK_408C_POST_SEAL_PENDING',false);
      return;
    }

    const ready=await soundManager.ensureRunning();
    if(!ready||worldRouter.activeZoneId!==expectedZone){
      gameState.setFlag('KNOCK_408C_POST_SEAL_PENDING',false);
      return;
    }

    gameState.setFlag('KNOCK_408C_POST_SEAL_PENDING',false);
    gameState.setFlag('KNOCK_408C_POST_SEAL_PLAYED',true);
    soundManager.playBed33KnockPattern(.16);
    uiManager.showSubtitle(
      '值班醫師',
      '「409 確實封鎖了……剛才那個敲擊聲，我也聽到了。」',
      4200
    );
  },520);

  return true;
}

uiManager.setBed33Handlers({
  onConfirm:()=>identityLoopMode
    ? identityRouteDirector.triggerPatientization('M2_BED33_APPROVAL_PATIENTIZATION')
    : loopManager.triggerBed33Override(),
  onDefer:()=>uiManager.showSubtitle('值班醫師','「先別簽。床位板、HIS 和 409 的狀態對不起來。」',3200),
  onReject:()=>{
    legendState.resolve('LEGEND_BED33');
    gameState.setFlag('BED33_RESOLVED',true);
    gameState.setFlag('WHERE_0409',true);
    gameState.markTaskComplete('LEGEND_BED33_RESOLVED');
    gameState.addEvidence(1);
    persistentMemory.learnCode('code_0409');
    persistentMemory.setProof('space',true);
    persistentMemory.setTrueNameFragment('frag_employeePrefix','MED-87');
    persistentMemory.resolveLegend('bed33');
    persistentMemory.addJournalNote('BED33_RESOLVED','409A 的床位單不是正常流程；上面的電子簽名也不是我留下的。');
    uiManager.showSubtitle('夜班護理師','「409 整修中？……奇怪，這張不是我印的。可是上面是你的電子簽名。」',5200);
    uiManager.updateTasks();
  }
});

function triggerPost2117DutyRoomSequence(){
  if(!gameState.getFlag('BOOTSTRAP_2117_RESOLVED'))return false;
  if(gameState.getFlag('POST_2117_DUTY_CALL_DONE'))return false;
  if(gameState.getFlag('POST_2117_DUTY_ROOM_TRIGGERED'))return true;

  gameState.setFlag('POST_2117_DUTY_ROOM_TRIGGERED',true);
  gameState.setFlag('POST_2117_RETURN_TO_DUTY_ROOM',false);
  controller.cancelAutoMove();
  uiManager.updateTasks();
  const paper=document.createElement('canvas');paper.width=1024;paper.height=640;
  const texture=new THREE.CanvasTexture(paper);texture.colorSpace=THREE.SRGBColorSpace;
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide});
  const record=new THREE.Mesh(new THREE.PlaneGeometry(.72,.45),material);
  record.name='DutyRoom_2117_RecapRecord';record.position.set(-10,.84,3.24);record.rotation.x=-Math.PI/2;
  const room=worldRouter.activeZoneInstance.zoneGroup;room.add(record);
  const drawRecord=count=>{
    const ctx=paper.getContext('2d');ctx.fillStyle='#e8e0ce';ctx.fillRect(0,0,1024,640);
    ctx.fillStyle='#263b32';ctx.font='bold 44px sans-serif';ctx.fillText('值班紀錄',50,76);
    ctx.font='36px sans-serif';
    ['21:17 — 被預先寫好的巡查','316 — 身分與權限','409 — 封鎖房間的敲擊'].slice(0,count).forEach((line,i)=>ctx.fillText(line,50,180+i*120));
    texture.needsUpdate=true;soundManager.playPaperSign();
  };
  const delta=new THREE.Vector3(-10,.84,3.24).sub(controller.position);
  const targetYaw=Math.atan2(-delta.x,-delta.z)-controller.yaw;
  const targetPitch=Math.atan2(delta.y,Math.hypot(delta.x,delta.z))-controller.pitch;
  void cinematicDirector.play({
    id:'21_17_DUTY_ROOM_ACTIVATION',durationMs:7000,
    keyframes:[{at:.12,yaw:targetYaw,pitch:targetPitch},{at:.9,yaw:targetYaw,pitch:targetPitch},{at:1,yaw:0,pitch:0}],
    cues:[
      {at:0,run:()=>{drawRecord(0);uiManager.showSubtitle('值班醫師','「把 21:17 / 316 / 409 記錄下來。」',6000);}},
      {at:.18,run:()=>drawRecord(1)},
      {at:.35,run:()=>drawRecord(2)},
      {at:.52,run:()=>drawRecord(3)},
      {at:.82,run:()=>{gameState.setGameTime('23:55');uiManager.showSubtitle('值班醫師','「已經半夜了？剛剛的數字要記錄下來。」',4000);}}
    ],
    onComplete:()=>{
      gameState.setGameTime('00:30');
      void actPresentationDirector.playAct2().then(()=>{
        startStoryPhoneCall('ER_GHOST_0033');
      }).catch(error=>console.error('[presentation] ACT II before phone failed',error));
    }
  }).catch(error=>console.error('[cinematic] 21:17 activation failed',error));
  return true;
}

function startStoryPhoneCall(kind){
  if(kind==='FAST_PATH_316')fastPathWorldPreload=prefetchDestinationAssets({zoneId:'first_campus_4f'});
  gameState.setFlag('PHONE_CALL_KIND',kind);
  gameState.setFlag('PHONE_ANSWERED',false);
  gameState.setFlag('PHONE_RING_ACTIVE',true);
  soundManager.startPhoneRing();
  worldRouter.activeZoneInstance?.syncStoryState?.();
  uiManager.updateTasks();
}

function unlockSecondCampusAccess(){
  if(gameState.getFlag('SECOND_CAMPUS_ACCESS'))return;
  gameState.setGameTime('01:15');
  gameState.setFlag('SECOND_CAMPUS_ACCESS',true);
  gameState.setFlag('BRIDGE_ACCESS',true);
  gameState.setFlag('SECOND_CAMPUS_OBJECTIVE_ACTIVE',true);
  persistentMemory.addJournalNote('SECOND_CAMPUS_CALL','第二院區護理站主動開了八樓天橋權限；在這之前我根本沒有跨院區資格。');
  uiManager.showDialogue([{speaker:'第二院區護理師',text:'「值班醫師，第二院區 5F 有一位病人需要精神科評估。」'},{speaker:'第二院區護理師',text:'「八樓天橋的門禁權限已開放，請到 5F 護理站報到。」'}]);
  uiManager.updateTasks();
}

function completeM5IfReady(){
  if(!gameState.getFlag('M5_ROUTE_CHOICE_RESOLVED'))return false;
  if(!gameState.getFlag('M5_CCTV_RESOLVED')){
    uiManager.updateTasks();
    return false;
  }
  gameState.setGameTime('02:00');
  gameState.setFlag('M5_ROUTE_RESOLVED',true);
  gameState.setFlag('FLOOR6_AVAILABLE',true);
  gameState.setFlag('SIX_FLOOR_HISTORY_CONFIRMED',true);
  if(gameState.getFlag('CHEST_RECORD_MATCH')){gameState.setFlag('IDENTITY_PROOF',true);persistentMemory.setProof('identity',true);}
  uiManager.updateTasks();
  return true;
}

function getDeferred316IdentityHints() {
  const hints=[];
  if(!gameState.getFlag('B2_ADMIN_SOURCE'))hints.push('3F 行政辦公室');
  if(!gameState.getFlag('B2_HISTORY_SOURCE'))hints.push('文史封存');
  return hints;
}

function establishCanonicalIdentity({at316=false}={}) {
  persistentMemory.setTrueNameFragment('frag_employeePrefix','MED-87');
  persistentMemory.setTrueNameFragment('frag_surname','張');
  persistentMemory.setTrueNameFragment('frag_givenName_1','守');
  persistentMemory.setTrueNameFragment('frag_givenName_2','恆');
  persistentMemory.setTrueNameFragment('frag_title','住院醫師');
  persistentMemory.setTrueNameFragment('frag_employeeFull','MED-870409');
  persistentMemory.resolveTrueName(TRUE_NAME_CANON);
  gameState.setFlag('M7_B2_RESOLVED',true);
  if(at316)gameState.setFlag('M7_IDENTITY_RESOLVED_AT_316',true);
  while(persistentMemory.data.identityErosionLevel<4)persistentMemory.raiseErosion(1);
  return persistentMemory.data.trueNameResolved===true;
}

function activateB2OverwriteRoute(){
  const identity=identityLoopMode?identityManager?.currentIdentity:null;
  const zhangIdentityRoute=identity==='ZHANG';
  const chenDispatchRoute=identity==='CHEN';
  const genericIdentityBattle=identityLoopMode?identity==='ZHOU':true;
  gameState.setFlag('B2_TERMINAL_CONTACTED',true);
  gameState.setFlag('B2_FIRE_RECAP_SEEN',true);
  gameState.setFlag('RECORD_OVERWRITE_ACTIVE',true);
  gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',genericIdentityBattle);
  gameState.setFlag('M8_CODE_BLACK_ANNOUNCED',genericIdentityBattle);
  gameState.setFlag('LAST_CALL_SEEN',true);
  gameState.setFlag('B2_HISTORY_FALLBACK_ACTIVE',false);
  gameState.setFlag('ARCHIVE_PERSONNEL_OBJECTIVE',zhangIdentityRoute);
  gameState.setFlag('CHEN_B1_DISPATCH_ACCESS',chenDispatchRoute);
  if(zhangIdentityRoute)gameState.setFlag('ARCHIVE_ACCESS_KEY',true);
  persistentMemory.resolveLegend('lastCall');
  const postB2Objective=identity==='CHEN'
    ? 'B2 後沿地下後勤線進入 B1 救護車接駁調度室，完成跨院程序性身分核對。'
    : identity==='ZHANG'
      ? 'B2 後前往 3F 文史館，在 04:09 核銷前取得最後歷史拼圖。'
      : identity==='LI'
        ? 'B2 後回 3F 行政辦公室與文史室交叉核對，再返回 316。'
        : '離開 B2 後依目前身分路線繼續完成最後核對。';
  persistentMemory.addJournalNote(
    'B2_FIRE_RECAP',
    `B2 封存終端重播 1998 火災：02:17 的錯誤程序使防火門與備援排煙失常；八名罹難者的最後位置重新對上。回放結束時，一個 UNKNOWN SESSION 正在再次覆寫這些紀錄。${postB2Objective}`
  );
  uiManager.updateTasks();
}

function playB2FireRecap(){
  if(gameState.getFlag('B2_FIRE_RECAP_SEEN'))return false;
  gameState.setFlag('B2_TERMINAL_CONTACTED',true);
  controller.enabled=false;
  void b2FireRecapDirector.play({
    hiddenIdentity:identityLoopMode?identityManager?.currentIdentity:null,
    onComplete:()=>{
      activateB2OverwriteRoute();
      const identity=identityLoopMode?identityManager?.currentIdentity:null;
      const message=identity==='ZHANG'
        ? '「火災紀錄已讀取。先回 3F 文史館核對院史影像與 1998 夜班人員檔案，再回 316 完成最終交班。」'
        : identity==='CHEN'
          ? '「火災紀錄已讀取。MED-89•••• 最後位置：空中天橋。常規逃生門已封閉；地下後勤線仍可通往 B1 救護車接駁調度室。」'
          : identity==='LI'
            ? '「火災紀錄已讀取。回 3F 行政辦公室與文史室交叉核對，再回 316。」'
            : '「UNKNOWN SESSION：紀錄覆寫進行中。有人正在把火災與人員資料再次塗掉。快離開 B2，回到 316，用正確權限阻止這一切。」';
      uiManager.showSubtitle('封存終端',message,7200);
      controller.enabled=true;
    }
  }).catch(error=>{
    console.error('[cinematic] B2 fire recap failed',error);
    activateB2OverwriteRoute();
    controller.enabled=true;
  });
  return true;
}

function restartFreshExperience(){
  persistentMemory.reset();
  try{
    for(const key of [
      'IdentyLoop_OpeningPresentationSeen',
      'IdentyLoop_Act2CardSeen',
      'IdentyLoop_Act3CardSeen',
      'IdentyLoop_SuccessOutroSeen'
    ])sessionStorage.removeItem(key);
  }catch{}
  location.reload();
}

function completeFinalIdentityAt316(name,employeeId,{deferred=false}={}) {
  const sourceVerified=
    gameState.getFlag('B2_FIRE_RECAP_SEEN') ||
    gameState.getFlag('M7_B2_RESOLVED') ||
    gameState.getFlag('HISTORY_PERSONNEL_PROFILES_REVIEWED');
  if(name!==TRUE_NAME_CANON||employeeId!=='0409'||!sourceVerified)return false;
  establishCanonicalIdentity({at316:deferred});
  gameState.setFlag('LAST_CALL_SEEN',true);
  gameState.setFlag('M8_CODE_BLACK_ANNOUNCED',true);
  gameState.setFlag('FINAL_SUCCESS_RECAP_MANAGED',true);
  gameState.setFlag('GAME_COMPLETE',true);
  gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',false);
  persistentMemory.resolveLegend('lastCall');
  persistentMemory.beginSuccessfulEndingReview();
  uiManager.updateTasks();
  controller.enabled=false;

  const playPerfectRecap=()=>finalSuccessDirector.play({
    onPerfect:()=>{
      gameState.setFlag('FINAL_PERFECT_END',true);
      persistentMemory.completePerfectEnding();
      uiManager.showFinalSuccess(TRUE_NAME_CANON);
      controller.enabled=false;
    },
    onReplay:()=>restartFreshExperience()
  }).catch(error=>{
    console.error('[cinematic] perfect-ending recap failed',error);
    persistentMemory.completePerfectEnding();
    uiManager.showFinalSuccess(TRUE_NAME_CANON);
    controller.enabled=false;
  });

  void cinematicDirector.play({
    id:'FINAL_SHIFT_COMPLETION_CG',
    durationMs:5200,
    keyframes:[{at:.22,yaw:-.22,pitch:-.035},{at:.58,yaw:.12,pitch:-.01},{at:.86,yaw:.035,pitch:.015},{at:1,yaw:0,pitch:0}],
    cues:[
      {at:.18,run:()=>uiManager.showEndingCG(TRUE_NAME_CANON)},
      {at:.56,run:()=>soundManager.playDoorLockClack()},
      {at:.78,run:()=>uiManager.showSubtitle('316 舊終端','「RECORD WRITE COMPLETE｜原始夜班紀錄已恢復。」',4200)}
    ],
    onComplete:()=>void playPerfectRecap()
  }).then(played=>{if(!played)void playPerfectRecap();})
    .catch(error=>{console.error('[cinematic] final shift completion failed',error);void playPerfectRecap();});
  return true;
}

function triggerFinalPatientizationFailure(onEscape){
  if(gameState.getFlag('FINAL_PATIENTIZATION_ACTIVE'))return;
  gameState.setFlag('FINAL_PATIENTIZATION_ACTIVE',true);
  gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',false);
  gameState.setFlag('RECORD_OVERWRITE_ACTIVE',false);
  persistentMemory.recordOverride('FINAL');
  const fullRecap=persistentMemory.claimOnce('finalHistoryRecap');

  uiManager.playLegendOverride({
    legend:'最終覆寫 — 409 PATIENTIZATION',
    reason:'權限核對失敗；值班醫師身分已被覆寫成 409-A 病人紀錄。'
  },()=>{
    void finalPatientizationDirector.play({
      fullRecap,
      onAccept:()=>{
        gameState.setFlag('FINAL_PATIENTIZATION_ACTIVE',false);
        gameState.setFlag('FINAL_HOSPITALIZED_END',true);
        gameState.setFlag('RECORD_OVERWRITE_COMPLETE',true);
        gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',false);
        persistentMemory.completeHospitalizedEnding();
        persistentMemory.addJournalNote('FINAL_HOSPITALIZED_END','最終權限核對失敗後，409-A 病人紀錄被正式封存；張守恆的值班身分未能恢復。');
        uiManager.updateTasks();
        controller.enabled=false;
      },
      onEscape:()=>{
        persistentMemory.beginFinalEscapeAttempt();
        gameState.setFlag('FINAL_PATIENTIZATION_ACTIVE',false);
        gameState.setFlag('FINAL_HOSPITALIZED_END',false);
        gameState.setFlag('FINAL_ESCAPE_RETRY',true);
        gameState.setFlag('RECORD_OVERWRITE_ACTIVE',true);
        const b2ExitIdentity=identityLoopMode?identityManager?.currentIdentity:null;
      gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',identityLoopMode?b2ExitIdentity==='ZHOU':true);
        controller.enabled=false;
        onEscape?.();
      }
    }).catch(error=>{
      console.error('[cinematic] final Patientization history failed',error);
      gameState.setFlag('FINAL_PATIENTIZATION_ACTIVE',false);
      gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',true);
      onEscape?.();
    });
  });
}

function revealFinal316Handoff({deferred=false}={}) {
  const openForm=()=>{
    controller.enabled=false;
    if(identityLoopMode){
      identityLoopPanel.openM9({onCommit:result=>{
        if(result.type==='GOOD_END'){
          const profile=IDENTITY_PROFILES[result.identity];
          gameState.setFlag('FINAL_SUCCESS_RECAP_MANAGED',true);
          gameState.setFlag('GAME_COMPLETE',true);
          gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',false);
          persistentMemory.resolveLegend('lastCall');
          persistentMemory.completePerfectEnding();
          uiManager.updateTasks();
          uiManager.showFinalSuccess(profile.name,profile.employeeId);
          return;
        }
        triggerFinalPatientizationFailure(()=>{identityLoopPanel.newRun();controller.enabled=true;});
      }});
      return;
    }
    uiManager.openFinalHandoff(({name,employeeId})=>{
      if(completeFinalIdentityAt316(name,employeeId,{deferred}))return;
      const hasInput=employeeId;
      uiManager.setFinalHandoffStatus(hasInput?'員編末四碼不符｜覆寫模板正在接管交班':'請輸入員編末四碼');
      if(hasInput){
        setTimeout(()=>{
          uiManager.closeFinalHandoff(false);
          triggerFinalPatientizationFailure(()=>{
            openForm();
            uiManager.setFinalHandoffStatus('409-A 臨時病歷已暫時改回「身分待核」｜316 權限視窗重新開啟｜請再次輸入員編末四碼');
          });
        },650);
      }
    });
    const hints=deferred?getDeferred316IdentityHints():[];
    uiManager.setFinalHandoffStatus(
      (hints.length?'線索可能仍在'+hints.join('與')+'。':'')+
      '有人嘗試覆寫模板已在 316 登入｜請輸入真正員編末四碼｜最後一次機會'
    );
  };
  const reveal=()=>uiManager.showSubtitle('316 舊終端','姓名、員編與夜班記憶正在重新排列。必須輸入正確權限，才能阻止紀錄覆寫。',3600);
  const screen=worldRouter.activeZoneInstance.zoneGroup.getObjectByName('DutyTerminal_316_LegacyScreen');
  const originalScreenMaterial=screen?.material;
  const recapCanvas=document.createElement('canvas');recapCanvas.width=1024;recapCanvas.height=640;
  const recapTexture=new THREE.CanvasTexture(recapCanvas);recapTexture.colorSpace=THREE.SRGBColorSpace;
  const recapMaterial=new THREE.MeshBasicMaterial({map:recapTexture});
  const drawRecap=(conflict)=>{
    const ctx=recapCanvas.getContext('2d');ctx.fillStyle=conflict?'#190f0e':'#071b15';ctx.fillRect(0,0,1024,640);
    ctx.fillStyle=conflict?'#df8c72':'#a8cfb4';ctx.font='32px monospace';
    const lines=conflict?['316 / IDENTITY TEMPLATE','LI CHENGLI — OVERWRITE PENDING','姓名欄位衝突｜交班尚未完成']:['316 / EVIDENCE RECOVERED','文史資料｜姓名與事故紀錄','員工資料｜MED-87••••','舊聽診器｜1997 執業誌慶','請以留下的證據確認自己的身分'];
    lines.forEach((line,i)=>ctx.fillText(line,48,90+i*92));recapTexture.needsUpdate=true;
    if(screen)screen.material=recapMaterial;
  };
  const restoreScreen=()=>{if(screen)screen.material=originalScreenMaterial;recapMaterial.dispose();recapTexture.dispose();};
  void cinematicDirector.play({
    id:'316_TRUE_NAME_FINAL_HANDOFF',
    durationMs:5000,
    keyframes:[{at:.28,yaw:-.045,pitch:-.01},{at:.72,yaw:.025,pitch:0},{at:1,yaw:0,pitch:0}],
    cues:[{at:0,run:()=>drawRecap(true)},{at:.18,run:reveal},{at:.40,run:()=>drawRecap(false)},{at:.56,run:()=>soundManager.playComputerBeep()}],
    onComplete:()=>{restoreScreen();controller.enabled=false;uiManager.showDialogue([{speaker:'316 舊終端',text:'紀錄覆寫中。請核對原始名錄與你留下的證據。'},{speaker:'316 舊終端',text:identityLoopMode?'從四份身分中選擇自己的夜班記憶。正式提交只有一次。':'只輸入員編末四碼，保留前導零。錯誤權限將使覆寫完成。'}],openForm);}
  }).then(played=>{if(!played){restoreScreen();openForm();}})
    .catch(error=>{restoreScreen();console.error('[cinematic] final identity reveal failed',error);openForm();});
}

function resolveAdminIdentityPuzzleIfReady() {
  if(gameState.getFlag('ADMIN_IDENTITY_PUZZLE_RESOLVED')) return;
  const complete=
    gameState.getFlag('ADMIN_ROSTER_CHECKED') &&
    gameState.getFlag('ADMIN_PRINTER_DOC_CHECKED') &&
    gameState.getFlag('ADMIN_DRAWER_MANUAL_CHECKED');
  if(!complete) return;
  gameState.setFlag('ADMIN_IDENTITY_PUZZLE_RESOLVED',true);
  gameState.setFlag('ECHO_2117_KNOWN',true);
  gameState.markTaskComplete('P1_ADMIN_IDENTITY_PUZZLE');
  gameState.addEvidence(1);
  uiManager.showSubtitle('值班醫師','「名冊是空的，補登單卻寫我 21:17 已完成巡查……而備忘錄又說最後完成交班的人才算值班醫師。這三份資料不可能同時是真的。」',6200);
}

if(new URLSearchParams(location.search).get('qa')==='story'){
  const findInteractable=({id,type,action}={})=>{
    const list=worldRouter.activeZoneInstance?.interactables||[];
    return list.find(o=>{
      const d=o?.userData||o;
      return (!id||d.id===id)&&(!type||d.type===type)&&(!action||d.action===action);
    });
  };
  window.__storyQA={
    gameState,persistentMemory,legendState,worldRouter,uiManager,loopManager,dutyEvents,GamePhase,floorStateManager,controller,cinematicDirector,actPresentationDirector,soundManager,finalPatientizationDirector,b2FireRecapDirector,identityManager,identityLoopPanel,identityRouteDirector,
    prefetch:prefetchDestinationAssets,
    load:(zone,spawn)=>{worldRouter.loadZone(zone,spawn);worldRouter.activeZoneInstance?.syncStoryState?.();},
    enter:(zone,spawn)=>{
      worldRouter.loadZone(zone,spawn);
      const line=dutyEvents.onZoneEntered(zone);
      worldRouter.activeZoneInstance?.syncStoryState?.();
      if(line)uiManager.showSubtitle(line.speaker,line.text);
      return line;
    },
    setFlag:(k,v=true)=>gameState.setFlag(k,v),
    task:id=>gameState.markTaskComplete(id),
    phase:p=>{floorStateManager.setPhase(p);worldRouter.activeZoneInstance?.applyGamePhase?.(p,gameState);},
    captureView:({position,target,anchorName})=>{
      const dx=target[0]-position[0],dy=target[1]-position[1],dz=target[2]-position[2];
      const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
      controller.teleport(position[0],position[1],position[2],yaw);
      controller.pitch=pitch;controller.updateCameraRotation();
      scene.updateMatrixWorld(true);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
      const anchor=scene.getObjectByName(anchorName);
      if(!anchor||!anchor.visible)throw new Error('Story QA anchor missing or hidden: '+anchorName);
      const bounds=new THREE.Box3().setFromObject(anchor);
      if(bounds.isEmpty())throw new Error('Story QA anchor has no visible geometry: '+anchorName);
      const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      if(!frustum.intersectsBox(bounds))throw new Error('Story QA anchor is outside the camera frustum: '+anchorName);
      const points=[];
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
        points.push(new THREE.Vector3(x,y,z).project(camera));
      }
      const width=renderer.domElement.clientWidth,height=renderer.domElement.clientHeight;
      const minX=Math.min(...points.map(p=>(p.x+1)*.5*width)),maxX=Math.max(...points.map(p=>(p.x+1)*.5*width));
      const minY=Math.min(...points.map(p=>(1-p.y)*.5*height)),maxY=Math.max(...points.map(p=>(1-p.y)*.5*height));
      const rect={left:Math.max(0,minX),top:Math.max(0,minY),width:Math.min(width,maxX)-Math.max(0,minX),height:Math.min(height,maxY)-Math.max(0,minY)};
      if(rect.width<=2||rect.height<=2)throw new Error('Story QA anchor has no visible projected rectangle: '+anchorName);
      return {anchorName,rect,viewport:{width,height}};
    },
    lookAt:(target)=>{
      const dx=target[0]-controller.position.x,dy=target[1]-controller.position.y,dz=target[2]-controller.position.z;
      controller.yaw=Math.atan2(-dx,-dz);controller.pitch=Math.atan2(dy,Math.hypot(dx,dz));controller.updateCameraRotation();
      camera.updateMatrixWorld(true);controller.updateRaycast();
      const hits=controller.raycaster.intersectObjects(controller.interactables.filter(o=>o?.isObject3D),true);
      return {
        current:controller.currentInteractable?.id||null,
        position:controller.position.toArray(),
        hits:hits.slice(0,6).map(hit=>({name:hit.object.name,id:hit.object.userData?.id,distance:hit.distance}))
      };
    },
    interact:(query)=>{
      const obj=findInteractable(query);
      if(!obj)throw new Error('QA interactable missing '+JSON.stringify(query));
      controller.onInteract(obj.userData||obj);
    },
    snapshot:()=>({
      zone:worldRouter.activeZoneId,time:gameState.gameTime,
      controllerEnabled:controller.enabled,
      flags:Object.fromEntries(gameState.flags),
      tasks:[...gameState.completedTasks],
      memory:JSON.parse(JSON.stringify(persistentMemory.data)),
      legend:legendState.getState('LEGEND_BED33')
    })
  };
}

// Setup Raycast Hover & Interaction
controller.onHoverChange = (interactable) => {
  if (interactable) {
    uiManager.showPrompt(`[E] ${identityLoopMode?anonymousNarrative(interactable.label):interactable.label}  ·  雙擊走近`);
  } else {
    uiManager.showPrompt(null);
  }
};

function completeFirstCampus4FWardReport(){
  if(identityLoopMode)return false;
  if(worldRouter.activeZoneId!=='first_campus_4f')return false;
  if(!gameState.isTaskComplete('WARD_ENTRY')||gameState.isTaskComplete('P1_4F_REPORT'))return false;

  dutyEvents.complete('P1_4F_REPORT','17:15');

  if(gameState.getFlag('FAST_PATH_3F')){
    dutyEvents.complete('P1_NORMAL_EVENT_DONE','19:30');
    gameState.setFlag('FOURF_409_SEAL_CHECKED_AFTER_408C',true);
    gameState.setFlag('BED33_RESOLVED',true);
    gameState.markTaskComplete('LEGEND_BED33_RESOLVED');
    persistentMemory.addJournalNote(
      'BED33_FAST_PATH',
      '上一輪已確認 408C 的敲擊與 409 封閉狀態；這次打開 4F 感應門即完成報到，直接前往值班室接下一通電話。'
    );
    uiManager.showSubtitle(
      '晚班護理師',
      '「張醫師，感應門已刷開，算你報到了。今晚仍是滿床 32 床；照上一輪的紀錄，408C 與 409 不用再重查。」',
      4300
    );
  }else{
    uiManager.showSubtitle(
      '晚班護理師',
      '「張醫師，門禁有你的刷卡紀錄，算你報到了。今晚四樓滿床 32 床。408C 的老先生一直說隔壁有人敲牆；409 仍封閉整修。19:30 麻煩你去評估是否可能是幻聽或知覺異常。」',
      5600
    );
  }

  uiManager.updateTasks();
  return true;
}

function completeSecondCampus5FWardReport(){
  if(identityLoopMode)return false;
  if(worldRouter.activeZoneId!=='second_campus_5f')return false;
  if(!gameState.getFlag('SECOND_CAMPUS_ACCESS')||gameState.getFlag('SECOND_CAMPUS_5F_REPORTED'))return false;

  gameState.setFlag('SECOND_CAMPUS_5F_REPORTED',true);
  persistentMemory.addJournalNote(
    'SECOND_5F_REPORT',
    '第二院區 5F：以醫師感應卡開啟病房門即完成到站報到。陳怡君，504B；李承禮總醫師已預開醫囑並預蓋章，只等值班醫師查核。'
  );
  worldRouter.activeZoneInstance?.syncStoryState?.();
  uiManager.showSubtitle(
    '第二院區護理師',
    '「門禁看到你的刷卡紀錄了，算報到完成。504B 陳怡君在等你，先去看病人。」',
    3900
  );
  uiManager.updateTasks();
  return true;
}

controller.onInteract = async (interactable) => {
  if(identityLoopMode){
    if(identityRouteDirector.handleInteract(interactable)) return;
    if(!identityRouteDirector.allowWorldInteraction(interactable)){
      uiManager.showSubtitle('值班醫師','「先把眼前這件事處理完。」',1800);
      return;
    }
  }
  console.log('Interacting with:', interactable);

  if (interactable.type === 'access_door') {
    const door=worldRouter.activeZoneInstance.accessDoors?.[interactable.doorId];
    if(!door)return;
    if(interactable.doorId==='SECOND_1F_HILLSIDE'){
      soundManager.playDoorLockClack();
      uiManager.showSubtitle('值班醫師','「打不開，這邊也是只進不出。」',2800);
      return;
    }
    if(door.portal){
      if(interactable.doorId==='BRIDGE_SECOND'&&gameState.getFlag('M5_BRIDGE_COMMITTED')){
        soundManager.playDoorLockClack();
        uiManager.showSubtitle('門禁','「通往第二院區的門已從另一側鎖上。繼續往第一院區走。」',3200);
        return;
      }
      if(!identityLoopMode&&['BRIDGE_ACCESS','BRIDGE_FIRST','BRIDGE_SECOND'].includes(interactable.doorId)&&!canAccess(gameState,interactable.doorId==='BRIDGE_ACCESS'?'FIRST_TO_SECOND_BRIDGE':'SECOND_TO_FIRST_BRIDGE')){
        soundManager.playDoorLockClack();
        uiManager.showSubtitle('門禁','「夜間跨院區權限尚未開啟。」',2800);
        return;
      }
      controller.enabled=false;controller.cancelAutoMove();
      uiManager.runDoorTransition(async()=>{
        await prepareZoneWithRetry(WORLD_SPAWNS[door.portal].zoneId);
        worldRouter.teleportToSpawn(door.portal);
      });
    }else{
      if(interactable.doorId==='ER_HILLSIDE'){
        soundManager.playDoorLockClack();
        uiManager.showSubtitle('門禁','「此門只進不出。」',2600);
        return;
      }
      if(interactable.doorId==='3F_ARCHIVE_DOOR'&&!gameState.getFlag('ARCHIVE_ACCESS_KEY')){
        soundManager.playClick();
        uiManager.showSubtitle('值班醫師','「文史館？今晚的正常交班流程沒有提到這裡。先把 316 的交班做完。」',3200);
        return;
      }
      if(!identityLoopMode&&!gameState.getFlag('STAFF_ACCESS_CARD')){
        soundManager.playClick();
        uiManager.showSubtitle('門禁','「需要先到 316 領取值班室鑰匙與感應卡。」',2800);
        controller.currentInteractable=null;uiManager.showPrompt(null);
        return;
      }
      const wasClosed=door.closed;
      const changed=door.toggle(controller.position);
      if(changed)soundManager.playClick();
      else uiManager.showSubtitle('門禁','請離開門幅後再關門。',2500);
      const zone=worldRouter.activeZoneInstance;
      if(door===zone.wardDoor)zone.wardGateClosed=door.closed;
      if(door===zone.dutyDoor)zone.dutyDoorClosed=door.closed;
      if(door===zone.acuteGateDoor)zone.acuteGateClosed=door.closed;

      const openedNow=changed&&wasClosed&&!door.closed;
      const isWardArrivalDoor=openedNow&&(
        door===zone.wardDoor ||
        door===zone.innerWardDoor ||
        door===zone.glassBypassDoor
      );
      if(isWardArrivalDoor){
        if(worldRouter.activeZoneId==='first_campus_4f')completeFirstCampus4FWardReport();
        if(worldRouter.activeZoneId==='second_campus_5f')completeSecondCampus5FWardReport();
      }
    }
    controller.currentInteractable=null;uiManager.showPrompt(null);
  } else if (interactable.type === 'duty_door') {
    if(interactable.doorId==='room_409'){
      if(gameState.isTaskComplete('P1_NORMAL_EVENT_DONE')){
        gameState.setFlag('FOURF_409_SEAL_CHECKED_AFTER_408C',true);
        trigger409PostSealKnock();
      }
      registerBed33Clue('DOOR_409_SEALED');
      soundManager.playDoorLockClack();
      uiManager.showSubtitle('值班醫師','「409 整修封閉中……可護理站那張舊床位卡卻還寫著 409A。」',3400);
      uiManager.updateTasks();
      return;
    }
    if(interactable.doorId==='3F_ADMIN_OFFICE_DOOR'){
      const zone=worldRouter.activeZoneInstance;
      const keyedDoor=zone.keyedDoors?.[interactable.doorId];
      if(!keyedDoor)return;
      const wasClosed=keyedDoor.closed;
      const changed=keyedDoor.toggle(controller.position);
      if(changed){
        soundManager.playClick();
        if(wasClosed&&!gameState.getFlag('ADMIN_OFFICE_ENTERED')){
          gameState.setFlag('ADMIN_OFFICE_ENTERED',true);
          uiManager.showSubtitle('值班醫師','「行政辦公室還沒鎖。順便核對一下今晚的值勤名冊。」',3000);
        }
      }else uiManager.showSubtitle('門鎖','請先離開門幅後再關門。',2500);
      controller.currentInteractable=null;uiManager.showPrompt(null);
      return;
    }
    if(interactable.doorId==='3F_ARCHIVE_DOOR'){
      const zone=worldRouter.activeZoneInstance;
      const keyedDoor=zone.keyedDoors?.[interactable.doorId];
      if(!keyedDoor)return;
      if(!gameState.getFlag('ARCHIVE_ACCESS_KEY')){
        gameState.setFlag('ARCHIVE_LOCKED_SEEN',true);
        soundManager.playDoorLockClack();
        uiManager.showSubtitle('值班醫師','「打不開……鑰匙呢？」',2600);
        return;
      }
      const wasClosed=keyedDoor.closed;
      const changed=keyedDoor.toggle(controller.position);
      if(changed){
        soundManager.playClick();
        if(wasClosed&&!keyedDoor.closed&&!gameState.getFlag('ARCHIVE_ROOM_ENTERED')){
          gameState.setFlag('ARCHIVE_ROOM_ENTERED',true);
          if(identityLoopMode&&identityManager?.currentIdentity==='LI'){
            uiManager.showSubtitle('內心','「文史室也打開了。兩邊都確認過，就回 316。」',3200);
          }
        }
      }else uiManager.showSubtitle('門鎖','請先離開門幅後再關門。',2500);
      controller.currentInteractable=null;uiManager.showPrompt(null);
      return;
    }
    const borrowedWardSpareKey=
      identityLoopMode &&
      worldRouter.activeZoneId==='first_campus_4f' &&
      gameState.getFlag('ZHANG_4F_SPARE_KEY_BORROWED') &&
      /^room_40[1-8]$/.test(interactable.doorId||'');
    const borrowedSecondConsultKey=
      identityLoopMode &&
      worldRouter.activeZoneId==='second_campus_5f' &&
      gameState.getFlag('SECOND_5F_CONSULT_KEY_BORROWED') &&
      interactable.doorId==='room_504';
    if (!gameState.isTaskComplete('KEY_PICKUP') && !borrowedWardSpareKey && !borrowedSecondConsultKey) {
      soundManager.playClick();
      let lockLine='「這是傳統喇叭鎖，先去 316 拿值班室鑰匙與感應卡。」';
      if(identityLoopMode&&worldRouter.activeZoneId==='first_campus_4f'){
        lockLine='「病房門是傳統喇叭鎖。先回護理站借查房用的備用鑰匙。」';
      }else if(identityLoopMode&&worldRouter.activeZoneId==='second_campus_5f'&&interactable.doorId==='room_504'){
        lockLine='「504 病房門鎖著。先回護理站借這次會診用的備用鑰匙。」';
      }
      uiManager.showSubtitle('值班醫師',lockLine,3000);
      return;
    }
    const zone=worldRouter.activeZoneInstance;
    const keyedDoor=zone.keyedDoors?.[interactable.doorId] || (interactable.doorId==='duty_room'?zone.dutyDoor:null);
    if(!keyedDoor)return;
    const wasClosed=keyedDoor.closed;
    const changed=keyedDoor.toggle(controller.position);
    if(changed)soundManager.playClick();
    else uiManager.showSubtitle('門鎖','請先離開門幅後再關門。',2500);
    if(keyedDoor===zone.dutyDoor)zone.dutyDoorClosed=keyedDoor.closed;
    if(changed&&wasClosed&&keyedDoor===zone.dutyDoor&&gameState.isTaskComplete('P1_NORMAL_EVENT_DONE')&&gameState.getFlag('BED33_RESOLVED')&&!gameState.isTaskComplete('P1_ER_CALL_RECEIVED')){
      dutyEvents.complete('P1_ER_CALL_RECEIVED','20:00');
      gameState.setFlag('P1_ER_CALL_ANSWERED',false);
      startStoryPhoneCall('ER_JANE_2005');
    }
    controller.currentInteractable = null;
    uiManager.showPrompt(null);
  } else if (['admin_roster_3f','admin_printer_doc_3f','admin_drawer_manual_3f'].includes(interactable.type)) {
    // FAST_PATH_3F may skip repeated handoff chores, but evidence documents must
    // remain readable on every loop. A player can trigger HANDOFF_DEFAULT before
    // ever inspecting the admin office, so loopCount alone is not evidence progress.
    const config={
      admin_roster_3f:['ADMIN_ROSTER_CHECKED','P1_ADMIN_ROSTER_CHECK'],
      admin_printer_doc_3f:['ADMIN_PRINTER_DOC_CHECKED','P1_ADMIN_PRINTER_DOC'],
      admin_drawer_manual_3f:['ADMIN_DRAWER_MANUAL_CHECKED','P1_ADMIN_DRAWER_MANUAL']
    }[interactable.type];
    const [flag,taskId]=config;
    if(!gameState.getFlag(flag)){
      gameState.setFlag(flag,true);
      gameState.markTaskComplete(taskId);
      soundManager.playPaperSign();
    }
    controller.enabled=false;
    uiManager.openArchiveDocument({title:interactable.documentTitle,pages:interactable.pages});
    resolveAdminIdentityPuzzleIfReady();
  } else if (interactable.type === 'spare_key_316') {
    if(!gameState.getFlag('FOUND_316_SPARE_KEY')){
      gameState.setFlag('FOUND_316_SPARE_KEY',true);
      gameState.markTaskComplete('FOUND_316_SPARE_KEY');
      if(interactable.targetGroup)interactable.targetGroup.visible=false;
      interactable.interactable=false;
      soundManager.playKeyPickup();
      uiManager.showSubtitle('值班醫師','「警衛查哨點裡真的留了 316 的備援鑰匙。先回去開門。」',3200);
      uiManager.showPrompt(null);
    }
  } else if (interactable.type === 'office_316_door') {
    if(!gameState.getFlag('FOUND_316_SPARE_KEY')){
      soundManager.playClick();
      uiManager.showSubtitle('316 總醫師辦公室','門鎖著。學長說過可以先去警衛查哨點看看。',3200);
      return;
    }
    if(!gameState.getFlag('OPENED_316')){
      const opened=worldRouter.activeZoneInstance.open316Door?.();
      if(opened){
        gameState.setFlag('OPENED_316',true);
        gameState.markTaskComplete('OPENED_316');
        soundManager.playClick();
        uiManager.showSubtitle(
          '值班醫師',
          identityLoopMode
            ? '「門開了。進去 316，完成今晚的交接。」'
            : gameState.getFlag('FAST_PATH_3F')
              ? '「門開了。這些流程我已經走過，先進去接電話。」'
              : '「開了。先找值班手冊，學長應該有留下交班方式。」',
          3200
        );
      }
    }
  } else if (interactable.type === 'locker_316') {
    if(!identityLoopMode&&!gameState.isTaskComplete('DUTY_LOG')){
      soundManager.playClick();
      uiManager.showSubtitle('值班醫師','「四位數電子鎖……先看看桌上的值班手冊有沒有寫什麼。」',3000);
      return;
    }
    controller.enabled=false;
    uiManager.openLocker();
  } else if (interactable.type === 'key') {
    if (!gameState.isTaskComplete('KEY_PICKUP')) {
      soundManager.playKeyPickup();
      gameState.markTaskComplete('KEY_PICKUP');
      uiManager.showSubtitle('值班醫師', '「拿到值班室鑰匙與感應卡了。」');
      if (interactable.targetGroup) {
        interactable.targetGroup.visible = false;
      }
      interactable.interactable = false;
      uiManager.showPrompt(null);
      checkElevatorReady();
    }
  } else if (interactable.type === 'office_302_inspect') {
    controller.enabled=false;
    uiManager.open302Inspect();
  } else if (interactable.type === 'office_302_keypad') {
    if(gameState.getFlag('OFFICE_302_UNLOCKED')){
      worldRouter.activeZoneInstance.unlock302?.();
      return;
    }
    if(!gameState.getFlag('INTERACTED_302')){
      gameState.setFlag('INTERACTED_302',true);
      soundManager.playDoorLockClack();
      uiManager.showSubtitle('值班醫師','「鎖上了……需要四位數密碼。看來跟對面的夜間告示有關。」',3200);
    }
    controller.enabled=false;
    uiManager.open302Keypad();
  } else if (interactable.type === 'museum_key_302') {
    if(!gameState.getFlag('OFFICE_302_UNLOCKED'))return;
    if(!gameState.getFlag('ARCHIVE_ACCESS_KEY')){
      gameState.setFlag('ARCHIVE_ACCESS_KEY',true);
      gameState.markTaskComplete('ARCHIVE_KEY_FOUND');
      if(interactable.targetGroup)interactable.targetGroup.visible=false;
      interactable.interactable=false;
      soundManager.playKeyPickup();
      uiManager.showSubtitle('值班醫師','「黃銅牌只刻了兩個字：『文史』……」',3000);
      uiManager.showPrompt(null);
    }
  } else if (interactable.type === 'office_phone_316') {
    if(gameState.getFlag('FAST_PATH_3F')&&gameState.getFlag('PHONE_RING_ACTIVE')&&gameState.getFlag('PHONE_CALL_KIND')==='FAST_PATH_316'&&!gameState.getFlag('FAST_PATH_316_CALL_DONE')){
      gameState.setFlag('PHONE_RING_ACTIVE',false);
      gameState.setFlag('PHONE_ANSWERED',true);
      gameState.setFlag('PHONE_CALL_KIND',null);
      gameState.setFlag('FAST_PATH_316_CALL_DONE',true);
      gameState.markTaskComplete('P1_316_COMPLETE');
      gameState.markTaskComplete('DUTY_LOG');
      gameState.markTaskComplete('E_HANDOFF');
      await fastPathWorldPreload;
      soundManager.playClick();
      uiManager.showSubtitle('316 電話','「密碼一樣，拿了鑰匙跟感應卡後就去四樓吧。東西還在櫃子裡。」',4800);
      uiManager.updateTasks();
    }else if(gameState.getFlag('SECOND_CAMPUS_PHONE_PENDING')){
      gameState.setFlag('SECOND_CAMPUS_PHONE_PENDING',false);
      gameState.setFlag('PHONE_RING_ACTIVE',false);
      gameState.setFlag('PHONE_ANSWERED',true);
      soundManager.playClick();
      uiManager.showDialogue([{speaker:'值班醫師',text:'「……怎麼知道我在 316 辦公室？」'}],unlockSecondCampusAccess);
    }else if(gameState.getFlag('PHONE_RING_ACTIVE')&&!gameState.getFlag('PHONE_ANSWERED')){
      gameState.setFlag('PHONE_ANSWERED',true);
      gameState.setFlag('PHONE_RING_ACTIVE',false);
      soundManager.playClick();
      soundManager.duckAmbient(.18,4300);
      const loopCount=persistentMemory.data.loopCount;
      if(loopCount>0){
        const lines=['「……你還在三樓嗎？」','「嘻嘻，你還在三樓。」','「嘻嘻，你逃不掉的。」','「你又回來了。」'];
        uiManager.showSubtitle('電話',`（三秒雜音）\\n${lines[Math.min(loopCount,lines.length-1)]}`,4300);
        return;
      }
      if(interactable.doorId==='SECOND_1F_HILLSIDE'){
        soundManager.playDoorLockClack();
        uiManager.showSubtitle('門禁','「夜間山側通行權限尚未開啟。」',2800);
        return;
      }
      uiManager.showSubtitle('電話','（三秒雜音）\n「……你還在三樓嗎？」\n嘟——　嘟——　嘟——',4300);
    }else{
      uiManager.showSubtitle('值班醫師','「普通的院內電話。」',1800);
    }
  } else if (interactable.type === 'story_phone') {
    const callKind=gameState.getFlag('PHONE_CALL_KIND');
    if(!gameState.getFlag('PHONE_RING_ACTIVE')||!callKind)return;
    gameState.setFlag('PHONE_RING_ACTIVE',false);
    gameState.setFlag('PHONE_ANSWERED',true);
    soundManager.playClick();
    soundManager.duckAmbient(.18,4300);
    if(callKind==='ER_JANE_2005'){
      gameState.setFlag('PHONE_CALL_KIND',null);
      gameState.setFlag('P1_ER_CALL_ANSWERED',true);
      gameState.setFlag('ER_JANE_PRESENT',true);
      gameState.setGameTime('20:05');
      uiManager.showSubtitle('急診護理師',persistentMemory.data.journalNotes.some(note=>note.id==='LIU_MAINTENANCE_TAG')?'「值班醫師，劉志遠身上有燒焦與煙灰、意識混亂，麻煩精神科下來評估。」':'「值班醫師，急診有一名身分待確認的男性，身上有燒焦與煙灰、意識混亂，麻煩精神科下來評估。」',5400);
    }else if(callKind==='NIGHT_PATROL_2115'){
      gameState.setFlag('PHONE_CALL_KIND',null);
      gameState.setFlag('NIGHT_PATROL_RETURN_3F',true);
      floorStateManager.setPhase(GamePhase.NIGHT_PATROL);
      uiManager.showSubtitle('護理站','「值班醫師，三樓警衛說你剛才在查哨點少簽一個名字，21:17 前要送巡查大表。你現在立刻下去補簽。」\\n值班醫師：「我？我一直在四樓值班室啊……」\\n護理站：「三樓說看著你的背影走過去的。快去吧。」',7200);
    }else if(callKind==='ER_GHOST_0033'){
      gameState.setFlag('PHONE_CALL_KIND',null);
      gameState.setFlag('POST_2117_DUTY_CALL_DONE',true);
      gameState.setFlag('GHOST_REGISTRATION_ARMED',true);
      gameState.setFlag('GHOST_REGISTRATION_AVAILABLE',true);
      gameState.setGameTime('00:33');
      const roomLights=[];
      worldRouter.activeZoneInstance.zoneGroup.traverse(object=>{if(object.isPointLight)roomLights.push(object);});
      const lightPosition=new THREE.Vector3();
      roomLights.sort((a,b)=>a.getWorldPosition(lightPosition).distanceToSquared(controller.position)-b.getWorldPosition(lightPosition).distanceToSquared(controller.position));
      const practical=roomLights[0];
      if(practical){
        const brightness=practical.intensity;
        practical.intensity=brightness*.15;
        setTimeout(()=>{practical.intensity=brightness;},180);
      }
      if(roomLights[1])roomLights[1].intensity*=.4;
      uiManager.showSubtitle('急診護理師','「值班醫師，不好意思。系統裡突然多了一筆掛號資料，可是我們這邊找不到病人。你對這筆資料有印象嗎？」\\n值班醫師：「我沒有印象。我下去看看病歷紀錄。」',6200);
    }else return;
    worldRouter.activeZoneInstance?.syncStoryState?.();
    uiManager.updateTasks();
  } else if (interactable.type === 'cpr_anne') {
    const stage=gameState.getFlag('ANNE_STAGE')||0;
    uiManager.showSubtitle('值班醫師',stage===0?'「CPR 訓練用假人安妮。新的，看起來還沒怎麼用過。」':'「……剛才它是這個方向嗎？」',2600);
  } else if (interactable.type === 'duty_log') {
    if(!gameState.getFlag('OPENED_316'))return;
    controller.enabled = false;
    uiManager.openDutyLog();
    checkElevatorReady();
  } else if (interactable.type === 'credential_drawer_316') {
    if(!gameState.getFlag('OPENED_316'))return;
    if(!gameState.getFlag('HIS_CREDENTIALS')){
      gameState.setFlag('HIS_CREDENTIALS',true);
      gameState.markTaskComplete('HIS_CREDENTIALS_FOUND');
      soundManager.playPaperSign();
    }
    controller.enabled=false;
    uiManager.openArchiveDocument({title:interactable.documentTitle,pages:interactable.pages});
  } else if (interactable.type === 'legacy_terminal_316') {
    if(!gameState.getFlag('ER0033_SLIP_COLLECTED')){
      uiManager.showSubtitle('316 舊資料終端','「ARCHIVE CLIENT｜目前沒有待查的舊索引。」',2600);
      return;
    }
    if(identityLoopMode){
      if(gameState.getFlag('M3_316_DECODED')){
        uiManager.showSubtitle('316 舊資料終端','「1998-ER-0217｜工務識別 ENG-860214｜責任醫師員編前綴 MED-87｜完整姓名欄受損。」',3600);
        return;
      }
      gameState.setFlag('M3_316_DECODED',true);
      gameState.setFlag('LEGEND_ER0033_RESOLVED',true);
      gameState.setFlag('ER0033_INDEX_MATCH',true);
      gameState.setFlag('B2_LEGACY_SOURCE',true);
      persistentMemory.rememberEvidence('M3_316_LEGACY_INDEX');
      persistentMemory.addJournalNote('ER0033_DECODED_IDENTITY_LOOP','316 舊終端解出 1998-ER-0217：工務識別 ENG-860214；責任醫師員編前綴 MED-87，完整姓名欄受損。');
      soundManager.playComputerBeep();
      uiManager.showSubtitle('316 舊資料終端','「ARCHIVE LINK ESTABLISHED｜1998-ER-0217｜ENG-860214｜RESPONSIBLE PHYSICIAN: MED-87••••／NAME FIELD CORRUPTED。」',5200);
      return;
    }
    if(gameState.getFlag('M3_316_DECODED')){
      uiManager.showSubtitle('316 舊資料終端','「1998-ER-0217｜病人：劉志遠／ENG-860214｜責任醫師員編前綴 MED-87｜姓氏：張。」',3600);
      return;
    }
    gameState.setFlag('M3_316_DECODED',true);
    gameState.setFlag('LEGEND_ER0033_RESOLVED',true);
    gameState.setFlag('ER0033_INDEX_MATCH',true);
    persistentMemory.resolveLegend('er0033');
    persistentMemory.setTrueNameFragment('frag_surname','張');
    persistentMemory.addJournalNote('ER0033_DECODED','316 舊終端解出劉志遠／ENG-860214 的 1998-ER-0217：責任醫師員編以 MED-87 開頭，姓氏是「張」。');
    if(gameState.getFlag('TIME_PROOF_FRAGMENT')){
      gameState.setFlag('TIME_PROOF',true);
      persistentMemory.setProof('time',true);
    }
    gameState.setFlag('SECOND_CAMPUS_PHONE_PENDING',true);
    gameState.setFlag('PHONE_ANSWERED',false);
    gameState.setFlag('PHONE_RING_ACTIVE',true);
    gameState.setFlag('B2_LEGACY_SOURCE',true);
    soundManager.startPhoneRing();
    uiManager.showSubtitle('316 舊資料終端','「1998-ER-0217｜病人：劉志遠／ENG-860214｜責任醫師：張○○｜員編前綴：MED-87。」\n\n終端機停止後，桌上的院內電話立刻響起。',5200);
  } else if (interactable.type === 'workstation') {
    if(gameState.getFlag('M8_IDENTITY_BATTLE_ACTIVE')&&gameState.getFlag('B2_FIRE_RECAP_SEEN')&&worldRouter.activeZoneId==='first_campus_3f'){
      revealFinal316Handoff({deferred:gameState.getFlag('B2_HISTORY_FALLBACK_ACTIVE')});
      return;
    }
    controller.enabled = false;
    uiManager.openWorkstation();
    if(!gameState.getFlag('HIS_CREDENTIALS')){
      uiManager.showSubtitle('值班醫師','「但是我沒有帳號密碼……」',2800);
    }
    checkElevatorReady();
  } else if (interactable.type === 'identity_floor_photo') {
    controller.enabled=false;
    uiManager.openMemorySequence(photoSequence(FLOOR_PHOTO_KEYS[interactable.photoCell],identityManager.currentIdentity));
  } else if (interactable.type === 'identity_photo') {
    controller.enabled=false;
    const key=interactable.photoKey||(interactable.id==='IDENTITY_HISTORY_GROUP_PHOTO'?'group':'reflection');
    uiManager.openMemorySequence(photoSequence(key,identityManager.currentIdentity));
  } else if (interactable.type === 'memory_evidence') {
    const sequence=getMemorySequence(interactable.memoryId);
    if(!sequence)return;
    if(identityLoopMode){
      controller.enabled=false;uiManager.openMemorySequence(sequence);return;
    }
    persistentMemory.rememberEvidence(sequence.id);
    if(sequence.id==='M1_ADMIN_DUTY_PHOTO')gameState.setFlag('B2_ADMIN_SOURCE',true);
    if(sequence.id==='M1_ARCHIVE_6F_ALBUM')gameState.setFlag('B2_HISTORY_SOURCE',true);
    if(sequence.id==='M6_6F_PLAYBACK')gameState.setFlag('SIX_FLOOR_HISTORY_CONFIRMED',true);
    controller.enabled=false;
    uiManager.openMemorySequence(sequence);
  } else if (interactable.type === 'era_poster') {
    controller.enabled=false;
    uiManager.openPoster(interactable.posterData);
  } else if (interactable.type === 'er_nurse_computer') {
    uiManager.showSubtitle('值班醫師','「這個電腦是護理師專用，請醫師用醫師診療室專用電腦。」',3600);
  } else if (interactable.type === 'archive_document') {
    controller.enabled = false;
    if(identityLoopMode&&['SECOND_GUARD_PHOTO_ALBUM','ARCHIVE_HISTORY_PHOTO_WALL'].includes(interactable.id)){
      const guard=interactable.id==='SECOND_GUARD_PHOTO_ALBUM';
      const required=identityManager.currentIdentity==='ZHANG'&&identityManager.currentRouteStep===(guard?'ZHANG_SECOND_CAMPUS_SECURITY':'ZHANG_3F_ARCHIVE');
      const onRead=required?()=>{
        const flag=guard?'ZHANG_GUARD_ALBUM_REVIEWED':'ARCHIVE_HISTORY_WALL_REVIEWED';
        gameState.setFlag(flag,true);
        persistentMemory.addJournalNote(flag,guard?'已翻閱警衛台舊相簿。下一步向警衛核對現場。':'已逐頁檢視院史影像。下一步核對封存名錄。');
        uiManager.updateTasks();
      }:null;
      uiManager.openMemorySequence(sharedAlbum(interactable.id,identityManager.currentIdentity),null,onRead);
      return;
    }
    const archiveComplete=interactable.id==='ARCHIVE_PERSONNEL_1998'
      ? ()=>{
          gameState.setFlag('HISTORY_PERSONNEL_PROFILES_REVIEWED',true);
          gameState.setFlag('ARCHIVE_PERSONNEL_OBJECTIVE',false);
          if(gameState.getFlag('B2_EXITED_PERMANENTLY'))gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',true);
          persistentMemory.addJournalNote('ARCHIVE_PERSONNEL_REVIEWED','完成 1998 夜班核心人員名錄七頁核對。返回 316，以正確權限阻止紀錄覆寫。');
          uiManager.updateTasks();
        }
      : interactable.id==='ARCHIVE_HISTORY_PHOTO_WALL'
        ? ()=>{
            gameState.setFlag('ARCHIVE_HISTORY_WALL_REVIEWED',true);
            persistentMemory.addJournalNote('ARCHIVE_HISTORY_WALL_REVIEWED','已核對文史館院史影像牆；下一步查看 1998 夜班核心人員名錄。');
            uiManager.updateTasks();
          }
        : interactable.id==='SECOND_GUARD_PHOTO_ALBUM'
          ? ()=>{
              gameState.setFlag('ZHANG_GUARD_ALBUM_REVIEWED',true);
              persistentMemory.addJournalNote('ZHANG_GUARD_ALBUM_REVIEWED','已翻閱第二院區警衛台舊相簿：捲袖白袍、黑咖啡與 2F 監控室提示。');
              uiManager.updateTasks();
            }
          : null;
    uiManager.openArchiveDocument({title:interactable.documentTitle,pages:interactable.pages,onComplete:archiveComplete});
    gameState.addEvidence(1);
    if(interactable.id?.startsWith('ADMIN_'))gameState.setFlag('B2_ADMIN_SOURCE',true);
    if(interactable.id?.startsWith('ARCHIVE_'))gameState.setFlag('B2_HISTORY_SOURCE',true);
    if(interactable.id==='ARCHIVE_UNINDEXED_HANDOFF'&&gameState.getFlag('ARCHIVE_OBJECTIVE')){
      gameState.markTaskComplete('ARCHIVE_CLUE_FOUND');
      gameState.setFlag('ARCHIVE_CLUE_FOUND',true);
      gameState.setFlag('ANNE_STAGE',2);
      gameState.setFlag('GUARD_FUTURE_ENTRY',true);
      gameState.setFlag('HOOK_409_ZERO_ROOM',true);
      registerBed33Clue('ARCHIVE_0409');
      persistentMemory.learnCode('code_0217');
      persistentMemory.learnCode('code_0316');
      gameState.setFlag('HOOK_0316_COMMAND_POINT',true);
      gameState.setFlag('HOOK_1F_HIDDEN_DOOR',true);
      gameState.setFlag('HOOK_0217',true);
      floorStateManager.setPhase(GamePhase.AFTER_ARCHIVE);
      worldRouter.activeZoneInstance?.applyGamePhase?.(GamePhase.AFTER_ARCHIVE,gameState);
      worldRouter.activeZoneInstance?.syncHorrorState?.();
    }
  } else if (interactable.type === 'bed33_board') {
    registerBed33Clue('BEDBOARD_33_409A');
    controller.enabled=false;
    uiManager.openArchiveDocument({title:interactable.documentTitle,pages:interactable.pages});
  } else if (interactable.type === 'bed33_his_status') {
    registerBed33Clue('HIS_409_CLOSED');
    controller.enabled=false;
    uiManager.openArchiveDocument({title:interactable.documentTitle,pages:interactable.pages});
  } else if (interactable.type === 'bed33_409_sealed') {
    if(gameState.isTaskComplete('P1_NORMAL_EVENT_DONE')){
      gameState.setFlag('FOURF_409_SEAL_CHECKED_AFTER_408C',true);
      trigger409PostSealKnock();
    }
    registerBed33Clue('DOOR_409_SEALED');
    uiManager.updateTasks();
    controller.enabled=false;
    uiManager.openArchiveDocument({title:interactable.documentTitle,pages:interactable.pages});
  } else if (interactable.type === 'bed33_assignment') {
    if(!gameState.isTaskComplete('P1_4F_REPORT')){
      uiManager.showSubtitle('夜班護理師','「先完成護理站交班，再處理這張床位單。」',2500);
      return;
    }
    if(!gameState.isTaskComplete('P1_NORMAL_EVENT_DONE')){
      uiManager.showSubtitle('值班醫師','「先去 408C 評估病人的聽覺經驗與可能的環境聲源。」',2500);
      return;
    }
    if(!gameState.getFlag('FOURF_409_SEAL_CHECKED_AFTER_408C')){
      uiManager.showSubtitle('值班醫師','「先去確認 409 的封條，再回護理站核對這張床位單。」',3200);
      return;
    }
    controller.enabled=false;
    const openAssignment=()=>uiManager.openBed33Assignment({
      canReject:true,
      rememberedRule:persistentMemory.data.survivalRules.neverSignBed33
    });
    void cinematicDirector.play({
      id:'FIRST_409_BED33_ANOMALY',
      durationMs:2200,
      keyframes:[{at:.48,yaw:.035,pitch:.025},{at:1,yaw:0,pitch:0}],
      cues:[
        {at:.08,run:()=>{
          document.body.classList.add('his-flicker');
          setTimeout(()=>document.body.classList.remove('his-flicker'),460);
        }},
        {at:.4,run:()=>uiManager.showSubtitle('值班醫師','「今日滿床只有 32 床……為什麼這張寫著第 33 床，位置卻是 409A？」',3400)}
      ],
      onComplete:openAssignment
    }).catch(error=>console.error('[cinematic] first 409 anomaly failed',error));
  } else if (interactable.type === 'acute_gate') {
    const changed = worldRouter.activeZoneInstance.toggleAcuteGate(controller.position);
    if (changed) {
      soundManager.playClick();
    } else {
      uiManager.showSubtitle('門禁', '請先離開鐵門門幅，再刷卡關門。', 2500);
    }
    controller.currentInteractable = null;
    uiManager.showPrompt(null);
  } else if (interactable.type === 'guard_post_inspection') {
    if(gameState.getFlag('M6_FLOOR6_RESOLVED')!==true||gameState.getFlag('B2_EXITED_PERMANENTLY'))return;
    gameState.setFlag('B2_SECURITY_SOURCE',true);
    gameState.setFlag('SECURITY_RECORD_OBJECTIVE',false);
    const learnedPanel=gameState.getFlag('B_PANEL_CLUE_KNOWN')===true;
    if(learnedPanel&&!gameState.getFlag('B_PANEL_KEY')){
      gameState.setFlag('B_PANEL_KEY',true);
      gameState.setFlag('FIRST_FLOOR_GUARD_KEY',true);
      persistentMemory.addJournalNote('WANG_B_PANEL_KEY','王世榮 SEC-760117 的值勤簿記載：B-Panel 十字鑰匙屬警衛門禁設備，實體仍掛在警衛台金屬鑰匙櫃。');
    }
    if(!gameState.getFlag('HIDDEN_SERVICE_DOOR_DISCOVERED')){
      gameState.setFlag('HIDDEN_SERVICE_DOOR_DISCOVERED',true);
      worldRouter.activeZoneInstance?.syncStoryState?.();
      soundManager.playClick();
      const keyLine=learnedPanel?'鑰匙櫃裡那把褪色紫牌十字鑰匙正標著「B-PANEL」。':'鑰匙櫃裡有一排老舊機房鑰匙。';
      uiManager.showSubtitle('值班醫師','「王世榮的值勤簿……'+keyLine+'」\nCCTV 最後一頁停在 02:17，警衛設備旁的牆面浮出一道舊門框接縫。',5600);
    }else{
      uiManager.showSubtitle('值班醫師','「舊門框就在警衛台後面。王世榮留下的門禁紀錄和 B-Panel 鑰匙都對上了。」',3200);
    }
  } else if (interactable.type === 'hidden_service_door_1f') {
    if(gameState.getFlag('M6_FLOOR6_RESOLVED')!==true)return;
    if(!gameState.getFlag('HIDDEN_SERVICE_DOOR_DISCOVERED')){
      uiManager.showSubtitle('值班醫師','先檢查警衛台上的 CCTV、值勤簿和鑰匙櫃。',2600);
      return;
    }
    if(!gameState.getFlag('B_PANEL_KEY')){
      uiManager.showSubtitle('值班醫師','「牆面接縫不像一般裝修……B-Panel 的十字鑰匙應該還在警衛設備裡。」',3200);
      return;
    }
    if(gameState.getFlag('B2_EXITED_PERMANENTLY')){
      soundManager.playDoorLockClack();
      uiManager.showSubtitle('值班醫師','「門已經從 B2 那一側永久鎖死。沒有第二次機會。」',3400);
      return;
    }
    if(gameState.getFlag('M7_B2_OPEN')){controller.enabled=false;await prepareZoneWithRetry('b2_archive');worldRouter.loadZone('b2_archive','b2_archive_entry');controller.enabled=true;return;}
    gameState.setGameTime('02:17');
    controller.enabled=false;
    uiManager.openStoryChoice({
      title:'02:17｜警衛台後方 B-Panel',
      body:'02:17。舊工務手冊要求依序拉下 1 → 3 → 4；監控卻顯示這個動作讓防火門鎖死、備援排煙停止。旁邊另有一個必須插入十字鑰匙才能轉動的紫色備援排煙旋鈕。',
      primaryText:'照舊手冊拉下 1 → 3 → 4',
      secondaryText:'用十字鑰匙啟動紫色備援排煙',
      onPrimary:()=>loopManager.triggerLegendOverride('TIMELOOP',{legend:'02:17 — 重演',reason:'你成了事故紀錄裡的人。'}),
      onSecondary:async()=>{
        controller.enabled=false;
        await prepareZoneWithRetry('b2_archive');
        gameState.setFlag('M7_B2_OPEN',true);
        gameState.setFlag('B2_DOOR_READY',true);
        gameState.setFlag('B2_IDENTITY_ATTEMPT_USED',false);
        persistentMemory.setProof('time',true);
        persistentMemory.addJournalNote('B2_OPEN','02:17 的 1→3→4 是歷史錯誤。我改用王世榮保管的十字鑰匙啟動紫色備援排煙；隱藏服務門因此鬆開。');
        worldRouter.loadZone('b2_archive','b2_archive_entry');
        controller.enabled=true;
      }
    });
  } else if (interactable.type === 'b2_archive_terminal') {
    gameState.setFlag('B2_TERMINAL_CONTACTED',true);

    // FIRST CONTACT CONTRACT:
    // No matter whether B2 identity evidence is complete, incomplete, resolved,
    // or already consumed, the first terminal interaction always plays the
    // 1998 fire-history recap. The recap itself is the mandatory bridge to 316.
    if(!gameState.getFlag('B2_FIRE_RECAP_SEEN')){
      playB2FireRecap();
      return;
    }

    if(identityLoopMode){
      identityManager.enterB2();
      if(identityManager.currentIdentity==='ZHANG'){
        uiManager.showSubtitle(
          '封存終端',
          '「CURRENT SELF：CORRUPTED｜409-A 死者姓名欄遭除籍塗銷｜員編前綴 MED-87••••。完整姓名必須回 3F 文史館與院史影像交叉核對。」',
          5200
        );
        return;
      }
      identityLoopPanel.openB2Archive();
      return;
    }

    // After the fire recap, the player is already allowed to leave B2 and
    // return to 316. Keep the old one-shot identity matrix as an OPTIONAL
    // second interaction for players who still want to compare the candidates.
    if(gameState.getFlag('M7_B2_RESOLVED')||gameState.getFlag('B2_IDENTITY_ATTEMPT_USED')){
      uiManager.showSubtitle(
        '封存終端',
        '「UNKNOWN SESSION / OVERWRITE ACTIVE。火災紀錄已讀取；有人正在再次覆蓋人員與事故資料。立即離開 B2，回到 316，用正確權限阻止這一切。」',
        5200
      );
      return;
    }

    const missing=[];
    if(!gameState.getFlag('B2_ADMIN_SOURCE'))missing.push('3F 行政辦公室');
    if(!gameState.getFlag('B2_HISTORY_SOURCE'))missing.push('文史封存');
    if(!gameState.getFlag('B2_LEGACY_SOURCE'))missing.push('316 舊終端');
    if(!gameState.getFlag('B2_SECURITY_SOURCE'))missing.push('夜間門禁來源');
    if(!persistentMemory.hasEvidence('B2_VICTIM_MAP'))missing.push('B2 火災罹難者位置圖');
    const fragments=persistentMemory.data.trueNameFragments;
    if(!fragments.frag_surname||!fragments.frag_givenName_1||!fragments.frag_givenName_2)missing.push('姓名片段');
    if(missing.length)gameState.setFlag('B2_IDENTITY_INCOMPLETE',true);

    controller.enabled=false;
    uiManager.openIdentityMatrix({
      candidates:IDENTITY_CANDIDATES,
      onSelect:candidate=>{
        if(gameState.getFlag('B2_IDENTITY_ATTEMPT_USED'))return {resolved:false,message:'身分建立嘗試已用盡。'};
        gameState.setFlag('B2_IDENTITY_ATTEMPT_USED',true);
        if(candidate.id!=='ZHANG_SHOUHENG'||missing.length){
          return {
            resolved:false,
            message:candidate.id==='ZHANG_SHOUHENG'
              ?'來源資料不足，候選身分比對未完成。火災回放已完成；可直接返回 316 進行最後權限驗證。'
              :candidate.contradiction+'\n候選身分比對失敗。火災回放已完成；可直接返回 316。'
          };
        }
        establishCanonicalIdentity();
        persistentMemory.addJournalNote(
          'B2_ARCHIVE_VERIFY',
          'B2 身分矩陣排除其他候選；時間、病歷、門禁與院史人員資料一致指向張守恆 MED-870409。'
        );
        return {
          resolved:true,
          message:'>>> IDENTITY RECONSTRUCTED\n>>> 張守恆 / MED-870409\n>>> 火災封存紀錄已讀取｜請返回 316 阻止覆寫'
        };
      }
    });
    if(missing.length){
      uiManager.setIdentityMatrixStatus(
        '火災封存紀錄已播放。資料仍不完整：'+missing.join('、')+'。身分矩陣為選擇性比對；可直接離開 B2 返回 316。',
        'error'
      );
    }
  } else if (interactable.type === 'b2_exit_door') {
    if(!gameState.getFlag('B2_FIRE_RECAP_SEEN')){
      soundManager.playDoorLockClack();
      uiManager.showSubtitle(
        '值班醫師',
        '「先啟動 B2 封存終端。這扇單向門一旦關上，就沒有機會再回來看火災紀錄。」',
        4200
      );
      return;
    }

    const resolved=identityLoopMode||gameState.getFlag('M7_B2_RESOLVED')===true;
    const leaveB2=()=>{
       gameState.setFlag('B2_EXITED_PERMANENTLY',true);
      gameState.setFlag('M7_B2_OPEN',false);
      gameState.setFlag('HIDDEN_SERVICE_DOOR_DISCOVERED',false);
      gameState.setFlag('SECURITY_RECORD_OBJECTIVE',false);
      gameState.setFlag('RECORD_OVERWRITE_ACTIVE',true);
      const exitIdentity=identityLoopMode?identityManager?.currentIdentity:null;
      gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',identityLoopMode?exitIdentity==='ZHOU':true);
      gameState.setFlag('M8_CODE_BLACK_ANNOUNCED',identityLoopMode?exitIdentity==='ZHOU':true);
      gameState.setFlag('LAST_CALL_SEEN',true);
      controller.enabled=false;
      worldRouter.activeZoneInstance?.beginExitClosure?.();

      if(!resolved){
        gameState.setFlag('B2_IDENTITY_INCOMPLETE',true);
        persistentMemory.addJournalNote(
          'B2_EXIT_INCOMPLETE',
          'B2 身分矩陣尚未完整重建，但火災回放已證明紀錄正在被重新覆寫。B2 關閉後直接返回 316，以已掌握的正確權限進行最後驗證。'
        );
      }else{
        const exitIdentity=identityLoopMode?identityManager?.currentIdentity:null;
        const nextEvidence=exitIdentity==='CHEN'
          ? '封存層永久關閉；地下後勤路線仍通往 B1 救護車接駁調度室。'
          : exitIdentity==='ZHANG'
            ? '封存層永久關閉；前往 3F 文史館，在系統核銷前完成最後歷史核對。'
            : exitIdentity==='LI'
              ? '封存層永久關閉；回 3F 行政辦公室與文史室取得兩個獨立來源。'
              : '封存層永久關閉；繼續目前身分路線的最後核對。';
        persistentMemory.addJournalNote('B2_EXIT_RESOLVED',`B2 火災回放已完成。${nextEvidence}`);
      }

      const finishLeavingB2=async()=>{
        const identity=identityLoopMode?identityManager?.currentIdentity:null;
        const destination=identity==='CHEN'
          ? {zone:'b1_dispatch_hub',spawn:'chen_b1_dispatch',message:'「地下後勤通道解除一處封鎖。B1 救護車接駁調度室仍可進入。」'}
          : identity==='ZHANG'
            ? {zone:'first_campus_3f',spawn:'m0_3f_corridor',message:'「04:09 系統資料總核銷即將封存。立即前往文史館取得最後歷史拼圖。」'}
            : identity==='LI'
              ? {zone:'first_campus_3f',spawn:'m0_3f_corridor',message:'「返回 3F：打開行政辦公室與文史室確認後，回 316。」'}
              : identity==='ZHOU'
                ? {zone:'first_campus_4f',spawn:'m3_4f_nursing_station',message:'「IDENTITY REJECTION ACTIVE。值班身分正在被重新分類。」'}
                : {zone:'first_campus_3f',spawn:'m0_316_office',message:'「RECORD OVERWRITE ACTIVE。請立即返回 316。」'};
        await prepareZoneWithRetry(destination.zone);
        worldRouter.loadZone(destination.zone,destination.spawn);
        gameState.setGameTime('03:30');
        soundManager.playDoorLockClack();
        setTimeout(()=>uiManager.showSubtitle('全院廣播',destination.message,7200),700);
        uiManager.updateTasks();
        controller.enabled=true;
      };

      const lights=[];
      worldRouter.activeZoneInstance?.zoneGroup?.traverse(object=>{if(object.isLight)lights.push(object);});
      const shutLights=count=>lights.slice(0,count).forEach(light=>{light.intensity=0;});
      void cinematicDirector.play({
        id:'B2_PERMANENT_CLOSURE',
        durationMs:1900,
        keyframes:[{at:.35,yaw:-.08,pitch:.012},{at:.74,yaw:-.14,pitch:.01},{at:1,yaw:0,pitch:0}],
        cues:[
          {at:.18,run:()=>shutLights(Math.ceil(lights.length/3))},
          {at:.42,run:()=>shutLights(Math.ceil(lights.length*2/3))},
          {at:.68,run:()=>shutLights(lights.length)},
          {at:.84,run:()=>soundManager.playDoorLockClack()}
        ],
        onComplete:finishLeavingB2
      }).then(played=>{if(!played)finishLeavingB2();})
        .catch(error=>{console.error('[cinematic] B2 closure failed',error);finishLeavingB2();});
    };

    leaveB2();
  } else if (interactable.type === 'security_monitor_anomaly') {
    gameState.setFlag('CCTV_SELF_DUPLICATE_SEEN',true);
    gameState.setFlag('M5_CCTV_RESOLVED',true);
    gameState.setFlag('SIX_FLOOR_HISTORY_CONFIRMED',true);
    persistentMemory.rememberEvidence('M5_SECURITY_PLAYBACK');
    persistentMemory.addJournalNote('CCTV_SELF_DUPLICATE','第二院區監控抽幀先拍到 1998 的 6F、劉志遠與警衛衝突；即時畫面又同時出現我和另一個值班醫師。辨識框短暫顯示 LI_CHENG_LI / MED-820316。');
    controller.enabled=false;
    uiManager.openMemorySequence(getMemorySequence('M5_SECURITY_PLAYBACK'),()=>{
      completeM5IfReady();
      uiManager.updateTasks();
    });
  } else if (interactable.type === 'exit_door' || interactable.type === 'closed_door') {
    soundManager.playClick();
    if (interactable.id === '1F_MAIN_DOOR') {
      uiManager.showSubtitle('值班醫師', '「值班時間都會關起來，出不去。」', 3500);
    } else if (interactable.id === '1F_PHARM_GATE') {
      uiManager.showSubtitle('值班醫師', '「夜間門診藥局已打烊，非急診調劑時段不開放。」', 3500);
    } else if (interactable.id === '2F_ACUTE_GATE') {
      uiManager.showSubtitle('值班醫師', '「2F 急診封閉式病房區，夜間門禁管制鎖定中。」', 3500);
    } else {
      uiManager.showSubtitle('值班醫師', interactable.subtitle || '「夜間門禁管制時間，此區域暫不開放。」', 3000);
    }
  } else if (interactable.type === 'elevator' || interactable.type === 'travel_selector') {
    if(!identityLoopMode&&!gameState.getFlag('STAFF_ACCESS_CARD')){
      soundManager.playClick();
      uiManager.showSubtitle('門禁','「電梯與安全梯尚未授權。先到總醫師辦公室領取感應卡。」',2800);
      return;
    }
    if(identityLoopMode&&identityRouteDirector.currentRouteStep==='LI_OUTBOUND_8F'&&interactable.kind==='stairs'){
      soundManager.playDoorLockClack();
      uiManager.showSubtitle('內心','「剛才電話叫我走八樓天橋。這次搭電梯上去。」',3000);
      return;
    }
    if(interactable.kind==='stairs'&&worldRouter.activeZoneId==='first_campus_3f'&&!gameState.getFlag('STAIR_SHORTCUT_3F_4F')){
      soundManager.playDoorLockClack();
      uiManager.showSubtitle('值班醫師','「逃生梯從另一側用插銷鎖住了。」',2800);
      return;
    }
    if(interactable.kind==='stairs'&&worldRouter.activeZoneId==='first_campus_4f'&&!gameState.getFlag('STAIR_SHORTCUT_3F_4F')){
      gameState.setFlag('STAIR_SHORTCUT_3F_4F',true);
      uiManager.showSubtitle('值班醫師','「從這側可以把插銷拔開……3F 和 4F 的逃生梯打通了。」',3200);
    }
    controller.enabled = false;
    const travelFrom=worldRouter.activeZoneId;
    uiManager.openTravelSelector(worldRouter.floorDestinations(interactable.kind), travelFrom, async destination => {
      if(interactable.kind==='elevator'&&destination.zoneId.startsWith('first_campus_')&&gameState.getFlag('FLOOR6_AVAILABLE')&&!gameState.getFlag('M6_FLOOR6_RESOLVED')){
        const returnZone=destination.zoneId;
        return Promise.all([
          prepareZoneWithRetry('phantom_6f'),
          cinematicDirector.play({
            id:'ELEVATOR_STOP_AT_ERASED_6F',
            durationMs:1650,
            keyframes:[{at:.28,yaw:-.025,pitch:-.012},{at:.7,yaw:.018,pitch:0},{at:1,yaw:0,pitch:0}],
            cues:[{at:.42,run:()=>uiManager.showSubtitle('電梯樓層顯示器','6',1600)},{at:.62,run:()=>soundManager.playDoorLockClack()}]
          })
        ]).then(()=>{
          gameState.setFlag('PHANTOM6_RETURN_ZONE',returnZone);
          gameState.setFlag('FLOOR6_AVAILABLE',false);
          floorStateManager.setPhase(GamePhase.ELEVATOR_GLITCH);
          worldRouter.loadZone('phantom_6f','phantom_6f_lift');
          controller.enabled=true;
        });
        return;
      }
      if(destination.zoneId==='phantom_6f')gameState.setFlag('PHANTOM6_RETURN_ZONE',travelFrom);
      if(interactable.kind==='elevator'&&travelFrom==='first_campus_2f'&&destination.zoneId==='first_campus_4f'&&gameState.getFlag('FORCE_3F_ELEVATOR_STOP')&&!gameState.getFlag('FORCED_3F_ELEVATOR_STOP_DONE')){
        gameState.setFlag('FORCED_3F_ELEVATOR_STOP_DONE',true);
        gameState.setFlag('STAIR_SHORTCUT_3F_4F',true);
        floorStateManager.setPhase(GamePhase.ELEVATOR_GLITCH);
        gameState.setGameTime('20:40');
        await prepareZoneWithRetry('first_campus_3f');
        worldRouter.loadZone('first_campus_3f','first_3f_lift');
        uiManager.showSubtitle('值班醫師','「……不是 4F。電梯怎麼停在三樓？」',3200);
        controller.enabled=true;
        return;
      }
      if (destination.zoneId === 'first_campus_4f') gameState.markTaskComplete('WARD_ENTRY');
      worldRouter.loadZone(destination.zoneId, destination.spawn);
      const dutyLine=dutyEvents.onZoneEntered(destination.zoneId);
      worldRouter.activeZoneInstance?.syncStoryState?.();
      if(dutyLine){
        uiManager.showSubtitle(dutyLine.speaker,dutyLine.text);
      }
      controller.enabled = true;
    }, interactable.kind, prefetchDestinationAssets);
  } else if (interactable.type === 'second_campus_nursing_report') {
    // Legacy QA compatibility only; production UI no longer exposes this hotspot.
    completeSecondCampus5FWardReport();
  } else if (interactable.type === 'second_chest_patient') {
    if(!gameState.getFlag('SECOND_CAMPUS_ACCESS')){
      uiManager.showSubtitle('值班醫師','「我現在沒有第二院區權限。」',2200);
      return;
    }
    if(!gameState.getFlag('SECOND_CAMPUS_5F_REPORTED')){
      uiManager.showSubtitle('值班醫師','「先到護理站報到，確認病人身分與床位。」',2600);
      return;
    }
    if(!gameState.getFlag('SECOND_CHEST_PATIENT_SEEN')){
      gameState.setFlag('SECOND_CHEST_PATIENT_SEEN',true);
      persistentMemory.addJournalNote('CHEST_PATIENT','陳怡君因胸悶、心悸與焦慮前來；生命徵象穩定，表現符合焦慮伴隨換氣過度。');
      worldRouter.activeZoneInstance?.syncStoryState?.();
      uiManager.showSubtitle('值班醫師','「生命徵象穩定，心電圖也沒有急性變化。先陪她放慢呼吸，這比較像焦慮引起的換氣過度。」',5200);
    }else uiManager.showSubtitle('陳怡君','「胸口好多了，謝謝醫師。」',2800);
  } else if (interactable.type === 'second_chest_roster_clue') {
    if(!gameState.getFlag('M4_CHEST_RESOLVED')){
      uiManager.showSubtitle('值班醫師','「先完成病人評估與醫囑單查核，再看這張舊名冊。」',2800);
      return;
    }
    if(!gameState.getFlag('M4_NAME_CLUE_FOUND')){
      persistentMemory.setTrueNameFragment('frag_givenName_1','守');
      persistentMemory.addJournalNote('TRUE_NAME_SHOU','第二院區病床旁的舊名冊殘頁：第一線：張 守 [墨漬]。');
      gameState.setFlag('M4_NAME_CLUE_FOUND',true);
      controller.enabled=false;
      uiManager.openArchiveDocument({title:interactable.documentTitle,pages:interactable.pages});
    }
  } else if (interactable.type === 'floor6_stethoscope_search') {
    if(!gameState.getFlag('FLOOR6_STETHOSCOPE_FOUND')){
      gameState.setFlag('FLOOR6_STETHOSCOPE_FOUND',true);
      worldRouter.activeZoneInstance?.syncStoryState?.();
      soundManager.playClick();
      uiManager.showSubtitle('值班醫師','「摸到一個冰冷的金屬物件……是老舊聽診器。」',3600);
    }
  } else if (interactable.type === 'floor6_stethoscope_inspect') {
    if(!gameState.getFlag('FLOOR6_STETHOSCOPE_FOUND')||gameState.getFlag('FLOOR6_STETHOSCOPE_INSPECTED'))return;
    controller.enabled=false;
    uiManager.openStoryChoice({
      title:'6F｜老舊聽診器近距離檢視',
      body:`金屬表面氧化，胸件周圍滿是刮痕，黑色管線已經龜裂。刻字被灰塵和污垢覆住。

要翻到胸件背面，還是先擦掉表面的灰塵？`,
      primaryText:'翻到胸件背面',
      secondaryText:'擦掉表面灰塵',
      onPrimary:revealTrueName,
      onSecondary:revealTrueName
    });
    function revealTrueName(){
      gameState.setFlag('FLOOR6_STETHOSCOPE_INSPECTED',true);
      gameState.setFlag('M5_NAME_CLUE_FOUND',true);
      persistentMemory.setTrueNameFragment('frag_givenName_2','恆');
      persistentMemory.addJournalNote('TRUE_NAME_HENG','在 6F 焦黑器材旁找到的老舊聽診器，經翻面／拭塵後讀到「祝 守恆 醫師／1997／執業誌慶」。');
      worldRouter.activeZoneInstance?.syncStoryState?.();
      uiManager.showSubtitle('聽診器胸件背面','「祝 守恆 醫師\n1997\n執業誌慶」',4200);
      controller.enabled=true;
    }
  } else if (interactable.type === 'second_chest_transfer') {
    if(!gameState.getFlag('SECOND_CHEST_PATIENT_SEEN')){
      uiManager.showSubtitle('值班醫師','「標題是『病人處置醫囑』。先去 504B 看過陳怡君，再回來核對內容。」',3000);
      return;
    }
    if(gameState.getFlag('M4_CHEST_RESOLVED')){
      uiManager.showSubtitle('值班醫師','「這張醫囑單已經預填「轉入第一院區 409A」，而且已經有我的名字。」',3000);
      return;
    }
    controller.enabled=false;
    uiManager.openStoryChoice({
      title:'第二院區｜病人處置醫囑',
      body:`陳怡君，主訴胸悶與心悸。生命徵象穩定，心電圖沒有急性變化；評估符合焦慮伴隨換氣過度。

重新核對病人後才發現，這份「病人處置醫囑」已事先填妥「轉入第一院區 409A」，預審醫師「李承禮 MED-820316」。

護理師：「醫師你剛剛開好了，現在簽名就好。」

值班醫師（低聲）：「李承禮醫師？我剛剛也有這張醫囑單嗎？」`,
      primaryText:'補上簽名',
      secondaryText:'拒絕簽署並重新查核',
      onPrimary:()=>loopManager.triggerLegendOverride('CHEST',{legend:'LEGEND 03 — 事先填妥的 409-A 醫囑',reason:'醫囑已預填轉入 409A。'}),
      onSecondary:()=>{
        gameState.setGameTime('01:45');
        gameState.setFlag('M4_CHEST_RESOLVED',true);
        gameState.setFlag('CHEST_RECORD_MATCH',true);
        persistentMemory.resolveLegend('chestPain');
        persistentMemory.addJournalNote('CHEST_RESOLVED','焦慮引起的胸悶已改善；醫囑單卻事先填妥「轉入第一院區 409A」，並留有「李○○」簽名。');
        persistentMemory.raiseErosion(1);
        uiManager.showSubtitle('第二院區護理師','「這張單明明有李承禮的預審章……你又說 409-A 根本不能收治。」',4400);
        controller.enabled=true;
      }
    });  } else if (interactable.type === 'bridge_loop_event') {
    if(!gameState.getFlag('M5_CCTV_RESOLVED')){
      uiManager.showSubtitle('值班醫師','「第二院區監控室那段影像還沒看完。裡面出現了不存在的 6F，先回去確認。」',4200);
      uiManager.updateTasks();
      return;
    }
    if(gameState.getFlag('M5_BRIDGE_RESOLVED')){
      uiManager.showSubtitle('值班醫師','「一直往前。不要回頭。」',2200);return;
    }
    controller.enabled=false;
    const openBridgeChoice=()=>uiManager.openStoryChoice({
      title:'8F 天橋｜窗戶倒影',
      body:'走到一半，腳步忽然停住。窗戶倒影裡多出一個穿白袍的人影。她站在你身後，雙臂平舉，雙手交疊。\n\n要回頭看清楚，還是忍住不回頭？',
      primaryText:'回頭看清楚',
      secondaryText:'忍住，不要回頭',
      onPrimary:()=>loopManager.triggerLegendOverride('BRIDGE',{legend:'LEGEND 04 — 不能回頭的天橋',reason:'另一位值班醫師已通過。'}),
      onSecondary:()=>{
        gameState.setGameTime('02:00');
        gameState.setFlag('M5_BRIDGE_RESOLVED',true);
        gameState.setFlag('M5_BRIDGE_COMMITTED',true);
        gameState.setFlag('M5_ROUTE_CHOICE_RESOLVED',true);
        gameState.setFlag('BRIDGE_NO_LOOKBACK_RULE_ACTIVE',true);
        gameState.setFlag('BRIDGE_MANUAL_LOOKBACK_AFTER_SAFE_CHOICE',false);
        worldRouter.activeZoneInstance?.armManualNoLookbackRule?.();
        persistentMemory.resolveLegend('bridge');
        persistentMemory.addJournalNote('BRIDGE_SAFE','越過天橋中線後不要回頭；選擇忍住只代表沒有在倒影事件轉身，離開天橋以前仍不能自己回頭。');
        completeM5IfReady();
        uiManager.showSubtitle('值班醫師','「忍住……不要回頭。走出天橋以前，都不要看後面。」',3600);
        controller.enabled=true;
      }
    });
    const bridge=worldRouter.activeZoneInstance;
    if(interactable.forcedReflection&&bridge?.returnBridgeActive){
      void cinematicDirector.play({
        id:'SKYBRIDGE_RETURN_WHITE_COAT',
        durationMs:2900,
        keyframes:[{at:.32,yaw:-1.05,pitch:-.008},{at:.67,yaw:-2.75,pitch:0},{at:.86,yaw:-Math.PI,pitch:0},{at:1,yaw:0,pitch:0}],
        cues:[
          {at:.12,run:()=>soundManager.playDoorLockClack()},
          {at:.34,run:()=>{if(bridge.bridgeAnomalyLight)bridge.bridgeAnomalyLight.intensity=.82;}},
          {at:.53,run:()=>{document.body.classList.add('his-flicker');setTimeout(()=>document.body.classList.remove('his-flicker'),460);}},
          {at:.68,run:()=>{if(bridge.bridgeDoppelganger)bridge.bridgeDoppelganger.visible=true;}},
          {at:.78,run:()=>uiManager.showSubtitle('值班醫師','「那不是我的倒影……她一直站在我後面。」',2600)}
        ],
        onComplete:openBridgeChoice
      }).then(played=>{if(!played)openBridgeChoice();})
        .catch(error=>{console.error('[cinematic] skybridge return reflection failed',error);openBridgeChoice();});
      return;
    }
    openBridgeChoice();
  } else if (interactable.type === 'floor6_safe_return') {
    if(!gameState.getFlag('FLOOR6_STETHOSCOPE_FOUND')){
      uiManager.showSubtitle('值班醫師','「等等……焦黑器材旁好像有東西在反光，應該先看一下。」',3400);
      return;
    }
    if(!gameState.getFlag('FLOOR6_STETHOSCOPE_INSPECTED')){
      uiManager.showSubtitle('值班醫師','「那個反光的是老舊聽診器，胸件背面像有刻字，應該看清楚。」',3400);
      return;
    }
    if(!gameState.getFlag('M6_FLOOR6_RESOLVED')){
      gameState.setFlag('M6_FLOOR6_RESOLVED',true);
      gameState.setFlag('VERTICAL_PROOF_FRAGMENT',true);
      persistentMemory.resolveLegend('floor6');
      persistentMemory.addJournalNote('FLOOR6_SAFE','文史相簿與監控都證明 6F 臨床技能教學室曾存在。取得證物後不要深入濃煙區；先查警衛門禁。');
      persistentMemory.raiseErosion(1);
    }
    gameState.setFlag('SECURITY_RECORD_OBJECTIVE',true);
    controller.enabled=false;
    await prepareZoneWithRetry('first_campus_1f');
    worldRouter.loadZone('first_campus_1f','first_1f_lift');
    controller.enabled=true;
    uiManager.showSubtitle('值班醫師','「如果這個樓層真的不存在，電梯系統不一定會留下正常紀錄……但夜間門禁和監視系統一定會記錄有人經過。去一樓警衛台。」',5400);
  } else if (interactable.type === 'guard_sign_2117') {
    if(!gameState.getFlag('NIGHT_PATROL_RETURN_3F'))return;
    if(!gameState.getFlag('GUARD_SIGN_EXAMINED')){
      gameState.setFlag('GUARD_SIGN_EXAMINED',true);
      const zone=worldRouter.activeZoneInstance;
      if(zone?.guardLog2117)zone.guardLog2117.userData.interactable=true;
      soundManager.playPaperSign();
      uiManager.showSubtitle('值班醫師','「21:17……三樓巡查完成？現在就是 21:17。這不是剛好，是有人先替我寫好了。」',5200);
      uiManager.updateTasks();
    }else{
      uiManager.showSubtitle('值班醫師','「牌子上的 21:17 沒變。桌上的簽名簿才是關鍵。」',2800);
    }
  } else if (interactable.type === 'guard_book_2117') {
    if(!gameState.getFlag('NIGHT_PATROL_RETURN_3F'))return;
    if(!gameState.getFlag('GUARD_SIGN_EXAMINED')){
      uiManager.showSubtitle('值班醫師','「先把牆上的查哨紀錄看清楚。」',2400);
      return;
    }
    if(!gameState.getFlag('BOOTSTRAP_2117_RESOLVED')){
      gameState.setFlag('BOOTSTRAP_2117_RESOLVED',true);
      gameState.setFlag('TIME_PROOF_FRAGMENT',true);
      gameState.setFlag('POST_2117_RETURN_TO_DUTY_ROOM',true);
      gameState.setFlag('SANDBOX_MODE',false);
      persistentMemory.learnCode('code_0217');
      persistentMemory.addJournalNote('ECHO_2117','17點看到的「21:17 三樓巡查完成」，最後是我自己回來完成的。');
      gameState.setGameTime('21:17');
      soundManager.playPaperSign();
      uiManager.showSubtitle('值班醫師','「筆跡不是我的……但簽的卻是我的名字。原來那行 21:17，不是預言，是我正在把它完成。」',6200);
      setTimeout(()=>uiManager.showSubtitle('值班醫師','「先回 4F 值班室。我要把今晚發生的事情整理清楚。」',3600),1500);
      uiManager.updateTasks();
    }else{
      uiManager.showSubtitle('值班醫師','「這一行已經完成了。下一次異常不該現在就出現。」',2600);
    }
  } else if (interactable.type === 'er_exit_notice') {
    uiManager.showSubtitle('夜間出入口告示','「此門只進不出。」',2600);
  } else if (interactable.type === 'er_ghost_registration') {
    if(!gameState.getFlag('GHOST_REGISTRATION_AVAILABLE')){
      uiManager.showSubtitle('急診掛號系統','目前沒有待處理的異常掛號。',2200);
      return;
    }
    if(gameState.getFlag('LEGEND_ER0033_RESOLVED')){
      uiManager.showSubtitle('值班醫師','「00:33 那筆掛號已經查過了。現場始終沒有對應的病人。」',3200);
      return;
    }
    gameState.setGameTime('00:33');
    controller.enabled=false;
    uiManager.openStoryChoice({
      title:'00:33｜急診掛號紀錄',
      body:'掛號編號：1998-ER-0217\n建檔時間：00:33\n\n護理師：「檢傷區、候診區、留觀床都沒有人。」\n\n系統提供「建立新病歷」與「僅查閱舊索引」兩種處理方式。',
      primaryText:'建立新病歷',
      secondaryText:'只查閱，不建立',
      onPrimary:()=>loopManager.triggerLegendOverride('ER0033',{legend:'LEGEND 02 — 00:33 急診掛號',reason:'你已完成掛號。'}),
      onSecondary:()=>{
        gameState.setFlag('ER0033_SLIP_COLLECTED',true);
        persistentMemory.addJournalNote('ER0033_SLIP','00:33 系統已有一筆劉志遠／ENG-860214 的 1998-ER-0217 掛號，但急診現場沒有病人。先不要建新檔，把舊掛號聯帶回 316 查封存索引。');
        uiManager.showSubtitle('值班醫師','「不能用現在的 HIS 建檔。把這張 1998-ER-0217 帶回 316 查舊索引。」',4400);
        controller.enabled=true;
      }
    });
  } else if (interactable.type === 'p1_action') {
    const action=interactable.action;
    if(action==='NURSE_REPORT'){
      // Legacy compatibility only. Production reporting is completed by opening
      // a ward access door; no separate nursing-board interaction is required.
      completeFirstCampus4FWardReport();
    } else if(action==='NORMAL_EVENT'){
      if(!gameState.isTaskComplete('P1_4F_REPORT')) return uiManager.showSubtitle('值班醫師','「先去護理站報到。」',2500);
      if(gameState.isTaskComplete('P1_NORMAL_EVENT_DONE')) return;
      dutyEvents.complete('P1_NORMAL_EVENT_DONE','19:30');
      interactable.interactable=false;
      registerBed33Clue('KNOCK_408C_49');
      worldRouter.activeZoneInstance?.setDutyDoorClosed?.(true);
      uiManager.showDialogue([
        {speaker:'408C 老先生',text:'「隔壁有人敲牆，固定四下，停一下，再九下。」'},
        {speaker:'值班醫師',text:'「只有敲擊聲嗎？有聽到人說話嗎？」'},
        {speaker:'408C 老先生',text:'「只有敲牆，沒有人說話。」'},
        {speaker:'值班醫師',text:'「其他人也聽到了嗎？會不會是水管、推車或整修的聲音？」'},
        {speaker:'408C 老先生',text:'「我問過了，他們說沒聽到。我也不知道是不是水管。」'},
        {speaker:'值班醫師',text:'「409 明明封閉整修。是環境聲音，還是知覺異常？先確認現場，現在還不能下結論。」'}
      ]);
      uiManager.updateTasks();
    } else if(action==='ER_ASSESS'){
      if(!gameState.getFlag('P1_ER_CALL_ANSWERED')) return uiManager.showSubtitle('值班醫師','「先接聽值班室電話，確認急診通知。」',2500);
      dutyEvents.complete('P1_ER_ASSESSMENT_DONE','20:25');
      gameState.setFlag('ER_JANE_DOE_WRISTBAND',false);
      gameState.setFlag('ER_UNKNOWN_MALE_TAG',true);
      gameState.setFlag('B_PANEL_CLUE_KNOWN',true);
      persistentMemory.rememberEvidence('M3_ER_PHOTO');
      gameState.setFlag('ER_LIU_IDENTITY_REVEALED',true);
      persistentMemory.addJournalNote('LIU_MAINTENANCE_TAG','劉志遠／ENG-860214／工務機電技師。燒焦吊牌另標示 6F SKILL LAB／B-PANEL；劉志遠反覆說「不要拉三個、紫色燈、王世榮有鑰匙」。');
      worldRouter.activeZoneInstance?.syncStoryState?.();
      uiManager.showDialogue([
        {speaker:'工務識別吊牌',text:'劉志遠／ENG-860214／工務機電技師'},
        {speaker:'值班醫師',text:'「這名字好熟悉，在哪裡看過？」'},
        {speaker:'劉志遠',text:'「不要……不要拉三個……六樓……紫色的燈……B-Panel 在一樓警衛台後面……王世榮有鑰匙……」'}
      ]);
    } else if(action==='ER_NOTE'){
      if(!gameState.isTaskComplete('P1_ER_ASSESSMENT_DONE')) return uiManager.showSubtitle('值班醫師','「先完成病人評估。」',2500);
      dutyEvents.complete('P1_ER_NOTE_DONE','20:30');
      worldRouter.activeZoneInstance?.syncStoryState?.();
      gameState.setFlag('FORCE_3F_ELEVATOR_STOP',true);
      uiManager.showSubtitle('值班醫師','「評估紀錄：劉志遠，ENG-860214，工務機電技師。他沒有任何機房鑰匙；他只知道 B-Panel 與王世榮。鑰匙應該在警衛系統。」',5200);
    } else if(action==='END_SHIFT'){
      if(!gameState.isTaskComplete('P1_RETURN_4F')) return uiManager.showSubtitle('值班醫師','「還沒到可以休息的時候。」',2500);

      if(gameState.getFlag('BOOTSTRAP_2117_RESOLVED')&&!gameState.getFlag('POST_2117_DUTY_CALL_DONE')){
        triggerPost2117DutyRoomSequence();
        return;
      }

      if(gameState.isTaskComplete('ACT1_NORMAL_FLOW')||gameState.getFlag('NIGHT_PATROL_RETURN_3F')) return;
      dutyEvents.complete('ACT1_NORMAL_FLOW','21:00');
      uiManager.showSubtitle('值班醫師','「桌上怎麼有熱咖啡？剛剛值班室鑰匙都在我身上，是誰進來了？」');
      setTimeout(()=>{
        if(gameState.getFlag('NIGHT_PATROL_RETURN_3F')) return;
        gameState.setGameTime('21:15');
        startStoryPhoneCall('NIGHT_PATROL_2115');
      },2200);
    }
    controller.currentInteractable=null;uiManager.showPrompt(null);
  } else if (interactable.type === 'ward_gate') {
    const changed = worldRouter.activeZoneInstance.toggleWardGate(controller.position);
    if (changed) soundManager.playClick();
    else uiManager.showSubtitle('門禁', '請先離開門口，再刷卡關門。', 2500);
    controller.currentInteractable = null;
    uiManager.showPrompt(null);
  }
};

function checkElevatorReady() {
  const ready = gameState.areRequiredTasksComplete();
  if (worldRouter.activeZoneInstance?.updateElevatorLight) {
    worldRouter.activeZoneInstance.updateElevatorLight(ready);
  }
}

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

function triggerGhostRegistrationCinematic(){
  const targetYaw=Math.atan2(controller.position.x-13,8.55+controller.position.z);
  const turn=Math.atan2(Math.sin(targetYaw-controller.yaw),Math.cos(targetYaw-controller.yaw));
  const registrationZone=worldRouter.activeZoneInstance;
  const showRegistrationStage=stage=>{registrationZone.registrationStage=stage;registrationZone.syncStoryState();};
  void cinematicDirector.play({
    id:'00_33_GHOST_REGISTRATION',
    durationMs:3200,
    onComplete:()=>showRegistrationStage(3),
    keyframes:[{at:.55,yaw:turn*.72,pitch:-.008},{at:.78,yaw:turn,pitch:0},{at:1,yaw:0,pitch:0}],
    cues:[
      {at:.22,run:()=>{
        document.body.classList.add('his-flicker');
        setTimeout(()=>document.body.classList.remove('his-flicker'),460);
      }},
      {at:0,run:()=>showRegistrationStage(0)},
      {at:.30,run:()=>showRegistrationStage(1)},
      {at:.48,run:()=>{showRegistrationStage(2);soundManager.playComputerBeep();}},
      {at:.72,run:()=>{showRegistrationStage(3);soundManager.playPaperSign();}}
    ]
  }).then(()=>{controller.enabled=true;})
    .catch(error=>{controller.enabled=true;console.error('[cinematic] 00:33 registration failed',error);});
}

// Animation Loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  controller.update(delta);
  worldRouter.update(delta);
  if(identityLoopMode){identityRouteDirector.update();composer.render();return;}
  if(worldRouter.activeZoneId==='first_campus_2f' && controller.enabled && !cinematicDirector.activeId &&
    gameState.getFlag('GHOST_REGISTRATION_AVAILABLE') && !gameState.getFlag('LEGEND_ER0033_RESOLVED') && !gameState.getFlag('CG_00_33_GHOST_REGISTRATION_PLAYED') &&
    controller.position.x>10.5 && controller.position.x<15.5 && controller.position.z>-9.7 && controller.position.z<-4.5){
    triggerGhostRegistrationCinematic();
  }
  actPresentationDirector.update();
  if(gameState.getFlag('BRIDGE_REFLECTION_NOTICE_PENDING')){
    gameState.setFlag('BRIDGE_REFLECTION_NOTICE_PENDING',false);
    gameState.setFlag('BRIDGE_REFLECTION_NOTICE_SEEN',true);
    controller.enabled=false;controller.cancelAutoMove();
    controller.onInteract({type:'bridge_loop_event',forcedReflection:true});
  }
  if(gameState.getFlag('FAST_PATH_3F')&&gameState.getFlag('OPENED_316')&&!gameState.getFlag('FAST_PATH_316_ENTERED')&&worldRouter.activeZoneId==='first_campus_3f'){
    const p=controller.position;
    if(p.x>3.2&&p.x<10.8&&p.z>2.8&&p.z<8.2){
      gameState.setFlag('FAST_PATH_316_ENTERED',true);
      startStoryPhoneCall('FAST_PATH_316');
    }
  }
  if(gameState.getFlag('BRIDGE_OVERRIDE_PENDING')){
    const manualLookback=gameState.getFlag('BRIDGE_MANUAL_LOOKBACK_AFTER_SAFE_CHOICE');
    gameState.setFlag('BRIDGE_OVERRIDE_PENDING',false);
    gameState.setFlag('BRIDGE_NO_LOOKBACK_RULE_ACTIVE',false);
    gameState.setFlag('BRIDGE_MANUAL_LOOKBACK_AFTER_SAFE_CHOICE',false);
    loopManager.triggerLegendOverride('BRIDGE',{
      legend:'LEGEND 04 — 不能回頭的天橋',
      reason:manualLookback
        ?'你明明選擇了忍住不回頭，卻在回程親自轉身看向身後。'
        :'你已經回頭三次。'
    });
  }

  // After the 21:17 bootstrap the player is explicitly sent back to the 4F duty room.
  // Crossing into the room automatically advances the story; no hidden E target is required.
  if(
    worldRouter.activeZoneId==='first_campus_4f' &&
    gameState.getFlag('POST_2117_RETURN_TO_DUTY_ROOM') &&
    !gameState.getFlag('POST_2117_DUTY_CALL_DONE')
  ){
    const bounds=worldRouter.activeZoneInstance?.dutyRoom?.bounds;
    if(bounds){
      const [x1,z1,x2,z2]=bounds;
      const p=controller.position;
      if(p.x>=Math.min(x1,x2)&&p.x<=Math.max(x1,x2)&&p.z>=Math.min(z1,z2)&&p.z<=Math.max(z1,z2)){
        triggerPost2117DutyRoomSequence();
      }
    }
  }

  composer.render();
}

// URL parameters for QA and visual capture
const urlParams = new URLSearchParams(window.location.search);
const zoneParam = urlParams.get('zone');
const spawnParam = urlParams.get('spawn');
const camPreset = urlParams.get('cam');

if(identityLoopMode){
  await identityRouteDirector.start();
} else if (zoneParam || spawnParam) {
  worldRouter.loadZone(zoneParam || 'first_campus_3f', spawnParam);
  if (urlParams.has('x') && urlParams.has('z')) {
    controller.teleport(
      parseFloat(urlParams.get('x')),
      parseFloat(urlParams.get('y') || controller.eyeHeight),
      parseFloat(urlParams.get('z')),
      parseFloat(urlParams.get('yaw') || 0)
    );
    if (urlParams.has('pitch')) {
      controller.pitch = parseFloat(urlParams.get('pitch'));
      controller.updateCameraRotation();
    }
  }
} else if (camPreset === '316_entrance') {
  worldRouter.loadZone('first_campus_3f');
  controller.teleport(2.1, controller.eyeHeight, 0.4, Math.PI);
  controller.pitch = 0.0;
  controller.updateCameraRotation();
} else if (camPreset === '3f_corridor' || camPreset === 'corridor') {
  worldRouter.loadZone('first_campus_3f');
  controller.teleport(-2.5, controller.eyeHeight, 0.0, -Math.PI / 2);
  controller.pitch = 0.0;
  controller.updateCameraRotation();
} else if (camPreset === 'his_workstation' || camPreset === 'workstation') {
  worldRouter.loadZone('first_campus_3f');
  controller.teleport(9.0, controller.eyeHeight, 5.5, -Math.PI / 2);
  setTimeout(() => { uiManager.openWorkstation(); }, 300);
} else if (camPreset === '4f_arrival_signage' || camPreset === 'elevator') {
  worldRouter.loadZone('first_campus_3f');
  controller.teleport(-4.2, controller.eyeHeight, 0.0, Math.PI / 2);
  controller.pitch = 0.05;
  controller.updateCameraRotation();
} else if (camPreset === 'duty_room_sign') {
  worldRouter.loadZone('first_campus_3f');
  controller.teleport(1.25, 1.82, 1.05, Math.PI);
  controller.pitch = 0.0;
  controller.updateCameraRotation();
} else {
  worldRouter.loadZone('first_campus_3f', 'm0_316_entrance');
}

if (import.meta.env.DEV || urlParams.get('debug') === '1') {
  worldRouter.createDebugUI();
  window.renderResourceStats = () => ({ ...renderer.info.memory });
}

animate();
loadingMask.remove();
requestAnimationFrame(() => setTimeout(() => {
  void preloadZoneOptional(worldRouter.activeZoneId).catch(error => console.warn('[art] optional opening zone assets failed', error));
}, 1000));
console.log('Night Corridor - Full World Modeling System Initialized.');
