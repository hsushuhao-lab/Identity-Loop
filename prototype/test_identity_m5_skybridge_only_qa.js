import assert from 'node:assert/strict';
import { getSharedDialogue } from './src/story/IdentityLoopDialogue.js';
const text=JSON.stringify(getSharedDialogue('M5'));
assert.match(text,/SKYBRIDGE ONLY/);
assert.doesNotMatch(text,/pond|生態池|池塘/i);
console.log('PASS M5 skybridge-only contract');
