import {ECHO_STATIONS} from '../optional/EchoSurvey.js';

export class EchoSurveyPanel {
  constructor({quest,controller,worldRouter,canOptIn,uiManager,mainline,returnToMainline}){
    Object.assign(this,{quest,controller,worldRouter,canOptIn,uiManager,mainline,returnToMainline});this.active=false;
    this.root=document.createElement('section');this.root.id='echo-survey-panel';this.root.className='modal-overlay';
    this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','回聲巡檢');document.body.append(this.root);
    document.addEventListener('keydown',e=>{if(this.active&&e.code==='Escape'){e.stopImmediatePropagation();this.close();}},true);
  }
  open(target='overview'){
    if(this.active)return true;
    if(!this.canOptIn()){this.uiManager.showSubtitle('現場','先完成眼前的對話或緊急事件，再使用巡檢器材。',2500);return false;}
    if(!['first_campus_4f','ward_service_annex'].includes(this.worldRouter.activeZoneId))return false;
    this.target=target;this.previousEnabled=this.controller.enabled;this.active=true;this.controller.enabled=false;this.controller.resetInput();document.exitPointerLock?.();this.root.classList.add('active');
    this.worldRouter.activeZoneInstance.echoSurveyVisual?.gesture();this.render();this.root.querySelector('[data-echo-close]').focus();return true;
  }
  close({restore=true}={}){if(!this.active)return;this.active=false;this.confirming=false;this.root.classList.remove('active');if(restore){this.controller.enabled=this.previousEnabled;this.controller.requestPointerLock();}}
  apply(action,id){
    const result=this.quest[action](id);this.confirming=false;
    const visual=this.worldRouter.activeZoneInstance.echoSurveyVisual;visual?.sync();visual?.gesture();
    if(result.ok&&['record','broadcast'].includes(action))visual?.replay(id);
    this.render(result.text);
  }
  render(message=''){
    const v=this.quest.getView(),point=ECHO_STATIONS.find(p=>p.id===this.target),state=v.stations.find(p=>p.id===this.target);
    this.root.innerHTML='<div class="hospital-shell echo-shell"><header><div><small>FIELD / 獨立檢修回路</small><h2>回聲巡檢</h2></div><button data-echo-close>收起</button></header><div class="hospital-content"><p data-echo-summary></p><div class="echo-tools" data-echo-tools></div><h3 data-echo-title></h3><p data-echo-text></p><div data-echo-actions></div><p data-echo-status role="status"></p><details><summary>巡檢筆記・已讀聲紋可回看</summary><div data-echo-notes></div></details><p class="case-mainline-hint"></p></div></div>';
    const get=s=>this.root.querySelector(s),actions=get('[data-echo-actions]');
    get('[data-echo-summary]').textContent=v.summary;
    get('[data-echo-tools]').textContent=`調頻記錄器：${v.recorder?'已借用・不耗盡':'尚未借用'}　隔離插片：${v.filter?'可拔回移接':'尚未領取'}`+(v.persistence?'':'　瀏覽器存檔受限，重整會丟失本次巡檢。');
    get('[data-echo-title]').textContent=point?.title||(this.target==='technician'?'夜間技師':'4F・巡檢回執盒');
    get('[data-echo-text]').textContent=point?point.description: this.target==='technician'?v.npcLine:'儲藏室後方的檢修廊，留著三處獨立收音接點。可任意順序調查、只錄取不回送，也可隨時返回原主線。入口的夜間技師保管記錄器。';
    const button=(label,key,fn,disabled=false)=>{const b=document.createElement('button');b.dataset.echoAction=key;b.textContent=label;b.disabled=disabled;b.onclick=fn;actions.append(b);return b;};
    if(this.target==='technician'){
      button(v.recorder?'詢問記錄器用法':'借用調頻記錄器','borrow',()=>this.apply('borrow'));
      button(v.filter?'詢問隔離插片用法':'領取可移接的隔離插片','filter',()=>this.apply('takeFilter'),v.recordedCount<2);
      button(v.filed?'查看已歸檔巡檢':'交回三份巡檢紀錄','file',()=>this.apply('file'),v.recordedCount<3);
    }else if(point){
      if(this.confirming){
        get('[data-echo-text]').textContent='回送會在這處留下持久異變，最多三處。只錄取也能完成巡檢；不會改動門禁、風機、主線時間或身份。是否送出？';
        button('確認回送一次','confirm',()=>this.apply('broadcast',point.id));button('取消，保留聲紋','cancel',()=>{this.confirming=false;this.render('沒有送出訊號，環境保持原樣。');});
      }else{
        button(state.recorded?'重看已錄聲紋':'用記錄器錄取','record',()=>this.apply('record',point.id),!v.recorder);
        button(state.broadcast?'回送已留存・不重複增加':'回送短脈衝，留下異變','broadcast',()=>{this.confirming=true;this.render();},!state.recorded||state.broadcast);
        if(v.filter)button(state.isolated?'拔回隔離插片':'將隔離插片接到這處','isolate',()=>this.apply('isolate',point.id),!state.broadcast);
      }
    }
    if(this.worldRouter.activeZoneId==='ward_service_annex')button('收起並返回4F主線','return',()=>this.returnToMainline());
    get('[data-echo-status]').textContent=message;
    for(const p of v.stations){const note=document.createElement('p');note.textContent=p.title+'：'+(p.recorded?p.record:'尚未錄取')+(p.broadcast?'　'+p.echo:'')+(p.isolated?'　隔離插片已接上。':'');get('[data-echo-notes]').append(note);}
    get('.case-mainline-hint').textContent='可隨時收起器材、返回4F。主線目前目標：'+this.mainline();get('[data-echo-close]').onclick=()=>this.close();
  }
}
