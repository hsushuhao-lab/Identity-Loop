export const QUALITY_PRESETS = Object.freeze({
  performance: { label: 'Performance · 流暢', pixelRatio: 1, shadows: false, targetFPS: 30, drawCallBudget: 900, triangleBudget: 700000 },
  quality: { label: 'Quality · 細緻', pixelRatio: 1.5, shadows: true, targetFPS: 30, drawCallBudget: 1200, triangleBudget: 900000 },
  ultra: { label: 'Ultra · 高畫質', pixelRatio: 2, shadows: true, targetFPS: 60, drawCallBudget: 1200, triangleBudget: 900000 }
});

export class QualitySettings {
  constructor(renderer, composer) {
    Object.assign(this, { renderer, composer }); this.samples = []; this.lastRender = 0; this.lastSample = 0;
    let stored; try { stored = localStorage.getItem('IdentityLoop_Quality_v1'); } catch {}
    this.apply(QUALITY_PRESETS[stored] ? stored : matchMedia('(pointer: coarse)').matches ? 'performance' : 'quality');
    const root = document.createElement('details'); root.id = 'quality-settings';
    root.innerHTML = `<summary>設定</summary><label>畫質 <select aria-label="畫質模式"></select></label>
      <label><input type="checkbox" id="haptic-enabled">震動回饋</label><p>請戴耳機。手機建議橫向使用。</p>
      <p id="save-checkpoint-note">主線在章節切換時保存進度；未完成章節的互動可能需重做。</p>`;
    const select = root.querySelector('select');
    for (const [key,preset] of Object.entries(QUALITY_PRESETS)) { const option = new Option(preset.label,key); select.add(option); }
    select.value = this.mode; select.onchange = () => this.apply(select.value);
    root.querySelector('#haptic-enabled').disabled = typeof navigator.vibrate !== 'function';
    document.body.append(root);
  }
  apply(mode) {
    this.mode = QUALITY_PRESETS[mode] ? mode : 'performance'; this.preset = QUALITY_PRESETS[this.mode];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.preset.pixelRatio));
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.renderer.shadowMap.enabled = this.preset.shadows; this.renderer.shadowMap.needsUpdate = true;
    try { localStorage.setItem('IdentityLoop_Quality_v1', this.mode); } catch {}
  }
  render(now) {
    if (document.hidden || now - this.lastRender < 1000 / this.preset.targetFPS - 1) return false;
    if (this.lastRender) this.samples.push(now - this.lastRender);
    if (this.samples.length > 120) this.samples.shift();
    this.lastRender = now;
    this.renderer.info.autoReset = false; this.renderer.info.reset();
    this.composer.render(); return true;
  }
  snapshot() {
    const sorted = [...this.samples].sort((a,b)=>a-b), info = this.renderer.info.render;
    return { mode: this.mode, pixelRatio: this.renderer.getPixelRatio(), targetFPS: this.preset.targetFPS,
      sampledFrames: sorted.length, p95FrameMs: sorted[Math.floor(sorted.length * .95)] || null,
      drawCalls: info.calls, triangles: info.triangles, budgets: { drawCalls: this.preset.drawCallBudget, triangles: this.preset.triangleBudget },
      withinSceneBudget: info.calls <= this.preset.drawCallBudget && info.triangles <= this.preset.triangleBudget };
  }
}
