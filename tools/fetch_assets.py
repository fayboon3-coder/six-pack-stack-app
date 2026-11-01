"""Download product photos listed in tools/sources.json and cut out their backgrounds.
Runs in GitHub Actions (which has internet). Output: assets/img/<name>.png (transparent)."""
import json, io, os, urllib.request
from PIL import Image
from rembg import remove

src = json.load(open('tools/sources.json'))
os.makedirs('assets/img', exist_ok=True)
for name, url in src.items():
    if not url.startswith('http'):
        continue
    out = 'assets/img/' + name.replace('_src', '').rsplit('.', 1)[0] + '.png'
    if os.path.exists(out):
        continue
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    data = urllib.request.urlopen(req, timeout=60).read()
    im = Image.open(io.BytesIO(data)).convert('RGBA')
    cut = remove(im)
    cut = cut.crop(cut.getbbox())
    h = 480
    cut = cut.resize((max(1, int(cut.width * h / cut.height)), h), Image.LANCZOS)
    cut.save(out, optimize=True)
    print('saved', out, cut.size)
