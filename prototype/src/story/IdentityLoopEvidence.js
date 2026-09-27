export const EVIDENCE_CATEGORIES=Object.freeze({OBJECTIVE_FACT:'OBJECTIVE_FACT',SENSORIMOTOR_MEMORY:'SENSORIMOTOR_MEMORY',FIRST_PERSON_MEMORY:'FIRST_PERSON_MEMORY',CONTRADICTION:'CONTRADICTION'});

export const IDENTITY_EVIDENCE=Object.freeze([
  {id:'M1_ERASED_ROSTER',category:EVIDENCE_CATEGORIES.OBJECTIVE_FACT,milestone:'M1',visibleText:'1998 名冊有一列被刮到紙張破裂。',internalAffinity:null},
  {id:'M1_PROCEDURAL_REACTION',category:EVIDENCE_CATEGORIES.SENSORIMOTOR_MEMORY,milestone:'M1',visibleText:'看見一種筆壓、快門或表格欄位時，身體先於理解做出反應。',internalAffinity:'SEED_DEPENDENT'},
  {id:'M2_BED_33',category:EVIDENCE_CATEGORIES.OBJECTIVE_FACT,milestone:'M2',visibleText:'官方床位三十二床；409-A 卻留下第 33 床的痕跡。',internalAffinity:null},
  {id:'M3_RECORD_ABSENT_PATIENT',category:EVIDENCE_CATEGORIES.CONTRADICTION,milestone:'M3',visibleText:'00:33 的紀錄存在，病人不存在。',internalAffinity:null},
  {id:'M4_PREFILLED_TRANSFER',category:EVIDENCE_CATEGORIES.OBJECTIVE_FACT,milestone:'M4',visibleText:'504B 的一般評估單已預填第一院區 409-A。',internalAffinity:null},
  {id:'M5_SKYBRIDGE',category:EVIDENCE_CATEGORIES.OBJECTIVE_FACT,milestone:'M5',visibleText:'跨院路線只有天橋；門在承諾後從另一側鎖上。',internalAffinity:null},
  {id:'M6_MEMORY_ANCHOR',category:EVIDENCE_CATEGORIES.FIRST_PERSON_MEMORY,milestone:'M6',visibleText:'某個物件讓視角短暫從一雙手裡往外看。',internalAffinity:'SEED_DEPENDENT'},
  {id:'M7_B_PANEL',category:EVIDENCE_CATEGORIES.CONTRADICTION,milestone:'M7',visibleText:'歷史錯誤順序是 1→3→4；紫色備援才是正確反應。',internalAffinity:null},
  {id:'B2_CURRENT_SELF_CORRUPTED',category:EVIDENCE_CATEGORIES.CONTRADICTION,milestone:'B2',visibleText:'客觀名冊完整，但目前的自我欄位顯示 CURRENT SELF = CORRUPTED。',internalAffinity:null}
]);

export function getVisibleEvidence(){return IDENTITY_EVIDENCE.map(({internalAffinity,...evidence})=>evidence);}
