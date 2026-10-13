export class FullscreenToggle {
  constructor(button,status,{document:doc=globalThis.document,onChange=()=>{}}={}){
    Object.assign(this,{button,status,doc,onChange});
    this.changed=()=>{this.onChange();this.refresh();};
    button.onclick=e=>{e.preventDefault();e.stopPropagation();void this.toggle();};
    doc.addEventListener?.('fullscreenchange',this.changed);
    doc.addEventListener?.('webkitfullscreenchange',this.changed);
    this.refresh();
  }
  active(){return Boolean(this.doc.fullscreenElement||this.doc.webkitFullscreenElement);}
  refresh(){
    const active=this.active();this.button.textContent=active?'退出全螢幕':'全螢幕';
    this.button.setAttribute?.('aria-pressed',String(active));
    this.button.setAttribute?.('aria-label',active?'退出全螢幕':'進入全螢幕');
    this.button.disabled=Boolean(this.pending);
  }
  message(text){
    clearTimeout(this.messageTimer);this.status.textContent=text;this.status.hidden=false;
    this.messageTimer=setTimeout(()=>{this.status.hidden=true;},4500);
  }
  async toggle(){
    if(this.pending)return;
    const exiting=this.active(),target=this.doc.documentElement;
    const action=exiting?(this.doc.exitFullscreen||this.doc.webkitExitFullscreen):(target?.requestFullscreen||target?.webkitRequestFullscreen);
    if(typeof action!=='function'){this.message('此瀏覽器不支援全螢幕，仍可繼續遊玩。');return;}
    this.pending=true;this.refresh();
    try{
      // Call immediately inside the click's user gesture; never defer permission.
      await action.call(exiting?this.doc:target);
      if(this.active()===exiting)this.message('瀏覽器尚未切換全螢幕，請使用瀏覽器選單或重試。');
    }catch{
      this.message(exiting?'無法退出全螢幕，請使用瀏覽器的退出操作。':'無法啟用全螢幕，請使用瀏覽器選單或繼續一般畫面遊玩。');
    }finally{this.pending=false;this.changed();}
  }
  dispose(){
    clearTimeout(this.messageTimer);
    this.doc.removeEventListener?.('fullscreenchange',this.changed);
    this.doc.removeEventListener?.('webkitfullscreenchange',this.changed);
    this.button.onclick=null;
  }
}
