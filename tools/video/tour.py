# Vídeo de apresentação do Realyz (tour pelo app), montado com as telas reais do site.
# Como gerar: rode o smoke test do site (screenshots em /tmp/sc) e depois  python3 tools/video/tour.py
# Saída: tour.mp4 e tour-capa.jpg; copie para assets/landing/.
import math, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1280,720,30
SC='/tmp/sc/'
F=lambda n,s: ImageFont.truetype(f'/usr/share/fonts/opentype/inter/{n}.otf', s)
TITLE=F('InterDisplay-ExtraBold',54); SUB=F('Inter-Regular',24); TAG=F('InterDisplay-SemiBold',18); BIG=F('InterDisplay-ExtraBold',76)
IVORY=(251,248,241); INK=(20,18,14); GOLD=(184,134,11); MUTED=(91,86,75)
logo=Image.open('/home/claude/realys-app/assets/wordmark-escuro.png').convert('RGBA')

def bg():
    im=Image.new('RGB',(W,H),IVORY)
    g=Image.new('L',(W,H),0); d=ImageDraw.Draw(g)
    d.ellipse((W*0.45,-H*0.3,W*1.35,H*1.2),fill=120)
    g=g.filter(ImageFilter.GaussianBlur(160))
    warm=Image.new('RGB',(W,H),(248,235,200))
    return Image.composite(warm,im,g)
BG=bg()
ease=lambda t: 0.5-0.5*math.cos(math.pi*max(0,min(1,t)))

def shot(name, crop=(300,0,1050,900)):
    im=Image.open(SC+name).convert('RGB').crop(crop)
    return im

def card(img, t, ch=560):
    # "rola" a tela devagar e entra com um leve zoom
    w,h=img.size
    cw=int(ch*0.92); scale=cw/w
    big=img.resize((cw,int(h*scale)),Image.LANCZOS)
    maxoff=max(0,big.size[1]-ch)
    off=int(maxoff*ease(t)*0.8)
    view=big.crop((0,off,cw,off+ch)) if big.size[1]>=ch else big
    mask=Image.new('L',view.size,0); ImageDraw.Draw(mask).rounded_rectangle((0,0,view.size[0]-1,view.size[1]-1),22,fill=255)
    return view,mask

def wrap(d,text,font,maxw):
    words=text.split(); lines=[]; cur=''
    for w in words:
        t=(cur+' '+w).strip()
        if d.textlength(t,font=font)<=maxw: cur=t
        else: lines.append(cur); cur=w
    lines.append(cur); return lines

def chat_card():
    cw,ch=470,520
    im=Image.new('RGB',(cw,ch),(255,255,255)); d=ImageDraw.Draw(im)
    f=F('Inter-Medium',19); fb=F('InterDisplay-SemiBold',14)
    msgs=[('eu','Lotus, preciso de um eletricista ainda hoje.'),('lotus','Achei 3 perto de você. O primeiro chega em ~35 min, visita R$ 150. Agendo esse?'),('eu','Pode agendar para as 15h.'),('lotus','Pronto! Visita confirmada às 15h. Pagamento protegido até o serviço terminar.')]
    y=28
    for who,txt in msgs:
        lines=wrap(d,txt,f,300); hgt=len(lines)*26+24+(18 if who=='lotus' else 0)
        bw=max(d.textlength(l,font=f) for l in lines)+36
        x=cw-bw-24 if who=='eu' else 24
        d.rounded_rectangle((x,y,x+bw,y+hgt),18,fill=(242,193,78) if who=='eu' else (246,237,214))
        yy=y+12
        if who=='lotus': d.text((x+18,yy),'Lotus',font=fb,fill=(138,98,8)); yy+=18
        for l in lines: d.text((x+18,yy),l,font=f,fill=INK); yy+=26
        y+=hgt+16
    return im
CHAT=None

def scene(tag,title,sub,img,t,crop=None):
    im=BG.copy(); d=ImageDraw.Draw(im)
    a=ease(t*4)  # entrada
    x0=80-int((1-a)*30)
    d.text((x0,190),tag.upper(),font=TAG,fill=GOLD)
    y=224
    for ln in wrap(d,title,TITLE,520):
        d.text((x0,y),ln,font=TITLE,fill=INK); y+=62
    y+=14
    for ln in wrap(d,sub,SUB,500):
        d.text((x0,y),ln,font=SUB,fill=MUTED); y+=34
    if img is not None:
        if img == 'chat':
            view=chat_card(); mask=Image.new('L',view.size,0); ImageDraw.Draw(mask).rounded_rectangle((0,0,view.size[0]-1,view.size[1]-1),26,fill=255)
        else:
            view,mask=card(img,t)
        sh=Image.new('L',(view.size[0]+80,view.size[1]+80),0)
        ImageDraw.Draw(sh).rounded_rectangle((40,50,view.size[0]+40,view.size[1]+40),22,fill=70)
        sh=sh.filter(ImageFilter.GaussianBlur(22))
        px=W-view.size[0]-90+int((1-a)*40); py=(H-view.size[1])//2
        im.paste((60,45,10),(px-40,py-40),sh)
        im.paste(view,(px,py),mask)
    # fade
    f=min(1,t*6,(1-t)*6)
    if f<1: im=Image.blend(Image.new('RGB',(W,H),IVORY),im,max(0,f))
    return im

def intro(t, line1, line2, small):
    im=BG.copy(); d=ImageDraw.Draw(im)
    lw=360; lg=logo.resize((lw,int(logo.size[1]*lw/logo.size[0])),Image.LANCZOS)
    a=ease(t*3)
    im.paste(lg,((W-lw)//2,150-int((1-a)*20)),lg)
    for i,(txt,col) in enumerate(((line1,INK),(line2,GOLD))):
        w=d.textlength(txt,font=BIG); d.text(((W-w)//2,300+i*86),txt,font=BIG,fill=col)
    w=d.textlength(small,font=SUB); d.text(((W-w)//2,500),small,font=SUB,fill=MUTED)
    f=min(1,t*5,(1-t)*5)
    if f<1: im=Image.blend(Image.new('RGB',(W,H),IVORY),im,max(0,f))
    return im

S=[
 ('intro',3.5,('Pessoas reais.','Negócios reais.','O super app com identidade verificada por biometria facial.')),
 ('scene',5,('Community','Rede social sem perfil falso','Feed, stories, Reels e mensagens com pessoas confirmadas por reconhecimento facial.','08-depois-de-entrar.png')),
 ('scene',5,('Shop','Marketplace com pagamento em custódia','O valor fica retido e só é liberado ao vendedor quando você confirma a entrega.','09-Shop.png')),
 ('scene',5,('Food','Delivery e reservas','Restaurantes, bares e mercados da sua cidade, com rastreio do pedido em tempo real.','10-Food.png')),
 ('scene',5,('Serviços','Profissionais perto de você','Geolocalização, avaliação real e chamada em minutos: eletricista, diarista, motorista, aulas.','11-Serviços.png')),
 ('scene',5,('Negócios','Imóveis, veículos e máquinas','Anúncios verificados, tour em vídeo e atendimento ao vivo no Hub de Negócios.','12-Negócios.png')),
 ('scene',5,('Lotus · IA','Diga Lotus.','Assistente de voz com inteligência artificial: entende o pedido, compara opções e só confirma quando você mandar.','chat')),
 ('intro',4,('Um app.','Tudo real.','realyz.com.br  ·  Android e navegador')),
]
out=subprocess.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-c:v','libx264','-preset','veryfast','-crf','26','-pix_fmt','yuv420p','-movflags','+faststart','/home/claude/tour/tour.mp4'],stdin=subprocess.PIPE)
imgs={}
poster=None
for kind,dur,args in S:
    n=int(dur*FPS)
    if kind=='scene' and args[3] not in imgs: imgs[args[3]]='chat' if args[3]=='chat' else shot(args[3])
    for i in range(n):
        t=i/(n-1)
        fr=intro(t,*args) if kind=='intro' else scene(args[0],args[1],args[2],imgs[args[3]],t)
        if poster is None and kind=='intro' and abs(t-0.5)<0.02: poster=fr.copy()
        out.stdin.write(fr.tobytes())
out.stdin.close(); out.wait()
poster.save('/home/claude/tour/tour-capa.jpg',quality=86)
print('ok')
