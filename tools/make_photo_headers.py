import sys; sys.argv=['x','/dev/null/']
exec(open('headers.py').read().split("if __name__ == '__main__':")[0])
from PIL import ImageEnhance
import numpy as np
def photo_header(out, photo, word, tagline, focus=(0.5,0.5), shift=0.32, grade=1.0):
    ph = Image.open(photo).convert('RGB')
    pw = int(W*(1-shift)+260)
    ph = ImageOps.fit(ph, (pw, H), Image.LANCZOS, centering=focus)
    ph = ImageEnhance.Contrast(ph).enhance(1.08); ph = ImageEnhance.Brightness(ph).enhance(grade)
    img = Image.new('RGB', (W, H), NAVY); img.paste(ph, (W-pw, 0))
    x = np.linspace(0, 1, W)
    a = np.clip((x - (shift-0.10)) / 0.42, 0, 1) ** 1.6   # photo visibility left->right
    yy = np.linspace(0, 1, H)[:, None]
    b = np.clip((yy - 0.62) / 0.38, 0, 1)                 # bottom fade to card colour
    alpha = (a[None, :] * (1 - b * 0.9) * 255).astype('uint8')
    base = Image.new('RGB', (W, H), NAVY)
    # tint the base toward navy2 at the bottom
    base = Image.composite(Image.new('RGB', (W, H), NAVY2), base, Image.fromarray((np.repeat(b, W, 1) * 255).astype('uint8')))
    img = Image.composite(img, base, Image.fromarray(alpha)).convert('RGBA')
    sh = Image.new('RGBA', (W, H), (0,0,0,0)); sd = ImageDraw.Draw(sh)
    sd.rectangle([0, 130, 760, 500], fill=(13,27,51,120)); sh = sh.filter(ImageFilter.GaussianBlur(80)); img.alpha_composite(sh)
    d = ImageDraw.Draw(img)
    f = anton(150)
    lines = word.split('\n')
    y = 205 if len(lines) == 1 else 120
    w = 0
    for ln in lines:
        d.text((60, y), ln, font=f, fill=(255,255,255), anchor='lt')
        bb = d.textbbox((60, y), ln, font=f, anchor='lt'); w = max(w, bb[2]); y = bb[3] + 14
    brush(img, 70, w - 10, y + 12)
    d = ImageDraw.Draw(img)
    d.text((62, y + 48), tagline, font=mont(800, 38), fill=(255,255,255), anchor='lt')
    img.convert('RGB').save(out, quality=90)
from PIL import ImageOps
photo_header('hdr/plan.jpg', 'cand/hdr_plan.jpg', 'YOUR PLAN', 'Food you like. Nothing you don’t need.', focus=(0.7,0.5), grade=0.9, shift=0.40)
photo_header('hdr/progress.jpg', 'cand/hdr_progress.jpg', 'PROGRESS', 'Proof, not guesses.', focus=(0.5,0.45), grade=1.05, shift=0.38)
photo_header('hdr/plan_b.jpg', 'cand/hdr_plan_b.jpg', 'YOUR PLAN', 'Food you like. Nothing you don’t need.')
photo_header('hdr/progress_b.jpg', 'cand/hdr_progress_b.jpg', 'PROGRESS', 'Proof, not guesses.', focus=(0.5,0.4))
s=Image.new('RGB',(1200,1100),(255,255,255))
for i,f in enumerate(['plan','progress','plan_b','progress_b']):
    s.paste(Image.open('hdr/'+f+'.jpg').resize((595,268)),((i%2)*605,(i//2)*280))
s.save('ph_sheet.jpg')
