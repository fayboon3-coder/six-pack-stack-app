"""Custom header art in the style of Boon's YouTube banner.
Navy glow background, spaced kicker, huge condensed white word, red brush underline,
thin line icons, short tagline. 1200x700, bottom fades into navy2 (#142645)."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, sys

W, H = 1200, 540
NAVY = (13, 27, 51); NAVY2 = (20, 38, 69); RED = (226, 67, 59); LINE = (120, 140, 175)
F = '/home/claude/fonts/'
anton = lambda s: ImageFont.truetype(F + 'Anton.ttf', s)
mont = lambda w, s: ImageFont.truetype(F + f'Montserrat-{w}.ttf', s)
SP = '/tmp/claude-0/-home-claude/c8a69b93-862c-5582-89c9-433fef2a90e0/scratchpad/'


def background(cx=0.5):
    bg = Image.new('RGB', (W, H), NAVY)
    glow = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(glow)
    d.ellipse([W * cx - 520, 20, W * cx + 520, 520], fill=255)
    glow = glow.filter(ImageFilter.GaussianBlur(170))
    bg = Image.composite(Image.new('RGB', (W, H), (34, 58, 100)), bg, glow)
    # faint horizon line like the banner
    d = ImageDraw.Draw(bg)
    d.line([(0, 290), (W, 290)], fill=(30, 50, 84), width=2)
    # bottom fade into navy2 so the card body continues seamlessly
    fade = Image.linear_gradient('L').resize((W, H))
    mask = fade.point(lambda v: 0 if v < 200 else int((v - 200) / 55 * 255))
    bg = Image.composite(Image.new('RGB', (W, H), NAVY2), bg, mask)
    return bg


def spaced(d, xy, text, font, fill, spacing, anchor_center=True):
    widths = [d.textlength(c, font=font) for c in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = xy[0] - total / 2 if anchor_center else xy[0]
    for c, w in zip(text, widths):
        d.text((x, xy[1]), c, font=font, fill=fill)
        x += w + spacing
    return total


def brush(img, x0, x1, y, thick=16):
    """Red brush stroke, slightly curved, tapered ends."""
    layer = Image.new('RGBA', img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    n = 120
    for i in range(n + 1):
        t = i / n
        x = x0 + (x1 - x0) * t
        yy = y - math.sin(t * math.pi) * 10 + t * 4
        r = thick / 2 * (0.55 + 0.45 * math.sin(t * math.pi) ** 0.35)
        d.ellipse([x - r, yy - r, x + r, yy + r], fill=RED + (255,))
    img.alpha_composite(layer)


# ---------- line icons ----------
def ico_pulse(d, x, y, s=1.0):
    pts = [(x, y), (x + 70 * s, y), (x + 85 * s, y - 30 * s), (x + 100 * s, y + 34 * s), (x + 116 * s, y - 50 * s),
           (x + 130 * s, y + 10 * s), (x + 140 * s, y), (x + 230 * s, y)]
    d.line(pts, fill=LINE, width=4, joint='curve')


def ico_search(d, cx, cy):
    d.ellipse([cx - 52, cy - 52, cx + 52, cy + 52], outline=LINE, width=6)
    for i, w in enumerate([52, 40, 46]):
        d.line([(cx - 26, cy - 16 + i * 16), (cx - 26 + w, cy - 16 + i * 16)], fill=LINE, width=5)
    d.line([(cx + 38, cy + 38), (cx + 82, cy + 82)], fill=LINE, width=10)


def ico_dumbbell(d, cx, cy):
    d.line([(cx - 60, cy), (cx + 60, cy)], fill=LINE, width=8)
    for sx in (-1, 1):
        d.rounded_rectangle([cx + sx * 60 - 12, cy - 42, cx + sx * 60 + 12, cy + 42], 6, outline=LINE, width=6)
        d.rounded_rectangle([cx + sx * 86 - 9, cy - 28, cx + sx * 86 + 9, cy + 28], 5, outline=LINE, width=6)


def ico_check(d, cx, cy):
    d.ellipse([cx - 58, cy - 58, cx + 58, cy + 58], outline=LINE, width=6)
    d.line([(cx - 28, cy + 2), (cx - 6, cy + 24), (cx + 30, cy - 22)], fill=LINE, width=9, joint='curve')


def ico_clip(d, cx, cy):
    d.rounded_rectangle([cx - 48, cy - 62, cx + 48, cy + 62], 10, outline=LINE, width=6)
    d.rounded_rectangle([cx - 22, cy - 74, cx + 22, cy - 54], 6, outline=LINE, width=6)
    for i in range(3):
        yy = cy - 20 + i * 28
        d.line([(cx - 28, yy), (cx - 18, yy + 9), (cx - 4, yy - 9)], fill=LINE, width=5)
        d.line([(cx + 6, yy), (cx + 30, yy)], fill=LINE, width=5)


def ico_chart(d, cx, cy):
    d.line([(cx - 70, cy - 60), (cx - 70, cy + 60), (cx + 80, cy + 60)], fill=LINE, width=6)
    d.line([(cx - 52, cy + 30), (cx - 14, cy + 4), (cx + 14, cy + 18), (cx + 62, cy - 40)], fill=LINE, width=7, joint='curve')
    d.polygon([(cx + 70, cy - 50), (cx + 46, cy - 44), (cx + 64, cy - 26)], fill=LINE)


def ico_chat(d, cx, cy):
    d.rounded_rectangle([cx - 68, cy - 50, cx + 68, cy + 34], 22, outline=LINE, width=6)
    d.polygon([(cx - 30, cy + 32), (cx - 46, cy + 64), (cx - 6, cy + 32)], outline=LINE, fill=None)
    d.line([(cx - 30, cy + 34), (cx - 46, cy + 64), (cx - 8, cy + 34)], fill=LINE, width=6)
    for i in (-1, 0, 1):
        d.ellipse([cx + i * 30 - 7, cy - 15, cx + i * 30 + 7, cy - 1], fill=LINE)


ICONS = dict(pulse=ico_pulse, search=ico_search, dumbbell=ico_dumbbell, check=ico_check, clip=ico_clip, chart=ico_chart, chat=ico_chat)


def header(out, kicker, word, tagline, icon, size=190):
    img = background().convert('RGBA')
    d = ImageDraw.Draw(img)
    f = anton(size)
    while d.textlength(word, font=f) > 700:
        size -= 6; f = anton(size)
    tw = d.textlength(word, font=f)
    tf = mont(800, 42)
    b0 = d.textbbox((0, 0), word, font=f, anchor='lt')
    wh = b0[3] - b0[1]
    block = wh + 60 + 44
    top = 165 + (310 - block) / 2          # centre between the badge zone and the fade
    d.text((W / 2, top), word, font=f, fill=(255, 255, 255), anchor='mt')
    bbox = d.textbbox((W / 2, top), word, font=f, anchor='mt')
    mid = (bbox[1] + bbox[3]) / 2
    ico_pulse(d, 30, mid, 0.85)
    ICONS[icon](d, 1085, mid)
    brush(img, W / 2 - tw / 2 + 10, W / 2 + tw / 2 - 10, bbox[3] + 24)
    d = ImageDraw.Draw(img)
    d.text((W / 2, bbox[3] + 60), tagline, font=tf, fill=(255, 255, 255), anchor='mt')
    img.convert('RGB').save(out, quality=90)


def coach(out, kicker, word, tagline):
    """Boon tab: his cutout on the right, text on the left."""
    import numpy as np
    img = background(cx=0.68).convert('RGBA')
    disc = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(disc).ellipse([740, 60, 1160, 480], fill=RED + (255,))
    img.alpha_composite(disc)
    cut = Image.open(SP + 'boon_cut.png').convert('RGBA')
    cut = cut.crop(cut.getbbox())
    s = 480 / cut.height; cut = cut.resize((int(cut.width * s), 480), Image.LANCZOS)
    g = Image.linear_gradient('L').resize(cut.size).point(lambda v: 255 if v < 170 else max(0, 255 - (v - 170) * 3))
    cut.putalpha(Image.fromarray(np.minimum(np.array(cut.getchannel('A')), np.array(g))))
    img.alpha_composite(cut, (950 - cut.width // 2, 50))
    d = ImageDraw.Draw(img)
    f = anton(150)
    top = 190
    d.text((60, top), word, font=f, fill=(255, 255, 255), anchor='lt')
    bb = d.textbbox((60, top), word, font=f, anchor='lt')
    brush(img, 70, bb[2] - 10, bb[3] + 24)
    d = ImageDraw.Draw(img)
    d.text((62, bb[3] + 60), tagline, font=mont(800, 40), fill=(255, 255, 255), anchor='lt')
    img.convert('RGB').save(out, quality=90)


if __name__ == '__main__':
    o = sys.argv[1] if len(sys.argv) > 1 else SP + 'hdr/'
    import os; os.makedirs(o, exist_ok=True)
    header(o + 'today.jpg', 'SIX-PACK STACK · DAY BY DAY', 'TODAY', 'One workout. Hit your numbers. Done.', 'check')
    header(o + 'train.jpg', 'SIX-PACK STACK · TRAINING', 'TRAIN', 'Every rep logged. Every week stronger.', 'dumbbell')
    header(o + 'plan.jpg', 'BUILT FOR YOU BY BOON', 'YOUR PLAN', 'Food you like. Nothing you don’t need.', 'clip')
    header(o + 'stack.jpg', 'BOON FAY · SUPPLEMENT INVESTIGATIONS', 'THE STACK', 'Only what works. No sponsors. No affiliate links.', 'search')
    header(o + 'progress.jpg', 'SUNDAY BY SUNDAY', 'PROGRESS', 'Proof, not guesses.', 'chart')
    coach(o + 'boon.jpg', 'YOUR COACH', 'TEXT BOON', 'Real coach. Real replies.')
