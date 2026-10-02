# Identity Loop — 可玩發布驗收門檻

本清單定義每個可發布增量必須留下的證據。四身份路線、既有醫院地圖與原網頁引擎沿用；本輪為角色視覺與運動改進，不能等同完整獨立遊戲製作完畢。

## 發布規則

- 每輪先固定來源 commit，再建置及測試同一份 bundle；瀏覽器測試期間不重建 dist。
- 修正失敗的實際原因後，重跑受影響檢查。不能降低門檻、跳過測試或用 QA 直接推進章節來證明玩家流程。
- 自動檢查、QA 位置／章節 fixtures、連續行走與真人遊玩分開記錄。只有完成者可標示 PASS。
- 公開版必須與已驗收 commit 一致，部署 workflow 成功後再次核對 build-info 和實際入口。發布授權依每輪使用者指示處理。

## 必要證據

| 門檻 | 執行方式 | PASS 的範圍 |
| --- | --- | --- |
| 可重建來源 | npm ci、npm run build、asset budget | 鎖定依賴、缺檔與大小；chunk warning 必須記錄 |
| 主線／身份／存檔 | npm run test:identity、CI Fast structural QA | 四 Seed 順序、每節恢復、B2 單向、M9 單次提交、Patientization 和匿名契約 |
| 四 Seed 開場到結局 | test-identity-routes-browser.mjs | 真實 UI 和故事 handlers 的內容路線；使用 QA arrival／beat helper，**不等於連續第一人稱通關** |
| 連續空間導航 | test-playable-walkthrough.mjs | 無 teleport／loadZone 的瀏覽器控制器行走、門、樓梯及電梯；不等於四 Seed 主線通關 |
| 實體劇情互動 | test-clinical-interactions-browser.mjs | 支撐站位、遮擋、E 與 UI；含 checkpoint fixtures |
| 結局重入／錯選 | test-identity-m9-pair-browser.mjs、test:identity | 雙欄選擇、正／錯配、重複提交、防重入和結局動畫 |
| 新增探索 | npm run test:exploration、test-hospital-annex-browser.mjs | 分機／器材、回復、原件保留、雙路徑支線與不改主線 |
| 觸控／載入恢復 | test-mobile-hospital-browser.mjs | 多指移動視角、長按、縮放、轉向、彈窗、失敗預載與 ready gate |
| 角色接地／運動 | npm run test:character、角色實景 browser QA | 有限頂點、成人比例、腳底不穿地、交替落腳、受限轉身、匿名與預算 |
| 素材／音訊 | test-audio-runtime.mjs、test-material-runtime.mjs、資源瀏覽器檢查 | 音訊與材質生命週期／降級；需另外真人聽辨混音 |
| 視覺檢查 | 同光源、同視窗、同鏡頭的真實 production 畫面 | 臉／全身／側面／遠景及手機 UI；不得用重打光隱藏缺陷 |
| 公開版一致性 | verify-live-build.mjs、公網 desktop/mobile smoke | build-info、模組 fingerprint、HTTP 和實際互動 |

## 上線品質仍需人工與實機完成

以下任何空白都不得宣称「獨立工作室可正式上市的品質已驗收」。

- 四 Seed 從空存檔開始，完全不使用 QA helpers 的真人鍵鼠通關；每條記錄耗時、迷路點、非預期卡關與結局。
- 同樣四 Seed 的實機觸控通關，包含橫直向、背景切換、來電打斷、音訊恢復及舊存檔更新。
- Android/iOS 具名裝置矩陣：Performance / Quality / Ultra 的 10 分鐘 p95 frame time、峰值記憶體、溫度及崩潰。無實機不得宣稱 30/60 FPS 達標。
- 低速網路／中斷／缺失材質與音訊下可恢復；PWA 安裝、更新與相容性。現階段無 service worker、無離線保證、無原生封裝。
- 真人確認故事提示、公平推理、文件可讀性、混音和恐怖節奏；訓練人偶保持無呼吸，不能變成活人。
- 角色多個同場的實際場景 draw／tri budget，包括安妮三種姿態及其狀態切換、場景卸載。

## 角色增量（本輪）

器材人員使用作者定義的身體截面取代球／膠囊拼裝，重新設定成人頭身、肩線、工作衣、短髮、貼合口罩與工作鞋。行走由實際位移驅動步相，兩節腿解算腳底接地；轉身限制角速度，在折返先轉身再走；站姿有小幅重心、呼吸和視線，巡查／噪音調查仍讀取既有獨立 simulation。

安妮另行改版、保留三種既有狀態與所有敘事掛點。合併前需要其來源 commit 及獨立 QA；器材人員改版不能當成安妮完成證據。

本輪本機證據目錄：`../../qa-evidence/character-refinement/`（相對 repo）。測試結果、截圖與發布證據以 handoff 的精確檔案為準。


## 已確認的續玩界線

獨立 QA 已確認 Li M1 在簽到、HIS 送出與領取鑰匙後、章末收尾前重新整理，仍保留 Seed，但可能回到該章起點重做章內互動。這是章節檢查點恢復，不是任意時點／位置／UI 的完整存檔。設定介面已補充此界線；完整章內恢復是後續驗收項，不能從現有單元測試的 PASS 推論完成。
