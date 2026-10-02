// Run-scoped world state. No meshes, timers or story progression live here.
export class HospitalSimulation {
  constructor({ storage, runKey }) {
    this.storage = storage;
    this.runKey = String(runKey);
    this.data = { runKey: this.runKey, taskPower: true, wheelchairPad: 0, noise: 0, calls: [], badgeScans: 0 };
    try {
      const saved = JSON.parse(storage?.getItem('IdentityLoop_Hospital_v1') || 'null');
      if (saved?.runKey === this.runKey) {
        this.data.taskPower = saved.taskPower !== false;
        this.data.wheelchairPad = saved.wheelchairPad === 1 ? 1 : 0;
        this.data.noise = Number.isFinite(saved.noise) ? Math.max(0, saved.noise) : 0;
        this.data.badgeScans = Number.isFinite(saved.badgeScans) ? Math.max(0, saved.badgeScans) : 0;
        this.data.calls = Array.isArray(saved.calls) ? saved.calls.slice(-12).filter(c => /^\d{3}$/.test(c.extension)) : [];
      }
    } catch { /* Storage is optional; the active session still works. */ }
  }
  snapshot() { return structuredClone(this.data); }
  save() { try { this.storage?.setItem('IdentityLoop_Hospital_v1', JSON.stringify(this.data)); } catch {} }
  setTaskPower(value) { this.data.taskPower = Boolean(value); this.save(); }
  moveWheelchair() {
    this.data.wheelchairPad = 1 - this.data.wheelchairPad;
    this.data.noise++; this.save();
    return this.data.wheelchairPad;
  }
  scanBadge(identity, time) {
    this.data.badgeScans++; this.save();
    const result = {
      LI: 'ACCESS DENIED — 請向護理站核對授權來源。',
      ZHANG: 'ACCESS GRANTED — 卡片已通過；讀卡器沒有留下授權來源。',
      ZHOU: `ACCESS GRANTED — ${this.data.badgeScans % 3 === 0 ? '21:17' : time}`,
      CHEN: '備用鑰匙槽已留下轉動痕跡。你的手停在讀卡器前。'
    }[identity] || '請核對夜間授權。';
    // This is an audit reader, never a route door or an identity answer.
    return result;
  }
  dial(extension, { identity, time, seed = 0 }) {
    if (!/^\d{3}$/.test(extension)) return { connected: false, text: '請輸入三位數分機。' };
    let text;
    if (extension === '316') {
      text = {
        LI: '先確認現場，再核對紀錄。電話裡的聲音很熟悉。',
        ZHANG: '值班表還在，但這一欄沒有字。請回來自己看。',
        ZHOU: '你已經來電過了。通話記錄卻標著 21:17。',
        CHEN: '先別掛斷。先聽完，再決定下一步。'
      }[identity] || '總醫師室暫無人接聽。';
    } else if (extension === '409') {
      text = ['聽筒裡只有規律的敲牆聲。', '電話接通了，沒有人說話。'][Math.abs(Number(seed) || 0) % 2];
    } else if (extension === '112') {
      text = time === '00:33' ? '急診：現場沒有病人，請勿新增紀錄。' : '急診：交接前請核對現場腕帶與病歷。';
    } else text = '此分機無人接聽。';
    const call = { extension, time, text, connected: ['316', '409', '112'].includes(extension) };
    this.data.calls.push(call); this.data.calls = this.data.calls.slice(-12); this.save();
    return { ...call };
  }
}
