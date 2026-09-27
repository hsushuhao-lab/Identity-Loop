import assert from 'node:assert/strict';
import { IdentityEnum } from './src/core/IdentityManager.js';
import { getIdentityDialogue } from './src/story/IdentityLoopDialogue.js';
const forbidden=['張守恆','李承禮','周啟文','陳柏勳','我是張','我是李','我是周','我是陳','那是我','這是我的','親手做'];
for(const scene of ['M1','M2','M3','M4','M5','M6','M7','M8'])for(const identity of Object.values(IdentityEnum)){const text=JSON.stringify(getIdentityDialogue(scene,identity));for(const token of forbidden)assert.equal(text.includes(token),false,`${scene}/${identity} leaks ${token}`);}
console.log('PASS M1-M8 identity leak gate');
