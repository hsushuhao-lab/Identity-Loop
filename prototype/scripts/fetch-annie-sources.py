"""Fetch verified, licensed DATA ONLY for the optional Annie GLB conversion.
Downloads two official CC0 asset ZIPs (~307 MB build input, not game traffic).
Does not install/import/run upstream software. Uses Python standard library.
python scripts/fetch-annie-sources.py ../.visual-work/annie-source
"""
from pathlib import Path
from urllib.request import urlopen,Request
import sys,json,hashlib,zipfile
ROOT=Path(__file__).resolve().parents[1]
DEST=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT.parent/'.visual-work/annie-source'
MANIFEST=json.loads((ROOT/'public/assets/characters/annie/manifest.json').read_text())
REV=MANIFEST['sourceRevision']
DEST.mkdir(parents=True,exist_ok=True)
hashes={x['path']:x['sha256'] for x in MANIFEST['sourceFiles']}
def get(url,path,expected=None):
    if path.exists() and (not expected or hashlib.sha256(path.read_bytes()).hexdigest()==expected):return
    print('DATA',url,flush=True)
    with urlopen(Request(url,headers={'User-Agent':'IdentityLoop-asset-data-fetch'}),timeout=180) as response:
        data=response.read()
    if expected and hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Source hash mismatch: '+url)
    path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
files={
 'base.obj':'src/mpfb/data/3dobjs/base.obj',
 'rig.game_engine.json':'src/mpfb/data/rigs/standard/rig.game_engine.json',
 'weights.game_engine.json':'src/mpfb/data/rigs/standard/weights.game_engine.json',
 'LICENSE.ASSETS.md':'LICENSE.ASSETS.md',
 'asian-female-young.target.gz':'src/mpfb/data/targets/macrodetails/asian-female-young.target.gz',
 'caucasian-female-young.target.gz':'src/mpfb/data/targets/macrodetails/caucasian-female-young.target.gz'}
for local,remote in files.items():get('https://raw.githubusercontent.com/makehumancommunity/mpfb2/'+REV+'/'+remote,DEST/local,hashes.get(local))
(DEST/'mpfb-tree.json').write_text(json.dumps({'sha':REV}))
archives=[('system-assets.zip','makehuman_system_assets/makehuman_system_assets_cc0.zip','system',['hair/short02/','clothes/female_casualsuit01/','clothes/shoes01/','eyes/low-poly/','eyes/materials/grey','skins/middleage_asian_female/']),('suits01.zip','suits01/suits01_cc0.zip','suits',['clothes/toigo_female_suit/'])]
for local,remote,folder,prefixes in archives:
    get('https://files2.makehumancommunity.org/asset_packs/'+remote,DEST/local,hashes[local])
    root=(DEST/folder).resolve()
    with zipfile.ZipFile(DEST/local) as z:
        for name in z.namelist():
            if name.endswith('/') or not any(name.startswith(p) for p in prefixes):continue
            path=(root/name).resolve()
            if root not in path.parents:raise ValueError('Unsafe archive path')
            data=z.read(name);relative=folder+'/'+name
            if relative in hashes and hashlib.sha256(data).hexdigest()!=hashes[relative]:raise ValueError('Hash mismatch '+relative)
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
print('PASS licensed source data fetched, no upstream code executed')
