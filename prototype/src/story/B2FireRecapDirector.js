// B2FireRecapDirector.js
// B2 terminal convergence cinematic. It reconstructs only what the recovered
// records support, then reveals that an unknown session is overwriting them now.

const B2_FIRE_BEATS=Object.freeze([
  Object.freeze({
    stamp:'1998.10.13 · 02:16:48',
    title:'警衛台後方的 B-Panel',
    body:'夜間門禁、排煙與防火門仍由舊式 B-Panel 控制。夜間警衛保管十字鑰匙；工務機電技師留下「紫色備援排煙」的工程警告。',
    evidence:'這不是都市傳說。B-Panel、十字鑰匙與紫色備援都存在於當晚的設備紀錄。',
    mode:'panel',cue:'lock'
  }),
  Object.freeze({
    stamp:'02:17:00',
    title:'錯誤程序被執行',
    body:'封存紀錄顯示，舊工務手冊的 1 → 3 → 4 程序會讓部分防火門鎖死，同時使備援排煙停止。監控在同一分鐘失去訊號。',
    evidence:'起火點在殘存資料中已無法完整還原；能確認的是，錯誤程序讓火災發生後的逃生與排煙條件急遽惡化。',
    mode:'blackout',cue:'beep'
  }),
  Object.freeze({
    stamp:'02:17 之後',
    title:'工務人員試圖恢復排煙',
    body:'工務機電技師最後被定位在 B2 地下排煙道通風口附近。紫色備援需要十字鑰匙與門禁權限，但系統已經開始鎖閉通道。',
    evidence:'他不是「無名氏」。他留下的工程警告，正是阻止當年錯誤重演的關鍵。',
    mode:'smoke',cue:'lock'
  }),
  Object.freeze({
    stamp:'火災封存底稿',
    title:'八個人被困在不同位置',
    body:'第一線住院醫師：4F 409-A 鐵床（約束中）；夜間總醫師：1F B-Panel；第二線住院醫師：1F–3F 逃生梯；第二院區支援醫師：空中天橋；夜間警衛：1F 警衛台；夜班護理師：4F 護理站；行政／文史人員：3F 文史室；工務機電技師：B2 排煙道。',
    evidence:'八個位置屬於同一場事故。這是事故底稿，而不是對目前值班者的身分鑑定。',
    mode:'map',cue:'paper'
  }),
  Object.freeze({
    stamp:'事故後',
    title:'院內紀錄開始失真',
    body:'六樓從現行院圖消失；409-A 仍像有效病床一樣殘留；夜班名冊被改動；照片遭刮除；工務機電技師一度只剩「無名病人」的殘缺索引。',
    evidence:'真正被封存的，不只是火災，而是誰在那一夜做了什麼、誰曾經存在。',
    mode:'redact',cue:'paper'
  }),
  Object.freeze({
    stamp:'現在 · B2',
    title:'UNKNOWN SESSION / OVERWRITE ACTIVE',
    body:'終端畫面上的姓名、員編與事故索引正在被重新塗黑。新的覆寫工作階段已經登入，但操作者身分被隱藏。',
    evidence:'有人正在再次覆蓋這一切。快離開 B2，把封存底稿與院史資料交叉核對，再完成最後交班。',
    mode:'overwrite',cue:'beep'
  })
]);

const B2_VICTIM_MAP=Object.freeze([
  Object.freeze({identity:'ZHANG',name:'張守恆',employeeId:'MED-870409',maskedId:'MED-87••••',role:'第一線住院醫師',position:'4F 409-A 鐵床（約束中）'}),
  Object.freeze({identity:'LI',name:'李承禮',employeeId:'MED-820316',maskedId:'MED-82••••',role:'夜間總醫師',position:'1F B-Panel'}),
  Object.freeze({identity:'ZHOU',name:'周啟文',employeeId:'MED-880217',maskedId:'MED-88••••',role:'第二線住院醫師',position:'1F–3F 逃生梯'}),
  Object.freeze({identity:'CHEN',name:'陳柏勳',employeeId:'MED-890605',maskedId:'MED-89••••',role:'第二院區支援醫師',position:'空中天橋'}),
  Object.freeze({identity:null,name:'王世榮',employeeId:'SEC-760117',role:'夜間警衛',position:'1F 警衛台'}),
  Object.freeze({identity:null,name:'林婉真',employeeId:'NUR-900033',role:'夜班護理師',position:'4F 護理站'}),
  Object.freeze({identity:null,name:'謝玉琴',employeeId:'ADM-851104',role:'行政／文史人員',position:'3F 文史室'}),
  Object.freeze({identity:null,name:'劉志遠',employeeId:'ENG-860214',role:'工務機電技師',position:'B2 排煙道'})
]);

// The recovered archive is objective evidence: every seed sees the identical record.
// Personal recognition belongs in route-specific memories, never in this map.
function buildVictimMap(){
  return B2_VICTIM_MAP.map(item=>
    `${item.name}／${item.employeeId}／${item.role}：${item.position}`
  ).join('；')+'。';
}

function buildVictimEvidence(){
  return '八人的姓名、職務與尋獲位置同時恢復。這份歷史名冊並未判定目前的值班者是其中哪一位；請將自己的現場經歷與獨立來源交叉核對。';
}

const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export class B2FireRecapDirector{
  constructor({soundManager=null}={}){
    this.soundManager=soundManager;
    this.active=false;
    this.advanceResolve=null;
    this.root=this.#build();
    this.keyHandler=event=>this.#onKey(event);
    document.addEventListener('keydown',this.keyHandler,true);
  }

  #build(){
    const style=document.createElement('style');
    style.id='b2-fire-recap-style';
    style.textContent=[
      '.b2-fire-recap{position:fixed;inset:0;z-index:25900;display:none;background:linear-gradient(180deg,#090b09 0%,#111411 46%,#080907 100%);color:#e7e0d2;font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;overflow:hidden}',
      '.b2-fire-recap.active{display:block}',
      '.b2-fire-recap::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 3px,rgba(220,235,222,.026) 3px 4px);pointer-events:none;animation:b2scan 7s linear infinite}',
      '@keyframes b2scan{to{transform:translateY(12px)}}',
      '.b2fr-vignette{position:absolute;inset:0;box-shadow:inset 0 0 190px rgba(0,0,0,.9);pointer-events:none}',
      '.b2fr-stage{position:absolute;inset:0;display:grid;grid-template-columns:minmax(320px,.9fr) minmax(480px,1.45fr);gap:5vw;align-items:center;padding:7vh 8vw;opacity:0;transform:translateY(12px);transition:.38s ease}',
      '.b2fr-stage.visible{opacity:1;transform:translateY(0)}',
      '.b2fr-visual{height:min(56vh,540px);position:relative;border:1px solid rgba(190,202,191,.22);background:#0b120f;overflow:hidden;box-shadow:0 28px 90px rgba(0,0,0,.48)}',
      '.b2fr-visual .label{position:absolute;left:22px;top:18px;color:#95ad9d;font:13px monospace;letter-spacing:.08em}',
      '.b2fr-visual .big{position:absolute;left:24px;right:24px;bottom:30px;font:600 clamp(28px,3vw,52px) monospace;color:#d9d4c8;line-height:1.12;white-space:pre-line}',
      '.b2fr-visual .line{position:absolute;left:10%;right:10%;height:2px;background:rgba(142,171,151,.32)}',
      '.b2fr-visual.blackout{background:#030403}.b2fr-visual.smoke{background:radial-gradient(circle at 60% 70%,rgba(126,77,46,.24),transparent 36%),linear-gradient(180deg,#111411,#060706)}',
      '.b2fr-visual.redact .bar,.b2fr-visual.overwrite .bar{position:absolute;left:12%;right:12%;height:8%;background:#020202;box-shadow:0 0 16px rgba(0,0,0,.7)}',
      '.b2fr-visual.overwrite{background:radial-gradient(circle at 55% 50%,rgba(119,26,21,.25),transparent 42%),#090b09;animation:b2warn .7s steps(2,end) infinite}',
      '@keyframes b2warn{50%{filter:brightness(1.22)}}',
      '.b2fr-copy .stamp{font:600 15px monospace;color:#9db4a4;letter-spacing:.08em;margin-bottom:10px}',
      '.b2fr-copy h1{font-family:Georgia,"Noto Serif TC","PMingLiU",serif;font-weight:500;font-size:clamp(34px,4.1vw,68px);line-height:1.14;margin:0 0 24px}',
      '.b2fr-copy .body{font-size:clamp(17px,1.42vw,23px);line-height:1.95;color:#d8d2c7}',
      '.b2fr-copy .evidence{margin-top:28px;padding:17px 20px;border-left:3px solid #8f7359;background:rgba(79,59,43,.18);color:#ddc6a7;line-height:1.7}',
      '.b2fr-progress{position:absolute;left:8vw;right:8vw;bottom:5vh;display:flex;gap:7px}.b2fr-dot{height:3px;flex:1;background:#29312c}.b2fr-dot.done{background:#75877a}.b2fr-dot.current{background:#c29a68}',
      '.b2fr-help{position:absolute;right:8vw;bottom:2.3vh;color:#6f7972;font:12px monospace;letter-spacing:.08em}',
      '@media(max-width:780px){.b2fr-stage{grid-template-columns:1fr;gap:3vh;padding:6vh 7vw}.b2fr-visual{height:30vh}}'
    ].join('\n');
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.id='b2-fire-recap';
    root.className='b2-fire-recap';
    root.innerHTML='<div class="b2fr-vignette"></div><div class="b2fr-stage"></div><div class="b2fr-progress"></div><div class="b2fr-help">E / SPACE：繼續</div>';
    document.body.appendChild(root);
    return root;
  }

  #onKey(event){
    if(!this.active)return;
    if(!['KeyE','Space','Enter'].includes(event.code)||event.repeat)return;
    event.preventDefault();
    event.stopImmediatePropagation?.();
    this.advanceResolve?.();
  }

  #cue(kind){
    const s=this.soundManager;
    if(!s)return;
    if(kind==='lock')s.playDoorLockClack?.();
    else if(kind==='paper')s.playPaperSign?.();
    else s.playComputerBeep?.();
  }

  #visual(beat){
    const v=document.createElement('div');
    v.className='b2fr-visual '+beat.mode;
    const label=document.createElement('div');label.className='label';label.textContent='B2 / ARCHIVE FIRE RECORD';
    const big=document.createElement('div');big.className='big';
    const titles={
      panel:'B-PANEL / EXHAUST',
      blackout:'02:17:00 / SIGNAL LOST',
      smoke:'PURPLE BACKUP / ACCESS DENIED',
      map:'8 FINAL LOCATIONS',
      redact:'ARCHIVE REDACTION',
      overwrite:'UNKNOWN SESSION\nOVERWRITE ACTIVE'
    };
    big.textContent=titles[beat.mode]||beat.title;
    v.append(label,big);
    for(let i=0;i<4;i++){
      const line=document.createElement('span');line.className='line';line.style.top=(24+i*13)+'%';line.style.opacity=String(.58-i*.08);v.appendChild(line);
    }
    if(['redact','overwrite'].includes(beat.mode)){
      for(let i=0;i<4;i++){
        const bar=document.createElement('span');bar.className='bar';bar.style.top=(24+i*14)+'%';bar.style.transform='translateX('+(i%2?7:-5)+'%)';v.appendChild(bar);
      }
    }
    return v;
  }

  async #showBeat(beat,index,total){
    const stage=this.root.querySelector('.b2fr-stage');
    const progress=this.root.querySelector('.b2fr-progress');
    progress.replaceChildren();
    for(let i=0;i<total;i++){
      const dot=document.createElement('span');
      dot.className='b2fr-dot '+(i<index?'done':i===index?'current':'');
      progress.appendChild(dot);
    }

    stage.className='b2fr-stage';
    stage.replaceChildren();
    stage.appendChild(this.#visual(beat));

    const copy=document.createElement('div');copy.className='b2fr-copy';
    const stamp=document.createElement('div');stamp.className='stamp';stamp.textContent=beat.stamp;
    const title=document.createElement('h1');title.textContent=beat.title;
    const body=document.createElement('div');body.className='body';body.textContent=beat.body;
    const evidence=document.createElement('div');evidence.className='evidence';evidence.textContent=beat.evidence;
    copy.append(stamp,title,body,evidence);stage.appendChild(copy);

    this.#cue(beat.cue);
    void stage.offsetWidth;stage.classList.add('visible');
    await new Promise(resolve=>{
      const timer=setTimeout(resolve,4300);
      this.advanceResolve=()=>{clearTimeout(timer);resolve();};
    });
    this.advanceResolve=null;
    stage.classList.remove('visible');
    await wait(220);
  }

  async play({onComplete,hiddenIdentity=null}={}){
    if(this.active)return false;
    this.active=true;
    document.exitPointerLock?.();
    this.root.classList.add('active');
    const beats=B2_FIRE_BEATS.map(beat=>beat.mode==='map'
      ? {...beat,body:buildVictimMap(),evidence:buildVictimEvidence()}
      : beat
    );
    for(let i=0;i<beats.length;i++)await this.#showBeat(beats[i],i,beats.length);
    this.root.classList.remove('active');
    this.active=false;
    onComplete?.();
    return true;
  }

  destroy(){
    document.removeEventListener('keydown',this.keyHandler,true);
    this.root?.remove();
    document.getElementById('b2-fire-recap-style')?.remove();
  }
}

export {B2_FIRE_BEATS,buildVictimMap};
