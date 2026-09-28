import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const ui=readFileSync('./src/ui/UIManager.js','utf8');
const css=readFileSync('./style.css','utf8');
const panel=readFileSync('./src/ui/IdentityLoopPanel.js','utf8');
const sound=readFileSync('./src/audio/SoundManager.js','utf8');
const scenes=readFileSync('./src/story/IdentityRouteScenes.js','utf8');
const director=readFileSync('./src/story/IdentityRouteDirector.js','utf8');
const floor3=readFileSync('./src/world/zones/FirstCampus3F.js','utf8');
const ward=readFileSync('./src/world/shared/WardFloorplan.js','utf8');
const main=readFileSync('./src/main.js','utf8');

// Bureaucratic temptation is visibly marked as the standard workflow, but requires a second confirmation.
assert.match(ui,/systemTrap=null/);
assert.match(ui,/STANDARD WORKFLOW/);
assert.match(ui,/storyChoiceArmedSide/);
assert.match(ui,/再次確認/);
assert.match(css,/story-system-choice/);
assert.match(css,/his-standard-action/);
assert.match(css,/his-confirm-armed/);
assert.match(css,/SYSTEM|STANDARD|attr\(data-workflow\)/);

// LI gets three sensorimotor/procedural-memory cues without a name reveal.
assert.match(scenes,/白袍袖口[\s\S]*腕錶/);
assert.match(scenes,/醫囑單邊緣[\s\S]*頁角/);
assert.match(scenes,/右手已經先移向標著 1 的開關/);
const liPreM9=scenes.slice(scenes.indexOf('LI_ER_2005:'),scenes.indexOf('M9:'));
assert.doesNotMatch(liPreM9,/李承禮|MED-820316/);

// 21:17 environmental drift is tied to state and has both 3F and 4F manifestations.
assert.match(director,/LI_2117_ENV_DRIFT/);
assert.match(floor3,/Phase3_2117_WetFootprints/);
assert.match(floor3,/LI_2117_ENV_DRIFT/);
assert.match(ward,/LI_2117_ENV_DRIFT/);
assert.match(ward,/dutyPhoneHandset/);

// M4 is a medical order everywhere player-facing; transfer-form wording must not return.
assert.doesNotMatch(scenes,/轉院單|轉送單/);
assert.doesNotMatch(director,/轉院單|轉送單/);
assert.doesNotMatch(main,/轉院單/);
assert.match(scenes,/醫囑單/);
assert.match(director,/預填醫囑單/);
assert.match(director,/簽名確認 409-A 醫囑/);

// M9 accepts full-width input via NFKC, rejects typos without committing, and pauses 1.2 s after a real record match.
assert.match(panel,/normalize\('NFKC'\)/);
assert.match(panel,/STAFF ID NOT RECOGNIZED — RETRY/);
assert.match(panel,/setTimeout\(\(\)=>\{[\s\S]*this\.commit\(candidate\.identity\);[\s\S]*\},1200\)/);
assert.match(panel,/name\.disabled=true;employeeId\.disabled=true;submit\.disabled=true/);
assert.match(panel,/playTerminalKey/);
assert.match(panel,/playTerminalFanHold\(1\.2\)/);
assert.match(sound,/playTerminalKey\(\)/);
assert.match(sound,/playTerminalFanHold\(duration=1\.2\)/);

console.log('PASS LI_POLISH: fair system temptation, procedural body memory, environmental drift, medical-order wording, and M9 terminal polish');
