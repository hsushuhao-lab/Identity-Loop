import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const ward = read('./src/world/shared/WardFloorplan.js');
const cctv = read('./src/world/zones/SecondCampus2F.js');
const scenes = read('./src/story/IdentityRouteScenes.js');
const director = read('./src/story/IdentityRouteDirector.js');
const sound = read('./src/audio/SoundManager.js');

assert.match(ward, /IdentitySecond5F_NurseStationComputer/);
assert.match(ward, /使用 5F 護理站電腦/);
assert.doesNotMatch(ward, /按下護理站對講機/);
assert.match(ward, /IdentitySecond5F_DutyBathroom/);
assert.match(ward, /CHEN_GREY_BADGE.*拿取識別證/);
assert.match(cctv, /Second2F_CCTV_PhoneDesk/);
assert.match(cctv, /interactable:true,\s*id:'IDENTITY_SECOND_2F_CCTV_PHONE'/);
assert.match(scenes, /408C 結束後.*409/);
assert.doesNotMatch(scenes, /記住 6F 一閃而過的畫面/);
assert.doesNotMatch(scenes, /轉送單|轉送醫囑單|轉送聯/);
assert.match(director, /playFuriousWallKnockPattern/);
assert.match(sound, /playFuriousWallKnockPattern/);
console.log('PASS Identity mission brief contracts');
