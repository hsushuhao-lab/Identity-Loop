export const TRUE_NAME_CANON='張守恆';
const STORAGE_KEY='IdentyLoop_RuntimeData';

const defaults=()=>({
  version:5,
  loopCount:0,
  hasSeenHandoffAcknowledgement:false,
  seenOnce:{hotCoffee:false,unregisteredMessage3F:false},
  hasSeenOverride_Bed33:false,
  identityErosionLevel:0,
  proofs:{space:false,identity:false,time:false},
  legends:{
    bed33:false,er0033:false,chestPain:false,bridge:false,pond:false,floor6:false,lastCall:false
  },
  trueNameResolved:false,
  trueName:null,
  gameComplete:false,
  finalDisposition:null,
  knownCodes:{
    pass_1700:false,
    pass_3082:false,
    code_0217:false,
    code_0316:false,
    code_0409:false
  },
  survivalRules:{
    neverUseDefaultDutyTemplate:false,
    neverSignBed33:false,
    neverCreateGhostRecord:false,
    neverSignChestTransfer:false,
    neverLookBackOnBridge:false,
    ignorePondReflection:false,
  },
  trueNameFragments:{
    frag_employeePrefix:null,
    frag_surname:null,
    frag_givenName_1:null,
    frag_givenName_2:null,
    frag_title:null,
    frag_employeeFull:null
  },
  journalNotes:[],
  memoryEvidence:{}
});

const memoryStore={value:null};

function getStorage(){
  try{
    if(typeof window!=='undefined'&&window.localStorage)return window.localStorage;
  }catch(e){}
  return {
    getItem:key=>key===STORAGE_KEY?memoryStore.value:null,
    setItem:(key,value)=>{if(key===STORAGE_KEY)memoryStore.value=value;},
    removeItem:key=>{if(key===STORAGE_KEY)memoryStore.value=null;}
  };
}

function merge(base,loaded){
  return {
    ...base,...loaded,
    knownCodes:{...base.knownCodes,...loaded?.knownCodes},
    survivalRules:{...base.survivalRules,...loaded?.survivalRules},
    proofs:{...base.proofs,...loaded?.proofs},
    legends:{...base.legends,...loaded?.legends},
    trueNameFragments:{...base.trueNameFragments,...loaded?.trueNameFragments},
    journalNotes:Array.isArray(loaded?.journalNotes)?[...loaded.journalNotes]:[],
    memoryEvidence:{...base.memoryEvidence,...loaded?.memoryEvidence}
  };
}

export class PersistentMemory {
  constructor(storage=getStorage()){
    this.storage=storage;
    this.data=this.load();
  }

  load(){
    try{
      const raw=this.storage.getItem(STORAGE_KEY);
      if(!raw)return defaults();
      const parsed=JSON.parse(raw);
      const data=merge(defaults(),parsed);

      // v2 changed the canonical True Name. Preserve loop knowledge/rules, but
      // invalidate obsolete identity fragments from the earlier placeholder name.
      if((parsed.version||1)<2 || parsed.trueName==='林昱衡'){
        data.version=2;
        data.trueNameResolved=false;
        data.trueName=null;
        data.gameComplete=false;
        data.trueNameFragments={
          ...defaults().trueNameFragments,
          frag_employeePrefix: parsed.trueNameFragments?.frag_employeePrefix||null
        };
        data.journalNotes=data.journalNotes.filter(n=>!['TRUE_NAME','B2_316'].includes(n.id));
      }
      if((parsed.version||1)<3)data.version=3;
      if((parsed.version||1)<4)data.version=4;
      if((parsed.version||1)<5)data.version=5;
      // B2 identity attempts are per-run transient state. Never resurrect the
      // obsolete persistent lock from older localStorage payloads.
      delete data.b2IdentityAttemptUsed;
      const engineerNote=data.journalNotes.find(note=>note.id==='LIU_MAINTENANCE_TAG');
      if(engineerNote)engineerNote.text='劉志遠／ENG-860214／工務機電技師。燒焦吊牌標示 6F SKILL LAB／B-PANEL；他提到紫色備援與王世榮保管的鑰匙。';
      for(const note of data.journalNotes)note.text=note.text.replaceAll('4+3 夜班核心人員檔案','1998 夜班核心人員名錄');
      return data;
    }catch(e){
      return defaults();
    }
  }

  save(){
    try{this.storage.setItem(STORAGE_KEY,JSON.stringify(this.data));}catch(e){}
    return this.data;
  }

  reset(){
    this.data=defaults();
    try{this.storage.removeItem(STORAGE_KEY);}catch(e){}
  }

  learnCode(code){
    if(!(code in this.data.knownCodes))return false;
    if(this.data.knownCodes[code])return false;
    this.data.knownCodes[code]=true;this.save();return true;
  }

  learnRule(rule){
    if(!(rule in this.data.survivalRules))return false;
    if(this.data.survivalRules[rule])return false;
    this.data.survivalRules[rule]=true;this.save();return true;
  }

  setTrueNameFragment(key,value){
    if(!(key in this.data.trueNameFragments))return false;
    this.data.trueNameFragments[key]=value;this.save();return true;
  }

  addJournalNote(id,text){
    if(this.data.journalNotes.some(n=>n.id===id))return false;
    this.data.journalNotes.push({id,text,loop:this.data.loopCount});
    this.save();return true;
  }

  rememberEvidence(id){
    if(!id||this.data.memoryEvidence[id])return false;
    this.data.memoryEvidence[id]=true;
    this.save();
    return true;
  }

  hasEvidence(id){return this.data.memoryEvidence[id]===true;}
  evidenceCount(){return Object.values(this.data.memoryEvidence).filter(Boolean).length;}

  raiseErosion(delta=1){
    this.data.identityErosionLevel=Math.max(0,Math.min(5,this.data.identityErosionLevel+delta));
    this.save();return this.data.identityErosionLevel;
  }

  resolveLegend(key){
    if(key in this.data.legends)this.data.legends[key]=true;
    this.save();
  }

  setProof(key,value=true){
    if(key in this.data.proofs)this.data.proofs[key]=value;
    this.save();
  }

  hasAllProofs(){return this.data.proofs.space&&this.data.proofs.identity&&this.data.proofs.time;}

  claimHandoffAcknowledgement(){
    if(this.data.hasSeenHandoffAcknowledgement)return false;
    this.data.hasSeenHandoffAcknowledgement=true;
    this.save();
    return true;
  }

  claimOnce(eventId){
    if(this.data.seenOnce[eventId])return false;
    this.data.seenOnce[eventId]=true;
    this.save();
    return true;
  }

  canReconstructTrueName(){
    const f=this.data.trueNameFragments;
    return f.frag_employeePrefix==='MED-87'
      && f.frag_surname==='張'
      && f.frag_givenName_1==='守'
      && f.frag_givenName_2==='恆'
      && f.frag_title==='住院醫師'
      && f.frag_employeeFull==='MED-870409';
  }

  resolveTrueName(name){
    if(name!==TRUE_NAME_CANON || !this.canReconstructTrueName())return false;
    this.data.trueName=name;
    this.data.trueNameResolved=true;
    this.addJournalNote('TRUE_NAME','B2 的時間、空間、病歷與物證一致指向「'+name+'」。');
    this.save();
    return true;
  }

  completeGame(){
    this.data.gameComplete=true;
    this.data.finalDisposition='escaped';
    this.data.legends.lastCall=true;
    this.save();
  }

  beginSuccessfulEndingReview(){
    this.data.gameComplete=true;
    this.data.finalDisposition='success_pending';
    this.data.legends.lastCall=true;
    this.save();
  }

  completePerfectEnding(){
    this.data.gameComplete=true;
    this.data.finalDisposition='perfect';
    this.data.legends.lastCall=true;
    this.save();
  }

  completeHospitalizedEnding(){
    this.data.gameComplete=false;
    this.data.finalDisposition='hospitalized';
    this.save();
  }

  beginFinalEscapeAttempt(){
    this.data.gameComplete=false;
    this.data.finalDisposition='escape_attempt';
    this.save();
  }

  recordOverride(id){
    this.data.loopCount+=1;
    this.raiseErosion(1);
    const configs={
      HANDOFF_DEFAULT:{legend:null,rule:'neverUseDefaultDutyTemplate',notes:[['RULE_HANDOFF_TEMPLATE','值班身分未確認時，不要套用院內預設模板；保留未確認身分再查原始資料。']]},
      BED33:{legend:'bed33',rule:'neverSignBed33',notes:[
        ['RULE_BED33','不要簽 409A 的床位。'],
        ['CODE_0409','04:09 不是時間，是 409。'],
        ['IDENTITY_DOCTOR','如果我被登記成病人，系統就會讓另一個值班身分接手我的工作。']
      ]},
      ER0033:{legend:'er0033',rule:'neverCreateGhostRecord',notes:[['RULE_ER0033','00:33 的無名掛號只能查閱，不能建立新病歷。']]},
      CHEST:{legend:'chestPain',rule:'neverSignChestTransfer',notes:[['RULE_CHEST','第二院區多出的胸痛病人，不能替他簽轉院單。']]},
      BRIDGE:{legend:'bridge',rule:'neverLookBackOnBridge',notes:[['RULE_BRIDGE','天橋過中線後，不要回頭。']]},
      POND:{legend:'pond',rule:'ignorePondReflection',notes:[['RULE_POND','生態池的倒影如果沒有跟著我停下，就離開水邊。']]},
      TIMELOOP:{legend:null,rule:null,notes:[['RULE_0217','02:17 的舊紀錄不是操作說明；完全照著做只會重演事故。']]},
      FINAL:{legend:'lastCall',rule:null,notes:[['RULE_FINAL','316 權限核對錯誤會把值班身分覆寫成 409-A 病人紀錄。']]}
    };
    const cfg=configs[id];
    if(id==='BED33'){this.data.hasSeenOverride_Bed33=true;this.data.knownCodes.code_0409=true;}
    if(cfg){
      if(cfg.legend)this.data.legends[cfg.legend]=true;
      if(cfg.rule)this.data.survivalRules[cfg.rule]=true;
      for(const [nid,text] of cfg.notes)this.addJournalNote(nid,text);
    }
    this.save();
  }

  applyToGameState(gameState){
    gameState.setFlag('LOOP_COUNT',this.data.loopCount);
    gameState.setFlag('FAST_PATH_3F',this.data.loopCount>=1);
    gameState.setFlag('MEMORY_PASS_1700',this.data.knownCodes.pass_1700);
    gameState.setFlag('MEMORY_PASS_3082',this.data.knownCodes.pass_3082);
    gameState.setFlag('MEMORY_CODE_0217',this.data.knownCodes.code_0217);
    gameState.setFlag('MEMORY_CODE_0316',this.data.knownCodes.code_0316);
    gameState.setFlag('MEMORY_CODE_0409',this.data.knownCodes.code_0409);
    gameState.setFlag('MEMORY_NEVER_SIGN_BED33',this.data.survivalRules.neverSignBed33);
    gameState.setFlag('IDENTITY_EROSION_LEVEL',this.data.identityErosionLevel);
    gameState.setFlag('SPACE_PROOF',this.data.proofs.space);
    gameState.setFlag('IDENTITY_PROOF',this.data.proofs.identity);
    gameState.setFlag('TIME_PROOF',this.data.proofs.time);
    gameState.setFlag('TRUE_NAME_RESOLVED',this.data.trueNameResolved);
    if(this.data.trueName)gameState.setFlag('TRUE_NAME',this.data.trueName);
  }
}

export const persistentMemory=new PersistentMemory();
