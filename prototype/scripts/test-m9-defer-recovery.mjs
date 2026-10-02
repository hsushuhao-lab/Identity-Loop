import test from 'node:test';
import assert from 'node:assert/strict';
import { IdentityLoopPanel, resumeM9WorldInput } from '../src/ui/IdentityLoopPanel.js';
import { IdentityManager } from '../src/core/IdentityManager.js';

function fixture(identity='ZHOU') {
  const manager=IdentityManager.createForTest(identity);
  while(manager.currentRouteStep!=='M9')manager.completeRouteStep(manager.currentRouteStep);
  const classes=new Set(['visible','m9-open']);
  let clears=0;
  const root={classList:{contains:name=>classes.has(name),remove:(...names)=>names.forEach(name=>classes.delete(name))},
    querySelector:()=>({replaceChildren(){clears++;}})};
  const panel=Object.create(IdentityLoopPanel.prototype);
  Object.assign(panel,{manager,root,onCommit:()=>{throw Error('Deferral must never commit');}});
  return {manager,panel,classes,get clears(){return clears;}};
}

test('deferring restores world input after closing the panel without spending the single submission',()=>{
  const f=fixture(),saved=f.manager.snapshot(),controller={enabled:false};
  f.panel.onDefer=()=>{assert.equal(f.classes.has('m9-open'),false);resumeM9WorldInput(controller,f.manager,{dialogueSequence:null});};
  assert.equal(f.panel.deferM9(),true);
  assert.equal(controller.enabled,true);
  assert.equal(f.clears,1);
  assert.equal(f.panel.onCommit,null);
  assert.deepEqual(f.manager.snapshot(),saved);
  assert.equal(f.manager.commitM9('ZHOU','ZHOU').type,'GOOD_END');
  assert.equal(f.manager.commitM9('ZHOU','ZHOU').reason,'ALREADY_COMMITTED');
});

test('recovery keeps input blocked for a live dialogue or an ended run',()=>{
  const f=fixture(),controller={enabled:false},ui={dialogueSequence:{active:true}};
  assert.equal(resumeM9WorldInput(controller,f.manager,ui),false);
  ui.dialogueSequence=null;
  assert.equal(resumeM9WorldInput(controller,f.manager,ui),true);
  f.manager.commitM9('ZHOU','LI');
  assert.equal(resumeM9WorldInput(controller,f.manager,ui),false);
});

test('duplicate or stale deferral events cannot resume an ended run',()=>{
  const f=fixture();let resumes=0;
  f.panel.onDefer=()=>resumes++;
  assert.equal(f.panel.deferM9(),true);
  assert.equal(f.panel.deferM9(),false);
  assert.equal(resumes,1);
  f.classes.add('m9-open');f.manager.commitM9('ZHOU','LI');
  assert.equal(f.panel.deferM9(),false);
  assert.equal(resumes,1);
});

test('each identity can leave for evidence and still submit its original pair once',()=>{
  for(const identity of ['LI','ZHANG','ZHOU','CHEN']){
    const f=fixture(identity),saved=f.manager.snapshot();
    assert.equal(f.panel.deferM9(),true);
    assert.deepEqual(f.manager.snapshot(),saved);
    assert.equal(f.manager.commitM9(identity,identity).type,'GOOD_END');
    assert.equal(f.manager.commitM9(identity,identity).reason,'ALREADY_COMMITTED');
  }
});
