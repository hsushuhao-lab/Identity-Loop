import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchControls} from '../src/player/TouchControls.js';
function fixture(run){
 const keys=['document','window','matchMedia','MutationObserver','setInterval','clearInterval','setTimeout','clearTimeout'];
 const saved=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));
 const timers=new Map();let seq=0,blocked=false,inspections=0;
 const element=()=>({listeners:new Map(),addEventListener(t,f){this.listeners.set(t,f);},setPointerCapture(){},classList:{toggle(){}},remove(){}});
 const children=new Map(),root=element();root.querySelector=id=>{if(!children.has(id))children.set(id,element());return children.get(id);};
 const doc=element();doc.body={classList:{toggle(){}},append(){}};doc.createElement=()=>root;doc.removeEventListener=(t)=>doc.listeners.delete(t);
 Object.assign(globalThis,{document:doc,window:element(),matchMedia:()=>({matches:true}),MutationObserver:class{observe(){}disconnect(){}},setInterval:()=>1,clearInterval(){},setTimeout:(f,ms)=>{timers.set(++seq,{f,ms});return seq;},clearTimeout:id=>timers.delete(id)});
 const target={id:'document'},calls=[];
 const c={enabled:true,currentInteractable:target,domElement:element(),touchMove:{x:0,z:0},resetInput(){},onInteract:o=>calls.push(o)};
 const controls=new TouchControls(c,{blocked:()=>blocked,inspect:()=>inspections++,journal(){},continueDialogue(){},hasDialogue:()=>false});
 const button=children.get('#touch-interact');
 const event=(target=button)=>({target,pointerId:7,preventDefault(){this.prevented=true;},stopPropagation(){},stopImmediatePropagation(){this.stopped=true;}});
 const emit=(t,e=event())=>{if(t==='pointerdown')doc.listeners.get(t)?.(e);button.listeners.get(t)?.(e);return e;};
 const flush=ms=>{for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.f();}};
 try{run({c,controls,doc,button,event,emit,flush,calls,target,setBlocked:v=>blocked=v,get inspections(){return inspections;}});}finally{controls.dispose();for(const [k,v]of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
}
test('normal touch click interacts exactly once',()=>fixture(f=>{f.emit('pointerdown');f.emit('pointerup');f.emit('lostpointercapture');f.emit('click');f.flush(60);assert.deepEqual(f.calls,[f.target]);}));
test('missing click recovers short press and preserves its released target',()=>fixture(f=>{f.emit('pointerdown');f.emit('pointerup');f.emit('lostpointercapture');f.c.currentInteractable={id:'other'};f.flush(60);assert.deepEqual(f.calls,[f.target]);f.emit('click');assert.equal(f.calls.length,1);}));
test('late click cannot select an answer, but new physical gesture may reuse pointer id',()=>fixture(f=>{f.emit('pointerdown');f.emit('pointerup');f.flush(60);f.controls.reset();const late=f.event({id:'answer'});f.doc.listeners.get('click')(late);assert.equal(late.stopped,true);f.doc.listeners.get('pointerdown')(f.event({id:'answer'}));const next=f.event({id:'answer'});f.doc.listeners.get('click')(next);assert.equal(next.stopped,undefined);}));
test('cancelled press never interacts',()=>fixture(f=>{f.emit('pointerdown');f.emit('pointerup');f.emit('pointercancel');f.flush(60);f.emit('click');assert.equal(f.calls.length,0);}));
test('long hold only inspects',()=>fixture(f=>{f.emit('pointerdown');f.flush(550);f.emit('pointerup');f.flush(60);f.emit('click');assert.equal(f.inspections,1);assert.equal(f.calls.length,0);}));
test('new modal or disabled controller prevents pending recovery',()=>fixture(f=>{f.emit('pointerdown');f.emit('pointerup');f.setBlocked(true);f.flush(60);assert.equal(f.calls.length,0);f.setBlocked(false);f.emit('pointerdown');f.emit('pointerup');f.c.enabled=false;f.flush(60);assert.equal(f.calls.length,0);}));
test('reset cancels a pending recovery before scene changes',()=>fixture(f=>{f.emit('pointerdown');f.emit('pointerup');f.controls.reset();f.flush(60);assert.equal(f.calls.length,0);}));
