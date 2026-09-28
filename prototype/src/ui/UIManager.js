// UIManager.js - Handles HUD, HIS computer terminal, Duty Log, and Elevator transition
import { playElevatorGlimpse } from '../story/ElevatorGlimpseScene.js';
import {isIdentityRouteMode,anonymousNarrative} from '../story/IdentityPrivacy.js';
import { PatientizationScene } from '../story/PatientizationScene.js';
import { soundManager } from '../audio/SoundManager.js';
import { persistentMemory, TRUE_NAME_CANON } from '../core/PersistentMemory.js';
import { drawCharacterStrip } from '../art/CharacterPortraitArt.js';
import { getCharacterProfile } from '../story/CharacterBible.js';
import {drawMemoryFragment,drawPersonnelRosterBackdrop,preloadArtPass2Image} from '../art/ArtPass2Assets.js';

export class UIManager {
  constructor(gameState, onTerminalClose, onElevatorTransitionComplete) {
    this.gameState = gameState;
    this.onTerminalClose = onTerminalClose;
    this.onElevatorTransitionComplete = onElevatorTransitionComplete;

    this.promptEl = document.getElementById('interaction-prompt');
    this.crosshairEl = document.getElementById('crosshair');
    this.subtitleEl = document.getElementById('subtitle-box');
    this.subtitleSpeakerEl = document.getElementById('subtitle-speaker');
    this.subtitleTextEl = document.getElementById('subtitle-text');
    this.workstationModal = document.getElementById('workstation-modal');
    this.dutyLogModal = document.getElementById('dutylog-modal');
    this.archiveModal = document.getElementById('archive-modal');
    this.posterModal = document.getElementById('poster-modal');
    this.posterTitleEl = document.getElementById('poster-title');
    this.posterCategoryEl = document.getElementById('poster-category');
    this.posterImageEl = document.getElementById('poster-image');
    this.posterCommentaryEl = document.getElementById('poster-commentary');
    this.lockerModal = document.getElementById('locker-modal');
    this.anomalyModal = document.getElementById('anomaly-modal');
    this.office302Modal = document.getElementById('office302-modal');
    this.inspect302Modal = document.getElementById('inspect302-modal');
    this.inspect302Board = document.getElementById('inspect302-board');
    this.inspect302Clue = document.getElementById('inspect302-clue');
    this.inspect302FocusTimer = null;
    this.journalModal = document.getElementById('journal-modal');
    this.bed33Modal = document.getElementById('bed33-modal');
    this.loopCutscene = document.getElementById('loop-cutscene');
    this.storyChoiceModal = document.getElementById('story-choice-modal');
    this.finalHandoffModal = document.getElementById('final-handoff-modal');
    this.finalSuccessModal = document.getElementById('final-success-modal');
    this.memoryModal = document.getElementById('memory-modal');
    this.memoryFrameCanvas = document.getElementById('memory-frame-canvas');
    this.identityMatrixModal = document.getElementById('identity-matrix-modal');
    this.memorySequence = null;
    this.memoryFrameIndex = 0;
    this.memoryCloseHandler = null;
    this.identityMatrixHandler = null;
    this.handoffDecisionHandler = null;
    this.storyChoiceHandlers = null;
    this.finalHandoffHandler = null;
    this.bed33Handlers = null;
    this.loopCutsceneTimers = [];
    this.archiveTitleEl = document.getElementById('archive-document-title');
    this.archivePageEl = document.getElementById('archive-document-page');
    this.archiveIndicatorEl = document.getElementById('archive-page-indicator');
    this.archivePages = [];
    this.archivePageIndex = 0;
    this.archiveCompletionHandler = null;
    this.archiveCompleted = false;
    this.elevatorCutscene = document.getElementById('elevator-cutscene');
    this.debugPanel = document.getElementById('debug-panel');
    this.timeEl = document.querySelector('.hud-time');

    this.initEvents();
    this.updateTasks();
    this.showInitialDialogue();

    this.gameState.addListener((evt) => {
      if (evt === 'task_completed') {
        this.updateTasks();
        this.updateDebug();
      }
      if (evt === 'time_changed') this.updateTime();
      if (evt === 'flag_changed') this.updateTasks();
      if (evt === 'loop_reset') {
        this.updateTasks();
        this.updateTime();
        this.closeAllTransientOverlays();
      }
    });
    this.updateTime();
  }

  initEvents() {
    const loginButton=document.getElementById('btn-his-login');
    loginButton?.addEventListener('click',()=>{
      const a=document.getElementById('his-account')?.value.trim();
      const p=document.getElementById('his-password')?.value;
      const hasCredentials=this.gameState.getFlag('HIS_CREDENTIALS');
      const ok=hasCredentials&&a==='night403'&&p==='QL1700';
      document.getElementById('his-login-status').textContent=!hasCredentials?'尚未取得今晚的系統帳密':ok?'登入成功｜可讀取夜班交班':'帳號或密碼錯誤';
      document.getElementById('his-handoff-content')?.classList.toggle('unlocked',ok);
      if(ok)this.gameState.setFlag('HIS_AUTHENTICATED',true);
      soundManager.playComputerBeep();
    });

    // Workstation sign & close button
    const btnSignHandoff = document.getElementById('btn-sign-handoff');
    if (btnSignHandoff) {
      btnSignHandoff.addEventListener('click', () => {
        if(!this.gameState.getFlag('HIS_AUTHENTICATED')){document.getElementById('his-login-status').textContent='請先用值班本上的帳密登入';return;}
        if(!this.gameState.getFlag('M1_HANDOFF_CHOICE_RESOLVED')){
          soundManager.playComputerBeep();
          this.openStoryChoice({
            title:'17:00｜值班身分驗證異常',
            body:'一線值班身分欄位為 NULL。系統建議直接套用「院內預設值班醫師模板」以完成交接。\n\n但預設模板沒有顯示姓名來源，也沒有原始簽章。',
            primaryText:'套用預設模板',
            secondaryText:'拒絕模板，保留未確認身分',
            onPrimary:()=>this.handoffDecisionHandler?.('default'),
            onSecondary:()=>{
              this.gameState.setFlag('M1_HANDOFF_CHOICE_RESOLVED',true);
              this.handoffDecisionHandler?.('manual');
              this.commitNightHandoff(btnSignHandoff);
            }
          });
          return;
        }
        this.commitNightHandoff(btnSignHandoff);
      });
    }

    const btnCloseTerminal = document.getElementById('btn-close-terminal');
    if (btnCloseTerminal) {
      btnCloseTerminal.addEventListener('click', () => {
        soundManager.playClick();
        this.closeWorkstation();
      });
    }

    // Duty log modal buttons
    const btnSignLog = document.getElementById('btn-sign-log');
    if (btnSignLog) {
      btnSignLog.addEventListener('click', () => {
        soundManager.playPaperSign();
        this.gameState.markTaskComplete('DUTY_LOG');
        this.closeDutyLog();
      });
    }

    const btnCloseLog = document.getElementById('btn-close-log');
    if (btnCloseLog) {
      btnCloseLog.addEventListener('click', () => {
        soundManager.playClick();
        this.closeDutyLog();
      });
    }

    document.getElementById('btn-close-archive')?.addEventListener('click',()=>this.closeArchiveDocument());
    document.getElementById('btn-close-poster')?.addEventListener('click',()=>this.closePoster());
    document.getElementById('btn-close-memory')?.addEventListener('click',()=>this.closeMemorySequence());
    document.getElementById('btn-memory-prev')?.addEventListener('click',()=>this.stepMemory(-1));
    document.getElementById('btn-memory-next')?.addEventListener('click',()=>this.stepMemory(1));
    document.getElementById('btn-close-identity-matrix')?.addEventListener('click',()=>this.closeIdentityMatrix());
    document.getElementById('btn-archive-prev')?.addEventListener('click',()=>{
      if(this.archivePageIndex>0){this.archivePageIndex--;this.renderArchivePage();soundManager.playClick();}
    });
    document.getElementById('btn-archive-next')?.addEventListener('click',()=>{
      if(this.archivePageIndex<this.archivePages.length-1){this.archivePageIndex++;this.renderArchivePage();soundManager.playPaperSign();if(this.archivePageIndex===this.archivePages.length-1&&!this.archiveCompleted){this.archiveCompleted=true;this.archiveCompletionHandler?.();}}
    });

    document.getElementById('btn-close-locker')?.addEventListener('click',()=>this.closeLocker());
    document.getElementById('btn-unlock-locker')?.addEventListener('click',()=>{
      const value=document.getElementById('locker-code')?.value.trim();
      const status=document.getElementById('locker-status');
      if(value!=='1700'){status.textContent='紅燈閃爍：密碼錯誤';soundManager.playClick();return;}
      persistentMemory.learnCode('pass_1700');
      status.textContent='綠燈亮起：櫃門已解鎖｜請關閉畫面並從櫃內拿取實體鑰匙與感應卡';
      document.getElementById('locker-contents')?.classList.add('revealed');
      this.gameState.setFlag('LOCKER_OPENED',true);
      this.gameState.markTaskComplete('LOCKER_OPENED');
      window.worldRouter?.activeZoneInstance?.markLockerOpen?.();
      soundManager.playComputerBeep();
      this.updateTasks();
    });
    document.getElementById('btn-ack-anomaly')?.addEventListener('click',()=>this.acknowledgeAnomaly());

    document.getElementById('btn-close-302')?.addEventListener('click',()=>this.close302Keypad());
    document.getElementById('btn-unlock-302')?.addEventListener('click',()=>{
      const code=document.getElementById('office302-code')?.value.trim();
      const status=document.getElementById('office302-status');
      if(code!=='3082'){status.textContent='ACCESS DENIED';soundManager.playClick();return;}
      persistentMemory.learnCode('pass_3082');
      status.textContent='ACCESS GRANTED';
      this.gameState.setFlag('OFFICE_302_UNLOCKED',true);
      window.worldRouter?.activeZoneInstance?.unlock302?.();
      soundManager.playComputerBeep();
      setTimeout(()=>this.close302Keypad(),350);
    });
    document.getElementById('btn-close-inspect302')?.addEventListener('click',()=>this.close302Inspect());
    this.inspect302Board?.addEventListener('pointermove',(e)=>this.update302InspectParallax(e));
    this.inspect302Clue?.addEventListener('pointerenter',()=>this.begin302ClueFocus());
    this.inspect302Clue?.addEventListener('pointerleave',()=>this.cancel302ClueFocus());

    document.getElementById('btn-close-journal')?.addEventListener('click',()=>this.closeJournal());
    document.getElementById('btn-bed33-defer')?.addEventListener('click',()=>{
      this.closeBed33Assignment();
      this.bed33Handlers?.onDefer?.();
    });
    document.getElementById('btn-bed33-reject')?.addEventListener('click',()=>{
      this.closeBed33Assignment();
      this.bed33Handlers?.onReject?.();
    });
    document.getElementById('btn-bed33-confirm')?.addEventListener('click',()=>{
      this.closeBed33Assignment(false);
      this.bed33Handlers?.onConfirm?.();
    });
    document.getElementById('btn-loop-skip')?.addEventListener('click',()=>this.finishLoopCutscene());
    document.getElementById('btn-story-primary')?.addEventListener('click',()=>{
      const fn=this.storyChoiceHandlers?.primary;this.closeStoryChoice(false);fn?.();
    });
    document.getElementById('btn-story-secondary')?.addEventListener('click',()=>{
      const fn=this.storyChoiceHandlers?.secondary;this.closeStoryChoice(false);fn?.();
    });
    document.getElementById('btn-close-final-handoff')?.addEventListener('click',()=>this.closeFinalHandoff());
    document.getElementById('btn-submit-final-handoff')?.addEventListener('click',()=>{
      const employeeId=document.getElementById('final-employee-id')?.value.trim()||'';
      this.finalHandoffHandler?.({name:TRUE_NAME_CANON,employeeId});
    });

    document.addEventListener('keydown', event => {
      if (!this.dialogueSequence || event.code !== 'KeyE') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!event.repeat) this.advanceDialogue();
    }, true);

    // Debug toggle with Backquote (~)
    document.addEventListener('keydown', (e) => {
      if(this.memoryModal?.classList.contains('active')&&(e.code==='KeyA'||e.code==='ArrowLeft'||e.code==='KeyD'||e.code==='ArrowRight')){
        e.preventDefault();this.stepMemory((e.code==='KeyA'||e.code==='ArrowLeft')?-1:1);return;
      }
      if(e.code==='Tab'){
        e.preventDefault();
        if(isIdentityRouteMode()){document.querySelector('#identity-loop-panel button')?.focus();return;}
        if(this.journalModal?.classList.contains('active'))this.closeJournal();
        else this.openJournal();
        return;
      }
      if (e.code === 'Backquote' && (import.meta.env.DEV || new URLSearchParams(location.search).get('debug') === '1')) {
        this.toggleDebug();
      }
      if(e.code==='Space'&&this.inspect302Modal?.classList.contains('active')){
        e.preventDefault();this.close302Inspect();return;
      }
      if (e.code === 'Escape') {
        if(this.elevatorCutscene.dataset.selecting==='true')this.closeTravelSelector();
        if (this.workstationModal.classList.contains('active')) {
          this.closeWorkstation();
        }
        if (this.dutyLogModal.classList.contains('active')) {
          this.closeDutyLog();
        }
        if (this.archiveModal?.classList.contains('active')) this.closeArchiveDocument();
        if (this.posterModal?.classList.contains('active')) this.closePoster();
        if (this.memoryModal?.classList.contains('active')) this.closeMemorySequence();
        if (this.identityMatrixModal?.classList.contains('active')) this.closeIdentityMatrix();
        if (this.lockerModal?.classList.contains('active')) this.closeLocker();
        if (this.office302Modal?.classList.contains('active')) this.close302Keypad();
        if (this.inspect302Modal?.classList.contains('active')) this.close302Inspect();
        if (this.anomalyModal?.classList.contains('active')) this.acknowledgeAnomaly();
        if (this.journalModal?.classList.contains('active')) this.closeJournal();
        if (this.bed33Modal?.classList.contains('active')) this.closeBed33Assignment();
        if (this.storyChoiceModal?.classList.contains('active')) this.closeStoryChoice();
        if (this.finalHandoffModal?.classList.contains('active')) this.closeFinalHandoff();
      }
    });
  }

  showPrompt(text) {
    if (text) {
      this.promptEl.textContent = text;
      this.promptEl.style.display = 'block';
      this.crosshairEl.classList.add('active');
    } else {
      this.promptEl.style.display = 'none';
      this.crosshairEl.classList.remove('active');
    }
  }

  showDialogue(lines, onComplete = null) {
    this.dialogueSequence = {lines, index:0, onComplete};
    this.advanceDialogue();
  }

  advanceDialogue() {
    const sequence = this.dialogueSequence;
    if (!sequence) return;
    clearTimeout(this.subtitleTimer);
    const line = sequence.lines[sequence.index++];
    if (!line) {
      this.dialogueSequence = null;
      this.subtitleEl.classList.remove('visible');
      sequence.onComplete?.();
      return;
    }
    this.subtitleSpeakerEl.textContent = isIdentityRouteMode()?anonymousNarrative(line.speaker):line.speaker;
    this.subtitleTextEl.textContent = (isIdentityRouteMode()?anonymousNarrative(line.text):line.text) + '  [E] 繼續';
    this.subtitleEl.classList.add('visible');
  }

  showSubtitle(speaker, text, duration = 6500) {
    if(isIdentityRouteMode()){speaker=anonymousNarrative(speaker);text=anonymousNarrative(text);}
    if (this.dialogueSequence) return;
    this.subtitleSpeakerEl.textContent = speaker;
    this.subtitleTextEl.textContent = text;
    this.subtitleEl.classList.add('visible');

    if (this.subtitleTimer) clearTimeout(this.subtitleTimer);
    this.subtitleTimer = setTimeout(() => {
      this.subtitleEl.classList.remove('visible');
    }, duration);
  }

  showInitialDialogue() {
    if(isIdentityRouteMode())return;
    setTimeout(() => {
      if(persistentMemory.data.loopCount>0){
        this.showSubtitle('值班醫師','「……又是這裡。316、1700、3082。我記得。」',3600);
        return;
      }
      this.showSubtitle(
        '學長',
        '「我先走了，先把 316 鎖了，自己想辦法進去把今晚的交班做完吧，值班交給你了。」\n「有問題就去警衛查哨點看看。」',
        7800
      );
    }, 1200);
  }

  openWorkstation() {
    document.exitPointerLock();
    soundManager.playComputerBeep();
    if(this.gameState.getFlag('HIS_CREDENTIALS')){
      const a=document.getElementById('his-account'),p=document.getElementById('his-password');
      if(a)a.value='night403';
      if(p)p.value='QL1700';
      this.gameState.setFlag('HIS_AUTHENTICATED',true);
      document.getElementById('his-login-status').textContent='憑證已讀取｜登入成功';
      document.getElementById('his-handoff-content')?.classList.add('unlocked');
    }else{
      this.gameState.setFlag('HIS_AUTHENTICATED',false);
      document.getElementById('his-login-status').textContent='尚未取得今晚的系統帳密';
      document.getElementById('his-handoff-content')?.classList.remove('unlocked');
    }
    this.workstationModal.classList.add('active');
  }

  closeWorkstation() {
    this.workstationModal.classList.remove('active');
    if (this.onTerminalClose) this.onTerminalClose();
  }

  openDutyLog() {
    document.exitPointerLock();
    soundManager.playClick();
    this.dutyLogModal.classList.add('active');
  }

  closeDutyLog() {
    this.dutyLogModal.classList.remove('active');
    if (this.onTerminalClose) this.onTerminalClose();
  }

  openLocker() {
    document.exitPointerLock();
    const opened=this.gameState.getFlag('LOCKER_OPENED');
    const contents=document.getElementById('locker-contents');
    contents?.classList.toggle('revealed',opened);
    document.getElementById('locker-status').textContent=opened
      ? '櫃門已解鎖｜請從場景中的櫃內拿取值班物品'
      : '請輸入交班時間代碼（HHMM）';
    const input=document.getElementById('locker-code');
    if(input&&!opened&&persistentMemory.data.knownCodes.pass_1700)input.value='1700';
    this.lockerModal?.classList.add('active');
  }

  closeLocker() {
    this.lockerModal?.classList.remove('active');
    this.onTerminalClose?.();
  }

  showAnomalyMessage() {
    document.exitPointerLock();
    this.gameState.setFlag('ARCHIVE_OBJECTIVE',true);
    this.gameState.setFlag('HIS_ANOMALY_SEEN',true);
    this.gameState.setFlag('ANNE_STAGE',1);
    const firstMessage=persistentMemory.claimOnce('unregisteredMessage3F');
    const handoffTitle=this.anomalyModal?.querySelector('h2');
    if(handoffTitle&&(!firstMessage||!persistentMemory.claimHandoffAcknowledgement()))handoffTitle.textContent='未註冊訊息';
    if(!firstMessage){
      const paragraphs=this.anomalyModal?.querySelectorAll('.anomaly-window p');
      if(paragraphs?.length)paragraphs[0].textContent='你記得先前也看過一則訊息，但內容已不再顯示。';
    }
    document.body.classList.add('his-flicker');
    setTimeout(()=>document.body.classList.remove('his-flicker'),460);
    const win=this.anomalyModal?.querySelector('.anomaly-window');
    win?.classList.remove('anomaly-typing');
    void win?.offsetWidth;
    win?.classList.add('anomaly-typing');
    this.anomalyModal?.classList.add('active');
    soundManager.playComputerBeep();
    this.updateTasks();
  }

  acknowledgeAnomaly() {
    if(!this.anomalyModal?.classList.contains('active'))return;
    this.gameState.setFlag('ANOMALY_ACKNOWLEDGED',true);
    this.anomalyModal.classList.remove('active');
    this.updateTasks();
    this.onTerminalClose?.();
    if(!this.gameState.getFlag('PHONE_ANSWERED')&&!this.gameState.getFlag('PHONE_RING_ACTIVE')){
      setTimeout(()=>{
        this.gameState.setFlag('PHONE_RING_ACTIVE',true);
        soundManager.startPhoneRing();
      },2000);
    }
  }

  open302Inspect() {
    document.exitPointerLock();
    this.inspect302Modal?.classList.add('active');
    if(this.inspect302Clue){
      this.inspect302Clue.classList.toggle('found',this.gameState.getFlag('FOUND_302_CODE'));
      this.inspect302Clue.classList.remove('focused');
    }
  }

  update302InspectParallax(e) {
    if(!this.inspect302Board)return;
    const rect=this.inspect302Board.getBoundingClientRect();
    const nx=((e.clientX-rect.left)/rect.width-.5),ny=((e.clientY-rect.top)/rect.height-.5);
    this.inspect302Board.style.transform=`rotateY(${nx*8}deg) rotateX(${-ny*5}deg) translate3d(${nx*6}px,${ny*4}px,0)`;
    const glare=this.inspect302Board.querySelector('.inspect302-glare');
    if(glare)glare.style.transform=`translateX(${-32+nx*58}%)`;
  }

  begin302ClueFocus() {
    this.inspect302Clue?.classList.add('focused');
    if(this.gameState.getFlag('FOUND_302_CODE'))return;
    clearTimeout(this.inspect302FocusTimer);
    this.inspect302FocusTimer=setTimeout(()=>{
      this.gameState.setFlag('FOUND_302_CODE',true);
      this.inspect302Clue?.classList.add('found');
      this.showSubtitle('值班醫師','「……3082 嗎？」',2300);
    },1000);
  }

  cancel302ClueFocus() {
    clearTimeout(this.inspect302FocusTimer);
    if(!this.gameState.getFlag('FOUND_302_CODE'))this.inspect302Clue?.classList.remove('focused');
  }

  close302Inspect() {
    clearTimeout(this.inspect302FocusTimer);
    this.inspect302Modal?.classList.remove('active');
    if(this.inspect302Board)this.inspect302Board.style.transform='';
    this.onTerminalClose?.();
  }

  open302Keypad() {
    document.exitPointerLock();
    const input=document.getElementById('office302-code');
    if(input&&persistentMemory.data.knownCodes.pass_3082)input.value='3082';
    this.office302Modal?.classList.add('active');
  }

  close302Keypad() {
    this.office302Modal?.classList.remove('active');
    this.onTerminalClose?.();
  }

  openArchiveDocument(documentData) {
    document.exitPointerLock();
    this.archivePages = documentData.pages || [''];
    this.archivePageIndex = 0;
    this.archiveCompletionHandler=documentData.onComplete||null;
    this.archiveCompleted=false;
    this.archiveTitleEl.textContent = documentData.title || '院內文件';
    this.archiveModal.classList.add('active');
    this.renderArchivePage();
    if(documentData.title==='1998 夜班核心人員名錄'){
      void preloadArtPass2Image('personnelRoster').then(()=>this.renderArchivePage()).catch(error=>{
        console.warn('[art] personnel roster backdrop unavailable',error);
      });
    }
    soundManager.playPaperSign();
  }

  renderArchivePage() {
    if(!this.archivePageEl)return;
    const page=this.archivePages[this.archivePageIndex] ?? '';
    this.archivePageEl.classList.toggle('personnel-dossier',Boolean(page&&typeof page==='object'&&page.kind==='personnel'));
    this.archivePageEl.replaceChildren();

    if(page&&typeof page==='object'&&page.kind==='personnel'){
      const card=document.createElement('div');card.className='personnel-dossier-card';
      const portrait=document.createElement('div');portrait.className='personnel-dossier-portrait';
      const canvas=document.createElement('canvas');canvas.width=420;canvas.height=520;
      const ctx=canvas.getContext('2d');
      const bg=ctx.createLinearGradient(0,0,420,520);bg.addColorStop(0,'#8d7a5a');bg.addColorStop(1,'#211a14');
      ctx.fillStyle=bg;ctx.fillRect(0,0,420,520);
      const hasBackdrop=drawPersonnelRosterBackdrop(ctx,0,0,420,520,{alpha:.34});
      if(!hasBackdrop){
        ctx.fillStyle='rgba(230,215,185,.08)';
        for(let i=0;i<36;i++)ctx.fillRect((i*79)%420,(i*47)%520,2+(i%3),4+(i%5));
      }
      ctx.fillStyle='rgba(20,14,10,.52)';ctx.fillRect(40,84,340,340);
      drawCharacterStrip(ctx,[page.name],{left:65,right:355,baseY:405,cctv:false,labels:false,maxScale:1.12});
      ctx.strokeStyle='#d0b98e';ctx.lineWidth=6;ctx.strokeRect(12,12,396,496);
      ctx.strokeStyle='rgba(224,203,163,.25)';ctx.lineWidth=1;
      for(let y=36;y<500;y+=42){ctx.beginPath();ctx.moveTo(28,y);ctx.lineTo(392,y);ctx.stroke();}
      ctx.fillStyle='rgba(218,191,146,.74)';ctx.font='bold 18px monospace';ctx.fillText('ARCHIVE / 1998',28,42);
      const index=document.createElement('div');index.className='personnel-dossier-index';index.textContent=`ARCHIVE PERSONNEL FILE ${String(this.archivePageIndex+1).padStart(2,'0')}`;
      portrait.append(canvas,index);

      const copy=document.createElement('div');copy.className='personnel-dossier-copy';
      const classification=document.createElement('small');classification.textContent='1998 NIGHT DUTY PERSONNEL / VERIFIED SOURCE';
      const name=document.createElement('h3');name.textContent=page.name;
      const role=document.createElement('div');role.className='personnel-dossier-role';role.textContent=`${page.employeeId}｜${page.role}`;
      const grid=document.createElement('div');grid.className='personnel-dossier-grid';
      for(const [label,value] of [
        ['個人介紹',page.introduction],
        ['個性',page.personality],
        ['嗜好',page.hobby],
        ['關係備註',page.relationship]
      ]){
        const field=document.createElement('div');field.className='personnel-dossier-field';
        const strong=document.createElement('b');strong.textContent=label;
        const span=document.createElement('span');span.textContent=value||'—';
        field.append(strong,span);grid.appendChild(field);
      }
      const quote=document.createElement('div');quote.className='personnel-dossier-quote';quote.textContent='「'+(page.signatureQuote||'')+'」';
      copy.append(classification,name,role,grid,quote);
      card.append(portrait,copy);this.archivePageEl.appendChild(card);
    }else{
      this.archivePageEl.textContent=String(page||'');
    }

    this.archiveIndicatorEl.textContent = `${this.archivePageIndex+1} / ${Math.max(1,this.archivePages.length)}`;
    document.getElementById('btn-archive-prev').disabled=this.archivePageIndex===0;
    document.getElementById('btn-archive-next').disabled=this.archivePageIndex>=this.archivePages.length-1;
  }

  closeArchiveDocument() {
    this.archiveModal?.classList.remove('active');
    this.archiveCompletionHandler=null;
    if(this.onTerminalClose)this.onTerminalClose();
  }

  openPoster(posterData) {
    if(!posterData||!this.posterModal)return;
    document.exitPointerLock();
    if(this.posterTitleEl)this.posterTitleEl.textContent=posterData.title||'院內年代海報';
    if(this.posterCategoryEl){
      const label={TRUE_CLUE:'院內年代資料｜可能是真線索',AMBIGUOUS:'院內年代資料｜內容待判讀',FALSE_CLUE:'院內年代資料｜可能是體制性誤導'}[posterData.category]||'院內年代資料';
      this.posterCategoryEl.textContent=label;
    }
    if(this.posterImageEl){
      const base=import.meta.env?.BASE_URL ?? '/';
      this.posterImageEl.src=base+(posterData.inspectTexture||posterData.displayTexture||'').replace(/^\//,'');
      this.posterImageEl.alt=posterData.title||'院內年代海報';
    }
    if(this.posterCommentaryEl){
      this.posterCommentaryEl.textContent=posterData.commentary||'';
      this.posterCommentaryEl.style.display=posterData.commentary?'block':'none';
    }
    this.posterModal.classList.add('active');
    soundManager.playPaperSign();
  }

  closePoster() {
    this.posterModal?.classList.remove('active');
    if(this.posterImageEl)this.posterImageEl.removeAttribute('src');
    this.onTerminalClose?.();
  }

  setBed33Handlers(handlers){this.bed33Handlers=handlers;}

  openJournal(){
    document.exitPointerLock();
    const notes=document.getElementById('journal-notes');
    const count=document.getElementById('journal-loop-count');
    if(count)count.textContent=persistentMemory.data.loopCount===0?'這是第一次值班。':`已經回到這個夜班 ${persistentMemory.data.loopCount} 次。`;
    if(notes){
      notes.replaceChildren();
      if(!persistentMemory.data.journalNotes.length){
        const empty=document.createElement('div');empty.className='journal-empty';empty.textContent='除了印好的醫療換算表，沒有其他筆記。';notes.appendChild(empty);
      }else{
        for(const item of persistentMemory.data.journalNotes){
          const row=document.createElement('div');row.className='journal-note';row.textContent=item.text;notes.appendChild(row);
        }
      }
    }
    this.journalModal?.classList.add('active');
  }

  closeJournal(){
    this.journalModal?.classList.remove('active');
    this.onTerminalClose?.();
  }

  openBed33Assignment({canReject=false,rememberedRule=false}={}){
    document.exitPointerLock();
    const reject=document.getElementById('btn-bed33-reject');
    if(reject)reject.hidden=false;
    const defer=document.getElementById('btn-bed33-defer');
    if(defer)defer.hidden=true;
    const warning=document.getElementById('bed33-warning-text');
    if(warning)warning.textContent='急診留置床系統卡住，請值班醫師確認過床。';
    this.bed33Modal?.classList.add('active');
  }

  closeBed33Assignment(resume=true){
    this.bed33Modal?.classList.remove('active');
    if(resume)this.onTerminalClose?.();
  }

  playLegendOverride({legend='409 PATIENTIZATION',reason='你重演了當年的錯誤。'}={},onComplete){
    document.exitPointerLock();
    this.patientizationScene?.dispose();
    this.patientizationScene=new PatientizationScene(this.loopCutscene);
    this.loopOverrideComplete=onComplete;
    for(const t of this.loopCutsceneTimers)clearTimeout(t);
    this.loopCutsceneTimers=[];
    const title=document.getElementById('loop-stage-title');
    const body=document.getElementById('loop-stage-body');
    const band=document.getElementById('loop-wristband');
    const card=document.getElementById('loop-gameover-card');
    title.textContent='409 PATIENTIZATION';
    body.textContent='水平同步失鎖。視野像被猛然往下扯。';
    band?.classList.remove('visible');card?.classList.remove('visible');
    if(card){card.querySelector('strong').textContent=legend;card.querySelector('span').textContent=reason;}
    this.loopCutscene?.classList.add('active');
    const later=(ms,fn)=>this.loopCutsceneTimers.push(setTimeout(fn,ms));
    later(350,()=>{title.textContent='';body.textContent='畫面恢復時，你正仰躺在綠色斑駁的 409-A 鐵床。\n四條粗糙的皮革約束帶已扣住手腕與腳踝。';});
    later(900,()=>{band?.classList.add('visible');body.textContent='一條泛黃塑膠手圈被套上手腕：\n【無名病人】／床號 409-A。';});
    later(1500,()=>{body.textContent='床頭舊終端吐出點陣紙：\nSTAFF ID: NOT FOUND\nOVERWRITE CONFIRMED: TEMPORARY PATIENT RECORD CREATED\nLOCATION: WARD 409-A';});
    later(2150,()=>{body.textContent='面孔被雜訊抹去的護理師低頭準備針劑：\n「病人急性精神混亂，自稱是醫師……先執行四點約束，通報總值班。」\n\n「放開我！我是今晚的值班醫師！名冊在 316……！」';});
    later(2750,()=>{body.textContent='一名沒有名牌的白袍人影從門外經過，抽走床尾的值班日誌。\n金屬厚門「匡啷」反鎖。';});
    later(3400,()=>{body.textContent='舊式機械火警鈴開始尖叫。\n焦臭濃煙從門底縫隙湧入，視野逐漸全黑。';});
    later(4000,()=>{title.textContent='17:00';body.textContent='黑暗中傳來電梯到站的「叮——」。\n秒針倒轉。日期欄短暫閃過：1998-10-12。';});
    later(5400,()=>{body.textContent='';card?.classList.add('visible');});
    later(6500,()=>this.finishLoopCutscene());
  }

  async finishLoopCutscene(){
    if(!this.loopCutscene?.classList.contains('active'))return;
    for(const t of this.loopCutsceneTimers)clearTimeout(t);
    this.loopCutsceneTimers=[];
    this.patientizationScene?.dispose();this.patientizationScene=null;
    const cb=this.loopOverrideComplete;this.loopOverrideComplete=null;
    const body=document.getElementById('loop-stage-body');
    const result=cb?.();
    if(result?.then){
      if(body)body.textContent='場景重建中……';
      await result;
    }
    this.loopCutscene.classList.remove('active');
  }

  openStoryChoice({title,body,primaryText='確認',secondaryText='暫緩',onPrimary,onSecondary}){
    document.exitPointerLock();
    document.getElementById('story-choice-title').textContent=title;
    document.getElementById('story-choice-body').textContent=body;
    document.getElementById('btn-story-primary').textContent=primaryText;
    document.getElementById('btn-story-secondary').textContent=secondaryText;
    this.storyChoiceHandlers={primary:onPrimary,secondary:onSecondary};
    this.storyChoiceModal?.classList.add('active');
  }

  closeStoryChoice(resume=true){
    this.storyChoiceModal?.classList.remove('active');
    this.storyChoiceHandlers=null;
    if(resume)this.onTerminalClose?.();
  }

  openMemorySequence(sequence,onClose=null){
    if(!sequence)return;
    document.exitPointerLock();
    this.memorySequence=sequence;this.memoryFrameIndex=0;this.memoryCloseHandler=onClose;
    document.getElementById('memory-title').textContent=sequence.title||'記憶影像';
    document.getElementById('memory-mode').textContent=sequence.mode==='CCTV'?'FRAME PLAYBACK / CCTV':'FRAME ALBUM';
    document.getElementById('memory-source').textContent=sequence.source||'';
    this.memoryModal?.classList.add('active');this.renderMemoryFrame();
    void preloadArtPass2Image('memoryFragments').then(()=>{
      if(this.memorySequence===sequence)this.renderMemoryFrame();
    }).catch(error=>console.warn('[artpass2] memory viewer art preload failed',error));
  }

  stepMemory(delta){
    if(!this.memorySequence)return;
    const next=Math.max(0,Math.min(this.memorySequence.frames.length-1,this.memoryFrameIndex+delta));
    if(next===this.memoryFrameIndex)return;
    this.memoryFrameIndex=next;soundManager.playClick();this.renderMemoryFrame();
  }

  renderMemoryFrame(){
    const sequence=this.memorySequence,frame=sequence?.frames?.[this.memoryFrameIndex];
    if(!frame||!this.memoryFrameCanvas)return;
    const canvas=this.memoryFrameCanvas,ctx=canvas.getContext('2d'),cctv=sequence.mode==='CCTV',w=canvas.width,h=canvas.height;
    ctx.fillStyle=cctv?'#111612':'#c5b58f';ctx.fillRect(0,0,w,h);
    const grad=ctx.createLinearGradient(0,0,w,h);grad.addColorStop(0,cctv?'#29332b':'#d8caa8');grad.addColorStop(1,cctv?'#080b09':'#8f7a58');ctx.fillStyle=grad;ctx.fillRect(30,30,w-60,h-60);
    ctx.strokeStyle=cctv?'#708c76':'#5d4b35';ctx.lineWidth=8;ctx.strokeRect(42,42,w-84,h-84);
    ctx.fillStyle=cctv?'#b6cfb9':'#3d3427';ctx.font='bold 30px ui-monospace, monospace';ctx.fillText(frame.stamp||'',70,92);
    ctx.font='bold 44px sans-serif';ctx.fillText(frame.title||'',70,150);

    const sequenceHash=[...(sequence.id||sequence.title||'memory')].reduce((sum,ch)=>(sum*31+ch.charCodeAt(0))>>>0,0);
    const artIndex=(sequenceHash+this.memoryFrameIndex)%6;
    ctx.save();
    ctx.globalAlpha=cctv?.48:.62;
    const hasArt=drawMemoryFragment(ctx,artIndex,72,178,w-144,h-245);
    ctx.restore();
    if(hasArt){
      const artShade=ctx.createLinearGradient(0,178,0,h-67);
      artShade.addColorStop(0,cctv?'rgba(4,12,8,.34)':'rgba(48,37,25,.12)');
      artShade.addColorStop(.65,cctv?'rgba(2,7,5,.42)':'rgba(41,30,20,.18)');
      artShade.addColorStop(1,cctv?'rgba(2,6,4,.82)':'rgba(40,28,18,.64)');
      ctx.fillStyle=artShade;ctx.fillRect(72,178,w-144,h-245);
    }

    const sceneKind=frame.scene||'corridor';
    ctx.save();
    ctx.globalAlpha=cctv?.34:.28;
    ctx.strokeStyle=cctv?'#9ab49f':'#3d3327';ctx.fillStyle=cctv?'#26362b':'#7d6b50';ctx.lineWidth=6;
    if(sceneKind==='office'){
      ctx.fillRect(95,410,1080,28);ctx.strokeRect(140,205,340,160);ctx.fillRect(760,330,300,28);
      for(let i=0;i<4;i++)ctx.strokeRect(790+i*62,210,44,90);
    }else if(sceneKind==='duty'){
      ctx.strokeRect(90,330,300,150);ctx.fillRect(560,405,430,30);ctx.strokeRect(930,235,150,145);
      ctx.beginPath();ctx.arc(720,360,24,0,Math.PI*2);ctx.stroke();
    }else if(sceneKind==='er'){
      ctx.strokeRect(90,310,300,150);ctx.fillRect(510,395,420,28);ctx.strokeRect(975,220,170,180);
      for(let x=130;x<390;x+=65){ctx.beginPath();ctx.moveTo(x,310);ctx.lineTo(x,460);ctx.stroke();}
    }else if(sceneKind==='security'){
      ctx.fillRect(90,410,420,30);for(let row=0;row<2;row++)for(let col=0;col<4;col++)ctx.strokeRect(610+col*125,205+row*115,100,82);
      ctx.strokeRect(120,210,260,150);
    }else if(sceneKind==='skills'){
      ctx.strokeRect(170,365,520,90);ctx.strokeRect(790,205,260,220);ctx.beginPath();ctx.arc(430,340,45,0,Math.PI*2);ctx.stroke();
      ctx.moveTo(430,385);ctx.lineTo(430,445);ctx.stroke();
    }else if(sceneKind==='bridge'){
      ctx.beginPath();ctx.moveTo(110,520);ctx.lineTo(500,220);ctx.lineTo(780,220);ctx.lineTo(1170,520);ctx.stroke();
      for(let i=0;i<6;i++){const x=210+i*160;ctx.moveTo(x,465);ctx.lineTo(x+80,255);ctx.stroke();}
    }else if(sceneKind==='elevator'){
      ctx.strokeRect(390,205,500,330);ctx.moveTo(640,205);ctx.lineTo(640,535);ctx.stroke();ctx.strokeRect(930,260,120,220);
    }else if(sceneKind==='map'){
      ctx.strokeRect(130,205,950,330);ctx.moveTo(420,205);ctx.lineTo(420,535);ctx.moveTo(760,205);ctx.lineTo(760,535);ctx.moveTo(130,350);ctx.lineTo(1080,350);ctx.stroke();
      for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(235+i*145,285+(i%2)*120,16,0,Math.PI*2);ctx.fill();}
    }else if(sceneKind==='static'){
      for(let i=0;i<75;i++){const y=190+(i*19)%350,x=70+(i*73)%1100;ctx.fillRect(x,y,35+(i%5)*20,3);}
    }else{
      ctx.moveTo(100,500);ctx.lineTo(1180,500);ctx.moveTo(210,230);ctx.lineTo(210,500);ctx.moveTo(1040,230);ctx.lineTo(1040,500);ctx.stroke();
    }
    ctx.restore();
    const people=frame.people||[];
    if(people.length){
      drawCharacterStrip(ctx,people,{left:105,right:w-105,baseY:455,cctv,labels:true,maxScale:.92});
    }else{
      ctx.fillStyle=cctv?'#405044':'#7a684c';ctx.fillRect(210,240,w-420,260);
    }
    if(cctv){ctx.globalAlpha=.18;ctx.fillStyle='#d9f1df';for(let y=54;y<h-54;y+=8)ctx.fillRect(50,y,w-100,2);ctx.globalAlpha=1;ctx.fillStyle='#c6d9c8';ctx.font='23px ui-monospace,monospace';ctx.fillText('REC ●',w-170,92);}
    else{ctx.globalAlpha=.12;ctx.fillStyle='#3b2d1f';for(let i=0;i<55;i++){const x=(i*97)%w,y=(i*53)%h;ctx.fillRect(x,y,2+(i%3),2+(i%4));}ctx.globalAlpha=1;}
    document.getElementById('memory-stamp').textContent=frame.stamp||'';document.getElementById('memory-frame-title').textContent=frame.title||'';document.getElementById('memory-caption').textContent=frame.caption||'';document.getElementById('memory-narration').textContent=frame.narration||'';
    document.getElementById('memory-indicator').textContent=(this.memoryFrameIndex+1)+' / '+sequence.frames.length;
    const prev=document.getElementById('btn-memory-prev'),next=document.getElementById('btn-memory-next');if(prev)prev.disabled=this.memoryFrameIndex===0;if(next)next.disabled=this.memoryFrameIndex===sequence.frames.length-1;
  }

  closeMemorySequence(resume=true){
    this.memoryModal?.classList.remove('active');const cb=this.memoryCloseHandler;this.memoryCloseHandler=null;this.memorySequence=null;cb?.();if(resume)this.onTerminalClose?.();
  }

  openIdentityMatrix({candidates=[],onSelect,onAttemptComplete=null}={}){
    document.exitPointerLock();this.identityMatrixHandler=onSelect;let attemptUsed=false;
    const grid=document.getElementById('identity-candidate-grid');grid.replaceChildren();
    for(const candidate of candidates){
      const button=document.createElement('button');button.className='identity-candidate';button.id='identity-candidate-'+candidate.id;
      const strong=document.createElement('strong');strong.textContent=candidate.name;
      const meta=document.createElement('span');meta.textContent=candidate.employeeId+' ｜ '+candidate.role;
      const profile=getCharacterProfile(candidate.id);
      const cue=document.createElement('small');
      cue.textContent=profile?`人物記憶：「${profile.signatureQuote}」｜${profile.hobby}`:'';
      cue.style.display='block';cue.style.marginTop='4px';cue.style.opacity='.78';
      button.append(strong,meta,cue);
      button.addEventListener('click',()=>{
        if(attemptUsed)return;
        attemptUsed=true;
        grid.querySelectorAll('button').forEach(item=>item.disabled=true);
        soundManager.playComputerBeep();
        const result=this.identityMatrixHandler?.(candidate)||{};
        this.setIdentityMatrixStatus(result.message||'',result.resolved?'match':'error');
        if(onAttemptComplete){
          setTimeout(()=>{
            this.closeIdentityMatrix(false);
            onAttemptComplete(result,candidate);
          },result.resolved?1500:1900);
        }else if(result.resolved){
          setTimeout(()=>this.closeIdentityMatrix(),1500);
        }
      });
      grid.appendChild(button);
    }
    this.setIdentityMatrixStatus('等待候選身分比對。','');this.identityMatrixModal?.classList.add('active');
  }

  setIdentityMatrixStatus(text,tone=''){const el=document.getElementById('identity-matrix-status');if(!el)return;el.textContent=text;el.classList.remove('match','error');if(tone)el.classList.add(tone);}
  closeIdentityMatrix(resume=true){this.identityMatrixModal?.classList.remove('active');this.identityMatrixHandler=null;if(resume)this.onTerminalClose?.();}

  openFinalHandoff(handler){
    document.exitPointerLock();
    this.finalHandoffHandler=handler;
    const employeeId=document.getElementById('final-employee-id');if(employeeId)employeeId.value='';
    document.getElementById('final-handoff-status').textContent='IDENTITY VERIFICATION REQUIRED';
    this.finalHandoffModal?.classList.add('active');
  }

  setHandoffDecisionHandler(handler){this.handoffDecisionHandler=handler;}

  commitNightHandoff(btn=document.getElementById('btn-sign-handoff')){
    soundManager.playComputerBeep();
    this.gameState.markTaskComplete('E_HANDOFF');
    if(btn){btn.disabled=true;btn.textContent='交班資料送出中…';}
    const msg=document.querySelector('.his-system-msg');if(msg)msg.textContent='正在保留未確認值班身分，寫入夜間交班資料…';
    setTimeout(()=>{
      this.closeWorkstation();
      if(btn){btn.disabled=false;btn.textContent='確認電子交班';}
      if(msg)msg.textContent='系統連線正常 ｜ 夜班資料節點：時間欄位待同步';
      if(isIdentityRouteMode()){
        this.showSubtitle(
          'HIS',
          '「電子交班已送出。」\n\nSYSTEM WARNING：CURRENT DUTY PHYSICIAN 與歷史值班索引不一致。NAME SOURCE：CORRUPTED。\n\n值班物品櫃仍可獨立操作。',
          4600
        );
      }else{
        this.showAnomalyMessage();
      }
    },1200);
  }

  setFinalHandoffStatus(text){const el=document.getElementById('final-handoff-status');if(el)el.textContent=text;}

  closeFinalHandoff(resume=true){
    this.finalHandoffModal?.classList.remove('active');this.finalHandoffHandler=null;if(resume)this.onTerminalClose?.();
  }

  showEndingCG(name){const overlay=document.getElementById('ending-cg-screen');if(!overlay)return;overlay.querySelector('[data-ending-name]')?.replaceChildren(document.createTextNode(name));overlay.classList.add('active');setTimeout(()=>overlay.classList.remove('active'),5000);}

  showFinalSuccess(name,employeeId='MED-870409'){
    document.getElementById('ending-cg-screen')?.classList.remove('active');
    this.finalHandoffModal?.classList.remove('active');
    const win=this.finalSuccessModal?.querySelector('.anomaly-window');
    const title=win?.querySelector('h2');if(title)title.textContent='PERFECT ENDING — RECORD RESTORED';
    const paragraphs=win?.querySelectorAll('p');
    if(paragraphs?.[0])paragraphs[0].textContent=name+'（'+employeeId+'）｜IDENTITY RESTORED｜原始夜班紀錄已恢復';
    if(paragraphs?.[1])paragraphs[1].textContent='409-A 錯誤病人紀錄：INVALIDATED｜身分覆寫：REVOKED｜八名罹難者姓名：RESTORED';
    const last=this.finalSuccessModal?.querySelector('.anomaly-last');
    if(last)last.textContent='316 舊終端最後留下：「RECORD WRITE COMPLETE｜這一次，所有名字都回到正確的位置。」';
    this.finalSuccessModal?.classList.add('active');
  }

  closeAllTransientOverlays(){
    document.querySelectorAll('.modal-overlay.active,.cutscene-overlay.active').forEach(el=>{
      if(el===this.loopCutscene)return;
      el.classList.remove('active');
    });
  }

  resetAfterLoop(){
    document.getElementById('locker-contents')?.classList.remove('revealed');
    const locker=document.getElementById('locker-code');if(locker)locker.value='';
    const code302=document.getElementById('office302-code');if(code302)code302.value='';
    const hisA=document.getElementById('his-account');if(hisA)hisA.value='';
    const hisP=document.getElementById('his-password');if(hisP)hisP.value='';
    document.getElementById('his-handoff-content')?.classList.remove('unlocked');
    this.updateTasks();this.updateTime();
  }

  showLoopWakeup(loopCount){
    const el=document.getElementById('loop-wake-flash');
    el?.classList.remove('active');void el?.offsetWidth;el?.classList.add('active');
    setTimeout(()=>this.showSubtitle('學長','「醫師？發什麼呆，我先走了……」',3600),850);
    setTimeout(()=>this.showSubtitle('值班醫師',`「手腕……這不是夢。這已經是第 ${loopCount+1} 次了。」`,4200),4200);
  }

  openTravelSelector(destinations, currentZone, onSelect, kind = 'elevator', onPrefetch = null) {
    document.exitPointerLock();
    this.elevatorCutscene.dataset.selecting = 'true';
    this.elevatorCutscene.dataset.travelling = 'false';
    this.elevatorCutscene.querySelector('.floor-arrow').textContent = '↕';
    this.elevatorCutscene.classList.add('active');

    const isStairs = kind === 'stairs';
    this.elevatorCutscene.querySelector('.floor-digit').textContent = isStairs ? '樓梯' : '電梯';

    const info = document.getElementById('elevator-status-text');
    info.replaceChildren();

    const titleBox = document.createElement('div');
    titleBox.style.marginBottom = '12px';

    const header = document.createElement('h2');
    header.style.color = '#79d2a6';
    header.style.margin = '0 0 6px 0';
    header.textContent = isStairs ? '安全梯' : '電梯';
    titleBox.appendChild(header);

    // Current floor number parsing
    const curFloorMatch = currentZone.match(/_([0-9])f/);
    const curFloor = curFloorMatch ? Number(curFloorMatch[1]) : (currentZone === 'first_campus_3f' ? 3 : 0);

    const locText = document.createElement('p');
    locText.style.color = '#a0b4aa';
    locText.style.fontSize = '14px';
    locText.style.margin = '0';
    const curLocLabel = window.worldRouter?.zoneLabels?.[currentZone] || currentZone;
    locText.textContent = `目前所在位置：${curLocLabel.replace(/^[0-9]+[.] /, '').split(' (M')[0]}`;
    titleBox.appendChild(locText);
    info.appendChild(titleBox);

    const btnGrid = document.createElement('div');
    btnGrid.style.display = 'flex';
    btnGrid.style.flexDirection = 'column';
    btnGrid.style.gap = '8px';
    btnGrid.style.margin = '14px 0';

    for (const destination of [...destinations].sort((a,b) => b.floorNum-a.floorNum)) {
      const destFloor = destination.floorNum || Number(destination.zoneId.match(/_([0-9])f/)?.[1] || 0);
      const isCurrent = destination.zoneId === currentZone;

      let directionBadge = '';
      if (isCurrent) {
        directionBadge = '【目前樓層】';
      } else if (destFloor > curFloor && curFloor > 0) {
        directionBadge = '▲ 上樓';
      } else if (destFloor < curFloor && curFloor > 0) {
        directionBadge = '▼ 下樓';
      }

      const button = document.createElement('button');
      button.className = 'btn-primary';
      button.dataset.floor = destination.zoneId;
      button.style.display = 'flex';
      button.style.justifyContent = 'space-between';
      button.style.alignItems = 'center';
      button.style.padding = '8px 16px';
      button.style.fontSize = '14px';

      // Mission gating: 4F is special scene requiring 3F duty tasks
      let isLocked = false;
      if (destination.zoneId === 'first_campus_4f' && !isCurrent) {
        if (!this.gameState.areRequiredTasksComplete()) {
          isLocked = true;
        }
      }

      if (isLocked) {
        button.innerHTML = `<span>🔒 ${destination.label}</span> <span style="font-size:12px;color:#e89078;">需先完成 3F 交班手續</span>`;
        button.disabled = true;
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
      } else {
        button.innerHTML = `<span>${destination.label}</span> <span style="font-size:12px;color:#79d2a6;">${directionBadge}</span>`;
        button.disabled = isCurrent;
        if (isCurrent) {
          button.style.opacity = '0.6';
          button.style.cursor = 'default';
        } else {
          button.addEventListener('click', () => {
            this.runTravelTransition(destination,curFloor,onSelect,kind,onPrefetch);
          });
        }
      }
      btnGrid.appendChild(button);
    }
    info.appendChild(btnGrid);

    const cancel = document.createElement('button');
    cancel.id = 'btn-cancel-travel';
    cancel.className = 'btn-secondary';
    cancel.textContent = '關閉 / 取消 (Esc)';
    cancel.style.marginTop = '6px';
    cancel.addEventListener('click', () => this.closeTravelSelector());
    info.appendChild(cancel);
  }

  runTravelTransition(destination,fromFloor,onSelect,kind,onPrefetch=null) {
    if(this.elevatorCutscene.dataset.travelling==='true')return;
    this.elevatorCutscene.dataset.selecting='false';
    this.elevatorCutscene.dataset.travelling='true';
    const up=destination.floorNum>fromFloor;
    this.elevatorCutscene.querySelector('.floor-arrow').textContent=up?'▲':'▼';
    this.elevatorCutscene.querySelector('.floor-digit').textContent=up?'上行':'下行';
    const statusEl=document.getElementById('elevator-status-text');
    statusEl.textContent=`${kind==='stairs'?'安全梯':'電梯'} ${fromFloor}F → ${destination.floorNum}F`;
    if(kind==='stairs')soundManager.playClick();else soundManager.playElevatorMotor();
    const preloadPromise=Promise.resolve(onPrefetch?.(destination));
    const glitch=kind!=='stairs'&&fromFloor===3&&destination.floorNum===4&&this.gameState.isTaskComplete('ARCHIVE_CLUE_FOUND');
    if(glitch){
      const digit=this.elevatorCutscene.querySelector('.floor-digit');
      const seq=['3','2','1','B1','B2','4'];
      seq.forEach((v,i)=>setTimeout(()=>{digit.textContent=v;},260+i*250));
      setTimeout(()=>{statusEl.textContent='電梯 3F → 4F';},1650);
    }
    this.travelTimer=setTimeout(async()=>{
      try {
        const preview6F=kind==='elevator'&&this.gameState.getFlag('SECOND_CAMPUS_ACCESS')&&!this.gameState.getFlag('FLOOR6_AVAILABLE')&&!this.gameState.getFlag('M6_FLOOR6_RESOLVED')&&!this.gameState.getFlag('CG_ELEVATOR_6F_PREVIEW_PLAYED');
        if(preview6F){
          this.gameState.setFlag('CG_ELEVATOR_6F_PREVIEW_ACTIVE',true);
          try{await Promise.all([preloadPromise,playElevatorGlimpse(this.elevatorCutscene)]);this.gameState.setFlag('CG_ELEVATOR_6F_PREVIEW_PLAYED',true);}
          finally{this.gameState.setFlag('CG_ELEVATOR_6F_PREVIEW_ACTIVE',false);}
        }else await preloadPromise;
        await onSelect(destination);
        soundManager.playElevatorChime();
      } finally {
        this.elevatorCutscene.dataset.travelling='false';
        this.closeTravelSelector();
      }
    },kind==='stairs'?1100:(glitch?2100:1700));
  }

  runDoorTransition(onArrival) {
    document.exitPointerLock();
    this.elevatorCutscene.dataset.selecting='false';
    this.elevatorCutscene.dataset.travelling='true';
    this.elevatorCutscene.classList.add('active');
    this.elevatorCutscene.querySelector('.floor-arrow').textContent='';
    this.elevatorCutscene.querySelector('.floor-digit').textContent='感應通過';
    document.getElementById('elevator-status-text').textContent='門禁確認中';
    soundManager.playClick();
    this.travelTimer=setTimeout(async()=>{
      try {await onArrival();}
      finally {this.elevatorCutscene.dataset.travelling='false';this.closeTravelSelector();}
    },650);
  }

  closeTravelSelector() {
    if(this.elevatorCutscene.dataset.travelling==='true')return;
    this.elevatorCutscene.dataset.selecting = 'false';
    this.elevatorCutscene.classList.remove('active');
    this.onElevatorTransitionComplete?.();
  }

  triggerElevatorTransition(onComplete) {
    document.exitPointerLock();
    soundManager.playElevatorChime();
    this.elevatorCutscene.classList.add('active');

    setTimeout(() => {
      soundManager.playElevatorMotor();
    }, 800);

    setTimeout(() => {
      soundManager.playElevatorChime();
      const infoEl = document.getElementById('elevator-status-text');
      infoEl.innerHTML = [
        '<div class="arrival-badge">4F 病房區抵達</div>',
        '<h2>交班完成，夜班正式開始</h2>',
        '<ul class="milestone-list">',
        '  <li>下一步：前往護理站確認病房狀態與晚餐代訂。</li>',
        '  <li>再前往值班室放置個人物品，準備晚間巡房。</li>',
        '  <li>後續將進入第一幕病房探索與護理站互動。</li>',
        '</ul>',
        '<button id="btn-continue-explore" class="btn-primary" style="margin-top:20px;">返回 3F 繼續測試</button>'
      ].join('');

      const btnContinue = document.getElementById('btn-continue-explore');
      if (btnContinue) {
        btnContinue.addEventListener('click', () => {
          this.elevatorCutscene.classList.remove('active');
          if (onComplete) onComplete();
        });
      }
    }, 3600);
  }

  updateTime() {
    if (this.timeEl) this.timeEl.textContent = `${this.gameState.getDisplayTime?.()||this.gameState.gameTime} ｜ ${isIdentityRouteMode()?'夜班人員｜身分待核':'第一線值班：值班醫師｜姓名待核'}`;
  }

  renderTaskBoard(header, items) {
    const panel=document.getElementById('task-panel');
    panel?.classList.remove('no-guidance');
    const headerEl = document.querySelector('#task-panel .task-header');
    const listEl = document.querySelector('#task-panel .task-list');
    if (!headerEl || !listEl) return;
    headerEl.textContent = header;
    listEl.replaceChildren();

    for (const item of items) {
      const row = document.createElement('div');
      row.id = item.id;
      row.className = `task-item ${item.state}`;
      const box = document.createElement('span');
      box.className = 'status-box';
      const label = document.createElement('span');
      label.className = 'task-text';
      label.textContent = item.text;
      row.append(box, label);
      listEl.appendChild(row);
    }
  }

  updateTasks() {
    if(isIdentityRouteMode())return;
    const done = (id) => this.gameState.isTaskComplete(id);
    const sequential = (defs) => {
      let unlocked = true;
      return defs.map((item) => {
        const isDone = done(item.task);
        const state = isDone ? 'completed' : unlocked ? 'ready' : 'locked';
        if (!isDone) unlocked = false;
        return { id:item.id, text:item.text, state };
      });
    };

    const opened316=this.gameState.getFlag('OPENED_316');
    const currentZone=window.worldRouter?.activeZoneId || '';

    if(this.gameState.getFlag('GAME_COMPLETE')){
      this.renderTaskBoard('RECORD RESTORED｜紀錄覆寫完成',[
        {id:'task-game-complete',text:'張守恆與八名罹難者的原始夜班紀錄已恢復',state:'completed'}
      ]);
      return;
    }

    if(this.gameState.getFlag('PHONE_RING_ACTIVE')&&['ER_JANE_2005','NIGHT_PATROL_2115','ER_GHOST_0033','FAST_PATH_316'].includes(this.gameState.getFlag('PHONE_CALL_KIND'))){
      this.renderTaskBoard('',[]);
      return;
    }

    if(this.gameState.getFlag('FAST_PATH_3F')&&!this.gameState.getFlag('KEY_PICKUP')){
      let text='輸入相同密碼，從櫃子取得感應卡與 4F 值班室鑰匙';
      if(!this.gameState.getFlag('FOUND_316_SPARE_KEY'))text='先去警衛查哨點取得 316 備援鑰匙';
      else if(!opened316)text='使用備援鑰匙進入 316';
      else if(!this.gameState.getFlag('FAST_PATH_316_CALL_DONE'))text='接聽 316 辦公室裡響起的電話';
      this.renderTaskBoard('回溯後的值班',[
        {id:'task-fastpath-316',text,state:'ready'}
      ]);
      return;
    }

    if(!done('WARD_ENTRY')){
      const panel=document.getElementById('task-panel');
      if(this.gameState.getFlag('HIS_ANOMALY_SEEN')){
        panel?.classList.add('no-guidance');
        return;
      }
      if(!opened316){
        this.renderTaskBoard('目前',[
          {id:'task-current',text:'想辦法進入 316 總醫師辦公室',state:'ready'}
        ]);
        return;
      }
      if(!done('E_HANDOFF')){
        this.renderTaskBoard('目前',[
          {id:'task-current',text:'完成今晚的電子交班',state:'ready'}
        ]);
        return;
      }
    }

    if(this.gameState.getFlag('NIGHT_PATROL_RETURN_3F')&&!this.gameState.getFlag('BOOTSTRAP_2117_RESOLVED')){
      if(currentZone==='first_campus_3f'){
        const examined=this.gameState.getFlag('GUARD_SIGN_EXAMINED');
        this.renderTaskBoard('21:17｜3F',[
          {id:'task-night-patrol',text:examined?'查看查哨簽名簿':'去警衛查哨點看看',state:'ready'}
        ]);
      }else{
        this.renderTaskBoard('21:15｜護理站來電',[
          {id:'task-night-return',text:'回 3F 一趟',state:'ready'}
        ]);
      }
      return;
    }

    if(this.gameState.getFlag('BOOTSTRAP_2117_RESOLVED')){
      if(!this.gameState.getFlag('POST_2117_DUTY_CALL_DONE')){
        const triggered=this.gameState.getFlag('POST_2117_DUTY_ROOM_TRIGGERED');
        const at4F=currentZone==='first_campus_4f';
        this.renderTaskBoard(triggered?'23:55｜值班室｜異常正在逼近':'21:17 之後｜回值班室',[
          {
            id:'task-post2117-duty',
            text:this.gameState.getFlag('PHONE_RING_ACTIVE')?'接聽值班室電話':(triggered?'把「21:17／316／409」寫進值班紀錄；不要離開，值班電話即將響起':(at4F?'立刻進入值班室；一進門就會觸發下一段事件':'立刻返回 4F 值班室；不要在院區漫遊')),
            state:'ready'
          }
        ]);
      }else if(this.gameState.getFlag('GHOST_REGISTRATION_AVAILABLE')&&!this.gameState.getFlag('ER0033_SLIP_COLLECTED')){
        this.renderTaskBoard('翌日 00:33｜急診掛號異常',[
          {id:'task-post2117-er',text:'前往 2F 急診查看異常掛號紀錄',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('ER0033_SLIP_COLLECTED')&&!this.gameState.getFlag('M3_316_DECODED')){
        this.renderTaskBoard('00:33｜1998-ER-0217',[
          {id:'task-m3-316',text:'把掛號聯帶回 3F 316，用舊終端查封存索引',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('M3_316_DECODED')&&!this.gameState.getFlag('SECOND_CAMPUS_ACCESS')){
        this.renderTaskBoard('等待院內來電',[
          {id:'task-second-call',text:'留意第二院區來電',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('SECOND_CAMPUS_OBJECTIVE_ACTIVE')&&!this.gameState.getFlag('M4_CHEST_RESOLVED')){
        const reported=this.gameState.getFlag('SECOND_CAMPUS_5F_REPORTED');
        const seen=this.gameState.getFlag('SECOND_CHEST_PATIENT_SEEN');
        this.renderTaskBoard('翌日 01:15｜第二院區 5F',[
          {
            id:'task-m4-chest',
            text:!reported?'01:15 前往第二院區 5F 護理站報到':seen?'回護理站查看桌上的「病人處置醫囑」':'前往 504B 評估陳怡君',
            state:'ready'
          }
        ]);
      }else if(this.gameState.getFlag('M4_CHEST_RESOLVED')&&!this.gameState.getFlag('M5_ROUTE_RESOLVED')){
        const cctvDone=this.gameState.getFlag('M5_CCTV_RESOLVED');
        this.renderTaskBoard(cctvDone?'翌日 01:45｜天橋回程':'翌日 01:45｜第二院區監控異常',[
          {id:'task-m5-route',text:cctvDone?'穿越封閉天橋，保持視線向前返回第一院區':'先到第二院區 2F 安檢監控支援室；閃爍的 CRT 正在播放不存在的 6F',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('M5_ROUTE_RESOLVED')&&!this.gameState.getFlag('M6_FLOOR6_RESOLVED')){
        this.renderTaskBoard('翌日 02:00｜返回第一院區',[
          {id:'task-m6-elevator',text:currentZone==='phantom_6f'?(this.gameState.getFlag('FLOOR6_STETHOSCOPE_FOUND')?'檢視反光的老舊聽診器，翻面或擦去刻字上的灰塵':'查看焦黑器材旁反光的物件'):'搭乘一般電梯返回第一院區',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('B2_EXITED_PERMANENTLY')&&this.gameState.getFlag('B2_FIRE_RECAP_SEEN')&&this.gameState.getFlag('M8_IDENTITY_BATTLE_ACTIVE')){
        this.renderTaskBoard('RECORD OVERWRITE｜紀錄覆寫中',[
          {id:'task-m9-final-handoff',text:'立即返回 316，輸入正確權限阻止事故與身分紀錄被再次覆蓋',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('M6_FLOOR6_RESOLVED')&&!this.gameState.getFlag('M7_B2_OPEN')&&!this.gameState.getFlag('M7_B2_RESOLVED')){
        this.renderTaskBoard('翌日 02:17 前｜門禁紀錄',[
          {id:'task-m7-service-door',text:this.gameState.getFlag('HIDDEN_SERVICE_DOOR_DISCOVERED')?'檢查警衛台後方浮現的舊門框':'02:17 前往第一院區 1F 警衛台，查找異常門禁與監視紀錄',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('M7_B2_OPEN')&&!this.gameState.getFlag('B2_FIRE_RECAP_SEEN')){
        this.renderTaskBoard('翌日 02:17｜B2 封存終端',[
          {id:'task-m7-b2-fire-recap',text:'啟動封存驗證終端，讀取當年火災與人員封存紀錄',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('M7_B2_OPEN')&&this.gameState.getFlag('B2_FIRE_RECAP_SEEN')){
        this.renderTaskBoard('B2｜UNKNOWN SESSION 正在覆寫',[
          {id:'task-m8-b2-exit',text:'由單向封存防火門返回 3F；前往 316 阻止紀錄覆寫',state:'ready'}
        ]);
      }else if(this.gameState.getFlag('M8_IDENTITY_BATTLE_ACTIVE')&&!this.gameState.getFlag('GAME_COMPLETE')){
        this.renderTaskBoard('RECORD OVERWRITE｜紀錄覆寫中',[
          {id:'task-m9-final-handoff',text:'返回 316，輸入正確權限阻止紀錄覆寫',state:'ready'}
        ]);
      }else{
        document.getElementById('task-panel')?.classList.add('no-guidance');
      }
      return;
    }

    if (done('ACT1_NORMAL_FLOW')) {
      this.renderTaskBoard('夜班進度（21:00）', [
        {id:'task-normal-flow-complete',text:'正常值班流程完成',state:'completed'}
      ]);
      return;
    }

    if (done('P1_RETURN_4F')) {
      this.renderTaskBoard('4F 病房｜20:40–21:00', sequential([
        {id:'task-return-4f',task:'P1_RETURN_4F',text:'20:40 已返回 4F 病房'},
        {id:'task-end-shift',task:'ACT1_NORMAL_FLOW',text:'21:00 使用值班室桌上電腦短暫休息'}
      ]));
      return;
    }

    if (done('P1_ER_CALL_RECEIVED')) {
      if(!this.gameState.getFlag('P1_ER_CALL_ANSWERED')){
        this.renderTaskBoard('4F 值班室電話｜20:00', [
          {id:'task-answer-er-call',text:'接聽值班室電話',state:'ready'}
        ]);
      }else{
        this.renderTaskBoard('2F 急診會診｜20:05–20:40', sequential([
          {id:'task-er-assess',task:'P1_ER_ASSESSMENT_DONE',text:'20:05 前往 2F 急診完成精神科評估'},
          {id:'task-er-note',task:'P1_ER_NOTE_DONE',text:'20:30 完成急診評估紀錄'},
          {id:'task-return-4f',task:'P1_RETURN_4F',text:'返回 4F 病房'}
        ]));
      }
      return;
    }

    const dutySteps=[
      {id:'task-4f-report',complete:done('P1_4F_REPORT'),text:'17:15 向護理站報到並確認交班重點'},
      {id:'task-408c-event',complete:done('P1_NORMAL_EVENT_DONE'),text:'19:30 前往 408C，評估敲牆聲是否可能為幻聽／知覺異常'},
      {id:'task-409-seal',complete:this.gameState.getFlag('FOURF_409_SEAL_CHECKED_AFTER_408C'),text:'確認 409 房門封條與整修狀態'},
      {id:'task-bed33-form',complete:this.gameState.getFlag('BED33_RESOLVED'),text:'回護理站核對 409A 臨時床位分配單'}
    ];
    const currentDutyStep=dutySteps.find(step=>!step.complete);
    const dutyItems=currentDutyStep?[{id:currentDutyStep.id,text:currentDutyStep.text,state:'ready'}]:[];
    if(!this.gameState.getFlag('BED33_RESOLVED')){
      this.renderTaskBoard('4F 病房值班｜17:15–20:00',dutyItems);
      return;
    }

    this.renderTaskBoard('4F 病房｜20:00 急診來電', [
      {id:'task-return-duty-room',text:'回值班室開門，接聽急診來電',state:'ready'}
    ]);
  }

  toggleDebug() {
    this.debugPanel.classList.toggle('visible');
    this.updateDebug();
  }

  updateDebug() {
    if (!this.debugPanel) return;
    document.getElementById('dbg-duty').textContent = this.gameState.duty;
    document.getElementById('dbg-evidence').textContent = this.gameState.evidence;
    document.getElementById('dbg-identity').textContent = this.gameState.identity;
    document.getElementById('dbg-fatigue').textContent = this.gameState.fatigue;
    document.getElementById('dbg-tasks').textContent = Array.from(this.gameState.completedTasks).join(', ') || '無';
  }
}
