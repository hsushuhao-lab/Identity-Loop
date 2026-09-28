const event = (label, lines, review, extra = {}) => ({ label, lines, review, ...extra });

export function getIdentityRouteScene(step, identity) {
  const reaction = choices => choices[identity];
  const scenes = {
    ZHANG_OPEN_4F: [
      event('抵達四樓護理站', [
        {speaker:'內心',text:'16:50。正式交班還沒開始。護理站裡已經有人在忙。'},
        {speaker:'內心',text:'先找到護理師，問清楚 408C 的狀況。'}
      ], '找到四樓護理站護理師')
    ],
    ZHOU_OPEN_8F: [
      event('檢視 1998 團隊合照', ['院史長廊最底非常安靜。大型照片裡是 1998 年青嶺醫療中心的核心夜班團隊。攝影者不在畫面中，角落只有相機包的影子。', '我：「光圈開太大了。後排有點糊。」', '往前一步。「拍的人站得太靠牆。」', '再一步。「如果退半步，右邊就不會切到門牌。」', '我停住：「……我為什麼一直在挑照片？」'], '記下構圖與缺席的攝影者', { art: 'photo', photoId: 'history_group_1998' }),
      event('接起緊急電話', ['第二院區護理師：「醫師，504B 突然胸痛。麻煩立刻過來！」', '我：「現在？」', '護理師：「現在。」', '我直接離開八樓。還沒交班。'], '立即前往 504B')
    ],
    CHEN_OPEN_SKYBRIDGE: [
      event('觀察黃昏天橋', ['天橋中央，窗外是黃昏。我停在玻璃前，看向第一院區，再看向第二院區，像是在判斷哪一邊比較近。'], '查看兩院區的方向'),
      event('接起胸痛會診電話', ['第二院區：「醫師！504B 胸痛！」', '我：「我現在過去。」', '我沒有問為什麼找我，也沒有問是不是還沒交班。直接轉身往第二院區。'], '循熟悉的路前往 504B')
    ],
    M1: [
      event('進入 316', [
        {speaker:'內心',text:reaction({
          ZHANG:'辦公室裡沒人了。以前如果我先跑去看病人，學長大概又會提醒我先把正式交班做完。',
          LI:'辦公室裡很安靜。桌上的值班本、HIS 和值班櫃都還留在原位。',
          ZHOU:'人都走了。以前學長等不到我，大概只會把交班東西留在桌上。',
          CHEN:'316 已經空了。先把正式交班補完，否則後面連門禁都不完整。'
        })},
        {speaker:'內心',text:'值班本、系統登入卡、HIS 電子交班、值班物品櫃。一項一項完成。'}
      ], '先查看並簽署值班本'),
      event('簽署值班簿', [
        {speaker:'內心',text:'值班本最後一頁停在今晚。簽名欄仍空著。'}
      ], '打開桌上的值班本並完成簽到'),
      event('取得 HIS 登入卡', [
        {speaker:'內心',text:'值班手冊寫著：系統登入卡收在書桌下方活動櫃。'}
      ], '打開書桌下方活動櫃，取得 HIS 登入卡'),
      event('完成 HIS 電子交班', [
        {speaker:'內心',text:'使用今晚的登入憑證進入 HIS，確認 4F 交班摘要並送出電子交班。'}
      ], '使用 316 HIS 工作站完成電子交班'),
      event('解鎖 316 值班物品櫃', [
        {speaker:'內心',text:'值班手冊留下的提示指向交班開始時間：17:00。電子櫃需要四位數密碼。'}
      ], '在 316 電子櫃輸入 1700 解鎖'),
      event('領取正式值班物品', [
        {speaker:'內心',text:'櫃內放著今晚正式的值班室鑰匙與 Staff Access Card。'},
        {speaker:'值班醫師',text:'「這樣才算真正完成交班。」'}
      ], '從電子櫃內拿取正式值班鑰匙與感應卡'),
      ...(identity==='ZHANG' ? [event('316 電話', [
        {speaker:'電話',text:'鈴——鈴——鈴——'},
        {speaker:'內心',text:'「奇怪……大家不是都走了？怎麼這時候還有人打 316？」'},
        {speaker:'第二院區護理站',text:'「值班醫師您好。醫師請你走八樓天橋過來第二院區，門禁已打開。」'},
        {speaker:'值班醫師',text:'「八樓天橋？……好，我現在過去。」'}
      ], '接聽 316 電話，搭電梯前往 8F 天橋')] : [])
    ],
    ZHANG_OUTBOUND_8F: [
      event('電梯經過六樓', [
        {speaker:'內心',text:'電梯從三樓往八樓上升。5F 之後，樓層顯示短暫停在「6」。'},
        {speaker:'內心',text:'門縫像是開了一瞬間。裡面不是病房，是一間臨床技能訓練中心。'}
      ], '搭電梯到 8F；途中記住 6F 一閃而過的畫面', { glimpse6f:true }),
      event('八樓天橋門禁', [
        {speaker:'內心',text:'八樓連通道門禁綠燈亮著。剛才電話裡說門禁已經打開。'},
        {speaker:'內心',text:'先穿過天橋到第二院區，再搭電梯到 5F。'}
      ], '由 8F 天橋前往第二院區')
    ],
    M2: [
      event('四樓護理站', reaction({
        ZHANG:[
          {speaker:'晚班護理師',text:'「值班醫師您好。你還沒去 316 正式交班吧？」'},
          {speaker:'值班醫師',text:'「還沒。我先來看病房。」'},
          {speaker:'晚班護理師',text:'「那先拿 4F 這組備用鑰匙跟臨時感應卡，只在這層用。」'},
          {speaker:'晚班護理師',text:'「408C 一直說隔壁有規律敲牆。你先去確認。」'}
        ],
        LI:[
          {speaker:'晚班護理師',text:'「值班醫師您好。408C 又在說隔壁有人敲牆。」'},
          {speaker:'值班醫師',text:'「我去確認。」'}
        ],
        ZHOU:[
          {speaker:'晚班護理師',text:'「值班醫師您好。408C 從剛才一直說隔壁有聲音。」'},
          {speaker:'值班醫師',text:'「先看 408C。」'}
        ],
        CHEN:[
          {speaker:'晚班護理師',text:'「值班醫師您好。408C 又在敲鈴，說隔壁有規律敲牆。」'},
          {speaker:'值班醫師',text:'「我去看。」'},
          {speaker:'內心',text:'504B 那張寫著 409-A 的轉院單還留在腦中。'}
        ]
      }), identity==='ZHANG'
        ? '向護理師拿 4F 備用鑰匙與臨時感應卡'
        : '向護理師確認 408C 狀況', {
          flag: identity==='ZHANG'?'ZHANG_4F_SPARE_KEY_BORROWED':null
        }),
      event('408C 確認', [
        {speaker:'408C 老先生',text:'「醫師，又來了。」'},
        {speaker:'值班醫師',text:'「哪裡？」'},
        {speaker:'408C 老先生',text:'「隔壁。四下，停一下，再九下。」'},
        {speaker:'聲音',text:'咚。咚。咚。咚。'},
        {speaker:'聲音',text:'……'},
        {speaker:'聲音',text:'咚。咚。咚。咚。咚。咚。咚。咚。咚。'},
        {speaker:'值班醫師',text:'「是 409 那個方向。」'}
      ], '到 408C 確認 4—停—9 的敲牆聲'),
      event('409 封閉房', [
        {speaker:'內心',text:'409 仍是封閉房。敲擊卻清楚地從門後傳出來。'},
        {speaker:'內心',text:reaction({
          ZHANG:'沒有確認裡面是誰以前，不能把這種聲音當成不存在。',
          LI:'封閉房間不該出現在任何正常床位流程裡。',
          ZHOU:'我見過有人站在這個角度記錄這扇門。',
          CHEN:'409-A。這個位置和第二院區那張轉送單對上了。'
        })}
      ], '確認 409 封閉房與敲擊來源', { knock409:true }),
      event('核對 409-A 臨時床位單', [
        {speaker:'晚班護理師',text:'「值班醫師您好。剛才系統又印出一張臨時床位單，麻煩你確認一下。」'},
        {speaker:'內心',text:'單張寫著「Bed 33／409-A」，但 409 明明仍封閉整修。'},
        {speaker:'值班醫師',text:'「先核對這張，不能直接當成正常床位。」'}
      ], '回護理站確認 409-A／Bed 33 臨時床位分配單')
    ],
    M3: [
      event('急診無名掛號', [
        {speaker:'急診護理師',text:'「值班醫師您好。這個人沒有可用的掛號資料，先看一下。」'},
        {speaker:'劉志遠',text:'「02:17……不要拉三個……紫色……警衛台……」'},
        {speaker:'值班醫師',text:reaction({
          ZHANG:'「先不要建立無名病歷。先確認他是誰。」',
          LI:'「先把他的吊牌、今晚工單和掛號時間對起來。」',
          ZHOU:'「你說的 B-Panel……是不是一樓警衛台附近那一套設備？」',
          CHEN:'「這個流水號我在另一個院區看過。先不要再開第二筆。」'
        })},
        {speaker:'內心',text:reaction({
          ZHANG:'流水號不能代替眼前這個人。',
          LI:'哪一個步驟先錯了，後面的資料才會全部跟著錯。',
          ZHOU:'剛才照片裡的設備背景，和他說的位置接起來了。',
          CHEN:'同一個人被兩個院區的流程反覆建立，才會變成幽靈紀錄。'
        })}
      ], '核對病人、吊牌與掛號流水號', { erRegistrationChoice: identity==='ZHANG' }),
      event('00:33 時間異常', [
        {speaker:'急診護理師',text:'「00:33 這筆掛號有編號，可是檢傷區、候診區、留觀床都找不到對應的人。」'},
        {speaker:'值班醫師',text:'「先不要再建新病歷。把 1998-ER-0217 這張掛號聯印給我。」'},
        {speaker:'急診護理師',text:'「系統註記寫著：ARCHIVE LOOKUP／316 LEGACY CLIENT。」'},
        {speaker:'值班醫師',text:'「316 有舊資料終端。我把這張帶回三樓查。」'}
      ], '帶著 1998-ER-0217 掛號聯回 316'),
      event('316 舊紀錄索引', [
        {speaker:'316 舊資料終端',text:'「ARCHIVE CLIENT READY｜1998-ER-0217」'},
        {speaker:'內心',text:'急診留下的掛號聯和舊終端終於對上。這不是要我來三樓查一般 HIS，而是查封存索引。'}
      ], '回 316，用舊終端查 1998-ER-0217')
    ],
    M4: [
      event('第二院區 5F 護理站報到', reaction({
        ZHANG:[
          {speaker:'第二院區護理師',text:'「值班醫師您好。504B 胸悶、心悸，剛才呼吸很快。」'},
          {speaker:'值班醫師',text:'「我有正式值班鑰匙，先進去看病人。」'}
        ],
        LI:[
          {speaker:'第二院區護理師',text:'「值班醫師您好。504B 胸痛會診。」'},
          {speaker:'值班醫師',text:'「我有值班鑰匙。生命徵象、心電圖、目前用藥先給我。」'},
          {speaker:'第二院區護理師',text:'「都在床邊。」'}
        ],
        ZHOU:[
          {speaker:'第二院區護理師',text:'「值班醫師您好。等等，你是不是還沒正式交班？」'},
          {speaker:'值班醫師',text:'「病人先處理。」'},
          {speaker:'第二院區護理師',text:'「你身上沒有正式值班鑰匙吧？先拿這串會診備用鑰匙，只開 504。看完病人記得還我。」'},
          {speaker:'值班醫師',text:'「好。」'}
        ],
        CHEN:[
          {speaker:'第二院區護理師',text:'「值班醫師您好。504B 又喘起來了。你還沒正式交班，先拿護理站這串會診備用鑰匙。」'},
          {speaker:'值班醫師',text:'「504？」'},
          {speaker:'第二院區護理師',text:'「對，只開 504。處理完就還回來。」'},
          {speaker:'內心',text:'她說得像這不是第一次借給我。'}
        ]
      }), (identity==='ZHOU'||identity==='CHEN')?'向 5F 護理站借會診備用鑰匙':'完成 5F 護理站報到', {
        flag:(identity==='ZHOU'||identity==='CHEN')?'SECOND_5F_CONSULT_KEY_BORROWED':null
      }),
      event('504B 胸痛評估', reaction({
        ZHANG:[
          {speaker:'504B 病人',text:'「醫師，我是不是心臟有問題？」'},
          {speaker:'值班醫師',text:'「先慢慢呼吸，我們先把危險原因排除。」'}
        ],
        LI:[
          {speaker:'值班醫師',text:'「先量生命徵象，心電圖我看一下。」'},
          {speaker:'504B 病人',text:'「我胸口一直悶。」'}
        ],
        ZHOU:[
          {speaker:'504B 病人',text:'「醫師，我是不是很嚴重？」'},
          {speaker:'值班醫師',text:'「我先確認你的狀況。其他事情等一下再說。」'}
        ],
        CHEN:[
          {speaker:'第二院區護理師',text:'「床邊資料都在原位。」'},
          {speaker:'值班醫師',text:'「好，我先看她。」'},
          {speaker:'內心',text:'房間配置、床位、器材位置熟得不合理。'}
        ]
      }), '完成 504B 床邊評估'),
      event('核對預填轉院單', [
        {speaker:'第二院區護理師',text:'「病人穩定一些了。這張轉院單已經先印出來。」'},
        {speaker:'內心',text:'病人尚未完成身分核對，轉院單卻已填好「409-A」。目的地早於評估出現。'},
        {speaker:'值班醫師',text:reaction({
          ZHANG:'「先確認病人身分與目的地，這張不能直接簽。」',
          LI:'「表格完整不代表流程正確。這份先暫停。」',
          ZHOU:'「這張單的時間，我要和剛才看到的影像對一下。」',
          CHEN:'「……409-A。為什麼這個目的地這麼熟？」'
        })}
      ], '覆核 409-A 預填轉院單'),
      event('回 5F 護理站交代', reaction({
        ZHANG:[
          {speaker:'值班醫師',text:'「504B 已評估，409-A 轉院單先不要執行。」'},
          {speaker:'第二院區護理師',text:'「收到。」'}
        ],
        LI:[
          {speaker:'值班醫師',text:'「病人先留觀，轉院單暫停。」'},
          {speaker:'第二院區護理師',text:'「好。」'}
        ],
        ZHOU:[
          {speaker:'第二院區護理師',text:'「備用鑰匙先還我。」'},
          {speaker:'值班醫師',text:'「504B 已評估，409-A 那張先不要送。」'},
          {speaker:'第二院區護理師',text:'「好。你還是先回去把正式交班補完吧。」'}
        ],
        CHEN:[
          {speaker:'第二院區護理師',text:'「會診鑰匙。」'},
          {speaker:'值班醫師',text:'「給妳。504B 先留在這裡，不轉 409-A。」'},
          {speaker:'第二院區護理師',text:'「知道了。」'},
          {speaker:'內心',text:'把鑰匙交回去時，手竟然知道它平常放在護理站哪一格。'}
        ]
      }), (identity==='ZHOU'||identity==='CHEN')?'歸還 5F 會診備用鑰匙':'向護理站交代 504B 處置', {
        clearFlag:(identity==='ZHOU'||identity==='CHEN')?'SECOND_5F_CONSULT_KEY_BORROWED':null
      }),
      event(identity==='ZHANG'?'離開 5F 護理站':'監視器室的閃爍', reaction({
        ZHANG:[
          {speaker:'內心',text:'事情先處理完了。'},
          {speaker:'內心',text:'「有點想喝咖啡……我記得一樓警衛那邊常常有咖啡。」'},
          {speaker:'內心',text:'先下去找警衛。'}
        ],
        LI:[
          {speaker:'內心',text:'走出護理站時，走廊盡頭的監視器狀態燈忽然閃了兩下。'},
          {speaker:'內心',text:'「監視器室……剛才是不是又閃了一次？」'}
        ],
        ZHOU:[
          {speaker:'內心',text:'走出護理站時，監視器狀態燈像是突然失去同步。'},
          {speaker:'內心',text:'「先去二樓看看。」'}
        ],
        CHEN:[
          {speaker:'內心',text:'回程原本應該很熟，監視器室的燈卻突然閃爍。'},
          {speaker:'內心',text:'「先確認一下。」'}
        ]
      }), identity==='ZHANG'
        ? '前往第二院區 1F 警衛台找咖啡'
        : '前往第二院區 2F 監視器室查看異常')
    ],
    ZHANG_SECOND_CAMPUS_SECURITY: [
      event('警衛台的黑咖啡', [
        {speaker:'值班醫師',text:'「警衛大哥，還有咖啡嗎？」'},
        {speaker:'警衛',text:'「有啊。你們值班醫師都一樣，晚上都來找這壺。」'},
        {speaker:'值班醫師',text:'「我怎麼會記得你這裡一直都有……」'},
        {speaker:'警衛',text:'「對了，剛才監視器有點怪。」'},
        {speaker:'值班醫師',text:'「怎麼怪？」'},
        {speaker:'警衛',text:'「畫面裡好像多了一個人。不是病人，也不像我們的人。我重播幾次都還在。」'},
        {speaker:'值班醫師',text:'「我也去看看。」'}
      ], '喝完咖啡後，前往第二院區 2F CCTV 監控室', { art:'coffee' })
    ],
    M5: [
      event('監視器室回放', [
        {speaker:'內心',text:'第二院區 2F 監控畫面一格一格閃爍。'},
        {speaker:'內心',text:reaction({
          ZHANG:'畫面裡確實有另一個白袍身影，而且有幾格像是同時拍到兩個值班醫師。',
          LI:'同一段天橋路線，在兩段回放裡需要的時間完全不同。',
          ZHOU:'畫面總在關鍵一格跳掉。手指竟然下意識想按快門。',
          CHEN:'同一條跨院路線，畫面裡的方向和我記得的走法對不上。'
        })}
      ], '查看第二院區 2F CCTV 監控異常'),
      ...(identity==='ZHANG' ? [event('監控室電話', [
        {speaker:'電話',text:'鈴——鈴——鈴——'},
        {speaker:'內心',text:'「監控室的電話？誰會知道我在這裡？」'},
        {speaker:'第一院區急診護理師',text:'「值班醫師您好。第一院區 2F 急診有一名身分待確認的男性，需要精神科評估。」'},
        {speaker:'值班醫師',text:'「我現在回去。」'},
        {speaker:'內心',text:'從這裡回第一院區，得先走過天橋。'}
      ], '接聽監控室電話，經天橋返回第一院區 2F 急診')] : []),
      event('天橋上的白袍人影', [
        {speaker:'內心',text:'回程走到天橋中段，視線突然像被什麼扯向玻璃倒影。'},
        {speaker:'內心',text:'白袍人影突然從後方跑進倒影裡。'},
        {speaker:'內心',text:'「不能回頭……可是我真的很想確認後面是不是有人。」'}
      ], '保持向前，不要回頭', { bridgeChoice:true, forcedBridgeReveal:true })
    ],
    ZHANG_6F_FORESHADOW: [event('電梯樓層顯示器', ['5 → 6 → 5 → 4。', '我：「……六？」', '電梯沒有開門。這一次只有樓層顯示異常。'], '記下顯示異常，等候急診來電')],
    ZHOU_1F_PHOTO: [event('檢視玻璃反射照', [
      {speaker:'內心',text:'這張照片比八樓那張更接近事故現場。B-Panel、工程人員、警衛都在畫面裡。'},
      {speaker:'內心',text:'玻璃反射裡有相機、Casio，還有拍攝者的手。看不到臉。'},
      {speaker:'值班醫師',text:'「拍照的人沒有站進照片裡……」'},
      {speaker:'內心',text:'先回警衛台問問看，也許有人記得拍攝者。'}
    ], '看完牆上照片後，回警衛台詢問', { art: 'photo', photoId: 'guard_reflection_1998' })],
    ZHOU_SECURITY_TALK: [
      event('詢問老照片', [
        {speaker:'值班醫師',text:'「牆上那張舊照片，是誰拍的？」'},
        {speaker:'警衛',text:'「不知道，年代很久了。」'},
        {speaker:'警衛',text:'「以前好像有一個年輕醫師很愛拍。設備壞了也拍，門被封了也拍。」'},
        {speaker:'警衛',text:'「有時警衛不讓他進，他就站在外面一直拍。」'},
        {speaker:'值班醫師',text:'「後來呢？」'},
        {speaker:'警衛',text:'「不知道。照片倒是留下不少。」'}
      ], '問完照片後，留意警衛台電話'),
      event('接聽警衛台電話', [
        {speaker:'電話',text:'鈴——鈴——鈴——'},
        {speaker:'警衛',text:'「找你的吧。這時間會打到警衛台，多半是急診找值班醫師。」'},
        {speaker:'急診護理師',text:'「值班醫師？2F 急診有一名身分待確認的男性，身上有燒焦和煙灰，麻煩現在下來評估。」'},
        {speaker:'值班醫師',text:'「好，我現在過去。」'}
      ], '接完電話後，前往第一院區 2F 急診')
    ],
    ZHOU_2117_RETURN: [event('21:17 三樓查哨', ['查房結束，我回到值班室。電話要求回三樓查哨。', '21:17。巡查欄位像被提前寫好。我一直以為再確認一個證據就會回去，真正的值班卻一路遲到。', '完成查哨後，我搭電梯準備回病房。'], '核對巡查欄後搭電梯')],
    M6: identity==='ZHANG' ? [
      event('電梯劫持到六樓', [
        {speaker:'內心',text:'我離開 316，原本只是想回四樓值班室。'},
        {speaker:'內心',text:'電梯卻越過 4F、5F，再一次停在 6。這次門真的打開了。'}
      ], '觀看 6F 事故與張 Seed 記憶回放', { accidentCg:true }),
      event('離開六樓', [
        {speaker:'內心',text:'畫面結束後，技能中心只剩焦黑器材與訓練人偶。'},
        {speaker:'內心',text:'先離開。去一樓警衛台查當年的門禁與 B-Panel。'}
      ], '回到電梯前，離開 6F 前往第一院區 1F 警衛台')
    ] : [
      event('錯停六樓', ['電梯原本要回病房。3 → 4 → 5 → 6。門開了。', '這次真的抵達六樓。走廊裡的臨床技能訓練人偶面向我。'], '走近訓練人偶'),
      event('記憶錨點', [reaction({ ZHANG: '黑咖啡、藍印泥、門另一側的病人。我記得自己拒絕的是未核實的身分，不是眼前的人。', LI: '程序順序自動浮現，手比思考更快。相信程序的身體，也可能記住錯誤的程序。', ZHOU: '相機、Casio、快門。合照沒有攝影者，警告也像一直沒能送出。', CHEN: '灰滾邊識別證一閃而過。白袍、輪椅、5042、409-A，路線比自己的姓名清楚。' }), '人偶没有回答。這些是身體記憶，仍不能代替身分核對。'], '核對記憶後離開六樓')
    ],
    M7: identity==='ZHANG' ? [
      event('警衛台後方照片', [
        {speaker:'內心',text:'警衛台後方牆上那張舊照片現在看得特別清楚。'},
        {speaker:'內心',text:'照片裡的設備、門禁與今晚看到的 409、6F 線索彼此對得上。'}
      ], '查看警衛台後方牆上的舊照片'),
      event('02:17 警衛鑰匙', [
        {speaker:'內心',text:'警衛設備櫃裡還留著 B-Panel 十字鑰匙。'}
      ], '檢查警衛台並取得 B-Panel 十字鑰匙', { flag:'B_PANEL_KEY' }),
      event('閱讀 B-Panel 工務紀錄', [
        {speaker:'內心',text:'舊手冊要求依序拉下 1 → 3 → 4，但監控紀錄顯示這會鎖死防火門並停止備援排煙。'},
        {speaker:'內心',text:'旁邊的紫色備援旋鈕需要十字鑰匙。'}
      ], '對照手冊與監控後操作 B-Panel'),
      event('操作 B-Panel', [
        {speaker:'內心',text:'02:17。不能再重演 1 → 3 → 4。'}
      ], '插入十字鑰匙，啟動紫色備援排煙', {
        puzzle:'b-panel',
        wrong:'依舊手冊拉下 1 → 3 → 4',
        wrongLines:['防火門鎖死，排煙停止。這正是歷史錯誤。','停止操作，重新比對監控與紫色備援旋鈕。'],
        flag:'M7_B2_OPEN'
      })
    ] : [
      event('02:17 警衛鑰匙', ['警衛設備櫃留著 B-Panel 十字鑰匙。它屬於門禁設備，不能用一張表格代替。'], '拿取十字鑰匙', { flag: 'B_PANEL_KEY' }),
      event('閱讀 B-Panel 工務紀錄', ['舊工務手冊要求依序拉下 1 → 3 → 4。監控卻顯示這個動作讓防火門鎖死、備援排煙停止。', '旁邊是必須插入十字鑰匙才能轉動的紫色備援排煙旋鈕。', reaction({ ZHANG: '這段記憶來自門的另一側。門關上後，裡面仍有人。', LI: '我的身體記住的正是 1 → 3 → 4。最熟悉的程序，竟是當年的錯誤。', ZHOU: '照片裡的設備終於在眼前。光是記錄警告，不能讓警告及時送達。', CHEN: '不能再只因為知道下一步去哪裡，就把人推向同一個目的地。' })], '對照手冊與監控後操作面板'),
      event('操作 B-Panel', ['02:17。選擇實際操作；錯誤程序不能打開服務門。'], '插入十字鑰匙，啟動紫色備援排煙', { puzzle: 'b-panel', wrong: '依舊手冊拉下 1 → 3 → 4', wrongLines: ['防火門鎖死，排煙停止。這正是歷史錯誤。', '停止操作，重新比對監控與紫色備援旋鈕。'], flag: 'M7_B2_OPEN' })
    ],
    B2: [
      event('單向封存檔案', ['服務門在身後關閉。這是一次性的封存檔案接觸，不能回到面板重選。', 'CURRENT SELF = CORRUPTED。四名候選職務：第一線住院醫師、夜間總醫師、第二線住院醫師、第二院區支援醫師。', '客觀檔案已恢復，當前身分仍未判定。沒有姓名可以替你直接作答。'], '閱讀四名匿名候選職務'),
      event('1998 火災回放', [
        '工程人員提出 B-Panel 危險警告。警衛鑰匙與 409-A 轉送流程交錯。',
        '煙升起。防火門關閉。錯誤程序讓備援排煙失常，紀錄隨後遭到覆寫。',
        identity==='ZHANG'
          ? '終端最後指向 3F 文史館：先核對院史影像與 1998 人員檔案，再回 316。'
          : 'OVERWRITE IN PROGRESS。CURRENT SHIFT NEXT。STOP THE OVERWRITE。RETURN TO 316。'
      ], identity==='ZHANG'?'離開 B2，前往 3F 文史館':'讀完回放，帶著證據返回 316')
    ],
    ZHANG_3F_ARCHIVE: [
      event('文史館院史影像牆', [
        {speaker:'內心',text:'B2 終端指向這裡。照片牆把 1998 的院區、人員與事故前配置重新放回同一個時間線。'}
      ], '進入 3F 文史館，查看院史影像牆'),
      event('1998 夜班核心人員名錄', [
        {speaker:'內心',text:'四名醫師的職務、物件與今晚的自傳體記憶終於能互相比對。'},
        {speaker:'內心',text:'最後只剩一件事：回 316，選擇這一輪真正屬於自己的名字。'}
      ], '翻閱 1998 夜班核心人員名錄後返回 316')
    ],
    M8: [
      event('拒絕被指派的病人身分', ['IDENTITY REJECTION。系統試圖把值班醫師寫成 409 的病人。', '我握著自己的夜班記憶。床號、表格與流程都不能代替我是誰。'], '拒絕覆寫，保留已核對的證據', { flag: 'M8_IDENTITY_REJECTED' }),
      event('覆核這一夜的路徑', [reaction({ ZHANG: '先查病人，再接班；拒絕 409-A；在意姓名；知道警衛咖啡；黑咖啡與藍印泥；門另一側的記憶。', LI: '交班、查房、急診、會診，全依順序。最大的矛盾是身體記住了錯誤的 1 → 3 → 4。', ZHOU: '八樓構圖、一樓反射、警衛口中的攝影習慣、相機與 Casio。我一直不在自己拍的照片裡，也一直太晚回到工作。', CHEN: '天橋開場、第二院區格局、5042、轉送單、409-A、輪椅與灰滾邊白袍。我總知道目的地，卻沒有先確認方向。' })], '帶著路徑證據進入最後交班')
    ],
    M9: [event('316 最後身分核對', ['夜班的路徑、動作與記憶已經留下證據。', '最後交班只允許提交一次。請核對自己這一夜的行為，再選擇自己的身分。'], '打開四名候選人的正式交班表')]
  };
  if (!scenes[step]) throw new Error(`Unknown route scene: ${step}`);
  const locations = {
    ZHANG_OUTBOUND_8F: [
      { zoneId:'first_campus_8f', spawn:'first_8f_lift' },
      { zoneId:'skybridge', spawn:'bridge_from_first' }
    ],
    M2: [
      { zoneId:'first_campus_4f', spawn:'m3_4f_nursing_station' },
      { room:'408', bed:'408C' },
      { zoneId:'first_campus_4f', spawn:'m2_4f_409' },
      { zoneId:'first_campus_4f', spawn:'m3_4f_nursing_station' }
    ],
    ZHANG_3F_ARCHIVE: [
      { zoneId:'first_campus_3f', spawn:'m0_3f_corridor' },
      { zoneId:'first_campus_3f', spawn:'m0_3f_corridor' }
    ],
    M3: [{ spawn: 'm4_2f_er_triage' }, { spawn: 'm4_2f_er_bays' }, { zoneId: 'first_campus_3f', spawn: 'm0_316_office' }],
    M4: [
      { zoneId:'second_campus_5f', spawn:'second_5f_lift' },
      { room:'504', bed:'504B' },
      { zoneId:'second_campus_5f', spawn:'second_5f_lift' },
      { zoneId:'second_campus_5f', spawn:'second_5f_lift' },
      { zoneId:'second_campus_5f', spawn:'second_5f_lift' }
    ],
    M5: identity==='ZHANG'
      ? [
          { zoneId:'second_campus_2f', spawn:'m9_second_campus_2f', room:'202', yaw:0 },
          { zoneId:'second_campus_2f', spawn:'m9_second_campus_2f', room:'202', yaw:0 },
          { zoneId:'skybridge', spawn:'bridge_from_second' }
        ]
      : [
          { zoneId:'second_campus_2f', spawn:'m9_second_campus_2f', room:'202', yaw:0 },
          { zoneId:'skybridge', spawn:'bridge_from_second' }
        ]
  };
  scenes[step].forEach((beat, index) => Object.assign(beat, locations[step]?.[index]));
  return scenes[step];
}
