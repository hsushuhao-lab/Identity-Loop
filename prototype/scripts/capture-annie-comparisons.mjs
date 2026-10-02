import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const out=resolve(process.argv[2]);
const browser=await chromium.launch({headless:true});
try{
 for(const view of ['seated','face']){
  const html=`<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#17201d;color:#e9ede5;font:18px sans-serif}h1{font-size:24px;padding:18px;margin:0}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px}figure{margin:0}img{width:100%;display:block}figcaption{padding:12px}footer{padding:12px;font-size:14px;color:#c7d0c8}</style><h1>Identity Loop · Annie GLB ${view} · identical camera / time / practical lights</h1><main><figure><figcaption>Before · released procedural trainer</figcaption><img src="game-${view}-before.png"></figure><figure><figcaption>After · continuous 53-bone GLB art fixture</figcaption><img src="game-${view}-after.png"></figure></main><footer>Adult CPR teaching mannequin · unchanged encounter/narrative/light settings · original full-frame PNGs · independent 5F art fixture at source commit da033ab. Production integration and CPR bed alignment are separately verified. Browser emulation; physical-phone FPS pending.</footer>`;
  const file=resolve(out,`annie-${view}-comparison.html`);await writeFile(file,html);
  const page=await browser.newPage({viewport:{width:2236,height:1020}});await page.goto(pathToFileURL(file).href);await page.locator('img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));await page.screenshot({path:resolve(out,`annie-${view}-comparison.png`),fullPage:true});await page.close();
 }
}finally{await browser.close();}
