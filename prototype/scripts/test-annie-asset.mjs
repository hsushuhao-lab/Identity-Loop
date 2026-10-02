import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base=new URL('../public/assets/characters/annie/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('manifest.json',base),'utf8'));
const data=await readFile(new URL('annie-trainer.glb',base));
assert.equal(data.readUInt32LE(0),0x46546c67);assert.equal(data.readUInt32LE(4),2);assert.equal(data.readUInt32LE(8),data.length);
const jsonSize=data.readUInt32LE(12),doc=JSON.parse(data.subarray(20,20+jsonSize).toString());
const binary=data.subarray(20+jsonSize+8);
function values(i){const a=doc.accessors[i],v=doc.bufferViews[a.bufferView],n={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16}[a.type],b={5126:4,5123:2,5125:4}[a.componentType],out=[];
 for(let j=0;j<a.count*n;j++){const p=v.byteOffset+(a.byteOffset??0)+Math.floor(j/n)*(v.byteStride??n*b)+(j%n)*b;out.push(a.componentType===5126?binary.readFloatLE(p):a.componentType===5123?binary.readUInt16LE(p):binary.readUInt32LE(p));}return out;}
let triangles=0;
for(const m of doc.meshes)for(const p of m.primitives){
 const position=values(p.attributes.POSITION),normals=values(p.attributes.NORMAL),weights=values(p.attributes.WEIGHTS_0),joints=values(p.attributes.JOINTS_0),indices=values(p.indices);
 assert(position.every(Number.isFinite));assert(normals.every(Number.isFinite));assert(weights.every(w=>Number.isFinite(w)&&w>=0&&w<=1.000001));
 for(let i=0;i<weights.length;i+=4)assert(Math.abs(weights.slice(i,i+4).reduce((a,b)=>a+b)-1)<.0001);
 assert(joints.every(j=>j>=0&&j<53));assert(indices.every(i=>i<position.length/3));triangles+=indices.length/3;
}
assert.equal(doc.meshes.length,8);assert.equal(doc.skins[0].joints.length,53);assert.equal(triangles,manifest.triangles);assert(triangles<=34000);
assert(doc.nodes.some(n=>n.name==='Annie_Cuff_1'));assert(doc.nodes.some(n=>n.name==='Annie_Cuff_-1'));
assert(data.length<1800000);assert.equal(data.length,manifest.glbBytes);assert.equal(createHash('sha256').update(data).digest('hex'),manifest.glbSHA256);
assert.equal(doc.images.length,10);assert(doc.images.every(i=>Number.isInteger(i.bufferView)&&!i.uri),'all PBR images embedded; single request');
assert(!doc.extensionsRequired?.length,'no new runtime decoder');assert(doc.animations.some(a=>a.name==='TrainerHeadTurn'));
assert.equal(doc.nodes[0].extras.characterId,'ANNIE_CPR_TRAINING_MANNEQUIN');
assert.equal(doc.nodes[0].extras.nominalHeightMeters,1.65);
assert(doc.materials.every(m=>m.pbrMetallicRoughness?.metallicFactor===0));
assert(doc.materials.some(m=>m.name==='Annie_Vinyl'&&m.normalTexture&&m.pbrMetallicRoughness.metallicRoughnessTexture));
for(const t of manifest.textures)assert.equal(createHash('sha256').update(await readFile(new URL(t.name,base))).digest('hex'),t.sha256);
assert((await readFile(new URL('LICENSE-CC0.txt',base),'utf8')).includes('CC0'));
assert((await readFile(new URL('PROVENANCE.md',base),'utf8')).includes('Margaret Toigo'));
console.log('PASS Annie asset: valid core embedded GLB, finite indexed geometry, normalized 53-bone weights, preserved anatomy, budget, PBR, clip, hashes and licenses',triangles,data.length);
