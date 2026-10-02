// Optional, data-only investigation. The host owns meshes, modal input and routes.
// No imports from world, IdentityManager, HospitalSimulation or story directors.
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

export const SIGNAL_LEDGER_ID = 'optional.signal-ledger.v1';
export const SIGNAL_LEDGER_SPEC = freeze({
  id: SIGNAL_LEDGER_ID,
  title: '交班訊號缺頁',
  zoneId: 'first_campus_4f',
  entryLabel: '查看封存通訊資料夾（支線）',
  introduction: '護理站資料角有一只燻黑的封存夾。日期與姓名欄都已遮蔽，夾內只剩通訊線路檢查音的列印帶與事故後重印件。這是載體來源調查，不能證明當年的警告內容或接聽者。可以核對，也可以隨時放回。',
  points: [
    { id: 'strips', label: '攤開兩段列印帶', prop: '封存列印帶透明袋',
      text: 'A 段：列印機相對讀數 +07 分，內容是「通訊線路檢查音」；B 段：交班鐘相對讀數 +06 分，內容欄被遮蔽。A、B 只是這兩段紙的袋號。日期、姓名與分機都不可辨識，讀數不是火災當晚的實際時刻。',
      revisit: '兩段紙仍在：A 是列印機 +07，B 是交班鐘 +06。沒有新的姓名或通話內容出現。' },
    { id: 'carbon', label: '側光查看複寫壓痕', prop: '可翻面的複寫底板',
      text: '底板兩個袋位仍有壓痕：「A／封存前原帶」與「B／事故後重印」。印字被遮掉，壓痕只辨認載體來源；不能把重印當作一通新電話。把兩段紙按來源先後排回，就能保留這個差別。',
      revisit: '側光下仍能讀到：A／封存前原帶，B／事故後重印。' },
    { id: 'calibration', label: '翻看時鐘校驗卡', prop: '封存夾附帶的設備校驗卡',
      text: '同一基準檢查的校驗卡寫著：列印機快 3 分，交班鐘偏差 0 分。要比較，列印機讀數減 3，交班鐘讀數不動。這張卡只適用於夾內這次相對讀數，不能校正主線的 21:17 或 02:17。',
      revisit: '校驗規則沒有改變：列印機減 3 分；交班鐘保持原讀數。' },
    { id: 'seal', label: '讀取交班簿封存頁', prop: '獨立封存交班簿',
      text: '封存頁註記：交班鐘相對讀數 +05 分時封夾，事故後補入重印件，絕對日期已燻損。若使用校驗卡，A 的 +07 減 3 得 +04，B 仍是 +06；+04 在封夾前，+06 在封夾後。只能核對這兩份載體的先後。',
      revisit: '封夾基準仍是交班鐘 +05 分。日期空白仍保持空白。' }
  ],
  methods: [
    { id: 'paper', label: '依複寫壓痕排回', required: ['strips', 'carbon'],
      hint: '查看列印帶及底板壓痕，再把封存前原帶放在事故後重印之前。' },
    { id: 'clock', label: '校正讀數再排回', required: ['strips', 'calibration', 'seal'],
      hint: '查看兩段紙、校驗卡及封存頁；先修正列印機，再與封夾 +05 分比較。' }
  ],
  orderChoices: [
    { id: 'A-B', label: 'A 在前，B 在後', order: ['A', 'B'] },
    { id: 'B-A', label: 'B 在前，A 在後', order: ['B', 'A'] }
  ],
  correctionChoices: [
    { minutes: -3, label: '列印機減 3 分；交班鐘不動' },
    { minutes: 0, label: '兩邊都保留原讀數' },
    { minutes: 3, label: '列印機加 3 分；交班鐘不動' }
  ],
  unresolvedLabel: '保留原件與未確認事項',
  returnLabel: '放回資料夾，返回目前主線',
  resultText: {
    investigating: '資料尚未核對；隨時可以返回目前主線。',
    'uncertainty-preserved': '原件與空白都已保留，載體先後尚未確認。回訪可繼續調查。',
    'sequence-preserved': '已分開封存前原帶與事故後重印：A → B。重印不等於新通話；沒有補填姓名、日期或警告內容。'
  }
});

// Internal route keys only; getView() returns the anonymous line, never the key.
const VOICES = freeze({
  Li: { start: '「章與欄位都在，來源卻未必相同。先把原件和補件分開。」',
    pending: '「不能讓空白看起來像已完成。未核對的部分照原樣留下。」',
    solved: '「先後已核對，內容仍待確認。這份紀錄不能替任何人簽名。」' },
  Zhang: { start: '「先看紙本留下了什麼，再看它被寫成什麼。」',
    pending: '「紙留下了，缺的部分也留下了。我還不能說有人接到電話。」',
    solved: '「原帶和重印不是同一種證據。這次我把看到的寫清楚。」' },
  Zhou: { start: '「留下訊號，和有人聽懂，是兩件事。先別補上後半句。」',
    pending: '「沒有確認的回音，不能寫成已經送達。下次再看。」',
    solved: '「先後能分開了，誰曾聽見仍是空白。至少沒有再把它們混在一起。」' },
  Chen: { start: '「讀數來自兩台設備。讓它們用同一個基準，再談先後。」',
    pending: '「先把原件收好。沒有來源的補登，不能當成新的工作已完成。」',
    solved: '「校正的是載體順序，沒有恢復那通電話。流程的空白還在。」' }
});
const keys = { LI: 'Li', ZHANG: 'Zhang', ZHOU: 'Zhou', CHEN: 'Chen' };
const pointIds = SIGNAL_LEDGER_SPEC.points.map(point => point.id);
const methodById = id => SIGNAL_LEDGER_SPEC.methods.find(method => method.id === id);
const hasEvidence = (state, method) => method.required.every(id => state.observed.includes(id));
const fresh = runKey => ({ version: 1, runKey, visits: 0, observed: [], outcome: 'investigating', method: null });
const validOrder = order => Array.isArray(order) && order.length === 2 && order[0] === 'A' && order[1] === 'B';

function restore(saved, runKey) {
  const state = fresh(runKey);
  if (!saved || saved.version !== 1 || saved.runKey !== runKey) return state;
  state.visits = Number.isSafeInteger(saved.visits) && saved.visits >= 0 ? saved.visits : 0;
  state.observed = Array.isArray(saved.observed) ? [...new Set(saved.observed.filter(id => pointIds.includes(id)))] : [];
  const method = methodById(saved.method);
  if (saved.outcome === 'sequence-preserved' && method && hasEvidence(state, method)) {
    state.outcome = saved.outcome;
    state.method = method.id;
  } else if (saved.outcome === 'uncertainty-preserved' && state.observed.length) {
    state.outcome = saved.outcome;
  }
  return state;
}

export class SignalLedgerQuest {
  #state;
  #voice;
  #storage;
  #storageKey;
  #active = false;

  constructor({ runKey, identity, storage } = {}) {
    if (!['string', 'number'].includes(typeof runKey) || String(runKey).length === 0 ||
        (typeof runKey === 'number' && !Number.isFinite(runKey))) throw new TypeError('A stable runKey is required');
    const key = Object.hasOwn(keys, identity) ? keys[identity] : identity;
    if (!Object.hasOwn(VOICES, key)) throw new TypeError('Use an existing Li/Zhang/Zhou/Chen route key');
    this.#voice = VOICES[key];
    this.#storage = storage;
    this.#storageKey = `IdentityLoop_Optional_SignalLedger_v1:${encodeURIComponent(String(runKey))}`;
    this.#state = fresh(String(runKey));
    try { this.#state = restore(JSON.parse(storage?.getItem(this.#storageKey) || 'null'), String(runKey)); }
    catch { /* Storage is optional; active-session investigation remains playable. */ }
  }

  snapshot() { return structuredClone(this.#state); }
  #save() {
    try { this.#storage?.setItem(this.#storageKey, JSON.stringify(this.#state)); } catch { /* Session only. */ }
  }
  #reply(ok, code, text) { return { ok, code, text, view: this.getView() }; }

  getView() {
    const state = this.#state;
    const voice = state.outcome === 'sequence-preserved' ? this.#voice.solved :
      state.outcome === 'uncertainty-preserved' ? this.#voice.pending : this.#voice.start;
    return structuredClone({
      id: SIGNAL_LEDGER_ID, title: SIGNAL_LEDGER_SPEC.title, active: this.#active,
      outcome: state.outcome, method: state.method,
      summary: SIGNAL_LEDGER_SPEC.resultText[state.outcome], speaker: '值班醫師', voice,
      points: SIGNAL_LEDGER_SPEC.points.map(point => ({ id: point.id, label: point.label, observed: state.observed.includes(point.id) })),
      methods: SIGNAL_LEDGER_SPEC.methods.map(method => ({
        id: method.id, label: method.label, ready: hasEvidence(state, method), hint: method.hint
      })),
      orderChoices: SIGNAL_LEDGER_SPEC.orderChoices,
      correctionChoices: SIGNAL_LEDGER_SPEC.correctionChoices,
      unresolvedLabel: SIGNAL_LEDGER_SPEC.unresolvedLabel,
      returnLabel: SIGNAL_LEDGER_SPEC.returnLabel
    });
  }

  enter({ zoneId, canOptIn = false } = {}) {
    if (this.#active) return this.#reply(true, 'already-open', '資料夾仍然攤開；可以繼續核對或放回。');
    if (zoneId !== SIGNAL_LEDGER_SPEC.zoneId || canOptIn !== true) {
      return this.#reply(false, 'unavailable', '先完成眼前的對話或緊急事件，再查看封存資料夾。');
    }
    this.#active = true;
    const revisit = this.#state.visits > 0;
    this.#state.visits = Math.min(Number.MAX_SAFE_INTEGER, this.#state.visits + 1);
    this.#save();
    return this.#reply(true, revisit ? 'revisit' : 'opened',
      revisit ? `再次翻開資料夾。${SIGNAL_LEDGER_SPEC.resultText[this.#state.outcome]} ${this.getView().voice}` :
        `${SIGNAL_LEDGER_SPEC.introduction} ${this.#voice.start}`);
  }

  inspect(id) {
    if (!this.#active) return this.#reply(false, 'closed', '先在4F資料角翻開封存夾。');
    const point = SIGNAL_LEDGER_SPEC.points.find(item => item.id === id);
    if (!point) return this.#reply(false, 'unknown-point', '請選擇資料夾中可見的調查點。');
    const revisit = this.#state.observed.includes(id);
    if (!revisit) { this.#state.observed.push(id); this.#save(); }
    return this.#reply(true, revisit ? 'reread' : 'observed', revisit ? point.revisit : point.text);
  }

  submit({ method: methodId, order, correctionMinutes } = {}) {
    if (!this.#active) return this.#reply(false, 'closed', '先翻開資料夾，再決定紀錄方式。');
    const method = methodById(methodId);
    if (!method) return this.#reply(false, 'unknown-method', '請選擇複寫壓痕或校正讀數的核對方式。');
    if (!hasEvidence(this.#state, method)) return this.#reply(false, 'missing-evidence', method.hint);
    if (methodId === 'clock' && correctionMinutes !== -3) {
      return this.#reply(false, 'clock-mismatch', '列印機快 3 分，必須減 3；交班鐘不動。可以重讀校驗卡再試。');
    }
    if (!validOrder(order)) return this.#reply(false, 'order-mismatch', methodId === 'paper' ?
      '底板標示 A 是封存前原帶，B 是事故後重印。請按這兩份載體的來源先後排回。' :
      '校正後 A 是 +04，封夾是 +05，B 是 +06。請按這個先後排回。');
    this.#state.outcome = 'sequence-preserved';
    this.#state.method = methodId;
    this.#save();
    return this.#reply(true, 'resolved', `${SIGNAL_LEDGER_SPEC.resultText[this.#state.outcome]} ${this.#voice.solved}`);
  }

  preserveUncertainty() {
    if (!this.#active) return this.#reply(false, 'closed', '先翻開資料夾，再決定紀錄方式。');
    if (!this.#state.observed.length) return this.#reply(false, 'missing-evidence', '先查看任一份原件；也可以直接放回資料夾返回主線。');
    if (this.#state.outcome === 'sequence-preserved') return this.#reply(true, 'already-resolved', '已核對的載體順序保留；姓名與內容仍未確認。');
    this.#state.outcome = 'uncertainty-preserved';
    this.#state.method = null;
    this.#save();
    return this.#reply(true, 'preserved', `${SIGNAL_LEDGER_SPEC.resultText[this.#state.outcome]} ${this.#voice.pending}`);
  }

  leave() {
    // Host closes its own panel. No teleport, route advancement or story flag.
    this.#active = false;
    this.#save();
    return this.#reply(true, 'return-to-mainline', '資料夾已放回。調查保留在獨立支線紀錄；繼續目前的主線目標。');
  }
}
