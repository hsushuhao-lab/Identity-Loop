import assert from 'node:assert/strict';
import { getSharedDialogue } from './src/story/IdentityLoopDialogue.js';
const text=JSON.stringify(getSharedDialogue('M7'));
assert.match(text,/1→3→4/);assert.match(text,/紫色備援/);
console.log('PASS B-panel historical sequence');
