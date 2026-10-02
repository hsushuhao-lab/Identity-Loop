import {soundManager} from '../audio/SoundManager.js';

export class SignalLedgerPanel {
  constructor({quest,controller,worldRouter,canOptIn,mainline,uiManager}) {
    Object.assign(this,{quest,controller,worldRouter,canOptIn,mainline,uiManager});this.active=false;
    this.root=document.createElement('section');this.root.id='signal-ledger-panel';this.root.className='modal-overlay';
    this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','交班訊號缺頁');document.body.append(this.root);
    document.addEventListener('keydown',e=>{if(this.active&&e.code==='Escape'){e.stopImmediatePropagation();this.close();}},true);
    window.addEventListener('pagehide',()=>this.quest.leave());
  }
  open(point) {
    if(this.active)return true;
    const result=this.quest.enter({zoneId:this.worldRouter.activeZoneId,canOptIn:this.canOptIn()});
    if(!result.ok){this.uiManager.showSubtitle('值班醫師',result.text,2500);return false;}
    this.previousEnabled=this.controller.enabled;this.active=true;this.controller.enabled=false;this.controller.resetInput();document.exitPointerLock?.();this.root.classList.add('active');
    this.render(point?this.quest.inspect(point).text:result.text);this.root.querySelector('[data-ledger-close]').focus();return true;
  }
  close({restore=true}={}) {if(!this.active)return;this.quest.leave();this.active=false;this.root.classList.remove('active');if(restore){this.controller.enabled=this.previousEnabled;this.controller.requestPointerLock();}}
  render(message='') {
    const view=this.quest.getView();this.root.innerHTML='<div class="hospital-shell"><header><div><small>4F / 封存通訊資料角</small><h2>交班訊號缺頁</h2></div><button data-ledger-close>放回</button></header><div class="hospital-content"><p data-ledger-summary></p><p data-ledger-voice></p><div data-ledger-points></div><p data-ledger-status role="status"></p><label>核對方式 <select data-ledger-method></select></label><label>紙袋順序 <select data-ledger-order></select></label><label>設備校正 <select data-ledger-correction></select></label><button data-ledger-submit>核對排回</button><button data-ledger-preserve></button><p class="case-mainline-hint"></p></div></div>';
    this.root.querySelector('[data-ledger-summary]').textContent=view.summary;this.root.querySelector('[data-ledger-voice]').textContent=view.voice;
    this.root.querySelector('[data-ledger-status]').textContent=message;
    for(const point of view.points){const button=document.createElement('button');button.dataset.ledgerPoint=point.id;button.textContent=(point.observed?'✓ ':'')+point.label;button.onclick=()=>{const result=this.quest.inspect(point.id);soundManager.playPaperSign();this.render(result.text);};this.root.querySelector('[data-ledger-points]').append(button);}
    const addOptions=(selector,rows,value)=>{const select=this.root.querySelector(selector);for(const row of rows){const option=document.createElement('option');option.value=String(value(row));option.textContent=row.label;select.append(option);}return select;};
    addOptions('[data-ledger-method]',view.methods,r=>r.id);addOptions('[data-ledger-order]',view.orderChoices,r=>r.id);addOptions('[data-ledger-correction]',view.correctionChoices,r=>r.minutes);
    this.root.querySelector('[data-ledger-submit]').onclick=()=>{const method=this.root.querySelector('[data-ledger-method]').value,order=this.root.querySelector('[data-ledger-order]').value.split('-'),correctionMinutes=Number(this.root.querySelector('[data-ledger-correction]').value);const result=this.quest.submit({method,order,correctionMinutes});this.render(result.text);if(result.ok)soundManager.playPaperSign();};
    const preserve=this.root.querySelector('[data-ledger-preserve]');preserve.textContent=view.unresolvedLabel;preserve.onclick=()=>this.render(this.quest.preserveUncertainty().text);
    this.root.querySelector('.case-mainline-hint').textContent='可隨時放回資料夾。主線目前目標：'+this.mainline();this.root.querySelector('[data-ledger-close]').onclick=()=>this.close();
  }
}
