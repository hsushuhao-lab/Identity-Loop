import assert from 'node:assert/strict';
import { IdentityManager, IdentityEnum } from './src/core/IdentityManager.js';
const store={value:null,getItem(){return this.value;},setItem(_,value){this.value=value;},removeItem(){this.value=null;}};
const manager=new IdentityManager(store,()=>.1);
const seen=[];
for(const identity of Object.values(IdentityEnum)){manager.startNewRun({forceIdentity:identity});manager.advanceMilestone('M9');assert.equal(manager.commitM9(identity).type,'GOOD_END');seen.push(identity);}
assert.deepEqual(new Set(seen),new Set(Object.values(IdentityEnum)));
assert.equal(manager.metaSave.m10Unlocked,true);
console.log('PASS shuffle bag completes all four identities');
