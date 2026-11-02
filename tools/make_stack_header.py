import sys; sys.argv=['x']
exec(open('headers.py').read().split("if __name__ == '__main__':")[0])
import numpy as np
IMG='/home/claude/sps-app/assets/img/'
def load(n,h):
    im=Image.open(IMG+n+'.png').convert('RGBA'); im=im.crop(im.getbbox())
    return im.resize((int(im.width*h/im.height),h),Image.LANCZOS)
def shadowed(c,im,x,base,blur=18,op=150):
    sh=Image.new('RGBA',c.size,(0,0,0,0)); d=ImageDraw.Draw(sh)
    d.ellipse([x-im.width*0.48,base-16,x+im.width*0.48,base+16],fill=(0,0,0,op)); c.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    c.alpha_composite(im,(int(x-im.width/2),base-im.height))
def dim(im,f=0.45,blur=2):
    a=im.getchannel('A'); rgb=Image.eval(im.convert('RGB'),lambda v:int(v*f)); out=rgb.convert('RGBA'); out.putalpha(a); return out.filter(ImageFilter.GaussianBlur(blur))
c=Image.new('RGBA',(W,H),NAVY+(255,))
# spotlight glow behind the products (right side)
g=Image.new('L',(W,H),0); ImageDraw.Draw(g).ellipse([660,-40,1300,500],fill=255); g=g.filter(ImageFilter.GaussianBlur(120))
c=Image.composite(Image.new('RGBA',(W,H),(40,66,112,255)),c,g)
# floor line
fl=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(fl).ellipse([480,400,1300,520],fill=(255,255,255,18)); c.alpha_composite(fl.filter(ImageFilter.GaussianBlur(30)))
# back row: the hype you cut (dimmed)
base_back=400
for n,x,h in [('hydroxycut',770,200),('c4',850,215),('ag1',1075,205),('xtend',1150,210)]:
    shadowed(c,dim(load(n,h)),x,base_back,op=90)
# front row: the stack that works
for n,x,h in [('creatine',820,245),('whey',968,290),('coffee',1108,248)]:
    shadowed(c,load(n,h),x,455)
# left-side fade so the text sits on clean navy
x=np.linspace(0,1,W); a=np.clip((x-0.52)/0.12,0,1)
alpha=Image.fromarray(np.repeat((a*255).astype('uint8')[None,:],H,0))
base=Image.new('RGBA',(W,H),NAVY+(255,))
c=Image.composite(c,base,alpha)
# bottom fade into card colour
yy=np.linspace(0,1,H)[:,None]; b=np.clip((yy-0.80)/0.2,0,1)
c=Image.composite(Image.new('RGBA',(W,H),NAVY2+(255,)),c,Image.fromarray(np.repeat((b*255).astype('uint8'),W,1)))
d=ImageDraw.Draw(c)
f=anton(140); y=205
d.text((60,y),'THE STACK',font=f,fill=(255,255,255),anchor='lt'); bb=d.textbbox((60,y),'THE STACK',font=f,anchor='lt')
brush(c,70,bb[2]-10,bb[3]+24); d=ImageDraw.Draw(c)
d.text((62,bb[3]+60),'Only what works. Nothing else.',font=mont(800,38),fill=(255,255,255),anchor='lt')
c.convert('RGB').save('hdr/stack_photo.jpg',quality=90)
