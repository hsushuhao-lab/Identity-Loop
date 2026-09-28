import { IDENTITY_PROFILES, IdentityEnum } from '../core/IdentityManager.js';

export const GOOD_ENDINGS=Object.freeze({
  ZHANG:Object.freeze({title:'THE NAME',lines:['我是第一線住院醫師張守恆。MED-870409。','409-A 裡沒有無名氏。','每一個病人都有名字。']}),
  LI:Object.freeze({title:'THE ORDER',lines:['我是夜間總醫師李承禮。','02:17 的錯誤命令是我下的。','我不再修改紀錄。']}),
  ZHOU:Object.freeze({title:'THE WARNING',lines:['我是第二線住院醫師周啟文。','我看見了，也留下了證據。','這一次警告不會再停在桌上。']}),
  CHEN:Object.freeze({title:'THE TRANSFER',lines:['我是支援醫師陳柏勳。','錯誤目的地就應該停止流程。','我親手劃掉 DESTINATION: 409-A。','TRANSFER CANCELLED — IDENTITY UNVERIFIED。','撤銷所有轉入 409-A 的轉送。']})
});

export const WRONG_MEMORY_LINES=Object.freeze(['IDENTITY RESTORED','FATAL COGNITIVE DISSONANCE','AUTOBIOGRAPHICAL PROOF MISMATCH','YOU CANNOT ESCAPE AS ANOTHER MAN','RECLASSIFY SUBJECT','UNIDENTIFIED PATIENT','LOCATION 409-A']);

export function getGoodEnding(identity){return IDENTITY_PROFILES[identity]&&GOOD_ENDINGS[identity]||null;}
export function getM9Candidates(){return Object.values(IdentityEnum).map(identity=>({identity,...IDENTITY_PROFILES[identity]}));}
