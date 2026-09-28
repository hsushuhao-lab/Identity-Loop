import assert from 'node:assert/strict';
import {SoundManager} from './src/audio/SoundManager.js';

class Param{constructor(){this.value=0;this.events=[];}setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);}linearRampToValueAtTime(v,t){this.value=v;this.events.push(['ramp',v,t]);}cancelScheduledValues(t){this.events.push(['cancel',t]);}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();this.detune=new Param();this.Q=new Param();this.connections=[];this.type='sine';}connect(node){this.connections.push(node);}start(t){this.started=t;}stop(t){this.stopped=t;}}
class Context{constructor(){this.state='running';this.currentTime=1;this.destination={};this.nodes=[];}node(){const n=new Node();this.nodes.push(n);return n;}createGain(){return this.node();}createBiquadFilter(){return this.node();}createOscillator(){return this.node();}}

const audio=new SoundManager();audio.ctx=new Context();
const signatures=[];
for(const identity of ['ZHANG','LI','ZHOU','CHEN']){
  audio.setRouteTheme(identity,'M1');
  assert.equal(audio.routeTheme.identity,identity);
  assert(audio.routeTheme.gain.gain.value>0);
  signatures.push(`${audio.routeTheme.oscillators[0].type}:${audio.routeTheme.oscillators.map(o=>o.frequency.value).join(',')}`);
}
assert.equal(new Set(signatures).size,4,'each identity has a distinct synthesized music signature');
const nodeCount=audio.ctx.nodes.length;audio.setRouteTheme('CHEN','M1');assert.equal(audio.ctx.nodes.length,nodeCount,'repeated unlock/step notifications do not rebuild the same theme');
audio.setRouteTheme('CHEN','M9');assert.equal(audio.routeTheme,null,'M9 fades the route theme out');
const noAsset=new SoundManager();noAsset.setRouteTheme('ZHANG','M1');assert.equal(noAsset.ctx,null,'route audio does not require an external music asset or construct a parallel context');
console.log('PASS four identity music fallbacks: WebAudio-only, distinct, idempotent, and silent at M9');
