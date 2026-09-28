// These are incomplete first-person memories, not instructions for the live B-Panel.
// Names, employee numbers and the final acknowledgement stay behind the M9 gate.
export const IDENTITY_M6_MEMORIES = Object.freeze({
  LI: {
    id: 'LI_6F_ORDER_MEMORY',
    title: '6F｜手比記憶更早',
    mode: 'CCTV',
    source: 'FRAGMENTED MEMORY / NOT A LIVE CONTROL',
    frames: [
      { stamp: 'MEMORY 01 / CUFF', title: '先把袖口壓平', scene: 'office', m6Shot: 'cuff', cue: 'playTerminalKey',
        caption: '金屬袖扣碰到錶殼。紅筆還沒落下，拇指已把頁角對齊。',
        narration: '這套動作沒有經過思考。像今晚一樣，手總比我先知道下一步。' },
      { stamp: 'MEMORY 02 / CARBON COPY', title: '整齊，不等於正確', scene: 'er', m6Shot: 'forms', cue: 'playComputerBeep',
        caption: '409-A 被一層層複寫。欄位越來越完整，現場核對欄卻始終空白。',
        narration: '我熟悉的是把單子填完，還是確認眼前真的有人？' },
      { stamp: 'MEMORY 03 / 02:17', title: '1 → 3 → 4', scene: 'security', m6Shot: 'switches', cue: 'playDoorLockClack',
        caption: '記憶裡，右手依序移向三個開關。這是舊動作的重播，不是現在的操作指示。',
        narration: '手記得那個順序。但身體熟悉，不代表命令就是對的。' },
      { stamp: 'MEMORY 04 / CLOSED', title: '命令後面的門', scene: 'skills', m6Shot: 'door', cue: 'playDoorLockClack',
        caption: '金屬門落下。門縫另一側有一隻手，桌上的覆核章卻已先蓋好。',
        narration: '文件上寫著完成。門後的聲音，沒有被寫進任何一格。' },
      { stamp: 'MEMORY 05 / NO NAME', title: '沒有名牌的白袍', scene: 'skills', m6Shot: 'coat', cue: 'playComputerBeep',
        caption: '訓練人偶旁的白袍也在壓平袖口；臉與名牌仍然模糊。',
        narration: '我認得那個姿勢，卻不能只憑這一幕替自己填上名字。' },
      { stamp: 'MEMORY END / HOLD', title: '先讓手停住', scene: 'security', m6Shot: 'hold', cue: 'playTerminalKey',
        caption: '紅筆停在空白簽署欄上方。開關沒有被再次按下。',
        narration: '到一樓後，先核對現場與工務紀錄。不能再讓熟悉的順序替我作決定。' }
    ]
  },
  ZHOU: {
    id: 'ZHOU_6F_WARNING_MEMORY',
    title: '6F｜快門後的空白',
    mode: 'ALBUM',
    source: 'CONTACT PRINT / UNDELIVERED WARNING',
    frames: [
      { stamp: 'FRAME 27 / VIEWFINDER', title: '取景框裡的異常', scene: 'skills', m6Shot: 'viewfinder', cue: 'playCameraShutter',
        caption: '臨床技能教室的配電盤亮起不正常的熱點。取景框把它收得很清楚。',
        narration: '我第一個動作，是把它拍下來。只要拍清楚，就會有人相信。' },
      { stamp: 'FRAME 28 / CASIO', title: '再一張就好', scene: 'skills', m6Shot: 'camera', cue: 'playCameraShutter',
        caption: 'Casio 的數字往前走，指腹仍貼著快門。底片又多了一格。',
        narration: '光不夠，角度也不對。再拍一張，我就去找警衛。' },
      { stamp: 'MEMO / NOT SENT', title: '寫了一半的警告', scene: 'office', m6Shot: 'memo', cue: 'playTerminalKey',
        caption: '「等一下。」「409-A 先不要——」便條折在相機背帶下，收件人欄沒有留下名字。',
        narration: '這和今晚那張碎片一樣。話已經寫出來，卻沒有送到任何人手上。' },
      { stamp: '02:17 / STILL HERE', title: '人還停在鏡頭後', scene: 'security', m6Shot: 'delay', cue: 'playClick',
        caption: '照片接連疊上警衛台的方向。路沒有變長，我卻一直沒有走出去。',
        narration: '我把「再確認一下」當成理由，把警告留在自己身上。' },
      { stamp: 'ECHO / 408C', title: '等我的不只是一張照片', scene: 'er', m6Shot: 'bed', cue: 'playComputerBeep',
        caption: '408C 的呼叫燈與那張未送達便條交疊。空白處不再像構圖，而像被延誤的時間。',
        narration: '「醫師……你怎麼現在才來？」今晚的聲音，接上了記憶裡的空白。' },
      { stamp: 'MEMORY END / LOWER', title: '鏡頭先放下', scene: 'security', m6Shot: 'lower', cue: 'playClick',
        caption: '取景框退出視野。手裡留下底片與便條，前方是一樓警衛台的方向。',
        narration: '證據不是警告已經送達。下一步，不能再停在下一張照片。' }
    ]
  }
});

for (const memory of Object.values(IDENTITY_M6_MEMORIES)) {
  memory.frames.forEach(Object.freeze);
  Object.freeze(memory.frames);
  Object.freeze(memory);
}

export function playIdentityM6Memory(director, audio) {
  const identity = director.manager.currentIdentity;
  const sequence = IDENTITY_M6_MEMORIES[identity];
  if (director.step !== 'M6' || !sequence) return false;

  const ui = director.uiManager;
  let request = null;
  let frameIndex = -1;
  let frameStart = 0;
  let finished = false;
  director.controller.enabled = false;

  const animate = now => {
    if (finished || ui.memorySequence !== sequence) return;
    if (frameIndex !== ui.memoryFrameIndex) {
      frameIndex = ui.memoryFrameIndex;
      frameStart = now;
      const cue = sequence.frames[frameIndex].cue;
      void audio.ensureRunning().then(ready => {
        if (ready && !finished && ui.memorySequence === sequence) audio[cue]();
      });
    }
    ui.renderMemoryFrame(now - frameStart);
    request = requestAnimationFrame(animate);
  };

  director.playAutoMemorySequence(sequence, () => {
    // The shared viewer can close manually while its final hold timer is pending.
    if (finished) return;
    finished = true;
    if (request !== null) cancelAnimationFrame(request);
    director.gameState.setFlag(`${identity}_M6_MEMORY_SEEN`, true);
    void director.completeBeat();
  }, { interval: 4500, hold: 500 });
  request = requestAnimationFrame(animate);
  return true;
}
