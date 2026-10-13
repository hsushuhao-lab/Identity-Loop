import test from 'node:test';
import assert from 'node:assert/strict';
import {TouchControls} from '../src/player/TouchControls.js';
function fixture(run){
  const keys=['document','window','matchMedia','MutationObserver','setInterval','clearInterval','performance','innerWidth'];
  const saved=Object.fromEntries(keys.map(k=>[k,globalThis[k]]));let now=0,blocked=false,dialogue=false;
  const element=()=>({listeners:new Map(),addEventListener(t,f){this.listeners.set(t,f);},removeEventListener(){},setPointerCapture(){},classList:{toggle(){}},remove(){}});
  const canvas=element(),move=element(),children=new Map([['#touch-move',move]]),root=element();root.querySelector=id=>{if(!children.has(id))children.set(id,element());return children.get(id);};
  const doc=element();doc.body={append(){},classList:{toggle(){}}};doc.createElement=()=>root;
  Object.assign(globalThis,{document:doc,window:element(),matchMedia:()=>({matches:true}),MutationObserver:class{observe(){}disconnect(){}},setInterval:()=>1,clearInterval(){},performance:{now:()=>now},innerWidth:390});
  const calls=[],looks=[];let cancels=0;
  const c={enabled:true,domElement:canvas,touchMove:{x:0,z:0},resetInput(){this.cancelAutoMove();},cancelAutoMove(){this.autoMoveTarget=null;cancels++;},handleTap:e=>{calls.push([e.clientX,e.clientY]);return true;},lookBy:(...args)=>looks.push(args)};
  const controls=new TouchControls(c,{blocked:()=>blocked,hasDialogue:()=>dialogue,inspect(){},journal(){},continueDialogue(){}});
  const emit=(target,type,x=280,y=420,id=1)=>target.listeners.get(type)?.({target,pointerType:'touch',pointerId:id,clientX:x,clientY:y,preventDefault(){}});
  try{run({c,controls,canvas,move,children,doc,emit,calls,looks,get cancels(){return cancels;},time:t=>now=t,block:v=>blocked=v,dialogue:v=>dialogue=v});}
  finally{controls.dispose();for(const [k,v]of Object.entries(saved)){if(v===undefined)delete globalThis[k];else globalThis[k]=v;}}
}
test('short canvas taps navigate exactly once; repeated tap may replace the goal',()=>fixture(f=>{f.emit(f.canvas,'pointerdown');f.emit(f.canvas,'pointerup');f.emit(f.canvas,'lostpointercapture');f.emit(f.canvas,'pointerup');assert.equal(f.calls.length,1);f.emit(f.canvas,'pointerdown',300);f.emit(f.canvas,'pointerup',300);assert.deepEqual(f.calls,[[280,420],[300,420]]);}));
test('look drag and left drag retain manual controls and never become taps',()=>fixture(f=>{f.emit(f.canvas,'pointerdown');f.emit(f.canvas,'pointermove',310,420);f.emit(f.canvas,'pointerup',310,420);assert.equal(f.looks.length,1);assert.equal(f.calls.length,0);f.emit(f.canvas,'pointerdown',50,420);f.emit(f.canvas,'pointermove',80,400);assert(f.c.touchMove.x>0);f.emit(f.canvas,'pointerup',80,400);assert.deepEqual(f.c.touchMove,{x:0,z:0});assert.equal(f.calls.length,0);}));
test('multitouch, cancellation and long stationary presses cannot navigate',()=>fixture(f=>{f.emit(f.canvas,'pointerdown',50,420,1);f.emit(f.canvas,'pointerdown',300,420,2);f.emit(f.canvas,'pointerup',50,420,1);f.emit(f.canvas,'pointerup',300,420,2);assert.equal(f.calls.length,0);f.emit(f.canvas,'pointerdown');f.emit(f.canvas,'pointercancel');f.emit(f.canvas,'pointerup');assert.equal(f.calls.length,0);f.emit(f.canvas,'pointerdown');f.time(500);f.emit(f.canvas,'pointerup');assert.equal(f.calls.length,0);}));
test('UI, modal and dialogue input stop goals and do not leak into the canvas',()=>fixture(f=>{f.c.autoMoveTarget={};f.doc.listeners.get('pointerdown')({target:f.children.get('#touch-objective')});assert.equal(f.c.autoMoveTarget,null);f.emit(f.canvas,'pointerdown');f.block(true);f.emit(f.canvas,'pointerup');assert.equal(f.calls.length,0);f.block(false);f.emit(f.canvas,'pointerdown');f.dialogue(true);f.emit(f.canvas,'pointerup');assert.equal(f.calls.length,0);}));
