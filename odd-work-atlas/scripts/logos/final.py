import json, re, os, subprocess, io, hashlib, glob
from PIL import Image
seed = json.load(open('/home/user/Claud/odd-work-atlas/src/data/seed.json'))
names = [r['name'] for r in seed] + ['CDS (Club Demonstration Services)']
play = json.load(open('play.json')); sites = json.load(open('sites.json')); pw = json.load(open('pw.json'))
PLACEHOLDER = {'b8a0bf372c762e966cc99ede8682bc71','ab1fb25b83d4b333ea661a84bd298b2e'}
# Wrong or unverified company matches: never show these.
DROP = {'Avail','HyreCar','Home Improvement Solutions (Appointment Setter)','Rocky Mountain Laboratories','Movement Logistics','Compensated Sperm Donor',
        'Reborn Doll Artist','Film & TV Background Work','Infinity Roofing & Siding','Red Wagon','Superior Home Improvement','KidCar','BioTransit Logistics',
        'H&S Loss Control Inspections','Syex'}
def slug(s): return re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',s.lower()))
def load(fn):
    if fn.endswith('.svg'):
        png = subprocess.run(['node','-e',f'require("/home/user/Claud/odd-work-atlas/node_modules/sharp")("{fn}",{{density:600}}).resize(256,256,{{fit:"contain",background:{{r:0,g:0,b:0,alpha:0}}}}).png().toBuffer().then(b=>process.stdout.write(b))'],capture_output=True,timeout=60).stdout
        return Image.open(io.BytesIO(png))
    im = Image.open(fn)
    if im.format == 'ICO':
        sizes = im.info.get('sizes')
        if sizes: im.size = max(sizes)
        im.load()
    return im
def ok(fn):
    return fn and os.path.exists(fn) and os.path.getsize(fn) > 100 and hashlib.md5(open(fn,'rb').read()).hexdigest() not in PLACEHOLDER
def square(im):
    im = im.convert('RGBA'); bbox = im.getbbox()
    if bbox: im = im.crop(bbox)
    return im
os.makedirs('out', exist_ok=True)
for f in glob.glob('out/*'): os.remove(f)
manifest, missing = {}, []
for name in names:
    gid = slug(name)
    if name in DROP and not play.get(gid,{}).get('file'): missing.append(name); continue
    chosen = None
    if gid == 'time-etc':  # white mark: show it on a dark tile
        im = square(load('raw/time-etc.svg')); sc = 104/max(im.size)
        im = im.resize((round(im.size[0]*sc), round(im.size[1]*sc)), Image.LANCZOS)
        o = Image.new('RGBA',(160,160),(31,42,68,255)); o.alpha_composite(im, ((160-im.size[0])//2,(160-im.size[1])//2))
        o.convert('RGB').save(f'out/{gid}.webp','WEBP',quality=90,method=6); manifest[gid]='site'; continue
    if gid == 'onlineverdict':  # the gavel mark from the site's logo
        chosen = ('site', Image.open('raw/onlineverdict.pw_logo.png').convert('RGBA').crop((0,0,40,40)))
    if gid in ('shopkick','takelessons') and b'<svg' in open(f'raw/{gid}.wiki.svg','rb').read(3000):
        chosen = ('site', load(f'raw/{gid}.wiki.svg').convert('RGBA'))
    if gid == 'icon-clinical-research':
        chosen = ('site', Image.open('raw/icon-clinical-research.pw_logo.png').convert('RGBA'))
    p = play.get(gid)
    if not chosen and p and ok(p.get('file')): chosen = ('app', load(p['file']).convert('RGBA'))
    if not chosen:
        cands = []
        s = sites.get(gid, {})
        files = ([s['file']] if s.get('file') else []) + pw.get(gid, {}).get('files', [])
        for fn in files:
            if not ok(fn): continue
            try: im = load(fn)
            except Exception: continue
            w = 999 if fn.endswith('.svg') else im.size[0]
            cands.append((w, 'icon', im))
        shot = pw.get(gid, {}).get('logoShot')
        if ok(shot):
            im = square(Image.open(shot)); ar = im.size[0] / max(1, im.size[1])
            if ar <= 2.6: cands.append((im.size[0] if ar < 1.6 else 60, 'shot', im))
        cands.sort(key=lambda c: c[0], reverse=True)
        if cands and cands[0][0] >= 32: chosen = ('site', cands[0][2].convert('RGBA'))
    if not chosen: missing.append(name); continue
    kind, im = chosen
    if kind == 'app':
        out = im.resize((160, 160), Image.LANCZOS).convert('RGB')
    else:
        im = square(im); side = max(im.size); sc = 116 / side
        im = im.resize((max(1, round(im.size[0]*sc)), max(1, round(im.size[1]*sc))), Image.LANCZOS)
        out = Image.new('RGBA', (160, 160), (255, 255, 255, 255)); out.alpha_composite(im, ((160-im.size[0])//2, (160-im.size[1])//2)); out = out.convert('RGB')
    out.save(f'out/{gid}.webp', 'WEBP', quality=90, method=6)
    manifest[gid] = kind
json.dump(manifest, open('manifest.json', 'w'), indent=1, sort_keys=True)
open('missing.txt','w').write('\n'.join(missing))
print('logos', len(manifest), 'missing', len(missing)); print(', '.join(missing))
