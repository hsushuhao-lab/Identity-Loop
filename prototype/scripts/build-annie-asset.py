"""Convert pinned CC0 MakeHuman DATA (never import/execute upstream code) to GLB.

Usage: python scripts/build-annie-asset.py ../../.visual-work/annie-source
Python dependencies: already available numpy, Pillow. Sources/provenance described
in public/assets/characters/annie/PROVENANCE.md. No runtime dependencies added.
"""
from pathlib import Path
import sys, json, gzip, struct, hashlib, io
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SOURCE=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parent/'.visual-work/annie-source'
OUT=ROOT/'public/assets/characters/annie'
OUT.mkdir(parents=True,exist_ok=True)

def obj(path):
    v=[];uv=[];faces=[];groups={};group=''
    for s in path.read_text().splitlines():
        p=s.split()
        if not p: continue
        if p[0]=='v':v.append(list(map(float,p[1:4])))
        elif p[0]=='vt':uv.append(list(map(float,p[1:3])))
        elif p[0]=='g':group=p[1]
        elif p[0]=='f':
            f=[tuple(int(i)-1 for i in x.split('/')[:2]) for x in p[1:]]
            faces.append((group,f));groups.setdefault(group,set()).update(a[0] for a in f)
    return np.array(v),np.array(uv),faces,groups

base,baseuv,basefaces,groups=obj(SOURCE/'base.obj')
delta=np.zeros_like(base)
# Generic adult proportions, not a scan of or likeness reference to a real person.
for target,gain in [('asian-female-young.target.gz',.65),('caucasian-female-young.target.gz',.35)]:
    for s in gzip.decompress((SOURCE/target).read_bytes()).decode().splitlines():
        p=s.split()
        if len(p)==4 and p[0].isdigit():delta[int(p[0])]+=np.array(list(map(float,p[1:]))) * gain
shaped=base+delta
bodyIds=np.unique([a[0] for g,f in basefaces if g=='body' for a in f])
floor=shaped[bodyIds,1].min();top=shaped[bodyIds,1].max();scale=1.65/(top-floor)
def world(v):
    v=v.copy();v[:,1]-=floor;return v*scale
rig=json.loads((SOURCE/'rig.game_engine.json').read_text())
names=list(rig);nb=len(names);bone_index={n:i for i,n in enumerate(names)}
def anchor(data):
    ids=data.get('vertex_indices')
    if not ids:ids=sorted(groups[data['cube_name']])
    return world(shaped[ids]).mean(axis=0)
heads=np.array([anchor(rig[n]['head']) for n in names])
tails=np.array([anchor(rig[n]['tail']) for n in names])
rawweights=json.loads((SOURCE/'weights.game_engine.json').read_text())['weights']
weight=np.zeros((len(base),nb),dtype=np.float64)
for n,ws in rawweights.items():
    for i,w in ws:weight[i,bone_index[n]]=w
weight/=np.maximum(weight.sum(axis=1,keepdims=True),1e-12)

def fitted(path,clo):
    v,uv,faces,gr=obj(path); refs=[];active=False;axisScale=np.ones(3)
    for s in clo.read_text().splitlines():
        p=s.split()
        if not p:continue
        if p[0].endswith('_scale') and p[0][0] in 'xyz':
            axis='xyz'.index(p[0][0]);axisScale[axis]=abs(shaped[int(p[1]),axis]-shaped[int(p[2]),axis])/float(p[3])
        if p[0].startswith('shear_'):
            axis='xyz'.index(p[0][-1]);axisScale[axis]=(shaped[int(p[1]),axis]-shaped[int(p[2]),axis])/(float(p[3])-float(p[4]))
        if p[0]=='verts':active=True;continue
        if active:
            try:nums=list(map(float,p))
            except ValueError:break
            if len(nums)==1:refs.append(([int(nums[0])],[1.],[0,0,0]));continue
            if len(nums)==9:refs.append(([int(n) for n in nums[:3]],nums[3:6],nums[6:9]));continue
            break
    assert len(refs)==len(v),(path,len(v),len(refs))
    # MHCL0 stores barycentric attachment + per-axis scaled offset. OBJ is a
    # reference shape, not the final fitted shape; never add deltas to that OBJ.
    for i,(ids,gains,offset) in enumerate(refs):v[i]=np.sum(shaped[ids]*np.array(gains)[:,None],axis=0)+np.array(offset)*axisScale
    v=world(v)
    # Transfer weights to clothes from nearest anatomy, not helper geometry.
    # Four nearest weighted body vertices; normalized inverse-distance transfer.
    weights=[];body=world(shaped[bodyIds])
    for chunk in np.array_split(v,max(1,len(v)//128)):
        d=((chunk[:,None,:]-body[None,:,:])**2).sum(axis=2)
        ids=np.argpartition(d,3,axis=1)[:,:4]
        w=1/np.maximum(np.take_along_axis(d,ids,axis=1),1e-7)
        w/=w.sum(axis=1,keepdims=True)
        weights.append(np.sum(weight[bodyIds[ids]]*w[:,:,None],axis=1))
    return v,uv,faces,np.concatenate(weights)

def image_bytes(im,name,fmt='PNG',quality=87):
    b=io.BytesIO();im.save(b,format=fmt,quality=quality,optimize=True)
    (OUT/name).write_bytes(b.getvalue());return name

# Source skin detail is retained as subdued molded vinyl, with no blood, facial
# makeup, names, logos or new narrative cues. UV layout remains official hm08.
skinPath=SOURCE/'system/skins/middleage_asian_female/middleage_lightskinned_female_diffuse2.png'
skin=Image.open(skinPath).convert('RGB').resize((1024,1024),Image.Resampling.LANCZOS)
pixels=np.asarray(skin).astype(float);grey=pixels@np.array([.299,.587,.114])
rgb=np.array([198.,197.,186.])[None,None,:]+(grey[:,:,None]-165)*.40
rgb=np.clip(rgb,0,255).astype('uint8');skin=Image.fromarray(rgb)
image_bytes(skin,'vinyl-base.jpg','JPEG')
# PBR normal/roughness preserve subtle molded microtexture, not flesh SSS.
height=np.asarray(Image.open(skinPath).convert('L').resize((512,512))).astype(float)/255
dy,dx=np.gradient(height);normal=np.dstack((-dx*1.6,-dy*1.6,np.ones_like(dx)))
normal/=np.linalg.norm(normal,axis=2,keepdims=True)
image_bytes(Image.fromarray(((normal*.5+.5)*255).astype('uint8')),'vinyl-normal.png')
rough=np.clip(.60+(height-.5)*.16,.52,.73)
image_bytes(Image.fromarray(np.dstack((np.ones_like(rough)*255,rough*255,np.zeros_like(rough))).astype('uint8')).resize((256,256),Image.Resampling.LANCZOS),'vinyl-orm.jpg','JPEG')

# Short wig uses alpha-test hair cards + PBR normal; one draw, no transparency sort.
hairRoot=SOURCE/'system/hair/short02';h=Image.open(hairRoot/'short02_diffuse.png').convert('RGBA').resize((512,512),Image.Resampling.LANCZOS)
a=np.asarray(h).copy();a[:,:,:3]=(a[:,:,:3].astype(float)*np.array([.45,.46,.47])).astype('uint8')
image_bytes(Image.fromarray(a),'wig-base.png')
image_bytes(Image.open(hairRoot/'short02_normal.png').convert('RGB').resize((256,256),Image.Resampling.LANCZOS),'wig-normal.jpg','JPEG')
image_bytes(Image.open(SOURCE/'system/eyes/materials/grey_eye.png').convert('RGB').resize((256,256),Image.Resampling.LANCZOS),'eyes-base.jpg','JPEG')

# Tailored CC0 jacket is adapted to an unbranded lab coat; continuous collar,
# lapels, sleeves and seam topology. Offline cloth folds belong to the asset.
coatRoot=SOURCE/'suits/clothes/toigo_female_suit'
cv,cuv,cf,cw=fitted(coatRoot/'fem_suit.obj',coatRoot/'toigo_female_suit.mhclo')
pelvisY=heads[bone_index['pelvis'],1]
# Remove the source skirt as one whole connected component; clipping by a Y
# threshold would create torn floating strips when the thighs rotate to seated.
from collections import defaultdict
adj=defaultdict(set)
for g,f in cf:
    ids=[a[0] for a in f]
    for i in ids:adj[i].update(ids)
visited=set();keep=set()
for i in adj:
    if i in visited:continue
    todo=[i];visited.add(i);component=[]
    while todo:
        j=todo.pop();component.append(j)
        for k in adj[j]:
            if k not in visited:visited.add(k);todo.append(k)
    if len(component)>350 and cv[component,1].max()>pelvisY+.25:keep.update(component)
cf=[(g,f) for g,f in cf if f[0][0] in keep]
# Extend only the bottom jacket panels, preserving collar and shoulders.
bottom=cv[:,1]<pelvisY+.045
cv[bottom,1]-=np.clip((pelvisY+.045-cv[bottom,1])*1.12,0,.17)
used=set(a[0] for g,f in cf for a in f)
for i in used:
    p=cv[i];torso=abs(p[0])<.21 and pelvisY-.30<p[1]<pelvisY+.37
    if torso:
        p[2]+=np.sin(p[0]*73+p[1]*6)*.0025+np.sin(p[1]*51+p[0]*4)*.0018
        # Give the elongated coat room over the looser scrub waistband. This
        # prevents the back/side trouser surface piercing it in the CPR lean.
        fit=np.clip((pelvisY+.17-p[1])/.24,0,1)
        p[0]*=1+.11*fit;p[2]*=1+.24*fit
# Recolor source weave/bump to ivory; retain seam and fold detail without stripes.
bump=Image.open(coatRoot/'MHSuitsFem-bump.png').convert('L').resize((1024,1024),Image.Resampling.LANCZOS)
bm=np.asarray(bump).astype(float)/255
coatRGB=np.clip(np.array([219,219,207])[None,None,:]+(bm[:,:,None]-.55)*42,0,255).astype('uint8')
image_bytes(Image.fromarray(coatRGB).resize((512,512),Image.Resampling.LANCZOS),'coat-base.jpg','JPEG')
dy,dx=np.gradient(np.asarray(bump.resize((512,512))).astype(float)/255)
n=np.dstack((-dx*2,-dy*2,np.ones_like(dx)));n/=np.linalg.norm(n,axis=2,keepdims=True)
image_bytes(Image.fromarray(((n*.5+.5)*255).astype('uint8')),'coat-normal.jpg','JPEG')

scrubRoot=SOURCE/'system/clothes/female_casualsuit01'
sv,suv,sf,sw=fitted(scrubRoot/'female_casualsuit01.obj',scrubRoot/'female_casualsuit01.mhclo')
# Source casual outfit contains both blouse and pants. The blouse would pierce
# the fitted outer sleeve during arm bending, so ship only the covered waist and
# trousers. Labcoat already has a continuous inner shirt/collar.
sf=[(g,f) for g,f in sf if np.mean(sv[[a[0] for a in f],1])<pelvisY+.035]
image_bytes(Image.open(scrubRoot/'female_casualsuit01_normal.png').convert('RGB').resize((256,256),Image.Resampling.LANCZOS),'scrubs-normal.jpg','JPEG')
shoeRoot=SOURCE/'system/clothes/shoes01'
fv,fuv,ff,fw=fitted(shoeRoot/'shoes01.obj',shoeRoot/'shoes01.mhclo')
shoe=Image.open(shoeRoot/'shoes01_diffuse.png').convert('L').resize((256,256),Image.Resampling.LANCZOS)
shoe=np.asarray(shoe).astype(float)*.67
image_bytes(Image.fromarray(np.dstack((shoe*.94,shoe,shoe*.99)).astype('uint8')),'shoes-base.jpg','JPEG')
hv,huv,hf,hw=fitted(hairRoot/'short02.obj',hairRoot/'short02.mhclo')
hw[:]=0;hw[:,bone_index['head']]=1
eyeRoot=SOURCE/'system/eyes/low-poly'
ev,euv,ef,ew=fitted(eyeRoot/'low-poly.obj',eyeRoot/'low-poly.mhclo')
ew[:]=0;ew[:,bone_index['head']]=1

# Build plain glTF 2.0, no Draco/KTX decoder or external runtime extension.
doc={'asset':{'version':'2.0','generator':'IdentityLoop CC0 data converter 1','copyright':'MakeHuman Community CC0; Margaret Toigo CC0; IdentityLoop original adaptations'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'Annie_Asset','children':[]}],'meshes':[],'materials':[],'textures':[],'images':[],'samplers':[{'magFilter':9729,'minFilter':9987,'wrapS':10497,'wrapT':10497}],'bufferViews':[],'accessors':[],'skins':[],'animations':[]}
blob=bytearray()
def buffer(data):
    while len(blob)%4:blob.append(0)
    start=len(blob);blob.extend(data)
    doc['bufferViews'].append({'buffer':0,'byteOffset':start,'byteLength':len(data)})
    return len(doc['bufferViews'])-1
def accessor(array,kind,component=5126,bounds=False):
    array=np.asarray(array,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[component])
    a={'bufferView':buffer(array.tobytes()),'componentType':component,'count':len(array),'type':kind}
    if bounds:a.update(min=array.min(axis=0).tolist(),max=array.max(axis=0).tolist())
    doc['accessors'].append(a);return len(doc['accessors'])-1
def texture(name):
    i=len(doc['images']);doc['images'].append({'uri':name});doc['textures'].append({'sampler':0,'source':i});return {'index':i}
def material(name,color,rough,base=None,normal=None,orm=None,mask=False):
    p={'baseColorFactor':color,'metallicFactor':0,'roughnessFactor':rough}
    if base:p['baseColorTexture']=texture(base)
    if orm:p['metallicRoughnessTexture']=texture(orm);p['roughnessFactor']=1
    m={'name':name,'pbrMetallicRoughness':p,'doubleSided':mask}
    if normal:m['normalTexture']={**texture(normal),'scale':.45 if 'Vinyl' in name else .65}
    if mask:m.update(alphaMode='MASK',alphaCutoff=.48)
    doc['materials'].append(m);return len(doc['materials'])-1
vinyl=material('Annie_Vinyl',[1,1,1,1],.63,'vinyl-base.jpg','vinyl-normal.png','vinyl-orm.jpg')
coat=material('Annie_LabCoat',[1,1,1,1],.88,'coat-base.jpg','coat-normal.jpg')
doc['materials'][coat]['doubleSided']=True
cuff=material('Annie_FadedBlueCuff',[.072,.138,.216,1],.91)
scrubs=material('Annie_Scrubs',[.25,.36,.40,1],.94,normal='scrubs-normal.jpg')
wig=material('Annie_Wig',[1,1,1,1],.87,'wig-base.png','wig-normal.jpg',mask=True)
eyes=material('Annie_MoldedEyes',[.70,.70,.65,1],.43,'eyes-base.jpg')
shoes=material('Annie_Shoes',[.42,.42,.40,1],.8,'shoes-base.jpg')

# Joint translations are in glTF Y-up meters. Local rest orientation is identity;
# parent-relative quaternion channels deform the continuous weighted meshes.
for i,n in enumerate(names):
    p=rig[n]['parent'];pos=heads[i]-(heads[bone_index[p]] if p else np.zeros(3))
    node={'name':'AnnieBone_'+n,'translation':pos.tolist(),'extras':{'restDirection':(tails[i]-heads[i]).tolist(),'sourceBone':n}}
    doc['nodes'].append(node)
for i,n in enumerate(names):
    p=rig[n]['parent'];parent=bone_index[p]+1 if p else 0
    doc['nodes'][parent].setdefault('children',[]).append(i+1)
inverses=[]
for p in heads:
    m=np.eye(4);m[:3,3]=-p;inverses.append(m.T.reshape(-1))
doc['skins'].append({'name':'Annie_53BoneSkin','joints':list(range(1,nb+1)),'skeleton':bone_index['Root']+1,'inverseBindMatrices':accessor(inverses,'MAT4')})

stats=[]
def mesh(name,v,uv,faces,weights,mat):
    # Normal averaging occurs by original topology vertex, then UV seams split.
    normal=np.zeros_like(v);tri=[]
    for g,f in faces:
        for j in range(1,len(f)-1):
            t=[f[0],f[j],f[j+1]];tri.append(t)
            a,b,c=[v[p[0]] for p in t];n=np.cross(b-a,c-a)
            for p in t:normal[p[0]]+=n
    normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-12)
    lookup={};positions=[];normals=[];texcoords=[];joints=[];ws=[];indices=[]
    for t in tri:
        for vi,ui in t:
            key=(vi,ui)
            if key not in lookup:
                lookup[key]=len(positions);positions.append(v[vi]);normals.append(normal[vi]);texcoords.append([uv[ui,0],1-uv[ui,1]])
                w=weights[vi];ids=np.argsort(-w)[:4];wt=np.maximum(w[ids],0);wt/=max(wt.sum(),1e-12)
                if not wt.sum():ids[:]=0;wt[0]=1
                joints.append(ids);ws.append(wt)
            indices.append(lookup[key])
    if not indices:return
    attributes={'POSITION':accessor(positions,'VEC3',bounds=True),'NORMAL':accessor(normals,'VEC3'),'TEXCOORD_0':accessor(texcoords,'VEC2'),'JOINTS_0':accessor(joints,'VEC4',5123),'WEIGHTS_0':accessor(ws,'VEC4')}
    idx=accessor(np.array(indices),'SCALAR',5123 if len(positions)<65536 else 5125)
    doc['meshes'].append({'name':name,'primitives':[{'attributes':attributes,'indices':idx,'material':mat}]})
    doc['nodes'].append({'name':name,'mesh':len(doc['meshes'])-1,'skin':0})
    doc['nodes'][0]['children'].append(len(doc['nodes'])-1)
    stats.append({'name':name,'vertices':len(positions),'triangles':len(indices)//3})

bv=world(shaped)
# Anatomy covered by clothing is removed from the delivery mesh. Natural neck,
# face, ears, wrists, knuckles and individually modeled fingers stay connected.
visible=[]
headY=heads[bone_index['neck_01'],1]-.018
for g,f in basefaces:
    if g!='body':continue
    ids=[a[0] for a in f];p=bv[ids].mean(axis=0)
    handWeight=weight[ids][:,[i for i,n in enumerate(names) if any(k in n for k in ['hand','index','middle','ring','pinky','thumb'])]].sum(axis=1).mean()
    if p[1]>headY or handWeight>.30:visible.append((g,f))
mesh('Annie_VinylAnatomy',bv,baseuv,visible,weight,vinyl)
cuffFaces={'l':[],'r':[]};coatFaces=[]
for g,f in cf:
    center=cv[[a[0] for a in f]].mean(axis=0);found=None
    for side in ['l','r']:
        wrist=heads[bone_index['hand_'+side]]
        if np.linalg.norm(center-wrist)<.075:found=side;break
    if found:cuffFaces[found].append((g,f))
    else:coatFaces.append((g,f))
mesh('Annie_LabCoat',cv,cuv,coatFaces,cw,coat)
mesh('Annie_Cuff_1',cv,cuv,cuffFaces['l'],cw,cuff)
mesh('Annie_Cuff_-1',cv,cuv,cuffFaces['r'],cw,cuff)
mesh('Annie_Scrubs',sv,suv,sf,sw,scrubs)
mesh('Annie_Wig',hv,huv,hf,hw,wig)
mesh('Annie_MoldedEyes',ev,euv,ef,ew,eyes)
mesh('Annie_Shoes',fv,fuv,ff,fw,shoes)

# Bake a neutral standing rig clip and a small authored head turn. Runtime module
# supplies seated/bridge/CPR skeletal poses, no ambient living-person breathing.
time=accessor([[0],[1.0],[2.0]],'SCALAR',bounds=True)
rot=accessor([[0,0,0,1],[0,np.sin(.025),0,np.cos(.025)],[0,0,0,1]],'VEC4')
doc['animations'].append({'name':'TrainerHeadTurn','samplers':[{'input':time,'output':rot,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':bone_index['head']+1,'path':'rotation'}}]})
doc['nodes'][0]['extras']={'characterId':'ANNIE_CPR_TRAINING_MANNEQUIN','nominalHeightMeters':1.65,'source':'MakeHuman CC0 continuous topology','boneCount':nb,'recipeVersion':1}
doc['buffers']=[{'byteLength':len(blob)}]
raw=json.dumps(doc,separators=(',',':')).encode()
raw+=b' '*((-len(raw))%4);blob+=b'\0'*((-len(blob))%4)
glb=struct.pack('<III',0x46546c67,2,12+8+len(raw)+8+len(blob))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(blob),0x004e4942)+blob
(OUT/'annie-trainer.glb').write_bytes(glb)
# UV outlines are exact and referenceable for later ImageGen/handpainting work.
for label,uv,fs in [('vinyl',baseuv,visible),('coat',cuv,cf),('scrubs',suv,sf)]:
    im=Image.new('RGB',(1024,1024),(24,27,30));draw=ImageDraw.Draw(im)
    for g,f in fs:
        pts=[(float(uv[a[1],0]*1023),float((1-uv[a[1],1])*1023)) for a in f];draw.line(pts+[pts[0]],fill=(116,163,164),width=1)
    im.save(OUT/(label+'-uv.png'),optimize=True)
manifest={'version':1,'base':'539eb70','glbBytes':len(glb),'boneCount':nb,'nominalHeightMeters':1.65,'meshes':stats,'triangles':sum(s['triangles'] for s in stats),'textures':[{'name':p.name,'bytes':p.stat().st_size,'size':list(Image.open(p).size),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in OUT.iterdir() if p.suffix in ['.jpg','.png'] and '-uv' not in p.name],'sourceRevision':json.loads((SOURCE/'mpfb-tree.json').read_text(encoding='utf-8-sig'))['sha'],'sourceFiles':[{'path':str(p.relative_to(SOURCE)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(SOURCE.rglob('*')) if p.is_file() and p.suffix in ['.obj','.mhclo','.mhmat','.mhw','.gz','.zip']]+[{'path':'weights.game_engine.json','sha256':hashlib.sha256((SOURCE/'weights.game_engine.json').read_bytes()).hexdigest()},{'path':'rig.game_engine.json','sha256':hashlib.sha256((SOURCE/'rig.game_engine.json').read_bytes()).hexdigest()}]}
manifest['sourceFiles']=[{'path':str(p.relative_to(SOURCE)).replace('\\','/'),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(SOURCE.rglob('*')) if p.is_file() and (p.name in ['base.obj','weights.game_engine.json','rig.game_engine.json','LICENSE.ASSETS.md','asian-female-young.target.gz','caucasian-female-young.target.gz','system-assets.zip','suits01.zip'] or any(str(p.relative_to(SOURCE)).replace('\\','/').startswith(prefix) for prefix in ['system/hair/short02/','system/clothes/female_casualsuit01/','system/clothes/shoes01/','system/eyes/low-poly/','system/eyes/materials/grey','system/skins/middleage_asian_female/','suits/clothes/toigo_female_suit/']))]
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
(OUT/'LICENSE-CC0.txt').write_text((SOURCE/'LICENSE.ASSETS.md').read_text())
print(json.dumps({k:manifest[k] for k in ['glbBytes','boneCount','triangles','meshes']},indent=2))
