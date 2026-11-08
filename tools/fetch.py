import json, os, time, urllib.request, urllib.parse
Q = json.load(open('tools/queries.json'))
os.makedirs('out', exist_ok=True)
H = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15', 'Accept': 'application/json'}
meta = {}
def get(url, accept=None):
    h = dict(H)
    if accept: h['Accept'] = accept
    return urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=40).read()
for key, spec in Q.items():
    q, n = spec['q'], spec.get('n', 4)
    orient = spec.get('o', 'landscape')
    try:
        j = json.loads(get('https://unsplash.com/napi/search/photos?' + urllib.parse.urlencode({'query': q, 'per_page': 30, 'orientation': orient})))
    except Exception as e:
        meta[key] = {'error': str(e)}; continue
    picks = [r for r in j.get('results', []) if not r.get('premium') and not r.get('plus') and not r.get('sponsorship')][:n]
    meta[key] = []
    for i, r in enumerate(picks):
        w, h = (1200, 900) if orient == 'landscape' else (900, 1200)
        url = r['urls']['raw'] + '&' + urllib.parse.urlencode({'w': w, 'h': h, 'fit': 'crop', 'q': 80, 'fm': 'jpg', 'crop': 'entropy'})
        try:
            open(f'out/{key}__{i}.jpg', 'wb').write(get(url, 'image/*'))
            meta[key].append({'i': i, 'id': r['id'], 'user': (r.get('user') or {}).get('name'), 'alt': r.get('alt_description'), 'desc': r.get('description')})
        except Exception as e:
            meta[key].append({'i': i, 'error': str(e)})
        time.sleep(0.3)
    time.sleep(0.5)
json.dump(meta, open('out/meta.json', 'w'), indent=1)
print(json.dumps({k: len(v) if isinstance(v, list) else v for k, v in meta.items()}))
