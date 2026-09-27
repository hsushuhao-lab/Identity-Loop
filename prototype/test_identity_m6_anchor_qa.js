import assert from 'node:assert/strict';
import { IdentityEnum } from './src/core/IdentityManager.js';
import { getIdentityDialogue } from './src/story/IdentityLoopDialogue.js';
const text=Object.values(IdentityEnum).map(identity=>getIdentityDialogue('M6',identity).identityBeat.text).join(' ');
for(const token of ['咖啡','錶','相機','證件'])assert.match(text,new RegExp(token));
console.log('PASS M6 identity anchors');
