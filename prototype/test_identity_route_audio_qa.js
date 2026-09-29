import assert from 'node:assert/strict';
import {SoundManager} from './src/audio/SoundManager.js';
import {scorePhrase,scoreMood} from './src/audio/HospitalScore.js';
class Param{constructor(){this.value=0;}setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{constructor(){for(const k of ['gain','frequency','detune','Q','pan','threshold','knee','ratio','attack','release'])this[k]=new Param();}connect(){}disconnect(){this.disconnected=true;}start(t){this.started=t;}stop(t){this.stopped=t;}}
class Context{constructor(){this.state='running';this.currentTime=1;this.destination={};this.nodes=[];}node(){const n=new Node();this.nodes.push(n);return n;}createGain(){return this.node();}createBiquadFilter(){return this.node();}createOscillator(){return this.node();}createStereoPanner(){return this.node();}createDynamicsCompressor(){return this.node();}}
const audio=new SoundManager();audio.ctx=new Context();const signatures=[];
for(const identity of ['ZHANG','LI','ZHOU','CHEN']){
 audio.setRouteTheme(identity,'M1');assert.equal(audio.routeTheme.identity,identity);
 const plan=audio.routeTheme.lastPlan;assert(plan.events.some(x=>x.kind==='bow'));assert(plan.events.some(x=>x.kind==='piano'));assert(new Set(plan.events.map(x=>x.at)).size>4,'music must develop over time');signatures.push(JSON.stringify(plan.events));
 const later=scorePhrase(identity,'explore',1);assert.notDeepEqual(plan.events,later.events,'harmonies evolve between phrases');
}
assert.equal(new Set(signatures).size,4);const size=audio.ctx.nodes.length;audio.setRouteTheme('CHEN','M1');assert.equal(audio.ctx.nodes.length,size,'unlock idempotence');
const previous=audio.routeTheme;audio.setRouteTheme('CHEN','M9');assert.equal(audio.routeTheme,null);assert(previous.stopped);assert([...previous.voices].every(x=>x.stopped===1.8),'pending voices stop with the score');
for(const [zone,step,p,mood]of [['second_campus_5f','M4',{z:6},'rest'],['second_campus_2f','M5',{},'monitor'],['first_campus_4f','M2',{},'threat'],['phantom_6f','M6',{},'memory'],['b2_archive','B2',{},'archive']])assert.equal(scoreMood(zone,step,p),mood);
assert.equal(new Set(['rest','monitor','threat','memory','archive'].map(m=>JSON.stringify(scorePhrase('LI',m)))).size,5);
const noAsset=new SoundManager();noAsset.setRouteTheme('ZHANG','M1');assert.equal(noAsset.ctx,null);
console.log('PASS four evolving hospital motifs, five zone/event moods, idempotent unlock and full voice/timer cleanup at M9');
