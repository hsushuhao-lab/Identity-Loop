# Identity Loop：mobile-first 醫院沉浸模擬規格與第一階段交付

基準：`origin/main` 的 `3bc5353`。正式引擎：`prototype/` 的 Three.js + Vite。
本增量為可玩的第一階段，不代表全院區、原生 App 或 AAA 製作完成。沿用原主線、空間與美術，不變更身份推理答案。

## 產品與平台選擇

桌面與手機共用同一個網頁遊戲、同一份內容與存檔契約。第一階段支援鍵鼠及手機瀏覽器觸控，另提供 PWA manifest 與 192/512 PNG 圖示。
目前採 online-first：沒有 service worker，也沒有宣稱離線可玩。正式 HTTPS 發布後才驗收 Android 安裝／iOS 加入主畫面與版本更新。這次没有部署。
原生封裝不是此階段的依賴；只有在實機 WebGL、記憶體、音訊、安裝體驗的測試證明需要時，才評估共用 web runtime 的封裝。不得假設 UE 有可直接沿用的 web 輸出。

## 樓層映射與主線保護

| 新願景 | 現有正式空間 | 本階段決定 |
| --- | --- | --- |
| 第一院區 8F 天橋 | `first_campus_8f` 院史展／天橋前廳；連至 `skybridge` | 保留；實際第二院區出口為 2F |
| 第一院區 7F 封閉區 | 無獨立正式 zone | 後續規格，沒有新增可玩樓層 |
| 第一院區 6F 教材／技能中心 | `phantom_6f` 消失樓層；M6 與電梯 glimpse 有主線意義 | 保留 phantom／劇情入口，不能變成一般電梯目的地 |
| 第一院區 5F 病房 | 無一般可玩 5F；現有 5F 病房在第二院區 | 不搬移 504B、醫囑或第二院區路線 |
| 第一院區 4F 護理站／408C／409 | `first_campus_4f`，既有 V5.2 平面與 32 床規格 | 新增可探索設備，保留臨床任務實體與所有原門禁 |
| 第一院區 3F 查哨／文史 | `first_campus_3f`，行政、316、文史與查哨 | 保留 |
| 第一院區 2F ER / 1F 大廳 | `first_campus_2f` / `first_campus_1f` | 保留 |
| B1 機電／倉庫 | `b1_dispatch_hub`，Chen 後勤接駁調度證據 | 不改寫為新機電主線 |
| B2 身分／火災核心 | `b2_archive`，單向封存層、客觀火災檔案 | 不新增回程或身份解答 |
| 地下通道／停車場／太平間／電梯井 | 部分為敘事或構想，沒有完整正式 zone | 後續定義，不能把存在的名稱當成已完成場景 |

隱藏 Seed 仍只抽取一次並持續保存；四路線長度與 M9 一次提交契約保留。
新增設備不能設定 `IdentityManager` 的章節、證據或結局。B2 後仍按每條路線回到正確區域；M1–M8 不公開當前身份。
門禁核對器的 `ACCESS GRANTED` 是紀錄矛盾，不能跳過原門禁。新增電話也不能替代原 316／急診劇情電話。

## 本階段可玩內容

4F 原護理站右側新增專用器材檯，支撐設備終端、分機電話與門禁紀錄讀卡器；東側通道新增輪椅。
所有實體共用現有 raycast／E／觸控互動入口，站立位置與遮擋由 browser QA 驗證。

- 終端：交班提醒、器材操作紀錄與局部工作燈供電；不修改醫囑或主線電源。
- 電話：三位數輸入、316／409／112，未知分機可撥但無人接聽；最多保存 12 筆通話。
- 回覆：316 有四種匿名知覺；409 依既有 run seed 穩定變化；112 在 00:33 與其他時間不同。文字與器材回饋音效；沒有新語音配音。
- 門禁核對：LI 要求核對授權；ZHANG 無授權來源；ZHOU 第三次顯示 21:17；CHEN 鑰匙槽痕跡。均不顯示姓名或員編。
- 監看：依真實玩家與輪椅位置更新的 4F 平面示意，250ms 更新一次。這不是多攝影機 3D render-to-texture CCTV。
- 輪椅：查看收納袋、在兩個停放位置間推動、移動碰撞盒、產生可聽輪椅聲與紀錄。玩家占據目的位置或距離太遠時拒絕推動。沒有坐乘、連續剛體推動、卡門、物品收納或 NPC 推車。

## 狀態與分區架構

既有 `GameState`／`IdentityManager`／路線導演管理故事與身份；新增 `HospitalSimulation` 只管理設備。
設備狀態沒有 Three.js 物件或背景區域實體；`WorldRouter` 建立目前 zone 時，從資料重建實體與碰撞盒。卸載 4F 的 mesh 不會抹除器材資料。
`IdentityLoop_Hospital_v1` 按 `runSeed` 隔離；新 Loop 重置器材，恢復相同 Loop 取回器材。localStorage 被封鎖時降為本次 session。
完整背景 NPC 排班／聽覺／逃跑系統尚未實作；既有故事 NPC 狀態未改動。

電梯保留目前區域並关門動畫 → 預載目的地 essential 模型／材質 → readiness 成功 → 建立目的地 → 開門／恢復控制。
必要資料錯誤或 20 秒期限未完成，顯示重試；手動電梯可取消並留在原樓層。逾時永遠不視為 ready，遲到的資源只能進快取，不能自動移動玩家。
劇情強制移動（含 B2 後單向離開）只提供重試，避免「取消」破壞不可逆事件。optional 美術繼續背景載入。
第一畫面必要資源也有期限與重試；WebGL2 renderer 無法啟動時顯示可理解的重新嘗試提示。

## 操作與可及性

| 桌面 | 手機 |
| --- | --- |
| WASD／方向鍵、Shift、滑鼠、E | 左側拖曳移動、右側拖曳視角、快走按住 |
| 中央 raycast 目標／雙擊走近 | 中央 ● 點按互動；550ms 長按觀察 |
| 原任務／推理面板 | 任務／紀錄切換，M9 與結局選項仍可直接操作 |
| E 繼續對話 | 大型「繼續」按鈕 |
| 原照片／監看檔案 | 照片、memory canvas、器材位置圖雙指縮放，雙點還原 |

支援直向與橫向；橫向更適合場景探索。模態、設定、動畫、失焦、pointercancel 與失去 capture 清除移動，避免黏住搖桿。
手機不要求 Pointer Lock；不存在的退出 API 使用可選呼叫。Web Audio 按既有使用者手勢解鎖。
震動預設關閉，只有 capability 存在且玩家勾選後使用；不要求陀螺儀權限。陀螺儀、系統聽筒路由、系統螢幕亮度沒有實作或宣稱支援。
尚未加入全域向上滑叫出遊戲手機，避免與第一人稱拖曳視角衝突；本階段先保留可見紀錄／分機界面。

## 可驗證性能目標

| 模式 | DPR 上限 | 陰影 | 主場景繪製節奏目標 | 每個觀測視角的 draw calls／triangles 預算 |
| --- | --- | --- | --- | --- |
| Performance | 1 | 關 | 30 FPS | 900 / 700,000 |
| Quality | 1.5 | 開 | 30 FPS | 1,200 / 900,000 |
| Ultra | 2 | 開 | 60 FPS | 1,200 / 900,000 |

粗指標裝置預設 Performance，其餘預設 Quality，玩家可改且保存。所有模式沿用現有材質與 essential asset，不代表已做低解析貼圖包。
主場景以 `requestAnimationFrame` 更新，依目標節奏限制 render，背景頁面停止主場景繪製。鏡頭與故事仍更新；結局／獨立 cinematic renderer 沿用原品質設定，後續需統一。
`QualitySettings.snapshot()` 提供 GPU 工作量、模式、DPR、最近 120 個自然繪製間隔的 p95；只有 `?qa=story` 可透過 `__storyQA` 查看。
目前截圖回歸採按需繪製，p95 為空，不得拿這些證據聲稱手機 30/60 FPS 達標。
全套既有 runtime assets 約 71.6 MB；它不是冷啟下載量，沒有自動離線整包快取。

## 階段與下一個驗收門檻

1. **已實作的 slice**：4F 四類實體／器材狀態、分機與匿名 Seed 差異、手機操作、品質模式、電梯錯誤恢复、manifest、可重現 QA。建置、四 Seed 保存／B2／M9 與新增 browser QA 必須通過。
2. **NPC／連鎖互動**：將值班排班、噪音事件、門與器材相互作用、真正 CCTV 取景做成獨立系統。驗收離區後 NPC 不增生，輪椅不可越過門／玩家，Seed 差異不成為答案；在 4F 完成一段可自由處理的事件。
3. **全院區與實機**：逐 zone 增加物件與 NPC；先確認樓層映射，再增加 5F／7F 等。Android 中階與旗艦、iPhone 與 iPad 分別進行 10 分鐘路線、峰值記憶體、thermal、冷／暖載入、旋轉、安全區域與音訊測試。30/60 FPS 只以實機測量驗收。
4. **發行門檻**：裝置矩陣、無網路／更新回復策略、HTTPS PWA 安裝與版本一致、完整四路線人工遊玩與 UI 無障礙。原生封裝由實機結果決定。合併、push、部署或商店發行需另有授權。

## 執行與驗證

在 `prototype/`：`npm ci`、`npm run dev` 或 `npm run build` / `npm run preview`。
手機同網路試玩可自行執行 `npm run dev -- --host 0.0.0.0`，以電腦的區網位址連線；需要該網路及 Windows 防火牆允许。主畫面安裝留待正式 HTTPS 環境驗收。
正常遊戲從 3F 進行交班後前往 4F，設備可自由探索。測試使用明確的 checkpoint fixture，不能冒充從頭到尾人工遊玩。

新增命令：`npm run test:hospital`、`npm run test:mobile`。預設 screenshot／JSON 證據輸出到 checkout 外的 `../../qa-evidence/mobile-hospital`。
既有 `npm run test:identity`，加 CI structural checks 與臨床／M9 browser regression；詳見本次工作區 `qa-evidence/HANDOFF.md` 的最終結果與既有失敗。

平台事實來源：
- [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events)
- [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action)
- [MDN PWA installability](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)
- [MDN Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
