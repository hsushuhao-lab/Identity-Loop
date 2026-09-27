import assert from 'node:assert/strict';
import { IdentityManager } from './src/core/IdentityManager.js';
const store={value:null,getItem(){return this.value;},setItem(_,value){this.value=value;},removeItem(){this.value=null;}};
const first=IdentityManager.createForTest('ZHANG',store);
const second=new IdentityManager(store);
assert.equal(first.currentIdentity,'ZHANG');
assert.equal(second.currentIdentity,'ZHANG');
console.log('PASS identity seed persists through reload');
