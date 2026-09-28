import assert from 'node:assert/strict';
import { IdentityManager } from './src/core/IdentityManager.js';
const manager=IdentityManager.createForTest('ZHANG');
assert.equal(manager.enterB2(),false);
while(manager.currentRouteStep!=='B2')assert.equal(manager.completeRouteStep(manager.currentRouteStep),true);
assert.equal(manager.enterB2(),true);assert.equal(manager.enterB2(),false);assert.equal(manager.canEnterB2(),false);
console.log('PASS B2 one-way state');
