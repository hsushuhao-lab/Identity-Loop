export function isIdentityRouteMode(){
  return typeof window!=='undefined'&&new URLSearchParams(window.location.search).get('mode')!=='linear';
}

export function anonymousNarrative(text){
  return String(text)
    .replace(/[\u4e00-\u9fff]○+/g,'姓名隱去')
    .replace(/張守恆|李承禮|周啟文|陳柏勳|林婉真|王世榮|謝[\u4e00-\u9fff]{2}|劉志遠|陳怡君/g,'身分待核')
    .replace(/張\s*守\s*\[墨漬\]|守恆|張○○|李○○|[張李周陳林王謝劉許江方蔡葉郭鄭](?=(?:住院|主治|總)?醫師|護理督導|護理師)/g,'未辨識')
    .replace(/MED-\d{2,6}/g,'MED-••••••');
}

export function worldNarrative(text){return isIdentityRouteMode()?anonymousNarrative(text):text;}
