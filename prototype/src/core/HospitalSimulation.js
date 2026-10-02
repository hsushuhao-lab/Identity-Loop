// Run-scoped world state. No meshes, timers or story progression live here.
export const PATROL_STOPS = Object.freeze([-13.8, -7.6, -4.2, -7.6]);
const defaultStaff = () => ({ z: PATROL_STOPS[0], waypoint: 1, mode: 'patrol', targetZ: -5.05, remaining: 0, investigated: 0, shift: '晚班' });
export class HospitalSimulation {
  constructor({ storage, runKey }) {
    this.storage = storage;
    this.runKey = String(runKey);
    this.data = { runKey: this.runKey, taskPower: true, wheelchairPad: 0, noise: 0, calls: [], badgeScans: 0, staff: defaultStaff() };
    this.unsavedSeconds = 0;
    try {
      const saved = JSON.parse(storage?.getItem('IdentityLoop_Hospital_v1') || 'null');
      if (saved?.runKey === this.runKey) {
        this.data.taskPower = saved.taskPower !== false;
        this.data.wheelchairPad = saved.wheelchairPad === 1 ? 1 : 0;
        this.data.noise = Number.isFinite(saved.noise) ? Math.max(0, saved.noise) : 0;
        this.data.badgeScans = Number.isFinite(saved.badgeScans) ? Math.max(0, saved.badgeScans) : 0;
        this.data.calls = Array.isArray(saved.calls) ? saved.calls.slice(-12).filter(c => /^\d{3}$/.test(c.extension)) : [];
        const staff = saved.staff;
        if (staff && Number.isFinite(staff.z) && staff.z >= -13.8 && staff.z <= -4.2) {
          this.data.staff = {
            ...defaultStaff(), z: staff.z,
            waypoint: Number.isInteger(staff.waypoint) && staff.waypoint >= 0 && staff.waypoint < PATROL_STOPS.length ? staff.waypoint : 1,
            mode: ['patrol','investigate','inspect'].includes(staff.mode) ? staff.mode : 'patrol',
            targetZ: staff.targetZ === -6.45 ? -6.45 : -5.05,
            remaining: Number.isFinite(staff.remaining) ? Math.min(3,Math.max(0,staff.remaining)) : 0,
            investigated: Number.isFinite(staff.investigated) ? Math.max(0,Math.floor(staff.investigated)) : 0,
            shift: staff.shift === '深夜班' ? '深夜班' : '晚班'
          };
        }
      }
    } catch { /* Storage is optional; the active session still works. */ }
  }
  snapshot() { return structuredClone(this.data); }
  save() { try { this.storage?.setItem('IdentityLoop_Hospital_v1', JSON.stringify(this.data)); } catch {} }
  setTaskPower(value) { this.data.taskPower = Boolean(value); this.save(); }
  moveWheelchair() {
    this.data.wheelchairPad = 1 - this.data.wheelchairPad;
    // One outstanding noise stimulus: further pushes replace the location.
    Object.assign(this.data.staff, { mode: 'investigate', targetZ: this.data.wheelchairPad ? -6.45 : -5.05, remaining: 0 });
    this.data.noise++; this.save();
    return this.data.wheelchairPad;
  }
  advance(delta, { time = '17:00', blocked = () => false } = {}) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    const dt = Math.min(delta, .25), staff = this.data.staff;
    const hour = Number(String(time).split(':')[0]);
    const shift = hour >= 0 && hour < 7 ? '深夜班' : '晚班';
    if (staff.shift !== shift) { staff.shift = shift; this.save(); }
    if (staff.mode === 'inspect') {
      staff.remaining = Math.max(0, staff.remaining - dt);
      if (staff.remaining === 0) { staff.investigated++; staff.mode = 'patrol'; this.save(); }
    } else {
      const target = staff.mode === 'investigate' ? staff.targetZ : PATROL_STOPS[staff.waypoint];
      const step = Math.min(Math.abs(target-staff.z),dt*(shift === '深夜班' ? .45 : .65));
      const next = staff.z + Math.sign(target-staff.z)*step;
      // The loaded world can veto a step; unloaded simulation needs no meshes.
      if (!blocked(5.65,next)) {
        staff.z = next;
        if (Math.abs(target-next)<.001) {
          if (staff.mode === 'investigate') { staff.mode = 'inspect'; staff.remaining = 3; }
          else staff.waypoint = (staff.waypoint+1)%PATROL_STOPS.length;
          this.save();
        }
      }
    }
    this.unsavedSeconds += dt;
    if (this.unsavedSeconds >= 3) { this.unsavedSeconds = 0; this.save(); }
  }
  staffReply({ identity }) {
    const perception = {
      LI: '「先確認器材位置，再寫入紀錄。流程不能代替現場。」',
      ZHANG: '「今晚的排班欄是空的，我還是照路線走。」',
      ZHOU: '「剛才那聲我聽過了。這次又在另一個位置。」',
      CHEN: '「先讓聲音停下來。我會走過去看。」'
    }[identity] || '「我正在巡查器材區。」';
    const staff = this.data.staff;
    return `${perception}\n目前：${this.staffStatus()}。完成器材噪音查看 ${staff.investigated} 次。`;
  }
  staffStatus() {
    const staff = this.data.staff;
    return `${staff.shift}／${{patrol:'走廊巡查',investigate:'前往聲音位置',inspect:'查看輪椅擦痕'}[staff.mode]}`;
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
