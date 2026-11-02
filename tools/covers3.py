import sys
sys.argv=['x']
exec(open('covers2.py').read().split("cover('12 WEEKS")[0])
from PIL import Image, ImageDraw, ImageFont, ImageFilter
GREEN=(63,191,127); NAVY=(13,27,51)

def phone2(path,pw):
    s=Image.open(path).convert('RGB'); s=s.crop((0,0,s.width,int(s.width*2.05)))
    ph=int(s.height*pw/s.width); s=s.resize((pw,ph),Image.LANCZOS)
    bez=14; P=Image.new('RGBA',(pw+2*bez,ph+2*bez),(0,0,0,0)); d=ImageDraw.Draw(P)
    d.rounded_rectangle((0,0,P.width-1,P.height-1),radius=46,fill=(10,10,14,255),outline=(80,90,110,255),width=3)
    m=Image.new('L',(pw,ph),0); ImageDraw.Draw(m).rounded_rectangle((0,0,pw-1,ph-1),radius=34,fill=255)
    P.paste(s,(bez,bez),m); d.rounded_rectangle((P.width//2-38,bez+7,P.width//2+38,bez+26),radius=10,fill=(0,0,0,255))
    return P

def fade_bottom(im, start=860, span=170):
    fade=Image.new('RGBA',(W,H),(0,0,0,0)); fd=ImageDraw.Draw(fade)
    for i in range(span):
        yy=start-span+i; fd.line([(0,yy),(W,yy)],fill=(18,32,62,int(255*(i/span)**1.3)))
    fd.rectangle((0,start,W,H),fill=(18,32,62,255)); im.alpha_composite(fade)

def badge(im, text, center, r=78, fill=GREEN, color=NAVY, size=30):
    d=ImageDraw.Draw(im); x,y=center
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(sh).ellipse((x-r,y-r+10,x+r,y+r+10),fill=(0,0,0,130)); sh=sh.filter(ImageFilter.GaussianBlur(14)); im.alpha_composite(sh)
    d.ellipse((x-r,y-r,x+r,y+r),fill=fill+(255,),outline=(255,255,255,255),width=6)
    f=ImageFont.truetype(F9,size); lines=text.split('\n'); lh=size+4; y0=y-lh*len(lines)/2
    for i,ln in enumerate(lines):
        w=d.textlength(ln,font=f); d.text((x-w/2,y0+i*lh),ln,font=f,fill=color)

def free_visual(im,y):
    a=phone2('/tmp/cv/today.png',215).rotate(9,expand=True,resample=Image.BICUBIC)
    c=phone2('/tmp/cv/plan.png',215).rotate(-9,expand=True,resample=Image.BICUBIC)
    b=phone2('/tmp/cv/ready.png',245)
    shadowed(im,c,(W//2+40,y+40)); shadowed(im,a,(W//2-40-a.width,y+40)); shadowed(im,b,(W//2-b.width//2,y))
    fade_bottom(im)
    badge(im,'2 WEEKS\nFREE',(W//2+190,y+70),r=82,size=29)

def coach_visual(im,y):
    ph=Image.open('/home/claude/sps-app/assets/hero/boon_jacked.jpg').convert('RGB')
    cw=690; chh=int(ph.height*cw/ph.width); ph=ph.resize((cw,chh),Image.LANCZOS)
    card=Image.new('RGBA',(cw+12,chh+12),(0,0,0,0)); d=ImageDraw.Draw(card)
    d.rounded_rectangle((0,0,card.width-1,card.height-1),radius=30,fill=(255,255,255,255))
    m=Image.new('L',(cw,chh),0); ImageDraw.Draw(m).rounded_rectangle((0,0,cw-1,chh-1),radius=25,fill=255)
    card.paste(ph,(6,6),m)
    card=card.rotate(-2.5,expand=True,resample=Image.BICUBIC)
    shadowed(im,card,(W//2-card.width//2,y+40),blur=26,alpha=170)
    badge(im,'225\nTO 175',(W//2-330,y+30),r=72,fill=(229,57,53),color=(255,255,255),size=26)
    badge(im,'1:1',(W//2+340,y+30),r=60,fill=(255,255,255),color=(229,57,53),size=40)

def label_visual(im,y):
    lw,lh=600,462; L=Image.new('RGBA',(lw,lh),(255,255,255,255)); d=ImageDraw.Draw(L)
    ink=(17,17,17); f9=lambda s:ImageFont.truetype(F9,s); f8=lambda s:ImageFont.truetype(F8,s); f6=ImageFont.truetype('/home/claude/fonts/Montserrat-600.ttf',20)
    d.rectangle((0,0,lw-1,lh-1),outline=ink,width=4)
    d.text((24,16),'Stack Score Facts',font=f9(40),fill=ink); ex='EXAMPLE'; d.text((lw-24-d.textlength(ex,font=f8(15)),30),ex,font=f8(15),fill=(110,110,110))
    d.rectangle((24,70,lw-24,82),fill=ink)
    d.text((24,96),'YOUR STACK SCORE',font=f8(18),fill=ink); d.text((24,120),'"Leaking money"',font=f8(26),fill=ink)
    sc='38'; w=d.textlength(sc,font=f9(84)); d.text((lw-24-w-62,82),sc,font=f9(84),fill=(229,57,53)); d.text((lw-24-60,128),'/100',font=f8(24),fill=ink)
    d.rectangle((24,182,lw-24,188),fill=ink)
    rows=[('Fat burner','CUT',(229,57,53)),('Pre-workout','SWAP',(242,178,52)),('Whey protein','KEEP',GREEN),('Creatine','ADD',GREEN)]
    yy=200
    for name,v,col in rows:
        d.text((24,yy+8),name,font=f8(25),fill=ink)
        pw=d.textlength(v,font=f9(20))+28; d.rounded_rectangle((lw-24-pw,yy+6,lw-24,yy+42),radius=18,fill=col); d.text((lw-24-pw+14,yy+12),v,font=f9(20),fill=(255,255,255) if v in('CUT','KEEP','ADD') else ink)
        yy+=44; d.line((24,yy,lw-24,yy),fill=ink,width=2)
    d.rectangle((24,yy+4,lw-24,yy+12),fill=ink)
    d.text((24,yy+24),'Estimated yearly waste',font=f8(25),fill=ink); w=d.textlength('$540',font=f9(30)); d.text((lw-24-w,yy+20),'$540',font=f9(30),fill=ink)
    L=L.resize((int(lw*0.88),int(lh*0.88)),Image.LANCZOS).rotate(3,expand=True,resample=Image.BICUBIC)
    shadowed(im,L,(W//2-L.width//2,y+10),blur=26,alpha=170)
    badge(im,'FREE',(W-215,975),r=80,size=36)

cover('YOUR FIRST 2 WEEKS, FREE.',['THE FREE','STACK'],free_visual,['BUILT FROM','A 2-MINUTE','QUIZ.'],'QUIZ','/home/claude/sps-app/assets/img/cover_free.jpg')
cover('12 WEEKS OF 1:1 COACHING WITH BOON.',['SIX-PACK','STACK'],coach_visual,['ABS IN 12 WEEKS,','OR I COACH YOU','FREE.'],'FREE','/home/claude/sps-app/assets/img/cover_coaching.jpg')
cover('THE FREE 60-SECOND STACK AUDIT.',['STACK','SCORE'],label_visual,['CUT.','KEEP.','SWAP.'],'SWAP','/home/claude/sps-app/assets/img/cover_score.jpg')
ims=[Image.open('/home/claude/sps-app/assets/img/'+f).resize((W//2,H//2)) for f in ['cover_free.jpg','btl_cover.jpg','cover_program.jpg','cover_coaching.jpg','cover_score.jpg']]
R=Image.new('RGB',(5*(W//2)+40,H//2),'white')
for i,a in enumerate(ims): R.paste(a,(i*(W//2+10),0))
R.save('/tmp/cv/covers.png')
