from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
W,H=935,1210
F9='/home/claude/fonts/Montserrat-900.ttf'; F8='/home/claude/fonts/Montserrat-800.ttf'
RED=(229,57,53); WHITE=(255,255,255)
def bg():
    y,x=np.mgrid[0:H,0:W].astype(float)
    d=np.sqrt((x-W/2)**2+((y-560)*0.9)**2)/820
    a=np.clip(1-d,0,1)
    base=np.array((16,30,58)); hi=np.array((34,56,98))
    img=base+(hi-base)*a[...,None]**1.4
    return Image.fromarray(img.astype('uint8')).convert('RGBA')
def ctext(d,y,text,font,fill,spacing=0):
    if spacing:
        total=sum(d.textlength(c,font=font) for c in text)+spacing*(len(text)-1); x=(W-total)/2
        for c in text: d.text((x,y),c,font=font,fill=fill); x+=d.textlength(c,font=font)+spacing
    else:
        w=d.textlength(text,font=font); d.text(((W-w)/2,y),text,font=font,fill=fill)
def shadowed(im,obj,pos,blur=22,alpha=150,off=(0,22)):
    sh=Image.new('RGBA',obj.size,(0,0,0,0)); sh.paste((0,0,0,alpha),(0,0),obj.split()[3])
    sh=sh.filter(ImageFilter.GaussianBlur(blur)); im.alpha_composite(sh,(pos[0]+off[0],pos[1]+off[1])); im.alpha_composite(obj,pos)
def tagline(d,lines,circle_word,y0,size=46):
    f=ImageFont.truetype(F9,size); x0=70; y=y0
    for ln in lines:
        x=x0
        for wi,word in enumerate(ln.split(' ')):
            w=d.textlength(word,font=f)
            d.text((x,y),word,font=f,fill=WHITE)
            if word.strip('.,')==circle_word:
                d.ellipse((x-14,y-6,x+w+14,y+size+10),outline=RED,width=5)
            x+=w+d.textlength(' ',font=f)
        y+=size+12
def phone(path,pw=250):
    s=Image.open(path).convert('RGB'); s=s.crop((0,0,s.width,int(s.width*2.05)))
    ph=int(s.height*pw/s.width); s=s.resize((pw,ph),Image.LANCZOS)
    bez=14; P=Image.new('RGBA',(pw+2*bez,ph+2*bez),(0,0,0,0)); d=ImageDraw.Draw(P)
    d.rounded_rectangle((0,0,P.width-1,P.height-1),radius=46,fill=(10,10,14,255),outline=(80,90,110,255),width=3)
    m=Image.new('L',(pw,ph),0); ImageDraw.Draw(m).rounded_rectangle((0,0,pw-1,ph-1),radius=34,fill=255)
    P.paste(s,(bez,bez),m); d.rounded_rectangle((P.width//2-38,bez+7,P.width//2+38,bez+26),radius=10,fill=(0,0,0,255))
    return P

def cover(top,title,visual,tag_lines,circle,out):
    im=bg(); d=ImageDraw.Draw(im)
    ctext(d,74,top,ImageFont.truetype(F8,19),WHITE,spacing=2)
    ft=ImageFont.truetype(F9,118)
    y=118
    for ln in title: ctext(d,y,ln,ft,RED); y+=128
    visual(im,y+20)
    d=ImageDraw.Draw(im)
    tagline(d,tag_lines,circle,880)
    ctext(d,1100,'BOON FAY',ImageFont.truetype(F9,26),WHITE,spacing=7)
    im.convert('RGB').save(out,quality=90)
    return im

def stack_visual(im,y):
    items=[('/home/claude/btl2/photos/cut/creatine.png',370),('/home/claude/btl2/photos/cut/on.png',425),('/home/claude/sps-app/assets/img/shaker.png',350)]
    objs=[]
    for p,h in items:
        o=Image.open(p).convert('RGBA'); o=o.crop(o.getbbox()); o=o.resize((int(o.width*h/o.height),h),Image.LANCZOS); objs.append(o)
    base=y+440
    gl=Image.new('L',(W,H),0); ImageDraw.Draw(gl).ellipse((120,base-50,W-120,base+40),fill=255); gl=gl.filter(ImageFilter.GaussianBlur(40))
    im.paste((0,0,0,120),(0,0),gl)
    xs=[W//2-objs[1].width//2-objs[0].width+30, W//2-objs[1].width//2, W//2+objs[1].width//2-25]
    order=[0,2,1]
    for i in order:
        o=objs[i]; shadowed(im,o,(xs[i],base-o.height))
def app_visual(im,y):
    a=phone('ts_sc.png',215).rotate(9,expand=True,resample=Image.BICUBIC)
    b=phone('ts_train.png',245)
    c=phone('w5.png' if False else 'ts_verdict.png',215).rotate(-9,expand=True,resample=Image.BICUBIC)
    base=y
    shadowed(im,a,(W//2+40,base+40)); shadowed(im,c,(W//2-40-c.width,base+40)); shadowed(im,b,(W//2-b.width//2,base))
    # fade phones into background toward bottom
    fade=Image.new('RGBA',(W,H),(0,0,0,0)); fd=ImageDraw.Draw(fade)
    for i in range(170):
        yy=860-170+i; fd.line([(0,yy),(W,yy)],fill=(18,32,62,int(255*(i/170)**1.3)))
    fd.rectangle((0,860,W,H),fill=(18,32,62,255))
    im.alpha_composite(fade)

cover('12 WEEKS OF 1:1 COACHING WITH BOON.',['SIX-PACK','STACK'],stack_visual,['YOUR STACK.','YOUR PLAN.','YOUR COACH.'],'COACH','/home/claude/sps-app/assets/img/cover_coaching.jpg')
cover('ALL 12 WEEKS, IN ONE APP.',['THE FULL','STACK'],app_visual,['STRIP.','STACK.','SIX-PACK.'],'SIX-PACK','/home/claude/sps-app/assets/img/cover_program.jpg')
a=Image.open('/home/claude/sps-app/assets/img/cover_coaching.jpg');b=Image.open('/home/claude/sps-app/assets/img/cover_program.jpg');c=Image.open('/home/claude/sps-app/assets/img/btl_cover.jpg').resize((W,H))
R=Image.new('RGB',(3*W+40,H),'white');R.paste(c,(0,0));R.paste(b,(W+20,0));R.paste(a,(2*W+40,0));R.resize((R.width//3,H//3)).save('covers3.png')
