import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

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

for(const leaked of ['張守恆','李承禮','周啟文','陳柏勳','林婉真','王世榮','謝玉琴','劉志遠']){
  assert.equal(director.includes(leaked),false,'B2 fire recap must keep personnel names redacted before M9: '+leaked);
}

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
assert(main.includes("gameState.setFlag('M8_IDENTITY_BATTLE_ACTIVE',true)"),'B2 recap must unlock final 316 identity battle');
assert(main.includes("先啟動 B2 封存終端"),'B2 one-way exit must remain blocked before terminal recap');
assert(main.includes("gameState.getFlag('B2_FIRE_RECAP_SEEN') ||"),'correct 316 authorization must accept the B2 fire recap as the route gate');
assert(!main.includes('身分檔案尚未完成來源核對。先去三樓文史資料室查閱夜班核心人員檔案。'),'history-room detour must no longer hard-block final 316 after B2');
assert(ui.includes('啟動封存驗證終端，讀取當年火災與人員封存紀錄'),'B2 task board must explicitly request the fire recap');
assert(ui.includes('立即返回 316，輸入正確權限阻止事故與身分紀錄被再次覆蓋'),'post-B2 task board must converge on final 316');
assert(gameState.includes("this.flags.set('B2_TERMINAL_CONTACTED', false)"),'fresh loop must clear B2 terminal contact');
assert(gameState.includes("this.flags.set('B2_FIRE_RECAP_SEEN', false)"),'fresh loop must clear B2 fire recap state');
assert(gameState.includes("this.flags.set('RECORD_OVERWRITE_ACTIVE', false)"),'fresh loop must clear overwrite state');

console.log('B2 FIRE RECAP / FINAL 316 GATE QA PASS');
