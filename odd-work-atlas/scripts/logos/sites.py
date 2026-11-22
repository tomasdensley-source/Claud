import json, re, time, urllib.request, urllib.parse, os, ssl, sys
dom = json.load(open('domains.json'))
def slug(s): return re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',s.lower()))
H={'User-Agent':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36','Accept-Language':'en-US'}
def get(u, n=3_000_000):
    r = urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=20)
    return r.geturl(), r.read(n), r.headers.get('content-type','')
res = json.load(open('sites.json')) if os.path.exists('sites.json') else {}
for name, d in dom.items():
    gid = slug(name)
    if gid in res and res[gid].get('file'): continue
    out = {'name':name,'domain':d}
    try:
        final, body, _ = get('https://'+d)
        html = body.decode('utf8','ignore')
        out['final'] = final
        t = re.search(r'<title[^>]*>([^<]*)</title>', html, re.I|re.S); out['title'] = (t.group(1).strip()[:90] if t else '')
        cands = []
        for m in re.finditer(r'<link[^>]+>', html, re.I):
            tag = m.group(0)
            rel = re.search(r'rel=["\']([^"\']+)', tag, re.I); href = re.search(r'href=["\']([^"\']+)', tag, re.I)
            if not rel or not href or 'icon' not in rel.group(1).lower(): continue
            sz = re.search(r'sizes=["\'](\d+)', tag); s = int(sz.group(1)) if sz else (180 if 'apple' in rel.group(1).lower() else 32)
            if href.group(1).endswith('.svg'): s = 512
            cands.append((s, urllib.parse.urljoin(final, href.group(1).replace('&amp;','&'))))
        og = re.search(r'<meta[^>]+property=["\']og:logo["\'][^>]+content=["\']([^"\']+)', html, re.I)
        cands.sort(reverse=True)
        cands.append((60, urllib.parse.urljoin(final, '/apple-touch-icon.png')))
        for s,u in cands:
            try:
                _, data, ct = get(u)
                if len(data) < 100 or b'<html' in data[:300].lower(): continue
                ext = 'svg' if (u.split('?')[0].endswith('.svg') or 'svg' in ct) else 'img'
                fn = f'raw/{gid}.{ext}'; open(fn,'wb').write(data)
                out.update(file=fn, icon=u, size=s); break
            except Exception as e: pass
    except Exception as e:
        out['error'] = str(e)[:120]
    if not out.get('file'):
        try:
            _, data, ct = get(f'https://icons.duckduckgo.com/ip3/{d}.ico')
            if len(data) > 200:
                fn=f'raw/{gid}.img'; open(fn,'wb').write(data); out.update(file=fn, icon='ddg', size=32)
        except Exception as e: out['ddg_error']=str(e)[:80]
    res[gid] = out
    print(('OK ' if out.get('file') else 'NO ')+name+' | '+d+' | '+out.get('title',out.get('error',''))+' | '+str(out.get('size','')), flush=True)
    json.dump(res, open('sites.json','w'), indent=1)
    time.sleep(0.3)
