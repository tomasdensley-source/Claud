import json, re, subprocess, os, urllib.parse, hashlib
from PIL import Image
PLACEHOLDER = {'b8a0bf372c762e966cc99ede8682bc71','ab1fb25b83d4b333ea661a84bd298b2e'}
sites = json.load(open('sites.json'))
def slug(s): return re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',s.lower()))
def dim(fn):
    if fn.endswith('.svg'): return 999
    try:
        im=Image.open(fn)
        if im.format=='ICO': return max(s[0] for s in im.info.get('sizes',[im.size]))
        return im.size[0]
    except Exception: return 0
def curl(u, out=None):
    a=['curl','-sL','-m','25','--compressed','-A','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36','-H','Accept-Language: en-US']
    if out: a+=['-o',out,'-w','%{http_code}']
    return subprocess.run(a+[u],capture_output=True).stdout
TARGETS = {
 "123Notary":["123notary.com"],"Adobe Stock":["stock.adobe.com","adobe.com"],"Amazon Associates":["www.amazon.com"],"Amazon Kindle Direct Publishing (KDP)":["kdp.amazon.com","www.amazon.com"],
 "Amazon Mechanical Turk":["www.mturk.com","www.amazon.com"],"Merch by Amazon":["merch.amazon.com","www.amazon.com"],"Bite Squad / Waitr":["waitrapp.com","www.waitrapp.com"],"Confero":["conferoinc.com"],
 "Drizly":["drizly.com"],"FocusGroup.com":["www.focusgroup.com"],"Free Car Media":["freecarmedia.com"],"H&S Loss Control Inspections":["hslosscontrol.com","hsinspections.com"],"HealthRun":["healthrun.com"],
 "Humanatic":["www.humanatic.com"],"Jitjatjo":["jitjatjo.com","www.jitjatjo.com"],"OnlineVerdict":["www.onlineverdict.com"],"Point Pickup":["pointpickup.com","www.pointpickup.com"],"Stickr":["stickr.co","www.stickr.co"],
 "Taggr":["www.taggr.com","taggr.co","gotaggr.com"],"TakeLessons":["takelessons.com"],"Tapestri":["tapestri.io","www.tapestri.io"],"USPack":["uspack.com","www.uspack.com"],"SFS":["sfsmerchandising.com"],
 "CDS (Club Demonstration Services)":["www.cdsusa.com","cdsusa.com"],"Three Brothers LLC":["threebrothersllc.com"],"Ridge To Ridge Delivery & Courier Service":["ridgetoridgecourier.com"],
 "Fancy Hands":["www.fancyhands.com"],"Society6":["society6.com"],"ICON Clinical Research":["www.iconplc.com"],"PeoplePerHour":["www.peopleperhour.com"],"Prolific":["www.prolific.com"],"ezCater Relay":["www.ezcater.com"],
 "Bunny Studio":["bunnystudio.com"],"Dolly":["dolly.com"],"Merch":[],"Shopkick":["www.shopkick.com"],"RubiRides":["rubirides.com"],"We Pay You Junk Estate Removal":["wepayyoujunk.com"],"JD Roofing":["jdroofing.com"],
 "SigningOrder":["signingorder.com"],"Syex":["syex.com"],"Sittercity":["www.sittercity.com"],"Skillz":["www.skillz.com"],"We Geek Together Crew":["wegeektogether.com"],"Hyagen Medical":["hyagen.com"],"Avail ":[],
}
for name, doms in TARGETS.items():
    if not doms: continue
    gid=slug(name); r=sites.get(gid,{'name':name})
    cur=r.get('file') if not r.get('dropped') else None
    best=(dim(cur) if cur and os.path.exists(cur) else 0, cur, r.get('icon'))
    if cur and os.path.exists(cur) and hashlib.md5(open(cur,'rb').read()).hexdigest() in PLACEHOLDER: best=(0,None,None)
    if name=='JD Roofing': best=(0,None,None)  # first match was the wrong domain
    for d in doms:
        html=curl('https://'+d).decode('utf8','ignore')
        cands=[]
        for t in re.findall(r'<link[^>]+>', html, re.I):
            rel=re.search(r'rel=["\']([^"\']+)',t,re.I); href=re.search(r'href=["\']([^"\']+)',t,re.I)
            if rel and href and 'icon' in rel.group(1).lower() and '[' not in href.group(1):
                try: cands.append(urllib.parse.urljoin('https://'+d+'/', href.group(1).replace('&amp;','&')))
                except ValueError: pass
        cands += ['https://'+d+'/apple-touch-icon.png','https://'+d+'/apple-touch-icon-precomposed.png','https://'+d+'/favicon.ico',
                  f'https://www.google.com/s2/favicons?domain={d}&sz=256', f'https://icons.duckduckgo.com/ip3/{d}.ico']
        for i,u in enumerate(cands):
            ext='.svg' if u.split('?')[0].endswith('.svg') else '.img'
            fn=f'raw/{gid}.p3_{i}_{d}{ext}'
            code=curl(u,fn).decode()
            if code!='200' or not os.path.exists(fn) or os.path.getsize(fn)<100: continue
            data=open(fn,'rb').read()
            if hashlib.md5(data).hexdigest() in PLACEHOLDER or b'<html' in data[:400].lower() or b'<!doctype' in data[:400].lower(): continue
            if ext=='.svg' and b'<svg' not in data[:2000].lower(): continue
            dm=dim(fn)
            if dm>best[0]: best=(dm,fn,u)
    r.update(file=best[1], icon=best[2], size=best[0]); r.pop('dropped',None) if name!='Avail' else None
    if not best[1]: r.pop('file',None)
    sites[gid]=r; json.dump(sites, open('sites.json','w'), indent=1)
    print(name, best[0], best[2], flush=True)
