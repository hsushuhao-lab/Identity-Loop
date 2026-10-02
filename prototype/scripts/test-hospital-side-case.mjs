import assert from 'node:assert/strict';
import {HospitalSimulation} from '../src/core/HospitalSimulation.js';
import {restoreSideCase,caseReaction} from '../src/core/HospitalSideCase.js';
const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
const paper=new HospitalSimulation({storage,runKey:'paper'});
assert.equal(paper.resolveCase('archive').ok,false);
paper.inspectCase('paper');assert.equal(paper.resolveCase('archive').ok,true);assert.equal(paper.data.sideCase.outcome,'archive');
assert.equal(paper.resolveCase('verify').ok,false);
const bench=new HospitalSimulation({storage,runKey:'bench'});
bench.inspectCase('relay');assert.equal(bench.observeCaseAir().ok,false);
bench.toggleCasePower();assert.match(bench.observeCaseAir().text,/沒有動/);
assert.equal(bench.resolveCase('archive').ok,true,'physical evidence is an alternative to the paper');
bench.toggleCasePower();bench.toggleCaseDamper();bench.observeCaseAir();assert.equal(bench.resolveCase('verify').ok,true);
assert.equal(bench.data.sideCase.clues.includes('paper'),false,'mechanical path needs no archival paper');
assert.equal(bench.data.sideCase.outcome,'verify');
assert.deepEqual(new HospitalSimulation({storage,runKey:'bench'}).snapshot(),bench.snapshot());
assert.equal(new HospitalSimulation({storage,runKey:'new-loop'}).data.sideCase.outcome,'pending');
bench.resolveCase('archive');assert.equal(bench.data.sideCase.power,false);assert.equal(bench.data.sideCase.damper,false);
assert(bench.data.sideCase.clues.includes('air_flow'),'revising the outcome preserves observations');
assert.deepEqual(restoreSideCase({clues:['paper','paper','name','MED-42'],outcome:'GOOD_END',power:1}),{visits:0,clues:['paper'],power:false,damper:false,outcome:'pending',revisions:0});
for(const outcome of ['pending','archive','verify']){
 const voices=['LI','ZHANG','ZHOU','CHEN'].map(identity=>caseReaction(identity,outcome));assert.equal(new Set(voices).size,4);
 for(const voice of voices)assert.doesNotMatch(voice,/李承禮|張守恆|周伯彥|陳國偉|MED-/);
}
console.log('PASS optional case: independent paper/mechanical paths, two reversible outcomes, source preservation, save isolation and four anonymous perceptions');
