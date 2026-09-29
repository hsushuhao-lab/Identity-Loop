import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {IDENTITY_ROUTES,ROUTE_STEPS} from './src/story/IdentityRoutes.js';

assert.deepEqual(IDENTITY_ROUTES.LI,[
  'M1','M2','LI_DUTY_CALL_2000','LI_ER_2005','LI_RETURN_DUTY_2117','LI_2117_PATROL','LI_RETURN_DUTY_0033',
  'LI_ER_0033','LI_316_ARCHIVE','LI_OUTBOUND_8F','M4','M5','M6','M7','B2','LI_3F_EVIDENCE','M9'
]);
for(const step of IDENTITY_ROUTES.LI)assert.ok(ROUTE_STEPS[step],step);

const scenes=readFileSync('./src/story/IdentityRouteScenes.js','utf8');
const director=readFileSync('./src/story/IdentityRouteDirector.js','utf8');
const main=readFileSync('./src/main.js','utf8');
const ui=readFileSync('./src/ui/UIManager.js','utf8');

assert.match(scenes,/LI_DUTY_CALL_2000:[\s\S]*值班室電話/);
assert.match(scenes,/LI_ER_2005:[\s\S]*急診醫師電腦｜書寫紀錄[\s\S]*erRegistrationChoice:true/);
assert.match(scenes,/LI_RETURN_DUTY_2117:[\s\S]*21:15 值班電話/);
assert.match(scenes,/LI_2117_PATROL:[\s\S]*21:17 三樓查哨/);
assert.match(scenes,/LI_RETURN_DUTY_0033:[\s\S]*有紀錄但沒有人的掛號/);
assert.match(scenes,/LI_ER_0033:[\s\S]*ghostRegistrationChoice:true/);
assert.match(scenes,/LI_316_ARCHIVE:[\s\S]*316 舊終端查詢[\s\S]*第二院區/);
assert.match(scenes,/LI_OUTBOUND_8F:[\s\S]*六樓開門後/);
assert.match(director,/SECOND_CAMPUS_ACCESS/);
assert.match(ui,/playElevatorGlimpse/);
assert.match(main,/currentRouteStep==='LI_OUTBOUND_8F'[\s\S]*interactable\.kind==='stairs'/);
assert.match(scenes,/LI_3F_EVIDENCE:[\s\S]*行政辦公室[\s\S]*文史室[\s\S]*evidenceSweep:true/);

assert.match(scenes,/回護理站核對醫囑單/);
assert.match(scenes,/transferSignChoice:true/);
assert.doesNotMatch(scenes,/轉院單/);
assert.doesNotMatch(director,/轉院單/);
assert.doesNotMatch(main,/轉院單/);
assert.match(director,/title:'第二院區｜醫囑單'/);
assert.match(director,/secondaryText:'簽名核准醫囑單'/);
assert.match(director,/M4_409A_ORDER_PATIENTIZATION/);
assert.match(scenes,/lightFlicker: identity==='LI'/);
assert.match(director,/LI_SECOND_CAMPUS_LIGHT_FLICKER_SEEN/);

assert.match(director,/title:'00:33｜有紀錄，但沒有病人'/);
assert.match(director,/secondaryText:'建立無名新病歷'/);
assert.match(director,/ER0033_DUPLICATE_RECORD_PATIENTIZATION/);
assert.match(director,/this\.step==='LI_3F_EVIDENCE'[\s\S]*ADMIN_OFFICE_ENTERED[\s\S]*ARCHIVE_ROOM_ENTERED/);

assert.match(director,/LI_GUARD_LOUNGE_CCTV_CLUE/);
assert.match(director,/ER_DOCTOR_CHARTING/);
assert.match(director,/dutyRoomEntry/);
assert.match(director,/playForcedBridgeReveal/);
assert.match(director,/primaryText:'忍住，不回頭'/);
assert.match(scenes,/嘻嘻，你又回來了/);
assert.match(scenes,/警衛休息室的錄影帶/);
assert.doesNotMatch(scenes,/順序自由/);
assert.match(scenes,/沒有名牌(?:、看不清臉)?的白袍輪廓|沒有名牌，臉仍然看不清/);
assert.match(scenes,/六樓[\s\S]*白袍輪廓/);

assert.match(main,/result\.type==='WRONG_MEMORY_BAD_END'/);
assert.match(main,/identityManager\.startNewRun\(\{forceIdentity:identity,restart:true\}\)/);
assert.match(main,/ER0033_DUPLICATE_RECORD_PATIENTIZATION/);
assert.match(main,/M4_409A_ORDER_PATIENTIZATION/);

console.log('PASS LI expanded procedure-choice route');
