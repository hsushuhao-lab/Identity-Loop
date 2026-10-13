import test from 'node:test';
import assert from 'node:assert/strict';
import {FullscreenToggle} from '../src/player/FullscreenToggle.js';

function fixture(){
  const handlers=new Map(),button={setAttribute(k,v){this[k]=v;}},status={hidden:true};let changes=0;
  const doc={documentElement:{},addEventListener(t,f){handlers.set(t,f);},removeEventListener(t){handlers.delete(t);}};
  const control=new FullscreenToggle(button,status,{document:doc,onChange:()=>changes++});
  return{control,doc,button,status,handlers,get changes(){return changes;}};
}
test('native state determines enter/exit label, including external fullscreenchange',async()=>{
  const f=fixture();try{
    f.doc.documentElement.requestFullscreen=async()=>{f.doc.fullscreenElement=f.doc.documentElement;f.handlers.get('fullscreenchange')();};
    f.doc.exitFullscreen=async()=>{f.doc.fullscreenElement=null;f.handlers.get('fullscreenchange')();};
    await f.control.toggle();assert.equal(f.button['aria-pressed'],'true');assert.equal(f.button.textContent,'退出全螢幕');
    await f.control.toggle();assert.equal(f.button['aria-pressed'],'false');
    f.doc.fullscreenElement={};f.handlers.get('fullscreenchange')();assert.equal(f.button['aria-pressed'],'true');
    f.doc.fullscreenElement=null;f.handlers.get('fullscreenchange')();assert.equal(f.button.textContent,'全螢幕');
  }finally{f.control.dispose();}
});
test('unsupported and rejected requests give truthful feedback without entering',async()=>{
  const f=fixture();try{await f.control.toggle();assert.match(f.status.textContent,/不支援/);assert.equal(f.button['aria-pressed'],'false');f.doc.documentElement.requestFullscreen=async()=>{throw Error('denied');};await f.control.toggle();assert.match(f.status.textContent,/無法啟用/);assert.equal(f.button['aria-pressed'],'false');assert.equal(f.button.disabled,false);}finally{f.control.dispose();}
});
test('pending repeated clicks make one request, and resolved promises do not fake fullscreen',async()=>{
  const f=fixture();try{let calls=0,resolve;f.doc.documentElement.requestFullscreen=()=>{calls++;return new Promise(r=>resolve=r);};const pending=f.control.toggle();assert.equal(calls,1);assert.equal(f.button.disabled,true);await f.control.toggle();assert.equal(calls,1);resolve();await pending;assert.equal(f.button['aria-pressed'],'false');assert.match(f.status.textContent,/尚未切換/);}finally{f.control.dispose();}
});
test('failed exit retains active state and listeners are removed on disposal',async()=>{
  const f=fixture();f.doc.fullscreenElement={};f.doc.exitFullscreen=async()=>{throw Error('denied');};await f.control.toggle();assert.equal(f.button['aria-pressed'],'true');assert.match(f.status.textContent,/無法退出/);f.control.dispose();assert.equal(f.handlers.size,0);assert.equal(f.button.onclick,null);
});
