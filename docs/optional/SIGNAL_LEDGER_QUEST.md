# 交班訊號缺頁：獨立 optional 調查模組

基底：`bfa960a0bbf2410c7c40c931e2a8b1aee1f40593`，owner `feat/mobile-hospital-slice`。
本工作樹：`task-4/identity-loop`，分支 `feat/optional-signal-ledger`。
檢查 repository 及祖先目錄後未找到適用的 AGENTS.md、.agents 或 .codex 指令。
依使用者指定基底及隔離工作樹指令開發；CURRENT_SOURCE_OF_TRUTH.md 的歷史 master 作業流程不覆蓋此次明確授權。

檔案所有權僅限：

- `prototype/src/optional/SignalLedgerQuest.js`：完整台詞、互動資料、可執行調查狀態機、獨立持久化。
- `prototype/scripts/test-signal-ledger-quest.mjs`：Node 原生單元／契約測試，無外部套件需求。
- 本文件：內容規格與 owner 接入建議。

沒有修改 main、world、identity、HospitalSimulation、owner 的 HospitalSideCase／HospitalExcursion，沒有新增二進位素材。
此模組可由測試或 host UI 完整遊玩；真正的 3D 掛點及畫面由 owner 接入，本提交未宣稱場景已出現在遊戲中。

## 範圍與故事邊界

既有合理區域：第一院區 4F 護理站資料角。放置獨立封存夾、列印帶透明袋、複寫底板、校驗卡及交班簿，均可沿用既有紙張／器材幾何。
與 owner 檢修廊的「驗收單／接點／風口低壓測試」不同，也不替代 316 劇情電話、Zhou 的警告通話、409 醫囑、主線名冊或文史館。

新增局部資料為火災相關封存包的載體檢查：封存前的通訊線路**檢查音**原帶與事故後重印件。日期燻損，姓名／分機／內容遮蔽。
相對讀數是同一次設備校驗的基準，不是 1998 火災的絕對時刻，不用於校正 21:17、02:17 或推斷起火先後。
成功只證明「A 原帶在前，B 重印在後；重印不能当成新通話」。不證明警告送達、接聽者、操作 B-Panel 的人、責任或玩家身分。
既有 B2 真相與起火點未知、B2 單向、M9 一次正式提交及 Patientization 均維持原契約。結果從不成為主線 gate 或 identity evidence。

## 可玩流程與完整互動規格

1. 4F 無對話／過場／緊急主線事件時，玩家 E／手機互動「查看封存通訊資料夾（支線）」；第一次進入顯示 `SPEC.introduction` 與匿名知覺台詞。
2. 四個可見調查點均立即可查看，不限制順序。每點初讀 `text`、重讀 `revisit`。主線任務面板不被換成支線目標。
3. 玩家選方法、紙袋順序及（時鐘法）校正方式，按「核對排回」執行 `submit`。所有選項來自模組，不要求輸入無依據的密碼。
4. 也可以讀任一原件後選「保留原件與未確認事項」。這是獨立未確認結果，可回訪繼續。
5. 「放回資料夾，返回目前主線」常駐，初次打開未查看原件也可離開。錯誤／缺證據不鎖按鈕、不扣資源、不產生失敗結局。

| 點 ID | 實體及操作 | 初讀資訊／可供解題的證據 | 重訪 |
| --- | --- | --- | --- |
| `strips` | 透明袋，攤开 A、B 紙帶 | A 列印機 +07，B 交班鐘 +06；匿名、相對讀數 | 保留兩讀數，不長出姓名 |
| `carbon` | 底板翻面／側光 | 壓痕 A＝封存前原帶、B＝事故後重印 | 相同壓痕可重查 |
| `calibration` | 校驗卡翻頁 | 列印機快3分，減3；交班鐘偏差0 | 保留完整校驗規則 |
| `seal` | 交班簿封存頁 | 交班鐘 +05 封夾；+04 < +05 < +06，僅載體先後 | 封夾基準仍 +05 |

所有完整台詞直接位於 `SIGNAL_LEDGER_SPEC`，沒有第二套文案或只存在文件的故事。
拒絕、缺證據、解錯、成功、未確認、離開、重讀與回訪的完整台詞也在模組中，方法與選項的 ready/hint 可直接驅動按鈕。

兩條獨立解法：

- **紙本法**：查看 `strips` 和 `carbon`（兩種順序皆可），選 `paper`、`A-B`。不需要看校驗卡或封存頁。
- **時鐘法**：查看 `strips`、`calibration`、`seal`（六種順序皆可），選 `clock`、列印機 `-3`、`A-B`。不需要看複寫底板。

全部四個點也能任意順序調查：24種 × 4 Seed × 2 方法＝192條完整核對路徑已測試。
選 B-A 或錯誤校正時，回應指出已提供的壓痕或時間關係；不紀錄完成，重新選即可。

## Seed 差異

輸入接受内部 `Li/Zhang/Zhou/Chen`，也接受 runtime `LI/ZHANG/ZHOU/CHEN`。
Seed 只改匿名知覺台詞，證據、選項、解法、難度、結果完全相同。不抽取新 Seed、不调用 RNG。
UI 只使用 `getView()`／回應的 `text`，不可列印 constructor 的 identity 或 `snapshot()`。

| 內部 key | 開始知覺 | 未確認／成功知覺 |
| --- | --- | --- |
| Li | 原件和補件的程序來源不同 | 不填完成欄／不能替任何人簽名 |
| Zhang | 紙本痕跡對照文件說法 | 不推論接聽／只寫看見的 |
| Zhou | 訊號留下和被聽懂不同 | 不推論送達／保留回音空白 |
| Chen | 兩設備必須同一基準 | 原件收好／校正順序不能恢復電話 |

每種觀點的開始、未確認、成功各有完整中文台詞（共12句），均不包含姓名、完整員編或當前身分 key。

## 狀態與 API

```js
import { SignalLedgerQuest, SIGNAL_LEDGER_SPEC } from './optional/SignalLedgerQuest.js';

// 每個既有 run 建立一次。從已保存的 manager 取值，不能重新抽 Seed。
const quest = new SignalLedgerQuest({
  runKey: identityManager.runSave.runSeed,
  identity: identityManager.currentIdentity,
  storage: safeOptionalStorage // 注入 localStorage 或 undefined，取得時也要 catch
});

quest.enter({ zoneId: worldRouter.activeZoneId, canOptIn: hostCanOptIn });
quest.inspect('strips');
quest.inspect('carbon');
quest.submit({ method: 'paper', order: ['A', 'B'] });
// 或 inspect strips/calibration/seal 後：
quest.submit({ method: 'clock', order: ['A', 'B'], correctionMinutes: -3 });
quest.preserveUncertainty();
quest.leave();
```

- `enter/inspect/submit/preserveUncertainty/leave` 同步回傳 `{ok, code, text, view}`。失敗回應不增加證據或消耗資源。
- `getView()` 回傳可直接渲染的匿名標題、摘要、台詞、調查點 observed、方法 ready/hint、順序／校正選項及返回文字。每次為深拷貝。
- `snapshot()` 是純資料深拷貝，供診斷，不供玩家 UI；不含 manager 或 Three 物件。
- `visits` 只在由關閉到成功打開時增加；已打開重入不重複計數。
- `observed` 去重，最多四項，不累積無界互動紀錄。
- 結果為 `investigating`／`uncertainty-preserved`／`sequence-preserved`；method 是 `null/paper/clock`。成功可重查或換另一方法驗證；未確認選擇不擦除已確認事實。
- `leave()` 永遠成功，包含尚未打開或尚未閱讀。不移動角色、不開關門、不變更章節，也不把主線判成完成。
- 持久化只用 `IdentityLoop_Optional_SignalLedger_v1:<encoded runKey>`，不讀寫 IdentityState、Hospital 或 DutyNight keys。
- 同 run 重載還原調查與結果，模態始終關閉。新 runKey 是新調查；舊 runKey 保存獨立紀錄。與既有 HospitalSimulation 一樣，以已保存 runSeed 隔離；如果 owner 提供更強的唯一 Loop token，可直接傳入，勿在每次掛載產生 token。
- 格式／版本／runKey 不合恢復預設；異常 clues 去掉；沒有方法證據的完成狀態降為 investigating。Storage 拒絕時當前 session 可正常解題。

## owner 接入建議（本提交不套用）

只需由 owner 在自己的 UI／3D 檔案做以下最小接入；不修改 IdentityManager 的 routes/evidence：

1. 在 4F **獨立資料角**掛資料夾入口與四個可辨識道具，使用既有 E／觸控 raycast。遠離原 409 表單／工作車、器材電話、檢修廊入口及人員行走線；精確座標由 owner 在目前 phase3 場景決定並驗證。
2. 入口呼叫 `enter`；`canOptIn` 嚴格由 host 計算，需在4F、controller允許、無 UI 對話／cinematic、director不 busy、不存在 binding auto/pending transition、run未結束、不在 M8 身分戰。拒絕時只显示 `text`。
3. 成功後開獨立 panel，使用 `view`。設計為一個原地調查；不離開4F，不使用 B2 回程。可呈現紙張特寫與調查按鈕，實體掛點使用同一組 point IDs。
4. panel 以既有 modal 機制暫停控制／巡查及主線導演 update；在開啟前記住控制狀態，關閉後恢復。**不要**暫時把 IdentityManager.currentMilestone 變成支線，也不要改導演 beatIndex/awaitingZone。主線任務仍顯示原本目標。
5. panel 的每個選擇直接呼叫上述 API，顯示回應並刷新 `view`。核對排回順序及校正選项要可見，不能以「讀完自動成功」替代玩家操作。
6. 返回鈕／ESC／頁面離開／zone卸載都呼叫 `leave()`，关闭 panel，恢复 modal 控制。若緊急主線／cinematic開始，優先關閉支線；保留調查資料供日後重訪。新 Loop 时重新建 quest，不沿用前回合實例。
7. 如提供獨立支線紀錄頁，僅显示 `getView()` summary/method，不將 outcome 写入 manager.evidence；主線讀取不到此結果是正確行為。

回應契約示例（owner panel callback）：

```js
function showQuestResult(result) {
  optionalPanel.setText(result.text); // textContent，避免 HTML 注入
  optionalPanel.render(result.view);
}
optionalPanel.onInspect = id => showQuestResult(quest.inspect(id));
optionalPanel.onSubmit = selection => showQuestResult(quest.submit(selection));
optionalPanel.onPreserve = () => showQuestResult(quest.preserveUncertainty());
optionalPanel.onReturn = () => {
  const result = quest.leave();
  optionalPanel.close();
  hostRestoreModalState();
  hostShowSubtitle(result.text);
};
```

接入後 owner 的新增 browser 驗收：四 Seed 匿名；两最短解法實際 E／觸控可完成；錯答重試；第一次立即返回／未確認返回／完成返回；重載重訪；pending主線事件拒绝入口；換區关闭panel；主線目标／beat／evidence深相等；B2不能从此支線返回4F；M9/Patientization不受影響。
這些是 owner 接入階段的實景驗收，不算成本提交的已通過測試。

## 本機驗證

在 `prototype/`：

```text
node scripts/test-signal-ledger-quest.mjs
```

20/20單元／契約測試通過，含192條完整調查路徑、两種最短解法、缺證據与錯答重試、四匿名觀點、無界紀錄防護、回訪／reload／新Loop隔離、storage異常、資料副本及主線依賴隔離。
另用真實四Seed IdentityManager 測試 play／skip 兩組存檔深相等、B2不能重入及 M9只能提交一次（每種方法皆測）；這是純狀態測試，非實景通關。
基底兼容驗證亦通過：`npm run test:identity` 35/35、`node test_final_patientization_choice_qa.js` 及 `npm run build`。
build 驗證的是未接入的既有遊戲可正常建置；新模組由独立 Node 測試執行，尚未包含在場景入口或瀏覽器驗收。
owner 可在 package.json 加 `test:signal-ledger`，並在自己的 QA runner 加入這個脚本；此提交不改共享測試清單。
