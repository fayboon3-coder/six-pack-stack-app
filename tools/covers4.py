# All app covers on the app's own background (navy fade + small red glow top right).
import os
os.chdir('/tmp/claude-0/-home-claude/c8a69b93-862c-5582-89c9-433fef2a90e0/scratchpad')
T='/home/claude/six-pack-stack-app/tools/'
src=open(T+'covers3.py').read().split("cover('YOUR FIRST")[0]
src=src.replace("exec(open('covers2.py').read()","exec(open(T+'covers2.py').read()")
exec(src)
from PIL import Image, ImageDraw
BG=Image.open(T+'cover_bg.png').convert('RGBA')
def bg(): return BG.copy()
def fade_to_bg(im,start=860,span=170):
    m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m)
    for i in range(span): d.line([(0,start-span+i),(W,start-span+i)],fill=int(255*(i/span)**1.3))
    d.rectangle((0,start,W,H),fill=255)
    im.paste(BG,(0,0),m)
def fade_bottom(im,start=860,span=170): fade_to_bg(im,start,span)
def app_visual(im,y):
    a=phone('ts_sc.png',215).rotate(9,expand=True,resample=Image.BICUBIC)
    b=phone('ts_train.png',245)
    c=phone('ts_verdict.png',215).rotate(-9,expand=True,resample=Image.BICUBIC)
    shadowed(im,a,(W//2+40,y+40)); shadowed(im,c,(W//2-40-c.width,y+40)); shadowed(im,b,(W//2-b.width//2,y))
    fade_to_bg(im)
def btl_visual(im,y):
    C='/home/claude/btl2/photos/cut/'
    items=[('prime.png',330),('c4.png',380),('on.png',400),('goli.png',330)]
    objs=[]
    for f,h in items:
        o=Image.open(C+f).convert('RGBA'); o=o.crop(o.getbbox()); o=o.resize((int(o.width*h/o.height),h),Image.LANCZOS); objs.append(o)
    base=y+462
    gl=Image.new('L',(W,H),0); ImageDraw.Draw(gl).ellipse((90,base-50,W-90,base+40),fill=255); gl=gl.filter(ImageFilter.GaussianBlur(40))
    im.paste((0,0,0,120),(0,0),gl)
    total=sum(o.width for o in objs)-3*30; k=min(1,(W-140)/total)
    if k<1: objs=[o.resize((int(o.width*k),int(o.height*k)),Image.LANCZOS) for o in objs]
    total=sum(o.width for o in objs)-3*30; x=(W-total)//2; xs=[]
    for o in objs: xs.append(x); x+=o.width-30
    for i in (0,3,1,2): shadowed(im,objs[i],(xs[i],base-objs[i].height))
cover('YOUR FIRST 2 WEEKS, FREE.',['THE FREE','STACK'],free_visual,['BUILT FROM','A 2-MINUTE','QUIZ.'],'QUIZ','/home/claude/sps-app/assets/img/cover_free.jpg')
cover('12 WEEKS OF 1:1 COACHING WITH BOON.',['SIX-PACK','STACK'],coach_visual,['ABS IN 12 WEEKS,','OR I COACH YOU','FREE.'],'FREE','/home/claude/sps-app/assets/img/cover_coaching.jpg')
cover('THE FREE 60-SECOND STACK AUDIT.',['STACK','SCORE'],label_visual,['CUT.','KEEP.','SWAP.'],'SWAP','/home/claude/sps-app/assets/img/cover_score.jpg')
cover('ALL 12 WEEKS, IN ONE APP.',['THE FULL','STACK'],app_visual,['STRIP.','STACK.','SIX-PACK.'],'SIX-PACK','/home/claude/sps-app/assets/img/cover_program.jpg')
cover('A FULL INVESTIGATION OF 40+ FITNESS PRODUCTS.',['BEYOND','THE LABEL'],btl_visual,['THE TRUTH','BEHIND WHAT',"YOU'RE BUYING"],'TRUTH','/home/claude/sps-app/assets/img/btl_cover_new.jpg')
fs=['cover_free.jpg','cover_score.jpg','btl_cover_new.jpg','cover_program.jpg','cover_coaching.jpg']
ims=[Image.open('/home/claude/sps-app/assets/img/'+f).resize((W//3,H//3)) for f in fs]
R=Image.new('RGB',(5*(W//3+8),H//3),'white')
for i,a in enumerate(ims): R.paste(a,(i*(W//3+8),0))
R.save('covers4.png')
