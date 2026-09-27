import assert from 'node:assert/strict';
import { IdentityManager } from './src/core/IdentityManager.js';
const manager=IdentityManager.createForTest('LI');manager.advanceMilestone('M9');
assert.equal(manager.commitM9('LI').type,'GOOD_END');assert.deepEqual(manager.commitM9('ZHANG'),{ok:false,reason:'ALREADY_COMMITTED'});
console.log('PASS M9 single irreversible commit');
