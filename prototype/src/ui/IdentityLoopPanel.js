import { B2_ARCHIVE_IDENTITIES, B2_FIRE_MEMORY } from '../story/IdentityLoopFireMemory.js';
import { getGoodEnding, getM9Candidates, WRONG_MEMORY_LINES } from '../story/IdentityLoopEndings.js';
import { getVisibleEvidence } from '../story/IdentityLoopEvidence.js';
import { ROUTE_STEPS } from '../story/IdentityRoutes.js';
import { soundManager } from '../audio/SoundManager.js';


export class IdentityLoopPanel{
  constructor(manager,{debug=false,onNewRun=()=>{}}={}){this.manager=manager;this.debug=debug;this.onNewRun=onNewRun;this.root=document.getElementById('identity-loop-panel');this.onCommit=null;}
  start(){this.manager.restoreOrStartRun();this.root?.classList.remove('visible','archive-open','m9-open','ending-open');this.render();}
  render(){
    if(!this.root)return;
    const {runSave,metaSave}=this.manager;
    const milestone=this.root.querySelector('[data-identity-milestone]');
    if(milestone)milestone.textContent=ROUTE_STEPS[this.manager.currentRouteStep]?.label||'夜班結束';
    const seed=this.root.querySelector('[data-identity-seed]');
    if(seed)seed.textContent='未公開';
    const progress=this.root.querySelector('[data-identity-progress]');
    if(progress)progress.textContent=`記憶 ${runSave.completedStoryModules?.length||0} · Good Ends ${metaSave.completedGoodEnds.length}/4`;
    const evidence=this.root.querySelector('[data-identity-evidence]');
    if(evidence)evidence.replaceChildren(...Object.values(runSave.evidence).map(item=>{
      const li=document.createElement('li');
      li.textContent=String(item.visibleText||item.summary||item.label||'未分類紀錄').replace(/\[object Object\]/g,'舊版敘事內容未保存');
      return li;
    }));
  }
  syncMilestone(milestone){this.manager.advanceMilestone(milestone);this.render();}
  recordEvidence(id){const evidence=getVisibleEvidence().find(item=>item.id===id);if(evidence)this.manager.recordEvidence(evidence);this.render();}
  openB2Archive(){
    if(!this.root)return;
    this.root.classList.add('visible','archive-open');
    const body=this.root.querySelector('[data-identity-detail]');
    if(body){body.replaceChildren();const heading=document.createElement('h3');heading.textContent='B2 / IDENTITY ARCHIVE';body.append(heading);const p=document.createElement('p');p.textContent='CURRENT SELF = CORRUPTED｜客觀檔案已恢復，當前身分仍未判定。';body.append(p);const list=document.createElement('ul');for(const item of B2_ARCHIVE_IDENTITIES){const li=document.createElement('li');li.textContent=`封存人員｜${item.role}｜姓名與員編待最終核對`;list.append(li);}body.append(list);const fire=document.createElement('p');fire.className='identity-loop-fire-memory';fire.textContent=B2_FIRE_MEMORY.join(' · ');body.append(fire);}
    this.render();
  }
  openM9({onCommit}={}){
    if(!this.root||this.manager.currentRouteStep!=='M9'||this.manager.runSave.runEnded)return;
    this.onCommit=onCommit;
    this.root.classList.add('visible','m9-open');
    this.root.classList.remove('archive-open','ending-open');
    this.root.querySelector('[data-identity-detail]').textContent='分別選擇姓名與員編。兩項都必須屬於這一輪的你；選到其他人的資料或不相符的配對，都會使身分核對失敗。正式提交僅有一次，提交後不可更改。';
    const choices=this.root.querySelector('[data-identity-choices]');choices.replaceChildren();
    const form=document.createElement('form');form.className='identity-entry-form identity-selection-form';
    // Keep the evidence readable during the irreversible decision, without
    // changing either answer list or giving correctness hints.
    const binder=document.createElement('details');binder.className='identity-case-binder';
    const binderTitle=document.createElement('summary');binderTitle.textContent='翻閱今晚的值班紀錄（唯讀）';binder.append(binderTitle);
    const binderList=document.createElement('ul');
    for(const item of Object.values(this.manager.runSave.evidence||{})){
      const li=document.createElement('li');
      const label=String(item.label||item.milestone||'夜班紀錄');
      const body=String(item.summary||item.visibleText||'').replace(/\\[object Object\\]/g,'舊版文字遺失，請查看現場原件');
      li.textContent=`${label}：${body}`;
      binderList.append(li);
    }
    if(!binderList.children.length){const li=document.createElement('li');li.textContent='沒有已保存的值班紀錄。可以暫時離開終端閱讀場景原件。';binderList.append(li);}
    binder.append(binderList);form.append(binder);

    const status=document.createElement('div');status.className='identity-entry-status';status.setAttribute('aria-live','polite');
    const summary=document.createElement('p');summary.className='identity-selection-summary';summary.setAttribute('aria-live','polite');
    const submit=document.createElement('button');submit.type='submit';submit.className='identity-entry-submit';submit.textContent='正式提交交班（不可更改）';submit.disabled=true;
    const candidates=getM9Candidates(),selected={};
    // Deliberately different fixed orders: rows do not disclose matched pairs.
    const orders={name:['LI','ZHANG','ZHOU','CHEN'],employee:['CHEN','LI','ZHANG','ZHOU']};
    for(const [part,title]of [['name','姓名'],['employee','員編']]){
      const group=document.createElement('fieldset');group.dataset.identityGroup=part;
      const legend=document.createElement('legend');legend.textContent=title;group.append(legend);
      for(const identity of orders[part]){
        const candidate=candidates.find(item=>item.identity===identity);
        const label=document.createElement('label');label.className='identity-selection-option';
        const input=document.createElement('input');input.type='radio';input.name='m9-'+part;input.value=identity;input.required=true;
        const text=document.createElement('span');text.textContent=part==='name'?candidate.name:candidate.employeeId;
        input.addEventListener('change',()=>{
          selected[part]=identity;status.textContent='';
          const n=candidates.find(x=>x.identity===selected.name),e=candidates.find(x=>x.identity===selected.employee);
          summary.textContent=`姓名：${n?.name||'尚未選擇'}　／　員編：${e?.employeeId||'尚未選擇'}`;
          submit.disabled=!(n&&e);
          soundManager.playClick();
        });
        label.append(input,text);group.append(label);
      }
      form.append(group);
    }
    let submitting=false;
    form.addEventListener('submit',event=>{
      event.preventDefault();
      if(submitting||!selected.name||!selected.employee)return;
      submitting=true;
      for(const input of form.querySelectorAll('input,button'))input.disabled=true;
      // Persist the irreversible pair synchronously. Reload during the cinematic
      // cannot turn a mismatched staff number into a successful name-only result.
      const result=this.commit(selected.name,selected.employee);
      if(!result.ok){status.textContent='此回合無法再次提交。';}
    });
    summary.textContent='姓名：尚未選擇　／　員編：尚未選擇';
    form.append(summary,submit,status);choices.append(form);this.root.scrollTop=0;this.render();
  }
  commit(identity,employeeIdentity){const result=this.manager.commitM9(identity,employeeIdentity);if(!result.ok)return result;this.root?.classList.remove('m9-open');this.root?.querySelector('[data-identity-choices]')?.replaceChildren();this.render();this.showEnding(result);this.onCommit?.(result);return result;}
  showEnding(result){
    if(!this.root)return;
    this.root.classList.add('visible','ending-open');
    const body=this.root.querySelector('[data-identity-detail]');body.replaceChildren();
    const title=document.createElement('h3');title.textContent=result.type==='GOOD_END'?getGoodEnding(result.identity).title:'WRONG MEMORY';body.append(title);
    const lines=result.type==='GOOD_END'?getGoodEnding(result.identity).lines:WRONG_MEMORY_LINES;for(const line of lines){const p=document.createElement('p');p.textContent=line;body.append(p);}
    if(result.type==='GOOD_END'){
      const replay=document.createElement('button');replay.type='button';replay.className='identity-ending-replay';replay.textContent='重看本輪結局動畫';
      replay.addEventListener('click',()=>this.onReplayEnding?.(result));body.append(replay);
    }
    const button=document.createElement('button');button.type='button';button.className='identity-loop-new-run';button.textContent='開始新的夜班';button.addEventListener('click',()=>this.newRun());body.append(button);
  }
  newRun(){this.root?.classList.remove('visible','ending-open','archive-open','m9-open');this.root?.querySelector('[data-identity-detail]')?.replaceChildren();this.root?.querySelector('[data-identity-choices]')?.replaceChildren();this.manager.startNewRun();this.render();this.onNewRun();}
}
