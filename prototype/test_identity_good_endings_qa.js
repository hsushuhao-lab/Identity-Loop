import assert from 'node:assert/strict';
import { IdentityManager, IdentityEnum } from './src/core/IdentityManager.js';
import { GOOD_ENDINGS } from './src/story/IdentityLoopEndings.js';
const titles=[];
for(const identity of Object.values(IdentityEnum)){const manager=IdentityManager.createForTest(identity);while(manager.currentRouteStep!=='M9')assert.equal(manager.completeRouteStep(manager.currentRouteStep),true);assert.equal(manager.commitM9(identity).type,'GOOD_END');titles.push(GOOD_ENDINGS[identity].title);}
assert.equal(new Set(titles).size,4);
console.log('PASS four good endings');
