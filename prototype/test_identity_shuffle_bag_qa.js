import assert from 'node:assert/strict';
import { IdentityManager, IdentityEnum } from './src/core/IdentityManager.js';
const store={value:null,getItem(){return this.value;},setItem(_,value){this.value=value;},removeItem(){this.value=null;}};
const manager=new IdentityManager(store,()=>.1);
const seen=[];
for(let i=0;i<4;i++){manager.startNewRun();const identity=manager.currentIdentity;while(manager.currentRouteStep!=='M9')assert.equal(manager.completeRouteStep(manager.currentRouteStep),true);assert.equal(manager.commitM9(identity).type,'GOOD_END');seen.push(identity);}
assert.deepEqual(new Set(seen),new Set(Object.values(IdentityEnum)));
assert.equal(manager.metaSave.m10Unlocked,true);
const stale=new IdentityManager();
stale.metaSave.completedGoodEnds=['ZHANG'];stale.metaSave.identityBag=['ZHANG','LI','ZHOU','CHEN'];
assert.equal(stale.drawIdentity(),'LI');
assert.equal(stale.drawIdentity(),'ZHOU');
assert.equal(stale.drawIdentity(),'CHEN');
const bag=new IdentityManager(undefined,()=>.1);
const draws=Array.from({length:4},()=>bag.drawIdentity());
assert.equal(new Set(draws).size,4);
assert.notDeepEqual(draws,Object.values(IdentityEnum));
console.log('PASS shuffle bag completes all four identities');
