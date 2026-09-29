import { anonymousNarrative } from './IdentityPrivacy.js';

// Existing, reviewed photographic sources. No generated portraits or random atlas cells.
const atlas='assets/identity-v03/floor-photo-contact-sheet.png';
const photo=(title,caption,readings,cell)=>Object.freeze({title,caption,readings:Object.freeze(readings),path:atlas,cell});
export const SHARED_PHOTOS=Object.freeze({
  er:photo('急診留觀區','留觀床上放著一份紙本，床簾只拉了一半。',{
    ZHANG:'先注意床旁的空間。照片沒有拍到病人，不能據此推定當時無人需要照顧。',
    LI:'紙本在床上，不在歸檔夾裡。我會先核對紀錄來源，而不是補上空白。',
    ZHOU:'簾子遮住了畫面右側；沒有拍到的部分，不能用猜測補成證據。',
    CHEN:'床頭與通道的位置看得清楚；但這張照片沒有交代病床下一站。'
  },0),
  archive:photo('資料室外的走廊','一側是文件架，另一側是磨損的牆面與扶手。',{
    ZHANG:'先看走廊是否留有通道，再看櫃裡的資料。兩者都不能只靠照片確認。',
    LI:'架上資料很多，但照片讀不清標籤。排列整齊並不等於來源已核對。',
    ZHOU:'扶手一路延伸到畫外。我想找另一個角度，但這張能證明的只有這一段。',
    CHEN:'轉角藏在文件架後。找得到路，和知道這條路是否開放，是兩件事。'
  },1),
  desk:photo('夜班工作桌','黑色杯子、腕錶、紅筆與手寫紙張放在同一張桌上。',{
    ZHANG:'我先看見杯子。這種注意力很自然，但不足以認定它是誰的。',
    LI:'我的視線先停在腕錶和紅筆，接著才是紙張。物品的主人仍無法核實。',
    ZHOU:'杯柄與筆的位置像有人剛離開。沒有連續影像，我不能替它補出動作。',
    CHEN:'電話就在手邊，紙張還沒有收走。我在意的是有沒有完成交接。'
  },2),
  wheelchair:photo('走廊裡的輪椅','空輪椅停在門旁，前方是光線較暗的走廊。',{
    ZHANG:'輪椅上沒有人。這不代表使用它的人已經安全離開。',
    LI:'照片沒有借用標籤或交接欄；不能只憑停放位置把流程寫成完成。',
    ZHOU:'我看向輪子的方向。靜止的照片無法告訴我它之前往哪裡走。',
    CHEN:'我先注意輪子和握把。手感似乎可以想像，但那仍不是身分證明。'
  },3),
  station:photo('玻璃後的護理站','玻璃圍起工作區，櫃檯前留下了一張紙。',{
    ZHANG:'玻璃後沒有看見人，先找當班的人核對，比直接替那張紙下結論重要。',
    LI:'櫃檯上的紙沒有可辨識的落款。把它收進流程前，還缺一個來源。',
    ZHOU:'玻璃把反射與室內疊在一起。我要分清楚看見的是哪一層。',
    CHEN:'櫃檯像交接的邊界。把文件放下，不等於另一端已經接到。'
  },4),
  skills:photo('技能訓練空間','訓練人偶放在軟墊上，後方是電梯與器材車。',{
    ZHANG:'它是訓練器材，不是需要被建立病歷的病人。照片的樓層仍待核對。',
    LI:'場地與器材可以辨認，卻不能用來替空白的巡查時間補登。',
    ZHOU:'人偶的位置清楚，拍攝者卻不在畫面裡。我要把觀察與推測分開。',
    CHEN:'器材車靠近電梯。移動設備很熟悉，但熟悉感不會替我填出名字。'
  },5),
  dispatch:photo('地下接駁入口','推床停在車庫門內，外面的燈映在潮濕地面上。',{
    ZHANG:'我先看推床；它空著，照片不能代替病人的去向紀錄。',
    LI:'入口沒有可讀的交接單。進出過這裡，不等於已完成程序。',
    ZHOU:'地面的光把外面遮得更暗。反光不是另一輛車存在的證據。',
    CHEN:'推床朝向入口。我在意交出與接收是否由兩端各自核對。'
  },6),
  storage:photo('封存資料櫃','玻璃櫃裡塞著紙本，桌上另有綁好的文件。',{
    ZHANG:'資料被留了下來，卻還不能替任何人的經歷作結論。',
    LI:'綁好與封存都只是狀態，原始內容仍需要獨立核對。',
    ZHOU:'我想逐頁確認，但文件數量本身不會讓推測變成事實。',
    CHEN:'文件堆在交接桌與櫃子兩端。我會先問哪些已收妥，哪些仍在途中。'
  },7),
  group:Object.freeze({title:'院內工作合照',caption:'一組院內工作人員在走廊合影，照片沒有可讀的人名標示。',path:'assets/identity-v03/history-group.png',readings:Object.freeze({
    ZHANG:'我先注意前排的人。不能把熟悉的白袍直接當成認出誰。',LI:'站位很整齊，但畫面沒有留下值勤分工或可核實的名牌。',ZHOU:'我在看構圖與畫外的空間。拿相機的人沒有出現在這張照片裡。',CHEN:'我注意每個人與走廊的位置；僅憑站在哪裡，還不能判定屬於哪個院區。'
  })}),
  reflection:Object.freeze({title:'設備查看紀錄',caption:'幾名工作人員聚在牆邊設備前，右側玻璃映出另一層畫面。',path:'assets/identity-v03/history-reflection.png',readings:Object.freeze({
    ZHANG:'有人彎下身查看設備。單張照片沒有交代現場是否還有其他人需要幫忙。',LI:'設備前聚了幾個人，但這不是已核准的處置紀錄。',ZHOU:'玻璃反射也留在底片裡。我先記下它，不把反射認作另一段時間。',CHEN:'有人站在通道邊緣。照片可以提示位置，不能代替動線的實際確認。'
  })})
});
export const FLOOR_PHOTO_KEYS=Object.freeze(['er','archive','desk','wheelchair','station','skills','dispatch','storage']);
// Shared props are observations, never a shortcut to the route's identity or ending.
export const LEGACY_MEDIA=Object.freeze({
  M1_ADMIN_DUTY_PHOTO:['行政留影',['group','archive','desk','station','reflection']],
  M1_ARCHIVE_6F_ALBUM:['未編目相簿',['archive','group','skills','reflection','desk','storage']],
  M2_DUTYROOM_ALBUM:['夜班工作留影',['group','station','desk','archive','er','wheelchair']],
  M3_ER_PHOTO:['急診工作留影',['er','station','desk','wheelchair','group']],
  M4_SECOND_DUTY_NOTE:['第二院區桌邊留影',['desk','wheelchair','station','er','dispatch']],
  M5_GUARD_REST_LOG:['值勤影像留存',['reflection','desk','archive','group']],
  M5_SECURITY_PLAYBACK:['監控紀錄殘片',['station','reflection','wheelchair','archive','er','dispatch']],
  M6_6F_PLAYBACK:['教學影像殘片',['skills','group','station','archive','reflection','desk']],
  M7_GUARD_0217:['警衛台影像留存',['reflection','desk','storage','group','archive']],
  B2_VICTIM_MAP:['封存資料留影',['storage','archive','dispatch','reflection']],
  SECOND_GUARD_PHOTO_ALBUM:['警衛台舊相簿',['group','desk','reflection']],
  ARCHIVE_HISTORY_PHOTO_WALL:['院史影像牆',['group','archive','skills','reflection']]
});
export function sharedText(text){
  return anonymousNarrative(text??'')
    .replace(/(?:MED|NUR|SEC|ADM|ENG)-[\dA-Z•._-]+/g,'識別欄未核')
    .replace(/(?:LI_CHENG_LI|ZHANG_SHOUHENG|ZHOU_QIWEN|CHEN_BOXUN)/g,'身分未核');
}
export function photoFrame(key,identity){
  const p=SHARED_PHOTOS[key];
  return {photo:key,stamp:'館藏影像／日期未核',title:p.title,caption:p.caption,
    narration:p.readings[identity]||'只記下影像可見的內容，不據此認定任何人的身分。'};
}
export function photoSequence(key,identity){
  return {id:`SHARED_PHOTO_${key}`,title:SHARED_PHOTOS[key].title,mode:'ALBUM',source:'院內影像留存｜人物與日期未核',sharedMedia:true,frames:[photoFrame(key,identity)]};
}
export function sharedAlbum(id,identity){
  const record=LEGACY_MEDIA[id];
  if(!record)return null;
  return {id,title:record[0],mode:'ALBUM',source:'院內影像留存｜影像觀察與個人聯想分列',sharedMedia:true,frames:record[1].map(key=>photoFrame(key,identity))};
}
const M6_PHOTOS=Object.freeze({LI_6F_ORDER_MEMORY:['desk','desk','reflection','wheelchair','skills','station'],ZHOU_6F_WARNING_MEMORY:['skills','group','desk','reflection','er','archive'],CHEN_6F_PROCEDURAL_REPLAY:['desk','station','wheelchair','dispatch'],ZHANG_6F_ACCIDENT_MEMORY:['reflection','wheelchair','er','skills','storage']});
const SCENE_PHOTO=Object.freeze({office:'archive',duty:'desk',er:'er',security:'reflection',skills:'skills',bridge:'wheelchair',elevator:'skills',map:'storage',static:'storage',corridor:'archive'});
export function mediaPresentation(sequence,identity){
  const album=sharedAlbum(sequence.id,identity);
  if(album)return sequence.sharedMedia?sequence:{...album,mode:sequence.mode,frames:sequence.frames.map((_,i)=>photoFrame(LEGACY_MEDIA[sequence.id][1][i%LEGACY_MEDIA[sequence.id][1].length],identity))};
  // Keep the playback object/callback outside this presentation copy unchanged.
  return {...sequence,title:sharedText(sequence.title),source:sequence.sharedMedia?sharedText(sequence.source):'場景照片／記憶重建｜非原始連續影像',
    frames:sequence.frames.map((f,i)=>{
      const key=f.photo||M6_PHOTOS[sequence.id]?.[i]||SCENE_PHOTO[f.scene]||'archive';
      return {...f,photo:key,people:[],stamp:sharedText(f.stamp),title:sharedText(f.title),caption:SHARED_PHOTOS[key].caption,
        narration:sequence.sharedMedia?sharedText(f.narration):sharedText([f.caption,f.narration].filter(Boolean).join('\n'))};
    })};
}
export function sharedPosterCommentary(poster,identity){
  const approach={ZHANG:'公告不能取代對現場與人的確認。',LI:'我先看公告適用範圍與版本，不把張貼本身當成授權。',ZHOU:'先記下文字原意，不能為了找暗示忽略正在發生的事。',CHEN:'我會確認這份公告在兩端是否適用，不直接把上一站的規則帶過來。'};
  return `${poster.shortTitle}。${approach[identity]||'以現場查證為準。'}`;
}
