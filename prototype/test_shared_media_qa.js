import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {SHARED_PHOTOS,FLOOR_PHOTO_KEYS,LEGACY_MEDIA,mediaPresentation,photoSequence,sharedAlbum,sharedPosterCommentary} from './src/story/SharedMedia.js';
import {MEMORY_SEQUENCES} from './src/story/NarrativeV22.js';
import {IDENTITY_M6_MEMORIES} from './src/story/IdentityM6Memories.js';
import {containRect,photoRect} from './src/art/SharedMediaArt.js';
import {ERA_POSTERS} from './src/art/PosterRegistry.js';
const forbidden=/張守恆|李承禮|周啟文|陳柏勳|林婉真|王世榮|謝玉琴|劉志遠|守恆|[張李周陳]醫師|(?:MED|NUR|SEC|ENG|ADM)-\d|LI_CHENG_LI|真線索|體制性誤導|THE ORDER|THE WARNING/;
const visible=s=>[s.title,s.source,...s.frames.flatMap(f=>[f.stamp,f.title,f.caption,f.narration])].join('\n');
const before=JSON.stringify(MEMORY_SEQUENCES);
for(const identity of ['LI','ZHOU','ZHANG','CHEN']){
 for(const sequence of Object.values(MEMORY_SEQUENCES)){
  const presentation=mediaPresentation(sequence,identity);
  assert.equal(presentation.frames.length,sequence.frames.length,'retain automatic playback length');
  if(LEGACY_MEDIA[sequence.id])assert.equal(new Set(presentation.frames.map(f=>f.photo)).size,presentation.frames.length,'no repeated padding pages within a shared album');
  assert.doesNotMatch(visible(presentation),forbidden,`${identity}/${sequence.id}`);
  assert.ok(presentation.frames.every(f=>SHARED_PHOTOS[f.photo]));
  assert.ok(presentation.frames.every(f=>!f.people?.length));
 }
 const reactions=[];
 for(const [key,p] of Object.entries(SHARED_PHOTOS)){
  assert.ok(existsSync('./public/'+p.path),`${key} existing photographic source`);
  assert.equal(new Set(Object.values(p.readings)).size,4,`${key}: four genuinely different reactions`);
  const s=photoSequence(key,identity);assert.doesNotMatch(visible(s),forbidden);reactions.push(s.frames[0].narration);
 }
 assert.equal(new Set(reactions).size,Object.keys(SHARED_PHOTOS).length,'each photograph gets its own observation');
 for(const poster of Object.values(ERA_POSTERS))assert.doesNotMatch(sharedPosterCommentary(poster,identity),forbidden);
 assert.equal(sharedAlbum('SECOND_GUARD_PHOTO_ALBUM',identity).frames.length,3);
 assert.ok(sharedAlbum('ARCHIVE_HISTORY_PHOTO_WALL',identity).frames.every(f=>f.photo));
}
assert.equal(JSON.stringify(MEMORY_SEQUENCES),before,'do not rewrite canonical legacy data');
for(const sequence of Object.values(IDENTITY_M6_MEMORIES)){
 const presented=mediaPresentation(sequence,'LI');
 assert.equal(presented.frames.length,6);assert.doesNotMatch(visible(presented),forbidden);
 assert.ok(presented.frames.every(f=>SHARED_PHOTOS[f.photo]));
}
for(const key of FLOOR_PHOTO_KEYS){const r=photoRect({width:1536,height:1024},key);assert.ok(Math.abs(r[2]/r[3]-.75)<1e-12);const d=containRect(r[2],r[3],0,0,1236,656);assert.ok(Math.abs(d[2]/d[3]-.75)<1e-12);}
const landscape=containRect(1536,1024,0,0,600,800);assert.equal(landscape[2]/landscape[3],1.5);
const ui=readFileSync('./src/ui/UIManager.js','utf8'),main=readFileSync('./src/main.js','utf8'),art=readFileSync('./src/art/SharedMediaArt.js','utf8');
assert.match(ui,/if\(this\.memoryPresentation\)\{renderSharedMemory/);
assert.match(ui,/院內公告／版本與適用範圍待核/);
assert.match(ui,/const restricted=!!context&&personnel&&!rosterReady/);
assert.match(main,/interactable\.type === 'identity_photo'/);
assert.match(main,/const required=identityManager\.currentIdentity==='ZHANG'&&identityManager\.currentRouteStep/);
assert.match(main,/if\(identityLoopMode\)\{\s*controller\.enabled=false;uiManager\.openMemorySequence\(sequence\);return;/);
assert.match(art,/if\(loaded\)ui\.memoryVisited/);
assert.doesNotMatch(art,/drawCharacterStrip|memoryArtIndex/);
console.log('PASS shared media: legacy privacy, 40 photograph-specific reactions, twelve image albums, actual photographic sources, exact aspect ratios, late roster boundary and passive exploration');

assert.doesNotMatch(readFileSync('./src/story/IdentityRouteScenes.js','utf8'),/張 Seed/,'CG objective must not label its hidden seed');

const ward=readFileSync('./src/world/shared/WardFloorplan.js','utf8');
assert.match(ward,/if\(photographic\)\{[\s\S]*drawSharedPhoto\(ctx,key/);
assert.match(ward,/photo\.rotation\.y=Math\.PI/);
assert.match(ward,/type:'identity_photo',photoKey:key/);
assert.match(main,/const key=interactable\.photoKey\|\|/);
