import { IdentityEnum } from '../core/IdentityManager.js';

const line=(speaker,text)=>Object.freeze({speaker,text});
const COMMON=Object.freeze({
  M1:Object.freeze([line('值班醫師','「這份名冊被刮掉的不只是名字。」'),line('護理交班簿','「今晚四個人，四種不同的做事方式。」')]),
  M2:Object.freeze([line('408C','「四下，停一下，再九下。」'),line('值班醫師','「正式床位只有三十二床。409 不在清冊裡。」')]),
  M3:Object.freeze([line('316 舊電話','「21:17。急診有一筆病歷，病人卻不在。」'),line('值班醫師','「先把這筆沒有人的紀錄查清楚。」')]),
  M4:Object.freeze([line('第二院區護理師','「504B 先做一般評估，排除急症，讓病人慢慢呼吸。」'),line('值班醫師','「轉送目的地卻先填成第一院區 409-A。」')]),
  M5:Object.freeze([line('監控主機','「SKYBRIDGE ONLY。跨院門禁即將關閉。」'),line('匿名聲音','「先確認名字。」'),line('匿名聲音','「先讓流程繼續。」')]),
  M6:Object.freeze([line('值班醫師','「不是在看別人的記憶……剛才，我是從那雙手裡往外看的。」')]),
  M7:Object.freeze([line('警衛台','「02:17。歷史錯誤順序是 1→3→4；紫色備援才是正確反應。」'),line('值班醫師','「有人把錯誤寫成了唯一的正確答案。」')]),
  M8:Object.freeze([line('系統','「CURRENT SHIFT / SUBJECT RECLASSIFICATION IN PROGRESS」'),line('值班醫師','「它不是要告訴我誰是誰。它要我接受一個不屬於我的版本。」')])
});

const IDENTITY_BEATS=Object.freeze({
  M1:Object.freeze({ZHANG:line('值班醫師','「刮痕太深了。連紙都快被挖穿……為什麼我會喘不過氣？」'),LI:line('值班醫師','「紅筆最後一筆往右下收。這種筆壓，我為什麼會注意？」'),ZHOU:line('值班醫師','「光線太暗，快門大概三十分之一秒……我怎麼會知道？」'),CHEN:line('值班醫師','「右下角應該還有車號欄。我明明沒看過這張表。」')}),
  M2:Object.freeze({ZHANG:line('值班醫師','「先確認床上的人，不要讓一個空欄位取代他。」'),LI:line('值班醫師','「沒有授權就不能過床。這張單的流程不成立。」'),ZHOU:line('值班醫師','「門框的刮痕像是被相機固定記錄過。」'),CHEN:line('值班醫師','「409-A 比較像轉送目的地，不像病房床號。」')}),
  M3:Object.freeze({ZHANG:line('值班醫師','「備用鑰匙應該在查哨板後面。」'),LI:line('值班醫師','「這個抽屜的卡榫要先壓右側。」'),ZHOU:line('值班醫師','「底片盒的馬達聲……我不該對它這麼熟。」'),CHEN:line('值班醫師','「跨院接駁車經過消毒水和柴油味，路線不會走錯。」')}),
  M4:Object.freeze({ZHANG:line('值班醫師','「先評估，再觀察，不能讓目的地代替病人。」'),LI:line('值班醫師','「這份醫囑先蓋章，來源卻沒有留下。」'),ZHOU:line('值班醫師','「便條的折角朝向天橋，不是護理站。」'),CHEN:line('值班醫師','「手指自己按下 5042。這個碼不應該在腦中。」')}),
  M5:Object.freeze({ZHANG:line('值班醫師','「藍色墨水沾在捲起的袖口旁，還有沒喝完的黑咖啡。」'),LI:line('值班醫師','「腕錶停在固定的分鐘數。紅筆壓過每一頁。」'),ZHOU:line('值班醫師','「鏡頭先找邊角，再等快門。有人把警告留在畫面裡。」'),CHEN:line('值班醫師','「輪椅要貼右側走，天橋門會在身後鎖上。」')}),
  M6:Object.freeze({ZHANG:line('記憶閃回','「黑咖啡冷了。手腕上的聽診器帶子勒得太緊。」'),LI:line('記憶閃回','「金屬錶面反光，紅色批示紙壓在最上面。」'),ZHOU:line('記憶閃回','「底片相機的捲片桿卡住半格。」'),CHEN:line('記憶閃回','「灰色滾邊的證件被門夾住，跨院標記仍然看得見。」')}),
  M7:Object.freeze({ZHANG:line('記憶閃回','「門的另一側有人敲，卻沒有人把名字寫進去。」'),LI:line('記憶閃回','「手先伸向 1，再到 3，最後才知道那是錯的。」'),ZHOU:line('記憶閃回','「我在警衛台前等那把鑰匙，紙上的警告沒有送出去。」'),CHEN:line('記憶閃回','「門一關，轉送單還在手上，目的地卻變成 409-A。」')}),
  M8:Object.freeze({ZHANG:line('系統','「FIRST-LINE STATUS REVOKED / DESTINATION 409-A」'),LI:line('系統','「ADMINISTRATOR AUTHORITY REVOKED / ORIGINAL RECORD RESTORATION」'),ZHOU:line('系統','「SECOND-LINE RECORD NOT FOUND / STATUS NON-EXISTENT」'),CHEN:line('系統','「CROSS-CAMPUS AUTHORIZATION INVALID / TRANSFER REJECTED')})
});

export function getIdentityDialogue(sceneId,identity){
  if(!IdentityEnum[identity]||!COMMON[sceneId]||!IDENTITY_BEATS[sceneId]?.[identity])return null;
  return {sceneId,common:[...COMMON[sceneId]],identityBeat:IDENTITY_BEATS[sceneId][identity]};
}

export function getSharedDialogue(sceneId){return COMMON[sceneId]?[...COMMON[sceneId]]:[];}
export const M9_IDENTITY_CHOICES=Object.freeze(Object.values(IdentityEnum));
