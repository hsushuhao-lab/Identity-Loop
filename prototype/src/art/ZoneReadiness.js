import {preloadZoneEssential} from './ZoneAssetManifest.js';
import {withLoadDeadline} from './LoadDeadline.js';

export async function prepareZoneWithRetry(zoneId,{allowCancel=false}={}){
  while(true){
    try{return await withLoadDeadline(() => preloadZoneEssential(zoneId));}
    catch(error){
      console.error('[art] essential zone load failed',zoneId,error);
      const overlay=document.createElement('div');
      overlay.style.cssText='position:fixed;inset:0;z-index:50001;background:#101813;color:#e0e6df;display:grid;place-content:center;text-align:center';
      overlay.setAttribute('role','alert');
      overlay.id='zone-load-recovery';
      const message=document.createElement('p');message.textContent='必要資料載入失敗，請重試。';
      const retry=document.createElement('button');retry.textContent='重新載入';
      const cancel=document.createElement('button');cancel.textContent='取消移動，留在原樓層';
      cancel.hidden=!allowCancel;
      overlay.append(message,retry,cancel);document.body.append(overlay);
      const proceed=await new Promise(resolve=>{retry.onclick=()=>resolve(true);cancel.onclick=()=>resolve(false);});
      overlay.remove();
      if(!proceed)throw new Error('ZONE_LOAD_CANCELLED');
    }
  }
}
