import json, re, subprocess, os
dom = json.load(open('domains.json')); res = json.load(open('sites.json'))
DROP = {'Avail','HyreCar','Home Improvement Solutions (Appointment Setter)','Rocky Mountain Laboratories','Movement Logistics','Compensated Sperm Donor','Reborn Doll Artist','Film & TV Background Work'}
def slug(s): return re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',s.lower()))
def dims(fn):
    try:
        out = subprocess.run(['node','-e',f'require("/home/user/Claud/odd-work-atlas/node_modules/sharp")("{fn}").metadata().then(m=>console.log(m.width))'],capture_output=True,text=True,timeout=30).stdout.strip()
        return int(out)
    except: return 0
for name,d in dom.items():
    gid=slug(name); r=res.get(gid,{})
    if name in DROP:
        r['dropped']=True; res[gid]=r; continue
    have = r.get('file') and (r.get('size',0)>=120 or r['file'].endswith('.svg'))
    if have: continue
    fn=f'raw/{gid}.s2.png'
    subprocess.run(['curl','-sL','-m','20','-o',fn,f'https://www.google.com/s2/favicons?domain={d}&sz=256'])
    w = dims(fn) if os.path.exists(fn) else 0
    cur = dims(r['file']) if r.get('file') and not r['file'].endswith('.svg') else 0
    if w > cur and w >= 32:
        r.update(file=fn, icon='google-s2', size=w)
    print(name, 'site', cur, 's2', w)
    res[gid]=r
json.dump(res, open('sites.json','w'), indent=1)
