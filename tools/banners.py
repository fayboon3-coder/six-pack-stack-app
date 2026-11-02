from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
F9='/home/claude/fonts/Montserrat-900.ttf'; F8='/home/claude/fonts/Montserrat-800.ttf'
RED=(226,67,59); WHITE=(255,255,255); GREEN=(63,191,127); NAVY=(13,27,51); NAVY2=(20,38,69)
BGSRC=Image.open('/home/claude/six-pack-stack-app/tools/cover_bg.png').convert('RGB')
A='/home/claude/sps-app/assets/'
def bg(W,H,glow=(0.85,0.0),glow2=None):
    y,x=np.mgrid[0:H,0:W].astype(float)
    t=y/H; base=np.where(t[...,None]<0.45,(1-t[...,None]/0.45)*np.array([23,44,85])+(t[...,None]/0.45)*np.array([15,31,60]),(1-(t[...,None]-0.45)/0.55)*np.array([15,31,60])+((t[...,None]-0.45)/0.55)*np.array([9,20,42]))
    img=base
    for (gx,gy,rx,ry,a) in ([ (glow[0],glow[1],0.6,0.55,0.75) ]+(glow2 or [])):
        dd=np.sqrt(((x/W-gx)/rx)**2+((y/H-gy)/ry)**2); k=np.clip(1-dd,0,1)**1.6*a
        img=img*(1-k[...,None])+np.array([138,42,51])*k[...,None]
    return Image.fromarray(img.astype('uint8')).convert('RGBA')
def cut(path,h):
    o=Image.open(path).convert('RGBA'); o=o.crop(o.getbbox()); return o.resize((max(1,int(o.width*h/o.height)),h),Image.LANCZOS)
def shadowed(im,obj,pos,blur=22,alpha=150,off=(0,22)):
    sh=Image.new('RGBA',obj.size,(0,0,0,0)); sh.paste((0,0,0,alpha),(0,0),obj.split()[3]); sh=sh.filter(ImageFilter.GaussianBlur(blur))
    im.alpha_composite(sh,(pos[0]+off[0],pos[1]+off[1])); im.alpha_composite(obj,pos)
def floor_glow(im,cx,cy,w,h,color=(0,0,0),a=140):
    gl=Image.new('L',im.size,0); ImageDraw.Draw(gl).ellipse((cx-w//2,cy-h//2,cx+w//2,cy+h//2),fill=255); gl=gl.filter(ImageFilter.GaussianBlur(h//2))
    im.paste(color+(a,),(0,0),gl.point(lambda v:v*a//255))
def chip(im,text,cx,cy,fill,color=WHITE,size=30,outline=WHITE):
    d=ImageDraw.Draw(im); f=ImageFont.truetype(F9,size); w=d.textlength(text,font=f); h=size+28
    box=(int(cx-w/2-24),int(cy-h/2),int(cx+w/2+24),int(cy+h/2))
    sh=Image.new('RGBA',im.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((box[0],box[1]+10,box[2],box[3]+10),radius=h//2,fill=(0,0,0,130)); im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(12)))
    d.rounded_rectangle(box,radius=h//2,fill=fill,outline=outline,width=4); d.text((cx-w/2,cy-size/2-6),text,font=f,fill=color)
def rim(obj,color=(255,90,80),width=6,alpha=170):
    a=obj.split()[3]; e=a.filter(ImageFilter.MaxFilter(width*2+1)).filter(ImageFilter.GaussianBlur(width))
    g=Image.new('RGBA',obj.size,color+(0,)); g.putalpha(e.point(lambda v:v*alpha//255)); out=Image.new('RGBA',obj.size); out.alpha_composite(g); out.alpha_composite(obj); return out
def photo_card(path,w,h,r=36,border=10):
    p=Image.open(path).convert('RGB'); s=max(w/p.width,h/p.height); p=p.resize((int(p.width*s)+1,int(p.height*s)+1),Image.LANCZOS)
    p=p.crop(((p.width-w)//2,(p.height-h)//2,(p.width-w)//2+w,(p.height-h)//2+h))
    c=Image.new('RGBA',(w+2*border,h+2*border),(0,0,0,0)); d=ImageDraw.Draw(c); d.rounded_rectangle((0,0,c.width-1,c.height-1),radius=r+border,fill=WHITE)
    m=Image.new('L',(w,h),0); ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),radius=r,fill=255); c.paste(p,(border,border),m); return c

W,H=1200,1104
# 1) THE STACK: cut the junk, keep what works
im=bg(W,H,glow=(0.5,0.18),glow2=[(0.08,0.05,0.4,0.4,0.35)])
base=660
floor_glow(im,600,base+12,1100,120,a=160)
fb=cut(A+'img/hydroxycut.png',330); fbd=fb.copy(); fbd.putalpha(fb.split()[3].point(lambda v:int(v*0.5)))
cr=cut(A+'img/creatine.png',430); wh=cut(A+'img/whey.png',540); shk=cut(A+'img/shaker.png',400); cof=cut(A+'img/coffee.png',290)
items=[(fbd,0),(cr,0),(wh,0),(shk,0),(cof,0)]
gap=-28; total=sum(o.width for o,_ in items)+gap*(len(items)-1); sc=min(1,(W-60)/total)
if sc<1:
    items=[(o.resize((int(o.width*sc),int(o.height*sc)),Image.LANCZOS),0) for o,_ in items]; total=sum(o.width for o,_ in items)+gap*(len(items)-1)
x=(W-total)//2; xs=[]
for o,_ in items: xs.append(x); x+=o.width+gap
order=[0,4,3,1,2]
for i in order:
    o=items[i][0]; shadowed(im,o,(xs[i],base-o.height),blur=24,alpha=170)
d=ImageDraw.Draw(im)
fo=items[0][0]; cx,cy=xs[0]+fo.width//2,base-fo.height//2
d.line((cx-80,cy-80,cx+80,cy+80),fill=RED,width=24); d.line((cx-80,cy+80,cx+80,cy-80),fill=RED,width=24)
chip(im,'CUT',cx,base-fo.height-36,RED)
chip(im,'KEEP',xs[1]+items[1][0].width//2,base-items[1][0].height-36,GREEN,color=NAVY)
chip(im,'KEEP',xs[2]+items[2][0].width//2,base-items[2][0].height-36,GREEN,color=NAVY)
im.convert('RGB').save(A+'hero/stack_full.jpg',quality=90)

# 2) EAT LIKE THIS: meals from foods you like
im=bg(W,H,glow=(0.85,0.0))
specs=[('meals/chicken_rice.jpg',-12,(40,200),(400,450),'45G PROTEIN',(150,640)),('meals/steak.jpg',12,(W-40-400,200),(400,450),'50G PROTEIN',(W-150,640)),('meals/salmon.jpg',0,(W//2-260,80),(520,580),'40G PROTEIN',(W//2,690))]
for path,rot,(x,y),(w,h),lab,(lx,ly) in specs:
    c=photo_card(A+path,w,h).rotate(rot,expand=True,resample=Image.BICUBIC)
    shadowed(im,c,(x-(c.width-w)//2,y),blur=30,alpha=180,off=(0,26))
for path,rot,(x,y),(w,h),lab,(lx,ly) in specs:
    big=path.endswith('salmon.jpg'); chip(im,lab,lx,ly,GREEN if big else WHITE,color=NAVY,size=28 if big else 24,outline=WHITE if big else NAVY2)
im.convert('RGB').save(A+'hero/plan_full.jpg',quality=90)

# 3) YOUR RESULTS: the trend line + progress photos
im=bg(W,H,glow=(0.85,0.0))
card=(70,90,780,610); d=ImageDraw.Draw(im)
sh=Image.new('RGBA',im.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((card[0],card[1]+20,card[2],card[3]+20),radius=40,fill=(0,0,0,150)); im.alpha_composite(sh.filter(ImageFilter.GaussianBlur(26)))
d.rounded_rectangle(card,radius=40,fill=NAVY2+(255,),outline=(43,68,112),width=3)
fk=ImageFont.truetype(F8,26); d.text((card[0]+40,card[1]+36),'WEIGHT TREND',font=fk,fill=(255,120,110))
for k in range(4):
    yy=card[1]+130+k*95; d.line((card[0]+40,yy,card[2]-40,yy),fill=(43,68,112),width=2)
pts=[]; n=9
for i in range(n):
    x=card[0]+70+i*(card[2]-card[0]-140)/(n-1); v=[0,0.12,0.2,0.33,0.38,0.5,0.6,0.67,0.8][i]; y=card[1]+150+v*300; pts.append((x,y))
glow=Image.new('RGBA',im.size,(0,0,0,0)); gd=ImageDraw.Draw(glow); gd.line(pts,fill=RED+(200,),width=26,joint='curve'); im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(16)))
d=ImageDraw.Draw(im); d.line(pts,fill=RED,width=14,joint='curve')
for i,(x,y) in enumerate(pts):
    r=13 if i<n-1 else 20; d.ellipse((x-r,y-r,x+r,y+r),fill=WHITE if i<n-1 else GREEN,outline=RED if i<n-1 else WHITE,width=5)
fl=ImageFont.truetype(F8,22)
for i,lab in ((0,'WK 1'),(4,'WK 5'),(8,'WK 9')):
    w=d.textlength(lab,font=fl); d.text((pts[i][0]-w/2,card[3]-60),lab,font=fl,fill=(170,185,210))
chip(im,'ON TRACK',pts[-1][0]-90,pts[-1][1]-90,GREEN,color=NAVY,size=28)
ba=Image.open(A+'hero/boon_jacked.jpg').convert('RGB'); hw=ba.width//2
ba.crop((0,0,hw,ba.height)).save('/tmp/b_before.jpg'); ba.crop((hw,0,ba.width,ba.height)).save('/tmp/b_after.jpg')
p1=photo_card('/tmp/b_before.jpg',230,300,r=22,border=8).rotate(7,expand=True,resample=Image.BICUBIC)
p2=photo_card('/tmp/b_after.jpg',270,350,r=24,border=8).rotate(-5,expand=True,resample=Image.BICUBIC)
shadowed(im,p1,(830,110),blur=24,alpha=170); shadowed(im,p2,(880,300),blur=24,alpha=170)
chip(im,'SUNDAY CHECK-IN',1000,650,RED,size=26)
im.convert('RGB').save(A+'hero/progress_full.jpg',quality=90)

# 4) WHO BUILT YOUR PLAN (16:9)
W2,H2=1600,900
im=bg(W2,H2,glow=(0.8,0.35),glow2=[])
boon=Image.open('boon_cut.png'); bh=880; boon=boon.resize((bh,bh),Image.LANCZOS)
# red halo
halo=Image.new('L',(W2,H2),0); ImageDraw.Draw(halo).ellipse((1230-380,120,1230+380,880),fill=255); halo=halo.filter(ImageFilter.GaussianBlur(70))
im.paste((226,67,59,255),(0,0),halo.point(lambda v:int(v*0.55)))
ring=Image.new('RGBA',(W2,H2),(0,0,0,0)); ImageDraw.Draw(ring).ellipse((1230-330,150,1230+330,810),outline=RED+(255,),width=10); im.alpha_composite(ring)
im.alpha_composite(boon,(1230-bh//2,H2-bh+30))
fade=Image.new('L',(W2,H2),0); fd=ImageDraw.Draw(fade)
for i in range(120): fd.line([(0,H2-120+i),(W2,H2-120+i)],fill=int(255*(i/120)**1.5))
im.paste(bg(W2,H2,glow=(0.8,0.35)),(0,0),fade)
d=ImageDraw.Draw(im)
fk=ImageFont.truetype(F8,34); d.text((90,190),'BUILT BY BOON FAY',font=fk,fill=(255,120,110))
fb9=ImageFont.truetype(F9,132); d.text((84,240),'225',font=fb9,fill=WHITE)
w225=d.textlength('225',font=fb9)
# arrow
ax=84+w225+26; ay=314; d.line((ax,ay,ax+90,ay),fill=RED,width=20); d.polygon([(ax+82,ay-30),(ax+126,ay),(ax+82,ay+30)],fill=RED)
d.text((ax+146,240),'175',font=fb9,fill=RED)
f8=ImageFont.truetype(F8,44); d.text((92,420),'LBS. NO SHORTCUTS.',font=f8,fill=WHITE)
chip(im,'NO SPONSORS',90+140,550,NAVY2,size=26)
chip(im,'NO AFFILIATE LINKS',90+140+300,550,NAVY2,size=26)
im.convert('RGB').save(A+'hero/boon_quiz.jpg',quality=90)

fs=['stack_full','plan_full','progress_full']
ims=[Image.open(A+'hero/'+f+'.jpg').resize((400,368)) for f in fs]+[Image.open(A+'hero/boon_wide.jpg').resize((654,368))]
R=Image.new('RGB',(sum(i.width+8 for i in ims),368),'white');x=0
for i in ims:R.paste(i,(x,0));x+=i.width+8
R.save('banners.png')
