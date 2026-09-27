// ActPresentationDirector.js — isolated three-act presentation layer.
import {ART_PASS2,preloadArtPass2Image} from '../art/ArtPass2Assets.js';
// Watches existing story flags; does not own story progression or modify M1–M9 state.

const KEYS=Object.freeze({
  opening:'IdentyLoop_OpeningPresentationSeen',
  act2:'IdentyLoop_Act2CardSeen',
  act3:'IdentyLoop_Act3CardSeen',
  outro:'IdentyLoop_SuccessOutroSeen'
});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const seen=key=>{try{return window.sessionStorage?.getItem(key)==='1';}catch{return false;}};
const mark=key=>{try{window.sessionStorage?.setItem(key,'1');}catch{}};

export class ActPresentationDirector {
  constructor({gameState,persistentMemory,controller,pointerElement,getZoneId}={}){
    Object.assign(this,{gameState,persistentMemory,controller,pointerElement,getZoneId});
    this.active=false;
    this.destroyed=false;
    this.outroScheduled=false;
    this.openingSeen=seen(KEYS.opening);
    this.act2Seen=seen(KEYS.act2);
    this.act3Seen=seen(KEYS.act3);
    this.outroSeen=seen(KEYS.outro);
    this.qaMode=this.isQaMode();
    this.overlay=this.buildOverlay();
    this.keyHandler=event=>this.onKeyDown(event);
    document.addEventListener('keydown',this.keyHandler,true);
  }

  isQaMode(){
    const p=new URLSearchParams(location.search);
    return Boolean(p.get('qa')||p.get('zone')||p.get('spawn')||p.get('cam')||p.get('capture'));
  }

  buildOverlay(){
    const style=document.createElement('style');
    style.id='three-act-presentation-style';
    style.textContent=[
      '.act-presentation{position:fixed;inset:0;z-index:24000;display:none;color:#ece6d8;font-family:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif;background:radial-gradient(circle at 78% 20%,rgba(110,134,116,.16),transparent 33%),linear-gradient(135deg,#161815 0%,#23251f 48%,#121412 100%);overflow:hidden;user-select:none}',
      '.act-presentation.active{display:block}',
      '.act-presentation.warm{background:radial-gradient(circle at 78% 20%,rgba(181,157,111,.20),transparent 35%),radial-gradient(circle at 14% 82%,rgba(97,126,105,.13),transparent 42%),linear-gradient(135deg,#25251f 0%,#343128 52%,#1b1e1a 100%)}',
      '.act-presentation.horror{background:radial-gradient(circle at 72% 22%,rgba(25,108,77,.20),transparent 34%),linear-gradient(135deg,#07110e 0%,#101d17 47%,#050806 100%)}',
      '.act-presentation.dawn{background:radial-gradient(circle at 72% 16%,rgba(228,177,115,.25),transparent 33%),linear-gradient(180deg,#17262c 0%,#263b3c 48%,#7b6651 100%)}',
      '.act-film-grain{position:absolute;inset:-30%;opacity:.10;pointer-events:none;background-image:repeating-radial-gradient(circle at 17% 33%,#fff 0 1px,transparent 1px 4px);mix-blend-mode:soft-light;animation:act-grain .22s steps(2) infinite}',
      '@keyframes act-grain{0%{transform:translate(0,0)}25%{transform:translate(2%,-1%)}50%{transform:translate(-1%,2%)}75%{transform:translate(1%,1%)}100%{transform:translate(-2%,-1%)}}',
      '.act-scanline{position:absolute;left:0;right:0;height:2px;top:-4px;background:rgba(163,214,183,.18);opacity:0}',
      '.act-presentation.horror .act-scanline{opacity:1;animation:act-scan 2.8s linear infinite}',
      '@keyframes act-scan{to{transform:translateY(100vh)}}',
      '.act-vignette{position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 180px rgba(0,0,0,.82)}',
      '.act-card{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:7vh 8vw;opacity:0;transform:scale(1.018);transition:opacity .55s ease,transform .8s ease}',
      '.act-art-backdrop{position:absolute;inset:-7%;width:114%;height:114%;object-fit:cover;object-position:50% 72%;filter:saturate(.78) contrast(1.12) brightness(.72);animation:act-kenburns 11s ease-out forwards;pointer-events:none}',
      '.act-art-scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(5,9,10,.72) 0%,rgba(7,10,9,.32) 35%,rgba(8,10,9,.54) 72%,rgba(4,5,5,.82) 100%),radial-gradient(circle at 50% 55%,transparent 20%,rgba(0,0,0,.46) 100%);pointer-events:none}',
      '.act-card.has-art>*:not(.act-art-backdrop):not(.act-art-scrim){position:relative;z-index:2}',
      '.act-card.has-art .act-campus,.act-card.has-art .act-route span,.act-card.has-art .act-quote{backdrop-filter:blur(5px);background:rgba(7,12,10,.64);border-color:rgba(226,210,175,.38)}',
      '@keyframes act-kenburns{from{transform:scale(1.02) translate3d(0,0,0)}to{transform:scale(1.10) translate3d(-1.2%,-1.1%,0)}}',
      '.act-card.visible{opacity:1;transform:scale(1)}',
      '.act-kicker{letter-spacing:.34em;text-transform:uppercase;font-size:clamp(12px,1.2vw,18px);color:#91b09e;margin-bottom:18px}',
      '.warm .act-kicker{color:#d2bc8e}.dawn .act-kicker{color:#f0c992}',
      '.act-title{font-family:Georgia,"Noto Serif TC","PMingLiU",serif;font-size:clamp(38px,6vw,92px);line-height:1.05;letter-spacing:.06em;font-weight:500;text-align:center;margin:0 0 20px;text-shadow:0 3px 30px rgba(0,0,0,.45)}',
      '.act-subtitle{max-width:920px;text-align:center;line-height:1.9;font-size:clamp(16px,1.5vw,24px);color:#d8d4c9;white-space:pre-line}',
      '.act-campus-grid{display:grid;grid-template-columns:repeat(3,minmax(190px,1fr));gap:16px;width:min(980px,88vw);margin-top:28px}',
      '.act-campus{border:1px solid rgba(218,208,179,.28);background:rgba(13,16,14,.34);padding:20px 22px;min-height:128px;box-shadow:0 18px 55px rgba(0,0,0,.22)}',
      '.act-campus strong{display:block;color:#e9dfc7;font-size:20px;margin-bottom:9px}.act-campus small{display:block;color:#aeb9ae;line-height:1.7;font-size:14px}',
      '.act-route{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:30px;max-width:1050px}.act-route span{border:1px solid rgba(222,211,181,.25);padding:10px 15px;background:rgba(0,0,0,.22);font-size:15px}.act-route b{color:#b8a671;font-weight:400}',
      '.act-quote{margin-top:34px;padding:20px 26px;max-width:840px;border-left:3px solid #ad986a;background:rgba(0,0,0,.22);font-family:Georgia,"Noto Serif TC",serif;font-size:clamp(17px,1.5vw,23px);line-height:1.8;color:#e5dcc9}',
      '.act-corner{position:absolute;right:28px;bottom:22px;font-size:12px;color:#88948c;letter-spacing:.12em}',
      '.act-progress{position:absolute;left:0;bottom:0;height:3px;width:0;background:#af9c70}.horror .act-progress{background:#62a680}.dawn .act-progress{background:#e9b878}',
      '.act-glitch{animation:act-glitch .34s steps(2) 2}@keyframes act-glitch{0%{transform:translate(0)}25%{transform:translate(-7px,2px);filter:hue-rotate(12deg)}50%{transform:translate(5px,-2px)}75%{transform:translate(-2px,3px)}100%{transform:translate(0)}}',
      '.act-credits{width:min(900px,86vw);text-align:center;animation:act-credit-rise 10s linear forwards}@keyframes act-credit-rise{from{transform:translateY(34vh);opacity:0}9%{opacity:1}to{transform:translateY(-40vh);opacity:1}}',
      '.act-credits h2{font-family:Georgia,"Noto Serif TC",serif;font-size:clamp(40px,6vw,82px);font-weight:500;letter-spacing:.08em;margin:0 0 30px}.act-credits p{font-size:16px;line-height:2;color:#e4ddd0;margin:10px 0}.act-credits .credit-name{font-size:26px;color:#f1d19b;margin:24px 0}',
      '.act-final-lockup{font-family:Georgia,"Noto Serif TC",serif;font-size:clamp(28px,4vw,58px);letter-spacing:.08em;text-align:center}',
      '@media(max-width:760px){.act-campus-grid{grid-template-columns:1fr;gap:10px}.act-campus{min-height:auto;padding:14px 16px}.act-card{padding:7vh 6vw}}'
    ].join('\n');
    document.head.appendChild(style);

    const root=document.createElement('div');
    root.className='act-presentation';
    root.id='act-presentation';
    root.setAttribute('aria-live','polite');
    root.innerHTML=[
      '<div class="act-film-grain"></div>',
      '<div class="act-scanline"></div>',
      '<div class="act-vignette"></div>',
      '<div class="act-card"></div>',
      '<div class="act-progress"></div>',
      '<div class="act-corner">E / SPACE 跳過</div>'
    ].join('');
    document.body.appendChild(root);
    return root;
  }

  blocked(){
    return Boolean(document.querySelector('.modal-overlay.active,.cutscene-overlay.active'));
  }

  onKeyDown(event){
    if(!this.active)return;
    if(!['KeyE','Space','Escape','Enter'].includes(event.code))return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    this.skipRequested=true;
    this.advanceResolve?.();
  }

  lock(){
    this.originalControllerEnabled=this.controller?.enabled!==false;
    this.controller?.cancelAutoMove?.();
    if(this.controller)this.controller.enabled=false;
    document.exitPointerLock?.();
  }

  unlock(){
    if(this.controller&&this.originalControllerEnabled)this.controller.enabled=true;
    if(this.pointerElement&&this.controller?.enabled&&!this.blocked()&&document.pointerLockElement!==this.pointerElement){
      setTimeout(()=>{
        try{const result=this.pointerElement.requestPointerLock?.();result?.catch?.(()=>{});}catch{}
      },80);
    }
  }

  setCard(card){
    const root=this.overlay;
    const target=root.querySelector('.act-card');
    const progress=root.querySelector('.act-progress');
    root.className='act-presentation active '+(card.theme||'warm');
    target.className='act-card'+(card.glitch?' act-glitch':'')+(card.art?' has-art':'');
    target.replaceChildren();

    if(card.art){
      const art=document.createElement('img');
      art.className='act-art-backdrop';
      art.src=card.art;
      art.alt='';
      art.setAttribute('aria-hidden','true');
      if(card.artPosition)art.style.objectPosition=card.artPosition;
      const scrim=document.createElement('div');
      scrim.className='act-art-scrim';
      target.append(art,scrim);
    }

    const kicker=document.createElement('div');
    kicker.className='act-kicker';
    kicker.textContent=card.kicker||'';
    target.appendChild(kicker);

    const title=document.createElement('h1');
    title.className='act-title';
    title.textContent=card.title||'';
    target.appendChild(title);

    if(card.subtitle){
      const subtitle=document.createElement('div');
      subtitle.className='act-subtitle';
      subtitle.textContent=card.subtitle;
      target.appendChild(subtitle);
    }

    if(card.kind==='campus'){
      const grid=document.createElement('div');
      grid.className='act-campus-grid';
      [
        ['第一院區','3F 行政與 316\n4F 病房與值班室\n2F 急診支援'],
        ['8F 天橋','跨院區連通\n夜間需依通知開放權限'],
        ['第二院區','有支援需求時前往\n先到護理站報到']
      ].forEach(([name,copy])=>{
        const box=document.createElement('div');
        box.className='act-campus';
        const strong=document.createElement('strong');strong.textContent=name;
        const small=document.createElement('small');small.textContent=copy;
        box.append(strong,small);grid.appendChild(box);
      });
      target.appendChild(grid);
    }

    if(card.kind==='route'){
      const route=document.createElement('div');route.className='act-route';
      ['3F 完成交班','4F 護理站報到','病房值班','有電話再支援','留下完整紀錄'].forEach((step,index)=>{
        if(index){const arrow=document.createElement('b');arrow.textContent='→';route.appendChild(arrow);}
        const span=document.createElement('span');span.textContent=step;route.appendChild(span);
      });
      target.appendChild(route);
    }

    if(card.quote){
      const quote=document.createElement('div');quote.className='act-quote';quote.textContent=card.quote;target.appendChild(quote);
    }

    void target.offsetWidth;target.classList.add('visible');
    progress.style.transition='none';progress.style.width='0%';void progress.offsetWidth;
    progress.style.transition='width '+card.duration+'ms linear';progress.style.width='100%';
  }

  async showCard(card){
    this.setCard(card);
    const target=this.overlay.querySelector('.act-card');
    await new Promise(resolve=>{
      const timer=setTimeout(resolve,card.duration||2200);
      this.advanceResolve=()=>{clearTimeout(timer);resolve();};
    });
    this.advanceResolve=null;
    target.classList.remove('visible');
    await delay(this.skipRequested?40:320);
  }

  async run(sequence){
    if(this.active||this.destroyed)return false;
    this.active=true;this.skipRequested=false;this.lock();
    try{
      for(const card of sequence){
        if(this.skipRequested)break;
        await this.showCard(card);
      }
    }finally{
      this.overlay.classList.remove('active');
      this.unlock();
      this.active=false;this.advanceResolve=null;this.skipRequested=false;
    }
    return true;
  }

  async playOpening(){
    if(this.openingSeen||this.qaMode||this.active)return false;
    this.openingSeen=true;mark(KEYS.opening);
    await preloadArtPass2Image('opening').catch(error=>console.warn('[artpass2] opening art preload failed',error));
    return this.run([
      {
        theme:'warm',
        art:ART_PASS2.opening,
        artPosition:'50% 72%',
        kicker:'ACT I · 正常值班',
        title:'青嶺醫療中心｜17:00',
        subtitle:'雨後的院區剛亮起夜燈。今晚從第一院區三樓行政區開始。\n先完成交班，再去四樓接手病房。',
        duration:3200
      },
      {
        theme:'warm',
        art:ART_PASS2.opening,
        artPosition:'48% 66%',
        kicker:'院區簡介',
        title:'兩個院區，一條夜間動線',
        kind:'campus',
        duration:3600
      },
      {
        theme:'warm',
        kicker:'值班工作',
        title:'其實就是一個普通夜班',
        kind:'route',
        subtitle:'先把眼前的工作做好。病房、急診、電話支援——其他事情，照院內流程處理就好。',
        duration:3000
      },
      {
        theme:'warm',
        kicker:'今晚第一件事',
        title:'去 316 完成交班',
        quote:'學長：「我先走了，316 鎖著。你自己想辦法進去，把今晚的交班做完吧。」',
        subtitle:'17:00，夜班開始。',
        duration:2700
      }
    ]);
  }

  playAct2(){
    if(this.act2Promise)return this.act2Promise;
    if(this.act2Seen||this.qaMode||this.active)return Promise.resolve(false);
    this.act2Seen=true;mark(KEYS.act2);
    this.act2Promise=this.run([
      {theme:'horror',kicker:'ACT II · 21:17 之後',title:'記錄開始對不上',subtitle:'同一個時間，留下不同的紀錄。\n同一個空間，開始出現不該存在的痕跡。',glitch:true,duration:3300},
      {theme:'horror',kicker:'夜班仍在繼續',title:'不要急著相信答案',subtitle:'21:17、316、409、00:33。\n線索會彼此矛盾，但每一個矛盾都在指向同一件事。',duration:2900}
    ]);
    return this.act2Promise;
  }

  playAct3(){
    if(this.act3Seen||this.qaMode||this.active)return Promise.resolve(false);
    this.act3Seen=true;mark(KEYS.act3);
    return this.run([
      {theme:'horror',kicker:'ACT III · 紀錄覆寫',title:'把自己的名字留下來',subtitle:'你現在要證明的，不是「今晚誰應該值班」。\n而是——你到底是誰。',glitch:true,duration:3600}
    ]);
  }

  scheduleSuccessOutro(){
    if(this.outroSeen||this.qaMode||this.outroScheduled)return;
    this.outroScheduled=true;
    setTimeout(()=>{
      if(this.destroyed||this.outroSeen)return;
      this.outroSeen=true;mark(KEYS.outro);
      void this.playSuccessOutro();
    },6200);
  }

  async playSuccessOutro(){
    if(this.active||this.qaMode)return false;
    this.active=true;this.skipRequested=false;this.lock();
    try{
      this.overlay.className='act-presentation active dawn';
      const card=this.overlay.querySelector('.act-card');
      const progress=this.overlay.querySelector('.act-progress');
      const corner=this.overlay.querySelector('.act-corner');
      progress.style.transition='width 12500ms linear';progress.style.width='100%';
      card.className='act-card visible';

      const credits=document.createElement('div');credits.className='act-credits';
      [
        ['div','act-kicker','04:09｜316'],
        ['h2','', 'DUTY NIGHT'],
        ['p','', 'OFFICIAL SHIFT COMPLETED'],
        ['p','credit-name','張守恆　MED-870409'],
        ['p','', '409-A PATIENTIZATION ORDER — INVALIDATED'],
        ['p','', '歷史覆寫 — REVOKED'],
        ['p','', '八名罹難者姓名 — RESTORED TO RECORD'],
        ['p','', '林婉真：「張醫師……天亮了。辛苦了。」'],
        ['p','', '「這一班，你可以交了。」']
      ].forEach(([tag,className,text])=>{
        const el=document.createElement(tag);if(className)el.className=className;el.textContent=text;credits.appendChild(el);
      });
      card.replaceChildren(credits);

      await new Promise(resolve=>{
        const timer=setTimeout(resolve,10500);
        this.advanceResolve=()=>{clearTimeout(timer);resolve();};
      });
      this.advanceResolve=null;
      card.classList.remove('visible');await delay(350);
      card.replaceChildren();

      const kicker=document.createElement('div');kicker.className='act-kicker';kicker.textContent='END OF SHIFT';
      const final=document.createElement('div');final.className='act-final-lockup';final.textContent='同樣的值班，不同的自己。';
      const sub=document.createElement('div');sub.className='act-subtitle';sub.style.marginTop='28px';sub.textContent='夜班迴廊';
      card.append(kicker,final,sub);card.className='act-card visible';
      corner.textContent='E / ESC 返回交班紀錄';

      await new Promise(resolve=>{this.advanceResolve=resolve;});
      this.advanceResolve=null;
      corner.textContent='E / SPACE 跳過';
      this.overlay.classList.remove('active');
      // Successful ending intentionally leaves gameplay controls disabled.
    }finally{
      this.active=false;this.advanceResolve=null;this.skipRequested=false;
    }
    return true;
  }

  update(){
    if(this.destroyed||this.qaMode)return;

    if(this.gameState?.getFlag('GAME_COMPLETE')){
      if(!this.gameState?.getFlag('FINAL_SUCCESS_RECAP_MANAGED'))this.scheduleSuccessOutro();
      return;
    }

    if(!this.openingSeen){
      const fresh=(this.persistentMemory?.data?.loopCount||0)===0;
      const openingZone=(this.getZoneId?.()||'')==='first_campus_3f';
      if(fresh&&openingZone&&!this.blocked())void this.playOpening();
      return;
    }

    if(!this.act3Seen&&(this.gameState?.getFlag('M8_IDENTITY_BATTLE_ACTIVE')||this.gameState?.getFlag('M8_CODE_BLACK_ANNOUNCED'))){
      if(!this.blocked())void this.playAct3();
      return;
    }

    if(!this.act2Seen&&this.gameState?.getFlag('CG_21_17_DUTY_ROOM_ACTIVATION_PLAYED')){
      if(!this.blocked())void this.playAct2();
    }
  }

  destroy(){
    this.destroyed=true;
    document.removeEventListener('keydown',this.keyHandler,true);
    this.overlay?.remove();
    document.getElementById('three-act-presentation-style')?.remove();
  }
}
