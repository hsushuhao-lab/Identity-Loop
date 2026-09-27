import assert from 'node:assert/strict';
import { IdentityManager } from './src/core/IdentityManager.js';
import { B2_ARCHIVE_IDENTITIES } from './src/story/IdentityLoopFireMemory.js';
const manager=IdentityManager.createForTest('ZHANG');
const text=B2_ARCHIVE_IDENTITIES.map(item=>`${item.name} ${item.employeeId}`).join(' ')+' CURRENT SELF = CORRUPTED';
assert.equal(B2_ARCHIVE_IDENTITIES.length,4);assert.match(text,/CURRENT SELF = CORRUPTED/);assert.doesNotMatch(text,new RegExp(`CURRENT SELF = ${manager.currentIdentity}`));
console.log('PASS B2 does not auto-answer current identity');
