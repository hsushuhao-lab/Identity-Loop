import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDutyLogStatus } from '../src/ui/DutyLogStatus.js';
import { UIManager } from '../src/ui/UIManager.js';

function fixture() {
  const cells = Array.from({ length: 6 }, () => ({ textContent: '' }));
  const signature = { textContent: '值班醫師（待簽）' };
  const status = { textContent: '簽章就緒' };
  const button = { disabled: false, textContent: '✍️ 簽名並加蓋值班到勤章' };
  const row = { querySelector: selector => ({ '.signature-font': signature, '.status-tag': status })[selector], querySelectorAll: () => cells };
  const modal = { querySelector: selector => ({ '.log-table tbody tr': row, '#btn-sign-log': button })[selector] };
  return { modal, cells, signature, status, button };
}

test('reopening a completed sign-in displays completion and prevents duplicate signing', () => {
  const view = fixture();
  renderDutyLogStatus(view.modal, { signed: true });
  assert.equal(view.signature.textContent, '值班醫師（已簽）');
  assert.equal(view.status.textContent, '已完成簽到');
  assert.equal(view.button.disabled, true);
  assert.equal(view.button.textContent, '已完成簽署');
});

test('new run or unfinished sign-in restores the pending button and status', () => {
  const view = fixture();
  renderDutyLogStatus(view.modal, { signed: true, itemsCollected: true });
  renderDutyLogStatus(view.modal, { signed: false, itemsCollected: false });
  assert.equal(view.signature.textContent, '值班醫師（待簽）');
  assert.equal(view.status.textContent, '簽章就緒');
  assert.equal(view.button.disabled, false);
  assert.match(view.button.textContent, /簽名/);
  assert.match(view.cells[4].textContent, /待自/);
});

test('items and sign-in independently reflect actual completion, without inferring one from the other', () => {
  for (const signed of [false, true]) for (const itemsCollected of [false, true]) {
    const view = fixture(), state = Object.freeze({ signed, itemsCollected });
    renderDutyLogStatus(view.modal, state);
    assert.equal(view.button.disabled, signed);
    assert.equal(view.cells[4].textContent.includes('已領取'), itemsCollected);
    assert.deepEqual(state, { signed, itemsCollected });
    assert.equal(view.cells[0].textContent, '');
    assert.equal(view.cells[1].textContent, '');
    assert.equal(view.cells[2].textContent, '');
    const text = [view.signature, view.status, view.button, view.cells[4]].map(element => element.textContent).join(' ');
    assert.doesNotMatch(text, /李承禮|張守恆|周啟文|陳柏勳|MED-\d/);
  }
});

test('absent or partial modal can be opened safely', () => {
  assert.doesNotThrow(() => renderDutyLogStatus(null));
  assert.doesNotThrow(() => renderDutyLogStatus({ querySelector: () => null }, { signed: true }));
});

test('actual UIManager open refreshes both fields from existing task completion without changing GameState', () => {
  const view = fixture();
  const taskReads = [], classes = [];
  view.modal.classList = { add: value => classes.push(value) };
  const gameState = Object.freeze({ isTaskComplete: task => { taskReads.push(task); return task === 'DUTY_LOG'; } });
  const previousDocument = globalThis.document;
  globalThis.document = { exitPointerLock() {} };
  try { UIManager.prototype.openDutyLog.call({ gameState, dutyLogModal: view.modal }); }
  finally { if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument; }
  assert.deepEqual(taskReads, ['DUTY_LOG', 'KEY_PICKUP']);
  assert.deepEqual(classes, ['active']);
  assert.equal(view.button.disabled, true);
  assert.equal(view.signature.textContent, '值班醫師（已簽）');
  assert.match(view.cells[4].textContent, /待自/);
});
