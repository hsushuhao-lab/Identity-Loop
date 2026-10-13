// Independent, run-scoped exploration. Never changes identities, doors or story time.
export const ECHO_STATIONS=Object.freeze([
  Object.freeze({id:'paper',title:'西室・複寫回聲',description:'驗收單旁的空白複寫帶。記錄器能留下壓痕的擦動聲；這些聲紋沒有姓名，也不是火災證據。',record:'紙面沒有移動，耳機裡卻有一次翻頁。你將這段觀察另存，沒有補填原件。',echo:'回送的擦紙聲停了，壓痕卻在下一張空白紙上留下雙線。'}),
  Object.freeze({id:'relay',title:'東室・接點回聲',description:'獨立檢修回路的回傳接點，與主電源及門禁分離。只檢查這段測試線路。',record:'指示燈與敲擊的節拍相差半拍。你記下差異，沒有改動原驗收結論。',echo:'燈仍寫著「回傳關閉」，記錄器卻收到剛才送出的三拍。'}),
  Object.freeze({id:'air',title:'北端・風道回聲',description:'檢修風道外側的收音口。記錄器只觀察聲音，不開關風機或擋板。',record:'風口有一段氣聲；最後一拍不像來自面前。你把聲紋保留在巡檢筆記。',echo:'回送後，氣聲從身後繞回。風道的測試狀態沒有因此改變。'})
]);
const ids=ECHO_STATIONS.map(s=>s.id),unique=a=>ids.filter(id=>Array.isArray(a)&&a.includes(id));
const fresh=runKey=>({version:1,runKey,recorder:false,filter:false,recorded:[],broadcast:[],filterAt:null,filed:false});
function restore(saved,runKey){
  const state=fresh(runKey);if(saved?.version!==1||saved.runKey!==runKey)return state;
  state.recorder=saved.recorder===true;if(!state.recorder)return state;
  state.recorded=unique(saved.recorded);state.broadcast=unique(saved.broadcast).filter(id=>state.recorded.includes(id));
  state.filter=saved.filter===true&&state.recorded.length>=2;
  state.filterAt=state.filter&&state.broadcast.includes(saved.filterAt)?saved.filterAt:null;
  state.filed=saved.filed===true&&state.recorded.length===ids.length;return state;
}
export class EchoSurvey {
  constructor({runKey,storage}={}){
    if(!['string','number'].includes(typeof runKey)||!String(runKey).length||(typeof runKey==='number'&&!Number.isFinite(runKey)))throw TypeError('A stable run key is required');
    this.storage=storage;this.key='IdentityLoop_Optional_EchoSurvey_v1:'+encodeURIComponent(String(runKey));this.state=fresh(String(runKey));this.persistence=Boolean(storage?.getItem&&storage?.setItem);
    try{this.state=restore(JSON.parse(storage?.getItem(this.key)||'null'),String(runKey));}catch{this.persistence=false;}
  }
  snapshot(){return structuredClone(this.state);}
  save(){try{this.storage?.setItem(this.key,JSON.stringify(this.state));}catch{this.persistence=false;}}
  reply(ok,text,changed=false){return{ok,text,changed,view:this.getView()};}
  getView(){
    const s=this.state,level=s.broadcast.length;
    const reactions=[
      '「三處接點可以任意順序走。只錄取也能交件；回送會讓環境留下訊號，你自己決定。」',
      '「檢修鐘多了一格。那不是院內標準時間，主線的時刻仍照原紀錄。」',
      '「回傳燈說關閉，耳機卻聽到了。把矛盾記下，別讓它替原件做證。」',
      '「三段都留住了。回到器材檯，你會聽見它們合在一起；聲音不是誰的身份。」'
    ];
    return {level,effectiveLevel:level-(s.filterAt?1:0),recorder:s.recorder,filter:s.filter,filterAt:s.filterAt,filed:s.filed,recordedCount:s.recorded.length,
      npcLine:reactions[level]+(s.filterAt?'「插片讓那一段安靜了，印子還在。需要時可以拔回，移到另一處。」':'')+(s.filed?'「巡檢回執已收好。原件沒有重寫，聲紋與空白都留在筆記裡。」':''),
      persistence:this.persistence,
      summary:`已錄取 ${s.recorded.length}/3　異變留存 ${level}/3　${s.filed?'巡檢已歸檔':'巡檢尚未歸檔'}`,
      stations:ECHO_STATIONS.map(p=>({...p,recorded:s.recorded.includes(p.id),broadcast:s.broadcast.includes(p.id),isolated:s.filterAt===p.id}))};
  }
  borrow(){if(this.state.recorder)return this.reply(true,'記錄器仍由你保管，不消耗電池。三處聲紋與筆記可以反覆查看。');this.state.recorder=true;this.save();return this.reply(true,'已借用調頻記錄器。先靠近任一接點錄取，再自行決定是否回送。',true);}
  takeFilter(){if(!this.state.recorder||this.state.recorded.length<2)return this.reply(false,'先用記錄器留下兩處觀察，再回來領取隔離插片。');if(this.state.filter)return this.reply(true,'隔離插片可以拔回、移接，不會耗盡。同時只能隔離一處。');this.state.filter=true;this.save();return this.reply(true,'已取得隔離插片。可在已回送的接點接上，減弱一段回聲；痕跡仍保留。',true);}
  record(id){const p=ECHO_STATIONS.find(p=>p.id===id);if(!p)return this.reply(false,'請靠近可見的巡檢接點。');if(!this.state.recorder)return this.reply(false,'先向入口的夜間技師借用調頻記錄器。');if(this.state.recorded.includes(id))return this.reply(true,p.record+' 既有聲紋仍可重播，沒有新的異變增加。');this.state.recorded=unique([...this.state.recorded,id]);this.save();return this.reply(true,p.record,true);}
  broadcast(id){const p=ECHO_STATIONS.find(p=>p.id===id);if(!p||!this.state.recorded.includes(id))return this.reply(false,'先在這個接點錄取聲紋。');if(this.state.broadcast.includes(id))return this.reply(true,'這處已留下回送訊號，反覆操作不會增加異變。');this.state.broadcast=unique([...this.state.broadcast,id]);this.save();return this.reply(true,p.echo+' 異變已留存；可繼續探索或隨時返回。',true);}
  isolate(id){if(!this.state.filter||!this.state.broadcast.includes(id))return this.reply(false,'需要隔離插片及這處已留存的回送訊號。');this.state.filterAt=this.state.filterAt===id?null:id;this.save();return this.reply(true,this.state.filterAt?'插片已接上。這段回聲減弱，記錄與異變痕跡仍在；舊位置的插片已收回。':'插片已拔回，可移接到其他接點。',true);}
  file(){if(this.state.recorded.length!==ids.length)return this.reply(false,'三處聲紋都錄取後，才能交回完整巡檢紀錄。回送不是交件條件。');if(this.state.filed)return this.reply(true,'巡檢已歸檔。聲紋與未確認的事情都可繼續回看。');this.state.filed=true;this.save();return this.reply(true,'三份觀察已歸檔。原件、聲紋與未確認事項分別保留；可返回原主線，之後再來也能繼續使用器材。',true);}
}
