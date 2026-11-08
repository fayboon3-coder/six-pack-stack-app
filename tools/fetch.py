# Candidates from Openverse (api.openverse.org), the open API for openly licensed images.
# Only CC0 / public domain (free for commercial use, no credit needed). Resized to 1200x900.
import json, os, time, io, urllib.request, urllib.parse
from PIL import Image, ImageOps
Q = json.load(open('tools/queries.json'))
os.makedirs('out', exist_ok=True)
UA = {'User-Agent': 'SixPackStackApp/1.0 (image curation; github.com/fayboon3-coder)'}
meta = {}
def get(url, accept='application/json'):
    return urllib.request.urlopen(urllib.request.Request(url, headers={**UA, 'Accept': accept}), timeout=60).read()
for key, spec in Q.items():
    n = spec.get('n', 5)
    params = {'q': spec['q'], 'license': 'cc0,pdm', 'page_size': 20, 'mature': 'false', 'size': 'large'}
    if spec.get('src'): params['source'] = spec['src']
    j = None
    for attempt in range(5):
        try:
            j = json.loads(get('https://api.openverse.org/v1/images/?' + urllib.parse.urlencode(params))); break
        except Exception as e:
            err = str(e)
            time.sleep(20 * (attempt + 1) if '429' in err else 5)
    if j is None:
        meta[key] = {'error': err}; continue
    res = [r for r in j.get('results', []) if (r.get('width') or 0) >= 900 and (r.get('height') or 0) >= 600]
    meta[key] = []
    for r in res:
        if len([m for m in meta[key] if 'file' in m]) >= n: break
        try:
            raw = get(r['url'], 'image/*')
            im = Image.open(io.BytesIO(raw)).convert('RGB')
            if im.width < 900 or im.height < 600: continue
            im = ImageOps.fit(im, (1200, 900), Image.LANCZOS, centering=(0.5, 0.5))
            i = len(meta[key])
            fn = f'out/{key}__{i}.jpg'
            im.save(fn, quality=84, optimize=True, progressive=True)
            meta[key].append({'file': fn, 'id': r['id'], 'title': (r.get('title') or '')[:80], 'creator': r.get('creator'), 'license': r.get('license'),
                              'source': r.get('source'), 'landing': r.get('foreign_landing_url')})
        except Exception as e:
            continue
    time.sleep(7)
json.dump(meta, open('out/meta.json', 'w'), indent=1)
print(json.dumps({k: (len(v) if isinstance(v, list) else v) for k, v in meta.items()}))
