import assert from 'node:assert/strict';
import {IdentityManager} from './src/core/IdentityManager.js';
import {IDENTITY_ROUTES} from './src/story/IdentityRoutes.js';
import {getIdentityRouteScene,shouldShowAnnie} from './src/story/IdentityRouteScenes.js';

const storage=()=>({value:null,getItem(){return this.value;},setItem(_,value){this.value=value;}});
for(const identity of Object.keys(IDENTITY_ROUTES)){
  const manager=new IdentityManager(storage(),()=>.375);manager.startNewRun({forceIdentity:identity});
  const seed=manager.runSave.runSeed;
  const restored=new IdentityManager(manager.storage);
  assert.equal(restored.runSave.runSeed,seed,`${identity}: event seed persists`);
  const eligible=IDENTITY_ROUTES[identity].filter(step=>shouldShowAnnie(identity,step,seed));
  assert(eligible.length<=IDENTITY_ROUTES[identity].length);
  for(const step of IDENTITY_ROUTES[identity]){
    assert.deepEqual(getIdentityRouteScene(step,identity,seed),getIdentityRouteScene(step,identity,seed),`${identity}/${step}: replay is deterministic`);
    const event=getIdentityRouteScene(step,identity,seed).find(beat=>beat.annieFlag===`ANNIE_ROUTE_EVENT_${identity}`);
    assert.equal(Boolean(event),shouldShowAnnie(identity,step,seed));
  }
  const eligibleStep=({ZHANG:'M2',LI:'LI_2117_PATROL',ZHOU:'ZHOU_OPEN_8F',CHEN:'CHEN_OPEN_SKYBRIDGE'})[identity];
  const outcomes=new Set(Array.from({length:90},(_,runSeed)=>shouldShowAnnie(identity,eligibleStep,runSeed)));
  assert.equal(outcomes.size,2,`${identity}: the eligible event is seeded but not forced`);
  assert.equal(getIdentityRouteScene(eligibleStep,identity).some(beat=>beat.annieFlag===`ANNIE_ROUTE_EVENT_${identity}`),false,'unseeded helper calls do not fabricate events');
}
console.log('PASS seeded Annie event: replay-stable, per-run variable, identity-specific, and persisted');
