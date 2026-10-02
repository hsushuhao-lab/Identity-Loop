import {caseReaction} from '../core/HospitalSideCase.js';
import {soundManager} from '../audio/SoundManager.js';

export class HospitalCasePanel {
  constructor({simulation,controller,context,worldRouter}){
    Object.assign(this,{simulation,controller,context,worldRouter});
    this.root=document.createElement('section');this.root.id='hospital-case-panel';this.root.className='modal-overlay';
    this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','沒有風的驗收');
    this.root.innerHTML='<div class="hospital-shell"><header><div><small>4F / 封存檢修廊</small><h2>沒有風的驗收</h2></div><button data-case-close>關閉</button></header><div class="hospital-content" data-case-content></div></div>';
    document.body.append(this.root);this.root.querySelector('[data-case-close]').onclick=()=>this.close();
    document.addEventListener('keydown',e=>{if(e.code==='Escape'&&this.root.classList.contains('active')){e.stopImmediatePropagation();this.close();}},true);
  }
  open(id){this.id=id;this.previousEnabled=this.controller.enabled;this.controller.enabled=false;this.controller.resetInput();document.exitPointerLock?.();this.root.classList.add('active');this.show();this.root.querySelector('[data-case-close]').focus();}
  close(){this.root.classList.remove('active');this.controller.enabled=this.previousEnabled;this.controller.requestPointerLock();}
  show(){
    const body=this.root.querySelector('[data-case-content]'),data=this.simulation.data.sideCase;let title,text,actions='';
    if(this.id==='CASE_PAPER'){
      this.simulation.inspectCase('paper');title='1998｜缺角的驗收原件';text='泛黃複寫單寫著：「測試指示燈亮起，風口紙條沒有動。」下方卻蓋了完成章。簽名位置被煙灰與破洞遮住，沒有可辨認的人員資料。旁邊的便箋要求保留原件，將現場觀察另外附上。';
    }else if(this.id==='CASE_RELAY'){
      this.simulation.inspectCase('relay');title='燻黑的接點';text='外殼有火災後的焦痕，內部卻貼著「隔離測試回路」。這台設備的指示燈只表示供電，不能證明風道有氣流。你可以保留現狀，也可以到旁邊的低壓測試台做觀察。';
    }else if(this.id==='CASE_POWER'){
      title='隔離低壓測試台';text='這台測試器與全院主電源、B-Panel 分離。開關只供應檢修廊的測試風口。';actions=`<button data-case-power>${data.power?'關閉':'開啟'}測試電源</button>`;
    }else if(this.id==='CASE_DAMPER'){
      title='測試風道擋板';text='擋板軸旁有反覆轉動的擦痕。你可以開啟這段測試風道，也可以先觀察供電但關閉擋板的結果。';actions=`<button data-case-damper>${data.damper?'關閉':'開啟'}測試擋板</button>`;
    }else if(this.id==='CASE_FLOW'){
      title='風口紙條';text=this.simulation.observeCaseAir().text;
    }else{
      title='分列原件與現場觀察';text='原件調查與接點／風口測試可以各自提供線索。離開與回訪都不會替你完成醫師主線任務。';actions='<button data-case-resolve="archive">關閉測試電源，保留原樣與紀錄</button><button data-case-resolve="verify">保留原件，附上氣流驗證回執</button>';
    }
    body.innerHTML=`<h3></h3><p data-case-text></p>${actions}<p data-case-status role="status"></p><h4>目前調查紀錄</h4><ul data-case-notes></ul><p class="case-mainline-hint"></p>`;
    body.querySelector('h3').textContent=title;body.querySelector('[data-case-text]').textContent=text;
    const labels={paper:'原件：指示燈與現場結果不一致',relay:'接點：這是獨立低壓測試回路',no_air:'供電後觀察：紙條靜止',air_flow:'擋板開啟後：紙條隨氣流抖動'};
    for(const clue of data.clues){const li=document.createElement('li');li.textContent=labels[clue];body.querySelector('[data-case-notes]').append(li);}
    body.querySelector('.case-mainline-hint').textContent='可隨時返回4F。主線目前目標：'+this.context().mainline;
    const update=()=>{this.simulation.save();this.worldRouter.activeZoneInstance?.syncStoryState?.();soundManager.playTerminalKey();this.show();};
    const power=body.querySelector('[data-case-power]');if(power)power.onclick=()=>{this.simulation.toggleCasePower();update();};
    const damper=body.querySelector('[data-case-damper]');if(damper)damper.onclick=()=>{this.simulation.toggleCaseDamper();soundManager.playDoorLockClack();update();};
    body.querySelectorAll('[data-case-resolve]').forEach(button=>{button.onclick=()=>{const result=this.simulation.resolveCase(button.dataset.caseResolve);this.worldRouter.activeZoneInstance?.syncStoryState?.();this.show();this.root.querySelector('[data-case-status]').textContent=result.text+(result.ok?' '+caseReaction(this.context().identity,this.simulation.data.sideCase.outcome):'');if(result.ok)soundManager.playPaperSign();};});
  }
}
