import assert from 'node:assert/strict';
import {IdentityManager,IDENTITY_STORAGE_KEY} from './src/core/IdentityManager.js';
import {mkdirSync,writeFileSync} from 'node:fs';
const identities=['LI','ZHANG','ZHOU','CHEN'];
const store=()=>({value:null,getItem(){return this.value;},setItem(_,v){this.value=v;}});
const final=m=>{while(m.currentRouteStep!=='M9')assert(m.completeRouteStep(m.currentRouteStep));};
const results=[];
for(const identity of identities)for(const name of identities)for(const staff of identities){
 const storage=store(),m=new IdentityManager(storage);m.startNewRun({forceIdentity:identity});final(m);
 const r=m.commitM9(name,staff),correct=name===identity&&staff===identity;
 assert.equal(r.type,correct?'GOOD_END':'WRONG_MEMORY_BAD_END');
 assert.deepEqual(m.metaSave.completedGoodEnds,correct?[identity]:[]);
 assert.equal(m.runSave.m9CommittedChoice,name);assert.equal(m.runSave.m9CommittedEmployeeChoice,staff);
 const saved=storage.value;assert.equal(m.commitM9(identity,identity).reason,'ALREADY_COMMITTED');assert.equal(storage.value,saved);
 const reloaded=new IdentityManager(storage);assert.deepEqual(reloaded.committedM9Result,r);
 assert.equal(reloaded.commitM9(identity,identity).reason,'ALREADY_COMMITTED');
 results.push({identity,name,staff,result:r.type,reloaded:reloaded.committedM9Result.type});
}
for(const identity of identities){
 const m=IdentityManager.createForTest(identity);assert.equal(m.commitM9(identity,identity).reason,'M9_NOT_ACTIVE');final(m);
 for(const pair of [[null,null],[identity,null],[null,identity],[identity,'unknown'],[identity]]){
  const before=m.snapshot();assert.equal(m.commitM9(...pair).ok,false);assert.deepEqual(m.snapshot(),before);
 }
 // Old finalized saves only had one matched personnel-record ID. Migrate without
 // awarding new achievements or reopening their single final submission.
 for(const choice of identities){
  const s=store();s.value=JSON.stringify({version:2,metaSave:{completedGoodEnds:choice===identity?[identity]:[]},runSave:{currentIdentity:identity,currentRouteStep:m.route.length,completedStoryModules:m.route,runEnded:true,m9CommittedChoice:choice,runSeed:7,chenRouteRevision:1,zhangRouteRevision:1,zhouRouteRevision:1}});
  const old=new IdentityManager(s);assert.equal(old.runSave.m9CommittedEmployeeChoice,choice);assert.equal(old.committedM9Result.type,choice===identity?'GOOD_END':'WRONG_MEMORY_BAD_END');
  assert.equal(old.commitM9(identity,identity).reason,'ALREADY_COMMITTED');
  assert.deepEqual(JSON.parse(s.value).metaSave.completedGoodEnds,choice===identity?[identity]:[]);
 }
}
const out=process.argv[2]||'qa-results/m9';mkdirSync(out,{recursive:true});writeFileSync(out+'/pair-matrix.json',JSON.stringify({storageKey:IDENTITY_STORAGE_KEY,cases:results.length,good:results.filter(r=>r.result==='GOOD_END').length,bad:results.filter(r=>r.result==='WRONG_MEMORY_BAD_END').length,results},null,2));
console.log('PASS M9 64 independent pairs: 4 good, 60 bad; missing choice never commits; duplicate/reload locked; 16 old endings preserved');
