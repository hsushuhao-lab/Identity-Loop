import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {B2_FIRE_BEATS,buildVictimMap} from './src/story/B2FireRecapDirector.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';

const baseline=buildVictimMap();
for(const identity of ['LI','ZHANG','ZHOU','CHEN']){
  assert.equal(buildVictimMap(identity),baseline,`B2 map must be seed-neutral: ${identity}`);
}

for(const name of ['李承禮','張守恆','周啟文','陳柏勳']){
  assert.ok(!baseline.includes(name),`B2 must not expose physician name: ${name}`);
}
for(const employeeId of ['MED-820316','MED-870409','MED-880217','MED-890605']){
  assert.ok(!baseline.includes(employeeId),`B2 must not expose full physician employee ID: ${employeeId}`);
}
for(const maskedId of ['MED-82••••','MED-87••••','MED-88••••','MED-89••••']){
  assert.ok(baseline.includes(maskedId),`B2 must retain masked cross-check clue: ${maskedId}`);
}
for(const role of ['夜間總醫師','第一線住院醫師','第二線住院醫師','第二院區支援醫師']){
  assert.ok(baseline.includes(role),`B2 must retain physician role: ${role}`);
}

const mapBeat=B2_FIRE_BEATS.find(beat=>beat.mode==='map');
assert.ok(mapBeat);
assert.match(mapBeat.evidence,/完整姓名與完整員編未在 B2 恢復/);

const director=readFileSync(new URL('./src/story/IdentityRouteDirector.js',import.meta.url),'utf8');
assert.doesNotMatch(director,/visibleText:\s*`\$\{beat\.label\}：\$\{beat\.lines\.at\(-1\)\}`/);

const floor3=readFileSync(new URL('./src/world/zones/FirstCampus3F.js',import.meta.url),'utf8');
assert.match(floor3,/ARCHIVE_PERSONNEL_1998/,'3F must retain the independent 1998 personnel archive');
assert.match(floor3,/getCorePersonnelProfiles\(\)/,'3F personnel archive must render canonical full profiles');

const panel=readFileSync(new URL('./src/ui/IdentityLoopPanel.js',import.meta.url),'utf8');
assert.match(panel,/identity-case-binder/);
assert.match(panel,/唯讀/);
assert.match(panel,/暫不提交，回 3F 文史館查證/);
assert.match(panel,/1998 夜班核心人員名錄/);

for(const identity of ['LI','ZHANG','ZHOU','CHEN']){
  const scene=getIdentityRouteScene('M2',identity);
  assert.ok(scene.length>=4,'Do not remove M2 gameplay while fixing P0');
}
console.log('PASS neutral-redacted B2 + independent 3F roster + deferrable M9 evidence review');
