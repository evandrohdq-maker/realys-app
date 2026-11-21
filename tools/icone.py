# Ícone do app Realyz: o A de borda dourada com a estrela preta de borda branca saindo de dentro.
import importlib.util, sys
from PIL import Image, ImageDraw, ImageChops, ImageFilter
spec=importlib.util.spec_from_file_location('wm', '/tmp/wm/wm2.py')
src=open('/tmp/wm/wm2.py').read().split('\nmake(')[0]   # só as funções, sem gerar a marca
ns={}; exec(src, ns)
sym=ns['letterA']((0,0,0,255),None,False)
# pequeno R branco no centro da estrela, dentro do A
from PIL import ImageFont
F=ns['font']; h=ImageDraw.Draw(Image.new('RGBA',(5,5))).textbbox((0,0),'E',font=F); h=h[3]-h[1]
rf=ImageFont.truetype('/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf', int(F.size*0.25))
d=ImageDraw.Draw(sym)
cx=sym.width/2; cy=ns['TOP']+0.585*h
b=d.textbbox((0,0),'R',font=rf)
d.text((cx-(b[0]+b[2])/2, cy-(b[1]+b[3])/2),'R',font=rf,fill=(255,255,255,255))
bb=sym.getbbox(); sym=sym.crop(bb)
def fit(img, box):
    r=min(box/img.width, box/img.height)
    return img.resize((int(img.width*r), int(img.height*r)), Image.LANCZOS)
def centered(canvas, img):
    canvas.alpha_composite(img, ((canvas.width-img.width)//2, (canvas.height-img.height)//2)); return canvas
BG=(251,248,241,255)
icon=centered(Image.new('RGBA',(1024,1024),BG), fit(sym, 760)); icon.save('icon.png')
fg=centered(Image.new('RGBA',(1024,1024),(0,0,0,0)), fit(sym, 600)); fg.save('adaptive-icon.png')
Image.new('RGBA',(1024,1024),BG).save('adaptive-icon-bg.png')
a=fg.split()[3]; mono=Image.new('RGBA',(1024,1024),(255,255,255,0)); mono.putalpha(a); mono.save('adaptive-icon-mono.png')
mark=centered(Image.new('RGBA',(256,256),(0,0,0,0)), fit(sym, 236)); mark.save('logo-mark.png')
prev=Image.new('RGB',(1100,560),(230,226,216)); 
ic=icon.resize((480,480)); m=Image.new('L',(480,480),0); ImageDraw.Draw(m).rounded_rectangle([0,0,479,479],110,fill=255)
prev.paste(ic,(40,40),m)
ad=Image.new('RGBA',(480,480),BG); ad.alpha_composite(fg.resize((480,480))); m2=Image.new('L',(480,480),0); ImageDraw.Draw(m2).ellipse([0,0,479,479],fill=255)
prev.paste(ad,(580,40),m2); prev.save('icone-preview.png')
print('ok')
