from PIL import Image, ImageDraw, ImageFont
import math
S=4; H=240*S
font=ImageFont.truetype('/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf', 190*S)
TOP=int(H*0.16)
GOLD=(214,160,28,255)
SW=6*S
def starpoly(cx,cy,R,r,rot=-90):
    pts=[]
    for i in range(10):
        a=math.radians(rot+i*36); rr=R if i%2==0 else r
        pts.append((cx+rr*math.cos(a), cy+rr*math.sin(a)))
    return pts
def letterA(color, starc, bg_is_dark):
    # A e estrela mesclados: as pernas do A são as pontas de baixo da estrela.
    # A em ouro escuro, estrela em ouro claro e, onde os dois se cruzam, a mistura das duas cores.
    d0=ImageDraw.Draw(Image.new('RGBA',(5,5)))
    b=d0.textbbox((0,0),'A',font=font)
    w=(b[2]-b[0])*1.14; h=d0.textbbox((0,0),'E',font=font); h=h[3]-h[1]
    pad=int(44*S)
    size=(int(w)+2*pad,H)
    X=lambda u: pad+u*w; Y=lambda v: TOP+v*h
    A=Image.new('L',size,0); d=ImageDraw.Draw(A)
    d.polygon([(X(0.44),Y(-0.02)),(X(0.56),Y(-0.02)),(X(0.97),Y(1)),(X(0.03),Y(1))],fill=255)
    d.polygon([(X(0.5),Y(0.36)),(X(0.75),Y(1.01)),(X(0.25),Y(1.01))],fill=0)
    E=Image.new('L',size,0)
    # estrela saindo de dentro do A: a ponta de cima é o topo do A e as pontas de baixo correm pelas pernas
    P=[(0.5,-0.02),(0.60,0.40),(1.20,0.30),(0.70,0.62),(0.86,1.0),(0.5,0.79),(0.14,1.0),(0.30,0.62),(-0.20,0.30),(0.40,0.40)]
    ImageDraw.Draw(E).polygon([(X(u),Y(v)) for u,v in P],fill=255)
    from PIL import ImageChops
    both=ImageChops.multiply(A,E)
    onlyA=ImageChops.subtract(A,both); onlyE=ImageChops.subtract(E,both)
    im=Image.new('RGBA',size,(0,0,0,0))
    cA,cE,cM = starc
    im.paste(Image.new('RGBA',size,cA),(0,0),onlyA)
    im.paste(Image.new('RGBA',size,cE),(0,0),onlyE)
    im.paste(Image.new('RGBA',size,cM),(0,0),both)
    from PIL import ImageFilter
    union=ImageChops.lighter(A,E)
    ring=ImageChops.subtract(union.filter(ImageFilter.MaxFilter(2*SW+1)),union)
    out=Image.new('RGBA',size,(0,0,0,0))
    out.paste(Image.new('RGBA',size,GOLD),(0,0),ring)
    out.alpha_composite(im)
    return out
def make(color, starc, path):
    d0=ImageDraw.Draw(Image.new('RGBA',(5,5)))
    parts=[]
    for p in ['RE','A','LYZ']:
        if p=='A': parts.append(letterA(color if False else starc, starc, False) if False else letterA(color, starc, False))
        else:
            b=d0.textbbox((0,0),p,font=font)
            im=Image.new('RGBA',(b[2]-b[0]+2*SW,H),(0,0,0,0)); ImageDraw.Draw(im).text((-b[0]+SW,TOP-b[1]),p,font=font,fill=color,stroke_width=SW,stroke_fill=GOLD); parts.append(im)
    gap=int(6*S)
    W=sum(p.width for p in parts)+gap*4
    out=Image.new('RGBA',(W,H),(0,0,0,0)); x=gap
    for i,p in enumerate(parts):
        if i==1: x-=int(18*S)
        out.alpha_composite(p,(x,0)); x+=p.width+gap
        if i==1: x-=int(18*S)
    bb=out.getbbox(); out=out.crop((bb[0]-8*S,0,bb[2]+8*S,H))
    out=out.resize((out.width//S,H//S),Image.LANCZOS); out.save(path); print(path,out.size)
make((0,0,0,255),((255,255,255,255),(240,184,48,255),(250,222,150,255)),'/tmp/wm/wordmark.png')
