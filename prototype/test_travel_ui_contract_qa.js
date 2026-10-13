import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('./src/ui/UIManager.js',import.meta.url),'utf8');
for(const cls of ['floor-arrow','floor-digit']){
 assert(new RegExp('class="[^"]*\\b'+cls+'\\b[^"]*"').test(html),`Travel UI missing .${cls}`);
 assert(ui.includes(`querySelector('.${cls}')`));
}
assert(html.includes('總床數：32｜病房：401–408｜408A–D 各一床'));
assert(ui.includes('19:30 前往 408C，評估敲牆聲是否可能為幻聽／知覺異常'));
assert(!ui.includes('18:00 完成 401–408 晚間巡房'));
assert(!ui.includes('18:00 完成 401–409 晚間巡房'));
assert(html.includes('位於電梯旁、病房大門外側'));
assert(!html.includes('位於護理站右側走廊'));
console.log('TRAVEL UI CONTRACT PASS: direction and floor elements exist; HIS location follows approved plan');
