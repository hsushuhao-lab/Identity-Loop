import assert from 'node:assert/strict';
import { IdentityManager } from './src/core/IdentityManager.js';
import { GameState } from './src/core/GameState.js';
import { getIdentityRouteScene } from './src/story/IdentityRouteScenes.js';
import { captureM1Checkpoint, restoreM1Checkpoint, firstPendingM1Beat, validateM1Checkpoint } from './src/core/M1HandoffCheckpoint.js';
const storage = () => ({ value: null, getItem(){return this.value;}, setItem(_, value){this.value=value;} });
for (const identity of ['LI','ZHANG','ZHOU','CHEN']) {
  const store=storage(); let manager=IdentityManager.createForTest(identity,store);
  while(manager.currentRouteStep!=='M1') manager.completeRouteStep(manager.currentRouteStep);
  const original=manager.snapshot(), seed=manager.runSave.runSeed, count=getIdentityRouteScene('M1',identity,seed).length;
  const state=new GameState();
  assert.equal(restoreM1Checkpoint(state,manager.runSave.m1HandoffCheckpoint,manager.runSave),false);
  assert.equal(state.areRequiredTasksComplete(),false);
  state.setFlag('FOUND_316_SPARE_KEY',true); state.setFlag('OPENED_316',true);
  manager.recordEvidence({id:'route:M1:0',milestone:'M1',category:'route',visibleText:'Reviewed entry'});
  const transactions=[()=>state.markTaskComplete('DUTY_LOG'),()=>state.setFlag('HIS_CREDENTIALS',true),
    ()=>state.markTaskComplete('E_HANDOFF'),()=>state.setFlag('LOCKER_OPENED',true),()=>state.markTaskComplete('KEY_PICKUP')];
  for(let index=0;index<transactions.length;index++) {
    transactions[index](); assert.equal(manager.saveM1HandoffCheckpoint(captureM1Checkpoint(state,manager.runSave)),true);
    manager=new IdentityManager(store,()=>.8); const fresh=new GameState();
    assert.equal(restoreM1Checkpoint(fresh,manager.runSave.m1HandoffCheckpoint,manager.runSave),true);
    assert.equal(firstPendingM1Beat(fresh,manager.runSave,count),index+1,'unconsumed transaction must still produce its journal entry');
    assert.equal(manager.currentRouteStep,'M1');assert.equal(manager.currentIdentity,identity);assert.equal(manager.runSave.runSeed,seed);
    assert.equal(fresh.getFlag('STAFF_ACCESS_CARD'),index===4);
    assert.deepEqual(manager.runSave.completedStoryModules,original.runSave.completedStoryModules);
    assert.equal(manager.runSave.b2Entered,false); assert.equal(manager.runSave.m9CommittedChoice,null);
    assert.equal(manager.saveM1HandoffCheckpoint(captureM1Checkpoint(state,manager.runSave)),false,'duplicate must not write');
    manager.recordEvidence({id:`route:M1:${index+1}`,milestone:'M1',category:'route',visibleText:'Completed transaction'});
  }
  assert.equal(firstPendingM1Beat(state,manager.runSave,count),Math.min(6,count-1));
  const saved=manager.runSave.m1HandoffCheckpoint;
  for(const bad of [{...saved,runSeed:seed+1},{...saved,identity:'WRONG'},{...saved,version:2},
    {...saved,flags:{}},{...saved,flags:{LOCKER_OPENED:true},tasks:['E_HANDOFF']}]) assert.equal(validateM1Checkpoint(bad,manager.runSave),null);
  manager.completeRouteStep('M1'); assert.equal(manager.runSave.m1HandoffCheckpoint,null);
  assert.equal(manager.saveM1HandoffCheckpoint(saved),false);
  manager.startNewRun({forceIdentity:identity,restart:true});assert.equal(manager.runSave.m1HandoffCheckpoint,null);
  assert.deepEqual(manager.runSave.evidence,{});assert.equal(manager.runSave.b2Entered,false);
}
console.log('PASS M1 transaction persistence, four Seed recovery, old save, stale data, chapter and new-run isolation');
