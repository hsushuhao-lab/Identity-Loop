import assert from 'node:assert/strict';
import { IdentityManager, IdentityEnum } from './src/core/IdentityManager.js';
const store={value:null,getItem(){return this.value;},setItem(_,value){this.value=value;},removeItem(){this.value=null;}};
for(const identity of Object.values(IdentityEnum)){const manager=new IdentityManager(store);manager.startNewRun({forceIdentity:identity});while(manager.currentRouteStep!=='M9')assert.equal(manager.completeRouteStep(manager.currentRouteStep),true);manager.commitM9(identity,identity);}
const manager=new IdentityManager(store);assert.equal(manager.metaSave.m10Unlocked,true);assert.equal(manager.startNewRun().runSave.currentMilestone,'M10');
console.log('PASS M10 unlock after four good endings');
