from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageOps
import numpy as np, random
random.seed(7); np.random.seed(7)
W,H=1200,1104
CUT='/home/claude/btl2/photos/cut/'
yy,xx=np.mgrid[0:H,0:W].astype(float)
def glow(cx,cy,rx,ry,col,power=1.8,k=1.0):
    d=np.sqrt(((xx-cx)/rx)**2+((yy-cy)/ry)**2); a=np.clip(1-d,0,1)**power*k
    return a[...,None]*np.array(col,float)
bg=np.zeros((H,W,3))+np.array([6,10,20],float)
bg+=glow(600,330,620,520,[25,45,85],1.4)          # navy wash
bg+=glow(360,360,330,420,[226,67,59],2.2,0.85)     # red backlight left
bg+=glow(840,340,330,420,[60,120,230],2.2,0.75)    # blue backlight right
bg+=glow(600,-40,260,700,[255,255,255],3.0,0.25)   # top beam
img=Image.fromarray(np.clip(bg,0,255).astype('uint8')).convert('RGBA')
# light rays from the top
rays=Image.new('L',(W,H),0); rd=ImageDraw.Draw(rays)
for x0,x1,a in [(520,300,60),(600,600,70),(680,900,60),(560,450,40),(640,760,40)]:
    rd.polygon([(x0-10,-10),(x0+10,-10),(x1+70,H*0.62),(x1-70,H*0.62)],fill=a)
rays=rays.filter(ImageFilter.GaussianBlur(28))
img.alpha_composite(Image.merge('RGBA',[Image.new('L',(W,H),255)]*3+[rays]))
# haze / smoke near the floor
n=np.random.rand(H//8,W//8); smoke=Image.fromarray((n*255).astype('uint8')).resize((W,H),Image.BICUBIC).filter(ImageFilter.GaussianBlur(30))
sm=np.array(smoke).astype(float)/255; band=np.clip(1-abs(yy-640)/170,0,1); sa=(sm*band*120).astype('uint8')
img.alpha_composite(Image.merge('RGBA',[Image.new('L',(W,H),200)]*3+[Image.fromarray(sa)]))
# glossy floor
floor=Image.new('RGBA',(W,H),(0,0,0,0)); fd=ImageDraw.Draw(floor)
fd.rectangle([0,660,W,H],fill=(4,8,16,200)); img.alpha_composite(floor.filter(ImageFilter.GaussianBlur(6)))
line=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(line).ellipse([140,648,1060,676],fill=(255,255,255,70)); img.alpha_composite(line.filter(ImageFilter.GaussianBlur(10)))
def load(n,h):
    im=Image.open(CUT+n).convert('RGBA'); im=im.crop(im.getbbox()); return im.resize((int(im.width*h/im.height),h),Image.LANCZOS)
def rim(im,col):
    a=im.getchannel('A'); edge=a.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(22)).point(lambda v:int(v*0.55))
    g=Image.new('RGBA',im.size,col+(0,)); g.putalpha(edge); return g
BASE=660
for n,cx,h,col in [('creatine.png',470,480,(255,90,80)),('on.png',735,515,(110,170,255))]:
    im=load(n,h); x=int(cx-im.width/2); y=BASE-im.height
    # reflection
    r=ImageOps.flip(im); ra=np.array(r.getchannel('A')).astype(float); ra*=np.linspace(0.38,0,r.height)[:,None]; r.putalpha(Image.fromarray(ra.astype('uint8')))
    img.alpha_composite(r.filter(ImageFilter.GaussianBlur(3)),(x,BASE+4))
    # coloured rim light
    big=Image.new('RGBA',(W,H),(0,0,0,0)); big.alpha_composite(rim(im,col),(x,y)); img.alpha_composite(big)
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(sh).ellipse([cx-im.width*0.52,BASE-14,cx+im.width*0.52,BASE+14],fill=(0,0,0,200)); img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)))
    img.alpha_composite(im,(x,y))
# floating powder/dust particles
pt=Image.new('RGBA',(W,H),(0,0,0,0)); pd=ImageDraw.Draw(pt)
for _ in range(140):
    x=random.gauss(600,260); y=random.uniform(40,640); r=random.choice([1,1,1.5,2,2.5,3.5])
    a=int(random.uniform(60,200)*(1-abs(x-600)/700)); pd.ellipse([x-r,y-r,x+r,y+r],fill=(255,240,230,max(0,a)))
img.alpha_composite(pt.filter(ImageFilter.GaussianBlur(0.8)))
bok=Image.new('RGBA',(W,H),(0,0,0,0)); bd=ImageDraw.Draw(bok)
for _ in range(6):
    x=random.uniform(0,W); y=random.uniform(30,520); r=random.uniform(10,26); bd.ellipse([x-r,y-r,x+r,y+r],fill=(255,255,255,random.randint(10,22)))
img.alpha_composite(bok.filter(ImageFilter.GaussianBlur(4)))
out=img.convert('RGB'); out=ImageEnhance.Contrast(out).enhance(1.06); out.save('stack_ad.jpg',quality=92)

# Boon hero: cutout on a red/navy stage
b=Image.open('boon_cut.png').convert('RGBA'); b=b.crop(b.getbbox())
bg=np.zeros((H,W,3))+np.array([8,14,28],float)
bg+=glow(600,300,560,520,[30,52,95],1.3)
bg+=glow(820,380,380,460,[226,67,59],2.0,0.75)
bg+=glow(330,300,320,400,[60,120,230],2.2,0.45)
img=Image.fromarray(np.clip(bg,0,255).astype('uint8')).convert('RGBA')
h=820; b=b.resize((int(b.width*h/b.height),h),Image.LANCZOS)
x=int(650-b.width/2); y=40
a=np.array(b.getchannel('A')).astype(float); a*=np.clip((np.linspace(1,0,h)[:,None]*1.0+0.15),0,1)**0.0; 
fade=np.clip((h-np.arange(h))/360,0,1)[:,None]**1.4; a=a*fade; b.putalpha(Image.fromarray(a.astype('uint8')))
img.alpha_composite(b,(x,y))
img.convert('RGB').save('boon_hero.jpg',quality=90)
s=Image.new('RGB',(1210,560),(255,255,255)); s.paste(Image.open('stack_ad.jpg').resize((600,552)),(0,0)); s.paste(Image.open('boon_hero.jpg').resize((600,552)),(610,0)); s.save('ad_prev.jpg')
