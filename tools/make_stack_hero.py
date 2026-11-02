from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps
import numpy as np
W,H=1200,1104
CUT='/home/claude/btl2/photos/cut/'
NAVY=np.array([13,27,51])
yy,xx=np.mgrid[0:H,0:W]
# background: deep navy with a soft spotlight from above
d=np.sqrt(((xx-W/2)/(W*0.55))**2+((yy-H*0.35)/(H*0.5))**2)
light=np.clip(1-d,0,1)**1.6
bg=NAVY*(0.55+0.0*light[...,None])+np.array([60,90,140])*light[...,None]*0.9
img=Image.fromarray(np.clip(bg,0,255).astype('uint8')).convert('RGBA')
def load(n,h):
    im=Image.open(CUT+n).convert('RGBA'); im=im.crop(im.getbbox())
    return im.resize((int(im.width*h/im.height),h),Image.LANCZOS)
def dim(im,f=0.35,blur=4,sat=0.4):
    a=im.getchannel('A'); rgb=ImageEnhance.Color(im.convert('RGB')).enhance(sat); rgb=ImageEnhance.Brightness(rgb).enhance(f)
    o=rgb.convert('RGBA'); o.putalpha(a); return o.filter(ImageFilter.GaussianBlur(blur))
def place(im,cx,base,shadow=True,refl=True):
    global img
    x=int(cx-im.width/2); y=base-im.height
    if refl:
        r=ImageOps.flip(im); ra=np.array(r.getchannel('A')).astype(float)
        fade=np.linspace(0.32,0,r.height)[:,None]; ra=(ra*fade).astype('uint8'); r.putalpha(Image.fromarray(ra))
        img.alpha_composite(r.filter(ImageFilter.GaussianBlur(2)),(x,base+2))
    if shadow:
        sh=Image.new('RGBA',img.size,(0,0,0,0)); ImageDraw.Draw(sh).ellipse([cx-im.width*0.5,base-18,cx+im.width*0.5,base+18],fill=(0,0,0,170))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    img.alpha_composite(im,(x,y))
# floor sheen
fl=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(fl).ellipse([60,560,1140,760],fill=(120,150,200,40)); img.alpha_composite(fl.filter(ImageFilter.GaussianBlur(40)))
BASE=630
# back row: the stuff that gets cut
for n,cx,h in [('c4.png',230,280),('hydroxy.png',990,250),('xtend.png',350,255),('prime.png',870,245),('goli.png',1110,210),('nugenix.png',110,220)]:
    place(dim(load(n,h)),cx,BASE-60,shadow=False,refl=False)
# darken the back row a touch more with a navy veil
veil=Image.new('RGBA',(W,H),(13,27,51,70)); img.alpha_composite(veil)
# front: the stack that works
cre=load('creatine.png',470); whe=load('on.png',505)
place(cre,470,BASE); place(whe,735,BASE)
# rim light glow behind front products
img=img.convert('RGB')
img=ImageEnhance.Contrast(img).enhance(1.05)
img.save('stack_hero.jpg',quality=90)
