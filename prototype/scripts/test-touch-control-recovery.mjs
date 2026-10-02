import test from 'node:test';
import assert from 'node:assert/strict';
import { TouchControls } from '../src/player/TouchControls.js';

// Reproduce route completion without a DOM mutation: this was the mobile
// dialogue-to-world transition that left every action control hidden.
function fixture(run) {
  const saved = Object.fromEntries(['document', 'window', 'matchMedia', 'MutationObserver', 'setInterval', 'clearInterval'].map(key => [key, globalThis[key]]));
  const classes = new Set();
  const classList = { toggle(name, force) { const value = force ?? !classes.has(name); value ? classes.add(name) : classes.delete(name); return value; }, contains: name => classes.has(name) };
  const element = () => ({ addEventListener() {}, setPointerCapture() {}, classList, hidden: false });
  const children = new Map();
  const root = { ...element(), querySelector(id) { if (!children.has(id)) children.set(id, element()); return children.get(id); }, remove() { this.removed = true; } };
  let tick, interval, cleared, observer;
  globalThis.document = { body: { classList, append() {} }, createElement: () => root, addEventListener() {} };
  globalThis.window = { addEventListener() {} };
  globalThis.matchMedia = () => ({ matches: true });
  globalThis.MutationObserver = class { constructor(callback) { this.callback = callback; observer = this; } observe() {} disconnect() { this.disconnected = true; } };
  globalThis.setInterval = (callback, ms) => { tick = callback; interval = ms; return 42; };
  globalThis.clearInterval = id => { cleared = id; };
  let blocked = false, dialogue = true, resets = 0;
  const controller = { enabled: false, domElement: element(), touchMove: { x: 0, z: 0 }, resetInput() { resets++; } };
  const controls = new TouchControls(controller, { blocked: () => blocked, hasDialogue: () => dialogue,
    inspect() {}, journal() {}, continueDialogue() {} });
  try { run({ controls, controller, root, children, classes, tick: () => tick(),
    setBlocked: value => blocked = value, setDialogue: value => dialogue = value,
    get interval() { return interval; }, get cleared() { return cleared; }, get observer() { return observer; }, get resets() { return resets; } }); }
  finally { controls.dispose(); for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete globalThis[key]; else globalThis[key] = value; } }
}

test('controls recover after async dialogue completion without another DOM event or objective tap', () => fixture(f => {
  assert.equal(f.interval, 100);
  assert.equal(f.classes.has('input-blocked'), true);
  assert.equal(f.children.get('#touch-continue').hidden, false);
  f.setDialogue(false); f.controller.enabled = true; f.tick();
  assert.equal(f.classes.has('input-blocked'), false);
  assert.equal(f.children.get('#touch-continue').hidden, true);
}));

test('a real modal or disabled controller continues to hide game actions', () => fixture(f => {
  f.controller.enabled = true; f.setDialogue(false); f.setBlocked(true); f.tick();
  assert.equal(f.classes.has('input-blocked'), true);
  f.setBlocked(false); f.controller.enabled = false; f.tick();
  assert.equal(f.classes.has('input-blocked'), true);
  f.controller.enabled = true; f.tick();
  assert.equal(f.classes.has('input-blocked'), false);
}));

test('dialogue continue is updated when dialogue state changes without DOM class changes', () => fixture(f => {
  f.setDialogue(false); f.tick();
  assert.equal(f.children.get('#touch-continue').hidden, true);
  f.setDialogue(true); f.tick();
  assert.equal(f.children.get('#touch-continue').hidden, false);
}));

test('disposing controls clears the recovery timer and observer', () => fixture(f => {
  f.controls.dispose();
  assert.equal(f.cleared, 42);
  assert.equal(f.observer.disconnected, true);
  assert.equal(f.root.removed, true);
  assert.equal(f.resets, 1);
}));
