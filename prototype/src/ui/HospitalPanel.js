import { soundManager } from '../audio/SoundManager.js';

export class HospitalPanel {
  constructor({ simulation, context, controller, worldRouter, onClose }) {
    Object.assign(this, { simulation, context, controller, worldRouter, onClose });
    this.root = document.createElement('section'); this.root.id = 'hospital-panel';
    this.root.className = 'modal-overlay'; this.root.setAttribute('role', 'dialog'); this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-label', '護理站夜間設備');
    this.root.innerHTML = `<div class="hospital-shell"><header><div><small>青嶺醫療中心 / 4F</small><h2>夜間設備</h2></div><button data-close>關閉</button></header>
      <nav aria-label="設備頁籤"><button data-tab="terminal">交班</button><button data-tab="phone">分機</button><button data-tab="badge">門禁</button><button data-tab="cctv">監看</button><button data-tab="wheelchair">輪椅</button><button data-tab="patrol">巡查</button></nav>
      <div class="hospital-content"></div></div>`;
    document.body.append(this.root);
    this.root.querySelector('[data-close]').onclick = () => this.close();
    this.root.querySelectorAll('[data-tab]').forEach(button => { button.onclick = () => this.show(button.dataset.tab); });
    document.addEventListener('keydown', e => { if (this.root.classList.contains('active') && e.code === 'Escape') { e.stopImmediatePropagation(); this.close(); } }, true);
  }
  open(id) {
    this.previousEnabled = this.controller.enabled; this.controller.enabled = false; this.controller.resetInput();
    document.exitPointerLock?.(); this.root.classList.add('active');
    this.show({ HOSPITAL_PHONE:'phone', HOSPITAL_BADGE:'badge', HOSPITAL_WHEELCHAIR:'wheelchair', HOSPITAL_STAFF:'patrol' }[id] || 'terminal');
    this.root.querySelector('[data-close]').focus();
  }
  close() {
    this.root.classList.remove('active'); clearInterval(this.cctvTimer);
    this.controller.enabled = this.previousEnabled; this.onClose?.();
  }
  status(text) { this.root.querySelector('[data-status]').textContent = text; }
  show(tab) {
    clearInterval(this.cctvTimer); this.tab = tab;
    this.root.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));
    const content = this.root.querySelector('.hospital-content'), state = this.simulation.snapshot();
    const status = '<p data-status role="status"></p>';
    if (tab === 'terminal') {
      content.innerHTML = `<h3>夜間交班／器材紀錄</h3><p>醫囑、腕帶與床位請分別核對。設備紀錄不能替代病人身分查核。</p><dl><dt>工作燈</dt><dd data-power></dd><dt>輪椅移動紀錄</dt><dd>${state.noise} 次</dd></dl><button data-power-switch>切換工作燈</button>${status}`;
      content.querySelector('[data-power]').textContent = state.taskPower ? '供電中' : '已關閉';
      content.querySelector('[data-power-switch]').onclick = () => { this.simulation.setTaskPower(!this.simulation.data.taskPower); this.worldRouter.activeZoneInstance?.hospitalSystems?.synchronize(); this.show(tab); };
    } else if (tab === 'phone') {
      content.innerHTML = `<h3>院內分機</h3><p>316 總醫師室 · 409 病房 · 112 急診</p><form><label>分機號碼 <input aria-label="分機號碼" inputmode="numeric" maxlength="3" pattern="[0-9]{3}" required autocomplete="off"></label><button>撥號</button></form>${status}<h4>最近通話</h4><ol data-calls></ol>`;
      content.querySelector('form').onsubmit = e => {
        e.preventDefault(); soundManager.playTerminalKey();
        const result = this.simulation.dial(content.querySelector('input').value,this.context()); this.status(result.text);
        if (document.querySelector('#haptic-enabled')?.checked && typeof navigator.vibrate==='function') navigator.vibrate(30);
        this.renderCalls();
      };
      this.renderCalls();
    } else if (tab === 'badge') {
      content.innerHTML = `<h3>夜間門禁核對</h3><p>授權紀錄與現場通行需分別確認。此讀卡器只讀取值班紀錄。</p><button data-scan>刷卡核對</button>${status}`;
      content.querySelector('[data-scan]').onclick = () => { const {identity,time}=this.context(); this.status(this.simulation.scanBadge(identity,time)); };
    } else if (tab === 'patrol') {
      content.innerHTML = `<h3>器材巡查</h3><p>巡查路線在護理站東側走廊。推動輪椅後，人員會到停放位置查看，然後繼續巡查。</p><p data-patrol></p><button data-ask>詢問巡查情況</button>${status}`;
      content.querySelector('[data-patrol]').textContent = this.simulation.staffStatus();
      content.querySelector('[data-ask]').onclick = () => this.status(this.simulation.staffReply(this.context()));
    } else if (tab === 'cctv') {
      content.innerHTML = `<h3>4F 器材區位置監看</h3><p>● 值班醫師　□ 輪椅　▲ 巡查人員<br>平面位置示意，依目前現場更新。雙指縮放，雙點還原。</p><div class="hospital-map-frame"><canvas class="hospital-map" width="420" height="420" aria-label="4F 即時位置示意"></canvas></div>`;
      this.drawCCTV(); this.cctvTimer = setInterval(()=>this.drawCCTV(),250);
    } else {
      content.innerHTML = `<h3>輪椅收納</h3><p>椅背收納袋裡是一張無名器材盤點單。車輪有新擦痕。</p><p data-pad></p><button data-push>推到另一個停放位置</button>${status}`;
      content.querySelector('[data-pad]').textContent = `目前停放：${state.wheelchairPad + 1} 號位`;
      content.querySelector('[data-push]').onclick = () => {
        const systems = this.worldRouter.activeZoneInstance?.hospitalSystems;
        if (!systems) return;
        const p = this.controller.position, chair = systems.wheelchair.position;
        if (Math.hypot(p.x-chair.x,p.z-chair.z)>3) { this.status('請走近輪椅再推動。'); return; }
        const [x,z] = systems.pads[1-this.simulation.data.wheelchairPad];
        if (Math.hypot(p.x-x,p.z-z)<.9) { this.status('請先離開另一個停放位置。'); return; }
        this.simulation.moveWheelchair(); systems.synchronize(); soundManager.playWheelchairRattle(.13);
        this.show(tab); this.status('輪椅發出一聲短促的金屬摩擦聲。');
      };
    }
  }
  renderCalls() {
    const list = this.root.querySelector('[data-calls]'); list.replaceChildren();
    for (const call of [...this.simulation.snapshot().calls].reverse()) {
      const item = document.createElement('li'); item.textContent = `${call.time} → ${call.extension}｜${call.connected?'已接通':'無人接聽'}`; list.append(item);
    }
  }
  drawCCTV() {
    const canvas = this.root.querySelector('canvas'); if (!canvas) return;
    const ctx=canvas.getContext('2d'), p=this.controller.position, chair=this.worldRouter.activeZoneInstance?.hospitalSystems?.wheelchair.position;
    ctx.fillStyle='#12251e';ctx.fillRect(0,0,420,420);ctx.strokeStyle='#78917e';ctx.strokeRect(30,30,360,360);
    ctx.fillStyle='#416253';ctx.fillRect(141,270,138,90);ctx.fillStyle='#d0d8b7';ctx.font='16px sans-serif';ctx.fillText('護理站',180,315);
    const point=(x,z)=>[30+(x+12)*15,30+(z+22)*15];
    if(chair){const [x,y]=point(chair.x,chair.z);ctx.fillStyle='#e4b781';ctx.fillRect(x-5,y-5,10,10);}
    const [sx,sy]=point(5.65,this.simulation.data.staff.z);ctx.fillStyle='#8fbbb6';ctx.beginPath();ctx.moveTo(sx,sy-7);ctx.lineTo(sx-6,sy+5);ctx.lineTo(sx+6,sy+5);ctx.closePath();ctx.fill();
    const [x,y]=point(p.x,p.z);ctx.fillStyle='#c4e3d1';ctx.beginPath();ctx.arc(x,y,5,0,Math.PI*2);ctx.fill();
  }
}
