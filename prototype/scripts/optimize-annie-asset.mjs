// Build-time only. Official glTF-Transform/meshoptimizer installed with
// --offline --ignore-scripts in an isolated tool directory, never game deps.
// node scripts/optimize-annie-asset.mjs ../.visual-work/annie-tools
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));
const tool=resolve(process.argv[2]??root+'/../.visual-work/annie-tools');
const {NodeIO}=await import(pathToFileURL(tool+'/node_modules/@gltf-transform/core/dist/index.js'));
const {weld,simplifyPrimitive,prune}=await import(pathToFileURL(tool+'/node_modules/@gltf-transform/functions/dist/index.js'));
const {MeshoptSimplifier}=await import(pathToFileURL(tool+'/node_modules/meshoptimizer/index.js'));
await MeshoptSimplifier.ready;
const path=root+'/public/assets/characters/annie/annie-trainer.glb',io=new NodeIO();
const doc=await io.read(path);await doc.transform(weld());
const before={};
for(const mesh of doc.getRoot().listMeshes()){
  for(const primitive of mesh.listPrimitives()){
    before[mesh.getName()]=primitive.getIndices().getCount()/3;
    // Preserve face/finger topology. Only cloth, wig, and footwear simplify.
    if(mesh.getName()==='Annie_LabCoat')simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio:.46,error:.0015,lockBorder:true});
    if(mesh.getName()==='Annie_Shoes')simplifyPrimitive(primitive,{simplifier:MeshoptSimplifier,ratio:.55,error:.001,lockBorder:true});
  }
}
await doc.transform(prune());
// NodeIO writes embedded image bufferViews: one self-contained portable GLB.
await io.write(path,doc);
const manifest=JSON.parse(await readFile(root+'/public/assets/characters/annie/manifest.json','utf8'));
manifest.meshes=doc.getRoot().listMeshes().map(m=>({name:m.getName(),vertices:m.listPrimitives().reduce((n,p)=>n+p.getAttribute('POSITION').getCount(),0),triangles:m.listPrimitives().reduce((n,p)=>n+p.getIndices().getCount()/3,0)}));
manifest.triangles=manifest.meshes.reduce((n,m)=>n+m.triangles,0);manifest.glbBytes=(await stat(path)).size;
manifest.glbSHA256=createHash('sha256').update(await readFile(path)).digest('hex');
manifest.optimization={method:'meshoptimizer via glTF Transform 4.5.0; cloth/footwear only; borders locked; anatomy untouched',before,embeddedTextures:true};
await writeFile(root+'/public/assets/characters/annie/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('ANNIE_OPTIMIZED',manifest.glbBytes,manifest.triangles,manifest.meshes);
