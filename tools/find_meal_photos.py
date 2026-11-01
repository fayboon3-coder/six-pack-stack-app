"""Runs in GitHub Actions. Finds candidate meal photos and saves them to cand/ for review."""
import json, os, re, urllib.request, urllib.parse
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9'}
os.makedirs('cand', exist_ok=True)
log = open('cand/log.txt', 'w')
def get(url, hdr=None):
    r = urllib.request.Request(url, headers={**UA, **(hdr or {})})
    return urllib.request.urlopen(r, timeout=40).read()
def save(name, url):
    try:
        open('cand/' + name, 'wb').write(get(url)); log.write(f'{name}\t{url}\n')
    except Exception as e:
        log.write(f'FAIL {name}\t{url}\t{e}\n')

if not os.environ.get('ONLY_URLS'):
    # Starbucks menu API
    try:
        menu = json.loads(get('https://www.starbucks.com/bff/ordering/menu', {'Accept': 'application/json'}))
        found = []
        def walk(o):
            if isinstance(o, dict):
                if 'name' in o and isinstance(o.get('assets'), dict):
                    found.append(o)
                for v in o.values(): walk(v)
            elif isinstance(o, list):
                for v in o: walk(v)
        walk(menu)
        for p in found:
            n = p['name']
            if re.search(r'egg bites|caff[eè] latte$|^cold brew', n, re.I):
                uri = (p['assets'].get('masterImage') or {}).get('uri') or (p['assets'].get('fullSize') or {}).get('uri')
                if uri:
                    save('sbx_' + re.sub(r'\W+', '_', n.lower())[:40] + '.jpg', uri)
    except Exception as e:
        log.write(f'FAIL starbucks menu {e}\n')

    # Chipotle: scrape image urls from pages
    for page in ['https://www.chipotle.com/order/build/burrito-bowl', 'https://www.chipotle.com/', 'https://www.chipotle.com/menu']:
        try:
            html = get(page).decode('utf-8', 'ignore')
            urls = sorted(set(re.findall(r'https://[^"\'\s>]+?\.(?:jpg|jpeg|png|webp)', html)))
            log.write(f'PAGE {page} {len(urls)}\n')
            for i, u in enumerate([u for u in urls if re.search(r'bowl|burrito|chicken|menu|meal', u, re.I)][:12]):
                log.write(f'  {u}\n'); save(f'cmg_{i}.' + u.rsplit('.', 1)[1][:4], u)
        except Exception as e:
            log.write(f'FAIL {page} {e}\n')

# Food photography search (Unsplash), top 4 each
Q = {
 'eggs_toast': 'scrambled eggs toast breakfast plate', 'yogurt_bowl': 'greek yogurt bowl berries oats',
 'teriyaki_bowl': 'chicken teriyaki rice bowl', 'turkey_sandwich': 'turkey sandwich deli',
 'protein_shake': 'protein shake banana', 'yogurt_berries': 'yogurt berries cup', 'jerky': 'beef jerky',
 'steak_potatoes': 'steak potatoes dinner plate', 'salmon_rice': 'salmon rice broccoli', 'chicken_rice': 'grilled chicken rice vegetables',
 'pizza': 'thin crust pizza slice', 'burger_salad': 'burger side salad', 'beer': 'light beer glass bar', 'oats': 'oatmeal bowl',
 'burrito_bowl': 'chicken burrito bowl', 'latte': 'latte coffee cup', 'salad_chicken': 'chicken salad bowl',
}
import sys
extra = json.load(open('tools/meal_urls.json')) if os.path.exists('tools/meal_urls.json') else {}
for name, url in extra.items():
    save(name, url)
for k, q in ({} if os.environ.get('ONLY_URLS') else Q).items():
    n = 0
    try:  # Openverse (CC-licensed photos, mostly Flickr)
        d = json.loads(get('https://api.openverse.org/v1/images/?page_size=8&license_type=commercial&aspect_ratio=wide&size=large&q=' + urllib.parse.quote(q), {'Accept': 'application/json'}))
        for r in d.get('results', [])[:5]:
            save(f'{k}_o{n}.jpg', r['url']); log.write(f'  credit {k}_o{n}: {r.get("creator")} {r.get("license")} {r.get("foreign_landing_url")}\n'); n += 1
    except Exception as e:
        log.write(f'FAIL openverse {k} {e}\n')
    try:  # Wikimedia Commons
        d = json.loads(get('https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&gsrsearch=' + urllib.parse.quote(q + ' filetype:bitmap')))
        for pg in list(d.get('query', {}).get('pages', {}).values())[:4]:
            ii = pg['imageinfo'][0]
            save(f'{k}_w{n}.jpg', ii.get('thumburl') or ii['url']); log.write(f'  credit {k}_w{n}: {ii["descriptionurl"]}\n'); n += 1
    except Exception as e:
        log.write(f'FAIL commons {k} {e}\n')
log.close()
