import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IDENTITY_ROUTES,ROUTE_STEPS} from './src/story/IdentityRoutes.js';
import {buildVictimMap} from './src/story/B2FireRecapDirector.js';

assert.deepEqual(IDENTITY_ROUTES.CHEN,[
  'CHEN_OPEN_SKYBRIDGE','M4','M5','M1','M2','M3','M6','M7','B2','CHEN_M8_DISPATCH','M9'
]);
assert.equal(ROUTE_STEPS.CHEN_M8_DISPATCH.zoneId,'b1_dispatch_hub');
assert.equal(ROUTE_STEPS.CHEN_M8_DISPATCH.spawn,'chen_b1_dispatch');

const scenes=readFileSync('./src/story/IdentityRouteScenes.js','utf8');
const director=readFileSync('./src/story/IdentityRouteDirector.js','utf8');
const ward=readFileSync('./src/world/shared/WardFloorplan.js','utf8');
const ui=readFileSync('./src/ui/UIManager.js','utf8');
const sound=readFileSync('./src/audio/SoundManager.js','utf8');
const router=readFileSync('./src/world/WorldRouter.js','utf8');
const routes=readFileSync('./src/world/shared/WorldRoutes.js','utf8');
const dispatch=readFileSync('./src/world/zones/B1DispatchHub.js','utf8');
const main=readFileSync('./src/main.js','utf8');
const endings=readFileSync('./src/story/IdentityLoopEndings.js','utf8');

assert.match(scenes,/CHEN_OPEN_SKYBRIDGE:[\s\S]*504B 胸痛/);
assert.match(scenes,/5F 值班室私人金屬保險箱[\s\S]*親手輸入 5042[\s\S]*chenLockbox:true/);
assert.match(scenes,/灰滾邊跨院支援識別證[\s\S]*chenBadgeInspect:true/);
assert.match(scenes,/MED-89••••/);
assert.match(scenes,/第二院區急診室 專用通行憑證/);
assert.match(scenes,/你不是剛推著輪椅走上天橋嗎/);
assert.doesNotMatch(scenes,/陳醫師.*剛推著輪椅/);
assert.match(scenes,/走廊裡的舊輪椅[\s\S]*chenWheelchairPush:true/);
assert.match(scenes,/左前輪的偏軸阻力/);
assert.match(scenes,/喀啦、喀啦、喀啦/);

assert.match(ward,/CHEN_5042_LOCKBOX/);
assert.match(ward,/CHEN_GREY_BADGE/);
assert.match(ward,/CHEN_5F_DUTY_PHONE/);
assert.match(ward,/CHEN_WHEELCHAIR/);
assert.match(ward,/pushChenWheelchair/);
assert.match(ward,/id:'SECOND_CHEST_TRANSFER'.*label:'查看 409-A 轉送醫囑單'/);
assert.match(ward,/查看 409-A 轉送醫囑單/);

assert.match(ui,/openChen5042Lockbox/);
assert.match(ui,/value!=='5042'/);
assert.match(ui,/openChenBadgeInspection/);
assert.match(ui,/transform-style:preserve-3d/);
assert.match(ui,/MED-89••••/);
assert.match(ui,/第二院區急診室 專用通行憑證/);

assert.match(sound,/playWheelchairRattle/);
assert.match(sound,/playWheelchairApproach/);
assert.match(director,/playWheelchairApproach/);

assert.match(scenes,/院區間緊急轉送交接聯：無名男性留觀個案 → 409-A 隔離觀察/);
assert.match(scenes,/chenTransportChoice: identity==='CHEN'/);
assert.match(director,/title:'第一院區 2F 急診｜跨院緊急轉送交接聯'/);
assert.match(director,/扣留單據，拒絕盲從轉送/);
assert.match(director,/簽署轉送交接，送往 409-A/);
assert.match(director,/CHEN_ER_TRANSFER_PATIENTIZATION/);
assert.match(main,/CHEN_ER_TRANSFER_PATIENTIZATION/);

assert.match(scenes,/chenCctvCg: identity==='CHEN'/);
assert.match(director,/CHEN_CCTV_WHEELCHAIR_DOPPELGANGER/);
assert.match(director,/ROLE: CROSS-CAMPUS SUPPORT｜ID PREFIX: MED-89••••/);
assert.match(scenes,/chenM6Cg: identity==='CHEN'/);
assert.match(director,/CHEN_6F_PROCEDURAL_REPLAY/);
assert.match(director,/5042[\s\S]*灰滾邊[\s\S]*偏軸輪椅/);

assert.match(scenes,/CHEN_M8_DISPATCH:[\s\S]*車次 094/);
assert.match(scenes,/陳○○｜MED-89••••/);
assert.match(scenes,/chenDispatchBadgeSwipe:true/);
assert.match(scenes,/CHEN_DISPATCH_LOG_VERIFIED/);
assert.match(scenes,/chenDispatchServiceLift:true/);
assert.match(dispatch,/Chen_1998_Ambulance/);
assert.match(dispatch,/CHEN_DISPATCH_BOARD/);
assert.match(dispatch,/CHEN_DISPATCH_LOCKER_READER/);
assert.match(dispatch,/CHEN_DRIVER_LOG/);
assert.match(dispatch,/CHEN_DISPATCH_SERVICE_LIFT/);
assert.match(router,/b1_dispatch_hub/);
assert.match(routes,/chen_b1_dispatch/);
assert.match(main,/zone:'b1_dispatch_hub',spawn:'chen_b1_dispatch'/);

const victimMap=buildVictimMap('CHEN');
assert.equal(victimMap.includes('陳柏勳'),false);
assert.equal(victimMap.includes('MED-89••••'),true);
assert.match(scenes,/MED-89••••／第二院區支援醫師／最後位置：空中天橋/);

assert.match(scenes,/409-A 轉送醫囑單/);
assert.doesNotMatch(scenes,/409-A 醫囑單/);
assert.doesNotMatch(scenes,/轉院單/);
assert.match(director,/第二院區｜409-A 轉送醫囑單/);
assert.match(endings,/THE TRANSFER/);
assert.match(endings,/我是支援醫師陳柏勳/);
assert.match(endings,/撤銷所有轉入 409-A 的轉送/);

console.log('PASS CHEN dedicated procedural-memory route: 5042 -> gray badge -> wheelchair -> CCTV/bridge -> ER transfer trap -> B2 MED-89 -> B1 dispatch -> M9');
