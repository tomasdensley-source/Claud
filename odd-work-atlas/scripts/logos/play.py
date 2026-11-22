import json, re, time, urllib.request, sys, os
seed = json.load(open('/home/user/Claud/odd-work-atlas/src/data/seed.json'))
def slug(s): return re.sub(r'^-|-$','',re.sub(r'[^a-z0-9]+','-',s.lower()))
res = {}
if os.path.exists('play.json'): res = json.load(open('play.json'))
for r in seed:
    if not r['appUrl']: continue
    gid = slug(r['name'])
    if gid in res and res[gid].get('file'): continue
    url = r['appUrl'] + ('&' if '?' in r['appUrl'] else '?') + 'hl=en_US&gl=US'
    for attempt in range(4):
        try:
            html = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0','Accept-Language':'en-US'}), timeout=30).read().decode('utf8','ignore')
            m = re.search(r'<meta property="og:image" content="([^"]+)"', html)
            t = re.search(r'<title[^>]*>([^<]+)</title>', html)
            if not m: res[gid] = {'name': r['name'], 'error': 'no og:image'}; break
            img = re.sub(r'=[swh]\d+.*$','',m.group(1)) + '=s256'
            data = urllib.request.urlopen(urllib.request.Request(img, headers={'User-Agent':'Mozilla/5.0'}), timeout=30).read()
            fn = f'raw/{gid}.img'; open(fn,'wb').write(data)
            res[gid] = {'name': r['name'], 'file': fn, 'src': 'play', 'title': t.group(1) if t else ''}
            break
        except Exception as e:
            res[gid] = {'name': r['name'], 'error': str(e)}
            time.sleep(5*(attempt+1))
    json.dump(res, open('play.json','w'), indent=1)
    time.sleep(1.2)
ok = sum(1 for v in res.values() if v.get('file')); print('ok', ok, 'of', len(res))
for k,v in res.items():
    if not v.get('file'): print('FAIL', v['name'], v.get('error'))
