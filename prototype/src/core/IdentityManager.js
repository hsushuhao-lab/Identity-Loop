export const IdentityEnum=Object.freeze({
  ZHANG:'ZHANG',LI:'LI',ZHOU:'ZHOU',CHEN:'CHEN'
});

export const IDENTITY_PROFILES=Object.freeze({
  ZHANG:Object.freeze({name:'張守恆',employeeId:'MED-870409',role:'第一線住院醫師'}),
  LI:Object.freeze({name:'李承禮',employeeId:'MED-820316',role:'夜間總醫師'}),
  ZHOU:Object.freeze({name:'周啟文',employeeId:'MED-880217',role:'第二線住院醫師'}),
  CHEN:Object.freeze({name:'陳柏勳',employeeId:'MED-890605',role:'第二院區支援醫師'})
});

export const IDENTITY_STORAGE_KEY='IdentyLoop_IdentityState_v1';
const IDENTITIES=Object.freeze(Object.values(IdentityEnum));
const clone=value=>JSON.parse(JSON.stringify(value));
const freshMeta=()=>({completedGoodEnds:[],identityBag:[],m10Unlocked:false});
const freshRun=()=>({currentIdentity:null,currentMilestone:'M1',evidence:{},m9CommittedChoice:null,runEnded:false,b2Entered:false});

function defaultStorage(){
  if(typeof window!=='undefined'&&window.localStorage)return window.localStorage;
  let value=null;
  return {getItem:()=>value,setItem:(_,next)=>{value=next;},removeItem:()=>{value=null;}};
}

function validIdentity(identity){return IDENTITIES.includes(identity);}

export class IdentityManager{
  constructor(storage=defaultStorage(),rng=Math.random){this.storage=storage;this.rng=rng;this.state=this.load();}

  static createForTest(identity,storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}}){
    const manager=new IdentityManager(storage,()=>.25);
    manager.startNewRun({forceIdentity:identity});
    return manager;
  }

  load(){
    const raw=this.storage.getItem(IDENTITY_STORAGE_KEY);
    if(!raw)return {metaSave:freshMeta(),runSave:freshRun()};
    const parsed=JSON.parse(raw);
    return {metaSave:{...freshMeta(),...parsed.metaSave,completedGoodEnds:[...(parsed.metaSave?.completedGoodEnds||[])],identityBag:[...(parsed.metaSave?.identityBag||[])]},runSave:{...freshRun(),...parsed.runSave,evidence:{...(parsed.runSave?.evidence||{})}}};
  }

  save(){this.storage.setItem(IDENTITY_STORAGE_KEY,JSON.stringify(this.state));return this.snapshot();}
  snapshot(){return clone(this.state);}
  get metaSave(){return this.state.metaSave;}
  get runSave(){return this.state.runSave;}
  get currentIdentity(){return this.state.runSave.currentIdentity;}

  startNewRun({forceIdentity=null,restart=false}={}){
    if(this.currentIdentity&&!this.runSave.runEnded&&!restart)return this.snapshot();
    if(this.metaSave.m10Unlocked&&!forceIdentity){
      this.state.runSave={...freshRun(),currentMilestone:'M10'};
      return this.save();
    }
    const currentIdentity=forceIdentity||this.drawIdentity();
    if(!validIdentity(currentIdentity))throw new Error('Unknown identity seed');
    this.state.runSave={...freshRun(),currentIdentity,currentMilestone:this.metaSave.m10Unlocked?'M10':'M1'};
    return this.save();
  }

  restoreOrStartRun(){return this.currentIdentity&&!this.runSave.runEnded?this.snapshot():this.startNewRun();}

  drawIdentity(){
    if(this.metaSave.m10Unlocked)return null;
    if(!this.metaSave.identityBag.length){
      const remaining=IDENTITIES.filter(identity=>!this.metaSave.completedGoodEnds.includes(identity));
      const pool=remaining.length?remaining:[...IDENTITIES];
      this.metaSave.identityBag=[...pool];
      for(let i=this.metaSave.identityBag.length-1;i>0;i--){const j=Math.floor(this.rng()*(i+1));[this.metaSave.identityBag[i],this.metaSave.identityBag[j]]=[this.metaSave.identityBag[j],this.metaSave.identityBag[i]];}
    }
    const identity=this.metaSave.identityBag.shift();
    this.save();
    return identity;
  }

  advanceMilestone(milestone){
    if(this.runSave.runEnded)return false;
    this.runSave.currentMilestone=milestone;this.save();return true;
  }

  recordEvidence(evidence){
    if(!evidence?.id)return false;
    this.runSave.evidence[evidence.id]={id:evidence.id,category:evidence.category,milestone:evidence.milestone,visibleText:evidence.visibleText};
    this.save();return true;
  }

  enterB2(){
    if(this.runSave.b2Entered)return false;
    this.runSave.b2Entered=true;this.runSave.currentMilestone='B2';this.save();return true;
  }

  canEnterB2(){return !this.runSave.b2Entered;}

  commitM9(selectedIdentity){
    if(this.runSave.m9CommittedChoice||this.runSave.runEnded)return {ok:false,reason:'ALREADY_COMMITTED'};
    if(!validIdentity(selectedIdentity))return {ok:false,reason:'UNKNOWN_IDENTITY'};
    this.runSave.currentMilestone='M9';this.runSave.m9CommittedChoice=selectedIdentity;this.runSave.runEnded=true;
    const correct=selectedIdentity===this.currentIdentity;
    if(correct){
      if(!this.metaSave.completedGoodEnds.includes(this.currentIdentity))this.metaSave.completedGoodEnds.push(this.currentIdentity);
      this.metaSave.m10Unlocked=IDENTITIES.every(identity=>this.metaSave.completedGoodEnds.includes(identity));
      return this.save()&&{ok:true,type:'GOOD_END',identity:this.currentIdentity,m10Unlocked:this.metaSave.m10Unlocked};
    }
    this.save();
    return {ok:true,type:'WRONG_MEMORY_BAD_END',identity:this.currentIdentity,selectedIdentity};
  }
}
