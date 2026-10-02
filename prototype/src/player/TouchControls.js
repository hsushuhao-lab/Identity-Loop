export class TouchControls {
  constructor(controller, { blocked, inspect, journal, continueDialogue, hasDialogue }) {
    Object.assign(this, { controller, blocked, inspect, journal, continueDialogue, hasDialogue });
    this.active = matchMedia('(pointer: coarse)').matches;
    this.points = new Map();
    this.root = document.createElement('div');
    this.root.id = 'touch-controls';
    this.root.innerHTML = `<div id="touch-move" aria-label="左側拖曳移動"><span></span></div>
      <button id="touch-interact" aria-label="互動；長按觀察">●</button>
      <button id="touch-run">快走</button><button id="touch-journal">紀錄</button>
      <button id="touch-continue">繼續</button><button id="touch-objective">任務</button>`;
    document.body.append(this.root);
    this.setActive(this.active);
    const canvas = controller.domElement, move = this.root.querySelector('#touch-move');
    const reset = () => this.reset();
    for (const target of [move, canvas]) {
      target.addEventListener('pointerdown', e => {
        if (e.pointerType !== 'touch' || this.blocked() || !controller.enabled) return;
        this.setActive(true); e.preventDefault(); target.setPointerCapture(e.pointerId);
        const mode = target === move || e.clientX < innerWidth * .42 ? 'move' : 'look';
        this.points.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, mode });
      });
      target.addEventListener('pointermove', e => {
        const point = this.points.get(e.pointerId);
        if (!point) return;
        if (this.blocked() || !controller.enabled) { this.reset(); return; }
        e.preventDefault();
        if (point.mode === 'move') {
          controller.touchMove.x = Math.max(-1, Math.min(1, (e.clientX - point.startX) / 48));
          controller.touchMove.z = Math.max(-1, Math.min(1, (point.startY - e.clientY) / 48));
        } else controller.lookBy(e.clientX - point.x, e.clientY - point.y, .003);
        point.x = e.clientX; point.y = e.clientY;
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) target.addEventListener(type, e => {
        if (this.points.get(e.pointerId)?.mode === 'move') controller.touchMove.x = controller.touchMove.z = 0;
        this.points.delete(e.pointerId);
      });
    }
    const interact = this.root.querySelector('#touch-interact');
    interact.addEventListener('pointerdown', e => {
      if (this.blocked() || !controller.enabled) return;
      e.preventDefault(); interact.setPointerCapture(e.pointerId); this.held = false; this.pendingClick = false;
      this.holdTimer = setTimeout(() => {
        this.holdTimer = null; this.held = true;
        if (!this.blocked() && controller.enabled) this.inspect(controller.currentInteractable);
      }, 550);
    });
    interact.addEventListener('pointerup', e => {
      e.preventDefault(); const pending = this.holdTimer;
      clearTimeout(this.holdTimer); this.holdTimer = null;
      this.pendingClick = Boolean(pending && !this.held);
    });
    // Open the modal after the browser has selected the click target. Opening it
    // during pointerup can send the synthesized touch click to a new answer button.
    interact.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation(); const pending = this.pendingClick; this.pendingClick = false;
      if (pending && !this.blocked() && controller.enabled) controller.interact();
    });
    for (const type of ['pointercancel', 'lostpointercapture']) interact.addEventListener(type, e => { clearTimeout(this.holdTimer); this.holdTimer = null; if(type==='pointercancel')this.pendingClick=false; });
    const run = this.root.querySelector('#touch-run');
    run.addEventListener('pointerdown', e => { e.preventDefault(); if (!this.blocked()) { run.setPointerCapture(e.pointerId); controller.touchRun = true; } });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) run.addEventListener(type, () => { controller.touchRun = false; });
    this.root.querySelector('#touch-journal').onclick = () => { if (!this.blocked()) this.journal(); };
    this.root.querySelector('#touch-continue').onclick = () => this.continueDialogue();
    this.root.querySelector('#touch-objective').onclick = () => document.body.classList.toggle('touch-objective-open');
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    // Cover a modal opening while a finger is held down.
    this.observer = new MutationObserver(() => { if (this.blocked() || !controller.enabled) this.reset(); this.refresh(); });
    this.observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['class','open'] });
  }
  setActive(active) {
    this.active = active; this.controller.touchMode = active;
    document.body.classList.toggle('touch-mode', active);
  }
  reset() {
    this.points.clear(); this.controller.touchMove.x = this.controller.touchMove.z = 0;
    this.controller.touchRun = false; this.controller.resetInput();
    clearTimeout(this.holdTimer); this.holdTimer = null;
    this.pendingClick = false;
  }
  refresh() {
    this.root.classList.toggle('input-blocked', this.blocked() || !this.controller.enabled);
    this.root.querySelector('#touch-continue').hidden = !this.hasDialogue();
  }
}

// Image/canvas evidence is zoomed locally, leaving UI buttons and page scroll intact.
export function installEvidenceZoom() {
  const points = new Map(); let target, distance, scale = 1, startScale = 1;
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch' || !e.target.matches('#poster-image, #memory-frame-canvas, .hospital-map')) return;
    if (target !== e.target) { points.clear(); target = e.target; scale = 1; }
    target.setPointerCapture(e.pointerId); points.set(e.pointerId, [e.clientX, e.clientY]);
    if (points.size === 2) { const [a,b] = [...points.values()]; distance = Math.hypot(a[0]-b[0],a[1]-b[1]); startScale = scale; }
  });
  document.addEventListener('pointermove', e => {
    if (!points.has(e.pointerId)) return; points.set(e.pointerId,[e.clientX,e.clientY]);
    if (points.size !== 2 || !distance) return;
    e.preventDefault(); const [a,b] = [...points.values()];
    scale = Math.max(1, Math.min(3, startScale * Math.hypot(a[0]-b[0],a[1]-b[1]) / distance));
    target.style.transform = `scale(${scale})`;
  }, { passive: false });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) document.addEventListener(type,e => points.delete(e.pointerId));
  document.addEventListener('dblclick', e => {
    if (e.target === target) { scale = 1; target.style.transform = ''; }
  });
}
