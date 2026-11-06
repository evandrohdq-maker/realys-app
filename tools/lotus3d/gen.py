import json, math, subprocess, os
moods={'padrao':('#FFF7F2','#E0608E','#F3EBC0'),'agro':('#F6FFF4','#3FA862','#E9F0B8'),'sos':('#FFF2F0','#D3262B','#F6E3B4'),'shop':('#FFFBEF','#D9A21B','#F8EDB0')}
jobs=[]
os.makedirs('raw',exist_ok=True)
for m,(body,tip,base) in moods.items():
    for i in range(12):
        t=i/11; b=0.5-0.5*math.cos(math.pi*t)
        jobs.append({'f':f'raw/{m}_bloom_{i:02d}.png','o':{'b':b,'body':body,'tip':tip,'base':base}})
    for i in range(8):
        a=2*math.pi*i/8
        jobs.append({'f':f'raw/{m}_idle_{i:02d}.png','o':{'b':1-0.035*(1-math.cos(a)),'rot':2.5*math.sin(a),'body':body,'tip':tip,'base':base}})
for i,b in enumerate([0.3,1.0]):
    jobs.append({'f':f'raw/mini_{i}.png','o':{'b':b,'pad':False,'elev':24,'dist':4.6}})
open('jobs.json','w').write(json.dumps(jobs))
