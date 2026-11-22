import json, re, subprocess, os, urllib.parse, io
from PIL import Image
res = json.load(open('sites.json'))
def slug(s): return re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',s.lower()))
def best_dim(fn):
    try:
        if fn.endswith('.svg'): return 999
        im = Image.open(fn)
        if im.format == 'ICO': return max(s[0] for s in im.info.get('sizes',[im.size]))
        return im.size[0]
    except Exception: return 0
def curl(u, out=None):
    args=['curl','-sL','-m','25','-A','Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile','-w','%{url_effective}']
    if out: args+=['-o',out]
    r=subprocess.run(args+[u],capture_output=True); return r.stdout
# Alternative domains for retries (official sites or parent brands).
ALT = {"Amazon Associates":["amazon.com"],"Amazon Kindle Direct Publishing (KDP)":["amazon.com"],"Amazon Mechanical Turk":["mturk.com","amazon.com"],"Merch by Amazon":["amazon.com"],
"Adobe Stock":["adobe.com"],"123Notary":["123notary.com"],"ezCater Relay":["ezcater.com"],"Prolific":["prolific.com","prolific.co"],"Jitjatjo":["jitjatjo.com"],"Taggr":["taggr.com","www.taggr.com"],
"OnlineVerdict":["onlineverdict.com"],"SigningOrder":["signingorder.com"],"USPack":["uspack.com"],"Drizly":["drizly.com"],"TakeLessons":["takelessons.com"],"Stickr":["stickr.co"],
"Bite Squad / Waitr":["waitrapp.com","bitesquad.com"],"Fancy Hands":["fancyhands.com"],"Society6":["society6.com"],"PeoplePerHour":["peopleperhour.com"],"ICON Clinical Research":["iconplc.com"],
"Point Pickup":["pointpickup.com"],"Tapestri":["tapestri.io"],"Humanatic":["humanatic.com"],"Free Car Media":["freecarmedia.com"],"FocusGroup.com":["focusgroup.com"],"Hyagen Medical":["hyagen.com"],
"Bunny Studio":["bunnystudio.com"],"Dolly":["dolly.com"],"Merch":[], "Shopkick":["shopkick.com"],"Syex":["syex.com"],"HealthRun":["healthrun.com"],"RubiRides":["rubirides.com"],"KidCar":["kidcar.com","kidcarnyc.com"],
"We Pay You Junk Estate Removal":["wepayyoujunk.com"],"Infinity Roofing & Siding":["infinityroofing.com","infinityroofingutah.com"],"JD Roofing":["jdroofing.com","jdroofingutah.com"],
"Red Wagon":["redwagonmoving.com"],"BioTransit Logistics":["biotransit.com"],"Superior Home Improvement":["superiorhomeimprovement.com"],"Tapestri ":[]}
DONE=set(open('done.txt').read().split('\n'))
for name, doms in ALT.items():
    if name in DONE: continue
    gid=slug(name); r=res.get(gid,{'name':name})
    if best_dim(r.get('file','')) >= 64: continue
    best=(best_dim(r.get('file','')), r.get('file'), r.get('icon'))
    for d in doms:
        html=curl('https://'+d).decode('utf8','ignore')
        final = html[-300:].split('\n')[-1] if html else 'https://'+d
        m = re.search(r'(https?://[^\s"<>]+)$', html); base = m.group(1) if m else 'https://'+d
        if '[' in base: base = 'https://'+d
        cands=[]
        for t in re.findall(r'<link[^>]+>', html, re.I):
            rel=re.search(r'rel=["\']([^"\']+)',t,re.I); href=re.search(r'href=["\']([^"\']+)',t,re.I)
            if rel and href and 'icon' in rel.group(1).lower() and '[' not in href.group(1): cands.append(urllib.parse.urljoin(base, href.group(1).replace('&amp;','&')))
        cands += [urllib.parse.urljoin(base,'/apple-touch-icon.png'), f'https://www.google.com/s2/favicons?domain={d}&sz=256', f'https://icons.duckduckgo.com/ip3/{d}.ico']
        for i,u in enumerate(cands):
            ext='.svg' if u.split('?')[0].endswith('.svg') else '.img'
            fn=f'raw/{gid}.p2_{d}_{i}{ext}'; curl(u, fn)
            if not os.path.exists(fn) or os.path.getsize(fn)<100: continue
            with open(fn,'rb') as f: head=f.read(300).lower()
            if b'<html' in head or b'<!doctype' in head: continue
            dim=best_dim(fn)
            if dim>best[0]: best=(dim,fn,u)
    r.update(file=best[1], icon=best[2], size=best[0]); res[gid]=r
    print(name, best[0], best[2])
json.dump(res, open('sites.json','w'), indent=1)
