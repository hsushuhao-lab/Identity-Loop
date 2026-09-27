import assert from 'node:assert/strict';
import { IdentityManager, IdentityEnum } from './src/core/IdentityManager.js';
for(const identity of Object.values(IdentityEnum)){const manager=IdentityManager.createForTest(identity);manager.advanceMilestone('M9');assert.equal(manager.commitM9(identity).type,'GOOD_END');}
console.log('PASS four good endings');
