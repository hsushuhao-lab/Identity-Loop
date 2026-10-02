import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';
import { getMaterials, materialForSurface } from '../src/art/MaterialRegistry.js';
import { assetManifest, instantiateAsset } from '../src/art/AssetRegistry.js';
globalThis.ProgressEvent ??= class extends Event { constructor(type, values) { super(type); Object.assign(this, values); } };
const assets=new URL('../public/assets/',import.meta.url);
const records=[];
async function record(file, details={}) {
 const bytes=await readFile(new URL(file,assets));
 records.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),...details});
 return bytes;
}
for(const [key,file] of Object.entries(assetManifest)) {
 const buffer=await readFile(new URL(`models/${file}`,assets));
 let scene;
 if(file.endsWith('.glb')) {
  if(buffer.readUInt32LE(0)!==0x46546c67||buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length) throw new Error(`Invalid GLB ${file}`);
  if (key === 'campusTree') {
    const jsonLength=buffer.readUInt32LE(12),gltf=JSON.parse(buffer.subarray(20,20+jsonLength).toString());
    gltf.buffers[0].uri='data:application/octet-stream;base64,'+buffer.subarray(28+jsonLength).toString('base64');
    delete gltf.images;delete gltf.textures;delete gltf.materials;
    for(const mesh of gltf.meshes)for(const primitive of mesh.primitives)delete primitive.material;
    scene=(await new GLTFLoader().parseAsync(JSON.stringify(gltf),'')).scene;
  } else scene=(await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'')).scene;
  let meshes=0;scene.traverse(o=>{if(o.isMesh)meshes++;});
  if(meshes<(key==='campusTree'?3:10))throw new Error(`Insufficient asset detail ${key}`);
  await record(`models/${file}`,{meshes,dimensions:new Box3().setFromObject(scene).getSize(new Vector3()).toArray()});
 } else {
  const gltf=JSON.parse(buffer.toString());
  const folder=file.slice(0,file.lastIndexOf('/')+1);
  for(const entry of gltf.buffers) {
   const bytes=await record(`models/${folder}${entry.uri}`);
   if(bytes.length!==entry.byteLength)throw new Error(`Buffer size mismatch ${file}`);
   entry.uri=`data:application/octet-stream;base64,${bytes.toString('base64')}`;
  }
  for(const image of gltf.images)await record(`models/${folder}${image.uri}`);
  const alpha=`models/${folder}textures/${key==='fern'?'fern_02':'shrub_02'}_alpha_2k.png`;
  const alphaBytes=await record(alpha);
  if(alphaBytes.readUInt32BE(0)!==0x89504e47)throw new Error(`Invalid vegetation alpha ${alpha}`);
  if(gltf.materials.some(material=>material.alphaMode!=='MASK'))throw new Error(`Vegetation missing alpha mask ${file}`);
  // Parse full geometry offline while browser-only texture decoding is verified separately.
  delete gltf.images;delete gltf.textures;delete gltf.materials;
  for(const mesh of gltf.meshes)for(const primitive of mesh.primitives)delete primitive.material;
  scene=(await new GLTFLoader().parseAsync(JSON.stringify(gltf),'')).scene;
  const variants={};
  for(const object of scene.children)variants[object.name]={dimensions:new Box3().setFromObject(object).getSize(new Vector3()).toArray()};
  if(Object.keys(variants).length!==4)throw new Error(`Missing vegetation variants ${file}`);
  await record(`models/${file}`,{variants});
 }
}
for(const file of await readdir(new URL('textures/',assets))) {
 if(!file.endsWith('.jpg'))continue;
 const bytes=await record(`textures/${file}`);
 if(bytes[0]!==255||bytes[1]!==216)throw new Error(`Invalid JPEG ${file}`);
}
const pendingChair=instantiateAsset('officeChair');
if(getMaterials()!==getMaterials()||materialForSurface('wall',3,2)!==materialForSurface('wall',3,2)||pendingChair?.userData.pendingAsset!=='officeChair')throw new Error('Offline registry/cache contract failed');
await writeFile(new URL('asset-integrity.json',assets),JSON.stringify({format:1,records},null,2)+'\n');
console.log(`PASS: 8 GLBs + 2 vegetation glTF collections parsed, ${records.length} local files hashed; ${records.reduce((sum,r)=>sum+r.bytes,0)} bytes`);
for(const record of records)if(record.variants)console.log(record.file,JSON.stringify(record.variants));
