import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getIdentityRouteScene } from './src/story/IdentityRouteScenes.js';
import { IDENTITY_M6_MEMORIES, playIdentityM6Memory } from './src/story/IdentityM6Memories.js';
import { drawIdentityM6Memory } from './src/art/IdentityM6MemoryArt.js';

for (const id of ['LI','ZHOU']) {
  assert.equal(getIdentityRouteScene('M6',id)[1].identityM6Cg,true,`${id} M6 must bind the dedicated CG`);
}
for (const id of ['ZHANG','CHEN']) {
  assert.notEqual(getIdentityRouteScene('M6',id).some(beat=>beat.identityM6Cg),true,`${id} keeps its original CG`);
}
const directorSource=readFileSync('./src/story/IdentityRouteDirector.js','utf8');
const uiSource=readFileSync('./src/ui/UIManager.js','utf8');
assert.match(directorSource,/if\(beat\.identityM6Cg\)\{\s*playIdentityM6Memory\(this,soundManager\);\s*return;/);
assert.match(uiSource,/drawIdentityM6Memory\(ctx,sequence,frame,w,h,elapsedMs\)/);
const forbidden=/張守恆|李承禮|周啟文|陳柏勳|守恆|[張李周陳]醫師|MED-|THE ORDER|THE WARNING|ZHANG|ZHOU|CHEN/;
const visuals=[];
for(const [identity,sequence] of Object.entries(IDENTITY_M6_MEMORIES)){
  assert.equal(sequence.frames.length,6);
  assert.ok(Object.isFrozen(sequence.frames));
  assert.equal(new Set(sequence.frames.map(frame=>frame.m6Shot)).size,6);
  assert.doesNotMatch([sequence.title,sequence.source,...sequence.frames.flatMap(({stamp,title,caption,narration})=>[stamp,title,caption,narration])].join('\n'),forbidden);
  for(const frame of sequence.frames){
    const draw=elapsed=>{
      const calls=[];
      const ctx=new Proxy({}, {get(target,key){return target[key]??((...args)=>calls.push([key,...args]));},set(target,key,value){target[key]=value;return true;}});
      assert.equal(drawIdentityM6Memory(ctx,sequence,frame,1280,720,elapsed),true);
      assert.equal(calls.filter(c=>c[0]==='save').length,calls.filter(c=>c[0]==='restore').length);
      return JSON.stringify(calls);
    };
    assert.notEqual(draw(400),draw(2300),`${identity}/${frame.m6Shot} must animate`);
    assert.doesNotMatch(draw(1800),forbidden,`${identity}/${frame.m6Shot}: canvas identity/ending spoiler`);
    visuals.push(draw(1800));
  }
}
assert.equal(new Set(visuals).size,12,'twelve visually distinct shots');
assert.equal(drawIdentityM6Memory(null,{id:'CHEN_6F_PROCEDURAL_REPLAY'},null,1280,720),false);
assert.equal(drawIdentityM6Memory(null,{id:'ZHANG_6F_ACCIDENT_MEMORY'},null,1280,720),false);

const originalRAF=globalThis.requestAnimationFrame,originalCancel=globalThis.cancelAnimationFrame;
try{
  for(const identity of ['LI','ZHOU']) for(const audible of [true,false]){
    const pending=new Map();let nextId=0,callback,completions=0;
    globalThis.requestAnimationFrame=fn=>{pending.set(++nextId,fn);return nextId;};
    globalThis.cancelAnimationFrame=id=>pending.delete(id);
    const flags=[],sounds=[],renders=[];
    const audio=new Proxy({ensureRunning:async()=>audible},{get(target,key){return target[key]??(()=>sounds.push(key));}});
    const ui={memorySequence:null,memoryFrameIndex:0,renderMemoryFrame:elapsed=>renders.push(elapsed)};
    const director={manager:{currentIdentity:identity},step:'M6',controller:{enabled:true},uiManager:ui,
      gameState:{setFlag:(...args)=>flags.push(args)},
      playAutoMemorySequence(sequence,done,timing){ui.memorySequence=sequence;callback=done;assert.deepEqual(timing,{interval:4500,hold:500});},
      completeBeat(){completions++;this.controller.enabled=true;}
    };
    assert.equal(playIdentityM6Memory(director,audio),true);
    assert.equal(director.controller.enabled,false);
    assert.deepEqual(flags,[],'do not grant completion before the film closes');
    const tick=async time=>{const [key,fn]=pending.entries().next().value;pending.delete(key);fn(time);await Promise.resolve();};
    await tick(1000);await tick(1250);
    assert.deepEqual(renders,[0,250]);
    assert.equal(sounds.length,audible?1:0,'one cue per frame, not one cue per animation tick');
    ui.memoryFrameIndex=1;await tick(5600);assert.equal(renders.at(-1),0);
    assert.equal(sounds.length,audible?2:0);
    ui.memorySequence=null;callback();callback();
    assert.equal(completions,1,'manual close and final hold must not double-advance');
    assert.equal(director.controller.enabled,true);
    assert.equal(pending.size,0,'closing must release the animation frame');
    assert.deepEqual(flags,[[`${identity}_M6_MEMORY_SEEN`,true]],'do not mutate M7/B2/identity/ending flags');
  }
  for(const identity of ['ZHANG','CHEN'])assert.equal(playIdentityM6Memory({manager:{currentIdentity:identity},step:'M6'},null),false);
  assert.equal(playIdentityM6Memory({manager:{currentIdentity:'LI'},step:'M7'},null),false);
}finally{
  globalThis.requestAnimationFrame=originalRAF;globalThis.cancelAnimationFrame=originalCancel;
}
console.log('PASS Li/Zhou M6 CG: route-specific trigger, 12 animated shots, no name/ID leak, silent fallback, one completion, animation cleanup, legacy CG unchanged');
