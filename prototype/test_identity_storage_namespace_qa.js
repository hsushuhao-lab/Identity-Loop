import assert from 'node:assert/strict';
import { IDENTITY_STORAGE_KEY, IdentityManager } from './src/core/IdentityManager.js';
const store={value:null,getItem(){return this.value;},setItem(_,value){this.value=value;},removeItem(){this.value=null;}};
new IdentityManager(store).startNewRun({forceIdentity:'ZHANG'});
assert.equal(IDENTITY_STORAGE_KEY,'IdentyLoop_IdentityState_v1');assert.doesNotMatch(store.value,/DutyNight_PersistentData/);
console.log('PASS independent localStorage namespace');
