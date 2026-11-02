"""Runs in GitHub Actions. Finds candidate product photos for Stack Check items with no image.
Sources: Open Food Facts (supplements, open license), Openverse (commercial-use CC), Wikimedia Commons."""
import json, os, urllib.request, urllib.parse
UA = {'User-Agent': 'SixPackStack/1.0 (photo finder; contact bfay@boonfay-pt.com)'}
os.makedirs('pcand', exist_ok=True)
log = open('pcand/log.txt', 'w')
def get(url, hdr=None):
    return urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **(hdr or {})}), timeout=40).read()
def save(name, url, credit=''):
    try:
        open('pcand/' + name, 'wb').write(get(url)); log.write(f'{name}\t{url}\t{credit}\n')
    except Exception as e:
        log.write(f'FAIL {name}\t{url}\t{e}\n')
Q = json.load(open('tools/product_queries.json'))
for k, q in Q.items():
    n = 0
    if q.get('off'):
        try:
            d = json.loads(get('https://world.openfoodfacts.org/cgi/search.pl?json=1&page_size=12&search_simple=1&search_terms=' + urllib.parse.quote(q['off'])))
            for p in d.get('products', []):
                u = p.get('image_front_url')
                if u and n < 4:
                    save(f'{k}_f{n}.jpg', u, 'OpenFoodFacts ' + p.get('code', '')); n += 1
        except Exception as e: log.write(f'FAIL off {k} {e}\n')
    try:
        d = json.loads(get('https://api.openverse.org/v1/images/?page_size=8&license_type=commercial&size=large&q=' + urllib.parse.quote(q['q']), {'Accept': 'application/json'}))
        for r in d.get('results', [])[:4]:
            save(f'{k}_o{n}.jpg', r['url'], f'{r.get("creator")} {r.get("license")} {r.get("foreign_landing_url")}'); n += 1
    except Exception as e: log.write(f'FAIL openverse {k} {e}\n')
    try:
        d = json.loads(get('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&iiurlwidth=900&gsrsearch=' + urllib.parse.quote(q['q'] + ' filetype:bitmap')))
        for pg in list(d.get('query', {}).get('pages', {}).values())[:3]:
            ii = pg['imageinfo'][0]; save(f'{k}_w{n}.jpg', ii.get('thumburl') or ii['url'], ii['descriptionurl']); n += 1
    except Exception as e: log.write(f'FAIL commons {k} {e}\n')
log.close()
