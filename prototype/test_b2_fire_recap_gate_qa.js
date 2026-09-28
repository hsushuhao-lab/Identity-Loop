import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildVictimMap} from './src/story/B2FireRecapDirector.js';

const main=readFileSync('./src/main.js','utf8');
const ui=readFileSync('./src/ui/UIManager.js','utf8');
const gameState=readFileSync('./src/core/GameState.js','utf8');
const director=readFileSync('./src/story/B2FireRecapDirector.js','utf8');

for(const token of [
  '警衛台後方的 B-Panel',
  '錯誤程序被執行',
  '工務人員試圖恢復排煙',
  '八個人被困在不同位置',
  '院內紀錄開始失真',
  'UNKNOWN SESSION / OVERWRITE ACTIVE'
]) assert(director.includes(token),'B2 fire recap missing beat: '+token);

const doctorProfiles={
  ZHANG:{name:'張守恆',masked:'MED-87••••'},
  LI:{name:'李承禮',masked:'MED-82••••'},
  ZHOU:{name:'周啟文',masked:'MED-88••••'},
  CHEN:{name:'陳柏勳',masked:'MED-89••••'}
};
for(const [identity,profile] of Object.entries(doctorProfiles)){
  const map=buildVictimMap(identity);
  assert.equal(map.includes(profile.name),false,'B2 must redact only the active seed name: '+identity);
  assert.equal(map.includes(profile.masked),true,'B2 must show the active seed masked employee prefix: '+identity);
  for(const [otherId,other] of Object.entries(doctorProfiles)){
    if(otherId!==identity)assert.equal(map.includes(other.name),true,'B2 must restore non-player victim name: '+otherId);
  }
}
for(const staffName of ['林婉真','王世榮','謝玉琴','劉志遠']){
  assert.equal(buildVictimMap('ZHANG').includes(staffName),true,'B2 objective victim map must restore staff name: '+staffName);
}
assert(director.includes('buildVictimMap(hiddenIdentity)'),'B2 recap must construct the visible map from the active hidden identity');

assert(main.includes("import { B2FireRecapDirector } from './story/B2FireRecapDirector.js';"),'B2 fire recap director integration missing');
const terminalStart=main.indexOf("} else if (interactable.type === 'b2_archive_terminal') {");
const exitStart=main.indexOf("} else if (interactable.type === 'b2_exit_door') {",terminalStart);
const terminalBranch=main.slice(terminalStart,exitStart);
assert(terminalStart>=0&&exitStart>terminalStart,'B2 terminal branch missing');
assert(terminalBranch.includes("if(!gameState.getFlag('B2_FIRE_RECAP_SEEN'))")&&terminalBranch.includes('playB2FireRecap();'),'first B2 terminal interaction must always launch the fire recap');
assert(terminalBranch.indexOf('playB2FireRecap();')<terminalBranch.indexOf('openIdentityMatrix'),'fire recap must occur before any optional identity comparison');
assert(terminalBranch.includes("M7_B2_RESOLVED")&&terminalBranch.includes("B2_IDENTITY_ATTEMPT_USED"),'completed/consumed B2 identity state must still be handled after the mandatory recap');
assert(terminalBranch.includes('身分矩陣為選擇性比對；可直接離開 B2 返回 316'),'identity matrix must be optional after the recap, never a route blocker');
assert(main.includes("gameState.setFlag('B2_TERMINAL_CONTACTED',true)"),'B2 terminal contact flag missing');
assert(main.includes("gameState.setFlag('B2_FIRE_RECAP_SEEN',true)"),'B2 recap completion flag missing');
assert(main.includes("gameState.setFlag('RECORD_OVERWRITE_ACTIVE',true)"),'B2 recap must activate overwrite pressure');
assert(main.includes("hiddenIdentity:identityLoopMode?identityManager?.currentIdentity:null"),'Identity Loop B2 recap must receive the active seed for redaction');
assert(main.includes("ARCHIVE_PERSONNEL_OBJECTIVE',zhangIdentityRoute"),'Zhang B2 route must redirect to 3F archive instead of generic M8 chase');
assert(main.includes("ARCHIVE_ACCESS_KEY',true"),'Zhang post-B2 route must grant the archive access needed for the final evidence pass');
assert(main.includes('CURRENT SELF：CORRUPTED｜409-A 死者姓名欄遭除籍塗銷｜員編前綴 MED-87••••'),'repeat Zhang B2 terminal use must stay redacted');
assert(main.includes("先啟動 B2 封存終端"),'B2 one-way exit must remain blocked before terminal recap');
assert(ui.includes('啟動封存驗證終端，讀取當年火災與人員封存紀錄'),'B2 task board must explicitly request the fire recap');
assert(gameState.includes("this.flags.set('B2_TERMINAL_CONTACTED', false)"),'fresh loop must clear B2 terminal contact');
assert(gameState.includes("this.flags.set('B2_FIRE_RECAP_SEEN', false)"),'fresh loop must clear B2 fire recap state');
assert(gameState.includes("this.flags.set('RECORD_OVERWRITE_ACTIVE', false)"),'fresh loop must clear overwrite state');

console.log('B2 FIRE RECAP / FINAL 316 GATE QA PASS');
