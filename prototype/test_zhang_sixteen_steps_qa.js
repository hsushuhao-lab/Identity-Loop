import assert from 'node:assert/strict';
import {IDENTITY_ROUTES,ROUTE_STEPS} from './src/story/IdentityRoutes.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';
import {IdentityManager,IDENTITY_STORAGE_KEY} from './src/core/IdentityManager.js';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
import {WORLD_SPAWNS} from './src/world/shared/WorldRoutes.js';
import {soundManager} from './src/audio/SoundManager.js';
import {persistentMemory} from './src/core/PersistentMemory.js';

assert.equal(IDENTITY_ROUTES.ZHANG.length,16,'Zhang route must contain exactly 16 actual steps');
const expected=['ZHANG_OPEN_4F','M2','M1','ZHANG_OUTBOUND_8F','M4','ZHANG_SECOND_CAMPUS_SECURITY','M5','M3','ZHANG_2F_PRESENCE_CHECK','ZHANG_4F_WITNESS_RETURN','ZHANG_3F_OBSERVATION_RECORD','M6','M7','B2','ZHANG_3F_ARCHIVE','M9'];
assert.deepEqual(IDENTITY_ROUTES.ZHANG,expected);
const extra=['ZHANG_2F_PRESENCE_CHECK','ZHANG_4F_WITNESS_RETURN','ZHANG_3F_OBSERVATION_RECORD'];
const old=['ZHANG_OPEN_4F','M2','M1','ZHANG_OUTBOUND_8F','M4','ZHANG_SECOND_CAMPUS_SECURITY','M5','M3','M6','M7','B2','ZHANG_3F_ARCHIVE','M9'];
assert.deepEqual(expected.filter(s=>!extra.includes(s)),old,'retain all original checkpoints in order');
const forbidden=/陳柏勳|李承禮|周啟文|張守恆|MED-|THE NAME|B-Panel|車次 094|身分已|員編/;
const storage=value=>({value,getItem(key){assert.equal(key,IDENTITY_STORAGE_KEY);return this.value;},setItem(_,value){this.value=value;}});
const bindings=[['ER_NURSE_COMPUTERS','ER_DOCTOR_CHARTING'],['408C_BED_PLAQUE','IDENTITY_4F_NURSE_STATION'],['DUTY_LOG','legacy_terminal_316']];
for(const [k,step] of extra.entries()){
 assert.equal(WORLD_SPAWNS[ROUTE_STEPS[step].spawn].zoneId,ROUTE_STEPS[step].zoneId);
 const beats=getIdentityRouteScene(step,'ZHANG');assert.equal(beats.length,2);
 assert.equal(beats.filter(b=>b.zhangCareReview).length,1);
 for(const [index,beat] of beats.entries()){
  const bind=IdentityRouteDirector.prototype.bindingFor.call({manager:{currentIdentity:'ZHANG'}},step,index);
  assert.equal(bind.id||bind.type,bindings[k][index]);
  assert(!bind.auto&&!bind.contextual&&!bind.passthrough,'new beats require bound physical E-key actions');
  assert.doesNotMatch(JSON.stringify({label:beat.label,review:beat.review,lines:beat.lines,choice:beat.zhangCareReview}),forbidden);
 }
 for(const id of ['LI','ZHOU','CHEN'])assert(!IDENTITY_ROUTES[id].includes(step));
}
// Latest route saves stay on the same checkpoint after every reload.
const store=storage(null);let manager=IdentityManager.createForTest('ZHANG',store);
for(const [index,step] of expected.entries()){
 manager=new IdentityManager(store);assert.equal(manager.currentRouteStep,step);assert.equal(manager.runSave.zhangRouteRevision,1);
 assert.deepEqual(manager.runSave.completedStoryModules,expected.slice(0,index));
 assert.equal(manager.completeRouteStep('NOT_THE_CURRENT_STEP'),false);
 if(step==='M9')assert.equal(manager.commitM9('ZHANG').type,'GOOD_END');else assert(manager.completeRouteStep(step));
}
assert.equal(new IdentityManager(store).currentRouteStep,null);
// Upgrade all thirteen old checkpoints by name, not by shifted index. No made-up completion.
for(const [index,step] of old.entries()){
 const state={version:2,metaSave:{completedGoodEnds:['LI'],identityBag:['ZHOU']},runSave:{currentIdentity:'ZHANG',currentRouteStep:index,currentMilestone:step,completedStoryModules:old.slice(0,index),runSeed:731,evidence:{actual:{id:'actual',visibleText:'保留的原始證據'}},b2Entered:index>old.indexOf('B2')}};
 const saved=storage(JSON.stringify(state));const m=new IdentityManager(saved);
 assert.equal(m.currentRouteStep,step);assert.equal(m.runSave.currentRouteStep,expected.indexOf(step));
 assert.deepEqual(m.runSave.completedStoryModules,state.runSave.completedStoryModules);
 assert.deepEqual(m.runSave.evidence,state.runSave.evidence);assert.equal(m.runSave.runSeed,731);
 assert.equal(m.runSave.b2Entered,index>old.indexOf('B2'));assert.deepEqual(m.metaSave.completedGoodEnds,['LI']);
 const persisted=saved.value;assert.equal(new IdentityManager(saved).currentRouteStep,step);assert.equal(saved.value,persisted);
}
for(const correct of [true,false]){
 const ended=storage(JSON.stringify({version:2,metaSave:{completedGoodEnds:correct?['ZHANG']:[]},runSave:{currentIdentity:'ZHANG',currentRouteStep:13,currentMilestone:'M9',completedStoryModules:old,runSeed:42,runEnded:true,m9CommittedChoice:correct?'ZHANG':'LI'}}));
 const m=new IdentityManager(ended);assert.equal(m.currentRouteStep,null);assert.equal(m.runSave.currentRouteStep,16);
 assert.equal(m.commitM9('ZHANG').reason,'ALREADY_COMMITTED');assert.deepEqual(m.runSave.completedStoryModules,old);
}
// Exercise the real choice branch: retry does not grant a flag, journal entry or completion.
const oldAudio=soundManager.ensureRunning;soundManager.ensureRunning=async()=>false;
const oldDocument=globalThis.document;globalThis.document={exitPointerLock(){}};
try{
 for(const step of extra){
  const beats=getIdentityRouteScene(step,'ZHANG');const index=beats.findIndex(b=>b.zhangCareReview);
  const beat=beats[index];let choice,completed=0;
  const before=JSON.stringify(persistentMemory.data.journalNotes);
  const d=Object.create(IdentityRouteDirector.prototype);
  Object.assign(d,{manager:{currentIdentity:'ZHANG',runSave:{runEnded:false}},step,beats,beatIndex:index,busy:false,controller:{enabled:true},gameState:{setFlag(){throw Error('choice must not grant unrelated flags');}},uiManager:{showDialogue(_,done){done();},openStoryChoice(c){choice=c;},closeStoryChoice(){}},renderObjective(){},completeBeat(){completed++;}});
  d.inspect();choice.onSecondary();choice.onSecondary();
  assert.equal(completed,0);assert.equal(JSON.stringify(persistentMemory.data.journalNotes),before);assert.equal(d.controller.enabled,true);
  d.inspect();choice.onPrimary();choice.onPrimary();assert.equal(completed,1);
  assert(persistentMemory.data.journalNotes.some(n=>n.id===beat.flag&&n.text===beat.zhangCareReview.note));
 }
}finally{globalThis.document=oldDocument;soundManager.ensureRunning=oldAudio;}
console.log('PASS Zhang 16: three two-object care/witness tasks; exact route and bindings; 16 reload checkpoints; 13 legacy migrations; two preserved endings; three retry/idempotence/privacy checks');

assert.equal(IDENTITY_ROUTES.CHEN.length,15);
assert.equal(IDENTITY_ROUTES.LI.length,17);
assert.equal(IDENTITY_ROUTES.ZHOU.length,16);
