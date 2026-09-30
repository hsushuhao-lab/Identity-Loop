import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {B2_FIRE_BEATS,buildVictimMap} from './src/story/B2FireRecapDirector.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';

const baseline=buildVictimMap();
for(const identity of ['LI','ZHANG','ZHOU','CHEN']){
  assert.equal(buildVictimMap(identity),baseline,`B2 map must not leak ${identity}`);
}
for(const name of ['李承禮','張守恆','周啟文','陳柏勳'])assert.ok(baseline.includes(name));
const mapBeat=B2_FIRE_BEATS.find(beat=>beat.mode==='map');
assert.ok(mapBeat);
assert.doesNotMatch(mapBeat.evidence,/其中 409-A 那名第一線住院醫師的姓名欄/);

const director=readFileSync(new URL('./src/story/IdentityRouteDirector.js',import.meta.url),'utf8');
assert.doesNotMatch(director,/visibleText:\s*`\$\{beat.label\}：\$\{beat.lines.at\(-1\)\}`/);
const panel=readFileSync(new URL('./src/ui/IdentityLoopPanel.js',import.meta.url),'utf8');
assert.match(panel,/identity-case-binder/);
assert.match(panel,/唯讀/);
for(const identity of ['LI','ZHANG','ZHOU','CHEN']){
  const scene=getIdentityRouteScene('M2',identity);
  assert.ok(scene.length>=4,'Do not remove M2 gameplay while fixing P0');
}
console.log('PASS neutral B2 archive + structured notes + M9 read-only binder');
