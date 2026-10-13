import assert from 'node:assert/strict';
import {withLoadDeadline,OPENING_LOAD_TIMEOUT_MS} from '../src/art/LoadDeadline.js';
const originalSet=setTimeout,originalClear=clearTimeout;
let now=0,nextId=0;const timers=new Map();
globalThis.setTimeout=(fn,ms)=>{const id=++nextId;timers.set(id,{fn,at:now+ms});return id;};
globalThis.clearTimeout=id=>timers.delete(id);
async function advance(ms){now+=ms;for(const [id,timer] of timers)if(timer.at<=now){timers.delete(id);timer.fn();}await Promise.resolve();await Promise.resolve();}
try{
  let completed=false;
  const cold=withLoadDeadline(()=>new Promise(resolve=>setTimeout(()=>resolve('ready'),30000)),OPENING_LOAD_TIMEOUT_MS).then(value=>{completed=true;return value;});
  await Promise.resolve();await advance(20000);assert.equal(completed,false,'a pending cold load is never readiness');
  await advance(10000);assert.equal(await cold,'ready','a 30-second valid cold load succeeds');assert.equal(timers.size,0);
  const failed=withLoadDeadline(()=>new Promise(()=>{}),OPENING_LOAD_TIMEOUT_MS);
  const rejection=assert.rejects(failed,/必要資料載入逾時/);await advance(60000);await rejection;assert.equal(timers.size,0);
  const move=withLoadDeadline(()=>new Promise(()=>{}));
  const moveRejection=assert.rejects(move,/必要資料載入逾時/);await advance(20000);await moveRejection;
  assert.equal(timers.size,0);console.log('PASS cold opening accepts 30s, fails at 60s, and in-game moves retain 20s deadline');
}finally{globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
