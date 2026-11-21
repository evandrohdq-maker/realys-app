from PIL import Image, ImageDraw, ImageFont
import math
S=4; H=240*S
font=ImageFont.truetype('/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf', 190*S)
TOP=int(H*0.16)
def starpoly(cx,cy,R,r,rot=-90):
    pts=[]
    for i in range(10):
        a=math.radians(rot+i*36); rr=R if i%2==0 else r
        pts.append((cx+rr*math.cos(a), cy+rr*math.sin(a)))
    return pts
def letterA(color, starc, bg_is_dark):
    d0=ImageDraw.Draw(Image.new('RGBA',(5,5)))
    b=d0.textbbox((0,0),'A',font=font)
    w=b[2]-b[0]; h=d0.textbbox((0,0),'E',font=font); h=h[3]-h[1]
    pad=int(60*S)
    im=Image.new('RGBA',(w+2*pad,H),(0,0,0,0))
    X=lambda u: pad+u*w; Y=lambda v: TOP+v*h
    # estrela no fundo, maior que o A
    R=h*0.66
    ImageDraw.Draw(im).polygon(starpoly(X(0.5), Y(0.56), R, R*0.46), fill=starc)
    # A na frente, unido a ela
    m=Image.new('L',im.size,0); md=ImageDraw.Draw(m)
    md.polygon([(X(0.415),Y(0)),(X(0.585),Y(0)),(X(1),Y(1)),(X(0),Y(1))],fill=255)
    md.polygon([(X(0.5),Y(0.30)),(X(0.745),Y(1.01)),(X(0.255),Y(1.01))],fill=0)
    md.rectangle([X(0.2),Y(0.62),X(0.8),Y(0.76)],fill=255)
    md.polygon([(X(0.5),Y(0.30)),(X(0.745),Y(1.01)),(X(0.255),Y(1.01))],outline=None)
    im.paste(Image.new('RGBA',im.size,color),(0,0),m)
    return im
def make(color, starc, path):
    d0=ImageDraw.Draw(Image.new('RGBA',(5,5)))
    parts=[]
    for p in ['RE','A','LYZ']:
        if p=='A': parts.append(letterA(color if False else starc, starc, False) if False else letterA(color, starc, False))
        else:
            b=d0.textbbox((0,0),p,font=font)
            im=Image.new('RGBA',(b[2]-b[0],H),(0,0,0,0)); ImageDraw.Draw(im).text((-b[0],TOP-b[1]),p,font=font,fill=color); parts.append(im)
    gap=int(6*S)
    W=sum(p.width for p in parts)+gap*4
    out=Image.new('RGBA',(W,H),(0,0,0,0)); x=gap
    for i,p in enumerate(parts):
        if i==1: x-=int(42*S)
        out.alpha_composite(p,(x,0)); x+=p.width+gap
        if i==1: x-=int(42*S)
    bb=out.getbbox(); out=out.crop((bb[0]-8*S,0,bb[2]+8*S,H))
    out=out.resize((out.width//S,H//S),Image.LANCZOS); out.save(path); print(path,out.size)
make((20,18,14,255),(224,168,26,255),'/tmp/wm/wordmark-dark.png')
make((251,248,241,255),(242,193,78,255),'/tmp/wm/wordmark-light.png')
