import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { SignalLedgerQuest, SIGNAL_LEDGER_SPEC, SIGNAL_LEDGER_ID } from '../src/optional/SignalLedgerQuest.js';
import { IDENTITY_ROUTES } from '../src/story/IdentityRoutes.js';
import { IdentityManager, IDENTITY_STORAGE_KEY } from '../src/core/IdentityManager.js';

const context = { zoneId: 'first_campus_4f', canOptIn: true };
const identities = ['Li', 'Zhang', 'Zhou', 'Chen'];
const storageKey = runKey => `IdentityLoop_Optional_SignalLedger_v1:${encodeURIComponent(String(runKey))}`;
const makeStorage = () => {
  const data = new Map();
  return { data, getItem: key => data.get(key), setItem: (key, value) => data.set(key, value) };
};
const makeQuest = (options = {}) => new SignalLedgerQuest({ runKey: 'test-42', identity: 'Li', ...options });
const resolve = (quest, method) => quest.submit({ method, order: ['A', 'B'], correctionMinutes: -3 });
const permutations = items => items.length ? items.flatMap((item, index) =>
  permutations(items.filter((_, i) => i !== index)).map(tail => [item, ...tail])) : [[]];

test('entry is opt-in at 4F; leave always succeeds including before any evidence', () => {
  const quest = makeQuest();
  const initial = quest.snapshot();
  for (const zoneId of ['b2_archive', 'b1_dispatch_hub', 'first_campus_3f', 'phantom_6f']) {
    assert.equal(quest.enter({ zoneId, canOptIn: true }).ok, false);
  }
  for (const canOptIn of [false, undefined, 1, 'true']) {
    assert.equal(quest.enter({ zoneId: context.zoneId, canOptIn }).ok, false);
  }
  assert.deepEqual(quest.snapshot(), initial);
  assert.equal(quest.leave().code, 'return-to-mainline');
  assert.equal(quest.enter(context).code, 'opened');
  assert.equal(quest.leave().ok, true);
  assert.equal(quest.getView().active, false);
  assert.equal(quest.snapshot().outcome, 'investigating');
});

test('closed quest cannot inspect, submit or record a result', () => {
  const quest = makeQuest();
  const before = quest.snapshot();
  assert.equal(quest.inspect('strips').code, 'closed');
  assert.equal(resolve(quest, 'paper').code, 'closed');
  assert.equal(quest.preserveUncertainty().code, 'closed');
  assert.deepEqual(quest.snapshot(), before);
});

test('all four perspectives solve both methods in all 24 investigation orders', () => {
  let runs = 0;
  for (const identity of identities) for (const order of permutations(SIGNAL_LEDGER_SPEC.points.map(point => point.id))) {
    for (const method of ['paper', 'clock']) {
      const quest = makeQuest({ identity, runKey: `order-${runs}` });
      quest.enter(context);
      for (const id of order) assert.equal(quest.inspect(id).ok, true);
      assert.equal(resolve(quest, method).code, 'resolved');
      assert.equal(quest.snapshot().outcome, 'sequence-preserved');
      assert.equal(quest.snapshot().method, method);
      assert.equal(quest.leave().ok, true);
      runs++;
    }
  }
  assert.equal(runs, 192);
});

test('paper route solves with only strips and carbon, without clock prerequisites', () => {
  for (const order of [['strips', 'carbon'], ['carbon', 'strips']]) {
    const quest = makeQuest(); quest.enter(context);
    order.forEach(id => quest.inspect(id));
    assert.equal(resolve(quest, 'paper').ok, true);
    assert.deepEqual(quest.snapshot().observed, order);
    assert.equal(quest.getView().methods.find(method => method.id === 'clock').ready, false);
  }
});

test('clock route solves without carbon in all six orders', () => {
  for (const order of permutations(['strips', 'calibration', 'seal'])) {
    const quest = makeQuest(); quest.enter(context);
    order.forEach(id => quest.inspect(id));
    assert.equal(resolve(quest, 'clock').ok, true);
    assert.equal(quest.snapshot().observed.includes('carbon'), false);
  }
});

test('missing evidence is named; guessing has no cost and never records success', () => {
  for (const method of SIGNAL_LEDGER_SPEC.methods) for (const missing of method.required) {
    const quest = makeQuest(); quest.enter(context);
    method.required.filter(id => id !== missing).forEach(id => quest.inspect(id));
    const before = quest.snapshot();
    const result = resolve(quest, method.id);
    assert.equal(result.code, 'missing-evidence');
    assert.equal(result.text, method.hint);
    assert.deepEqual(quest.snapshot(), before);
    quest.inspect(missing);
    assert.equal(resolve(quest, method.id).ok, true);
  }
});

test('wrong order or calibration is recoverable with explicit evidence feedback', () => {
  const quest = makeQuest(); quest.enter(context);
  SIGNAL_LEDGER_SPEC.points.forEach(point => quest.inspect(point.id));
  const before = quest.snapshot();
  for (const correctionMinutes of [undefined, 0, 3, '-3', NaN, Infinity]) {
    assert.equal(quest.submit({ method: 'clock', order: ['A', 'B'], correctionMinutes }).code, 'clock-mismatch');
    assert.deepEqual(quest.snapshot(), before);
  }
  for (const method of ['paper', 'clock']) for (const order of [undefined, ['B', 'A'], ['A'], ['A', 'B', 'A'], ['A', 'A']]) {
    const result = quest.submit({ method, order, correctionMinutes: -3 });
    assert.equal(result.code, 'order-mismatch');
    assert.match(result.text, /A/); assert.match(result.text, /B/);
    assert.deepEqual(quest.snapshot(), before);
  }
  assert.equal(resolve(quest, 'clock').ok, true);
});

test('uncertain outcome can resume and resolve; resolved facts cannot be erased by an uncertain choice', () => {
  const quest = makeQuest(); quest.enter(context);
  assert.equal(quest.preserveUncertainty().code, 'missing-evidence');
  quest.inspect('strips');
  assert.equal(quest.preserveUncertainty().code, 'preserved');
  quest.leave();
  assert.match(quest.enter(context).text, /尚未確認/);
  quest.inspect('carbon'); resolve(quest, 'paper');
  assert.equal(quest.preserveUncertainty().code, 'already-resolved');
  assert.equal(quest.snapshot().outcome, 'sequence-preserved');
});

test('revisits and rereads are bounded and preserve solved and incomplete results', () => {
  const quest = makeQuest(); quest.enter(context);
  assert.equal(quest.enter(context).code, 'already-open');
  assert.equal(quest.snapshot().visits, 1);
  quest.inspect('strips');
  for (let i = 0; i < 100; i++) assert.equal(quest.inspect('strips').code, 'reread');
  assert.deepEqual(quest.snapshot().observed, ['strips']);
  quest.leave(); assert.equal(quest.enter(context).code, 'revisit');
  quest.inspect('carbon'); resolve(quest, 'paper'); quest.leave();
  assert.match(quest.enter(context).text, /A → B/);
  assert.equal(quest.snapshot().visits, 3);
});

test('run-specific storage resumes evidence and outcomes but never an open modal', () => {
  const storage = makeStorage();
  const quest = makeQuest({ storage, runKey: 'old-loop' }); quest.enter(context);
  quest.inspect('carbon'); quest.inspect('strips'); resolve(quest, 'paper');
  const restored = makeQuest({ storage, runKey: 'old-loop' });
  assert.deepEqual(restored.snapshot(), quest.snapshot());
  assert.equal(restored.getView().active, false);
  assert.equal(restored.enter(context).code, 'revisit');
  assert.equal(makeQuest({ storage, runKey: 'new-loop' }).snapshot().observed.length, 0);
  assert.equal(makeQuest({ storage, runKey: 'old-loop' }).snapshot().outcome, 'sequence-preserved');
  assert.equal(storage.data.size, 1);
});

test('reload midway and after uncertainty remains playable', () => {
  const storage = makeStorage();
  let quest = makeQuest({ storage }); quest.enter(context); quest.inspect('strips');
  quest = makeQuest({ storage }); quest.enter(context); quest.preserveUncertainty();
  quest = makeQuest({ storage }); quest.enter(context); quest.inspect('carbon');
  assert.equal(resolve(quest, 'paper').ok, true);
});

test('blocked or absent storage falls back to a functioning session', () => {
  for (const storage of [undefined, { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); } }]) {
    const quest = makeQuest({ storage }); quest.enter(context);
    quest.inspect('strips'); quest.inspect('carbon');
    assert.equal(resolve(quest, 'paper').ok, true);
    assert.equal(quest.leave().ok, true);
  }
});

test('malformed, mismatched and unsupported saves are normalized', () => {
  const storage = makeStorage();
  for (const value of ['{', 'null', '[]', JSON.stringify({ version: 2, runKey: 'test-42' }),
    JSON.stringify({ version: 1, runKey: 'wrong', observed: ['strips'] })]) {
    storage.data.set(storageKey('test-42'), value);
    assert.deepEqual(makeQuest({ storage }).snapshot(), makeQuest().snapshot());
  }
  storage.data.set(storageKey('test-42'), JSON.stringify({ version: 1, runKey: 'test-42', visits: -1,
    observed: ['strips', 'strips', '__proto__', 'identity-answer', null], outcome: 'sequence-preserved', method: 'paper' }));
  assert.deepEqual(makeQuest({ storage }).snapshot(), {
    version: 1, runKey: 'test-42', visits: 0, observed: ['strips'], outcome: 'investigating', method: null
  });
});

test('storage touches only its own namespace and never overwrites story or hospital saves', () => {
  const storage = makeStorage();
  const protectedKeys = ['IdentityLoop_Hospital_v1', 'IdentityLoop_RunSave_v1', 'DutyNight_Save'];
  protectedKeys.forEach(key => storage.data.set(key, 'untouched'));
  const quest = makeQuest({ storage }); quest.enter(context); quest.inspect('strips'); quest.leave();
  protectedKeys.forEach(key => assert.equal(storage.data.get(key), 'untouched'));
  assert.equal(storage.data.size, 4);
});

test('four voices differ while facts, options, requirements and results are identical', () => {
  const views = identities.map(identity => makeQuest({ identity }).getView());
  assert.equal(new Set(views.map(view => view.voice)).size, 4);
  for (const view of views) assert.deepEqual({ ...view, voice: '' }, { ...views[0], voice: '' });
  for (const outcome of ['pending', 'solved']) {
    const voices = identities.map(identity => {
      const quest = makeQuest({ identity }); quest.enter(context); quest.inspect('strips');
      if (outcome === 'pending') quest.preserveUncertainty();
      else { quest.inspect('carbon'); resolve(quest, 'paper'); }
      return quest.getView().voice;
    });
    assert.equal(new Set(voices).size, 4);
  }
});

test('every player-visible response is anonymous across seeds, methods and revisit states', () => {
  const hidden = /李承禮|張守恆|周啟文|陳柏勳|林婉真|王世榮|謝玉琴|劉志遠|MED-\d|"(?:identity|runKey)"|\b(?:LI|ZHANG|ZHOU|CHEN|Li|Zhang|Zhou|Chen)\b/;
  assert.doesNotMatch(JSON.stringify(SIGNAL_LEDGER_SPEC), hidden);
  for (const identity of identities) {
    const quest = makeQuest({ identity });
    const responses = [quest.getView(), quest.enter(context), quest.preserveUncertainty(), quest.inspect('bad'), quest.submit({ method: 'bad' })];
    for (const point of SIGNAL_LEDGER_SPEC.points) responses.push(quest.inspect(point.id), quest.inspect(point.id));
    responses.push(quest.preserveUncertainty(), quest.leave(), quest.enter(context), resolve(quest, 'paper'), quest.leave(), quest.enter(context), resolve(quest, 'clock'));
    responses.forEach(response => assert.doesNotMatch(JSON.stringify(response), hidden));
  }
});

test('snapshot and view mutations cannot modify internal state or global content', () => {
  const quest = makeQuest(); quest.enter(context);
  const snapshot = quest.snapshot(); snapshot.observed.push('carbon'); snapshot.outcome = 'sequence-preserved';
  const view = quest.getView(); view.points[0].observed = true; view.orderChoices[0].order.reverse();
  assert.deepEqual(quest.snapshot().observed, []);
  assert.deepEqual(SIGNAL_LEDGER_SPEC.orderChoices[0].order, ['A', 'B']);
  assert.throws(() => { SIGNAL_LEDGER_SPEC.points[0].text = 'changed'; }, TypeError);
});

test('invalid inputs fail locally without consuming evidence or changing results', () => {
  for (const runKey of [undefined, '', null, {}, NaN, Infinity]) assert.throws(() => makeQuest({ runKey }), TypeError);
  for (const identity of ['unknown', '__proto__', 'toString', null]) assert.throws(() => makeQuest({ identity }), TypeError);
  for (const identity of ['LI', 'ZHANG', 'ZHOU', 'CHEN']) assert.doesNotThrow(() => makeQuest({ identity }));
  const quest = makeQuest(); quest.enter(context); const before = quest.snapshot();
  assert.equal(quest.inspect('__proto__').code, 'unknown-point');
  assert.equal(quest.submit().code, 'unknown-method');
  assert.deepEqual(quest.snapshot(), before);
});

test('quest implementation has no dependency or global story mutation; route lengths remain canonical', () => {
  const source = readFileSync(new URL('../src/optional/SignalLedgerQuest.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /^import\s/m);
  assert.doesNotMatch(source, /\b(?:window|document|localStorage|Math\.random|setTimeout|setInterval)\b/);
  assert.deepEqual(Object.fromEntries(Object.entries(IDENTITY_ROUTES).map(([id, route]) => [id, route.length])),
    { ZHANG: 16, LI: 17, ZHOU: 16, CHEN: 15 });
  assert.equal(SIGNAL_LEDGER_ID, 'optional.signal-ledger.v1');
});

test('real four-seed managers are unchanged by optional play; skip and play keep identical B2/M9 endings', () => {
  for (const identity of ['LI', 'ZHANG', 'ZHOU', 'CHEN']) for (const method of ['paper', 'clock']) {
    const storage = makeStorage();
    const manager = IdentityManager.createForTest(identity, storage);
    const skipped = IdentityManager.createForTest(identity, makeStorage());
    const before = manager.snapshot();
    const persistedBefore = storage.getItem(IDENTITY_STORAGE_KEY);
    // Explicit 4F host fixture: data compatibility, not a browser/travel assertion.
    const quest = new SignalLedgerQuest({ runKey: manager.runSave.runSeed, identity: manager.currentIdentity, storage });
    quest.enter(context); SIGNAL_LEDGER_SPEC.points.forEach(point => quest.inspect(point.id));
    quest.preserveUncertainty(); quest.leave(); quest.enter(context); resolve(quest, method); quest.leave();
    assert.deepEqual(manager.snapshot(), before);
    assert.equal(storage.getItem(IDENTITY_STORAGE_KEY), persistedBefore);
    for (const instance of [manager, skipped]) {
      while (instance.currentRouteStep !== 'B2') assert.equal(instance.completeRouteStep(instance.currentRouteStep), true);
      assert.equal(instance.enterB2(), true);
      assert.equal(instance.enterB2(), false);
      assert.equal(instance.canEnterB2(), false);
      while (instance.currentRouteStep !== 'M9') assert.equal(instance.completeRouteStep(instance.currentRouteStep), true);
      assert.equal(instance.commitM9(identity, identity).type, 'GOOD_END');
      assert.equal(instance.commitM9(identity, identity).reason, 'ALREADY_COMMITTED');
    }
    assert.deepEqual(manager.snapshot(), skipped.snapshot());
  }
});
