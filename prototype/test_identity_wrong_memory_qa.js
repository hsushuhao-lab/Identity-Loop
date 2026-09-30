import assert from 'node:assert/strict';
import { IdentityManager } from './src/core/IdentityManager.js';
const manager=IdentityManager.createForTest('CHEN');while(manager.currentRouteStep!=='M9')assert.equal(manager.completeRouteStep(manager.currentRouteStep),true);const result=manager.commitM9('ZHOU','ZHOU');
assert.equal(result.type,'WRONG_MEMORY_BAD_END');assert.deepEqual(manager.metaSave.completedGoodEnds,[]);
console.log('PASS wrong-memory bad end does not complete identity');
