import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PersistentMemory,TRUE_NAME_CANON} from './src/core/PersistentMemory.js';

assert.equal(TRUE_NAME_CANON,'張守恆');

const main=readFileSync('./src/main.js','utf8');
const er=readFileSync('./src/world/zones/FirstCampus2FER.js','utf8');
const level3=readFileSync('./src/world/Level3FBlockout.js','utf8');
const ward=readFileSync('./src/world/shared/WardFloorplan.js','utf8');
const bridge=readFileSync('./src/world/zones/Skybridge.js','utf8');
const pond=readFileSync('./src/world/zones/EcologyPond.js','utf8');
const floor6=readFileSync('./src/world/zones/Phantom6F.js','utf8');
const b2=readFileSync('./src/world/zones/B2Archive.js','utf8');
const router=readFileSync('./src/world/WorldRouter.js','utf8');
const routes=readFileSync('./src/world/shared/WorldRoutes.js','utf8');
const html=readFileSync('./index.html','utf8');
const ui=readFileSync('./src/ui/UIManager.js','utf8');
const memorySource=readFileSync('./src/core/PersistentMemory.js','utf8');

assert(!main.includes('工號'),'player-facing story copy must use 員編 terminology');
assert(ui.includes("17:00｜值班身分驗證異常")&&main.includes("HANDOFF_DEFAULT"),'M1 must make the default-template choice a real 409 Patientization decision');
const adminBranch=main.slice(main.indexOf("['admin_roster_3f','admin_printer_doc_3f','admin_drawer_manual_3f']"),main.indexOf("} else if (interactable.type === 'spare_key_316')"));
assert(adminBranch.includes('openArchiveDocument'),'3F admin evidence documents must remain readable');
assert(!adminBranch.includes("if(gameState.getFlag('FAST_PATH_3F'))"),'loop fast path must never suppress unread 3F admin evidence after an early HANDOFF_DEFAULT override');
assert(main.includes("M5_CCTV_RESOLVED")&&main.includes("SIX_FLOOR_HISTORY_CONFIRMED"),'M5 CCTV must seed the erased-6F story before M6 can unlock');
assert(main.includes("M8_CODE_BLACK_ANNOUNCED")&&main.includes("UNKNOWN SESSION")&&main.includes("B2_FIRE_RECAP_SEEN"),'B2 terminal fire recap must trigger anonymous record-overwrite pressure');
assert(!routes.includes('hill_from_')&&!routes.includes('pond_from_'),'production routes must not expose outdoor spawns');
assert(!router.includes('HillsideRoute')&&!router.includes('EcologyPond'),'production router must not load outdoor zones');
assert(main.includes("setTrueNameFragment('frag_employeePrefix','MED-87')"),'M3 MED-87 clue missing');
assert(main.includes("setTrueNameFragment('frag_employeeFull','MED-870409')"),'M7 full 員編 clue missing');
assert(main.includes("setFlag('SECOND_CAMPUS_OBJECTIVE_ACTIVE',true)"),'M3 lookup must activate the second-campus objective');
assert(main.includes('八樓天橋的門禁權限已開放'),'second-campus call must identify the bridge floor');
assert(main.includes('怎麼知道我在 316 辦公室'),'M3 phone must establish the 316 privacy violation');
assert(html.includes('final-employee-id'),'M9 must collect the four-digit employee suffix');
assert(main.includes("name!==TRUE_NAME_CANON||employeeId!=='0409'"),'M9 must require both the exact canonical name and employee ID');
assert(!readFileSync('./src/ui/UIManager.js','utf8').includes('突然出現在樓層選單裡的「6F」'),'M6 task must not spoil the floor');
assert(!readFileSync('./src/world/WorldRouter.js','utf8').includes("label:'6F'"),'phantom 6F must never be a selectable floor');

assert(er.includes("type:'er_ghost_registration'"),'M3 ghost registration terminal missing');
assert(er.includes("type:'er_exit_notice'")&&er.includes('此門只進不出'),'M3 ER entry-only exit warning missing');
assert(main.includes("LEGEND 02 — 00:33 急診掛號")&&main.includes("ER0033_SLIP_COLLECTED")&&main.includes("legacy_terminal_316")&&level3.includes("316_LEGACY_TERMINAL")&&main.includes("SECOND_CAMPUS_ACCESS"),'M3 two-stage ER-to-316 resolve or campus call missing');

assert(main.includes('function completeSecondCampus5FWardReport()')&&main.includes("SECOND_CAMPUS_5F_REPORTED")&&ward.includes("type:'second_chest_patient'")&&ward.includes("type:'second_chest_transfer'"),'M4 ward-door report/patient/form sequence missing');
assert(ward.includes('Second5F_DutyPhoto_')&&ward.includes('1998 夜班合照')&&ward.includes('臨床教學留影'),'M4 second-campus 5F duty room must contain visible framed photos');
const second2f=readFileSync('./src/world/zones/SecondCampus2F.js','utf8');
assert(!second2f.includes("Doorway.build({scene:this.zoneGroup,colliders:this.colliders,x:72,z:4.5"),'second-campus 2F elevator-front doorway must remain removed');
assert(ward.includes("label:'查看病人處置醫囑'"),'M4 desk paper must retain its initial treatment-order name');
assert(main.includes("SECOND_CAMPUS_5F_REPORTED")&&main.includes('門禁看到你的刷卡紀錄了，算報到完成')&&main.includes('李承禮醫師？我剛剛也有這張醫囑單嗎？'),'M4 must use automatic ward-door report wording plus protagonist Li-identity misdirection');
assert(main.includes("LEGEND 03 — 事先填妥的 409-A 醫囑")&&main.includes("M4_CHEST_RESOLVED")&&main.includes("second_chest_roster_clue"),'M4 clinical/admin-horror decision flow or physical clue missing');

assert(bridge.includes("type:'bridge_loop_event'")&&main.includes("LEGEND 04 — 不能回頭的天橋"),'M5 bridge legend missing');
assert(main.includes("frag_givenName_2','恆'"),'M5 true-name fragment missing');
assert(!bridge.includes("type:'true_name_clue_2'")&&floor6.includes("type:'floor6_stethoscope_search'")&&floor6.includes("type:'floor6_stethoscope_inspect'")&&main.includes("FLOOR6_STETHOSCOPE_INSPECTED"),'the physical name clue must be searched and inspected on 6F');

assert(floor6.includes("type:'floor6_safe_return'")&&!floor6.includes("type:'floor6_chase'"),'M6 must retain safe return and remove the obsolete white-coat chase');
assert(router.includes("'phantom_6f': Phantom6F")&&routes.includes("phantom_6f_lift"),'M6 route registration missing');
assert(floor6.includes("title:'臨床技能中心'")&&floor6.includes('Floor6_MedicationCart')&&floor6.includes('Floor6_CrashCart')&&floor6.includes('Floor6_IV_Stand')&&floor6.includes('Floor6_VitalMonitor'),'M6 scene must read as a clinical skills center with medical teaching equipment');
assert(!floor6.includes("title:'異常檔案區'"),'M6 obsolete rear green board must be removed');
assert(main.includes("M6_FLOOR6_RESOLVED")&&!main.includes("interactable.type === 'floor6_chase'")&&!memorySource.includes('neverChaseFloor6'),'M6 safe resolution must remain without the obsolete chase override');

assert(b2.includes("type:'b2_archive_terminal'")&&b2.includes("type:'b2_exit_door'")&&!b2.includes('B2_EscapeStairwell'),'M7 B2 must use terminal plus one-way exit door, with no stairwell');
assert(html.includes('identity-matrix-modal')&&main.includes('IDENTITY_CANDIDATES')&&main.includes("candidate.id!=='ZHANG_SHOUHENG'"),'B2 must use the four-doctor contradiction matrix rather than auto-resolving identity');
assert(main.includes("B_PANEL_CLUE_KNOWN")&&main.includes("WANG_B_PANEL_KEY")&&!main.includes('她掉下來的舊十字鑰匙'),'B-Panel key provenance must resolve through the 1F guard post');
assert(main.includes("interactable.type === 'er_nurse_computer'")&&main.includes('這個電腦是護理師專用'),'ER nurse computers must redirect the physician');
assert(main.includes("gameState.setFlag('B2_IDENTITY_INCOMPLETE',true)")&&main.includes("interactable.type === 'b2_exit_door'")&&main.includes("B2_EXITED_PERMANENTLY"),'B2 unresolved identity may still fail forward through the permanent one-way exit');
assert(main.includes("先啟動 B2 封存終端")&&main.includes("B2_FIRE_RECAP_SEEN"),'B2 exit must remain locked until the fire-history recap has been viewed');
assert(main.includes("火災封存紀錄已播放。資料仍不完整：")&&main.includes("身分矩陣為選擇性比對；可直接離開 B2 返回 316"),'B2 evidence gaps may offer an optional post-recap identity comparison but must never block return to 316');
assert(main.includes("completeFinalIdentityAt316")&&main.includes("gameState.getFlag('B2_FIRE_RECAP_SEEN')"),'316 final authorization must unlock after the B2 fire recap even if B2 identity reconstruction was incomplete');
assert(router.includes("'b2_archive': B2Archive")&&routes.includes("b2_archive_entry")&&routes.includes("first_1f_guard_back")&&!routes.includes("b2_archive_lift"),'M7 B2 entry and 1F guard-back exit route registration missing');
assert(main.includes("M7_B2_RESOLVED")&&main.includes("02:17｜警衛台後方 B-Panel"),'M7 02:17/B2 logic missing');

assert(main.includes("M8_IDENTITY_BATTLE_ACTIVE")&&main.includes("LAST_CALL_SEEN"),'M8 identity battle/last call missing');
assert(main.includes("有人嘗試覆寫模板已在 316 登入｜請輸入真正員編末四碼｜最後一次機會"),'M9 overwrite warning must not reveal Li Chengli');
assert(!main.includes("李承禮 MED-820316 覆寫模板已在 316 登入"),'M9 must not explicitly identify the overwrite actor before the final declaration');
assert(html.includes('final-handoff-modal')&&main.includes("TRUE_NAME_CANON")&&main.includes("GAME_COMPLETE"),'M9 true-name final handoff missing');

const backing=new Map();
const storage={getItem:k=>backing.get(k)||null,setItem:(k,v)=>backing.set(k,v),removeItem:k=>backing.delete(k)};
const memory=new PersistentMemory(storage);
memory.setProof('space');memory.setProof('identity');memory.setProof('time');
assert(memory.hasAllProofs(),'M7 proof convergence must require all three proofs');
memory.setTrueNameFragment('frag_employeePrefix','MED-87');
memory.setTrueNameFragment('frag_surname','張');
memory.setTrueNameFragment('frag_givenName_1','守');
memory.setTrueNameFragment('frag_givenName_2','恆');
memory.setTrueNameFragment('frag_title','住院醫師');
assert.equal(memory.canReconstructTrueName(),false,'full MED-870409 is required to reconstruct identity');
memory.setTrueNameFragment('frag_employeeFull','MED-870409');
assert.equal(memory.canReconstructTrueName(),true);
assert.equal(memory.resolveTrueName(TRUE_NAME_CANON),true);
assert.equal(memory.data.trueName,'張守恆');
memory.completeGame();
assert.equal(memory.data.gameComplete,true);

for(const file of [
  readFileSync('./src/world/zones/FirstCampus8FBridgeEntry.js','utf8'),
  readFileSync('./src/world/zones/SecondCampus2F.js','utf8'),
  readFileSync('./src/world/zones/SecondCampus1F.js','utf8'),
  bridge,pond
]) assert(!file.includes('松德'),'Public zone contains forbidden legacy real-hospital name');

console.log('M3-M9 STORY ARCHITECTURE QA PASS');
