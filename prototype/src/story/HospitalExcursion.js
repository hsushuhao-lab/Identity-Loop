import {prepareZoneWithRetry} from '../art/ZoneReadiness.js';
import {soundManager} from '../audio/SoundManager.js';

// A reversible excursion. IdentityManager never advances or records an answer.
export class HospitalExcursion {
  constructor({simulation,worldRouter,controller,director,gameState,uiManager,casePanel}){
    Object.assign(this,{simulation,worldRouter,controller,director,gameState,uiManager,casePanel});this.active=false;this.transitioning=false;
    this.returnButton=document.createElement('button');this.returnButton.id='hospital-annex-return';this.returnButton.textContent='返回4F主線';this.returnButton.hidden=true;document.body.append(this.returnButton);this.returnButton.onclick=()=>this.travel('return');
  }
  async travel(action){
    if(this.transitioning)return false;
    const entering=action==='enter',d=this.director;
    if(entering && (this.worldRouter.activeZoneId!=='first_campus_4f' || d?.busy || d?.step==='M8' || d?.bindingFor()?.auto || d?.manager.runSave.runEnded || this.gameState.getFlag('M8_IDENTITY_BATTLE_ACTIVE'))){this.uiManager.showSubtitle('值班醫師','先完成眼前的對話或緊急事件，再進行器材調查。',2500);return false;}
    if(!entering && !this.active)return false;
    if(this.casePanel.root.classList.contains('active'))this.casePanel.close();
    this.transitioning=true;const source=this.worldRouter.activeZoneId,previousEnabled=this.controller.enabled;this.controller.enabled=false;this.controller.resetInput();let mutated=false;
    const mask=document.createElement('div');mask.id='hospital-excursion-transition';mask.className='hospital-zone-transition';mask.textContent=entering?'開啟封存檢修廊…':'返回4F儲藏室…';document.body.append(mask);
    try{
      await prepareZoneWithRetry(entering?'ward_service_annex':'first_campus_4f',{allowCancel:true});
      this.casePanel.root.classList.remove('active');
      if(entering){
        this.savedDirector={beatIndex:d?.beatIndex,awaitingZone:d?.awaitingZone};d?.removeInteractionTarget();
        this.simulation.data.sideCase.visits++;this.simulation.save();this.active=true;
        mutated=true;this.worldRouter.loadZone('ward_service_annex','ward_service_entry');
      }else{
        mutated=true;this.worldRouter.loadZone('first_campus_4f','ward_service_return');
        this.worldRouter.activeZoneInstance.keyedDoors.storage_STORE_ENTRY.setClosed(false);
        if(d){d.awaitingZone=this.savedDirector.awaitingZone;await d.placeBeat({forceLoad:false});d.renderObjective();}
        this.active=false;
      }
      this.returnButton.hidden=!this.active;soundManager.playDoorLockClack();this.uiManager.showSubtitle('現場',entering?'封存檢修廊。原件、接點與風口都可以分別查看；隨時能返回。':'已返回4F。檢修廊調查保留在器材紀錄，主線目前目標仍在任務面板。',4000);return true;
    }catch(error){
      console.warn('[hospital excursion] transition failed',source,error.message);
      if(mutated){
        try{this.worldRouter.loadZone(source,source==='first_campus_4f'?'ward_service_return':'ward_service_entry');this.active=source==='ward_service_annex';if(d&&!this.active){d.awaitingZone=this.savedDirector.awaitingZone;await d.placeBeat({forceLoad:false});d.renderObjective();}}
        catch(restoreError){console.error('[hospital excursion] source restore failed',restoreError);this.uiManager.showSubtitle('載入失敗','重新整理會回到已保存的主線章節；支線紀錄仍保留。',8000);}
      }
      this.returnButton.hidden=!this.active;return false;
    }
    finally{mask.remove();this.transitioning=false;this.controller.enabled=previousEnabled;this.controller.requestPointerLock();}
  }
}
